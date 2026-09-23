/**
 * PMG FIGHT — browser version
 * Street-fight arcade game for the Propmyganda roster.
 * Look: New York at night, fire-lit, voxel buildings, 256-colour dithered pixels.
 * Play: 1992-arcade rules — jump, crouch, hold BACK to block, sweeps, jump-ins, thrown special.
 *
 * One self-contained React + TypeScript file. No extra packages needed.
 * Works with keyboard (PC) and touch (phone, tablet).
 *
 * Lovable: save as  src/components/PMGFight.tsx
 * and render <PMGFight /> on the /propworld page.
 */
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as RPointerEvent } from "react";

/* ================================================================== */
/*  ROSTER                                                             */
/* ================================================================== */

type Btn = "punch" | "kick" | "special";
type Arch = "aggressive" | "technical" | "balanced";
type Look = "street" | "fashion" | "casual";

interface FighterDef {
  id: string; name: string; lookLabel: string; look: Look; arch: Arch;
  power: number; speed: number; defense: number; special: number;
  color: string;   // outfit colour
  skin: string;    // change per fighter to match the artist
}

const SKIN = "#8a5a3c";

const ROSTER: FighterDef[] = [
  { id: "jpeez",    name: "JPeez",    lookLabel: "Street wear",  look: "street",  arch: "aggressive", power: 8, speed: 7, defense: 5, special: 6, color: "#FF8A1F", skin: SKIN },
  { id: "jahballa", name: "JahBalla", lookLabel: "Street wear",  look: "street",  arch: "aggressive", power: 9, speed: 6, defense: 4, special: 7, color: "#F5C400", skin: SKIN },
  { id: "stockz",   name: "Stockz",   lookLabel: "High fashion", look: "fashion", arch: "technical",  power: 6, speed: 8, defense: 7, special: 8, color: "#3AA0FF", skin: SKIN },
  { id: "zoe",      name: "Zoe",      lookLabel: "High fashion", look: "fashion", arch: "balanced",   power: 6, speed: 6, defense: 7, special: 6, color: "#FF5FB0", skin: SKIN },
  { id: "hammad",   name: "Hammad",   lookLabel: "Casual",       look: "casual",  arch: "balanced",   power: 7, speed: 7, defense: 6, special: 6, color: "#2ED47A", skin: SKIN },
];

/* ================================================================== */
/*  MOVES — frame data (60 frames = 1 second)                          */
/* ================================================================== */

type Pose = "jab" | "cross" | "hook" | "roundhouse" | "lowpunch" | "sweep" | "airpunch" | "airkick" | "fireball";

interface Move {
  id: string; btn: Btn; pose: Pose;
  ctx: "stand" | "crouch" | "air";
  level: "high" | "low" | "air";   // low = block crouching, air = block standing
  height: number;                  // how high the fist/foot is above the attacker's feet
  startup: number; active: number; recovery: number;
  damage: number; hitstun: number; blockstun: number; hitstop: number;
  reach: number; knockback: number; knockdown: boolean; cost: number;
  projectile?: boolean;
  chain?: string; chainOnly?: boolean; cancelStart: number; cancelEnd: number;
}

const SP_COST = 30;

function movesFor(arch: Arch): Record<string, Move> {
  const d =
    arch === "aggressive" ? { su: -1, rec: 2, dmg: 1, bs: -1, cw: 1 } :
    arch === "technical"  ? { su: -1, rec: -2, dmg: -1, bs: 0, cw: 4 } :
                            { su: 0, rec: 0, dmg: 0, bs: 0, cw: 0 };
  const mk = (m: Partial<Move> & Pick<Move, "id" | "btn" | "pose">): Move => ({
    ctx: "stand", level: "high", height: 112, startup: 5, active: 3, recovery: 10, damage: 5,
    hitstun: 16, blockstun: 11, hitstop: 5, reach: 80, knockback: 4, knockdown: false, cost: 0,
    cancelStart: 0, cancelEnd: 0, ...m,
  });
  return {
    // standing punch chain: press Punch up to three times
    LP:  mk({ id: "LP",  btn: "punch", pose: "jab",   startup: 5 + d.su, recovery: 9 + d.rec,  damage: 5,         hitstun: 16, blockstun: 11 + d.bs, hitstop: 4, reach: 80, chain: "LP2", cancelStart: 7, cancelEnd: 14 + d.cw }),
    LP2: mk({ id: "LP2", btn: "punch", pose: "cross", startup: 6 + d.su, recovery: 11 + d.rec, damage: 6,         hitstun: 17, blockstun: 11 + d.bs, hitstop: 5, reach: 82, knockback: 5, chain: "LP3", chainOnly: true, cancelStart: 8, cancelEnd: 16 + d.cw }),
    LP3: mk({ id: "LP3", btn: "punch", pose: "hook",  startup: 8 + d.su, active: 4, recovery: 18 + d.rec, damage: 9 + d.dmg, hitstun: 22, blockstun: 13 + d.bs, hitstop: 9, reach: 88, knockback: 9, knockdown: true, chainOnly: true }),
    // standing kick: roundhouse, also a good anti-air
    HK:  mk({ id: "HK",  btn: "kick", pose: "roundhouse", height: 100, startup: 11 + d.su, active: 5, recovery: 20 + d.rec, damage: 12 + d.dmg, hitstun: 22, blockstun: 13 + d.bs, hitstop: 9, reach: 104, knockback: 8, knockdown: true }),
    // crouching
    CP:  mk({ id: "CP",  btn: "punch", pose: "lowpunch", ctx: "crouch", height: 72, startup: 4 + d.su, recovery: 8 + d.rec, damage: 4, hitstun: 14, blockstun: 10 + d.bs, hitstop: 4, reach: 78, knockback: 3 }),
    CK:  mk({ id: "CK",  btn: "kick",  pose: "sweep", ctx: "crouch", level: "low", height: 14, startup: 8 + d.su, active: 4, recovery: 22 + d.rec, damage: 9 + d.dmg, hitstun: 20, blockstun: 12, hitstop: 7, reach: 112, knockback: 6, knockdown: true }),
    // jumping
    JP:  mk({ id: "JP",  btn: "punch", pose: "airpunch", ctx: "air", level: "air", height: 44, startup: 3, active: 12, recovery: 6, damage: 7, hitstun: 18, blockstun: 12, hitstop: 6, reach: 76, knockback: 4 }),
    JK:  mk({ id: "JK",  btn: "kick",  pose: "airkick",  ctx: "air", level: "air", height: 24, startup: 4, active: 14, recovery: 6, damage: 9 + d.dmg, hitstun: 20, blockstun: 13, hitstop: 7, reach: 92, knockback: 5 }),
    // special: throws a flaming PMG record
    SP:  mk({ id: "SP",  btn: "special", pose: "fireball", startup: 13 + d.su, active: 1, recovery: 26 + d.rec, damage: 12 + d.dmg, hitstun: 22, blockstun: 14, hitstop: 6, knockback: 6, cost: SP_COST, projectile: true }),
  };
}

const powerMult = (f: FighterDef) => 0.7 + f.power * 0.06;
const speedMult = (f: FighterDef) => 0.8 + f.speed * 0.04;
const takenMult = (f: FighterDef) => 1.2 - f.defense * 0.04;
const regenPerSec = (f: FighterDef) => 2 + f.special * 0.6;

/* ================================================================== */
/*  GAME STATE                                                         */
/* ================================================================== */

const W = 960, H = 540, GROUND = 440, FRAME_MS = 1000 / 60;
const BASE_WALK = 3.4, JUMP_V = 15.5, JUMP_X = 4.2, GRAV = 0.8;

type St = "idle" | "walk" | "crouch" | "jump" | "block" | "attack" | "hitstun" | "blockstun" | "knockdown" | "wakeup" | "ko" | "win";

interface Fighter {
  def: FighterDef; moves: Record<string, Move>; tag: string;
  x: number; y: number; vx: number; vy: number; facing: 1 | -1;
  air: boolean; airUsed: boolean; crouch: boolean; back: boolean;
  hp: number; lag: number; sta: number;
  state: St; sf: number; dur: number;
  move: Move | null; hitDone: boolean; connected: boolean;
  combo: number; hitstop: number; flash: number;
  buffer: { b: Btn; age: number }[];
  qDown: number; qReady: number;
}

interface Ctl { left: boolean; right: boolean; up: boolean; down: boolean; queue: Btn[] }
interface Spark { x: number; y: number; t: number; blocked: boolean }
interface Proj { x: number; y: number; dir: 1 | -1; owner: 0 | 1; speed: number; dmg: number; spin: number; dead?: boolean }

interface Game {
  f: [Fighter, Fighter]; ctl: [Ctl, Ctl]; cpu: boolean;
  phase: "intro" | "fight" | "roundEnd" | "matchEnd";
  pf: number; timer: number; round: number; wins: [number, number];
  roundWinner: number; msg: string; frame: number;
  sparks: Spark[]; proj: Proj[]; comboShow: [{ n: number; t: number }, { n: number; t: number }];
  hype: number; slow: number; shake: number;
  ai: { t: number; walk: number; guard: number; low: boolean; react: number; crouch: number; airKick: boolean };
  onOver: () => void;
}

const newCtl = (): Ctl => ({ left: false, right: false, up: false, down: false, queue: [] });

function newFighter(def: FighterDef, tag: string): Fighter {
  return {
    def, moves: movesFor(def.arch), tag, x: 0, y: 0, vx: 0, vy: 0, facing: 1,
    air: false, airUsed: false, crouch: false, back: false,
    hp: 100, lag: 100, sta: 25, state: "idle", sf: 0, dur: 0,
    move: null, hitDone: false, connected: false, combo: 0, hitstop: 0, flash: 0,
    buffer: [], qDown: -999, qReady: -999,
  };
}

function startRound(g: Game) {
  const xs = [330, 630];
  g.f.forEach((f, i) => {
    Object.assign(f, {
      x: xs[i], y: 0, vx: 0, vy: 0, facing: i === 0 ? 1 : -1, air: false, airUsed: false, crouch: false, back: false,
      hp: 100, lag: 100, sta: 25, state: "idle", sf: 0, dur: 0, move: null, hitDone: false, connected: false,
      combo: 0, hitstop: 0, flash: 0, buffer: [], qDown: -999, qReady: -999,
    });
  });
  g.ctl = [newCtl(), newCtl()];
  g.phase = "intro"; g.pf = 0; g.timer = 99 * 60; g.msg = `ROUND ${g.round}`;
  g.sparks = []; g.proj = []; g.comboShow = [{ n: 0, t: 0 }, { n: 0, t: 0 }];
}

function newGame(p1: FighterDef, p2: FighterDef, cpu: boolean, onOver: () => void): Game {
  const g: Game = {
    f: [newFighter(p1, "P1"), newFighter(p2, cpu ? "CPU" : "P2")],
    ctl: [newCtl(), newCtl()], cpu, phase: "intro", pf: 0, timer: 0, round: 1,
    wins: [0, 0], roundWinner: -1, msg: "", frame: 0, sparks: [], proj: [],
    comboShow: [{ n: 0, t: 0 }, { n: 0, t: 0 }], hype: 0, slow: 0, shake: 0,
    ai: { t: 20, walk: 0, guard: 0, low: false, react: 0, crouch: 0, airKick: false }, onOver,
  };
  startRound(g);
  return g;
}

/* ================================================================== */
/*  COMBAT — runs exactly 60 times a second                            */
/* ================================================================== */

const isFree = (f: Fighter) => !f.air && (f.state === "idle" || f.state === "walk" || f.state === "crouch" || f.state === "block");
const canBlockState = (f: Fighter) => !f.air && (isFree(f) || f.state === "blockstun");
const invulnerable = (f: Fighter) => f.state === "wakeup" || f.state === "knockdown" || f.state === "ko" || f.state === "win";

function setState(f: Fighter, s: St, dur = 0) { f.state = s; f.sf = 0; f.dur = dur; }

function inCancelWindow(f: Fighter) {
  if (f.state !== "attack" || !f.move || !f.connected || f.move.cancelEnd <= 0) return false;
  const fr = f.sf - 1;
  return fr >= f.move.cancelStart && fr <= f.move.cancelEnd;
}

function threatened(g: Game, i: 0 | 1) {
  const me = g.f[i], o = g.f[1 - i];
  if (o.state === "attack" && Math.abs(o.x - me.x) < 260) return true;
  return g.proj.some((p) => p.owner !== i && (me.x - p.x) * p.dir > 0 && Math.abs(me.x - p.x) < 320);
}

function chooseMove(g: Game, i: 0 | 1, b: Btn): Move | null {
  const f = g.f[i], M = f.moves;
  if (f.air) return f.state === "jump" && !f.airUsed ? (b === "kick" ? M.JK : M.JP) : null;
  // Special button, or ↓ then → then Punch
  const wantsSpecial = b === "special" || (b === "punch" && g.frame - f.qReady <= 10);
  if (wantsSpecial && f.sta >= M.SP.cost && !g.proj.some((p) => p.owner === i)) { f.qReady = -999; return M.SP; }
  if (b === "special") return null;
  if (f.state === "attack" && f.move && f.move.btn === b && f.move.chain && inCancelWindow(f)) return M[f.move.chain];
  if (f.crouch) return b === "punch" ? M.CP : M.CK;
  return b === "punch" ? M.LP : M.HK;
}

function startMove(f: Fighter, m: Move) {
  if (m.cost > 0) { if (f.sta < m.cost) return; f.sta -= m.cost; }
  f.move = m; f.hitDone = false; f.connected = false;
  if (m.ctx === "air") f.airUsed = true;
  setState(f, "attack");
}

function moveProgress(f: Fighter) {
  if (!f.move) return 0;
  const m = f.move, fr = f.sf - 1;
  if (fr < m.startup) return (fr / m.startup) * 0.35;
  if (fr < m.startup + m.active) return 1;
  return Math.max(0, 1 - (fr - m.startup - m.active) / m.recovery) * 0.9;
}

interface HitOpts {
  damage: number; hitstun: number; blockstun: number; hitstop: number; knockback: number;
  knockdown: boolean; sx: number; sy: number; blocked: boolean; proj: boolean; dir: 1 | -1;
}

function landHit(g: Game, i: 0 | 1, o: HitOpts) {
  const a = g.f[i], d = g.f[1 - i];
  let dmg = o.damage * powerMult(a.def) * Math.max(0.3, 1 - 0.1 * a.combo);
  if (o.blocked) dmg *= 0.12;
  dmg *= takenMult(d.def);
  d.hp = Math.max(0, d.hp - dmg);
  d.move = null; d.flash = 6; d.hitstop = o.hitstop;
  if (!o.proj) a.hitstop = o.hitstop;                  // both freeze = the punch "lands"
  g.sparks.push({ x: o.sx, y: o.sy, t: 14, blocked: o.blocked });

  // pinned in the corner? the attacker gets pushed back instead
  if (!o.proj && !a.air && (d.x <= 60 || d.x >= W - 60)) a.vx = -a.facing * o.knockback * 0.6;

  if (o.blocked) {
    d.vx = o.dir * o.knockback * 0.5;
    setState(d, "blockstun", o.blockstun);
    a.sta = Math.min(100, a.sta + 1.5);
    return;
  }
  a.combo++; a.sta = Math.min(100, a.sta + 6);
  g.comboShow[i] = { n: a.combo, t: 70 };
  g.hype = Math.min(90, g.hype + 14 + a.combo * 4);
  if (d.hp <= 0) {
    setState(d, "ko"); d.air = true; d.vy = -8; d.vx = o.dir * 5; g.slow = 60; g.shake = 12;
  } else if (o.knockdown || d.air) {
    setState(d, "knockdown", 50);
    if (!d.air) { d.air = true; d.vy = -5; }
    d.vx = o.dir * 4; g.shake = 8;
  } else {
    setState(d, "hitstun", o.hitstun);
    d.vx = o.dir * o.knockback;
  }
}

function tryHit(g: Game, i: 0 | 1) {
  const a = g.f[i], d = g.f[1 - i], m = a.move!;
  const dist = (d.x - a.x) * a.facing;
  if (dist < -10 || dist > m.reach + 22 || invulnerable(d)) return;
  const hy = a.y - m.height;                                    // negative = above the ground
  const top = d.y - (d.crouch && !d.air ? 92 : 150);
  if ((a.air || d.air) && (hy < top - 12 || hy > d.y + 12)) return;
  if (d.air && m.level === "low") return;

  a.hitDone = true; a.connected = true;
  const levelOk = m.level === "low" ? d.crouch : m.level === "air" ? !d.crouch : true;
  const blocked = d.back && canBlockState(d) && levelOk;
  landHit(g, i, {
    damage: m.damage, hitstun: m.hitstun, blockstun: m.blockstun, hitstop: m.hitstop, knockback: m.knockback,
    knockdown: m.knockdown, sx: a.x + a.facing * Math.max(12, Math.min(dist, m.reach) * 0.85), sy: GROUND + hy,
    blocked, proj: false, dir: a.facing,
  });
}

function spawnProjectile(g: Game, i: 0 | 1) {
  const f = g.f[i];
  g.proj.push({ x: f.x + f.facing * 56, y: -100, dir: f.facing, owner: i, speed: 6 + f.def.speed * 0.25, dmg: f.move!.damage, spin: 0 });
}

function stepProjectiles(g: Game) {
  for (const p of g.proj) {
    p.x += p.dir * p.speed; p.spin += 0.35;
    const d = g.f[1 - p.owner];
    if (!invulnerable(d) && Math.abs(p.x - d.x) < 34 && d.y > -70) {
      const blocked = d.back && canBlockState(d);
      landHit(g, p.owner, {
        damage: p.dmg, hitstun: 22, blockstun: 14, hitstop: 6, knockback: 6, knockdown: false,
        sx: p.x, sy: GROUND + p.y, blocked, proj: true, dir: p.dir,
      });
      p.dead = true;
    }
    if (p.x < -40 || p.x > W + 40) p.dead = true;
  }
  const [a, b] = [g.proj.find((p) => p.owner === 0 && !p.dead), g.proj.find((p) => p.owner === 1 && !p.dead)];
  if (a && b && Math.abs(a.x - b.x) < 36) {
    a.dead = b.dead = true;
    g.sparks.push({ x: (a.x + b.x) / 2, y: GROUND + a.y, t: 14, blocked: false });
  }
  g.proj = g.proj.filter((p) => !p.dead);
}

function land(f: Fighter) {
  f.y = 0; f.vy = 0; f.air = false;
  if (f.state === "jump" || f.state === "attack") { f.vx = 0; f.move = null; setState(f, "idle"); }
  else if (f.state === "hitstun") setState(f, "knockdown", 50);
  else if (f.state === "knockdown" || f.state === "ko") f.vx *= 0.4;
}

function stepFighter(g: Game, i: 0 | 1) {
  const f = g.f[i], o = g.f[1 - i], c = g.ctl[i];
  const live = g.phase === "fight";
  if (f.flash > 0) f.flash--;

  if (live) for (const b of c.queue) { f.buffer.push({ b, age: 0 }); if (f.buffer.length > 3) f.buffer.shift(); }
  c.queue.length = 0;

  if (f.hitstop > 0) { f.hitstop--; return; }

  f.buffer.forEach((e) => e.age++);
  f.buffer = f.buffer.filter((e) => e.age <= 8);           // 8-frame input buffer
  f.sf++;

  // ↓ then → (towards the opponent) within 14 frames arms the special for Punch
  const fwdHeld = f.facing === 1 ? c.right : c.left;
  if (live) {
    if (c.down) f.qDown = g.frame;
    if (fwdHeld && !c.down && g.frame - f.qDown <= 14) f.qReady = g.frame;
  }

  // movement physics
  if (f.air) {
    f.x += f.vx; f.y += f.vy; f.vy += GRAV;
    if (f.y >= 0) land(f);
  } else {
    f.x += f.vx; f.vx *= 0.8; if (Math.abs(f.vx) < 0.05) f.vx = 0;
  }

  switch (f.state) {
    case "attack": {
      const m = f.move!, fr = f.sf - 1;
      if (m.projectile) { if (fr === m.startup) spawnProjectile(g, i); }
      else if (!f.hitDone && fr >= m.startup && fr < m.startup + m.active) tryHit(g, i);
      if (f.state === "attack" && fr >= m.startup + m.active + m.recovery - 1) { f.move = null; setState(f, f.air ? "jump" : "idle"); }
      break;
    }
    case "hitstun":   if (f.sf >= f.dur) { o.combo = 0; setState(f, "idle"); } break;
    case "blockstun": if (f.sf >= f.dur) setState(f, "idle"); break;
    case "knockdown": if (f.air) f.sf = 0; else if (f.sf >= f.dur) { o.combo = 0; setState(f, "wakeup", 22); } break;
    case "wakeup":    if (f.sf >= f.dur) setState(f, "idle"); break;
  }

  // crouch + "holding back" (= blocking) are read every frame you're allowed to guard
  if (canBlockState(f)) {
    f.crouch = live && c.down;
    f.back = live && (f.facing === 1 ? c.left : c.right);
  } else {
    if (f.air) f.crouch = false;
    f.back = false;
  }

  if (live && f.buffer.length && (isFree(f) || (f.state === "jump" && !f.airUsed) || inCancelWindow(f))) {
    const e = f.buffer.shift()!;
    const m = chooseMove(g, i, e.b);
    if (m) startMove(f, m);
  }

  if (isFree(f)) {
    if (live) f.facing = o.x >= f.x ? 1 : -1;
    const dir = live ? (c.right ? 1 : 0) - (c.left ? 1 : 0) : 0;
    if (live && c.up) {
      f.air = true; f.vy = -JUMP_V; f.vx = dir * JUMP_X * speedMult(f.def);
      f.airUsed = false; f.crouch = false; setState(f, "jump");
    } else if (f.crouch) {
      const s: St = f.back && threatened(g, i) ? "block" : "crouch";
      if (f.state !== s) setState(f, s);
    } else if (f.back && threatened(g, i)) {
      if (f.state !== "block") setState(f, "block");
    } else if (dir !== 0) {
      f.x += dir * BASE_WALK * speedMult(f.def) * (dir !== f.facing ? 0.7 : 1);
      if (f.state !== "walk") setState(f, "walk");
    } else if (f.state !== "idle") setState(f, "idle");
  }

  if (live) f.sta = Math.min(100, f.sta + regenPerSec(f.def) / 60);
}

function keepApart(g: Game) {
  const [a, b] = g.f;
  const clamp = (f: Fighter) => { f.x = Math.max(40, Math.min(W - 40, f.x)); };
  clamp(a); clamp(b);
  if (Math.abs(a.y - b.y) > 90) return;                     // you can jump over each other
  const dx = b.x - a.x, min = 56;
  if (Math.abs(dx) < min) {
    const push = (min - Math.abs(dx)) / 2, s = dx === 0 ? a.facing : dx > 0 ? 1 : -1;
    a.x -= push * s; b.x += push * s; clamp(a); clamp(b);
  }
}

function cpuThink(g: Game) {
  const me = g.f[1], opp = g.f[0], c = g.ctl[1], ai = g.ai;
  const walk = (d: number) => { c.left = d < 0; c.right = d > 0; };
  if (g.phase !== "fight") { c.left = c.right = c.up = c.down = false; return; }
  const toward: 1 | -1 = opp.x > me.x ? 1 : -1, dist = Math.abs(opp.x - me.x);
  c.up = false;

  if (ai.guard > 0) { ai.guard--; walk(-toward); c.down = ai.low; return; }
  if (ai.crouch > 0) { ai.crouch--; c.down = true; } else c.down = false;

  if (me.air) {
    walk(0);
    if (ai.airKick && dist < 130 && me.vy > -4) { c.queue.push("kick"); ai.airKick = false; }
    return;
  }

  // keep a punch string going once it connects
  if (me.state === "attack" && me.connected && me.move?.chain && Math.random() < 0.3) c.queue.push("punch");

  // react like a person: at most one decision every 12–26 frames
  if (ai.react > 0) ai.react--;
  else {
    const incoming = g.proj.some((p) => p.owner === 0 && (me.x - p.x) * p.dir > 0 && Math.abs(me.x - p.x) < 240);
    const swing = opp.state === "attack" && !!opp.move && opp.sf - 1 < opp.move.startup + 2 && dist < 180;
    const diving = opp.air && dist < 220 && opp.vx * toward < 0;
    if (incoming || swing || diving) {
      ai.react = 12 + Math.floor(Math.random() * 14);
      const r = Math.random();
      if (incoming) {
        if (r < 0.3) { c.up = true; walk(toward); ai.airKick = true; return; }
        if (r < 0.75) { ai.guard = 22; ai.low = false; walk(-toward); return; }
      } else if (diving) {
        if (r < 0.35) { c.queue.push("kick"); return; }
        if (r < 0.7) { ai.guard = 24; ai.low = false; walk(-toward); return; }
      } else if (r < 0.5 && opp.move) {
        ai.guard = 16; ai.low = opp.move.level === "low"; walk(-toward); c.down = ai.low; return;
      }
    }
  }

  if (--ai.t > 0) { walk(ai.walk); return; }
  ai.t = 10 + Math.random() * 16;
  const r = Math.random();
  ai.walk = 0;
  if (dist > 320) {
    if (me.sta >= SP_COST && r < 0.35) c.queue.push("special"); else ai.walk = toward;
  } else if (dist > 170) {
    if (r < 0.18) { c.up = true; walk(toward); ai.airKick = true; return; }
    if (me.sta >= SP_COST && r < 0.3) c.queue.push("special"); else ai.walk = toward;
  } else if (dist > 95) {
    ai.walk = toward;
  } else {
    if (r < 0.35) c.queue.push("punch");
    else if (r < 0.55) { ai.crouch = 14; c.down = true; c.queue.push("kick"); }
    else if (r < 0.72) c.queue.push("kick");
    else if (r < 0.84) { ai.crouch = 10; c.down = true; c.queue.push("punch"); }
    else ai.walk = -toward;
  }
  walk(ai.walk);
}

function endRound(g: Game, winner: number, label: string) {
  g.phase = "roundEnd"; g.pf = 0; g.msg = label; g.roundWinner = winner; g.proj = [];
  if (winner >= 0) g.wins[winner as 0 | 1]++;
}

function tick(g: Game) {
  if (g.slow > 0) { g.slow--; if (g.slow % 2 === 1) return; }   // K.O. slow-motion
  g.frame++;
  if (g.cpu) cpuThink(g);
  stepFighter(g, 0); stepFighter(g, 1); stepProjectiles(g); keepApart(g);

  g.sparks.forEach((s) => s.t--); g.sparks = g.sparks.filter((s) => s.t > 0);
  g.comboShow.forEach((c) => { if (c.t > 0) c.t--; });
  g.f.forEach((f) => { f.lag = Math.max(f.hp, f.lag - 0.4); });
  g.hype = Math.max(0, g.hype - 0.4);
  if (g.shake > 0) g.shake--;

  switch (g.phase) {
    case "intro":
      g.pf++;
      g.msg = g.pf < 70 ? `ROUND ${g.round}` : "FIGHT!";
      if (g.pf >= 105) { g.phase = "fight"; g.msg = ""; }
      break;
    case "fight": {
      g.timer--;
      const down = g.f.findIndex((f) => f.hp <= 0);
      if (down >= 0) endRound(g, 1 - down, "K.O.");
      else if (g.timer <= 0) {
        const a = g.f[0].hp, b = g.f[1].hp;
        endRound(g, Math.abs(a - b) < 0.01 ? -1 : a > b ? 0 : 1, "TIME");
      }
      break;
    }
    case "roundEnd":
      g.pf++;
      if (g.pf === 70) {
        if (g.roundWinner < 0) g.msg = "DRAW";
        else {
          const w = g.f[g.roundWinner as 0 | 1];
          g.msg = w.hp >= 100 ? "PERFECT" : `${w.def.name.toUpperCase()} WINS`;
          if (isFree(w)) setState(w, "win");
        }
      }
      if (g.pf >= 160) {
        const w: number = g.wins[0] >= 2 ? 0 : g.wins[1] >= 2 ? 1 : -1;
        if (w === 0 || w === 1) {
          const champ = g.f[w as 0 | 1];
          g.phase = "matchEnd";
          g.msg = `${champ.def.name.toUpperCase()} WINS THE MATCH`;
          if (!champ.air) setState(champ, "win");
          g.onOver();
        } else { g.round++; startRound(g); }
      }
      break;
  }
}

/* ================================================================== */
/*  PIXEL LOOK — draw small, reduce to 256 colours, blow up            */
/* ================================================================== */

const S = 0.4, LW = 384, LH = 216;                 // world is drawn at 384×216, then scaled up
const PIX = "'Press Start 2P', 'Courier New', monospace";
const INK = "#140c08";

// 4×4 ordered dither + 3-3-2 palette (8 reds × 8 greens × 4 blues = 256 colours)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function buildLut(levels: number, gain: number, bias: number) {
  const lut = new Uint8ClampedArray(256 * 16);
  for (let v = 0; v < 256; v++) for (let k = 0; k < 16; k++) {
    const t = BAYER[k] / 16 - 0.47;
    const x = Math.sqrt(Math.min(255, Math.max(0, v * gain + bias)) / 255) * (levels - 1);
    const q = Math.min(levels - 1, Math.max(0, Math.round(x + t)));
    lut[v * 16 + k] = Math.round((q / (levels - 1)) ** 2 * 255);
  }
  return lut;
}
const LUT_R = buildLut(8, 1.06, 6), LUT_G = buildLut(8, 1.0, 2), LUT_B = buildLut(4, 0.92, 0);

function quantize(c: CanvasRenderingContext2D, w: number, h: number) {
  const img = c.getImageData(0, 0, w, h), d = img.data;
  for (let y = 0; y < h; y++) {
    const row = (y & 3) << 2;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) << 2, k = row | (x & 3);
      d[i] = LUT_R[(d[i] << 4) | k]; d[i + 1] = LUT_G[(d[i + 1] << 4) | k]; d[i + 2] = LUT_B[(d[i + 2] << 4) | k];
    }
  }
  c.putImageData(img, 0, 0);
}

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255];
  const f = (v: number) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k));
  return `rgb(${f(ch[0])},${f(ch[1])},${f(ch[2])})`;
}

/* ---------- stage: New York, night, fire-lit ---------- */

interface Bldg { x: number; w: number; h: number; lit: number[] }

function skyline(seed: number, minH: number, maxH: number, minW: number, maxW: number): Bldg[] {
  const rnd = seeded(seed), out: Bldg[] = [];
  let x = -20;
  while (x < W + 40) {
    const w = minW + rnd() * (maxW - minW), h = minH + rnd() * (maxH - minH), lit: number[] = [];
    for (let k = 0; k < 60; k++) lit.push(rnd() < 0.3 ? 1 : 0);
    out.push({ x, w, h, lit }); x += w + 4 + rnd() * 10;
  }
  return out;
}
const FAR = skyline(11, 90, 170, 40, 80);
const NEAR = skyline(29, 70, 150, 60, 110).filter((b) => b.x + b.w < 200 || b.x > 380);

/** A box with a side face and a top face — the "voxel relief" look. */
function voxelBox(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, front: string, side: string, top: string, depth = 10) {
  c.fillStyle = side;
  c.beginPath(); c.moveTo(x + w, y); c.lineTo(x + w + depth, y - depth * 0.6); c.lineTo(x + w + depth, y + h); c.lineTo(x + w, y + h); c.fill();
  c.fillStyle = top;
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + depth, y - depth * 0.6); c.lineTo(x + w + depth, y - depth * 0.6); c.lineTo(x + w, y); c.fill();
  c.fillStyle = front; c.fillRect(x, y, w, h);
}

function windows(c: CanvasRenderingContext2D, b: Bldg, base: number, col: string) {
  c.fillStyle = col;
  let k = 0;
  for (let yy = base - b.h + 12; yy < base - 14; yy += 18)
    for (let xx = b.x + 8; xx < b.x + b.w - 10; xx += 14) { if (b.lit[k++ % 60]) c.fillRect(xx, yy, 6, 9); }
}

function voxelCloud(c: CanvasRenderingContext2D, x0: number, x1: number, base: number, seed: number) {
  const B = 12;
  for (let x = x0; x < x1; x += B) {
    const env = Math.sin((Math.PI * (x - x0)) / (x1 - x0));
    const h = Math.round((Math.sin(x * 0.013 + seed) * 0.5 + 0.5) * (Math.sin(x * 0.041 + seed * 2) * 0.3 + 0.7) * env * 7);
    for (let j = -Math.ceil(h / 3); j < h; j++) {
      const y = base - j * B;
      c.fillStyle = j === h - 1 ? "#f0cfc4" : j >= h - 3 ? "#d8a79f" : j >= 0 ? "#b98480" : "#7d5561";
      c.fillRect(x, y, B, B);
    }
  }
}

function drawBackdrop(c: CanvasRenderingContext2D) {
  const sky = c.createLinearGradient(0, 0, 0, 340);
  sky.addColorStop(0, "#07050a"); sky.addColorStop(0.4, "#1d0f10"); sky.addColorStop(0.75, "#5a2614"); sky.addColorStop(1, "#c0621f");
  c.fillStyle = sky; c.fillRect(0, 0, W, GROUND);

  // moon
  c.fillStyle = "#efe3c8"; c.beginPath(); c.arc(170, 92, 36, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#d4c3a0";
  for (const [x, y, r] of [[160, 82, 8], [184, 100, 6], [168, 110, 4], [150, 100, 3]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }

  // voxel clouds
  voxelCloud(c, 10, 430, 200, 1.3);
  voxelCloud(c, 520, 950, 176, 4.1);

  // far skyline in the smog
  for (const b of FAR) { voxelBox(c, b.x, 330 - b.h, b.w, b.h, "#3b1f16", "#2c170f", "#553024", 8); windows(c, b, 330, "#a0582a"); }

  // Empire State–style tower
  const ex = 250, eb = 340;
  const tiers: [number, number][] = [[110, 150], [78, 44], [52, 30], [30, 22]];
  let y = eb;
  for (const [w, h] of tiers) { y -= h; voxelBox(c, ex - w / 2, y, w, h, "#1b100c", "#120a07", "#2e1a12", 10); }
  c.fillStyle = "#1b100c"; c.fillRect(ex - 4, y - 50, 8, 50); c.fillRect(ex - 1.5, y - 76, 3, 26);
  windows(c, { x: ex - 55, w: 110, h: 150, lit: FAR[3].lit }, eb, "#ffb347");

  // near buildings
  for (const b of NEAR) { voxelBox(c, b.x, 340 - b.h, b.w, b.h, "#1b100c", "#120a07", "#2e1a12", 12); windows(c, b, 340, "#ffb347"); }

  // rooftop with the PMG billboard (kept below the health bars)
  voxelBox(c, 560, 262, 210, 80, "#1f130e", "#150c08", "#35211a", 12);
  windows(c, { x: 560, w: 210, h: 80, lit: FAR[5].lit }, 342, "#ffb347");
  c.fillStyle = "#2a1c15"; c.fillRect(596, 244, 8, 20); c.fillRect(726, 244, 8, 20);
  voxelBox(c, 572, 162, 186, 84, "#FF2300", "#9e1600", "#ff6a4d", 12);
  c.fillStyle = "#0b0b0d"; c.fillRect(581, 171, 168, 66);
  c.fillStyle = "#ffffff"; c.textAlign = "center"; c.textBaseline = "middle";
  c.font = `40px ${PIX}`; c.fillText("PMG", 665, 207);

  // the lot behind the fence
  c.fillStyle = "#1a100b"; c.fillRect(0, 330, W, GROUND - 330);

  // floor with a perspective grid (wet concrete)
  c.fillStyle = "#1c1410"; c.fillRect(0, GROUND, W, H - GROUND);
  c.strokeStyle = "#3a2a1f"; c.lineWidth = 2.5;
  for (let k = 1; k < 8; k++) { const yy = GROUND + Math.pow(k / 7, 1.6) * (H - GROUND); c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy); c.stroke(); }
  for (let k = -10; k <= 10; k++) { c.beginPath(); c.moveTo(W / 2 + k * 30, GROUND); c.lineTo(W / 2 + k * 110, H); c.stroke(); }
  c.fillStyle = "#4a3a2e"; c.fillRect(0, GROUND - 4, W, 8);
}

function drawFence(c: CanvasRenderingContext2D) {
  const y0 = 290, y1 = GROUND - 4;
  c.save(); c.beginPath(); c.rect(0, y0, W, y1 - y0); c.clip();
  c.strokeStyle = "rgba(170,150,125,0.5)"; c.lineWidth = 2;
  for (let k = -200; k < W + 200; k += 18) {
    c.beginPath(); c.moveTo(k, y0); c.lineTo(k + (y1 - y0), y1); c.stroke();
    c.beginPath(); c.moveTo(k, y1); c.lineTo(k + (y1 - y0), y0); c.stroke();
  }
  c.restore();
  c.fillStyle = "#5d4c3c";
  for (let x = 0; x <= W; x += 240) c.fillRect(x - 5, y0 - 6, 10, y1 - y0 + 6);
  c.fillRect(0, y0 - 6, W, 6);
}

const CROWD = (() => {
  const rnd = seeded(5), out: { x: number; h: number; body: string; skin: string; hat: boolean; ph: number }[] = [];
  const bodies = ["#2b2320", "#3a2a22", "#1f2530", "#402a1e", "#2d2d26"], skins = ["#6b4430", "#8a5a3c", "#b07a55"];
  for (let x = 14; x < W; x += 34 + rnd() * 14) {
    out.push({ x, h: 70 + rnd() * 26, body: bodies[Math.floor(rnd() * bodies.length)], skin: skins[Math.floor(rnd() * skins.length)], hat: rnd() < 0.4, ph: rnd() * 6 });
  }
  return out;
})();

function drawCrowd(c: CanvasRenderingContext2D, t: number, hype: number) {
  const base = 426;
  CROWD.forEach((p, k) => {
    const bob = Math.sin(t * 0.12 + p.ph) * (1.5 + hype / 18);
    const top = base - p.h + bob;
    c.fillStyle = p.body; c.fillRect(p.x - 12, top + 22, 24, p.h - 22);
    c.fillStyle = "#c86a2a"; c.fillRect(p.x + 9, top + 24, 3, p.h - 26);          // fire rim-light
    if (hype > 25 && k % 2 === 0) { c.fillStyle = p.body; c.fillRect(p.x - 16, top - 8, 6, 30); c.fillRect(p.x + 10, top - 8, 6, 30); }
    c.fillStyle = p.skin; c.fillRect(p.x - 9, top, 18, 20);
    if (p.hat) { c.fillStyle = "#111"; c.fillRect(p.x - 10, top - 3, 20, 8); }
  });
}

function drawBarrels(c: CanvasRenderingContext2D, t: number) {
  for (const bx of [120, 840]) {
    const by = GROUND - 8;
    c.globalCompositeOperation = "lighter";
    const glow = c.createRadialGradient(bx, by - 70, 10, bx, by - 70, 190);
    glow.addColorStop(0, "rgba(255,140,40,0.30)"); glow.addColorStop(1, "rgba(255,140,40,0)");
    c.fillStyle = glow; c.fillRect(bx - 190, by - 260, 380, 360);
    c.globalCompositeOperation = "source-over";
    voxelBox(c, bx - 22, by - 56, 44, 56, "#4a2616", "#2b150c", "#6a3a22", 8);
    c.fillStyle = "#2b150c"; c.fillRect(bx - 22, by - 46, 44, 5); c.fillRect(bx - 22, by - 18, 44, 5);
    for (let j = 0; j < 7; j++) {
      const h = 18 + ((j * 37 + (t >> 2) * 13 + bx) % 29);
      const fx = bx - 21 + j * 6;
      c.fillStyle = "#FF2300"; c.fillRect(fx, by - 56 - h, 7, h);
      c.fillStyle = "#ff9a1f"; c.fillRect(fx + 1, by - 56 - h * 0.7, 5, h * 0.7);
      c.fillStyle = "#ffe27a"; c.fillRect(fx + 2, by - 56 - h * 0.35, 3, h * 0.35);
    }
  }
}

/* ---------- fighters ---------- */

type P = [number, number];

function seg(c: CanvasRenderingContext2D, pts: P[], w: number, col: string, light: string, ink: string) {
  c.lineCap = "round"; c.lineJoin = "round";
  const path = () => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) c.lineTo(pts[k][0], pts[k][1]); };
  path(); c.lineWidth = w + 5; c.strokeStyle = ink; c.stroke();
  path(); c.lineWidth = w; c.strokeStyle = col; c.stroke();
  c.save(); c.translate(w * 0.18, -w * 0.2); path(); c.lineWidth = w * 0.35; c.strokeStyle = light; c.stroke(); c.restore();
}

function block(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string, ink: string) {
  c.fillStyle = ink; c.fillRect(x - 2.5, y - 2.5, w + 5, h + 5);
  c.fillStyle = col; c.fillRect(x, y, w, h);
}

interface Rig { hip: P; sh: P; head: P; fk: P; ff: P; bk: P; bf: P; fe: P; fh: P; be: P; bh: P; lean: number; glow: P | null; down: boolean }

function rigFor(f: Fighter, t: number): Rig {
  const s = f.state;
  const down = ((s === "knockdown" || s === "ko") && !f.air) || (s === "wakeup" && f.sf < 10);
  const bob = s === "idle" || s === "block" || s === "win" ? Math.sin(t * 0.1) * 2 : 0;
  const crouched = !f.air && ((f.crouch && (s === "crouch" || s === "block" || s === "blockstun")) || (s === "attack" && f.move?.ctx === "crouch"));
  const r: Rig = crouched
    ? { hip: [0, -40], sh: [8, -86], head: [14, -104], fk: [26, -26], ff: [24, 0], bk: [-6, -18], bf: [-22, 0], fe: [24, -78], fh: [34, -92], be: [14, -76], bh: [24, -90], lean: 0, glow: null, down }
    : { hip: [0, -66 + bob], sh: [3, -116 + bob], head: [7, -135 + bob], fk: [18, -32], ff: [22, 0], bk: [-12, -32], bf: [-18, 0], fe: [22, -98 + bob], fh: [32, -118 + bob], be: [8, -98 + bob], bh: [20, -122 + bob], lean: 0, glow: null, down };

  if (f.air && s !== "ko" && s !== "knockdown") { r.fk = [20, -46]; r.ff = [8, -24]; r.bk = [6, -40]; r.bf = [-10, -20]; }
  if (s === "walk") { const w = Math.sin(t * 0.3) * 12; r.ff = [22 + w, 0]; r.fk = [18 + w * 0.5, -32]; r.bf = [-18 - w, 0]; r.bk = [-12 - w * 0.5, -32]; }

  if (s === "attack" && f.move) {
    const m = f.move, R = m.reach, k = moveProgress(f);
    switch (m.pose) {
      case "jab": r.fh = [12 + (R - 12) * k * 0.95, -114]; r.fe = [(r.fh[0] + r.sh[0]) / 2 + 2, -110]; break;
      case "cross": r.bh = [12 + (R - 12) * k * 0.95, -112]; r.be = [(r.bh[0] + r.sh[0]) / 2, -106]; r.sh = [3 + 6 * k, -116]; break;
      case "hook": r.fh = [10 + (R - 10) * k * 0.92, -118 - 10 * Math.sin(k * Math.PI)]; r.fe = [r.fh[0] * 0.5 + 4, -100]; r.sh = [3 + 8 * k, -114]; r.head = [7 + 8 * k, -133]; break;
      case "roundhouse": r.ff = [10 + (R - 10) * k * 0.95, -60 - 44 * k]; r.fk = [r.ff[0] * 0.45 + 10, -70 - 10 * k]; r.sh = [-6 * k, -114]; r.head = [-4 * k + 4, -133]; break;
      case "lowpunch": r.fh = [14 + (R - 14) * k * 0.95, -74]; r.fe = [r.fh[0] * 0.5 + 6, -76]; break;
      case "sweep": r.ff = [10 + (R - 10) * k * 0.97, -6]; r.fk = [r.ff[0] * 0.5 + 4, -16]; r.bh = [-6, -8]; r.be = [2, -40]; break;
      case "airpunch": r.fh = [16 + (R - 16) * k * 0.9, -86 + 28 * k]; r.fe = [r.fh[0] * 0.5 + 6, -96]; break;
      case "airkick": r.ff = [12 + (R - 12) * k * 0.95, -46 + 10 * k]; r.fk = [r.ff[0] * 0.5 + 6, -58]; break;
      case "fireball": {
        const e = 20 + 36 * Math.min(1, k);
        r.fh = [e, -100]; r.bh = [e - 6, -92]; r.fe = [e * 0.5 + 6, -100]; r.be = [e * 0.5, -94];
        if (f.sf - 1 < m.startup && k > 0.2) r.glow = [e + 14, -98];
        break;
      }
    }
  }
  if (s === "block" || s === "blockstun") {
    if (crouched) { r.fe = [26, -78]; r.fh = [26, -100]; r.be = [18, -76]; r.bh = [20, -96]; }
    else { r.fe = [26, -104]; r.fh = [24, -134]; r.be = [18, -100]; r.bh = [16, -128]; }
  }
  if (s === "hitstun" || (f.air && (s === "knockdown" || s === "ko"))) r.lean = -0.3;
  if (s === "win") { r.fe = [16, -138]; r.fh = [22, -168]; }
  return r;
}

function drawHead(c: CanvasRenderingContext2D, d: FighterDef, [x, y]: P, ink: string) {
  block(c, x - 12, y - 14, 24, 28, d.skin, ink);
  c.fillStyle = shade(d.skin, 0.2); c.fillRect(x + 4, y - 12, 6, 10);
  c.fillStyle = INK; c.fillRect(x + 6, y - 3, 3, 3);
  if (d.look === "street") {
    block(c, x - 13, y - 19, 26, 9, "#121114", ink);
    c.fillStyle = d.color; c.fillRect(x + 8, y - 13, 12, 4);
  } else if (d.look === "fashion") {
    c.fillStyle = "#1a1110"; c.fillRect(x - 13, y - 17, 26, 7);
    c.fillStyle = "#050505"; c.fillRect(x + 1, y - 6, 12, 5);
  } else {
    c.fillStyle = "#1a1110"; c.fillRect(x - 13, y - 17, 26, 7); c.fillRect(x - 13, y - 17, 6, 14);
  }
}

function drawFighter(c: CanvasRenderingContext2D, f: Fighter, t: number) {
  const d = f.def, ink = f.flash > 0 ? "#fff4d8" : INK;
  const top = d.color, topL = shade(top, 0.4), topD = shade(top, -0.35);
  const pants = d.look === "casual" ? "#3d5a8a" : d.look === "fashion" ? "#17161c" : "#2c2a30";
  const shoe = d.look === "fashion" ? "#0e0d10" : "#ece6d6";
  const skinD = shade(d.skin, -0.2);
  const r = rigFor(f, t);

  c.save();
  c.translate(f.x, GROUND);
  const sh = Math.max(0.4, 1 + f.y / 300);
  c.fillStyle = "rgba(0,0,0,0.5)"; c.beginPath(); c.ellipse(0, 4, 38 * sh, 7 * sh, 0, 0, Math.PI * 2); c.fill();
  c.translate(0, f.y);
  c.scale(f.facing * 1.12, 1.12);

  if (r.down) {
    seg(c, [[18, -10], [44, -8], [70, -6]], 15, pants, shade(pants, 0.3), ink);
    seg(c, [[-50, -12], [18, -12]], 28, top, topL, ink);
    seg(c, [[-30, -14], [-6, -24], [14, -18]], 11, top, topL, ink);
    drawHead(c, d, [-66, -16], ink);
    c.restore();
    return;
  }
  if (r.lean) { c.translate(0, -60); c.rotate(r.lean); c.translate(0, 60); }

  // back leg + back arm (in shadow)
  seg(c, [r.hip, r.bk, r.bf], 15, shade(pants, -0.3), shade(pants, 0.05), ink);
  block(c, r.bf[0] - 6, r.bf[1] - 8, 20, 9, shade(shoe, -0.3), ink);
  seg(c, [r.sh, r.be], 12, topD, top, ink);
  seg(c, [r.be, r.bh], 11, d.look === "casual" ? skinD : topD, d.look === "casual" ? d.skin : top, ink);
  block(c, r.bh[0] - 7, r.bh[1] - 7, 14, 14, skinD, ink);

  // long coat tails
  if (d.look === "fashion") {
    c.fillStyle = ink;
    c.beginPath(); c.moveTo(r.hip[0] - 17, r.hip[1] - 6); c.lineTo(r.hip[0] + 17, r.hip[1] - 6); c.lineTo(r.fk[0] + 16, r.fk[1] + 10); c.lineTo(r.bk[0] - 14, r.bk[1] + 10); c.fill();
    c.fillStyle = topD;
    c.beginPath(); c.moveTo(r.hip[0] - 14, r.hip[1] - 4); c.lineTo(r.hip[0] + 14, r.hip[1] - 4); c.lineTo(r.fk[0] + 12, r.fk[1] + 7); c.lineTo(r.bk[0] - 11, r.bk[1] + 7); c.fill();
  }

  // torso + head
  seg(c, [r.hip, r.sh], 30, top, topL, ink);
  if (d.look === "street") block(c, r.sh[0] - 16, r.sh[1] - 6, 12, 12, topD, ink);            // hood
  if (d.look === "fashion") { c.fillStyle = "#ffcf4a"; c.fillRect(r.sh[0] + 4, r.sh[1] + 4, 4, 12); } // chain
  drawHead(c, d, r.head, ink);

  // front leg + front arm
  seg(c, [r.hip, r.fk, r.ff], 15, pants, shade(pants, 0.3), ink);
  block(c, r.ff[0] - 6, r.ff[1] - 8, 22, 9, shoe, ink);
  seg(c, [r.sh, r.fe], 12, top, topL, ink);
  seg(c, [r.fe, r.fh], 11, d.look === "casual" ? d.skin : top, d.look === "casual" ? shade(d.skin, 0.25) : topL, ink);
  block(c, r.fh[0] - 7, r.fh[1] - 7, 15, 15, d.skin, ink);

  if (r.glow) {
    c.fillStyle = "#ff9a1f"; c.beginPath(); c.arc(r.glow[0], r.glow[1], 18 + Math.sin(t) * 3, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ffe9a8"; c.beginPath(); c.arc(r.glow[0], r.glow[1], 9, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

function drawProjectile(c: CanvasRenderingContext2D, p: Proj) {
  const x = p.x, y = GROUND + p.y;
  for (let k = 4; k >= 1; k--) {                                  // flame trail
    c.fillStyle = k > 2 ? "#FF2300" : "#ff9a1f";
    c.beginPath(); c.arc(x - p.dir * k * 14, y + Math.sin(p.spin + k) * 3, 16 - k * 2.5, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = "#0c0a0a"; c.beginPath(); c.arc(x, y, 22, 0, Math.PI * 2); c.fill();     // the record
  c.strokeStyle = "#3a3434"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 15, 0, Math.PI * 2); c.stroke();
  c.fillStyle = "#FF2300"; c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#0c0a0a"; c.beginPath(); c.arc(x, y, 2, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "#e8e0d0"; c.lineWidth = 2.5; c.beginPath();
  c.moveTo(x + Math.cos(p.spin) * 11, y + Math.sin(p.spin) * 11); c.lineTo(x + Math.cos(p.spin) * 20, y + Math.sin(p.spin) * 20); c.stroke();
}

function drawSparks(c: CanvasRenderingContext2D, g: Game) {
  for (const s of g.sparks) {
    const r = (14 - s.t) * 3.4 + 10;
    c.save(); c.translate(s.x, s.y);
    const pts = 8;
    c.fillStyle = s.blocked ? "#bfe0ff" : "#ffd23f";
    c.beginPath();
    for (let k = 0; k < pts * 2; k++) {
      const a = (k / (pts * 2)) * Math.PI * 2, rr = k % 2 === 0 ? r : r * 0.4;
      if (k === 0) c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.fill();
    c.fillStyle = "#ffffff"; c.beginPath(); c.arc(0, 0, r * 0.3, 0, Math.PI * 2); c.fill();
    c.restore();
  }
}

let bgCache: HTMLCanvasElement | null = null;
let fenceCache: HTMLCanvasElement | null = null;

function makeLayer(draw: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement("canvas");
  cv.width = LW; cv.height = LH;
  const c = cv.getContext("2d")!;
  c.setTransform(S, 0, 0, S, 0, 0);
  draw(c);
  return cv;
}

function renderWorld(lc: CanvasRenderingContext2D, g: Game) {
  if (!bgCache) bgCache = makeLayer(drawBackdrop);
  if (!fenceCache) fenceCache = makeLayer(drawFence);
  lc.setTransform(1, 0, 0, 1, 0, 0); lc.drawImage(bgCache, 0, 0);
  lc.setTransform(S, 0, 0, S, 0, 0); drawCrowd(lc, g.frame, g.hype);
  lc.setTransform(1, 0, 0, 1, 0, 0); lc.drawImage(fenceCache, 0, 0);
  lc.setTransform(S, 0, 0, S, 0, 0);
  drawBarrels(lc, g.frame);
  const order = [...g.f].sort((a) => (a.state === "attack" ? 1 : -1));   // attacker drawn on top
  order.forEach((f) => drawFighter(lc, f, g.frame));
  g.proj.forEach((p) => drawProjectile(lc, p));
  drawSparks(lc, g);
  lc.setTransform(1, 0, 0, 1, 0, 0);
  quantize(lc, LW, LH);
}

/* ---------- HUD (drawn sharp, on top of the pixels) ---------- */

function outlined(c: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill: string | CanvasGradient = "#ffffff", align: CanvasTextAlign = "center") {
  c.font = `${size}px ${PIX}`; c.textAlign = align; c.textBaseline = "middle";
  c.lineJoin = "round"; c.lineWidth = Math.max(4, size / 4); c.strokeStyle = INK; c.strokeText(text, x, y);
  c.fillStyle = fill; c.fillText(text, x, y);
}

function drawHud(c: CanvasRenderingContext2D, g: Game, touch: boolean) {
  const BW = 370, BY = 22, BH = 22;
  g.f.forEach((f, i) => {
    const left = i === 0, x0 = left ? W / 2 - 50 - BW : W / 2 + 50;
    const fill = (v: number) => (BW * v) / 100;
    c.fillStyle = INK; c.fillRect(x0 - 4, BY - 4, BW + 8, BH + 8);
    c.fillStyle = "#3a120a"; c.fillRect(x0, BY, BW, BH);
    c.fillStyle = "#FF2300"; c.fillRect(left ? x0 + BW - fill(f.lag) : x0, BY, fill(f.lag), BH);
    c.fillStyle = "#FFD23F"; c.fillRect(left ? x0 + BW - fill(f.hp) : x0, BY, fill(f.hp), BH);
    c.fillStyle = "#fff2a8"; c.fillRect(left ? x0 + BW - fill(f.hp) : x0, BY + 2, fill(f.hp), 4);
    c.strokeStyle = "#ffffff"; c.lineWidth = 2; c.strokeRect(x0 - 1, BY - 1, BW + 2, BH + 2);

    // name + round wins (filled vs hollow, so it reads without colour)
    outlined(c, `${f.tag} ${f.def.name.toUpperCase()}`, left ? x0 : x0 + BW, BY + BH + 20, 14, "#ffffff", left ? "left" : "right");
    for (let k = 0; k < 2; k++) {
      const cx = left ? x0 + BW - 10 - k * 24 : x0 + 10 + k * 24, cy = BY + BH + 20;
      c.fillStyle = INK; c.fillRect(cx - 9, cy - 9, 18, 18);
      c.strokeStyle = "#ffffff"; c.lineWidth = 2; c.strokeRect(cx - 7, cy - 7, 14, 14);
      if (g.wins[i] > k) { c.fillStyle = "#ffffff"; c.fillRect(cx - 5, cy - 5, 10, 10); }
    }

    // special meter: white tick = what a special costs
    const sy = BY + BH + 40, mw = BW * 0.55, sw = mw * (f.sta / 100);
    c.fillStyle = INK; c.fillRect(left ? x0 + BW - mw - 3 : x0 - 3, sy - 3, mw + 6, 14);
    c.fillStyle = "#3AA0FF"; c.fillRect(left ? x0 + BW - sw : x0, sy, sw, 8);
    const tick = mw * (SP_COST / 100);
    c.fillStyle = "#ffffff"; c.fillRect(left ? x0 + BW - tick - 1 : x0 + tick - 1, sy - 3, 2, 14);
    outlined(c, f.sta >= SP_COST ? "SPECIAL READY" : "SPECIAL", left ? x0 + BW - mw - 10 : x0 + mw + 10, sy + 4, 10, "#ffffff", left ? "right" : "left");

    const cs = g.comboShow[i];
    if (cs.t > 0 && cs.n >= 2) outlined(c, `${cs.n} HITS`, left ? 150 : W - 150, 200, 22, "#FFD23F");

    // who is who, above each fighter
    const ty = GROUND + f.y - (f.state === "knockdown" || f.state === "ko" ? 60 : f.crouch ? 150 : 200) - (i === 0 ? 0 : 22);
    outlined(c, f.tag, f.x, ty, 12);
  });

  // KO badge + timer
  c.fillStyle = INK; c.fillRect(W / 2 - 38, BY - 8, 76, BH + 16);
  c.fillStyle = "#FFB000"; c.fillRect(W / 2 - 34, BY - 4, 68, BH + 8);
  c.font = `20px ${PIX}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = INK; c.fillText("KO", W / 2, BY + BH / 2 + 1);
  outlined(c, `${Math.max(0, Math.ceil(g.timer / 60))}`.padStart(2, "0"), W / 2, 92, 36);

  for (const s of g.sparks) if (s.blocked) outlined(c, "BLOCK", s.x, s.y - 50, 12, "#bfe0ff");

  if (g.round === 1 && g.frame < 420) {
    outlined(c, touch ? "HOLD THE STICK AWAY FROM YOUR RIVAL TO BLOCK" : "HOLD BACK (AWAY FROM YOUR RIVAL) TO BLOCK", W / 2, 140, 11, "#ffcf7a");
  }

  if (g.msg) {
    const size = g.msg.length > 16 ? 26 : g.msg.length > 10 ? 34 : 52;
    const y = H / 2 - 40;
    const grad = c.createLinearGradient(0, y - size / 2, 0, y + size / 2);
    grad.addColorStop(0, "#fff1b0"); grad.addColorStop(0.45, "#FFB000"); grad.addColorStop(1, "#FF2300");
    outlined(c, g.msg, W / 2, y, size, grad);
  }
}

let vignette: HTMLCanvasElement | null = null;

function present(ctx: CanvasRenderingContext2D, low: HTMLCanvasElement, g: Game, touch: boolean) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height, k = cw / W;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const sx = g.shake > 0 ? ((g.frame * 7) % 5 - 2) * k * 2 : 0, sy = g.shake > 0 ? ((g.frame * 3) % 5 - 2) * k * 2 : 0;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(low, sx, sy, cw, ch);
  // CRT scanlines, one per game pixel row
  const rh = ch / LH;
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (let y = 0; y < LH; y++) ctx.fillRect(0, y * rh + rh * 0.7, cw, rh * 0.3);
  if (!vignette || vignette.width !== cw) {
    vignette = document.createElement("canvas"); vignette.width = cw; vignette.height = ch;
    const v = vignette.getContext("2d")!, gr = v.createRadialGradient(cw / 2, ch / 2, ch * 0.35, cw / 2, ch / 2, cw * 0.62);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.55)");
    v.fillStyle = gr; v.fillRect(0, 0, cw, ch);
  }
  ctx.drawImage(vignette, 0, 0);
  ctx.setTransform(k, 0, 0, k, 0, 0);
  drawHud(ctx, g, touch);
}

/* ================================================================== */
/*  CONTROLS                                                           */
/* ================================================================== */

type Action = "left" | "right" | "up" | "down" | Btn;
const KEYS_P1: Record<string, Action> = { KeyA: "left", KeyD: "right", KeyW: "up", KeyS: "down", KeyJ: "punch", KeyK: "kick", KeyL: "special" };
const KEYS_P2: Record<string, Action> = {
  ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
  Comma: "punch", Period: "kick", Slash: "special", Numpad1: "punch", Numpad2: "kick", Numpad3: "special",
};
type Dir = { left: boolean; right: boolean; up: boolean; down: boolean };

/* ================================================================== */
/*  REACT                                                              */
/* ================================================================== */

const CSS = `
.pmg{min-height:100dvh;width:100%;overflow-x:hidden;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  background:radial-gradient(120% 70% at 50% 115%,#6a2e10 0%,#221009 45%,#070504 100%);
  display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;box-sizing:border-box;
  user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;overscroll-behavior:none}
.pmg *{box-sizing:border-box}
.pmg-exit{position:fixed;top:18px;left:18px;z-index:20;appearance:none;border:2px solid #FF2300;background:rgba(8,5,4,.9);color:#fff;font:10px ${PIX};padding:10px 12px;cursor:pointer;box-shadow:3px 3px 0 #000}
.pmg-exit:hover{background:#FF2300}.pmg-exit:focus-visible{outline:3px solid #fff;outline-offset:3px}
.pmg-logo{display:inline-block;background:#0b0b0d;border:5px solid #FF2300;padding:10px 18px 8px;font:34px ${PIX};line-height:1;box-shadow:6px 6px 0 #000}
.pmg-title{font:clamp(26px,7vw,54px)/1.15 ${PIX};margin:22px 0 10px;text-align:center;
  background:linear-gradient(#fff1b0,#FFB000 45%,#ff5a00 75%,#FF2300);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(4px 4px 0 #000)}
.pmg-h2{font:clamp(14px,3.4vw,22px)/1.4 ${PIX};margin:4px 0 10px;text-align:center;color:#FFB000;text-shadow:3px 3px 0 #000}
.pmg-tag{font:12px/1.6 ${PIX};color:#ffcf7a;letter-spacing:2px;margin:0 0 6px;text-align:center}
.pmg-sub{color:#efdcc6;margin:0 0 22px;text-align:center;max-width:42ch;font-size:15px;line-height:1.5}
.pmg-blink{animation:pmgblink 1.1s steps(1) infinite}@keyframes pmgblink{50%{opacity:0}}
.pmg-col{display:flex;flex-direction:column;gap:14px;width:min(360px,92vw)}
.pmg-btn{appearance:none;border:3px solid #000;border-radius:2px;background:#FFB000;color:#140c08;font:13px/1.5 ${PIX};padding:16px 14px;cursor:pointer;
  box-shadow:5px 5px 0 #000;touch-action:manipulation;text-align:center}
.pmg-btn:hover{background:#ffc53d}
.pmg-btn:active{transform:translate(3px,3px);box-shadow:2px 2px 0 #000}
.pmg-btn.ghost{background:#1f130d;color:#fff;border-color:#FFB000}
.pmg-btn small{display:block;font:600 13px system-ui,sans-serif;margin-top:6px}
.pmg-btn:focus-visible,.pmg-card:focus-visible,.pmg-mini:focus-visible{outline:3px solid #fff;outline-offset:3px}
.pmg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;width:min(940px,96vw)}
.pmg-card{appearance:none;text-align:left;background:#1f130d;border:3px solid #4a2f1f;border-radius:2px;padding:10px;color:#fff;cursor:pointer;position:relative;box-shadow:5px 5px 0 #000;touch-action:manipulation}
.pmg-card:hover{border-color:#FFB000}
.pmg-card[aria-pressed="true"]{border-color:#fff;background:#2c1b12}
.pmg-card canvas{width:100%;aspect-ratio:1;display:block;image-rendering:pixelated;border:3px solid #000}
.pmg-card h3{margin:10px 0 4px;font:14px/1.3 ${PIX}}
.pmg-card .meta{font-size:13px;color:#efdcc6;margin-bottom:8px}
.pmg-badge{position:absolute;top:14px;left:14px;background:#fff;color:#140c08;font:10px ${PIX};padding:5px 6px}
.pmg-stat{display:grid;grid-template-columns:64px 1fr 18px;align-items:center;gap:6px;font-size:12px;margin-top:4px}
.pmg-stat i{display:block;height:7px;background:#3a2518}
.pmg-stat i b{display:block;height:100%;background:#FFB000}
.pmg-stage{position:relative}
.pmg-canvas{display:block;touch-action:none;background:#000;border:3px solid #000;box-shadow:0 0 0 3px #4a2f1f,8px 8px 0 3px #000}
.pmg-top{position:absolute;bottom:8px;left:50%;transform:translateX(-50%)}
.pmg-mini{appearance:none;border:2px solid #FFB000;border-radius:2px;background:rgba(20,12,8,.85);color:#fff;font:10px ${PIX};padding:9px 10px;cursor:pointer}
.pmg-help{color:#efdcc6;font-size:14px;margin-top:14px;text-align:center;line-height:1.9}
.pmg-help kbd{background:#2c1b12;border:2px solid #FFB000;border-radius:2px;padding:0 6px;font:11px ${PIX};color:#fff}
.pmg-pad{display:flex;justify-content:space-between;align-items:flex-end;gap:8px;margin-top:12px;width:100%;max-width:100%}
.pmg-pad.overlay{position:absolute;left:10px;right:10px;bottom:10px;width:auto;margin:0;pointer-events:none}
.pmg-pad.overlay>*{pointer-events:auto}
.pmg-dpad{position:relative;width:clamp(116px,30vw,150px);aspect-ratio:1;border-radius:50%;background:rgba(20,12,8,.62);border:3px solid rgba(255,176,0,.9);touch-action:none;flex:none}
.pmg-dpad .ar{position:absolute;font:12px ${PIX};color:#ffcf7a;line-height:1}
.pmg-knob{position:absolute;left:50%;top:50%;width:42%;height:42%;margin:-21% 0 0 -21%;border-radius:50%;background:#FFB000;border:3px solid #000;pointer-events:none}
.pmg-keys{display:flex;gap:clamp(6px,2vw,10px);align-items:flex-end}
.pmg-key{appearance:none;border:3px solid #FFB000;background:rgba(20,12,8,.72);color:#fff;border-radius:50%;width:clamp(56px,15vw,70px);height:clamp(56px,15vw,70px);
  font:700 11px system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:none;padding:0;gap:3px}
.pmg-key span{font:16px ${PIX}}
.pmg-key.sp{border-color:#FF2300}
.pmg-key.k{margin-bottom:18px}
.pmg-over{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;padding-bottom:12%;pointer-events:none}
.pmg-over .pmg-col{pointer-events:auto;width:min(320px,80%)}
.pmg-rotate{color:#efdcc6;font-size:13px;margin-top:10px;text-align:center}
`;

function useIsTouch() {
  const [t] = useState(() => typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0));
  return t;
}

/** Pixel portrait for the select screen, drawn with the same renderer as the fight. */
function Portrait({ def }: { def: FighterDef }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const c = cv.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D | null; if (!c) return;
    const draw = () => {
      c.setTransform(1, 0, 0, 1, 0, 0);
      const gr = c.createLinearGradient(0, 0, 0, 64);
      gr.addColorStop(0, "#1a0b07"); gr.addColorStop(1, "#b8561c");
      c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
      c.fillStyle = "#FF2300"; c.fillRect(0, 54, 64, 10);
      const f = newFighter(def, "P1");
      c.setTransform(0.5, 0, 0, 0.5, 26, 104 - GROUND * 0.5);
      drawFighter(c, f, 0);
      c.setTransform(1, 0, 0, 1, 0, 0);
      quantize(c, 64, 64);
    };
    draw();
  }, [def]);
  return <canvas ref={ref} width={64} height={64} aria-hidden="true" />;
}

function DPad({ onDir }: { onDir: (d: Dir) => void }) {
  const ref = useRef<HTMLDivElement>(null), knob = useRef<HTMLDivElement>(null), active = useRef(false);
  const update = (e: RPointerEvent<HTMLDivElement>) => {
    const box = ref.current!.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2), dy = e.clientY - (box.top + box.height / 2);
    const R = box.width / 2, dz = R * 0.28;
    onDir({ left: dx < -dz, right: dx > dz, up: dy < -dz * 1.2, down: dy > dz });
    const m = Math.min(1, Math.hypot(dx, dy) / R), a = Math.atan2(dy, dx);
    if (knob.current) knob.current.style.transform = `translate(${Math.cos(a) * m * R * 0.5}px, ${Math.sin(a) * m * R * 0.5}px)`;
  };
  const end = () => {
    active.current = false;
    onDir({ left: false, right: false, up: false, down: false });
    if (knob.current) knob.current.style.transform = "";
  };
  return (
    <div
      ref={ref} className="pmg-dpad" role="group" aria-label="Move stick: left, right, up to jump, down to crouch"
      onPointerDown={(e) => { e.preventDefault(); active.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); update(e); }}
      onPointerMove={(e) => { if (active.current) update(e); }}
      onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="ar" style={{ top: 8, left: "50%", transform: "translateX(-50%)" }}>▲</span>
      <span className="ar" style={{ bottom: 8, left: "50%", transform: "translateX(-50%)" }}>▼</span>
      <span className="ar" style={{ left: 8, top: "50%", transform: "translateY(-50%)" }}>◀</span>
      <span className="ar" style={{ right: 8, top: "50%", transform: "translateY(-50%)" }}>▶</span>
      <div ref={knob} className="pmg-knob" />
    </div>
  );
}

function TapKey({ glyph, label, cls, onPress }: { glyph: string; label: string; cls: string; onPress: () => void }) {
  return (
    <button
      className={`pmg-key ${cls}`} aria-label={label}
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
      onContextMenu={(e) => e.preventDefault()}
    ><span>{glyph}</span>{label}</button>
  );
}

interface PMGFightProps {
  onExit?: () => void;
}

export default function PMGFight({ onExit }: PMGFightProps) {
  const [screen, setScreen] = useState<"menu" | "select" | "fight">("menu");
  const [mode, setMode] = useState<"cpu" | "2p">("cpu");
  const [picks, setPicks] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const isTouch = useIsTouch();

  const choose = (i: number) => {
    const next = [...picks, i];
    if (next.length === 2) { setPicks(next); setRound((r) => r + 1); setScreen("fight"); }
    else setPicks(next);
  };

  return (
    <div className="pmg">
      <style>{CSS}</style>
      {onExit && (
        <button className="pmg-exit" onClick={onExit} aria-label="Return to Propworld">
          ← PROPWORLD
        </button>
      )}

      {screen === "menu" && (
        <>
          <div className="pmg-logo">PMG</div>
          <h1 className="pmg-title">PMG FIGHT</h1>
          <p className="pmg-tag">STREETS OF NEW YORK</p>
          <p className="pmg-sub">The Propmyganda roster settles it on the block. Best of three rounds.</p>
          <div className="pmg-col">
            <button className="pmg-btn" onClick={() => { setMode("cpu"); setPicks([]); setScreen("select"); }}>
              1 PLAYER<small>You vs the computer · phone, tablet or PC</small>
            </button>
            <button className="pmg-btn ghost" onClick={() => { setMode("2p"); setPicks([]); setScreen("select"); }}>
              2 PLAYERS<small>Two people, one keyboard</small>
            </button>
          </div>
          <p className="pmg-tag pmg-blink" style={{ marginTop: 26 }}>PRESS START</p>
        </>
      )}

      {screen === "select" && (
        <>
          <h1 className="pmg-h2">
            {picks.length === 0 ? "PLAYER 1 · SELECT YOUR FIGHTER" : mode === "cpu" ? "PICK YOUR RIVAL" : "PLAYER 2 · SELECT YOUR FIGHTER"}
          </h1>
          <p className="pmg-sub">Stats are 1 to 10. Tap or click a fighter.</p>
          <div className="pmg-grid">
            {ROSTER.map((r, i) => (
              <button key={r.id} className="pmg-card" aria-pressed={picks[0] === i} onClick={() => choose(i)}>
                <Portrait def={r} />
                {picks[0] === i && <span className="pmg-badge">P1</span>}
                <h3>{r.name.toUpperCase()}</h3>
                <div className="meta">{r.lookLabel} · {r.arch}</div>
                {(["power", "speed", "defense", "special"] as const).map((k) => (
                  <div className="pmg-stat" key={k}>
                    <span style={{ textTransform: "capitalize" }}>{k}</span>
                    <i><b style={{ width: `${r[k] * 10}%` }} /></i>
                    <strong>{r[k]}</strong>
                  </div>
                ))}
              </button>
            ))}
          </div>
          <div className="pmg-col" style={{ marginTop: 18 }}>
            <button className="pmg-btn ghost" onClick={() => (picks.length ? setPicks([]) : setScreen("menu"))}>BACK</button>
          </div>
        </>
      )}

      {screen === "fight" && picks.length === 2 && (
        <FightView
          key={round}
          p1={ROSTER[picks[0]]} p2={ROSTER[picks[1]]} cpu={mode === "cpu"} isTouch={isTouch}
          onRematch={() => setRound((r) => r + 1)}
          onChange={() => { setPicks([]); setScreen("select"); }}
          onMenu={() => { setPicks([]); setScreen("menu"); }}
        />
      )}
    </div>
  );
}

function FightView(props: {
  p1: FighterDef; p2: FighterDef; cpu: boolean; isTouch: boolean;
  onRematch: () => void; onChange: () => void; onMenu: () => void;
}) {
  const { p1, p2, cpu, isTouch } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [over, setOver] = useState(false);
  const [size, setSize] = useState({ w: 960, h: 540, landscape: true });

  // fit the arena to the screen
  useEffect(() => {
    const fit = () => {
      const landscape = window.innerWidth > window.innerHeight;
      const overlay = isTouch && landscape;
      const reserve = overlay ? 20 : isTouch ? 210 : 110;
      const w = Math.max(260, Math.min(window.innerWidth - 22, (window.innerHeight - reserve) * (16 / 9), 1280));
      setSize({ w, h: (w * 9) / 16, landscape });
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    return () => { window.removeEventListener("resize", fit); window.removeEventListener("orientationchange", fit); };
  }, [isTouch]);

  // game loop + keyboard
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const px = Math.max(3, Math.round(2.5 * Math.min(2, window.devicePixelRatio || 1)));   // whole-pixel scaling
    canvas.width = LW * px; canvas.height = LH * px;

    const low = document.createElement("canvas");
    low.width = LW; low.height = LH;
    const lctx = low.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;

    // the billboard font may arrive after the first frame — redraw the backdrop once it does
    (document as Document & { fonts?: FontFaceSet }).fonts?.ready.then(() => { bgCache = null; });

    const g = newGame(p1, p2, cpu, () => setOver(true));
    gameRef.current = g;

    const map = new Map<string, [0 | 1, Action]>();
    Object.entries(KEYS_P1).forEach(([k, a]) => map.set(k, [0, a]));
    Object.entries(KEYS_P2).forEach(([k, a]) => map.set(k, [cpu ? 0 : 1, a]));

    const isHold = (a: Action): a is "left" | "right" | "up" | "down" => a === "left" || a === "right" || a === "up" || a === "down";
    const down = (e: KeyboardEvent) => {
      const hit = map.get(e.code); if (!hit) return;
      e.preventDefault();
      const [pi, a] = hit, c = g.ctl[pi];
      if (isHold(a)) c[a] = true;
      else if (!e.repeat) c.queue.push(a);
    };
    const up = (e: KeyboardEvent) => {
      const hit = map.get(e.code); if (!hit) return;
      const [pi, a] = hit, c = g.ctl[pi];
      if (isHold(a)) c[a] = false;
    };
    const blur = () => g.ctl.forEach((c) => { c.left = c.right = c.up = c.down = false; });
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);

    let raf = 0, last = performance.now(), acc = 0;
    const loop = (now: number) => {
      acc += Math.min(now - last, 100); last = now;
      let n = 0;
      while (acc >= FRAME_MS && n < 5) { tick(g); acc -= FRAME_MS; n++; }
      renderWorld(lctx, g);
      present(ctx, low, g, isTouch);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [p1, p2, cpu, isTouch]);

  const setDir = (d: Dir) => {
    const c = gameRef.current?.ctl[0]; if (!c) return;
    c.left = d.left; c.right = d.right; c.up = d.up; c.down = d.down;
  };
  const tap = (b: Btn) => { gameRef.current?.ctl[0].queue.push(b); };

  const overlay = isTouch && size.landscape;
  const pad = isTouch && (
    <div className={`pmg-pad${overlay ? " overlay" : ""}`}>
      <DPad onDir={setDir} />
      <div className="pmg-keys">
        <TapKey glyph="P" label="Punch" cls="p" onPress={() => tap("punch")} />
        <TapKey glyph="K" label="Kick" cls="k" onPress={() => tap("kick")} />
        <TapKey glyph="S" label="Special" cls="sp" onPress={() => tap("special")} />
      </div>
    </div>
  );

  return (
    <>
      <div className="pmg-stage" style={{ width: size.w }}>
        <canvas ref={canvasRef} className="pmg-canvas" style={{ width: size.w, height: size.h }} />
        <div className="pmg-top"><button className="pmg-mini" onClick={props.onMenu}>MENU</button></div>
        {overlay && pad}
        {over && (
          <div className="pmg-over">
            <div className="pmg-col">
              <button className="pmg-btn" onClick={props.onRematch}>REMATCH</button>
              <button className="pmg-btn ghost" onClick={props.onChange}>CHANGE FIGHTERS</button>
            </div>
          </div>
        )}
      </div>
      {!overlay && pad}
      {isTouch && !size.landscape && <div className="pmg-rotate">Turn your device sideways for a bigger arena.</div>}
      {!isTouch && (
        <div className="pmg-help">
          {cpu ? (
            <>Move <kbd>A</kbd> <kbd>D</kbd> · Jump <kbd>W</kbd> · Crouch <kbd>S</kbd> · Punch <kbd>J</kbd> · Kick <kbd>K</kbd> · Special <kbd>L</kbd><br />
            Hold back to block (crouch to block sweeps). Crouch + Kick = sweep. Special also: <kbd>S</kbd>, then toward your rival, then <kbd>J</kbd>.</>
          ) : (
            <>P1: <kbd>A</kbd> <kbd>D</kbd> move · <kbd>W</kbd> jump · <kbd>S</kbd> crouch · <kbd>J</kbd> punch · <kbd>K</kbd> kick · <kbd>L</kbd> special<br />
            P2: arrows move / jump / crouch · <kbd>,</kbd> punch · <kbd>.</kbd> kick · <kbd>/</kbd> special · hold back to block</>
          )}
        </div>
      )}
    </>
  );
}
