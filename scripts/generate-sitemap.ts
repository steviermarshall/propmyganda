// ============= Sitemap generator =============
// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
// Static pages + one entry per artist/product (from src/lib/data.ts) + one entry per
// published news article (fetched from the database, same filters as Publication.tsx).

import { writeFileSync, readFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://propmyganda.com";

// Database (publishable key — safe in client code)
const SUPABASE_URL = "https://gfqcmtslhwkcwfkqjfqw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_U9-8OD9ov1H0Wd4SIWwNBA_oQaNdSPu";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

function extractStringIds(source: string, arrayName: string, nextAnchor: string): string[] {
  const start = source.indexOf(`export const ${arrayName}`);
  if (start === -1) return [];
  const end = nextAnchor ? source.indexOf(nextAnchor, start) : source.length;
  const block = source.slice(start, end === -1 ? undefined : end);
  const ids: string[] = [];
  for (const m of block.matchAll(/\bid:\s*"([^"]+)"/g)) ids.push(m[1]);
  return ids;
}

async function fetchPublishedSlugs(): Promise<Array<{ slug: string; published_at: string }>> {
  const now = new Date().toISOString();
  const url =
    `${SUPABASE_URL}/rest/v1/publications?select=slug,published_at` +
    `&published_at=not.is.null&published_at=lte.${encodeURIComponent(now)}` +
    `&order=published_at.desc&limit=1000`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
  });
  if (!res.ok) throw new Error(`publications query failed: ${res.status}`);
  return (await res.json()) as Array<{ slug: string; published_at: string }>;
}

async function buildEntries(): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/artists", changefreq: "weekly", priority: "0.9" },
    { path: "/distribution", changefreq: "monthly", priority: "0.9" },
    { path: "/events", changefreq: "daily", priority: "0.9" },
    { path: "/publication", changefreq: "daily", priority: "0.8" },
    { path: "/store", changefreq: "weekly", priority: "0.8" },
    { path: "/exclusive", changefreq: "weekly", priority: "0.9" },
    { path: "/propworld", changefreq: "monthly", priority: "0.6" },
    { path: "/contact", changefreq: "monthly", priority: "0.6" },
  ];

  // Artist + product detail pages (static catalogue in src/lib/data.ts)
  const source = readFileSync(resolve("src/lib/data.ts"), "utf8");
  for (const id of extractStringIds(source, "artists", "export const products")) {
    entries.push({ path: `/artists/${id}`, changefreq: "monthly", priority: "0.7" });
  }
  for (const id of extractStringIds(source, "products", "export const")) {
    entries.push({ path: `/store/${id}`, changefreq: "weekly", priority: "0.7" });
  }

  // News articles (dynamic — one entry per published row, same filters as the page)
  try {
    const pubs = await fetchPublishedSlugs();
    for (const p of pubs) {
      if (!p.slug) continue;
      entries.push({
        path: `/publication/${p.slug}`,
        lastmod: p.published_at ? p.published_at.split("T")[0] : undefined,
        changefreq: "monthly",
        priority: "0.6",
      });
    }
  } catch (err) {
    console.warn(`[sitemap] skipping news articles: ${(err as Error).message}`);
  }

  return entries;
}

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ].filter(Boolean).join("\n")
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

const entries = await buildEntries();
writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
