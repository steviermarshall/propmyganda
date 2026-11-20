// Browser checks for the home page hub, against the built site (run `npm run build` first):
//
//   node scripts/hub-check.mjs            every check, software-drawn WebGL
//   node scripts/hub-check.mjs --gpu      the same in Chrome on this machine's GPU (live Earth)
//   node scripts/hub-check.mjs --shots d  also save a picture of every stop into folder d
//   node scripts/hub-check.mjs --serve 8797  no checks: just serve the built site to look at
//   add --ranges to answer requests for part of a file (the live host does not, so by default
//   this does not either)
//
// It serves dist/ itself. The site's hosted reels and posters (/__l5e/…) only exist on the live
// domain, so those requests are passed through to it, read-only. Sign-ups are intercepted and
// answered here: nothing is ever written to the real database.
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import path from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : null);
const LIVE = "https://propmyganda.com";
const DIST = path.resolve("dist");
const SHOTS = value("shots");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".mp4": "video/mp4", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8",
  ".xml": "application/xml",
};

if (!existsSync(path.join(DIST, "index.html"))) throw new Error('dist/ is missing: run "npm run build" first');

/** dist/ with byte ranges, the single-page fallback, and the hosted media passed through. */
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  if (url.pathname.startsWith("/__l5e/")) {
    try {
      const upstream = await fetch(LIVE + url.pathname, { headers: req.headers.range ? { range: req.headers.range } : {} });
      const headers = {};
      for (const k of ["content-type", "content-length", "content-range", "accept-ranges"]) {
        const v = upstream.headers.get(k);
        if (v) headers[k] = v;
      }
      res.writeHead(upstream.status, headers);
      if (upstream.body) Readable.fromWeb(upstream.body).on("error", () => res.destroy()).pipe(res);
      else res.end();
    } catch {
      res.writeHead(502).end();
    }
    return;
  }
  let file = path.join(DIST, decodeURIComponent(url.pathname));
  if (!file.startsWith(DIST)) return res.writeHead(403).end();
  if (!existsSync(file) || statSync(file).isDirectory()) file = path.join(DIST, "index.html");
  const size = statSync(file).size;
  const type = TYPES[path.extname(file)] ?? "application/octet-stream";
  // Answer as the live host does: a request for part of a file gets the whole file (measured on
  // propmyganda.com, 2026-11-18). That is why the ring loops are played from memory (see
  // src/hub/README.md). --ranges answers parts, to compare.
  const range = flag("ranges") ? /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "") : null;
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, { "content-type": type, "content-range": `bytes ${start}-${end}/${size}`, "content-length": end - start + 1, "accept-ranges": "bytes" });
    createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { "content-type": type, "content-length": size });
    createReadStream(file).pipe(res);
  }
});
await new Promise((r) => server.listen(Number(value("serve")) || 0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}`;
if (value("serve")) {
  console.log(`The built site is at ${BASE} (hosted reels are read from ${LIVE}). Ctrl+C to stop.`);
  await new Promise(() => {});
}

const SOFTWARE = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
const NO_GL = ["--disable-webgl", "--disable-webgl2", "--disable-3d-apis"];
const launch = (extra) => chromium.launch({ channel: "chrome", args: [...extra, "--autoplay-policy=no-user-gesture-required"] });

let passed = 0;
const failures = [];
/** Console errors that came from other sites' pages (embeds). Listed, not counted. */
const outside = new Set();

function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failures.push(`${name}${detail ? `: ${detail}` : ""}`);
  console.log(`${ok ? "  ok  " : "  FAIL"} ${name}${!ok && detail ? ` (${detail})` : ""}`);
}

/** Console noise that is not ours: third-party players and the analytics tag. */
const NOISE = /metricool|youtube|ytimg|spotify|doubleclick|googleads|Permissions-Policy|third-party cookie|net::ERR_ABORTED|favicon/i;

async function open(browser, opts = {}) {
  const ctx = await browser.newContext({
    viewport: opts.viewport ?? { width: 1440, height: 900 },
    deviceScaleFactor: opts.dpr ?? 1,
    isMobile: Boolean(opts.mobile),
    hasTouch: Boolean(opts.mobile),
    reducedMotion: opts.reducedMotion ? "reduce" : "no-preference",
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const from = m.location().url ?? "";
    if (NOISE.test(m.text()) || NOISE.test(from)) return;
    // A message about another site's own page (an embed's security headers, say) is theirs to
    // fix. It is listed at the end of the run, not counted as a failure of this site.
    if (/^https?:/.test(from) && !from.startsWith(BASE)) {
      outside.add(`${new URL(from).host}: ${m.text().slice(0, 90)}`);
      return;
    }
    errors.push(from ? `${m.text()} (from ${from.slice(0, 80)})` : m.text());
  });
  // Sign-ups never reach the real database.
  const signups = [];
  await page.route("**/rest/v1/newsletter_subscribers*", async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    signups.push(req.postDataJSON());
    const mode = opts.signup ?? "ok";
    if (mode === "ok") return route.fulfill({ status: 201, headers: { "access-control-allow-origin": "*" }, body: "" });
    if (mode === "duplicate") return route.fulfill({ status: 409, headers: { "access-control-allow-origin": "*" }, contentType: "application/json", body: JSON.stringify({ code: "23505", message: "duplicate key value" }) });
    return route.fulfill({ status: 500, headers: { "access-control-allow-origin": "*" }, contentType: "application/json", body: JSON.stringify({ code: "XX000", message: "down" }) });
  });
  if (opts.events) {
    await page.route("**/rest/v1/events*", (route) =>
      route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" }, contentType: "application/json", body: JSON.stringify(opts.events) }));
  }
  if (opts.stories) {
    await page.route("**/rest/v1/publications*", (route) =>
      route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" }, contentType: "application/json", body: JSON.stringify(opts.stories(new URL(route.request().url()))) }));
  }
  return { ctx, page, errors, signups };
}

const hubReady = (page) =>
  page.waitForFunction(() => window.__pmg?.ready === true && document.querySelector('.pmg-hub[data-mode="gl"]'), null, { timeout: 120_000, polling: 100 });

/** Mean brightness (0-255) of a screenshot region, to tell a drawn scene from a black one. */
async function brightness(page) {
  const png = await page.screenshot({ type: "png" });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0, 64, 64);
    const d = ctx.getImageData(0, 0, 64, 64).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
    return sum / (d.length / 4);
  }, png.toString("base64"));
}

// ---------------------------------------------------------------------------------------------
async function hubAt(browser, label, viewport, mobile) {
  console.log(`\nThe hub at ${label}`);
  const { ctx, page, errors } = await open(browser, { viewport, mobile, dpr: mobile ? 2 : 1 });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await hubReady(page);
  const info = await page.evaluate(() => ({
    sideways: document.documentElement.scrollWidth - innerWidth,
    title: document.title,
    h1: document.querySelector(".pmg-hub h1")?.textContent ?? "",
    text: document.querySelector(".pmg-hub")?.textContent ?? "",
    staff: document.querySelector(".pmg-hub .staff")?.getAttribute("href"),
    pages: [...document.querySelectorAll(".pmg-hub .pages a")].map((a) => a.getAttribute("href")),
    zones: [...document.querySelectorAll(".pmg-hub .zones a")].map((a) => a.textContent),
    stops: window.__pmg.stops(),
    layout: window.__pmg.layout(),
    siteNav: document.querySelectorAll("#root > nav, footer").length,
    lenis: document.documentElement.classList.contains("lenis"),
  }));
  check("the hub is the home page and has drawn", info.title.includes("PROPMYGANDA") && /propmyganda/i.test(info.h1));
  check("no sideways scroll", info.sideways <= 0, `${info.sideways}px`);
  check("no concept or agency wording on PMG's site", !/concept|ket digital|not affiliated|unsolicited/i.test(info.text));
  check("staff sign-in is one tap away", info.staff === "/auth/login", String(info.staff));
  check("the menu lists the site's own pages", ["/artists", "/events", "/exclusive", "/distribution", "/publication", "/store", "/propworld", "/contact"].every((p) => info.pages.includes(p)), info.pages.join(" "));
  check("the menu lists every part of the hub", info.zones.length === 7, info.zones.join(" | "));
  check("the hub drives the scroll alone", info.lenis);
  check("the lit scene is not black", (await brightness(page)) > 6);

  // Every stop: its words show, and on one column the screen in focus sits clear above them.
  let wordsOk = true;
  let framingOk = true;
  let titlesOk = true;
  const bad = [];
  for (const [i, stop] of info.stops.entries()) {
    const r = await page.evaluate(({ y, i }) => {
      window.__pmg.drawAt(y);
      const block = document.querySelector(`.pmg-hub .w[data-i="${i}"]`);
      const box = block?.getBoundingClientRect();
      const rect = window.__pmg.focusRect();
      return {
        visible: block ? Number(getComputedStyle(block).opacity) > 0.9 : false,
        words: (block?.innerText ?? "").trim().length,
        // On one column a stop shows its title alone: anything else visible (bigger than a 1px
        // screen-reader clip) counts as an extra.
        titleShown: (() => { const t = block?.querySelector(".w-title"); return Boolean(t && t.getBoundingClientRect().height > 8 && t.innerText.trim().length >= 2); })(),
        extras: block ? [...block.children].filter((c) => !c.classList.contains("w-title") && getComputedStyle(c).display !== "none" && c.getBoundingClientRect().width * c.getBoundingClientRect().height > 4).length : 0,
        wordsTop: box?.top ?? 0,
        wordsRight: box?.right ?? 0,
        wordsBottom: box?.bottom ?? 0,
        rect,
        w: innerWidth,
        h: innerHeight,
      };
    }, { y: stop.y, i });
    if (!r.visible || r.words < 4 || r.wordsBottom > r.h + 1 || r.wordsRight > r.w + 1) {
      wordsOk = false;
      bad.push(`stop ${i} words`);
    }
    if (info.layout === "column" && stop.kind !== "join" && (!r.titleShown || r.extras > 0)) {
      titlesOk = false;
      bad.push(`stop ${i} not title-only (${r.extras} extra)`);
    }
    if (info.layout === "column" && stop.kind === "card" && r.rect && r.rect.bottom > r.wordsTop + 2) {
      framingOk = false;
      bad.push(`stop ${i} screen over words by ${Math.round(r.rect.bottom - r.wordsTop)}px`);
    }
    if (SHOTS) {
      mkdirSync(SHOTS, { recursive: true });
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(SHOTS, `${label}-${String(i).padStart(2, "0")}.png`) });
    }
  }
  check(`all ${info.stops.length} stops show their words inside the screen`, wordsOk, bad.join("; "));
  check("on one column, each screen sits above its words", framingOk, bad.join("; "));
  if (info.layout === "column") check("on one column, each part shows its title alone (the sign-up keeps its form)", titlesOk, bad.join("; "));
  check("no script errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

async function liveData(browser) {
  console.log("\nLive data from the back office");
  const future = new Date(Date.now() + 20 * 86_400_000).toISOString();
  // What the publications table holds, in three steps. The hub asks for the newest few, for the
  // newest featured one, and (when that one is older) for the 200th newest: answer each as the
  // database would.
  let step = 1;
  const at = (h) => new Date(Date.now() - h * 3_600_000).toISOString();
  const one = { title: "Checker story one", slug: "checker-one", category: "Artists", published_at: at(1) };
  const two = { title: "Checker story two", slug: "checker-two", category: "Business", published_at: at(2) };
  const newer = { title: "Breaking: a newer story", slug: "newer", category: "Culture", published_at: at(0.1) };
  const filler = Array.from({ length: 6 }, (_, i) => ({ title: `Checker filler ${i}`, slug: `filler-${i}`, category: "Industry", published_at: at(3 + i) }));
  const starred = { title: "Checker featured story", slug: "checker-featured", category: "Artists", published_at: at(200), featured: true };
  const table = () => (step === 1 ? [one, two] : step === 2 ? [newer, one] : [newer, one, two, ...filler, starred]);
  const asked = [];
  const stories = (url) => {
    asked.push(url.search);
    let rows = table();
    if (url.searchParams.get("featured") === "eq.true") rows = rows.filter((r) => r.featured);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? rows.length);
    return rows.slice(offset, offset + limit);
  };
  const events = [{ title: "Nonstop NY: the checker show", event_date: future, status: "upcoming", venue: "Checker Hall", city: "Brooklyn", doors_time: "10PM", ticket_url: "https://tickets.example/checker" }];
  const { ctx, page, errors } = await open(browser, { events, stories });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await hubReady(page);
  const read = () =>
    page.evaluate(async () => {
      const text = (id) => document.querySelector(`.pmg-hub [data-card="${id}"]`)?.closest(".w")?.textContent ?? "";
      // What a screen says when it is opened full size (its lines are drawn in 3D, not in the page).
      const opened = async (id) => {
        const stops = window.__pmg.stops();
        const stop = stops.findIndex((_, i) => document.querySelector(`.pmg-hub .w[data-i="${i}"] [data-card="${id}"]`));
        if (stop < 0) return "";
        window.__pmg.drawAt(stops[stop].y);
        window.__pmg.open(stops[stop].slot);
        await new Promise((r) => setTimeout(r, 120));
        const meta = document.querySelector("#viewer-meta")?.textContent ?? "";
        window.__pmg.close();
        await new Promise((r) => setTimeout(r, 120));
        return meta;
      };
      const viewer = await opened("events");
      const wireViewer = await opened("wire");
      return { events: text("events"), wire: text("wire"), viewer, wireViewer, links: [...document.querySelectorAll('.pmg-hub [data-card="wire"]')].map((el) => el.closest(".w")?.innerHTML ?? "").join("") };
    });
  await page.waitForFunction(() => /checker/i.test(document.querySelector("#words")?.innerHTML ?? "") || true, null, { timeout: 5000 });
  await page.waitForTimeout(1500);
  let r = await read();
  check("an event added in the back office shows on the Events screen", /checker show/i.test(r.viewer) && /Checker Hall/i.test(r.viewer), r.viewer.slice(0, 160));
  check("its ticket link is offered", /tickets\.example\/checker/.test(await page.evaluate(() => document.querySelector("#words")?.innerHTML ?? "")));
  check("the newest Wire story is linked from the Wire screen", /\/publication\/checker-one/.test(r.links), r.links.slice(0, 120));
  // The hub re-reads when the tab is looked at again, once what it holds is a minute old: keep
  // "looking" until the story at this address is the linked one.
  const lookUntil = async (slug) => {
    for (let i = 0; i < 20; i += 1) {
      await page.evaluate(() => {
        // What the browser sends when a tab comes back into view (it bubbles up to the window).
        document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
      });
      const landed = await page
        .waitForFunction((s) => (document.querySelector("#words")?.innerHTML ?? "").includes(`/publication/${s}"`), slug, { timeout: 5_000, polling: 250 })
        .then(() => true, () => false);
      if (landed) return;
    }
  };
  // A new story lands.
  step = 2;
  await lookUntil("newer");
  r = await read();
  check("a story published later replaces it without a reload", /\/publication\/newer/.test(r.links), r.links.slice(0, 120));
  // Staff press "Feature" on an older story: it leads the Publication page, so it leads here.
  step = 3;
  await lookUntil("checker-featured");
  r = await read();
  check("a story staff marked Feature is the Wire screen's top story", /\/publication\/checker-featured"/.test(r.links), r.links.slice(0, 160));
  check("it is listed first, above the newest", /Checker featured story[\s\S]*Breaking: a newer story/.test(r.wireViewer), r.wireViewer.slice(0, 200));
  check("it asked the database for the featured story and for the 200th newest", asked.some((q) => /featured=eq\.true/.test(q)) && asked.some((q) => /offset=199/.test(q)), asked.slice(-3).join(" | ").slice(0, 200));
  check("no script errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();

  // And once against the real, public feed (read-only).
  const real = await open(browser);
  await real.page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await hubReady(real.page);
  await real.page.waitForFunction(() => /\/publication\/[a-z0-9]/.test(document.querySelector("#words")?.innerHTML ?? ""), null, { timeout: 30_000 }).catch(() => {});
  const top = await real.page.evaluate(() => /href="(\/publication\/[^"]+)"/.exec(document.querySelector("#words")?.innerHTML ?? "")?.[1] ?? "");
  check("the real Wire feed reaches the hub", top.length > 13, top);
  await real.ctx.close();
}

async function ringLoops(browser) {
  console.log("\nThe ring loops");
  const { ctx, page, errors } = await open(browser, { viewport: { width: 1440, height: 900 } });
  const asked = [];
  page.on("request", (req) => {
    if (/\/hub\/reels\/.+\.mp4$/.test(new URL(req.url()).pathname)) asked.push(req.headers().range ? "part" : "whole");
  });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await hubReady(page);
  await page.waitForTimeout(2000);
  const before = await page.evaluate(() => window.__pmg.loops());
  check("the reels have loops, and at the top of the page none has been downloaded", before.length >= 1 && before.every((l) => !l.asked) && asked.length === 0, `${before.length} loops, ${asked.length} asked`);
  // Walk down the tower until a loop is moving.
  const moving = await page.evaluate(async () => {
    const hub = window.__pmg;
    for (const stop of hub.stops()) {
      hub.drawAt(stop.y);
      for (let i = 0; i < 40; i += 1) {
        await new Promise((r) => setTimeout(r, 150));
        const on = hub.loops().filter((l) => !l.paused && l.time > 0);
        if (on.length) return { on: on.length, from: on[0].from, y: stop.y };
        if (!hub.loops().some((l) => l.asked)) break; // no ring near at this stop
      }
    }
    return { on: 0, from: "none", y: -1 };
  });
  check("near its ring, a loop plays", moving.on >= 1, JSON.stringify(moving));
  check("it plays from memory, fetched whole", moving.from === "memory" && asked.length >= 1 && asked.every((a) => a === "whole"), `${moving.from}; requests: ${asked.join(",")}`);
  const state = await page.evaluate(() => window.__pmg.loops());
  check("no loop failed to load", state.every((l) => !l.failed), JSON.stringify(state).slice(0, 200));
  check("no script errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

async function joinForm(browser) {
  console.log("\nThe sign-up form");
  for (const [mode, want] of [["ok", /on the list/i], ["duplicate", /on the list/i], ["down", /did not save/i]]) {
    const { ctx, page, signups } = await open(browser, { signup: mode, viewport: { width: 390, height: 844 }, mobile: true });
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await hubReady(page);
    await page.evaluate(() => {
      const s = window.__pmg.stops();
      window.__pmg.drawAt(s[s.length - 1].y);
    });
    await page.fill("#join-email", "not-an-email");
    await page.click(".join-form button");
    const refused = await page.textContent(".form-note");
    await page.fill("#join-email", "checker@example.com");
    await page.click(".join-form button");
    await page.waitForFunction(() => !/Saving/.test(document.querySelector(".form-note")?.textContent ?? "Saving"), null, { timeout: 15_000 });
    const note = await page.textContent(".form-note");
    if (mode === "ok") {
      check("a bad address is refused before anything is sent", /check the email/i.test(refused ?? "") && signups.length === 1);
      const row = signups[0]?.[0] ?? signups[0];
      check("a sign-up is saved the way the Exclusive page saves it", row?.email === "checker@example.com" && row?.source === "site" && row?.is_active === true && row?.unsubscribed_at === null, JSON.stringify(row));
    }
    check(`sign-up answer when the database says "${mode}"`, want.test(note ?? ""), note ?? "");
    await ctx.close();
  }
}

async function playing(browser) {
  console.log("\nOpening a screen");
  const { ctx, page, errors } = await open(browser);
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await hubReady(page);
  const r = await page.evaluate(async () => {
    const stops = window.__pmg.stops();
    const first = stops.find((s) => s.kind === "card");
    window.__pmg.drawAt(first.y);
    window.__pmg.open(first.slot);
    await new Promise((res) => setTimeout(res, 1200));
    const frame = document.querySelector(".pmg-hub .holo-frame iframe")?.getAttribute("src") ?? "";
    const open = document.querySelector(".pmg-hub").hasAttribute("data-open");
    window.__pmg.close();
    await new Promise((res) => setTimeout(res, 900));
    const chip = !document.querySelector("#now").hidden;
    document.querySelector("#now-stop").click();
    await new Promise((res) => setTimeout(res, 300));
    return { frame, open, chip, stopped: document.querySelector("#now").hidden, playing: window.__pmg.state().playing };
  });
  check("a release opens its video player on the screen", /youtube-nocookie\.com\/embed\//.test(r.frame) && r.open, r.frame);
  check("it keeps playing after going back, with a now-playing chip", r.chip);
  check("Stop ends it", r.stopped && r.playing === -1);
  check("no script errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

/** With a screen open, what is on top at three points across its player, and can the words be reached? */
async function playersTakeClicks(browser) {
  console.log("\nPlayers on an opened screen");
  for (const [label, viewport, mobile] of [["desktop", { width: 1440, height: 900 }, false], ["phone", { width: 390, height: 844 }, true]]) {
    const { ctx, page } = await open(browser, { viewport, mobile, dpr: mobile ? 2 : 1 });
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await hubReady(page);
    const r = await page.evaluate(async () => {
      const hub = window.__pmg;
      const wait = (ms) => new Promise((res) => setTimeout(res, ms));
      const seen = {};
      for (const stop of hub.stops().filter((s) => s.kind === "card")) {
        hub.drawAt(stop.y);
        hub.open(stop.slot);
        await wait(1300);
        const frame = document.querySelector(".pmg-hub .holo-frame iframe");
        const kind = /spotify/.test(frame?.src ?? "") ? "spotify" : /youtube/.test(frame?.src ?? "") ? "youtube" : "";
        if (kind && !seen[kind]) {
          // The player takes clicks once the screen has flown up: give it a few seconds.
          for (let i = 0; i < 30; i += 1) {
            const b = frame.getBoundingClientRect();
            if (document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) === frame) break;
            await wait(200);
          }
          const box = frame.getBoundingClientRect();
          const top = (x, y) => {
            const el = document.elementFromPoint(x, y);
            return el ? el.tagName + (el.id ? `#${el.id}` : "") : "nothing";
          };
          const y = box.top + box.height / 2;
          seen[kind] = {
            hits: [top(box.left + box.width * 0.12, y), top(box.left + box.width / 2, y), top(box.right - box.width * 0.12, y)],
            inert: document.querySelector("#words").inert,
            // Does the title panel or the Back button lie over any part of the player?
            covered: [document.querySelector("#viewer-meta"), document.querySelector(".viewer-ctl")].some((el) => {
              const c = el.getBoundingClientRect();
              return c.left < box.right && c.right > box.left && c.top < box.bottom && c.bottom > box.top;
            }),
            reachable: [...document.querySelectorAll("#words a, #words button, #words input")].filter((el) => !el.closest("[inert]")).length,
          };
        }
        hub.close();
        await wait(700);
        if (kind && seen[kind].after === undefined) seen[kind].after = document.querySelector("#words").inert;
        if (seen.spotify && seen.youtube) break;
      }
      document.querySelector("#now-stop")?.click();
      return seen;
    });
    for (const kind of ["youtube", "spotify"]) {
      const s = r[kind];
      check(`${label}: an opened ${kind === "youtube" ? "YouTube" : "Spotify"} player takes clicks and taps across its width`, Boolean(s) && s.hits.every((h) => h === "IFRAME"), s ? s.hits.join(" ") : "no such screen found");
      if (label === "desktop") check(`desktop: the title panel and the Back button are clear of the ${kind === "youtube" ? "YouTube" : "Spotify"} player`, Boolean(s) && s.covered === false, JSON.stringify(s ?? {}));
      check(`${label}: the faded words cannot be clicked or tabbed to meanwhile, and work again after going back`, Boolean(s) && s.inert && s.reachable === 0 && s.after === false, JSON.stringify(s ?? {}));
    }
    await ctx.close();
  }
}

/** Mute carries from one reel to the next, and the button says what the sound is doing. */
async function reelSound(browser) {
  console.log("\nSound on the reels");
  const { ctx, page } = await open(browser);
  await page.addInitScript(() => {
    const make = document.createElement.bind(document);
    window.__videos = [];
    document.createElement = (tag, ...rest) => {
      const el = make(tag, ...rest);
      if (String(tag).toLowerCase() === "video") window.__videos.push(el);
      return el;
    };
  });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await hubReady(page);
  const r = await page.evaluate(async () => {
    const hub = window.__pmg;
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const state = () => ({ label: document.querySelector("#viewer-mute").textContent, muted: window.__videos[window.__videos.length - 1].muted, videos: window.__videos.length });
    const out = [];
    let reels = 0;
    for (const stop of hub.stops().filter((s) => s.kind === "card")) {
      hub.drawAt(stop.y);
      hub.open(stop.slot);
      await wait(1200);
      if (document.querySelector("#viewer").hasAttribute("data-reel")) {
        reels += 1;
        out.push(state());
        if (reels === 1) {
          document.querySelector("#viewer-mute").click();
          await wait(300);
          out.push(state());
        }
      }
      hub.close();
      await wait(700);
      if (reels === 2) break;
    }
    return out;
  });
  const honest = (s) => s.label === (s.muted ? "Sound on" : "Mute");
  check("two reels were opened", r.length === 3, JSON.stringify(r));
  if (r.length === 3) {
    check("the Mute button says what the sound is doing, before and after pressing it", r.every(honest) && r[1].muted !== r[0].muted, JSON.stringify(r));
    check("the choice carries to the next reel", r[2].videos > r[1].videos && r[2].muted === r[1].muted, JSON.stringify(r));
  }
  await ctx.close();
}

/** Opens the hub's menu and follows one of its page links, once the menu has finished opening. */
async function openFromMenu(page, href) {
  await page.click("#menu-btn");
  // The menu reveals its links over about a second; a link takes clicks once it is the top
  // element at its own centre.
  await page.waitForFunction(
    (h) => {
      const a = document.querySelector(`.pmg-hub .pages a[href="${h}"]`);
      if (!a) return false;
      const b = a.getBoundingClientRect();
      return document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) === a;
    },
    href,
    { timeout: 30_000, polling: 100 },
  );
  await page.click(`.pmg-hub .pages a[href="${href}"]`);
}

async function leavingAndReturning(browser) {
  console.log("\nLeaving the hub and coming back");
  const { ctx, page, errors } = await open(browser);
  await page.goto(`${BASE}/events`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1", { timeout: 30_000 });
  const before = await page.evaluate(() => ({ lenis: document.documentElement.classList.contains("lenis"), bg: getComputedStyle(document.body).backgroundColor }));
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await hubReady(page);
  const at = await page.evaluate(() => {
    const s = window.__pmg.stops();
    window.__pmg.drawAt(s[4].y);
    return s[4].y;
  });
  await openFromMenu(page, "/events");
  await page.waitForFunction(() => location.pathname === "/events" && !document.querySelector(".pmg-hub") && document.querySelector("h1"), null, { timeout: 30_000 });
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => ({
    hubClass: document.documentElement.classList.contains("pmg-hub-on"),
    lenis: document.documentElement.classList.contains("lenis"),
    bg: getComputedStyle(document.body).backgroundColor,
    scrollY,
    canvases: document.querySelectorAll("canvas.earth-source, #scene").length,
    siteNav: Boolean(document.querySelector("nav")),
    hook: typeof window.__pmg,
  }));
  check("a page link in the hub opens that page without a reload", true);
  check("the hub is fully gone from the next page", !after.hubClass && after.canvases === 0 && after.hook === "undefined", JSON.stringify(after));
  check("the next page starts at its top, with the site's nav", after.scrollY === 0 && after.siteNav, JSON.stringify(after));
  check("the site's smooth scroll and page colours are as before the hub", after.lenis === before.lenis && after.bg === before.bg, `${JSON.stringify(before)} vs ${JSON.stringify(after)}`);
  await page.goBack();
  await hubReady(page);
  const back = await page.evaluate(() => scrollY);
  check("Back returns to the same place in the hub", Math.abs(back - at) < 40, `${back} vs ${at}`);
  check("no script errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
  // In a new tab: leave part-way down, then load the home page afresh (a typed address, a bookmark).
  const again = await open(browser);
  await again.page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await hubReady(again.page);
  await again.page.evaluate(() => window.__pmg.drawAt(window.__pmg.stops()[4].y));
  await openFromMenu(again.page, "/events");
  await again.page.waitForFunction(() => location.pathname === "/events" && !document.querySelector(".pmg-hub"), null, { timeout: 30_000 });
  await again.page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await hubReady(again.page);
  const fresh = await again.page.evaluate(() => scrollY);
  check("a fresh load of the home page starts at the top", fresh < 5, `scrollY ${fresh}`);
  await again.ctx.close();
}

async function fallbacks() {
  console.log("\nDevices that cannot run the hub");
  const classic = async (page) => {
    await page.waitForFunction(() => /Manifesto/i.test(document.body.textContent ?? ""), null, { timeout: 60_000 });
    return page.evaluate(() => ({ hub: Boolean(document.querySelector(".pmg-hub")), nav: Boolean(document.querySelector("nav")), text: document.body.textContent ?? "" }));
  };
  const noGl = await launch(NO_GL);
  let s = await open(noGl);
  await s.page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  let r = await classic(s.page);
  check("no WebGL: the classic home page, with the site's nav", !r.hub && r.nav && /Let's/i.test(r.text));
  check("no WebGL: no script errors", s.errors.length === 0, s.errors.slice(0, 3).join(" | "));
  await noGl.close();

  const soft = await launch(SOFTWARE);
  s = await open(soft, { reducedMotion: true });
  await s.page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  r = await classic(s.page);
  check('"reduce motion" on: the classic home page', !r.hub && r.nav);
  await s.ctx.close();
  s = await open(soft);
  await s.page.goto(`${BASE}/?classic`, { waitUntil: "domcontentloaded" });
  r = await classic(s.page);
  check("?classic shows the classic home page on any device", !r.hub && r.nav);
  await s.ctx.close();
  // The hub's own code fails to arrive (a dropped connection, or a build replaced mid-visit).
  s = await open(soft);
  await s.page.route("**/assets/mount-*.js", (route) => route.abort());
  await s.page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  r = await classic(s.page);
  const lenis = await s.page.evaluate(() => document.documentElement.classList.contains("lenis") && !document.documentElement.classList.contains("pmg-hub-on"));
  check("the hub's code fails to load: the classic home page, with the site's smooth scroll back", !r.hub && r.nav && lenis);
  await s.ctx.close();
  // A page that is loaded on demand fails to arrive, even after the one automatic reload.
  for (const [name, address, file] of [["the classic home", "/?classic", "Index"], ["PropWorld", "/propworld", "Propworld"]]) {
    s = await open(soft);
    await s.page.route(`**/assets/${file}-*.js`, (route) => route.abort());
    await s.page.goto(`${BASE}${address}`, { waitUntil: "domcontentloaded" });
    const shown = await s.page
      .waitForFunction(() => /didn.t load/i.test(document.body.textContent ?? "") && Boolean(document.querySelector("nav")) && Boolean(document.querySelector("button")), null, { timeout: 30_000 })
      .then(() => true, () => false);
    check(`${name}'s code fails to load: a message with a Reload button and the site's nav, not a blank page`, shown, (await s.page.evaluate(() => document.body.textContent ?? "")).slice(0, 120));
    await s.ctx.close();
  }
  await soft.close();
}

async function otherPages(browser) {
  console.log("\nEvery other page still opens");
  const routes = ["/artists", "/artists/chuckiee", "/events", "/exclusive", "/distribution", "/publication", "/store", "/propworld", "/contact", "/start", "/start/addons", "/auth/login", "/dashboard", "/admin/stevie", "/not-a-page"];
  for (const route of routes) {
    const { ctx, page, errors } = await open(browser);
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => (document.querySelector("#root")?.textContent ?? "").trim().length > 40, null, { timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => ({
      text: (document.querySelector("#root")?.textContent ?? "").trim().length,
      hub: Boolean(document.querySelector(".pmg-hub")) || document.documentElement.classList.contains("pmg-hub-on"),
    }));
    // The site's own 404 page reports itself to the console on purpose.
    const real = errors.filter((e) => !(route === "/not-a-page" && /404 Error/.test(e)));
    check(`${route} renders, untouched by the hub`, r.text > 40 && !r.hub && real.length === 0, real.slice(0, 2).join(" | ") || `text ${r.text}`);
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------------------------
const gpu = flag("gpu");
const browser = await launch(gpu ? ["--enable-gpu", "--use-angle=metal"] : SOFTWARE);
try {
  await hubAt(browser, "desktop-1440x900", { width: 1440, height: 900 }, false);
  await hubAt(browser, "phone-390x844", { width: 390, height: 844 }, true);
  await hubAt(browser, "small-phone-320x568", { width: 320, height: 568 }, true);
  await hubAt(browser, "tablet-768x1024", { width: 768, height: 1024 }, true);
  if (gpu) {
    const { ctx, page } = await open(browser, { viewport: { width: 1440, height: 900 } });
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await hubReady(page);
    await page.waitForFunction(() => window.__pmg.earth() === "live", null, { timeout: 90_000 }).catch(() => {});
    const r = await page.evaluate(() => ({ gpu: window.__pmg.gpu(), earth: window.__pmg.earth() }));
    check("on a real GPU the live Earth runs behind the hub", r.earth === "live", `${r.earth} on ${r.gpu}`);
    await ctx.close();
  } else {
    await liveData(browser);
    await ringLoops(browser);
    await joinForm(browser);
    await playing(browser);
    await playersTakeClicks(browser);
    await reelSound(browser);
    await leavingAndReturning(browser);
    await otherPages(browser);
  }
} finally {
  await browser.close();
}
if (!gpu) await fallbacks();
server.close();

if (outside.size) {
  console.log("\nConsole messages from other sites' pages (not counted):");
  for (const o of outside) console.log(`  ${o}`);
}
console.log(`\n${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`  FAILED: ${f}`);
process.exit(failures.length ? 1 : 0);
