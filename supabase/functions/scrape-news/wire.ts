// PMG Wire — pure helpers for the scrape-news bot.
// No Deno globals here so the same code can be unit-tested with vitest.

export const CATEGORIES = ["Business", "Artists", "Culture", "Milestones", "Industry"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Feed {
  name: string;
  url: string;
}

// Music press we pull from. A feed that is down or has moved is logged and
// skipped for that run; the others still post.
export const FEEDS: Feed[] = [
  { name: "Music Business Worldwide", url: "https://www.musicbusinessworldwide.com/feed/" },
  { name: "Pitchfork", url: "https://pitchfork.com/rss/news/" },
  { name: "Billboard", url: "https://www.billboard.com/feed/" },
  { name: "The FADER", url: "https://www.thefader.com/rss" },
  { name: "Stereogum", url: "https://www.stereogum.com/feed/" },
  { name: "Consequence", url: "https://consequence.net/feed/" },
  { name: "Rolling Stone", url: "https://www.rollingstone.com/music/feed/" },
  { name: "NME", url: "https://www.nme.com/news/music/feed" },
  { name: "HipHopDX", url: "https://hiphopdx.com/rss/news.xml" },
  { name: "BrooklynVegan", url: "https://www.brooklynvegan.com/feed/" },
  { name: "Digital Music News", url: "https://www.digitalmusicnews.com/feed/" },
  { name: "Hypebot", url: "https://www.hypebot.com/hypebot/feed" },
];

export interface FeedItem {
  source: string;
  title: string;
  link: string;
  summary: string;
  published: Date | null;
  image: string | null;
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&(apos|#39);/g, "'")
    .replace(/&amp;/g, "&");
}

export function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

/**
 * Plain text from an HTML fragment: tags removed, whitespace collapsed,
 * entities decoded. Feeds often escape the markup itself (&lt;p&gt;), and
 * WordPress double-encodes entities, so decode before and after stripping.
 */
export function stripHtml(html: string): string {
  return decodeEntities(
    decodeEntities(html)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Inner text of the first <name> element in an XML block (CDATA unwrapped, entities decoded). */
export function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decodeEntities(stripCdata(m[1])) : "";
}

/** Raw inner markup of the first <name> element (CDATA unwrapped, entities left alone). */
function rawTag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? stripCdata(m[1]) : "";
}

export function firstImage(block: string): string | null {
  const patterns = [
    /<media:content[^>]*url="([^"]+)"[^>]*(?:medium="image"|type="image)/i,
    /<media:content[^>]*url="([^"]+\.(?:jpe?g|png|webp|gif)[^"]*)"/i,
    /<media:thumbnail[^>]*url="([^"]+)"/i,
    /<enclosure[^>]*url="([^"]+)"[^>]*type="image/i,
    /<enclosure[^>]*type="image[^>]*url="([^"]+)"/i,
    /<img[^>]+src="([^"]+)"/i,
    /<media:content[^>]*url="([^"]+)"/i,
  ];
  for (const re of patterns) {
    const m = block.match(re);
    if (!m) continue;
    const url = cleanImageUrl(decodeEntities(m[1]));
    if (url) return url;
  }
  return null;
}

export function cleanImageUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (!/^https?:$/.test(url.protocol)) return null;
    // Feeds often hand us a tiny cropped thumbnail; ask for the original.
    if (/(^|\.)billboard\.com$/.test(url.hostname)) {
      url.searchParams.delete("w");
      url.searchParams.delete("h");
      url.searchParams.delete("crop");
    }
    if (/(^|\.)wp\.com$/.test(url.hostname) || /(^|\.)rollingstone\.com$/.test(url.hostname)) {
      url.searchParams.delete("w");
      url.searchParams.delete("h");
      url.searchParams.delete("resize");
      url.searchParams.delete("fit");
    }
    // WordPress "-300x200.jpg" size suffixes.
    url.pathname = url.pathname.replace(/-\d{2,4}x\d{2,4}(\.(?:jpe?g|png|webp|gif))$/i, "$1");
    return url.toString();
  } catch {
    return null;
  }
}

/** Canonical form of an article URL so the same story is not posted twice. */
export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|ref$|source$|ncid$|cmpid$)/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.protocol = "https:";
    let out = url.toString();
    if (url.pathname !== "/" && out.endsWith("/")) out = out.slice(0, -1);
    return out;
  } catch {
    return raw.trim();
  }
}

/** og:image from an article page, when the feed carried no picture. */
export function ogImage(html: string): string | null {
  const patterns = [
    /<meta[^>]+property="og:image(?::secure_url)?"[^>]+content="([^"]+)"/i,
    /<meta[^>]+content="([^"]+)"[^>]+property="og:image(?::secure_url)?"/i,
    /<meta[^>]+name="twitter:image(?::src)?"[^>]+content="([^"]+)"/i,
    /<meta[^>]+content="([^"]+)"[^>]+name="twitter:image(?::src)?"/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (!m) continue;
    const url = cleanImageUrl(decodeEntities(m[1]));
    if (url) return url;
  }
  return null;
}

function parseDate(block: string): Date | null {
  const dateStr =
    tag(block, "pubDate") || tag(block, "published") || tag(block, "dc:date") || tag(block, "updated");
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function itemLink(block: string): string {
  const plain = tag(block, "link");
  if (plain && /^https?:\/\//.test(plain)) return plain;
  // Atom: <link rel="alternate" href="..."/> (or the first href when rel is absent).
  const alt = block.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i)?.[1];
  if (alt) return decodeEntities(alt);
  const any = block.match(/<link[^>]*href="([^"]+)"/i)?.[1];
  if (any) return decodeEntities(any);
  const guid = tag(block, "guid");
  return /^https?:\/\//.test(guid) ? guid : "";
}

/** Parse an RSS 2.0 or Atom document into feed items. Never throws on odd markup. */
export function parseFeed(xml: string, source: string): FeedItem[] {
  const blocks = [
    ...(xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? []),
    ...(xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? []),
  ];
  const out: FeedItem[] = [];
  for (const raw of blocks) {
    const title = stripHtml(tag(raw, "title"));
    const link = itemLink(raw);
    if (!title || !link) continue;
    const summarySource =
      rawTag(raw, "content:encoded") || rawTag(raw, "description") || rawTag(raw, "summary") || rawTag(raw, "content");
    const summary = stripHtml(summarySource).slice(0, 900);
    out.push({
      source,
      title,
      link,
      summary,
      published: parseDate(raw),
      image: firstImage(raw),
    });
  }
  return out;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

const STOP = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "with", "at", "by", "from", "is", "are",
  "as", "its", "his", "her", "their", "new", "after", "over", "into", "amid", "says", "say", "said",
]);

/** Word set used to spot the same story reported by two outlets. */
export function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/['’]s\b/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP.has(w)),
  );
}

export function titleSimilarity(a: string, b: string): number {
  const ta = titleTokens(a);
  const tb = titleTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const w of ta) if (tb.has(w)) shared++;
  return shared / Math.min(ta.size, tb.size);
}

export interface SelectOptions {
  limit: number;
  knownUrls: Set<string>;
  /** Drop items older than this (ms since epoch). Undated items are kept. */
  cutoff?: number;
  now?: number;
}

/**
 * Pick the stories to post this run: newest first, no duplicates of what is
 * already published, no two outlets covering the same story, and rotated
 * across sources so one busy feed cannot fill every slot.
 */
export function selectItems(candidates: FeedItem[], opts: SelectOptions): FeedItem[] {
  const now = opts.now ?? Date.now();
  const bySource = new Map<string, FeedItem[]>();
  const seen = new Set<string>();
  const sorted = [...candidates].sort(
    (a, b) => (b.published?.getTime() ?? 0) - (a.published?.getTime() ?? 0),
  );
  for (const item of sorted) {
    const key = normalizeUrl(item.link);
    if (seen.has(key) || opts.knownUrls.has(key)) continue;
    if (item.published) {
      const t = item.published.getTime();
      if (opts.cutoff !== undefined && t < opts.cutoff) continue;
      if (t > now + 6 * 60 * 60 * 1000) continue; // bogus future date
    }
    seen.add(key);
    const list = bySource.get(item.source) ?? [];
    list.push(item);
    bySource.set(item.source, list);
  }

  const picked: FeedItem[] = [];
  const queues = [...bySource.values()];
  let progressed = true;
  while (picked.length < opts.limit && progressed) {
    progressed = false;
    for (const queue of queues) {
      if (picked.length >= opts.limit) break;
      while (queue.length) {
        const next = queue.shift()!;
        const dupe = picked.some((p) => titleSimilarity(p.title, next.title) >= 0.6);
        if (dupe) continue;
        picked.push(next);
        progressed = true;
        break;
      }
    }
  }
  return picked;
}

/** Turn the model's plain-text paragraphs into the HTML the article page renders. */
export function paragraphsToHtml(text: string): string {
  const paras = text
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paras.length === 0) return "";
  return paras.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n");
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}
