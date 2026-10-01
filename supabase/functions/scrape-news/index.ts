// PMG Wire — scheduled news bot.
// Pulls headlines from music-press RSS feeds, rewords each story into a short
// original PMG Wire item through the Lovable AI Gateway, grabs the story
// image, and posts it to public.publications.
//
// Request body (all optional):
//   { "limit": 12 }        how many stories to post this run (1–30, default 12)
//   { "force": true }      ignore the cooldown — used by the "Fetch news now" button
//   { "maxAgeHours": 72 }  only consider stories newer than this
//
// Safe to run repeatedly: dedupes on source_url, spots the same story across
// outlets, and (unless forced) skips when the last run was minutes ago so an
// overlapping scheduler tick cannot double-post.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  CATEGORIES,
  FEEDS,
  clampInt,
  normalizeUrl,
  ogImage,
  paragraphsToHtml,
  parseFeed,
  selectItems,
  slugify,
  type Category,
  type Feed,
  type FeedItem,
} from "./wire.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";
const USER_AGENT = "PMGWire/2.0 (+https://propmyganda.com)";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 30;
const DEFAULT_MAX_AGE_HOURS = 72;
/** Scheduled (unforced) runs closer together than this are skipped. */
const COOLDOWN_MS = 15 * 60 * 1000;
const FEED_TIMEOUT_MS = 12_000;
const PAGE_TIMEOUT_MS = 8_000;
const AI_CONCURRENCY = 3;

interface FeedReport {
  name: string;
  items: number;
  error?: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchFeed(feed: Feed): Promise<FeedItem[]> {
  const res = await fetch(feed.url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const items = parseFeed(xml, feed.name);
  if (items.length === 0) throw new Error("no items parsed");
  return items;
}

/** Best-effort og:image from the article page when the feed had no picture. */
async function pageImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 300_000);
    return ogImage(html);
  } catch {
    return null;
  }
}

interface Rewrite {
  title: string;
  excerpt: string | null;
  body: string;
  category: Category;
}

async function reword(item: FeedItem, apiKey: string): Promise<Rewrite | null> {
  const payload = {
    model: AI_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You write for PMG Wire, the editorial news feed of PROPMYGANDA — an independent music company in Brooklyn. " +
          "You receive the headline and summary of a music-industry news story from another outlet. " +
          "Rewrite it as a short, original PMG Wire item in your own words: plain-spoken, specific, no hype, no clickbait, " +
          "no first person, no opinions. Keep every fact, name, number and date from the source; invent nothing. " +
          "Never copy sentences from the source. If the summary is thin, write less rather than padding.\n" +
          'Respond with JSON only: {"title": string (max 12 words, sentence case, no trailing period), ' +
          '"excerpt": string (one sentence, max 140 characters, the news in a nutshell), ' +
          '"body": string (2–3 short paragraphs separated by blank lines, 90–160 words total; the first paragraph states the news, the rest gives context), ' +
          '"category": one of "Business" (deals, labels, streaming, money), "Artists" (releases, tours, artist news), ' +
          '"Culture" (scenes, fashion, film, wider culture), "Milestones" (charts, records, awards, anniversaries), "Industry" (policy, tech, platforms)}.',
      },
      {
        role: "user",
        content:
          `Source: ${item.source}\nURL: ${item.link}\nHeadline: ${item.title}\n` +
          `Summary: ${item.summary || "(no summary provided — write from the headline only)"}`,
      },
    ],
  };
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    console.error("AI gateway error", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  try {
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    const category: Category = CATEGORIES.includes(parsed.category) ? parsed.category : "Industry";
    if (!parsed.title || !parsed.body) return null;
    return {
      title: String(parsed.title).trim().replace(/\.$/, ""),
      excerpt: parsed.excerpt ? String(parsed.excerpt).trim() : null,
      body: paragraphsToHtml(String(parsed.body)),
      category,
    };
  } catch {
    return null;
  }
}

/** Run `fn` over `items` with at most `n` in flight. Order of results matches input. */
async function mapLimit<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let options: { limit?: unknown; force?: unknown; maxAgeHours?: unknown } = {};
  try {
    if (req.method !== "GET") options = (await req.json()) ?? {};
  } catch {
    options = {};
  }
  const limit = clampInt(options.limit, 1, MAX_LIMIT, DEFAULT_LIMIT);
  const force = options.force === true || options.force === "true";
  const maxAgeHours = clampInt(options.maxAgeHours, 1, 24 * 14, DEFAULT_MAX_AGE_HOURS);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

  // Cooldown for scheduled runs only. A manual "Fetch news now" always runs.
  if (!force) {
    const { data: lastBot } = await supabase
      .from("publications")
      .select("created_at")
      .eq("author", "PMG Wire")
      .order("created_at", { ascending: false })
      .limit(1);
    if (lastBot?.[0]) {
      const age = Date.now() - new Date(lastBot[0].created_at).getTime();
      if (age < COOLDOWN_MS) {
        return json({ ok: true, skipped: "ran recently", inserted: 0, cooldownMinutes: COOLDOWN_MS / 60_000 });
      }
    }
  }

  // Collect candidates from every feed in parallel; a broken feed only costs itself.
  const feeds: FeedReport[] = [];
  const candidates: FeedItem[] = [];
  await Promise.all(
    FEEDS.map(async (feed) => {
      try {
        const items = await fetchFeed(feed);
        candidates.push(...items);
        feeds.push({ name: feed.name, items: items.length });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("feed failed", feed.name, message);
        feeds.push({ name: feed.name, items: 0, error: message });
      }
    }),
  );
  feeds.sort((a, b) => a.name.localeCompare(b.name));

  // Skip anything already on the site (compared on the canonical URL).
  const { data: known } = await supabase.from("publications").select("source_url").not("source_url", "is", null);
  const knownUrls = new Set((known ?? []).map((r: { source_url: string }) => normalizeUrl(r.source_url)));

  const now = Date.now();
  const fresh = selectItems(candidates, {
    limit,
    knownUrls,
    cutoff: now - maxAgeHours * 60 * 60 * 1000,
    now,
  });

  // Rewrite (and fetch a page image where needed) a few stories at a time.
  const drafts = await mapLimit(fresh, AI_CONCURRENCY, async (item) => {
    const [rewrote, image] = await Promise.all([
      reword(item, apiKey),
      item.image ? Promise.resolve(item.image) : pageImage(item.link),
    ]);
    return { item, rewrote, image };
  });

  const posted: { title: string; source: string; category: string; slug: string }[] = [];
  const failed: { title: string; source: string; reason: string }[] = [];

  for (const { item, rewrote, image } of drafts) {
    if (!rewrote) {
      failed.push({ title: item.title, source: item.source, reason: "rewrite failed" });
      continue;
    }

    let slug = slugify(rewrote.title) || slugify(item.title) || `wire-${Date.now().toString(36)}`;
    const { data: clash } = await supabase.from("publications").select("id").eq("slug", slug).maybeSingle();
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    // Keep the story's real time so the wire reads in order, but never in the future.
    const publishedAt =
      item.published && item.published.getTime() < now ? item.published.toISOString() : new Date(now).toISOString();

    const { error } = await supabase.from("publications").insert({
      title: rewrote.title,
      slug,
      excerpt: rewrote.excerpt,
      body: rewrote.body,
      cover_url: image,
      category: rewrote.category,
      author: "PMG Wire",
      credit: `Via ${item.source}`,
      source_url: item.link,
      featured: false,
      published_at: publishedAt,
    });
    if (error) {
      // 23505 = unique violation on source_url: another run beat us to it.
      const reason = error.code === "23505" ? "already posted" : error.message;
      console.error("insert failed", item.link, reason);
      failed.push({ title: item.title, source: item.source, reason });
      continue;
    }
    posted.push({ title: rewrote.title, source: item.source, category: rewrote.category, slug });
  }

  return json({
    ok: true,
    limit,
    candidates: candidates.length,
    selected: fresh.length,
    inserted: posted.length,
    posted,
    failed,
    feeds,
  });
}

Deno.serve(handler);
