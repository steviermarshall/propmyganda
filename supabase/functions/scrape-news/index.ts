// PMG Wire — scheduled news bot.
// Pulls headlines from music-industry RSS feeds, rewords each story
// into a short original PMG Wire item through the Lovable AI Gateway,
// grabs the feed image, and posts it to public.publications.
// Safe to run repeatedly: dedupes on source_url and rate-limits itself.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";

const CATEGORIES = ["Business", "Artists", "Culture", "Milestones", "Industry"] as const;
type Category = (typeof CATEGORIES)[number];

interface Feed {
  name: string;
  url: string;
}
const FEEDS: Feed[] = [
  { name: "Music Business Worldwide", url: "https://www.musicbusinessworldwide.com/feed/" },
  { name: "Pitchfork", url: "https://pitchfork.com/rss/news/" },
  { name: "Billboard", url: "https://www.billboard.com/feed/" },
  { name: "The FADER", url: "https://www.thefader.com/rss" },
];

interface FeedItem {
  source: string;
  title: string;
  link: string;
  published: Date | null;
  image: string | null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&(apos|#39);/g, "'");
}

function stripCdata(s: string): string {
  return decodeEntities(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim());
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? stripCdata(m[1]) : "";
}

function firstImage(block: string): string | null {
  const patterns = [
    /<media:content[^>]*url="([^"]+)"/i,
    /<media:thumbnail[^>]*url="([^"]+)"/i,
    /<enclosure[^>]*url="([^"]+)"[^>]*type="image/i,
    /<img[^>]+src="([^"]+)"/i,
  ];
  for (const re of patterns) {
    const m = block.match(re);
    if (m) {
      try {
        const url = new URL(decodeEntities(m[1]));
        if (!/^https?:$/.test(url.protocol)) continue;
        if (url.hostname === "billboard.com" || url.hostname === "www.billboard.com") {
          url.searchParams.delete("w");
          url.searchParams.delete("h");
          url.searchParams.delete("crop");
        }
        return url.toString();
      } catch { continue; }
    }
  }
  return null;
}

async function fetchFeed(feed: Feed): Promise<FeedItem[]> {
  const res = await fetch(feed.url, {
    headers: { "User-Agent": "PMGWire/1.0 (https://propmyganda.com)" },
  });
  if (!res.ok) throw new Error(`${feed.name}: HTTP ${res.status}`);
  const xml = await res.text();
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  const out: FeedItem[] = [];
  for (const raw of items) {
    const title = tag(raw, "title");
    const link = tag(raw, "link") || raw.match(/<link[^>]*href="([^"]+)"/i)?.[1] || "";
    if (!title || !link) continue;
    const dateStr = tag(raw, "pubDate") || tag(raw, "published") || tag(raw, "updated");
    const published = dateStr ? new Date(dateStr) : null;
    out.push({
      source: feed.name,
      title,
      link,
      published: published && !isNaN(published.getTime()) ? published : null,
      image: firstImage(raw),
    });
  }
  return out;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
}

async function reword(item: FeedItem, apiKey: string): Promise<{
  title: string;
  excerpt: string;
  body: string;
  category: Category;
} | null> {
  const payload = {
    model: AI_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You write for PMG Wire, the editorial feed of PROPMYGANDA — an independent music company in Brooklyn. " +
          "You receive a headline and summary of a music-industry news story. Rewrite it as a short, original PMG Wire item: " +
          "plain-spoken, no hype, no clickbait. Never copy sentences from the source. " +
          'Respond with JSON: {"title": string (max 12 words, sentence case), "excerpt": string (1 sentence, max 140 chars), ' +
          '"body": string (2 short paragraphs, ~120 words total), "category": one of "Business","Artists","Culture","Milestones","Industry"}.',
      },
      {
        role: "user",
        content: `Source: ${item.source}\nHeadline: ${item.title}\nSummary: ${item.link}`,
      },
    ],
  };
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error("AI gateway error", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  try {
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    const category = CATEGORIES.includes(parsed.category) ? parsed.category : "Industry";
    if (!parsed.title || !parsed.body) return null;
    return {
      title: String(parsed.title),
      excerpt: parsed.excerpt ? String(parsed.excerpt) : null,
      body: String(parsed.body),
      category,
    };
  } catch {
    return null;
  }
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Rate limit: skip if a bot run happened less than 90 minutes ago.
  const { data: lastBot } = await supabase
    .from("publications")
    .select("created_at")
    .eq("author", "PMG Wire")
    .order("created_at", { ascending: false })
    .limit(1);
  if (lastBot?.[0]) {
    const age = Date.now() - new Date(lastBot[0].created_at).getTime();
    if (age < 90 * 60 * 1000) {
      return new Response(JSON.stringify({ ok: true, skipped: "ran recently" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Collect candidate items from all feeds (last 72h only).
  const cutoff = Date.now() - 72 * 60 * 60 * 1000;
  const candidates: FeedItem[] = [];
  await Promise.all(
    FEEDS.map(async (feed) => {
      try {
        const items = await fetchFeed(feed);
        for (const it of items) {
          if (!it.published || it.published.getTime() >= cutoff) candidates.push(it);
        }
      } catch (e) {
        console.error("feed failed", feed.name, e instanceof Error ? e.message : e);
      }
    }),
  );
  candidates.sort((a, b) => (b.published?.getTime() ?? 0) - (a.published?.getTime() ?? 0));

  // Dedupe against what we already stored.
  const { data: known } = await supabase.from("publications").select("source_url");
  const knownUrls = new Set((known ?? []).map((r: { source_url: string | null }) => r.source_url));
  const fresh = candidates.filter((c) => !knownUrls.has(c.link)).slice(0, 6);

  let inserted = 0;
  for (const item of fresh) {
    const rewrote = await reword(item, apiKey);
    if (!rewrote) continue;

    let slug = slugify(rewrote.title);
    const { data: clash } = await supabase
      .from("publications")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const { error } = await supabase.from("publications").insert({
      title: rewrote.title,
      slug,
      excerpt: rewrote.excerpt,
      body: rewrote.body,
      cover_url: item.image,
      category: rewrote.category,
      author: "PMG Wire",
      credit: `Via ${item.source}`,
      source_url: item.link,
      featured: false,
      published_at: new Date().toISOString(),
    });
    if (error) {
      console.error("insert failed", item.link, error.message);
      continue;
    }
    inserted++;
  }

  return new Response(JSON.stringify({ ok: true, candidates: candidates.length, inserted }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(handler);
