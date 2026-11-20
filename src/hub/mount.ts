// The PMG hub: the home page as one 3D tower of screens you scroll down through.
//
// This file runs the hub inside the element the page gives it (`HubHome.tsx` renders the fixed
// skeleton: canvas, nav, words, viewer). It owns the scroll, the words for every stop, the
// viewer and the 3D world, and it puts everything back when the visitor leaves the page.
//
// It never decides what PMG says: the content arrives from `content.ts`, which reads the same
// files and tables as the rest of the site.
import './hub.css';
import Lenis from 'lenis';
import { type HubContent, type HubLink, SOCIALS, setContent, WHAT_WE_DO, ZONES } from './data';
import { type EarthLayer, startEarth } from './earth';
import { createGlitch } from './glitch';
import {
  buildStops,
  buildTower,
  clamp,
  dampPose,
  type Layout,
  type Pose,
  poseAt,
  poseDistance,
  type Stop,
  wordsVisibility,
} from './layout';
import { grainDataUrl } from './lens';
import { createWorld, type HubWorld, type Rect } from './world';

export interface HubOptions {
  content: HubContent;
  /** Where the hub's own files in public/ are served from; ends with "/". */
  root: string;
  /** Opens a page of this site without reloading. */
  navigate(path: string): void;
  /** Adds an email to PMG's list; resolves true once it is saved. */
  join(email: string): Promise<boolean>;
  /** Scroll position to start from, in stops (for coming back with the Back button). */
  startAt?: number;
  /** Abort to tear the hub down, even while it is still starting. */
  signal?: AbortSignal;
}

export interface HubHandle {
  /** New words for the screens (live events, the Wire). The set of screens stays the same. */
  update(content: HubContent): void;
  /** Where the visitor is, in stops (to come back to it later). */
  position(): number;
  dispose(): void;
}

/** Thrown when this device cannot run the hub; the page then shows the classic home instead. */
export class HubUnavailable extends Error {}

/** For the end-to-end checks: read-only state and a way to step the hub. */
interface HubHook {
  ready: boolean;
  layout(): Layout;
  stops(): { kind: string; zone: number; slot: number; y: number }[];
  drawAt(y: number): { index: number };
  state(): { index: number; scrollY: number; dpr: number; frames: number; open: number; playing: number };
  open(slot: number): void;
  close(): void;
  focusRect(): Rect | null;
  logoRect(): Rect | null;
  gpu(): string;
  earth(): string;
  loops(): { asked: boolean; from: string; paused: boolean; time: number; failed: boolean }[];
}

export function webgl2(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

const esc = (t: string) =>
  t.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  );
const internal = (href: string) => href.startsWith('/');
/** A link to another site opens in a new tab; a link to one of PMG's own pages stays in the app. */
const anchor = ([label, href]: HubLink, cls = '') =>
  internal(href)
    ? `<a${cls ? ` class="${cls}"` : ''} href="${esc(href)}" data-route>${esc(label)}</a>`
    : `<a${cls ? ` class="${cls}"` : ''} href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>`;

export async function mountHub(host: HTMLElement, opts: HubOptions): Promise<HubHandle> {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !webgl2()) throw new HubUnavailable('no WebGL 2, or reduced motion is on');

  setContent(opts.content);
  const $ = <T extends Element = HTMLElement>(s: string) => host.querySelector(s) as T;
  const params = new URLSearchParams(location.search);
  const html = document.documentElement;
  const ac = new AbortController();
  const signal = ac.signal;
  let disposed = false;

  const glitch = createGlitch(undefined, reduced);
  const columnQuery = matchMedia('(max-width: 899px), (max-aspect-ratio: 1/1)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;

  const tower = buildTower();
  const canvas = $<HTMLCanvasElement>('#scene');
  const probe = $('#probe');
  let layout: Layout = columnQuery.matches ? 'column' : 'row';
  let stops: Stop[] = buildStops(tower, layout, innerWidth / innerHeight);
  let vh = innerHeight;
  let world: HubWorld | null = null;
  let earth: EarthLayer | null = null;
  let lenis: Lenis | null = null;
  let current: Pose = stops[0];
  let index = 0;
  let pointer: [number, number] = [0, 0];
  let pointerTarget: [number, number] = [0, 0];
  let dpr = 1;
  let maxDpr = 1;

  // ------------------------------------------------------------------ the words for every stop
  const words = $('#words');
  const deeper = (l: HubLink) =>
    internal(l[1])
      ? `<a class="deeper" href="${esc(l[1])}" data-route>${esc(l[0])} →</a>`
      : `<a class="deeper" href="${esc(l[1])}" target="_blank" rel="noopener">${esc(l[0])} →</a>`;

  /** Live titles from Spotify (playlists and artists), kept so a rebuild of the words keeps them. */
  const liveTitles = new Map<string, string>();
  const titleOf = (c: { id: string; title: string }) => liveTitles.get(c.id) ?? c.title;
  /** What the join form last said, kept across a rebuild of the words. */
  let joinNote = '';

  function blockFor(stop: Stop, i: number): string {
    if (stop.kind === 'home') {
      const z = ZONES[0];
      return `<section class="w w-home" data-i="${i}">
      <p class="label">${esc(z.label)}</p>
      <h1 class="display w-title">${esc(z.title)}</h1>
      <p class="w-line">${esc(z.line)}</p>
      <ul class="what">${WHAT_WE_DO.map(([t, d], k) => `<li><span class="label accent">0${k + 1}</span> <b>${esc(t)}</b> ${esc(d)}</li>`).join('')}</ul>
      <p class="label hint">Scroll to enter the hub · tap any screen to play it</p>
      ${z.cards.length === 0 && z.deeper ? deeper(z.deeper) : ''}
    </section>`;
    }
    if (stop.kind === 'zone') {
      const z = ZONES[stop.zone];
      return `<section class="w w-zone" data-i="${i}" aria-labelledby="z-${z.id}">
      <p class="label accent">${esc(z.label)}</p>
      <h2 class="display w-title" id="z-${z.id}">${esc(z.title)}</h2>
      <p class="w-line">${esc(z.line)}</p>
      <ol class="w-index">${z.cards
        .map((c) => {
          const n = tower.slots.findIndex((s) => s.card.id === c.id);
          return `<li><button type="button" data-open="${n}"><span class="label">${esc(c.code)}</span> ${esc(titleOf(c))}</button></li>`;
        })
        .join('')}</ol>
      ${z.deeper ? deeper(z.deeper) : ''}
    </section>`;
    }
    if (stop.kind === 'card') {
      const s = tower.slots[stop.slot];
      const c = s.card;
      const verb = c.media.kind === 'info' ? 'Open' : 'Play';
      return `<section class="w w-card" data-i="${i}">
      <p class="label"><span class="accent">${String(s.index + 1).padStart(2, '0')} / ${String(ZONES[s.zone].cards.length).padStart(2, '0')}</span> ${esc(c.code)}</p>
      <h3 class="display w-title" data-card="${esc(c.id)}">${esc(titleOf(c))}</h3>
      <p class="w-sub">${esc(c.sub)}</p>
      <button type="button" class="act" data-open="${stop.slot}"><span class="act-dot" aria-hidden="true"></span>${verb} ${esc(titleOf(c))}</button>
      ${c.links ? `<p class="links">${c.links.map((l) => anchor(l)).join('')}</p>` : ''}
    </section>`;
    }
    return `<section class="w w-join" data-i="${i}" aria-labelledby="join-h">
    <h2 class="display w-title" id="join-h">Get every drop first</h2>
    <form class="join-form" novalidate>
      <label class="sr" for="join-email">Email</label>
      <input id="join-email" type="email" placeholder="you@email.com" autocomplete="email" required />
      <button type="submit">Join</button>
      <p class="form-note label" role="status" aria-live="polite">${esc(joinNote)}</p>
    </form>
    <p class="links">${[...SOCIALS, ['Contact PMG', '/contact'] as HubLink].map((l) => anchor(l)).join('')}</p>
    <p class="made"><span class="label">Made by</span> <a href="https://ket-digital.com" target="_blank" rel="noopener">Kill Everything Digital <span class="nobr">(53XV Studios)</span></a></p>
    <p class="credit">Art, reels and music © Propmyganda and the artists. Type: Big Shoulders Display (Patric King), Space Mono (Colophon), SIL OFL. 3D: three.js. Earth: Earthlight by Max Vyshniakov (MIT, <a href="${esc(opts.root)}licenses/earthlight/LICENSE.txt" target="_blank" rel="noopener">licence</a>), adapted; NASA Black Marble and Blue Marble, NASA SVS Deep Star Maps (Ernie Wright) with ESA Gaia DR2, HYG stars by David Nash (<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>): <a href="${esc(opts.root)}licenses/earthlight/NOTICE.md" target="_blank" rel="noopener">full notice</a>.</p>
  </section>`;
  }
  function buildWords() {
    words.innerHTML = stops.map(blockFor).join('');
  }
  let blocks: HTMLElement[] = [];
  const lastVis: number[] = [];

  /** The menu's list of the hub's own parts, numbered as the tower is stacked. */
  function buildZoneMenu() {
    const names = [...ZONES.map((z, k) => (k === 0 ? 'Home' : z.title)), 'Join'];
    $('.zones').innerHTML = names
      .map(
        (n, k) =>
          `<li><a href="#track" data-zone="${k}"><span>${esc(n)}</span><span class="n">${String(k + 1).padStart(2, '0')}</span></a></li>`,
      )
      .join('');
    return names;
  }
  let zoneNames: string[] = [];

  function applyWords(idx: number) {
    // One column, at home: only the title is on screen (it carries its own short shade), so the
    // full shade kept behind words lifts off the Earth and the tower.
    const bare = layout === 'column' && idx < 0.55;
    host.classList.toggle('at-home', bare);
    world?.setShade(bare ? 0 : 1);
    // Only the title in view tears (Glitch Slice); none while a screen is open over the words.
    const cur = Math.round(clamp(idx, 0, blocks.length - 1));
    glitch.focus(
      !host.hasAttribute('data-open') && wordsVisibility(idx, cur) > 0.6
        ? (blocks[cur]?.querySelector<HTMLElement>('.w-title') ?? null)
        : null,
    );
    blocks.forEach((el, i) => {
      const v = wordsVisibility(idx, i);
      if (Math.abs(v - (lastVis[i] ?? -1)) < 0.002) return;
      lastVis[i] = v;
      el.style.opacity = v.toFixed(3);
      el.style.visibility = v < 0.002 ? 'hidden' : 'visible';
      el.style.pointerEvents = v > 0.5 ? 'auto' : 'none';
      el.style.transform = `translate3d(0, ${((1 - v) * 24 * (idx < i ? 1 : -1)).toFixed(1)}px, 0)`;
    });
    const zone = stops[Math.round(clamp(idx, 0, stops.length - 1))].zone;
    for (const a of host.querySelectorAll<HTMLElement>('.zones a'))
      a.toggleAttribute('aria-current', Number(a.dataset.zone) === zone);
    const here = `${String(zone + 1).padStart(2, '0')} · ${zoneNames[zone] ?? ''}`;
    const hereEl = $('#here');
    if (hereEl.textContent !== here) hereEl.textContent = here;
  }

  // ------------------------------------------------------------------ measuring and scrolling
  function measure() {
    layout = columnQuery.matches ? 'column' : 'row';
    vh = probe.offsetHeight || innerHeight;
    stops = buildStops(tower, layout, innerWidth / innerHeight);
    $('#track').style.height = `${(stops[stops.length - 1].at + 1) * vh}px`;
    // The words are rebuilt on a resize and when live data lands: keep what the visitor typed.
    const field = words.querySelector<HTMLInputElement>('#join-email');
    const typed = field?.value ?? '';
    const typing = Boolean(field) && document.activeElement === field;
    buildWords();
    const fieldNow = words.querySelector<HTMLInputElement>('#join-email');
    if (fieldNow && typed) fieldNow.value = typed;
    if (fieldNow && typing) fieldNow.focus({ preventScroll: true });
    blocks = [...words.querySelectorAll<HTMLElement>('.w')];
    glitch.attach(words, '.w-title');
    if (layout === 'column') {
      // Measure the band above each stop's words (the blocks lay out while hidden), then frame
      // the stops into it. The words do not depend on the framing, so they stay as built.
      const h = innerHeight;
      const bar = Math.max(
        ...[...host.querySelectorAll<HTMLElement>('.logo, .nav-right')].map(
          (n) => n.getBoundingClientRect().bottom,
        ),
        0,
      );
      const bands = blocks.map((b) => ({
        top: (bar + 8) / h,
        bottom: (b.getBoundingClientRect().top - 14) / h,
      }));
      stops = buildStops(tower, layout, innerWidth / h, (i) => bands[i] ?? null);
    }
    lastVis.length = 0;
    wireBlocks();
  }
  const atOf = (y: number) => y / vh;
  const yOf = (stopIndex: number) => stops[stopIndex].at * vh;

  function goTo(stopIndex: number) {
    const y = yOf(stopIndex);
    if (lenis) lenis.scrollTo(y, { duration: 1.6, easing: (t: number) => 1 - (1 - t) ** 4 });
    else scrollTo({ top: y });
    kick();
  }

  // ------------------------------------------------------------------ the loop
  let running = false;
  let last = 0;
  let clock = 0;
  let lastDraw = 0;
  const gaps: number[] = [];
  function kick() {
    if (running || disposed) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }
  function adapt(ms: number) {
    if (!world) return;
    gaps.push(ms);
    if (gaps.length < 40) return;
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    gaps.length = 0;
    let next = dpr;
    if (avg > 24 && dpr > 0.75) next = Math.max(0.75, dpr * 0.8);
    else if (avg < 18 && dpr < maxDpr) next = Math.min(maxDpr, dpr * 1.12);
    if (next !== dpr) {
      dpr = next;
      world.setSize(innerWidth, innerHeight, dpr);
    }
  }
  /** 1 when a single screen is in focus, 0 at the overview stops, eased between. */
  function cardFocus(idx: number) {
    const a = stops[Math.floor(clamp(idx, 0, stops.length - 1))];
    const b = stops[Math.ceil(clamp(idx, 0, stops.length - 1))];
    const f = idx - Math.floor(idx);
    return (a.kind === 'card' ? 1 - f : 0) + (b.kind === 'card' ? f : 0);
  }

  function tick(now: number) {
    if (disposed) return;
    const ms = now - last;
    const dt = Math.min(0.05, ms / 1000);
    last = now;
    clock += dt;
    lenis?.raf(now);
    const t = poseAt(stops, atOf(scrollY));
    current = dampPose(current, t.pose, 7, dt);
    index += (t.index - index) * (1 - Math.exp(-9 * dt));
    const k = 1 - Math.exp(-4 * dt);
    pointer = [
      pointer[0] + (pointerTarget[0] - pointer[0]) * k,
      pointer[1] + (pointerTarget[1] - pointer[1]) * k,
    ];
    let moving =
      poseDistance(current, t.pose) > 1e-4 ||
      Math.abs(index - t.index) > 1e-3 ||
      Math.abs(pointer[0] - pointerTarget[0]) + Math.abs(pointer[1] - pointerTarget[1]) > 2e-3 ||
      Boolean(lenis?.isScrolling);
    applyWords(index);
    if (world) {
      world.apply(
        current,
        pointer,
        stops[Math.round(clamp(index, 0, stops.length - 1))].zone,
        cardFocus(index),
      );
      if (world.step(dt, clock)) moving = true;
      if (world.playingNeedsFrames()) moving = true;
      // Standing still, only the kinetic column drifts: draw it at about 30 frames a second.
      if (moving || now - lastDraw >= 32) {
        world.render();
        lastDraw = now;
      }
      if (moving && ms > 0 && ms < 200) adapt(ms);
    }
    updateViewer();
    // The hub always has something slowly moving (the column, the Earth), so the loop keeps
    // running; it stops drawing whenever the tab is hidden (the browser stops calling it).
    requestAnimationFrame(tick);
  }

  function drawAt(y: number) {
    lenis?.scrollTo(y, { immediate: true, force: true });
    scrollTo(0, y);
    const t = poseAt(stops, atOf(scrollY));
    current = t.pose;
    index = t.index;
    pointer = [0, 0];
    pointerTarget = [0, 0];
    lastVis.length = 0;
    applyWords(index);
    if (world) {
      world.apply(current, pointer, stops[Math.round(index)].zone, cardFocus(index));
      world.step(1, clock);
      world.render();
    }
    return { index };
  }

  // ------------------------------------------------------------------ the viewer (a screen flown up to full size)
  const viewer = $('#viewer');
  const viewerMeta = $('#viewer-meta');
  const nowPlaying = $('#now');
  let openSlot = -1;
  let muted = false;
  /**
   * On a wide window, an opened screen is framed in the room beside the title panel and under
   * the Back button, so neither lies over a player's own controls. On one column the panel sits
   * under the screen already.
   */
  function frameOpenScreen() {
    if (!world) return;
    const meta = viewerMeta.getBoundingClientRect();
    const ctl = $('.viewer-ctl').getBoundingClientRect();
    if (layout === 'column' || meta.width === 0 || innerWidth < 900) {
      world.setOpenBox(null);
      return;
    }
    world.setOpenBox({ left: meta.right + 24, top: ctl.bottom + 12, right: meta.left, bottom: meta.left });
  }
  function openScreen(slot: number) {
    const s = tower.slots[slot];
    if (!s || !world) return;
    openSlot = slot;
    host.setAttribute('data-open', '');
    // The words are faded out while a screen is open: take them out of reach of Tab too.
    words.inert = true;
    lenis?.stop();
    const c = s.card;
    viewerMeta.innerHTML = `<p class="label"><span class="accent">${esc(c.code)}</span></p><h2 class="display v-title">${esc(titleOf(c))}</h2><p class="w-sub">${esc(c.sub)}</p>${
      c.lines && c.media.kind === 'info'
        ? `<ul class="v-lines">${c.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`
        : ''
    }${c.links ? `<p class="links">${c.links.map((l) => anchor(l)).join('')}</p>` : ''}`;
    viewer.toggleAttribute('data-reel', c.media.kind === 'reel');
    viewer.hidden = false;
    frameOpenScreen();
    requestAnimationFrame(() => viewer.setAttribute('data-on', ''));
    world.open(slot, true);
    ($('#viewer-close') as HTMLButtonElement).focus();
    kick();
  }
  function closeScreen() {
    if (openSlot < 0) return;
    openSlot = -1;
    host.removeAttribute('data-open');
    words.inert = false;
    viewer.removeAttribute('data-on');
    setTimeout(() => {
      if (openSlot < 0) viewer.hidden = true;
    }, 500);
    world?.close();
    lenis?.start();
    kick();
  }
  function updateViewer() {
    const playingSlot = world ? world.playingIndex() : -1;
    const show = playingSlot >= 0 && openSlot < 0;
    nowPlaying.hidden = !show;
    if (show) {
      const c = tower.slots[playingSlot].card;
      const t = `${titleOf(c)} · ${c.sub}`;
      const el = $('#now-title');
      if (el.textContent !== t) el.textContent = t;
    }
  }

  // ------------------------------------------------------------------ wiring
  function wireBlocks() {
    for (const b of words.querySelectorAll<HTMLButtonElement>('[data-open]')) {
      b.addEventListener('click', () => {
        const slot = Number(b.dataset.open);
        const at = stops.findIndex((s) => s.kind === 'card' && s.slot === slot);
        if (b.classList.contains('act') || Math.abs(index - at) < 0.3) openScreen(slot);
        else goTo(at);
      });
    }
    const form = words.querySelector<HTMLFormElement>('.join-form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = form.querySelector('input') as HTMLInputElement;
      const button = form.querySelector('button') as HTMLButtonElement;
      const say = (t: string) => {
        joinNote = t;
        // The words may have been rebuilt while the email was being saved: find the note again.
        const note = words.querySelector<HTMLElement>('.form-note');
        if (note) note.textContent = t;
      };
      const email = input.value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        say('Check the email address.');
        return;
      }
      button.disabled = true;
      say('Saving…');
      const ok = await opts.join(email).catch(() => false);
      if (disposed) return;
      button.disabled = false;
      if (ok) input.value = '';
      say(ok ? "You're on the list." : 'That did not save. Try again in a moment.');
    });
    blocks.forEach((el, i) => {
      el.addEventListener('focusin', () => {
        if (wordsVisibility(index, i) < 0.9) goTo(i);
      });
    });
  }

  function wire() {
    for (const ev of ['scroll', 'wheel', 'touchmove', 'keydown'] as const)
      addEventListener(ev, kick, { passive: true, signal });
    addEventListener(
      'resize',
      () => {
        const at = atOf(scrollY);
        measure();
        scrollTo(0, at * vh);
        world?.setSize(innerWidth, innerHeight, dpr);
        if (openSlot >= 0) frameOpenScreen();
        kick();
      },
      { signal },
    );
    // Scrolling while a screen is open sends it back to the hub, still playing.
    addEventListener(
      'wheel',
      () => {
        if (openSlot >= 0) closeScreen();
      },
      { passive: true, signal },
    );
    if (finePointer) {
      addEventListener(
        'pointermove',
        (e) => {
          pointerTarget = [(e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2];
          if (world && openSlot < 0) {
            const hit = (e.target as HTMLElement).closest?.('a, button, input, .w, #viewer')
              ? -1
              : world.pick(e.clientX, e.clientY);
            world.setHover(hit);
            canvas.style.cursor = hit >= 0 ? 'pointer' : '';
            host.style.cursor = hit >= 0 ? 'pointer' : '';
          }
          kick();
        },
        { signal },
      );
    }
    // One listener for the whole hub: links to PMG's own pages stay in the app, and a click on
    // a screen in the 3D opens it.
    host.addEventListener(
      'click',
      (e) => {
        const target = e.target as HTMLElement;
        const route = target.closest<HTMLAnchorElement>('a[data-route]');
        if (route) {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          opts.navigate(route.getAttribute('href') ?? '/');
          return;
        }
        if (!world || openSlot >= 0) return;
        if (target.closest('a, button, input, form, #viewer, #now, .nav')) return;
        const hit = world.pick(e.clientX, e.clientY);
        if (hit >= 0) openScreen(hit);
      },
      { signal },
    );
    $('#viewer-close').addEventListener('click', closeScreen, { signal });
    $('#viewer-mute').addEventListener(
      'click',
      () => {
        muted = !muted;
        world?.setMuted(muted);
        $('#viewer-mute').textContent = muted ? 'Sound on' : 'Mute';
      },
      { signal },
    );
    $('#now-open').addEventListener(
      'click',
      () => {
        const p = world ? world.playingIndex() : -1;
        if (p >= 0) openScreen(p);
      },
      { signal },
    );
    $('#now-stop').addEventListener(
      'click',
      () => {
        world?.stop();
        kick();
      },
      { signal },
    );
    const navEl = $('#nav');
    const menuBtn = $<HTMLButtonElement>('#menu-btn');
    const setMenu = (open: boolean) => {
      navEl.toggleAttribute('data-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    };
    menuBtn.addEventListener('click', () => setMenu(!navEl.hasAttribute('data-open')), { signal });
    addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Escape') return;
        closeScreen();
        setMenu(false);
      },
      { signal },
    );
    addEventListener(
      'pointerdown',
      (e) => {
        if (navEl.hasAttribute('data-open') && !(e.target as HTMLElement).closest?.('#nav'))
          setMenu(false);
      },
      { signal },
    );
    // The PMG logo takes you back to the top of the hub.
    $('.logo').addEventListener(
      'click',
      (e) => {
        e.preventDefault();
        setMenu(false);
        if (openSlot >= 0) closeScreen();
        goTo(0);
      },
      { signal },
    );
    $('.zones').addEventListener(
      'click',
      (e) => {
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-zone]');
        if (!a) return;
        e.preventDefault();
        setMenu(false);
        const z = Number(a.dataset.zone);
        const i = stops.findIndex((s) => s.zone === z && s.kind !== 'card');
        if (i >= 0) goTo(i);
      },
      { signal },
    );
  }

  const hook = window as unknown as { __pmg?: HubHook };
  const hookApi: HubHook = {
    ready: false,
    layout: () => layout,
    stops: () =>
      stops.map((s) => ({ kind: s.kind, zone: s.zone, slot: s.slot, y: Math.round(s.at * vh) })),
    drawAt,
    state: () => ({
      index,
      scrollY,
      dpr,
      frames: world?.frames() ?? 0,
      open: openSlot,
      playing: world ? world.playingIndex() : -1,
    }),
    open: openScreen,
    close: closeScreen,
    focusRect: () => {
      const s = stops[Math.round(clamp(index, 0, stops.length - 1))];
      if (!world) return null;
      if (s.kind === 'card') return world.screenRect(s.slot);
      if (s.kind === 'home') return world.logoRect();
      return null;
    },
    logoRect: () => world?.logoRect() ?? null,
    gpu: () => world?.gpu() ?? 'none',
    earth: () => world?.earthState() ?? 'none',
    loops: () => world?.loops() ?? [],
  };
  hook.__pmg = hookApi;

  function dispose() {
    if (disposed) return;
    disposed = true;
    ac.abort();
    glitch.stop();
    lenis?.destroy();
    lenis = null;
    earth?.dispose();
    earth = null;
    world?.dispose();
    world = null;
    html.classList.remove('pmg-hub-on');
    host.removeAttribute('data-open');
    host.style.cursor = '';
    if (hook.__pmg === hookApi) delete hook.__pmg;
  }

  opts.signal?.addEventListener('abort', dispose, { once: true });
  if (opts.signal?.aborted) dispose();

  // ------------------------------------------------------------------ start
  const pct = $('#loader-pct');
  const loaded = $('#loader-bytes');
  let shown = 0;
  const progress = (p: number, note = '') => {
    shown = Math.max(shown, Math.min(100, Math.round(p * 100)));
    pct.textContent = String(shown);
    if (note) loaded.textContent = note;
  };

  try {
    if (disposed) throw new HubUnavailable('left before the hub started');
    html.classList.add('pmg-hub-on');
    host.dataset.mode = 'loading';
    $('#lens').style.setProperty('--grain', `url(${grainDataUrl()})`);
    await Promise.all([
      document.fonts.load('900 40px "PMG Shoulders"'),
      document.fonts.load('500 18px "PMG Shoulders"'),
      document.fonts.load('400 20px "PMG Mono"'),
    ]).catch(() => {});
    if (disposed) throw new HubUnavailable('left before the hub started');
    progress(0.1, 'Type ready');
    zoneNames = buildZoneMenu();
    measure();
    // ?dpr= lifts the 1.5 cap (for stills and films; visitors keep the cap).
    const cap = params.has('dpr') ? Number(params.get('dpr')) || 1.5 : 1.5;
    maxDpr = Math.min(devicePixelRatio || 1, cap) * (weak ? 0.8 : 1);
    dpr = maxDpr;
    world = await createWorld(canvas, $('#css3d'), tower, opts.root, {
      bloom: !weak,
      // Keep the button true to the sound, also when the browser mutes a reel itself.
      onMuted: (m) => {
        muted = m;
        $('#viewer-mute').textContent = m ? 'Sound on' : 'Mute';
      },
      // The pictures are the bulk of the first load: count them as they arrive.
      onProgress: (done, total) =>
        progress(0.1 + 0.8 * (done / Math.max(1, total)), `${done} of ${total} pictures`),
    });
    if (disposed) {
      world.dispose();
      world = null;
      throw new HubUnavailable('left before the hub started');
    }
    world.setSize(innerWidth, innerHeight, dpr);
    // Start at the top, or where the visitor left off. (The page before may have been scrolled.)
    scrollTo(0, Math.max(0, opts.startAt ?? 0) * vh);
    const t = poseAt(stops, atOf(scrollY));
    current = t.pose;
    index = t.index;
    world.apply(current, pointer, 0);
    await world.warm();
    if (disposed || !world) throw new HubUnavailable('left before the hub started');
    world.step(1, 0);
    world.render();
  } catch (err) {
    dispose();
    if (err instanceof HubUnavailable) throw err;
    throw new HubUnavailable(`the 3D hub could not start: ${String(err)}`);
  }

  lenis = new Lenis({ autoRaf: false, lerp: 0.1, smoothWheel: true });
  lenis.on('scroll', kick);
  wire();
  applyWords(index);
  progress(1, 'Ready');

  // The live Earth behind the hub (Earthlight), after the first frame: its code and scene data
  // load only now, and the still of the same view holds until it is in focus. Off with
  // ?earth=still, on weak devices, and wherever Earthlight finds only software drawing.
  if (!weak && !params.has('offline') && params.get('earth') !== 'still')
    startEarth(host, { allowSoftware: params.get('earth') === 'software' })
      .then((layer) => {
        if (disposed || !world) {
          layer.dispose();
          return;
        }
        earth = layer;
        world.attachEarth(layer);
        kick();
      })
      .catch((err) => console.warn('Live Earth unavailable, keeping the still', err));
  // Live roster data, after the first frame: Spotify's current titles and covers for the roster
  // and playlists. Public data, no key, nothing about the visitor is sent.
  if (!params.has('offline'))
    world.liveRoster().then((changed) => {
      if (disposed) return;
      for (const c of changed) {
        for (const el of host.querySelectorAll<HTMLElement>(`[data-card="${c.id}"]`))
          glitch.setText(el, c.title);
        liveTitles.set(c.id, c.title);
      }
      // Rebuild the words so every place a title shows (button, index, viewer, chip) uses it,
      // and, on one column, re-measure the bands above them for a title that took another line.
      if (changed.length) {
        measure();
        applyWords(index);
      }
      kick();
    });
  await new Promise((r) => setTimeout(r, 260));
  if (disposed) throw new HubUnavailable('left before the hub started');
  host.dataset.mode = 'gl';
  hookApi.ready = true;
  kick();

  return {
    update(content) {
      if (disposed || !world) return;
      // Live data only changes what a screen says. Match screens by id; anything else (a new
      // release, a new reel) arrives with a new build of the site and a fresh tower.
      const next = new Map(content.zones.flatMap((z) => z.cards).map((c) => [c.id, c]));
      let changed = false;
      tower.slots.forEach((slot, i) => {
        const card = next.get(slot.card.id);
        if (!card || JSON.stringify(card) === JSON.stringify(slot.card)) return;
        if (card.media.kind !== slot.card.media.kind || card.aspect !== slot.card.aspect) return;
        world?.setCard(i, card);
        const zone = ZONES[slot.zone];
        zone.cards[slot.index] = card;
        changed = true;
      });
      if (!changed) return;
      measure();
      applyWords(index);
      kick();
    },
    position: () => atOf(scrollY),
    dispose,
  };
}
