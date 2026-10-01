import { describe, it, expect } from "vitest";
import {
  cleanImageUrl,
  decodeEntities,
  firstImage,
  normalizeUrl,
  ogImage,
  paragraphsToHtml,
  parseFeed,
  selectItems,
  slugify,
  stripHtml,
  titleSimilarity,
  clampInt,
  type FeedItem,
} from "../../supabase/functions/scrape-news/wire";

const RSS = `<?xml version="1.0"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel><title>Test</title>
<item>
  <title><![CDATA[Label signs new artist &amp; plans tour]]></title>
  <link>https://example.com/story-one?utm_source=rss</link>
  <pubDate>Mon, 28 Sep 2026 12:00:00 GMT</pubDate>
  <description><![CDATA[<p>The <b>label</b> announced a deal today.&nbsp;More soon.</p><img src="https://example.com/inline.jpg" />]]></description>
  <media:content url="https://example.com/photo-300x200.jpg" medium="image" />
</item>
<item>
  <title>No link item</title>
</item>
<item>
  <title>Second story</title>
  <guid>https://example.com/two</guid>
  <content:encoded><![CDATA[Long body text here.]]></content:encoded>
</item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<entry>
  <title>Atom headline</title>
  <link rel="alternate" href="https://example.org/atom-story" />
  <published>2026-09-27T08:30:00Z</published>
  <summary type="html">&lt;p&gt;Summary text&lt;/p&gt;</summary>
</entry>
</feed>`;

describe("parseFeed", () => {
  it("parses RSS items with CDATA, summaries, dates and images", () => {
    const items = parseFeed(RSS, "Test Source");
    expect(items).toHaveLength(2);
    const [first, second] = items;
    expect(first.title).toBe("Label signs new artist & plans tour");
    expect(first.link).toBe("https://example.com/story-one?utm_source=rss");
    expect(first.summary).toBe("The label announced a deal today. More soon.");
    expect(first.published?.toISOString()).toBe("2026-09-28T12:00:00.000Z");
    expect(first.image).toBe("https://example.com/photo.jpg");
    expect(first.source).toBe("Test Source");
    expect(second.link).toBe("https://example.com/two");
    expect(second.summary).toBe("Long body text here.");
  });

  it("parses Atom entries", () => {
    const [entry] = parseFeed(ATOM, "Atom Source");
    expect(entry.title).toBe("Atom headline");
    expect(entry.link).toBe("https://example.org/atom-story");
    expect(entry.summary).toBe("Summary text");
    expect(entry.published?.toISOString()).toBe("2026-09-27T08:30:00.000Z");
  });

  it("returns nothing for garbage input", () => {
    expect(parseFeed("<html>not a feed</html>", "x")).toEqual([]);
  });
});

describe("text helpers", () => {
  it("decodes entities including numeric and hex forms", () => {
    expect(decodeEntities("Drake &amp; 21 &#8212; &#x2019;live&#x2019; &quot;x&quot;")).toBe("Drake & 21 — ’live’ \"x\"");
  });

  it("strips html and collapses whitespace", () => {
    expect(stripHtml("<p>Hello\n  <em>world</em></p><script>bad()</script>")).toBe("Hello world");
  });

  it("slugifies accented titles", () => {
    expect(slugify("Björk announces ‘Fossora’ tour!")).toBe("bjork-announces-fossora-tour");
  });

  it("turns paragraphs into escaped html", () => {
    expect(paragraphsToHtml("First <one>.\n\nSecond & last.")).toBe("<p>First &lt;one&gt;.</p>\n<p>Second &amp; last.</p>");
    expect(paragraphsToHtml("")).toBe("");
  });

  it("clamps integers with a fallback", () => {
    expect(clampInt(undefined, 1, 30, 12)).toBe(12);
    expect(clampInt("20", 1, 30, 12)).toBe(20);
    expect(clampInt(500, 1, 30, 12)).toBe(30);
    expect(clampInt(-3, 1, 30, 12)).toBe(1);
  });
});

describe("url helpers", () => {
  it("normalizes tracking params, www, hash and trailing slash", () => {
    expect(normalizeUrl("http://www.Example.com/a/b/?utm_source=x&fbclid=y&id=3#frag")).toBe("https://example.com/a/b/?id=3");
    expect(normalizeUrl("https://example.com/a/b/")).toBe("https://example.com/a/b");
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("cleans thumbnail sizing from image urls", () => {
    expect(cleanImageUrl("https://www.billboard.com/wp-content/x.jpg?w=300&h=200&crop=1")).toBe("https://www.billboard.com/wp-content/x.jpg");
    expect(cleanImageUrl("https://i0.wp.com/site.com/img-768x512.png?resize=768%2C512")).toBe("https://i0.wp.com/site.com/img.png");
    expect(cleanImageUrl("javascript:alert(1)")).toBeNull();
  });

  it("prefers media:content over inline img", () => {
    const block = `<img src="https://a.com/inline.jpg"><media:content url="https://a.com/main.jpg" medium="image"/>`;
    expect(firstImage(block)).toBe("https://a.com/main.jpg");
  });

  it("reads og:image from a page", () => {
    const html = `<html><head><meta property="og:image" content="https://a.com/og.jpg?w=1200&amp;h=630"></head></html>`;
    expect(ogImage(html)).toBe("https://a.com/og.jpg?w=1200&h=630");
    expect(ogImage("<html></html>")).toBeNull();
  });
});

function item(over: Partial<FeedItem> & { title: string; link: string; source: string }): FeedItem {
  return { summary: "", published: null, image: null, ...over };
}

describe("selectItems", () => {
  const now = Date.parse("2026-09-29T12:00:00Z");
  const h = (hoursAgo: number) => new Date(now - hoursAgo * 3600_000);

  it("rotates across sources, skips known urls and near-duplicate stories", () => {
    const candidates: FeedItem[] = [
      item({ source: "A", title: "Taylor Swift announces stadium tour dates", link: "https://a.com/1", published: h(1) }),
      item({ source: "A", title: "A second A story", link: "https://a.com/2", published: h(2) }),
      item({ source: "A", title: "A third A story", link: "https://a.com/3", published: h(3) }),
      item({ source: "B", title: "Taylor Swift announces stadium tour", link: "https://b.com/1", published: h(1.5) }),
      item({ source: "B", title: "Already posted story", link: "https://www.b.com/old/?utm_source=x", published: h(2) }),
      item({ source: "B", title: "Fresh B story", link: "https://b.com/3", published: h(4) }),
      item({ source: "C", title: "Ancient C story", link: "https://c.com/1", published: h(200) }),
    ];
    const picked = selectItems(candidates, {
      limit: 4,
      knownUrls: new Set(["https://b.com/old"]),
      cutoff: now - 72 * 3600_000,
      now,
    });
    expect(picked.map((p) => p.link)).toEqual(["https://a.com/1", "https://b.com/3", "https://a.com/2", "https://a.com/3"]);
  });

  it("titleSimilarity flags the same story and not different ones", () => {
    expect(titleSimilarity("Drake drops surprise album tonight", "Drake surprise album drops tonight")).toBeGreaterThanOrEqual(0.6);
    expect(titleSimilarity("Drake drops surprise album", "Spotify raises prices in Europe")).toBeLessThan(0.6);
  });

  it("drops items dated far in the future", () => {
    const picked = selectItems([item({ source: "A", title: "Future", link: "https://a.com/f", published: h(-48) })], {
      limit: 5, knownUrls: new Set(), now,
    });
    expect(picked).toEqual([]);
  });
});
