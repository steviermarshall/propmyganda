// Where everything sits in the hub, and the camera's path through it. Pure maths, no three.js.
// The hub is a tower: one ring of screens per part of PMG, stacked downward, the PMG logo on
// top. Scrolling flies the camera down and around it in one unbroken helix.
import { type Card, ZONES } from './data';

export const RING_R = 2.6;
export const ZONE_DY = 2.5;
const GAP = 0.34;

export interface Slot {
  zone: number;
  index: number;
  card: Card;
  angle: number;
  y: number;
  w: number;
  h: number;
}

export function cardSize(aspect: number): [number, number] {
  const h = aspect >= 1.5 ? 0.82 : aspect >= 0.99 ? 0.95 : aspect >= 0.7 ? 1.05 : 1.16;
  return [h * aspect, h];
}

export interface Tower {
  slots: Slot[];
  zoneY: number[];
  zoneArc: [number, number][];
  bottom: number;
  endAngle: number;
}

export function buildTower(): Tower {
  const slots: Slot[] = [];
  const zoneY: number[] = [];
  const zoneArc: [number, number][] = [];
  let angle = 0;
  ZONES.forEach((zone, k) => {
    const y = -k * ZONE_DY;
    zoneY.push(y);
    const start = angle;
    let prevW = 0;
    zone.cards.forEach((card, i) => {
      const [w, h] = cardSize(card.aspect);
      if (i > 0) angle += (prevW / 2 + w / 2 + GAP) / RING_R;
      slots.push({ zone: k, index: i, card, angle, y, w, h });
      prevW = w;
    });
    zoneArc.push([start, angle]);
    angle += 1.0;
  });
  return { slots, zoneY, zoneArc, bottom: zoneY[zoneY.length - 1] - 1.4, endAngle: angle };
}

export type Layout = 'row' | 'column';

/** A camera pose in the tower's own terms, so it can be eased around the column, not across it. */
export interface Pose {
  theta: number;
  radius: number;
  y: number;
  lookR: number;
  lookY: number;
  frame: [number, number];
  fov: number;
}

export type StopKind = 'home' | 'zone' | 'card' | 'join';
export interface Stop extends Pose {
  kind: StopKind;
  zone: number;
  slot: number;
  /** Scroll distance from the top, in screen heights. */
  at: number;
}

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const mix = (a: number, b: number, k: number) => a + (b - a) * k;

export function mixPose(a: Pose, b: Pose, k: number): Pose {
  return {
    theta: mix(a.theta, b.theta, k),
    radius: mix(a.radius, b.radius, k),
    y: mix(a.y, b.y, k),
    lookR: mix(a.lookR, b.lookR, k),
    lookY: mix(a.lookY, b.lookY, k),
    frame: [mix(a.frame[0], b.frame[0], k), mix(a.frame[1], b.frame[1], k)],
    fov: mix(a.fov, b.fov, k),
  };
}

/** How far from a screen's face the camera stands so the screen fills a share of the view. */
export function standOff(
  w: number,
  h: number,
  fov: number,
  aspect: number,
  fillH: number,
  fillW: number,
): number {
  const t = 2 * Math.tan(((fov / 2) * Math.PI) / 180);
  return Math.max(h / (fillH * t), w / (fillW * t * aspect));
}

/** The free band of the screen for one stop: from under the top bar to above that stop's
 *  words, as fractions of the screen height. */
export interface FreeBand {
  top: number;
  bottom: number;
}

/** Free band on a 390 x 844 phone, where the one-column framing was tuned by eye. */
const COLUMN_FREE = 0.47;
/** The smallest band height a stop is framed for; below it the words win the space. */
export const MIN_BAND = 0.15;
/** The farthest a card stop may stand from its screen (the hub camera sees 60 units). */
export const MAX_STANDOFF = 40;
export const bandHeight = (b: FreeBand) => Math.max(MIN_BAND, b.bottom - b.top);
/** Where the stills for one column are framed: the band on the shortest phone the hub
 *  supports (320 x 568), as a share of a 1:2 still shown top-aligned. On taller phones the
 *  focused screen sits higher and smaller in the still, never over the words. */
export const STILL_BAND: FreeBand = { top: 0.09, bottom: 0.37 };
/** Where the logo sits on a one-column home that has only its title under it (a share of the height). */
export const HOME_BARE_Y = 0.37;
/** The band above the sign-up on a 390 x 844 phone that the join framing (radius 10.5) was tuned for. */
const JOIN_FREE = 0.43;

export function buildStops(
  tower: Tower,
  layout: Layout,
  aspect: number,
  free?: (stop: number) => FreeBand | null,
): Stop[] {
  const row = layout === 'row';
  const fov = row ? 36 : 50;
  const frameCard: [number, number] = row ? [0.68, 0.5] : [0.5, 0.35];
  // One column: fit each focused screen (and the logo at home) into the band measured above
  // its own words, so a short phone never puts a screen over them. Fixed fractions tuned at
  // 390 x 844 covered the words at 375 x 553 and 320 x 568.
  const band = (i: number) => (!row && free ? free(i) : null);
  const stops: Stop[] = [];
  let at = 0;
  const first = tower.zoneArc[1][0];
  const home = band(0);
  stops.push({
    kind: 'home',
    zone: 0,
    slot: -1,
    at,
    theta: first - 1.1,
    radius: row ? 6.6 : 8.4 * (home ? Math.max(1, COLUMN_FREE / bandHeight(home)) : 1),
    y: tower.zoneY[0] + 0.35,
    lookR: 0,
    lookY: tower.zoneY[0] + 0.25,
    // With only the title under it (one column), the logo and tower sit lower, nearer the middle.
    frame: row ? [0.68, 0.36] : [0.5, home ? Math.min(bandHeight(home) > 0.6 ? HOME_BARE_Y : 0.31, (home.top + home.bottom) / 2) : 0.31],
    fov,
  });
  ZONES.forEach((_, k) => {
    if (k === 0) return;
    const [a0, a1] = tower.zoneArc[k];
    at += 1.1;
    stops.push({
      kind: 'zone',
      zone: k,
      slot: -1,
      at,
      theta: (a0 + a1) / 2,
      radius: RING_R + (row ? 4.6 : 6.4),
      y: tower.zoneY[k] + 1.15,
      lookR: 0,
      lookY: tower.zoneY[k] - 0.05,
      frame: row ? [0.64, 0.55] : [0.5, 0.36],
      fov,
    });
    tower.slots.forEach((s, i) => {
      if (s.zone !== k) return;
      at += 0.65;
      const b = band(stops.length);
      // A band can be tiny or even upside down when the words fill a very short screen: floor
      // it like the home stop, and keep the camera well inside the far plane.
      const fillH = b ? Math.min(0.42, bandHeight(b) * 0.86) : row ? 0.6 : 0.42;
      const d = Math.min(MAX_STANDOFF, standOff(s.w, s.h, fov, aspect, fillH, row ? 0.5 : 0.86));
      stops.push({
        kind: 'card',
        zone: k,
        slot: i,
        at,
        theta: s.angle,
        radius: RING_R + d,
        y: s.y + 0.04,
        lookR: RING_R,
        lookY: s.y,
        frame: b ? [0.5, Math.min(0.35, (b.top + b.bottom) / 2)] : frameCard,
        fov,
      });
    });
  });
  at += 1.2;
  // One column: fit the tower into the band above the sign-up, as home and the cards are, so a
  // taller block (the made-by credit, a small phone) never puts the tower behind its words.
  const join = band(stops.length);
  stops.push({
    kind: 'join',
    zone: ZONES.length,
    slot: -1,
    at,
    theta: tower.endAngle,
    radius: row ? 8.2 : 10.5 * (join ? Math.max(1, JOIN_FREE / bandHeight(join)) : 1),
    y: tower.bottom - 0.9,
    lookR: 0,
    lookY: tower.bottom + 2.4,
    frame: row ? [0.66, 0.44] : [0.5, join ? Math.min(0.3, (join.top + join.bottom) / 2) : 0.3],
    fov,
  });
  return stops;
}

/** The pose for a scroll position (in screen heights), eased between the two stops around it,
 *  and the fractional stop index (for the words). */
export function poseAt(stops: Stop[], at: number): { pose: Pose; index: number } {
  if (at <= stops[0].at) return { pose: stops[0], index: 0 };
  for (let i = 1; i < stops.length; i += 1) {
    const a = stops[i - 1];
    const b = stops[i];
    if (at <= b.at) {
      const k = smoothstep(a.at, b.at, at);
      return { pose: mixPose(a, b, k), index: i - 1 + k };
    }
  }
  const last = stops[stops.length - 1];
  return { pose: last, index: stops.length - 1 };
}

export function dampPose(cur: Pose, target: Pose, lambda: number, dt: number): Pose {
  return mixPose(cur, target, 1 - Math.exp(-lambda * dt));
}

export function poseDistance(a: Pose, b: Pose): number {
  return Math.max(
    Math.abs(a.theta - b.theta),
    Math.abs(a.radius - b.radius),
    Math.abs(a.y - b.y),
    Math.abs(a.lookR - b.lookR),
    Math.abs(a.lookY - b.lookY),
    Math.abs(a.frame[0] - b.frame[0]),
    Math.abs(a.frame[1] - b.frame[1]),
    Math.abs(a.fov - b.fov) * 0.01,
  );
}

/** Camera position and look point for a pose. */
export function poseToWorld(p: Pose): {
  cam: [number, number, number];
  look: [number, number, number];
} {
  return {
    cam: [p.radius * Math.sin(p.theta), p.y, p.radius * Math.cos(p.theta)],
    look: [p.lookR * Math.sin(p.theta), p.lookY, p.lookR * Math.cos(p.theta)],
  };
}

/** How present the words for stop i are, for a fractional stop index. */
export function wordsVisibility(index: number, i: number): number {
  return 1 - smoothstep(0.28, 0.5, Math.abs(index - i));
}
