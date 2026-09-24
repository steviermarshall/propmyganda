/**
 * PMG FIGHT 3D — browser version
 * Def Jam-style street fight for the Propmyganda roster, in real 3D (three.js).
 * Play: arcade rules — jump, crouch, hold BACK to block, sweeps, jump-ins, signature special.
 *
 * Needs:  the "three" package, and the  public/pmg/  folder with:
 *   jpeez.glb  jahballa.glb  stockz.glb  zoe.glb  hammad.glb  katbot.glb   (fighters)
 *   pmg-logo.png                                                        (intro + title)
 *   song-*.mp3                                                          (music, listed in SONGS below)
 *
 * Lovable: save as  src/components/PMGFight3D.tsx  and render <PMGFight3D /> on the /propworld page.
 */
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as RPointerEvent, ReactNode } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import pmgGraffitiLogo from "@/assets/pmg/pmg-logo-correct.png.asset.json";
import propmygandaLogo from "@/assets/pmg/propmyganda-logo.png.asset.json";
import jpeezModel from "@/assets/pmg/jpeez-correct.glb.asset.json";
import jahballaModel from "@/assets/pmg/jahballa-correct.glb.asset.json";
import stockzModel from "@/assets/pmg/stockz-correct.glb.asset.json";
import zoeModel from "@/assets/pmg/zoe-correct.glb.asset.json";
import hammadModel from "@/assets/pmg/hammad-correct.glb.asset.json";
import katbotModel from "@/assets/pmg/katbot-correct.glb.asset.json";
import subwayModel from "@/assets/pmg/subway-correct.glb.asset.json";
import benchModel from "@/assets/pmg/bench-correct.glb.asset.json";
import spraycanModel from "@/assets/pmg/spraycan-correct.glb.asset.json";
import ratModel from "@/assets/pmg/rat-correct.glb.asset.json";
import dumpsterModel from "@/assets/pmg/dumpster-correct.glb.asset.json";
import billboardModel from "@/assets/pmg/billboard-correct.glb.asset.json";
import carModel from "@/assets/pmg/car-correct.glb.asset.json";
import dirtyDanTrack from "@/assets/pmg/song-dirty-dan.mp3.asset.json";
import stockzTrack from "@/assets/pmg/song-fine-tiino-stockz.mp3.asset.json";
import jahballaPrideTrack from "@/assets/pmg/song-jahballa-pride.mp3.asset.json";
import zoeTrack from "@/assets/pmg/song-zoe-tuesday-rayny.mp3.asset.json";

/** Legacy base for optional files that have not yet been supplied. */
const MODEL_BASE = "/pmg/";
const LOGO_URL = pmgGraffitiLogo.url;
const WORDMARK_URL = propmygandaLogo.url;

const FIGHTER_URLS: Record<string, string> = {
  jpeez: jpeezModel.url,
  jahballa: jahballaModel.url,
  stockz: stockzModel.url,
  zoe: zoeModel.url,
  hammad: hammadModel.url,
  katbot: katbotModel.url,
};

const PROP_URLS: Record<string, string> = {
  subway: subwayModel.url,
  bench: benchModel.url,
  spraycan: spraycanModel.url,
  rat: ratModel.url,
  dumpster: dumpsterModel.url,
  billboard: billboardModel.url,
  car: carModel.url,
};

/** Music plays in shuffled order after the first player interaction. */
const SONGS: { url: string; title: string }[] = [
  { url: dirtyDanTrack.url, title: "Dirty Dan" },
  { url: stockzTrack.url, title: "Fine Tiino — Stockz" },
  { url: jahballaPrideTrack.url, title: "JahBalla — Pride" },
  { url: zoeTrack.url, title: "Tuesday Rayny — Zoe" },
];

/* ================================================================== */
/*  ROSTER                                                             */
/* ================================================================== */

type Btn = "punch" | "kick" | "special";
type Arch = "aggressive" | "technical" | "balanced";
type ProjKind = "record" | "gold" | "ticker" | "note" | "wave" | "paw";

interface FighterDef {
  id: string; name: string; lookLabel: string; arch: Arch; style: string;
  power: number; speed: number; defense: number; special: number;
  color: string;                               // signature colour (HUD, specials)
  sig: { name: string; kind: ProjKind };       // signature special — rename after a song if you like
}

const ROSTER: FighterDef[] = [
  { id: "jpeez",    name: "JPeez",    lookLabel: "Street wear",  arch: "aggressive", style: "Heavy hitter — slow, but every hit hurts", power: 9, speed: 6, defense: 4, special: 7, color: "#FF8A1F", sig: { name: "HEAT ROCK", kind: "record" } },
  { id: "jahballa", name: "JahBalla", lookLabel: "Street wear",  arch: "aggressive", style: "Brawler — heavy hands, nonstop pressure",  power: 8, speed: 7, defense: 5, special: 6, color: "#F5C400", sig: { name: "GOLD RUSH", kind: "gold" } },
  { id: "stockz",   name: "Stockz",   lookLabel: "High fashion", arch: "technical",  style: "Technician — fast, safe, precise",         power: 6, speed: 8, defense: 7, special: 8, color: "#3AA0FF", sig: { name: "BULL RUN", kind: "ticker" } },
  { id: "zoe",      name: "Zoe",      lookLabel: "High fashion", arch: "balanced",   style: "All-rounder — quick feet, sharp kicks",    power: 6, speed: 6, defense: 7, special: 6, color: "#FF5FB0", sig: { name: "HIGH NOTE", kind: "note" } },
  { id: "katbot",   name: "KatBot",   lookLabel: "Street tech",  arch: "technical",  style: "Wildcard — fastest in the roster, but fragile", power: 8, speed: 9, defense: 3, special: 8, color: "#B070FF", sig: { name: "NINE LIVES", kind: "paw" } },
  { id: "hammad",   name: "Hammad",   lookLabel: "Casual",       arch: "balanced",   style: "All-rounder — solid at every range",       power: 7, speed: 7, defense: 6, special: 6, color: "#2ED47A", sig: { name: "BASS DROP", kind: "wave" } },
];

const ZOOM = 1.25;                                    // gameplay: max distance apart = what the camera can show
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
    ctx: "stand", level: "high", height: 160, startup: 5, active: 3, recovery: 10, damage: 5,
    hitstun: 16, blockstun: 11, hitstop: 5, reach: 80, knockback: 4, knockdown: false, cost: 0,
    cancelStart: 0, cancelEnd: 0, ...m,
  });
  return {
    // standing punch chain: press Punch up to three times
    LP:  mk({ id: "LP",  btn: "punch", pose: "jab",   startup: 5 + d.su, recovery: 9 + d.rec,  damage: 5,         hitstun: 16, blockstun: 11 + d.bs, hitstop: 4, reach: 80, chain: "LP2", cancelStart: 7, cancelEnd: 14 + d.cw }),
    LP2: mk({ id: "LP2", btn: "punch", pose: "cross", startup: 6 + d.su, recovery: 11 + d.rec, damage: 6,         hitstun: 17, blockstun: 11 + d.bs, hitstop: 5, reach: 82, knockback: 5, chain: "LP3", chainOnly: true, cancelStart: 8, cancelEnd: 16 + d.cw }),
    LP3: mk({ id: "LP3", btn: "punch", pose: "hook",  startup: 8 + d.su, active: 4, recovery: 18 + d.rec, damage: 9 + d.dmg, hitstun: 22, blockstun: 13 + d.bs, hitstop: 9, reach: 88, knockback: 9, knockdown: true, chainOnly: true }),
    // standing kick: roundhouse, also a good anti-air
    HK:  mk({ id: "HK",  btn: "kick", pose: "roundhouse", height: 140, startup: 11 + d.su, active: 5, recovery: 20 + d.rec, damage: 12 + d.dmg, hitstun: 22, blockstun: 13 + d.bs, hitstop: 9, reach: 104, knockback: 8, knockdown: true }),
    // crouching
    CP:  mk({ id: "CP",  btn: "punch", pose: "lowpunch", ctx: "crouch", height: 108, startup: 4 + d.su, recovery: 8 + d.rec, damage: 4, hitstun: 14, blockstun: 10 + d.bs, hitstop: 4, reach: 78, knockback: 3 }),
    CK:  mk({ id: "CK",  btn: "kick",  pose: "sweep", ctx: "crouch", level: "low", height: 10, startup: 8 + d.su, active: 4, recovery: 22 + d.rec, damage: 9 + d.dmg, hitstun: 20, blockstun: 12, hitstop: 7, reach: 112, knockback: 6, knockdown: true }),
    // jumping
    JP:  mk({ id: "JP",  btn: "punch", pose: "airpunch", ctx: "air", level: "air", height: 90, startup: 3, active: 12, recovery: 6, damage: 7, hitstun: 18, blockstun: 12, hitstop: 6, reach: 76, knockback: 4 }),
    JK:  mk({ id: "JK",  btn: "kick",  pose: "airkick",  ctx: "air", level: "air", height: 60, startup: 4, active: 14, recovery: 6, damage: 9 + d.dmg, hitstun: 20, blockstun: 13, hitstop: 7, reach: 92, knockback: 5 }),
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
interface Dust { x: number; y: number; t: number; life: number; vx: number; vy: number; r: number }
interface Proj { x: number; y: number; dir: 1 | -1; owner: 0 | 1; speed: number; dmg: number; spin: number; kind: ProjKind; col: string; dead?: boolean }

interface Game {
  f: [Fighter, Fighter]; ctl: [Ctl, Ctl]; cpu: boolean;
  phase: "intro" | "fight" | "roundEnd" | "matchEnd";
  pf: number; timer: number; round: number; wins: [number, number];
  roundWinner: number; msg: string; frame: number;
  sparks: Spark[]; dust: Dust[]; proj: Proj[]; comboShow: [{ n: number; t: number }, { n: number; t: number }];
  hype: number; slow: number; shake: number; sfx: string[];
  camX: number; camY: number; callout: [{ text: string; t: number }, { text: string; t: number }];
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
    comboShow: [{ n: 0, t: 0 }, { n: 0, t: 0 }], hype: 0, slow: 0, shake: 0, sfx: [], dust: [], camX: (W - W / ZOOM) / 2, camY: H - H / ZOOM,
    callout: [{ text: "", t: 0 }, { text: "", t: 0 }],
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
  g.sfx.push(o.blocked ? "block" : o.proj ? "blast" : o.knockdown || o.damage >= 9 ? "hitHeavy" : "hit");

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
    g.sfx.push("ko"); setState(d, "ko"); d.air = true; d.vy = -8; d.vx = o.dir * 5; g.slow = 60; g.shake = 12;
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
  const top = d.y - (d.crouch && !d.air ? 160 : 200);
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
  g.sfx.push("special");
  g.proj.push({ x: f.x + f.facing * 70, y: -140, dir: f.facing, owner: i, speed: 6 + f.def.speed * 0.25, dmg: f.move!.damage, spin: 0, kind: f.def.sig.kind, col: f.def.color });
  g.callout[i] = { text: f.def.sig.name + "!", t: 60 };
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

function kickUpDust(g: Game, x: number, n: number, spread: number) {
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n - 0.5;
    g.dust.push({ x: x + u * spread, y: GROUND - 4, t: 0, life: 20 + ((k * 7) % 11), vx: u * 3, vy: -0.5 - ((k * 3) % 5) * 0.15, r: 7 + ((k * 5) % 6) });
  }
}

function land(g: Game, f: Fighter) {
  f.y = 0; f.vy = 0; f.air = false;
  if (f.state === "jump" || f.state === "attack") { f.vx = 0; f.move = null; setState(f, "idle"); kickUpDust(g, f.x, 3, 50); }
  else if (f.state === "hitstun") { setState(f, "knockdown", 50); kickUpDust(g, f.x, 6, 110); }
  else if (f.state === "knockdown" || f.state === "ko") { g.sfx.push("thud"); f.vx *= 0.4; kickUpDust(g, f.x, 7, 120); }
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
    if (f.y >= 0) land(g, f);
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
    if (m) { const had = f.move; startMove(f, m); if (f.move !== had) g.sfx.push(m.projectile ? "charge" : m.btn === "kick" ? "swingHeavy" : "swing"); }
  }

  if (isFree(f)) {
    if (live) f.facing = o.x >= f.x ? 1 : -1;
    const dir = live ? (c.right ? 1 : 0) - (c.left ? 1 : 0) : 0;
    if (live && c.up) {
      g.sfx.push("jump"); f.air = true; f.vy = -JUMP_V; f.vx = dir * JUMP_X * speedMult(f.def); kickUpDust(g, f.x, 2, 30);
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
  const far = b.x - a.x, maxSep = W / ZOOM - 90;             // the camera can't show them further apart
  if (Math.abs(far) > maxSep) { const e = (Math.abs(far) - maxSep) / 2, s2 = far > 0 ? 1 : -1; a.x += e * s2; b.x -= e * s2; clamp(a); clamp(b); }
  if (Math.abs(a.y - b.y) > 90) return;                     // you can jump over each other
  const dx = b.x - a.x, min = 66;
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
  g.dust.forEach((p) => { p.t++; p.x += p.vx; p.y += p.vy; p.vx *= 0.93; }); g.dust = g.dust.filter((p) => p.t < p.life);
  g.comboShow.forEach((c) => { if (c.t > 0) c.t--; });
  g.callout.forEach((c) => { if (c.t > 0) c.t--; });
  g.f.forEach((f) => { f.lag = Math.max(f.hp, f.lag - 0.4); });
  g.hype = Math.max(0, g.hype - 0.4);
  if (g.shake > 0) g.shake--;

  switch (g.phase) {
    case "intro":
      g.pf++;
      if (g.pf === 1) g.sfx.push("round"); if (g.pf === 70) g.sfx.push("fight");
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
/*  3D — stage, fighters, effects                                      */
/* ================================================================== */

const PIX = "'Russo One', Impact, sans-serif";
const INK = "#140c08";
const U = 0.009;                                      // one game unit in metres (fighters ≈ 200 units ≈ 1.8 m)
const X3 = (x: number) => (x - W / 2) * U;
const Y3 = (y: number) => -y * U;

/* ---------- model loading (cached, shared between screens) ---------- */

interface Asset { scene: THREE.Group; clips: THREE.AnimationClip[] }
const assetCache = new Map<string, Promise<Asset>>();

function createFallbackFighter(id: string): Asset {
  const def = ROSTER.find((fighter) => fighter.id === id) ?? ROSTER[0];
  const group = new THREE.Group();
  const outfit = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.72 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x171315, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x8a5a3c, roughness: 0.82 });
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, y: number, x = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 0);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };
  add(new THREE.CapsuleGeometry(28, 62, 5, 10), outfit, 105);
  add(new THREE.SphereGeometry(24, 16, 12), skin, 176);
  add(new THREE.CapsuleGeometry(10, 64, 4, 8), skin, 112, -42).rotation.z = -0.12;
  add(new THREE.CapsuleGeometry(10, 64, 4, 8), skin, 112, 42).rotation.z = 0.12;
  add(new THREE.CapsuleGeometry(12, 72, 4, 8), dark, 38, -19).rotation.z = 0.04;
  add(new THREE.CapsuleGeometry(12, 72, 4, 8), dark, 38, 19).rotation.z = -0.04;
  return { scene: group, clips: [] };
}

function loadFighter(id: string): Promise<Asset> {
  let p = assetCache.get(id);
  if (!p) {
    const url = FIGHTER_URLS[id];
    p = new GLTFLoader().loadAsync(url ?? `${MODEL_BASE}${id}.glb`).then((g) => ({ scene: g.scene as THREE.Group, clips: g.animations }));
    p = p.catch((error) => {
      console.warn(`PMG Fight could not load fighter model: ${id}`, error);
      return createFallbackFighter(id);
    });
    assetCache.set(id, p);
  }
  return p;
}

/* ---------- canvas textures for the set ---------- */

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

const asphaltTex = () => canvasTex(512, 512, (c) => {
  const r = rng(3);
  c.fillStyle = "#26211e"; c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { const v = 25 + r() * 40; c.fillStyle = `rgb(${v},${v - 3},${v - 6})`; c.fillRect(r() * 512, r() * 512, 2, 2); }
  c.strokeStyle = "rgba(10,8,6,0.8)"; c.lineWidth = 2;
  for (let i = 0; i < 6; i++) { c.beginPath(); let x = r() * 512, y = r() * 512; c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 80; y += (r() - 0.5) * 80; c.lineTo(x, y); } c.stroke(); }
  for (let i = 0; i < 5; i++) { c.fillStyle = "rgba(0,0,0,0.25)"; c.beginPath(); c.ellipse(r() * 512, r() * 512, 30 + r() * 60, 12 + r() * 30, r() * 3, 0, Math.PI * 2); c.fill(); }
}, [6, 3]);

let logoImg: HTMLImageElement | null = null;
let logoJob: Promise<HTMLImageElement | null> | null = null;
function getLogo(): Promise<HTMLImageElement | null> {
  if (!logoJob) logoJob = new Promise((res) => {
    const im = new Image();
    im.onload = () => { logoImg = im; res(im); };
    im.onerror = () => res(null);
    im.src = LOGO_URL;
  });
  return logoJob;
}

// The wall is 26 m × 4.4 m, so the texture keeps that exact shape — nothing painted on it gets stretched.
const WALL_W = 26, WALL_H = 4.4, PXM = 118;                 // pixels per metre
const brickTex = () => canvasTex(Math.round(WALL_W * PXM), Math.round(WALL_H * PXM), (c) => {
  const r = rng(9), TW = Math.round(WALL_W * PXM), TH = Math.round(WALL_H * PXM);
  const bw = Math.round(0.3 * PXM), bh = Math.round(0.1 * PXM);
  c.fillStyle = "#2a1712"; c.fillRect(0, 0, TW, TH);
  for (let y = 0, row = 0; y < TH; y += bh, row++) for (let x = row % 2 ? -bw / 2 : 0; x < TW; x += bw) {
    const v = 0.75 + r() * 0.35; c.fillStyle = `rgb(${Math.round(92 * v)},${Math.round(44 * v)},${Math.round(32 * v)})`;
    c.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
  }
  // graffiti: the PMG logo at its true proportions, centred on the arena
  const cx = TW / 2, cy = (WALL_H - 2.15) * PXM;
  if (logoImg?.complete && logoImg.naturalWidth) {
    const lh = 1.9 * PXM, lw = lh * logoImg.naturalWidth / logoImg.naturalHeight;
    c.save(); c.translate(cx, cy); c.rotate(-0.04); c.globalAlpha = 0.95; c.drawImage(logoImg, -lw / 2, -lh / 2, lw, lh); c.restore();
  } else {
    c.save(); c.translate(cx, cy); c.rotate(-0.04);
    c.font = `bold ${Math.round(1.2 * PXM)}px Impact, 'Arial Black', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = 16; c.strokeStyle = "#0b0b0d"; c.strokeText("PMG", 0, 0); c.fillStyle = "#f4f2ee"; c.fillText("PMG", 0, 0);
    c.restore();
  }
  c.font = `bold ${Math.round(0.34 * PXM)}px Impact, sans-serif`; c.fillStyle = "rgba(58,160,255,0.55)"; c.fillText("NYC", cx + 4.2 * PXM, 0.9 * PXM);
  c.fillStyle = "rgba(255,176,0,0.55)"; c.fillText("PMG 4 LIFE", cx - 5.6 * PXM, 3.3 * PXM);
  const gr = c.createLinearGradient(0, TH * 0.78, 0, TH); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.45)");
  c.fillStyle = gr; c.fillRect(0, 0, TW, TH);                                        // grime at the base
});

const fenceTex = () => canvasTex(256, 256, (c) => {
  c.clearRect(0, 0, 256, 256);
  c.strokeStyle = "#b8b0a4"; c.lineWidth = 3;
  for (let k = -256; k < 512; k += 32) {
    c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 256, 256); c.stroke();
    c.beginPath(); c.moveTo(k, 256); c.lineTo(k + 256, 0); c.stroke();
  }
}, [14, 3]);

const skylineTex = () => canvasTex(2048, 512, (c) => {
  const r = rng(21);
  const g = c.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, "#07060b"); g.addColorStop(0.6, "#2a1410"); g.addColorStop(1, "#7a3414");
  c.fillStyle = g; c.fillRect(0, 0, 2048, 512);
  c.fillStyle = "#efe3c8"; c.beginPath(); c.arc(1500, 90, 38, 0, Math.PI * 2); c.fill();
  let x = 0;
  while (x < 2048) {
    const w = 60 + r() * 120, h = 140 + r() * 300;
    c.fillStyle = "#120b09"; c.fillRect(x, 512 - h, w, h);
    for (let yy = 512 - h + 10; yy < 500; yy += 16) for (let xx = x + 6; xx < x + w - 8; xx += 12) if (r() < 0.28) { c.fillStyle = r() < 0.8 ? "#ffb347" : "#fff1c0"; c.fillRect(xx, yy, 5, 8); }
    x += w + 4;
  }
  // a stepped tower on the skyline
  c.fillStyle = "#0d0807"; c.fillRect(620, 150, 90, 362); c.fillRect(640, 90, 50, 60); c.fillRect(655, 40, 20, 50); c.fillRect(663, 0, 4, 40);
});

const glowTex = (inner: string, outer: string) => canvasTex(128, 128, (c) => {
  const g = c.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, inner); g.addColorStop(0.35, outer); g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
});

const starTex = () => canvasTex(128, 128, (c) => {
  c.translate(64, 64); c.fillStyle = "#ffffff"; c.beginPath();
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, rr = k % 2 ? 22 : 62; if (k) c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  c.closePath(); c.fill();
});

function personTex(seed: number) {
  const r = rng(seed * 31 + 7);
  return canvasTex(128, 256, (c) => {
    const body = ["#221c1a", "#2e2420", "#1c2230", "#3a2418", "#2a2a26", "#4a1a14"][Math.floor(r() * 6)];
    const skin = ["#5a3624", "#7a4c32", "#9a6a48", "#3e2618"][Math.floor(r() * 4)];
    c.fillStyle = body; c.beginPath(); c.ellipse(64, 150, 38, 60, 0, 0, Math.PI * 2); c.fill(); c.fillRect(30, 150, 68, 106);
    c.fillStyle = skin; c.beginPath(); c.arc(64, 70, 24, 0, Math.PI * 2); c.fill();
    if (r() < 0.5) { c.fillStyle = "#0e0e10"; c.fillRect(38, 44, 52, 16); if (r() < 0.6) c.fillRect(64, 54, 36, 6); }
    c.fillStyle = "rgba(255,138,58,0.35)"; c.fillRect(88, 110, 8, 140);
  });
}

/* ---------- the stage: a fenced lot on a New York block at night ---------- */

/* ---------- locations ---------- */

type LocationId = "streets" | "subway";
const LOCATIONS: { id: LocationId; name: string; blurb: string }[] = [
  { id: "streets", name: "The Streets", blurb: "A fenced lot on the block — dumpsters, the crew, the PMG wall" },
  { id: "subway", name: "Subway Station", blurb: "34th Street platform after the last train" },
];

interface RatInst {
  obj: THREE.Object3D; mixer: THREE.AnimationMixer; action: THREE.AnimationAction | null;
  lanes: [number, number, number][][]; path: [number, number, number][]; seg: number; along: number;
  wait: number; pause: number; pauseAt: number; speed: number;
}

interface Stage {
  scene: THREE.Scene; crowd: THREE.Mesh[]; flames: { spr: THREE.Sprite[]; light: THREE.PointLight }[];
  flicker: THREE.Light[]; rats: RatInst[]; ready: Promise<void>;
}

const propCache = new Map<string, Promise<GLTFResult | null>>();
interface GLTFResult { scene: THREE.Object3D; animations: THREE.AnimationClip[] }
function loadGLB(name: string): Promise<GLTFResult | null> {
  let p = propCache.get(name);
  if (!p) {
    const url = PROP_URLS[name] ?? `${MODEL_BASE}${name}.glb`;
    p = new GLTFLoader().loadAsync(url).then((g) => {
      g.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      return { scene: g.scene as THREE.Object3D, animations: g.animations };
    }).catch(() => null);
    propCache.set(name, p);
  }
  return p;
}
function loadProp(name: string): Promise<THREE.Object3D | null> {
  return loadGLB(name).then((g) => (g ? g.scene.clone(true) : null));
}

function normalizeObject(obj: THREE.Object3D, targetSize: number, axis: "x" | "y" = "y") {
  obj.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const sourceSize = axis === "x" ? size.x : size.y;
  if (sourceSize > 0) obj.scale.multiplyScalar(targetSize / sourceSize);
  obj.updateWorldMatrix(true, true);
  const scaled = new THREE.Box3().setFromObject(obj);
  const center = scaled.getCenter(new THREE.Vector3());
  obj.position.x -= center.x;
  obj.position.z -= center.z;
  obj.position.y -= scaled.min.y;
}

/** Rats: small, hidden most of the time, now and then they scurry along a lane in the background. */
function addRats(scene: THREE.Scene, rats: RatInst[], count: number, lanes: [number, number, number][][]): Promise<void> {
  return loadGLB("rat").then((g) => {
    if (!g) return;
    for (let k = 0; k < count; k++) {
      const obj = SkeletonUtils.clone(g.scene);
      obj.rotation.order = "YXZ"; obj.visible = false;
      obj.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.frustumCulled = false; m.castShadow = true; } });
      const mixer = new THREE.AnimationMixer(obj);
      const action = g.animations[0] ? mixer.clipAction(g.animations[0]) : null;
      action?.play();
      scene.add(obj);
      rats.push({ obj, mixer, action, lanes, path: [], seg: 0, along: 0, wait: 2 + k * 3 + Math.random() * 4, pause: 0, pauseAt: -1, speed: 2 });
    }
  });
}

function updateRats(rats: RatInst[], dt: number, t: number) {
  for (const r of rats) {
    if (r.wait > 0) {                                                    // hiding
      r.wait -= dt;
      if (r.wait <= 0) {
        const lane = r.lanes[Math.floor(Math.random() * r.lanes.length)];
        r.path = Math.random() < 0.5 ? lane.slice() : lane.slice().reverse();
        r.seg = 0; r.along = 0; r.speed = 1.7 + Math.random() * 1.1;
        r.pauseAt = Math.random() < 0.45 ? 0.3 + Math.random() * 0.4 : -1;     // sometimes stops to sniff
        r.obj.visible = true;
      }
      continue;
    }
    const V3 = (q: [number, number, number]) => new THREE.Vector3(q[0], q[1], q[2]);
    const lens = r.path.slice(1).map((q, i) => V3(r.path[i]).distanceTo(V3(q)) || 0.001);
    const total = lens.reduce((x, y) => x + y, 0);
    if (r.pause > 0) { r.pause -= dt; if (r.action) r.action.timeScale = 1; }
    else {
      const done = lens.slice(0, r.seg).reduce((x, y) => x + y, 0);
      if (r.pauseAt >= 0 && (done + r.along) / total >= r.pauseAt) { r.pause = 0.5 + Math.random() * 0.9; r.pauseAt = -1; }
      r.along += r.speed * dt;
      if (r.action) r.action.timeScale = 3.5;
    }
    while (r.seg < lens.length && r.along >= lens[r.seg]) { r.along -= lens[r.seg]; r.seg++; }
    if (r.seg >= lens.length) { r.obj.visible = false; r.wait = 3 + Math.random() * 7; continue; }
    const a = V3(r.path[r.seg]), b = V3(r.path[r.seg + 1]);
    const p = a.clone().lerp(b, r.along / lens[r.seg]), d = b.clone().sub(a);
    const run = r.pause > 0 ? 0 : 1;
    r.obj.position.set(p.x, p.y + Math.abs(Math.sin(t * 38)) * 0.012 * run, p.z);
    const flat = Math.hypot(d.x, d.z);
    r.obj.rotation.set(-Math.atan2(d.y, flat), Math.atan2(d.x, d.z), Math.sin(t * 30) * 0.06 * run);
    r.mixer.update(dt);
  }
}

function carEnv(renderer: THREE.WebGLRenderer | undefined, obj: THREE.Object3D) {
  if (!renderer) return;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
  obj.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (m && "envMap" in m) { m.envMap = env; m.envMapIntensity = 0.2; m.needsUpdate = true; } });
}

function buildStage(renderer?: THREE.WebGLRenderer, loc: LocationId = "streets"): Stage {
  return loc === "subway" ? buildSubway(renderer) : buildStreets(renderer);
}

/* ---------- THE STREETS: a fenced lot on a New York block at night ---------- */

function buildStreets(renderer?: THREE.WebGLRenderer): Stage {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0706);
  scene.fog = new THREE.Fog(0x120a07, 9, 30);
  const jobs: Promise<unknown>[] = [];

  // ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshStandardMaterial({ map: asphaltTex(), roughness: 0.92 }));
  ground.rotation.x = -Math.PI / 2; ground.position.z = -3; ground.receiveShadow = true; scene.add(ground);
  const paint = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 0.08), new THREE.MeshBasicMaterial({ color: 0xd8c9a8 }));
  paint.rotation.x = -Math.PI / 2; paint.position.set(0, 0.005, 1.4); scene.add(paint);

  // skyline far away, brick wall, fence
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(64, 16), new THREE.MeshBasicMaterial({ map: skylineTex(), fog: false }));
  sky.position.set(0, 7, -22); scene.add(sky);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(WALL_W, WALL_H), new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 0.95 }));
  wall.position.set(0, 2.2, -6.2); wall.receiveShadow = true; scene.add(wall);
  const fenceMat = new THREE.MeshStandardMaterial({ map: fenceTex(), alphaTest: 0.45, transparent: false, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.6 });
  const fence = new THREE.Mesh(new THREE.PlaneGeometry(18, 3.4), fenceMat); fence.position.set(0, 1.7, -2.4); scene.add(fence);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x6d655c, metalness: 0.6, roughness: 0.5 });
  for (let x = -9; x <= 9; x += 3) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.5, 8), postMat); p.position.set(x, 1.75, -2.4); p.castShadow = true; scene.add(p); }
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 18, 8), postMat); rail.rotation.z = Math.PI / 2; rail.position.set(0, 3.42, -2.4); scene.add(rail);

  // crowd behind the fence
  const crowd: THREE.Mesh[] = [];
  const r = rng(5);
  for (let k = 0; k < 26; k++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.5), new THREE.MeshStandardMaterial({ map: personTex(k), transparent: true, alphaTest: 0.3, roughness: 1 }));
    m.position.set(-9 + k * 0.7 + (r() - 0.5) * 0.3, 0.8 + r() * 0.12, -3.2 - r() * 1.6);
    m.userData.ph = r() * 6; crowd.push(m); scene.add(m);
  }

  // dumpsters either side; the warm flicker is from fires just out of shot
  const flames: Stage["flames"] = [];
  for (const [bx, ry] of [[-4.7, 0.3], [4.7, -0.3]] as [number, number][]) {
    jobs.push(loadProp("dumpster").then((d) => { if (!d) return; normalizeObject(d, 1.35); d.position.set(bx, 0, -1.45); d.rotation.y = ry; scene.add(d); }));
    const light = new THREE.PointLight(0xff7a2a, 12, 10, 1.6); light.position.set(bx * 1.35, 1.2, -0.6); scene.add(light);
    flames.push({ spr: [], light });
  }

  // the Benz parked behind the cage, nose toward the PMG wall; the Propmyganda billboard
  jobs.push(loadProp("car").then((car) => { if (!car) return;
    normalizeObject(car, 4.5, "x");
    car.position.set(-3.6, 0, -4.3); car.rotation.y = Math.PI / 2; carEnv(renderer, car); scene.add(car);
  }));
  jobs.push(loadProp("billboard").then((bb) => { if (!bb) return;
    normalizeObject(bb, 3.6); bb.position.set(4.8, 0, -5.4); bb.rotation.y = -Math.PI / 2; scene.add(bb);
  }));
  jobs.push(new THREE.TextureLoader().loadAsync(WORDMARK_URL).then((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    const backing = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 1.15),
      new THREE.MeshBasicMaterial({ color: 0xf4f2ee }),
    );
    backing.position.set(4.35, 2.55, -5.72);
    scene.add(backing);
    const mark = new THREE.Mesh(
      new THREE.PlaneGeometry(3.45, 0.9),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
    );
    mark.position.set(4.35, 2.55, -5.7);
    scene.add(mark);
  }).catch(() => {}));

  // rats along the base of the fence and between the dumpsters
  const rats: RatInst[] = [];
  jobs.push(addRats(scene, rats, 3, [
    [[-6.8, 0, -1.95], [6.8, 0, -2.05]],
    [[-4.7, 0, -2.1], [-1.2, 0, -1.9], [1.5, 0, -2.2], [4.7, 0, -2.0]],
    [[-6.8, 0, -2.25], [-2.5, 0, -2.25], [-2.2, 0, -1.7], [6.8, 0, -1.8]],
  ]));

  // lighting: dim night fill, a hard street-lamp key that casts shadows, cool moon rim
  scene.add(new THREE.HemisphereLight(0x6a78a8, 0x2a1a12, 0.55));
  const key = new THREE.SpotLight(0xffe2b8, 90, 22, 0.75, 0.5, 1.4);
  key.position.set(0.5, 8, 5); key.target.position.set(0, 0.8, 0); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; scene.add(key); scene.add(key.target);
  const moon = new THREE.DirectionalLight(0x7f96ff, 0.9); moon.position.set(-4, 5, -6); scene.add(moon);

  return { scene, crowd, flames, flicker: [], rats, ready: Promise.all(jobs).then(() => {}) };
}

/* ---------- SUBWAY STATION: a tiled platform after the last train ---------- */

function buildSubway(renderer?: THREE.WebGLRenderer): Stage {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080a);
  scene.fog = new THREE.Fog(0x0a0b0d, 10, 26);
  const rats: RatInst[] = [];
  const flicker: THREE.Light[] = [];
  const WALL_Z = -3.3;

  const ready = loadProp("subway").then(async (st) => {
    if (!st) return;
    normalizeObject(st, 20, "x");
    // the model's back wall runs along its x = -3.6 side: turn it to face the camera, centre it
    st.rotation.y = -Math.PI / 2; scene.add(st); st.updateMatrixWorld(true);
    let wallBox: THREE.Box3 | null = null;
    st.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && /wall/i.test((m.material as THREE.Material).name)) wallBox = new THREE.Box3().setFromObject(m); });
    const wb = (wallBox as THREE.Box3 | null) ?? new THREE.Box3().setFromObject(st);
    const c = wb.getCenter(new THREE.Vector3());
    st.position.x -= c.x; st.position.z += WALL_Z - wb.max.z; st.updateMatrixWorld(true);

    // the 34th Street sign, brought down from high on the wall to where the camera can see it
    new THREE.TextureLoader().loadAsync(`${MODEL_BASE}sign-34th.jpg`).then((tx) => {
      tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
      const w = 2.8, h = w * tx.image.height / tx.image.width;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.6 }));
      sign.position.set(0.6, 2.27, WALL_Z + 0.015); scene.add(sign);
    }).catch(() => {});

    // bench against the wall, left of centre; rats climb up onto it
    const bench = await loadProp("bench");
    let seatY = 0.45, bx = -2.4;
    const bz = WALL_Z + 0.42;
    if (bench) {
      normalizeObject(bench, 1.05);
      bench.position.set(bx, 0, bz); scene.add(bench); bench.updateMatrixWorld(true);
      const ray = new THREE.Raycaster(new THREE.Vector3(bx + 0.3, 3, bz + 0.12), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObject(bench, true)[0];
      if (hit && hit.point.y > 0.2 && hit.point.y < 0.8) seatY = hit.point.y + 0.01;
    }
    const sz = bz + 0.1;
    await addRats(scene, rats, 3, [
      [[-7.2, 0, WALL_Z + 0.12], [7.2, 0, WALL_Z + 0.15]],
      [[bx - 2.6, 0, bz + 0.45], [bx - 1.35, 0, bz + 0.3], [bx - 1.3, seatY, sz], [bx + 1.3, seatY, sz], [bx + 1.35, 0, bz + 0.3], [bx + 3.2, 0, WALL_Z + 0.15]],
      [[bx - 1.3, seatY, sz], [bx + 0.2, seatY, sz + 0.05], [bx + 1.3, seatY, sz], [bx + 1.36, 0, bz + 0.35], [7.2, 0, WALL_Z + 0.4]],
      [[-7.2, 0, -1.4], [7.2, 0, -1.6]],
    ]);
  });

  // under the platform edge toward the camera: the track pit
  const pit = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), new THREE.MeshStandardMaterial({ color: 0x0b0a09, roughness: 1 }));
  pit.rotation.x = -Math.PI / 2; pit.position.set(0, -1.3, 9); scene.add(pit);

  // cold fluorescent light from above, one tube flickering
  scene.add(new THREE.HemisphereLight(0x9fb4d0, 0x1a1712, 0.6));
  const key = new THREE.SpotLight(0xe8f0ff, 110, 20, 0.8, 0.55, 1.3);
  key.position.set(0, 7.5, 3.5); key.target.position.set(0, 0.6, -0.5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; scene.add(key); scene.add(key.target);
  for (const x of [-4.5, 0, 4.5]) {
    const l = new THREE.PointLight(0xd9e6ff, 5, 9, 1.6); l.position.set(x, 4.2, WALL_Z + 1.2); scene.add(l);
    if (x === 4.5) flicker.push(l);
  }
  const warm = new THREE.PointLight(0xffb070, 3, 8, 1.8); warm.position.set(-5.5, 1.6, 1.5); scene.add(warm);

  return { scene, crowd: [], flames: [], flicker, rats, ready };
}

/* ---------- a fighter in the scene ---------- */

interface Rig3 {
  root: THREE.Group; model: THREE.Object3D; mixer: THREE.AnimationMixer;
  bones: Record<string, THREE.Bone | undefined>; glow: THREE.Sprite;
}

const BONE_NAMES = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "LeftArm", "LeftForeArm", "LeftHand", "RightArm", "RightForeArm", "RightHand",
  "LeftUpLeg", "LeftLeg", "LeftFoot", "RightUpLeg", "RightLeg", "RightFoot"];

/**
 * Fighters are sized from their skeleton (foot bone -> head bone), not their mesh bounds.
 * Skinned meshes report bind-pose geometry bounds, which vary wildly between exports
 * (KatBot's tail/mask meshes made him read far smaller than he is, so he scaled up huge).
 */
const FIGHTER_HEAD_SPAN = 1.44;   // metres from foot to head bone => ~1.8 m total height
function normalizeFighter(model: THREE.Object3D) {
  model.updateWorldMatrix(true, true);
  let head: number | null = null, foot: number | null = null, hips: THREE.Vector3 | null = null;
  const p = new THREE.Vector3();
  model.traverse((o) => {
    if (!(o as THREE.Bone).isBone) return;
    const n = o.name.replace(/^mixamorig\d*:?/, "");
    o.getWorldPosition(p);
    if (n === "Head") head = head === null ? p.y : Math.max(head, p.y);
    if (n === "LeftFoot" || n === "RightFoot" || n === "LeftToeBase" || n === "RightToeBase") foot = foot === null ? p.y : Math.min(foot, p.y);
    if (n === "Hips") hips = p.clone();
  });
  if (head === null || foot === null || head - foot <= 0) { normalizeObject(model, 1.8); return; }
  const k = FIGHTER_HEAD_SPAN / (head - foot);
  model.scale.multiplyScalar(k);
  model.updateWorldMatrix(true, true);
  // feet on the floor, body centred over the origin
  model.position.y -= foot * k;
  if (hips) { model.position.x -= hips.x * k; model.position.z -= hips.z * k; }
}

function makeRig(asset: Asset, color: string): Rig3 {
  const model = SkeletonUtils.clone(asset.scene);
  normalizeFighter(model);
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; }
  });
  const bones: Rig3["bones"] = {};
  model.traverse((o) => { if ((o as THREE.Bone).isBone) { const n = o.name.replace(/^mixamorig\d*:?/, ""); if (BONE_NAMES.includes(n)) bones[n] = o as THREE.Bone; } });
  const root = new THREE.Group(); root.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const idle = asset.clips.find((c) => c.duration > 0);
  if (idle) mixer.clipAction(idle).play();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("rgba(255,255,255,1)", color), blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.visible = false; root.add(glow);
  return { root, model, mixer, bones, glow };
}

// pose helpers: point a bone at a direction in world space, blended by weight
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
const _q = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _id = new THREE.Quaternion();
function aim(bone: THREE.Bone | undefined, child: THREE.Bone | undefined, dir: THREE.Vector3, w: number) {
  if (!bone || !child || w <= 0 || !bone.parent) return;
  bone.updateWorldMatrix(true, false); child.updateWorldMatrix(false, false);
  bone.getWorldPosition(_a); child.getWorldPosition(_b);
  _b.sub(_a).normalize(); _d.copy(dir).normalize();
  _q.setFromUnitVectors(_b, _d); if (w < 1) _q.slerp(_id, 1 - w);
  bone.getWorldQuaternion(_wq); _wq.premultiply(_q);
  bone.parent.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(_wq));
}
function turn(bone: THREE.Bone | undefined, axis: THREE.Vector3, angle: number) {
  if (!bone || !bone.parent || !angle) return;
  bone.updateWorldMatrix(true, false);
  _q.setFromAxisAngle(axis, angle);
  bone.getWorldQuaternion(_wq); _wq.premultiply(_q);
  bone.parent.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(_wq));
}
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0), Z = V(0, 0, 1);

/** Put the fighter where the game says, then layer the move on top of the idle animation. */
function poseRig(rg: Rig3, f: Fighter, dt: number, t: number) {
  const s = f.facing, fwd = V(s, 0, 0), B = rg.bones;
  rg.mixer.update(dt);
  rg.root.position.set(X3(f.x), Y3(f.y), 0);
  rg.model.rotation.set(0, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
  rg.model.position.set(0, 0, 0);
  rg.glow.visible = false;
  const side = V(0, 0, s);                                       // axis to lean back / forward around
  const st = f.state;

  // falling, lying down, getting up
  const downAmt = st === "knockdown" || st === "ko" ? (f.air ? 0.6 : Math.min(1, 0.4 + f.sf / 10)) : st === "wakeup" ? Math.max(0, 1 - f.sf / 16) : 0;
  if (downAmt > 0) {
    rg.root.rotation.z = s * downAmt * (Math.PI / 2) * 0.98;
    rg.root.position.x -= s * downAmt * 0.25;
    return;
  }
  rg.root.rotation.z = 0;

  // forward jumps somersault
  if (f.air && st === "jump" && Math.abs(f.vx) > 0.5) {
    const q = Math.min(1, Math.max(0, (f.vy + JUMP_V) / (2 * JUMP_V)));
    const k = q < 0.18 ? 0 : q > 0.82 ? 1 : (q - 0.18) / 0.64;
    rg.root.rotation.z = -Math.sign(f.vx) * k * Math.PI * 2;
  }

  const crouched = !f.air && ((f.crouch && (st === "crouch" || st === "block" || st === "blockstun")) || (st === "attack" && f.move?.ctx === "crouch"));
  if (crouched) {
    rg.model.position.y = -0.34;
    aim(B.RightUpLeg, B.RightLeg, V(s * 0.85, -0.5, 0.1), 1); aim(B.RightLeg, B.RightFoot, V(-s * 0.15, -1, 0), 1);
    aim(B.LeftUpLeg, B.LeftLeg, V(s * 0.55, -0.8, -0.1), 1); aim(B.LeftLeg, B.LeftFoot, V(-s * 0.5, -1, 0), 1);
    turn(B.Spine, side, -s * 0.25);
  }
  if (f.air && st !== "attack") {                                  // tuck
    aim(B.RightUpLeg, B.RightLeg, V(s * 0.8, 0.3, 0.1), 0.9); aim(B.RightLeg, B.RightFoot, V(-s * 0.3, -1, 0), 0.9);
    aim(B.LeftUpLeg, B.LeftLeg, V(s * 0.6, 0.1, -0.1), 0.9); aim(B.LeftLeg, B.LeftFoot, V(-s * 0.4, -1, 0), 0.9);
  }
  if (st === "walk") {
    const ph = t * 9, w = Math.sin(ph);
    aim(B.RightUpLeg, B.RightLeg, V(s * w * 0.45, -1, 0.1), 0.6); aim(B.LeftUpLeg, B.LeftLeg, V(-s * w * 0.45, -1, -0.1), 0.6);
    rg.model.position.y = -Math.abs(Math.cos(ph)) * 0.03;
  }
  if (st === "block" || st === "blockstun") {                     // forearms up in front of the face
    aim(B.RightArm, B.RightForeArm, V(s * 0.45, -0.8, 0.25), 1); aim(B.RightForeArm, B.RightHand, V(s * 0.25, 1, 0.05), 1);
    aim(B.LeftArm, B.LeftForeArm, V(s * 0.45, -0.8, -0.25), 1); aim(B.LeftForeArm, B.LeftHand, V(s * 0.25, 1, -0.05), 1);
    turn(B.Spine1, side, -s * 0.15);
  }
  if (st === "hitstun") {                                          // head and chest snap back
    const k = Math.max(0, 1 - f.sf / Math.max(1, f.dur));
    turn(B.Spine, side, s * 0.5 * k); turn(B.Spine2, side, s * 0.2 * k); turn(B.Neck, side, s * 0.45 * k);
    rg.model.position.x = -s * 0.08 * k;
  }
  if (st === "win") {
    aim(B.RightArm, B.RightForeArm, V(s * 0.2, 1, 0.2), 1); aim(B.RightForeArm, B.RightHand, V(0, 1, 0), 1);
  }

  if (st === "attack" && f.move) {
    const m = f.move, k = moveProgress(f), reach = Math.min(1, k);
    const punch = (side2: "Right" | "Left", dir: THREE.Vector3) => {
      aim(B[`${side2}Arm`], B[`${side2}ForeArm`], dir, reach); aim(B[`${side2}ForeArm`], B[`${side2}Hand`], dir, reach);
      turn(B.Spine1, UP, (side2 === "Right" ? 1 : -1) * 0.35 * reach);
    };
    switch (m.pose) {
      case "jab": punch("Right", V(s, 0.12, 0.08)); break;
      case "cross": punch("Left", V(s, 0.1, -0.08)); break;
      case "hook": punch("Right", V(s, 0.35, 0.5 - reach * 0.5)); turn(B.Spine, side, -s * 0.1 * reach); break;
      case "lowpunch": punch("Right", V(s, -0.25, 0.05)); break;
      case "airpunch": punch("Right", V(s, -0.6, 0.05)); break;
      case "roundhouse":
        aim(B.RightUpLeg, B.RightLeg, V(s, 0.25 + 0.5 * reach, 0.1), reach); aim(B.RightLeg, B.RightFoot, V(s, 0.35 * reach, 0.1), reach);
        turn(B.Spine, side, s * 0.35 * reach); break;
      case "sweep":
        aim(B.RightUpLeg, B.RightLeg, V(s, -0.18, 0.25), reach); aim(B.RightLeg, B.RightFoot, V(s, -0.25, 0.3), reach); break;
      case "airkick":
        aim(B.RightUpLeg, B.RightLeg, V(s, -0.35, 0.1), 1); aim(B.RightLeg, B.RightFoot, V(s, -0.5, 0.1), 1); break;
      case "fireball": {
        const d2 = V(s, 0.05, 0);
        aim(B.RightArm, B.RightForeArm, d2, reach); aim(B.RightForeArm, B.RightHand, d2, reach);
        aim(B.LeftArm, B.LeftForeArm, d2, reach); aim(B.LeftForeArm, B.LeftHand, d2, reach);
        if (f.sf - 1 < m.startup && k > 0.2) {
          B.RightHand?.getWorldPosition(_a); rg.root.worldToLocal(_a);
          rg.glow.position.copy(_a).add(V(s * 0.15, 0, 0)); rg.glow.scale.setScalar(0.45 + Math.sin(t * 30) * 0.06); rg.glow.visible = true;
        }
        break;
      }
    }
  }
}

/* ---------- effects: hit sparks, dust, special moves ---------- */

function projTexCanvas() { const cv = document.createElement("canvas"); cv.width = 200; cv.height = 120; return cv; }

interface FxSet {
  sparks: THREE.Sprite[]; dust: THREE.Sprite[]; proj: { spr: THREE.Sprite; cv: HTMLCanvasElement; tex: THREE.CanvasTexture }[];
}

function makeFx(scene: THREE.Scene): FxSet {
  const star = starTex(), puff = glowTex("rgba(200,180,150,0.9)", "rgba(120,100,80,0.5)");
  const sparks = Array.from({ length: 6 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: star, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false })); s.visible = false; s.renderOrder = 10; scene.add(s); return s; });
  const dust = Array.from({ length: 24 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, transparent: true, depthWrite: false })); s.visible = false; scene.add(s); return s; });
  const proj = Array.from({ length: 2 }, () => {
    const cv = projTexCanvas(), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); spr.visible = false; spr.renderOrder = 9; scene.add(spr);
    return { spr, cv, tex };
  });
  return { sparks, dust, proj };
}

function updateFx(fx: FxSet, g: Game) {
  fx.sparks.forEach((s, i) => {
    const sp = g.sparks[i]; s.visible = !!sp; if (!sp) return;
    const u = 1 - sp.t / 14;
    s.position.set(X3(sp.x), (GROUND - sp.y) * U, 0.45);
    s.scale.setScalar(0.25 + u * 0.55);
    (s.material as THREE.SpriteMaterial).color.set(sp.blocked ? 0x9fd0ff : 0xffd23f);
    (s.material as THREE.SpriteMaterial).opacity = 1 - u * 0.6;
  });
  fx.dust.forEach((s, i) => {
    const p = g.dust[i]; s.visible = !!p; if (!p) return;
    const u = p.t / p.life;
    s.position.set(X3(p.x), (GROUND - p.y) * U + 0.05, 0.25);
    s.scale.setScalar((p.r * (0.9 + u * 1.4)) * U * 3);
    (s.material as THREE.SpriteMaterial).opacity = 0.85 * (1 - u);
  });
  fx.proj.forEach((pp, i) => {
    const p = g.proj[i]; pp.spr.visible = !!p; if (!p) return;
    const c = pp.cv.getContext("2d")!;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, pp.cv.width, pp.cv.height);
    c.translate(p.dir > 0 ? 130 : 70, 60);
    drawProjectile(c, { ...p, x: 0, y: -GROUND }, g.frame);
    pp.tex.needsUpdate = true;
    pp.spr.position.set(X3(p.x) - p.dir * 0.27, -p.y * U, 0.3);
    pp.spr.scale.set(200 * U * 1.3, 120 * U * 1.3, 1);
  });
}

function updateStage(st: Stage, g: Game | null, t: number, dt = 1 / 60) {
  const hype = g ? g.hype : 0;
  st.crowd.forEach((m) => { m.position.y = 0.8 + Math.abs(Math.sin(t * (3 + hype / 25) + m.userData.ph)) * (0.03 + hype / 900); });
  st.flames.forEach((fl, i) => {
    fl.spr.forEach((s, k) => {
      const f = Math.sin(t * (9 + k * 1.7) + k * 2 + i) * 0.5 + 0.5;
      s.scale.set(0.35 + f * 0.2, 0.55 + f * 0.45, 1); s.position.y = 1.05 + f * 0.18;
    });
    fl.light.intensity = 10 + Math.sin(t * 13 + i) * 2.5 + Math.sin(t * 29) * 1.5;
  });
  st.flicker.forEach((l) => { const f = Math.sin(t * 2.3) + Math.sin(t * 7.1); l.intensity = f > 1.55 ? (Math.sin(t * 90) > 0 ? 0.6 : 5) : 5; });
  updateRats(st.rats, dt, t);
}

function updateCamera(cam: THREE.PerspectiveCamera, g: Game, init = false) {
  const [a, b] = g.f;
  const mid = (a.x + b.x) / 2, sep = Math.abs(a.x - b.x);
  const lift = Math.max(0, -Math.min(a.y, b.y)) * U;
  // keep a knocked-down fighter's whole body in shot (they lie ~1.8 m behind where they fell)
  let lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x);
  for (const f of g.f) if (f.state === "knockdown" || f.state === "ko") { const tail = f.x - f.facing * 200; lo = Math.min(lo, tail); hi = Math.max(hi, tail); }
  const span = hi - lo, cx2 = (lo + hi) / 2;
  const tx = Math.max(-2.4, Math.min(2.4, X3(cx2)));
  const dist = 3.8 + Math.max(sep, span) * U * 0.8;
  const k = init ? 1 : 0.1;
  cam.position.x += (tx - cam.position.x) * k;
  cam.position.y += (1.25 + lift * 0.45 - cam.position.y) * k;
  cam.position.z += (dist - cam.position.z) * k;
  if (g.shake > 0) { cam.position.x += Math.sin(g.frame * 7.3) * 0.03; cam.position.y += Math.cos(g.frame * 5.1) * 0.03; }
  cam.lookAt(cam.position.x, 1.02 + lift * 0.4, 0);
}

/* ---------- HUD — early-2000s arcade style: chrome frames, slanted bars, portraits ---------- */

const HUDF = "'Russo One', 'Arial Black', Impact, sans-serif";

function outlined(c: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill: string | CanvasGradient = "#ffffff", align: CanvasTextAlign = "center", slant = 0.2) {
  c.save(); c.translate(x, y); c.transform(1, 0, -slant, 1, 0, 0);
  c.font = `${size}px ${HUDF}`; c.textAlign = align; c.textBaseline = "middle";
  c.lineJoin = "round"; c.lineWidth = Math.max(4, size / 5); c.strokeStyle = "#000"; c.strokeText(text, 0, 0);
  c.fillStyle = fill; c.fillText(text, 0, 0);
  c.restore();
}

function chrome(c: CanvasRenderingContext2D, y0: number, y1: number) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, "#ffffff"); g.addColorStop(0.35, "#a9b2bf"); g.addColorStop(0.5, "#4a5160"); g.addColorStop(0.7, "#c9d1dc"); g.addColorStop(1, "#6b7380");
  return g;
}
function gold(c: CanvasRenderingContext2D, y0: number, y1: number) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, "#fff7c2"); g.addColorStop(0.45, "#ffc21a"); g.addColorStop(0.55, "#e07b00"); g.addColorStop(1, "#ffd45a");
  return g;
}

/** A slanted bar. `fromRight` = it fills from the right edge (player 1 bar empties toward the centre). */
function slantRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, sk: number) {
  c.beginPath(); c.moveTo(x + sk, y); c.lineTo(x + w + sk, y); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath();
}

function drawHud(c: CanvasRenderingContext2D, g: Game, touch: boolean, project: (x: number, y: number, z: number) => [number, number], pics: (HTMLImageElement | null)[]) {
  const PS = 66, BY = 18, BH = 26, SK = 10, GAP = 54;
  const BW = W / 2 - GAP - 20 - PS - 16;
  const pulse = 0.5 + Math.sin(g.frame * 0.25) * 0.5;

  g.f.forEach((f, i) => {
    const left = i === 0;
    const px = left ? 14 : W - 14 - PS;
    const bx = left ? px + PS + 10 : W / 2 + GAP;
    const sk = left ? SK : -SK;

    // portrait in a chrome frame
    c.fillStyle = "#000"; c.fillRect(px - 5, BY - 5, PS + 10, PS + 10);
    c.fillStyle = chrome(c, BY - 4, BY + PS + 4); c.fillRect(px - 3, BY - 3, PS + 6, PS + 6);
    c.fillStyle = f.def.color; c.fillRect(px, BY, PS, PS);
    const pic = pics[i];
    if (pic && pic.complete && pic.naturalWidth) {
      c.save(); c.beginPath(); c.rect(px, BY, PS, PS); c.clip();
      if (!left) { c.translate(px * 2 + PS, 0); c.scale(-1, 1); }                  // P2 portrait faces inward
      c.drawImage(pic, px, BY, PS, PS); c.restore();
    }
    if (f.flash > 0) { c.fillStyle = "rgba(255,40,0,0.45)"; c.fillRect(px, BY, PS, PS); }

    // health bar: chrome frame → dark well → red "recent damage" → gold health → gloss
    const fill = (v: number) => (BW * v) / 100;
    c.fillStyle = "#000"; slantRect(c, bx - 5, BY - 4, BW + 10, BH + 8, sk); c.fill();
    c.fillStyle = chrome(c, BY - 3, BY + BH + 3); slantRect(c, bx - 3, BY - 2, BW + 6, BH + 4, sk); c.fill();
    c.fillStyle = "#1a0606"; slantRect(c, bx, BY + 1, BW, BH - 2, sk); c.fill();
    c.save(); slantRect(c, bx, BY + 1, BW, BH - 2, sk); c.clip();
    const lagW = fill(f.lag), hpW = fill(f.hp);
    c.fillStyle = "#e01a00"; c.fillRect(left ? bx + BW + SK - lagW : bx - SK, BY, lagW + SK, BH);
    const low = f.hp < 30;
    c.fillStyle = low ? `rgb(255,${Math.round(80 + 120 * pulse)},0)` : gold(c, BY, BY + BH);
    c.fillRect(left ? bx + BW + SK - hpW : bx - SK, BY, hpW + (hpW > 0 ? SK : 0), BH);
    c.fillStyle = "rgba(255,255,255,0.35)"; c.fillRect(bx - SK, BY + 2, BW + SK * 2, BH * 0.3);
    c.restore();

    // name plate + player tag
    const ny = BY + BH + 20, nameX = left ? bx + 4 : bx + BW - 4;
    outlined(c, f.def.name.toUpperCase(), nameX, ny, 20, "#ffffff", left ? "left" : "right");
    c.font = `20px ${HUDF}`; const nw = c.measureText(f.def.name.toUpperCase()).width;
    c.fillStyle = f.def.color; c.fillRect(left ? nameX : nameX - nw, ny + 13, nw, 3);
    outlined(c, f.tag, left ? nameX + nw + 14 : nameX - nw - 14, ny + 1, 12, "#ffd23f", left ? "left" : "right");

    // round wins: gold diamonds (empty = outline) near the timer
    for (let k = 0; k < 2; k++) {
      const cx = left ? bx + BW - 12 - k * 24 : bx + 12 + k * 24, cy = ny;
      c.save(); c.translate(cx, cy); c.rotate(Math.PI / 4);
      c.fillStyle = "#000"; c.fillRect(-8, -8, 16, 16);
      c.fillStyle = g.wins[i] > k ? gold(c, -7, 7) : "#2a2a30"; c.fillRect(-6, -6, 12, 12);
      c.restore();
    }

    // special gauge: 10 segments, label says when it's ready (not just colour)
    const gy = ny + 22, segs = 10, gw = BW * 0.62, segW = gw / segs;
    const gx = left ? bx : bx + BW - gw;
    c.fillStyle = "#000"; slantRect(c, gx - 3, gy - 3, gw + 6, 14, sk * 0.5); c.fill();
    const lit = (f.sta / 100) * segs;
    for (let k = 0; k < segs; k++) {
      const idx = left ? k : segs - 1 - k;
      const on = Math.min(1, Math.max(0, lit - idx));
      const sx = gx + k * segW + 1;
      c.fillStyle = "#101a2e"; c.fillRect(sx, gy, segW - 2, 8);
      if (on > 0) {
        const gg = c.createLinearGradient(0, gy, 0, gy + 8); gg.addColorStop(0, "#bff3ff"); gg.addColorStop(1, "#1e78ff");
        c.fillStyle = gg; c.globalAlpha = on; c.fillRect(sx, gy, segW - 2, 8); c.globalAlpha = 1;
      }
    }
    const ready = f.sta >= SP_COST;
    outlined(c, ready ? "SPECIAL READY" : "SPECIAL", left ? gx + gw + 10 : gx - 10, gy + 4, 11, ready ? `rgb(255,${Math.round(200 + 55 * pulse)},${Math.round(80 * pulse)})` : "#9fb3d9", left ? "left" : "right", 0.15);

    // combo counter
    const cs = g.comboShow[i];
    if (cs.t > 0 && cs.n >= 2) {
      const cx = left ? 70 : W - 70, s = 1 + Math.max(0, cs.t - 60) * 0.05;
      outlined(c, `${cs.n}`, cx, 190, 48 * s, gold(c, 165, 215));
      outlined(c, "HITS", cx, 226, 18, "#ffffff");
    }

    // who is who, above each fighter's head
    const down = f.state === "knockdown" || f.state === "ko";
    const [tx, ty0] = project(X3(f.x), Y3(f.y) + (down ? 0.6 : f.crouch ? 1.5 : 2.05) + (i === 0 ? 0 : 0.12), 0);
    const ty = Math.max(170, ty0);
    outlined(c, f.tag, tx, ty, 13, i === 0 ? "#ffd23f" : "#ffffff");
    const co = g.callout[i];
    if (co.t > 0) outlined(c, co.text, Math.max(130, Math.min(W - 130, tx)), ty - 28, 24, f.def.color);        // special name, arcade-style
  });

  // timer in a chrome badge
  const tw = 80, th = 62, tx = W / 2 - tw / 2, ty = BY - 8;
  c.fillStyle = "#000";
  c.beginPath(); c.moveTo(tx + 10, ty - 3); c.lineTo(tx + tw - 10, ty - 3); c.lineTo(tx + tw + 3, ty + 12); c.lineTo(tx + tw + 3, ty + th - 12); c.lineTo(tx + tw - 10, ty + th + 3); c.lineTo(tx + 10, ty + th + 3); c.lineTo(tx - 3, ty + th - 12); c.lineTo(tx - 3, ty + 12); c.closePath(); c.fill();
  c.fillStyle = chrome(c, ty, ty + th);
  c.beginPath(); c.moveTo(tx + 10, ty); c.lineTo(tx + tw - 10, ty); c.lineTo(tx + tw, ty + 12); c.lineTo(tx + tw, ty + th - 12); c.lineTo(tx + tw - 10, ty + th); c.lineTo(tx + 10, ty + th); c.lineTo(tx, ty + th - 12); c.lineTo(tx, ty + 12); c.closePath(); c.fill();
  c.fillStyle = "#0c0c12"; c.fillRect(tx + 7, ty + 7, tw - 14, th - 14);
  const secs = Math.max(0, Math.ceil(g.timer / 60));
  outlined(c, `${secs}`.padStart(2, "0"), W / 2, ty + th / 2 + 1, 34, secs <= 10 ? `rgb(255,${Math.round(60 + 100 * pulse)},40)` : gold(c, ty + 12, ty + th - 12), "center", 0.12);

  for (const s of g.sparks) if (s.blocked) { const [bx, by] = project(X3(s.x), (GROUND - s.y) * U + 0.35, 0.4); outlined(c, "BLOCK", bx, by, 14, "#bfe0ff"); }

  if (g.round === 1 && g.frame < 420) {
    outlined(c, touch ? "HOLD THE STICK AWAY FROM YOUR RIVAL TO BLOCK" : "HOLD BACK (AWAY FROM YOUR RIVAL) TO BLOCK", W / 2, H - 92, 13, "#ffcf7a", "center", 0.1);
  }

  // big announcements on a slanted banner
  if (g.msg) {
    const size = g.msg.length > 16 ? 34 : g.msg.length > 10 ? 44 : 70;
    const y = H / 2 - 30;
    c.save();
    c.fillStyle = "rgba(0,0,0,0.6)";
    c.beginPath(); c.moveTo(0, y - size * 0.75); c.lineTo(W, y - size * 0.95); c.lineTo(W, y + size * 0.75); c.lineTo(0, y + size * 0.95); c.closePath(); c.fill();
    c.fillStyle = "#FF2300"; c.fillRect(0, y + size * 0.95 - 3, W, 3);
    c.fillStyle = chrome(c, 0, 4); c.fillRect(0, y - size * 0.95 - 1, W, 3);
    c.restore();
    outlined(c, g.msg, W / 2, y, size, gold(c, y - size / 2, y + size / 2), "center", 0.22);
  }
}

/* ---------- select-screen portraits, rendered from the real 3D models ---------- */

let stagePreviewJob: Promise<Record<string, string>> | null = null;
/** A snapshot of each location from the fight camera, for the location-select cards. */
function renderStagePreviews(): Promise<Record<string, string>> {
  if (stagePreviewJob) return stagePreviewJob;
  stagePreviewJob = (async () => {
    const out: Record<string, string> = {};
    await getLogo();
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    r.setSize(640, 360); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    const cam = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 80);
    cam.position.set(0, 1.35, 7.2); cam.lookAt(0, 1.15, 0);
    for (const l of LOCATIONS) {
      try {
        const st = buildStage(r, l.id); await st.ready; updateStage(st, null, 1, 0);
        r.render(st.scene, cam);
        out[l.id] = r.domElement.toDataURL("image/jpeg", 0.85);
        st.scene.traverse((o) => { (o as THREE.Mesh).geometry?.dispose?.(); });
      } catch { out[l.id] = ""; }
    }
    r.dispose();
    return out;
  })();
  return stagePreviewJob;
}

let portraitJob: Promise<Record<string, string>> | null = null;
/** Head-and-shoulders shots of every fighter, framed from the model's real pose, on an arcade-style card background. */
function renderPortraits(): Promise<Record<string, string>> {
  if (portraitJob) return portraitJob;
  portraitJob = (async () => {
    const out: Record<string, string> = {};
    const S = 320;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setSize(S, S); r.setClearColor(0x000000, 0); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff0e0, 0x3a2418, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(1.5, 2.5, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(0xff7a2a, 3); rim.position.set(-2, 2, -2); scene.add(rim);
    const cam = new THREE.PerspectiveCamera(26, 1, 0.05, 20);
    const comp = document.createElement("canvas"); comp.width = comp.height = S;
    const cc = comp.getContext("2d")!;
    for (const d of ROSTER) {
      try {
        const rg = makeRig(await loadFighter(d.id), d.color);
        rg.mixer.update(0.5); rg.model.rotation.y = 0.3;
        scene.add(rg.root); rg.root.updateMatrixWorld(true);
        // real bounds of the posed body
        const box = new THREE.Box3(), mb = new THREE.Box3();
        rg.model.traverse((o) => {
          const m = o as THREE.SkinnedMesh;
          if (m.isSkinnedMesh) { m.skeleton.update(); m.computeBoundingBox(); mb.copy(m.boundingBox!).applyMatrix4(m.matrixWorld); box.union(mb); }
          else if ((o as THREE.Mesh).isMesh) box.expandByObject(o);
        });
        const head = new THREE.Vector3(), hips = new THREE.Vector3();
        if (rg.bones.Head) rg.bones.Head.getWorldPosition(head); else head.set(0, box.max.y - 0.15, 0);
        if (rg.bones.Hips) rg.bones.Hips.getWorldPosition(hips); else hips.set(0, box.min.y + (box.max.y - box.min.y) * 0.53, 0);
        const top = box.max.y + 0.15;
        const frameH = (top - hips.y) * 1.0;                       // top of head down to the waist
        const cy = top - frameH / 2, cx = head.x * 0.6 + hips.x * 0.4, cz = head.z;
        const dist = (frameH / 2) / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
        cam.position.set(cx + dist * 0.12, cy + 0.02, cz + dist); cam.lookAt(cx, cy, cz);
        r.render(scene, cam);
        // card background: fighter colour → black, with arcade speed stripes
        const g = cc.createLinearGradient(0, 0, S, S);
        g.addColorStop(0, d.color); g.addColorStop(0.55, new THREE.Color(d.color).multiplyScalar(0.35).getStyle()); g.addColorStop(1, "#050507");
        cc.fillStyle = g; cc.fillRect(0, 0, S, S);
        cc.save(); cc.globalAlpha = 0.14; cc.strokeStyle = "#ffffff"; cc.lineWidth = 10;
        for (let k = -S; k < S * 2; k += 34) { cc.beginPath(); cc.moveTo(k, S); cc.lineTo(k + S * 0.6, 0); cc.stroke(); }
        cc.restore();
        cc.drawImage(r.domElement, 0, 0);
        const v = cc.createLinearGradient(0, S * 0.7, 0, S); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.55)");
        cc.fillStyle = v; cc.fillRect(0, 0, S, S);
        out[d.id] = comp.toDataURL("image/jpeg", 0.88);
        scene.remove(rg.root);
      } catch { out[d.id] = ""; }
    }
    r.dispose();
    return out;
  })();
  return portraitJob;
}
function drawProjectile(c: CanvasRenderingContext2D, p: Proj, t: number) {
  const x = p.x, y = GROUND + p.y, d = p.dir;
  const trail = (cols: string[]) => {
    for (let k = 4; k >= 1; k--) {
      c.fillStyle = cols[k > 2 ? 0 : 1];
      c.beginPath(); c.arc(x - d * k * 14, y + Math.sin(p.spin + k) * 3, 16 - k * 2.5, 0, Math.PI * 2); c.fill();
    }
  };
  switch (p.kind) {
    case "record": {                                                    // JPeez — a flaming PMG record
      trail(["#FF2300", "#ff9a1f"]);
      c.fillStyle = "#0c0a0a"; c.beginPath(); c.arc(x, y, 22, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#3a3434"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 15, 0, Math.PI * 2); c.stroke();
      c.fillStyle = "#FF2300"; c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#e8e0d0"; c.lineWidth = 2.5; c.beginPath();
      c.moveTo(x + Math.cos(p.spin) * 11, y + Math.sin(p.spin) * 11); c.lineTo(x + Math.cos(p.spin) * 20, y + Math.sin(p.spin) * 20); c.stroke();
      break;
    }
    case "gold": {                                                      // JahBalla — a spinning gold medallion
      for (let k = 1; k <= 4; k++) { c.fillStyle = k % 2 ? "#ffcf4a" : "#fff4c0"; c.fillRect(x - d * k * 16 - 3, y + Math.sin(p.spin * 2 + k) * 10 - 3, 6, 6); }
      const w = Math.abs(Math.cos(p.spin)) * 22 + 4;
      c.fillStyle = "#a8741c"; c.beginPath(); c.ellipse(x, y, w + 3, 25, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#ffcf4a"; c.beginPath(); c.ellipse(x, y, w, 22, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#fff4c0"; c.beginPath(); c.ellipse(x - w * 0.3, y - 8, w * 0.25, 5, 0, 0, Math.PI * 2); c.fill();
      if (w > 12) { c.fillStyle = "#a8741c"; c.font = `bold 20px ${PIX}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("$", x, y + 1); }
      break;
    }
    case "ticker": {                                                    // Stockz — a rising stock-chart arrow
      c.lineCap = "round"; c.lineJoin = "round";
      const pts: [number, number][] = [[-58, 18], [-40, 4], [-26, 12], [-8, -8], [8, -2], [22, -18]];
      for (const [w, col] of [[11, "#0b3a6b"], [7, "#3AA0FF"], [3, "#d8f0ff"]] as [number, string][]) {
        c.lineWidth = w; c.strokeStyle = col; c.beginPath();
        pts.forEach(([px, py], k) => { const X = x + px * d, Y = y + py; if (k) c.lineTo(X, Y); else c.moveTo(X, Y); }); c.stroke();
      }
      c.fillStyle = "#3AA0FF"; c.beginPath(); c.moveTo(x + 34 * d, y - 28); c.lineTo(x + 10 * d, y - 26); c.lineTo(x + 28 * d, y - 6); c.closePath(); c.fill();
      c.fillStyle = "#2ED47A"; c.font = `12px ${PIX}`; c.textAlign = "center"; c.fillText("▲", x - 30 * d, y - 22);
      break;
    }
    case "note": {                                                      // Zoe — a pink music note with sparkles
      for (let k = 1; k <= 5; k++) { c.fillStyle = k % 2 ? "#FF5FB0" : "#ffe0f0"; const sx = x - d * k * 13, sy = y + Math.sin(p.spin + k) * 12; c.fillRect(sx - 2, sy - 6, 4, 12); c.fillRect(sx - 6, sy - 2, 12, 4); }
      c.fillStyle = "#7a1e4d"; c.beginPath(); c.ellipse(x - 5, y + 12, 13, 10, -0.4, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#FF5FB0"; c.beginPath(); c.ellipse(x - 5, y + 12, 10, 7.5, -0.4, 0, Math.PI * 2); c.fill();
      c.fillRect(x + 3, y - 26, 6, 38);
      c.beginPath(); c.moveTo(x + 9, y - 26); c.quadraticCurveTo(x + 30, y - 16, x + 22, y + 2); c.quadraticCurveTo(x + 22, y - 12, x + 9, y - 12); c.fill();
      c.fillStyle = "#ffe0f0"; c.fillRect(x - 10, y + 8, 5, 3);
      break;
    }
    case "wave": {                                                      // Hammad — bass waves
      c.lineCap = "round";
      for (let k = 0; k < 4; k++) {
        const r = 12 + k * 11 + ((t * 2) % 11), a = 0.9;
        c.strokeStyle = k % 2 ? "#2ED47A" : "#b8ffd8"; c.lineWidth = 6 - k;
        c.beginPath(); c.arc(x - d * 30, y, r, d > 0 ? -a : Math.PI - a, d > 0 ? a : Math.PI + a); c.stroke();
      }
      c.fillStyle = "#0e3a22"; c.beginPath(); c.arc(x - d * 30, y, 10, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#2ED47A"; c.beginPath(); c.arc(x - d * 30, y, 6, 0, Math.PI * 2); c.fill();
      break;
    }
    case "paw": {                                                       // KatBot — a glowing paw print + claw slashes
      c.lineCap = "round";
      for (let k = 0; k < 3; k++) {
        c.strokeStyle = k === 1 ? "#f0e0ff" : "#B070FF"; c.lineWidth = 5 - Math.abs(k - 1);
        c.beginPath(); c.moveTo(x - d * 50, y - 22 + k * 16); c.quadraticCurveTo(x - d * 25, y - 30 + k * 16, x - d * 6, y - 18 + k * 16); c.stroke();
      }
      c.fillStyle = "#2a0f45"; c.beginPath(); c.ellipse(x + d * 10, y + 6, 17, 14, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#B070FF"; c.beginPath(); c.ellipse(x + d * 10, y + 6, 13, 10, 0, 0, Math.PI * 2); c.fill();
      for (const [ox, oy] of [[-14, -14], [-2, -22], [12, -20], [22, -8]] as [number, number][]) {
        c.fillStyle = "#2a0f45"; c.beginPath(); c.arc(x + d * (10 + ox), y + oy, 7, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#e4ccff"; c.beginPath(); c.arc(x + d * (10 + ox), y + oy, 5, 0, Math.PI * 2); c.fill();
      }
      break;
    }
  }
}
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

const WET = "'Rubik Wet Paint', 'Permanent Marker', Impact, sans-serif";
const CSS = `
.pmg{position:relative;min-height:100dvh;width:100%;overflow-x:hidden;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  background:radial-gradient(120% 70% at 50% 115%,#5a1a08 0%,#1a0a06 45%,#050304 100%);
  display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;box-sizing:border-box;
  user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;overscroll-behavior:none}
.pmg *{box-sizing:border-box}
.pmg-titlewrap{display:flex;flex-direction:column;align-items:center;margin-bottom:10px}
.pmg-titlelogo{width:min(360px,64vw,46dvh);height:auto;display:block;filter:drop-shadow(0 6px 14px rgba(0,0,0,.8))}
.pmg-fight{font:clamp(44px,12vw,96px)/0.9 ${WET};color:#FF2300;margin-top:-6px;letter-spacing:2px;
  -webkit-text-stroke:2px #000;text-shadow:4px 5px 0 #000, 0 0 24px rgba(255,35,0,.45);transform:skewX(-6deg)}
.pmg-h2{font:clamp(16px,3.6vw,26px)/1.3 ${HUDF};margin:4px 0 10px;text-align:center;font-style:italic;letter-spacing:1px;
  background:linear-gradient(#fff7c2,#ffc21a 45%,#e07b00 55%,#ffd45a);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(2px 3px 0 #000)}
.pmg-tag{font:14px/1.6 ${HUDF};color:#ffcf7a;letter-spacing:3px;margin:0 0 6px;text-align:center}
.pmg-sub{color:#efdcc6;margin:0 0 22px;text-align:center;max-width:42ch;font-size:15px;line-height:1.5}
.pmg-blink{animation:pmgblink 1.1s steps(1) infinite}@keyframes pmgblink{50%{opacity:0}}
.pmg-col{display:flex;flex-direction:column;gap:14px;width:min(360px,92vw)}
.pmg-btn{appearance:none;border:2px solid #000;border-radius:4px;color:#140c08;font:18px/1.3 ${HUDF};padding:14px;cursor:pointer;font-style:italic;letter-spacing:1px;
  background:linear-gradient(#fff7c2,#ffc21a 45%,#e07b00 55%,#ffd45a);box-shadow:0 0 0 2px #c9d1dc,0 0 0 4px #000,4px 6px 0 4px rgba(0,0,0,.6);touch-action:manipulation;text-align:center}
.pmg-btn:hover{filter:brightness(1.1)}
.pmg-btn:active{transform:translateY(2px)}
.pmg-btn.ghost{background:linear-gradient(#3a3f4a,#15171c 50%,#0b0c0f 51%,#2a2e36);color:#fff}
.pmg-btn small{display:block;font:600 13px system-ui,sans-serif;margin-top:5px;font-style:normal;letter-spacing:0}
.pmg-btn:focus-visible,.pmg-card:focus-visible,.pmg-mini:focus-visible{outline:3px solid #fff;outline-offset:4px}
.pmg-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;width:min(1040px,96vw)}
.pmg-card{appearance:none;text-align:left;border:0;display:flex;flex-direction:column;justify-content:flex-start;border-radius:4px;padding:8px;color:#fff;cursor:pointer;position:relative;touch-action:manipulation;
  background:linear-gradient(#2a2e36,#101217);box-shadow:0 0 0 2px #6b7380,0 0 0 4px #000,4px 6px 0 4px rgba(0,0,0,.6)}
.pmg-card:hover{box-shadow:0 0 0 2px #ffc21a,0 0 0 4px #000,4px 6px 0 4px rgba(0,0,0,.6)}
.pmg-card[aria-pressed="true"]{box-shadow:0 0 0 3px #fff,0 0 0 5px #000,4px 6px 0 4px rgba(0,0,0,.6)}
.pmg-card img,.pmg-card .ph{width:100%;aspect-ratio:1;display:block;object-fit:cover;border-radius:2px;border:2px solid #000;background:#2c1b12}
.pmg-card .ph{display:flex;align-items:center;justify-content:center;font:12px ${HUDF};color:#ffcf7a}
.pmg-load{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:18px ${HUDF};color:#ffcf7a;background:rgba(10,6,4,.85);text-align:center;padding:20px;line-height:1.6}
.pmg-card h3{margin:8px 0 2px;font:19px/1.2 ${HUDF};font-style:italic;letter-spacing:1px}
.pmg-card .bar{height:3px;margin-bottom:6px}
.pmg-card .meta{font-size:12px;color:#d9dde6;margin-bottom:6px;line-height:1.35}
.pmg-badge{position:absolute;top:14px;left:14px;background:#ffc21a;color:#000;font:13px ${HUDF};padding:3px 8px;border:2px solid #000}
.pmg-stat{display:grid;grid-template-columns:58px 1fr 16px;align-items:center;gap:6px;font-size:12px;margin-top:3px}
.pmg-stat i{display:block;height:7px;background:#23262e;border:1px solid #000}
.pmg-stat i b{display:block;height:100%;background:linear-gradient(#fff7c2,#ffc21a 50%,#e07b00)}
.pmg-stage{position:relative}
.pmg-locs{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;width:min(900px,96vw)}
.pmg-loc img,.pmg-loc .ph{aspect-ratio:16/9 !important}
.pmg-loc h3{font-size:24px}
.pmg-canvas{display:block;touch-action:none;background:#000;border:3px solid #000;box-shadow:0 0 0 3px #6b7380,8px 8px 0 3px #000}
.pmg-top{position:absolute;top:15.2%;left:50%;transform:translateX(-50%);display:flex;gap:6px}
.pmg-top .pmg-mini{font-size:clamp(9px,1.3vw,12px);padding:clamp(3px,.6vw,6px) clamp(8px,1.2vw,14px);letter-spacing:1px}
.pmg-modal{position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:16px}
.pmg-panel{width:min(400px,94vw);max-height:94dvh;overflow:auto;padding:20px;border-radius:6px;background:linear-gradient(#2a2e36,#101217);box-shadow:0 0 0 2px #c9d1dc,0 0 0 4px #000,6px 8px 0 4px rgba(0,0,0,.6);display:flex;flex-direction:column;align-items:center}
.pmg-panel .pmg-col{width:100%}
.pmg-row{display:flex;align-items:center;justify-content:space-between;gap:10px;font:16px ${HUDF};letter-spacing:1px;padding:6px 2px;border-bottom:1px solid #2f343d}
.pmg-nowp{font:13px ${HUDF};color:#ffcf7a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.pmg-toggle{appearance:none;min-width:84px;border:2px solid #c9d1dc;border-radius:3px;background:#15171c;color:#fff;font:14px ${HUDF};padding:8px 10px;cursor:pointer;flex:none}
.pmg-toggle[aria-pressed="true"]{background:linear-gradient(#fff7c2,#ffc21a 45%,#e07b00 55%,#ffd45a);color:#000;border-color:#000}
.pmg-toggle:focus-visible{outline:3px solid #fff;outline-offset:3px}
.pmg-mini{appearance:none;border:2px solid #c9d1dc;border-radius:3px;background:rgba(12,12,16,.85);color:#fff;font:12px ${HUDF};padding:8px 10px;cursor:pointer;white-space:nowrap}
.pmg-mini[aria-pressed="true"]{border-color:#6b7380;color:#9aa3b0}
.pmg-help{color:#efdcc6;font-size:14px;margin-top:14px;text-align:center;line-height:1.9}
.pmg-help kbd{background:#15171c;border:2px solid #c9d1dc;border-radius:3px;padding:0 6px;font:12px ${HUDF};color:#fff}
.pmg-pad{display:flex;justify-content:space-between;align-items:flex-end;gap:8px;margin-top:12px;width:100%;max-width:100%}
.pmg-pad.overlay{position:absolute;left:10px;right:10px;bottom:10px;width:auto;margin:0;pointer-events:none}
.pmg-pad.overlay>*{pointer-events:auto}
.pmg-dpad{position:relative;width:clamp(116px,30vw,150px);aspect-ratio:1;border-radius:50%;background:rgba(12,12,16,.55);border:3px solid rgba(201,209,220,.9);touch-action:none;flex:none}
.pmg-dpad .ar{position:absolute;font:14px ${HUDF};color:#e6eaf0;line-height:1}
.pmg-knob{position:absolute;left:50%;top:50%;width:42%;height:42%;margin:-21% 0 0 -21%;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#a9b2bf 40%,#4a5160);border:3px solid #000;pointer-events:none}
.pmg-keys{display:flex;gap:clamp(6px,2vw,10px);align-items:flex-end}
.pmg-key{appearance:none;border:3px solid #c9d1dc;background:rgba(12,12,16,.7);color:#fff;border-radius:50%;width:clamp(56px,15vw,70px);height:clamp(56px,15vw,70px);
  font:700 11px system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:none;padding:0;gap:2px}
.pmg-key span{font:20px ${HUDF}}
.pmg-key.p{border-color:#ffc21a}
.pmg-key.sp{border-color:#FF2300}
.pmg-key.k{margin-bottom:18px}
.pmg-over{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;padding-bottom:12%;pointer-events:none}
.pmg-over .pmg-col{pointer-events:auto;width:min(320px,80%)}
.pmg-rotate{color:#efdcc6;font-size:13px;margin-top:10px;text-align:center}
.pmg-intro{position:fixed;inset:0;z-index:50;background:#050304;display:flex;align-items:center;justify-content:center;cursor:pointer}
.pmg-intro canvas{width:100%;height:100%;display:block}
.pmg-skip{appearance:none;position:absolute;bottom:18px;right:20px;border:0;background:transparent;font:12px ${HUDF};color:#c9d1dc;letter-spacing:2px;cursor:pointer;padding:10px}
.pmg-exit{position:fixed;left:16px;top:80px;z-index:70}
@media (max-width:900px){.pmg-grid{grid-template-columns:repeat(3,1fr)}}
@media (max-width:480px){.pmg-grid{grid-template-columns:repeat(2,1fr)}.pmg-locs{grid-template-columns:1fr}}
`;

function useIsTouch() {
  const [t] = useState(() => typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0));
  return t;
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



/* ================================================================== */
/*  SOUND — music playlist + synthesised hit sounds (no sound files)   */
/* ================================================================== */

const store = {
  get(k: string, d: boolean) { try { const v = localStorage.getItem("pmg-" + k); return v === null ? d : v === "1"; } catch { return d; } },
  set(k: string, v: boolean) { try { localStorage.setItem("pmg-" + k, v ? "1" : "0"); } catch { /* private mode: ignore */ } },
};

type AudioListener = () => void;
const Sound = {
  music: null as HTMLAudioElement | null,
  order: [] as number[], pos: -1,
  musicOn: store.get("music", true), fxOn: store.get("fx", true),
  started: false, title: "",
  ctx: null as AudioContext | null, fxGain: null as GainNode | null, noise: null as AudioBuffer | null,
  listeners: new Set<AudioListener>(),
  emit() { this.listeners.forEach((l) => l()); },

  /** Browsers only allow sound after a tap/click/key — call this from any user action. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        this.ctx = new AC();
        this.fxGain = this.ctx.createGain(); this.fxGain.gain.value = 0.55; this.fxGain.connect(this.ctx.destination);
        const n = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate), d = n.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        this.noise = n;
      }
    }
    this.ctx?.resume?.();
    if (!this.started) { this.started = true; if (this.musicOn) this.next(); }
  },

  next() {
    if (!SONGS.length) return;
    if (this.pos + 1 >= this.order.length) {                 // reshuffle, never the same song twice in a row
      const last = this.order[this.pos];
      this.order = SONGS.map((_, i) => i).sort(() => Math.random() - 0.5);
      if (this.order.length > 1 && this.order[0] === last) this.order.push(this.order.shift()!);
      this.pos = -1;
    }
    this.pos++;
    const song = SONGS[this.order[this.pos]];
    if (!this.music) {
      this.music = new Audio(); this.music.volume = 0.5; this.music.preload = "auto";
      this.music.addEventListener("ended", () => this.next());
      this.music.addEventListener("error", () => { if (this.musicOn) setTimeout(() => this.next(), 400); });
    }
    this.music.src = song.url;
    this.title = song.title;
    if (this.musicOn) this.music.play().catch(() => { /* blocked until the next tap */ });
    this.emit();
  },
  toggleMusic() {
    this.musicOn = !this.musicOn; store.set("music", this.musicOn);
    if (this.musicOn) { if (!this.music) this.next(); else this.music.play().catch(() => {}); } else this.music?.pause();
    this.emit();
  },
  pause() {
    this.music?.pause();
    this.ctx?.suspend?.();
  },
  toggleFx() { this.fxOn = !this.fxOn; store.set("fx", this.fxOn); this.emit(); },

  /** Short arcade sounds, built from noise and tones. */
  play(kind: string) {
    const c = this.ctx, out = this.fxGain;
    if (!c || !out || !this.fxOn || c.state !== "running") return;
    const t = c.currentTime;
    const env = (g: GainNode, a: number, peak: number, dec: number) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); };
    const noise = (f0: number, f1: number, q: number, peak: number, dec: number, type: BiquadFilterType = "bandpass") => {
      const s = c.createBufferSource(); s.buffer = this.noise;
      const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dec);
      const g = c.createGain(); env(g, 0.005, peak, dec);
      s.connect(f).connect(g).connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dec + 0.05);
    };
    const tone = (type: OscillatorType, f0: number, f1: number, peak: number, dec: number, delay = 0) => {
      const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t + delay); o.frequency.exponentialRampToValueAtTime(f1, t + delay + dec);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t + delay); g.gain.exponentialRampToValueAtTime(peak, t + delay + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dec);
      o.connect(g).connect(out); o.start(t + delay); o.stop(t + delay + dec + 0.05);
    };
    switch (kind) {
      case "swing": noise(900, 2600, 1.2, 0.25, 0.09); break;
      case "swingHeavy": noise(500, 1800, 1, 0.32, 0.14); break;
      case "jump": noise(300, 900, 1, 0.12, 0.1); break;
      case "hit": noise(2400, 600, 0.9, 0.7, 0.07); tone("sine", 180, 60, 0.8, 0.09); break;
      case "hitHeavy": noise(1800, 300, 0.8, 0.9, 0.14); tone("sine", 140, 40, 1, 0.2); tone("square", 90, 45, 0.15, 0.12); break;
      case "block": tone("square", 1600, 1200, 0.18, 0.05); noise(5000, 3000, 3, 0.35, 0.05); break;
      case "charge": tone("sawtooth", 140, 420, 0.12, 0.22); break;
      case "special": noise(400, 3500, 0.7, 0.5, 0.3); tone("sawtooth", 220, 880, 0.2, 0.25); tone("sine", 110, 55, 0.5, 0.35); break;
      case "blast": noise(3000, 200, 0.6, 1, 0.3); tone("sine", 120, 35, 1, 0.35); break;
      case "thud": noise(400, 80, 0.8, 0.8, 0.18, "lowpass"); tone("sine", 70, 35, 0.7, 0.2); break;
      case "ko": noise(2500, 100, 0.5, 1, 0.9); tone("sine", 90, 28, 1, 1.1); tone("triangle", 330, 110, 0.25, 0.9); break;
      case "round": tone("triangle", 660, 660, 0.3, 0.5); tone("triangle", 880, 880, 0.2, 0.5, 0.12); break;
      case "fight": tone("sawtooth", 330, 330, 0.18, 0.45); tone("square", 495, 495, 0.12, 0.45); noise(800, 4000, 0.8, 0.3, 0.3); break;
    }
  },
};

function useSound() {
  const [, set] = useState(0);
  useEffect(() => { const l = () => set((n) => n + 1); Sound.listeners.add(l); return () => { Sound.listeners.delete(l); }; }, []);
  return Sound;
}

/** Settings: music, sound effects, next song. Opened from the MENU button (fight) or SETTINGS (home screen). */
function SettingsPanel({ onClose, extra }: { onClose: () => void; extra?: ReactNode }) {
  const s = useSound();
  return (
    <div className="pmg-modal" role="dialog" aria-label="Menu">
      <div className="pmg-panel">
        <h2 className="pmg-h2" style={{ margin: "0 0 14px" }}>{extra ? "PAUSED" : "SETTINGS"}</h2>
        <div className="pmg-col">
          {extra}
          <div className="pmg-row"><span>MUSIC</span><button className="pmg-toggle" aria-pressed={s.musicOn} onClick={() => { s.unlock(); s.toggleMusic(); }}>{s.musicOn ? "ON" : "OFF"}</button></div>
          <div className="pmg-row"><span>SOUND FX</span><button className="pmg-toggle" aria-pressed={s.fxOn} onClick={() => { s.unlock(); s.toggleFx(); }}>{s.fxOn ? "ON" : "OFF"}</button></div>
          <div className="pmg-row"><span className="pmg-nowp">♪ {s.musicOn ? (s.title || "—") : "Music off"}</span><button className="pmg-toggle" onClick={() => { s.unlock(); if (!s.musicOn) s.toggleMusic(); else s.next(); }}>NEXT ▶▶</button></div>
          {!extra && <button className="pmg-btn ghost" onClick={onClose}>BACK</button>}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  INTRO — the PMG logo spray-painted onto a wall                     */
/* ================================================================== */

function SprayIntro({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(false);
  const finish = () => { if (!doneRef.current) { doneRef.current = true; onDone(); } };

  useEffect(() => {
    const cv = ref.current!, ctx = cv.getContext("2d")!;
    let raf = 0, alive = true, t0 = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const Wd = Math.round(cv.clientWidth * dpr), Hd = Math.round(cv.clientHeight * dpr);
    cv.width = Wd; cv.height = Hd;
    const mk = () => { const c = document.createElement("canvas"); c.width = Wd; c.height = Hd; return c; };
    const wall = mk(), mask = mk(), lay = mk(), mist = mk();
    const wc = wall.getContext("2d")!, mc = mask.getContext("2d")!, lc = lay.getContext("2d")!, sc = mist.getContext("2d")!;

    // concrete wall under a street light
    const r = rng(77);
    wc.fillStyle = "#2c2b2d"; wc.fillRect(0, 0, Wd, Hd);
    for (let i = 0; i < (Wd * Hd) / 90; i++) { const v = 30 + r() * 38; wc.fillStyle = `rgba(${v},${v},${v + 2},0.6)`; wc.fillRect(r() * Wd, r() * Hd, 2 * dpr, 2 * dpr); }
    wc.strokeStyle = "rgba(0,0,0,0.35)"; wc.lineWidth = 2 * dpr;
    for (let y = Hd * 0.18; y < Hd; y += Hd * 0.26) { wc.beginPath(); wc.moveTo(0, y); wc.lineTo(Wd, y + r() * 6); wc.stroke(); }
    const lg = wc.createRadialGradient(Wd / 2, Hd * 0.42, 10, Wd / 2, Hd * 0.45, Math.max(Wd, Hd) * 0.7);
    lg.addColorStop(0, "rgba(255,210,160,0.18)"); lg.addColorStop(0.5, "rgba(0,0,0,0.25)"); lg.addColorStop(1, "rgba(0,0,0,0.85)");
    wc.fillStyle = lg; wc.fillRect(0, 0, Wd, Hd);

    // soft, speckled spray brush
    const B = 128, brush = document.createElement("canvas"); brush.width = brush.height = B;
    const bc = brush.getContext("2d")!;
    const bg = bc.createRadialGradient(B / 2, B / 2, 0, B / 2, B / 2, B / 2);
    bg.addColorStop(0, "rgba(0,0,0,1)"); bg.addColorStop(0.55, "rgba(0,0,0,0.9)"); bg.addColorStop(1, "rgba(0,0,0,0)");
    bc.fillStyle = bg; bc.fillRect(0, 0, B, B);
    for (let i = 0; i < 260; i++) { const a = r() * Math.PI * 2, d = (0.45 + r() * 0.55) * B / 2; bc.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.7})`; bc.fillRect(B / 2 + Math.cos(a) * d, B / 2 + Math.sin(a) * d, 1.6, 1.6); }

    let logo: HTMLImageElement | null = null, logoFailed = false;

    // the real spray can, rendered in 3D on a small transparent canvas each frame
    const CW = 220, CH = 380;
    let canR: THREE.WebGLRenderer | null = null, canScene: THREE.Scene | null = null, canCam: THREE.PerspectiveCamera | null = null, can: THREE.Object3D | null = null;
    try {
      canR = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      canR.setSize(CW, CH, false); canR.setClearColor(0x000000, 0); canR.outputColorSpace = THREE.SRGBColorSpace; canR.toneMapping = THREE.ACESFilmicToneMapping;
      canScene = new THREE.Scene();
      canScene.add(new THREE.HemisphereLight(0xfff0e0, 0x303030, 1.6));
      const k = new THREE.DirectionalLight(0xffffff, 3); k.position.set(-1, 2, 2); canScene.add(k);
      const rimL = new THREE.DirectionalLight(0xffc890, 2.5); rimL.position.set(2, 1, -1); canScene.add(rimL);
      canCam = new THREE.PerspectiveCamera(28, CW / CH, 0.01, 10); canCam.position.set(0, 0.1, 0.52); canCam.lookAt(0, 0.1, 0);
      new GLTFLoader().loadAsync(PROP_URLS.spraycan).then((g) => {
        can = g.scene;
        normalizeObject(can, 0.28);
        canScene?.add(can);
      }).catch(() => {});
    } catch { canR = null; }

    let L = { x: 0, y: 0, w: 0, h: 0 };
    getLogo().then((im) => {
      logo = im; if (!im) { logoFailed = true; return; }
      const w = Math.min(Wd * 0.72, Hd * 0.62 * (im.naturalWidth / im.naturalHeight));
      L = { x: (Wd - w) / 2, y: Hd * 0.44 - (w * im.naturalHeight / im.naturalWidth) / 2, w, h: w * im.naturalHeight / im.naturalWidth };
    });

    // the painter's hand: back-and-forth passes, top to bottom
    const ROWS = 6, SPRAY = 2.6;
    const nozzle = (u: number): [number, number] => {
      const k = Math.min(ROWS - 1e-6, u * ROWS), row = Math.floor(k), f = k - row;
      const dir = row % 2 === 0 ? 1 : -1;
      const x = L.x - L.w * 0.06 + (dir > 0 ? f : 1 - f) * L.w * 1.12;
      const y = L.y + ((row + 0.5) / ROWS) * L.h + Math.sin(f * Math.PI * 3) * L.h * 0.03;
      return [x, y];
    };
    let lastU = 0;
    const mistDots: { x: number; y: number; vx: number; vy: number; life: number; t: number; r: number }[] = [];

    const frame = (now: number) => {
      if (!alive) return;
      if (!t0) t0 = now;
      const t = (now - t0) / 1000;
      ctx.globalAlpha = Math.min(1, t / 0.4); ctx.drawImage(wall, 0, 0); ctx.globalAlpha = 1;

      if (logo && L.w) {
        const u = Math.min(1, Math.max(0, (t - 0.45) / SPRAY));
        // stamp paint into the mask along the path travelled since last frame
        const rad = (L.h / ROWS) * 1.25;
        for (let k = 0; k <= 14; k++) {
          const uu = lastU + (u - lastU) * (k / 14);
          if (uu <= 0) continue;
          const [x, y] = nozzle(uu);
          mc.globalAlpha = 0.5; mc.drawImage(brush, x - rad, y - rad, rad * 2, rad * 2);
        }
        if (u >= 1) { mc.globalAlpha = 0.25; mc.fillStyle = "#000"; mc.fillRect(L.x - 20, L.y - 20, L.w + 40, L.h + 40); }   // settle fully
        // overspray mist around the nozzle
        if (u > 0 && u < 1) {
          const [x, y] = nozzle(u);
          for (let k = 0; k < 3; k++) mistDots.push({ x, y, vx: (r() - 0.5) * 2.5 * dpr, vy: (r() - 0.7) * 1.6 * dpr, life: 0.4 + r() * 0.4, t: 0, r: (4 + r() * 9) * dpr });
          sc.globalAlpha = 0.05; sc.fillStyle = "#0a0a0a";
          for (let k = 0; k < 18; k++) { const a = r() * Math.PI * 2, d = rad * (0.9 + r() * 0.9); sc.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 2 * dpr, 2 * dpr); }
        }
        lastU = u;
        lc.clearRect(0, 0, Wd, Hd);
        lc.globalCompositeOperation = "source-over"; lc.drawImage(logo, L.x, L.y, L.w, L.h);
        lc.globalCompositeOperation = "destination-in"; lc.drawImage(mask, 0, 0);
        lc.globalCompositeOperation = "source-over";
        ctx.drawImage(mist, 0, 0);
        // wet-paint drips growing after the spray
        const dt = Math.max(0, t - 0.45 - SPRAY);
        if (dt > 0) {
          ctx.fillStyle = "#0b0b0c";
          for (const [fx, len, w] of [[0.24, 0.16, 5], [0.47, 0.22, 4], [0.66, 0.12, 6], [0.83, 0.19, 4]] as [number, number, number][]) {
            const grow = Math.min(1, dt / 0.9) * len * L.h, x = L.x + fx * L.w, y = L.y + L.h * 0.8;
            ctx.fillRect(x - (w * dpr) / 2, y, w * dpr, grow);
            ctx.beginPath(); ctx.arc(x, y + grow, w * dpr * 0.9, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.drawImage(lay, 0, 0);
        for (const m of mistDots) {
          m.t += 1 / 60; m.x += m.vx; m.y += m.vy;
          const a = Math.max(0, 1 - m.t / m.life) * 0.07;
          ctx.fillStyle = `rgba(200,200,205,${a})`; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * (1 + m.t * 2), 0, Math.PI * 2); ctx.fill();
        }
        for (let i = mistDots.length - 1; i >= 0; i--) if (mistDots[i].t > mistDots[i].life) mistDots.splice(i, 1);
        // the spray can follows the nozzle (3D model; simple drawn can if the model can't load)
        if (u > 0 && u < 1) {
          const [x, y] = nozzle(u), s = Math.max(0.7, L.w / (900 * dpr)) * dpr;
          if (can && canR && canScene && canCam) {
            can.rotation.set(0.25 + Math.sin(t * 9) * 0.04, -0.6 + Math.sin(t * 3) * 0.15, 0.45 + Math.sin(t * 7) * 0.05);  // tilted toward the wall, hand shake
            canR.render(canScene, canCam);
            const dw = CW * s * 0.95, dh = CH * s * 0.95;
            ctx.drawImage(canR.domElement, x - dw * 0.18, y - dh * 0.12, dw, dh);
          } else {
            ctx.save(); ctx.translate(x + 38 * s, y - 70 * s); ctx.rotate(0.35);
            ctx.fillStyle = "#15151a"; ctx.fillRect(-22 * s, 0, 44 * s, 110 * s);
            ctx.fillStyle = "#6a1a5a"; ctx.beginPath(); ctx.ellipse(0, 0, 20 * s, 9 * s, 0, Math.PI, 0); ctx.fill();
            ctx.restore();
          }
        }
        // "presents" + flash
        const pt = t - 0.45 - SPRAY - 0.7;
        if (pt > 0) {
          if (pt < 0.25) { ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - pt / 0.25)})`; ctx.fillRect(0, 0, Wd, Hd); }
          ctx.globalAlpha = Math.min(1, pt / 0.4);
          ctx.fillStyle = "#e9e3d6"; ctx.font = `${Math.round(Math.min(Wd, Hd * 1.6) * 0.028)}px ${HUDF}`; ctx.textAlign = "center";
          ctx.fillText("P R O P M Y G A N D A   P R E S E N T S", Wd / 2, L.y + L.h + Hd * 0.1);
          ctx.globalAlpha = 1;
        }
        const out = t - 0.45 - SPRAY - 2.3;
        if (out > 0) { ctx.fillStyle = `rgba(5,3,4,${Math.min(1, out / 0.5)})`; ctx.fillRect(0, 0, Wd, Hd); if (out > 0.55) { finish(); return; } }
      } else if (logoFailed && t > 1.2) { finish(); return; }            // no logo file: skip straight to the menu
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(raf); canR?.dispose(); };
  }, []);

  return (
    <div className="pmg-intro" onClick={() => { Sound.unlock(); finish(); }}>
      <canvas ref={ref} />
      <button className="pmg-skip" type="button" onPointerDown={(event) => { event.stopPropagation(); Sound.unlock(); finish(); }} onClick={(event) => { event.stopPropagation(); Sound.unlock(); finish(); }}>TAP TO SKIP</button>
    </div>
  );
}

export default function PMGFight3D({ onExit }: { onExit?: () => void }) {
  const [screen, setScreen] = useState<"intro" | "menu" | "select" | "stage" | "fight">("intro");
  const [loc, setLoc] = useState<LocationId>("streets");
  const [stagePics, setStagePics] = useState<Record<string, string> | null>(null);
  const [mode, setMode] = useState<"cpu" | "2p">("cpu");
  const [picks, setPicks] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [portraits, setPortraits] = useState<Record<string, string> | null>(null);
  const [settings, setSettings] = useState(false);
  const isTouch = useIsTouch();

  useEffect(() => { if (screen !== "intro" && !portraits) renderPortraits().then(setPortraits); }, [screen, portraits]);
  useEffect(() => { getLogo(); }, []);
  useEffect(() => { if (screen === "stage" && !stagePics) renderStagePreviews().then(setStagePics); }, [screen, stagePics]);
  useEffect(() => () => Sound.pause(), []);

  const choose = (i: number) => {
    const next = [...picks, i];
    if (next.length === 2) { setPicks(next); setScreen("stage"); }
    else setPicks(next);
  };

  return (
    <div className="pmg" onPointerDownCapture={() => Sound.unlock()} onKeyDownCapture={() => Sound.unlock()}>
      <style>{CSS}</style>
      {onExit && <button className="pmg-mini pmg-exit" onClick={onExit}>← PROPWORLD</button>}
      {screen === "intro" && <SprayIntro onDone={() => setScreen("menu")} />}
      {settings && <SettingsPanel onClose={() => setSettings(false)} />}

      {screen === "menu" && (
        <>
          <h1 className="pmg-titlewrap" aria-label="PMG Fight">
            <img className="pmg-titlelogo" src={LOGO_URL} alt="PMG" />
            <span className="pmg-fight">FIGHT</span>
          </h1>
          <p className="pmg-tag">STREETS OF NEW YORK</p>
          <p className="pmg-sub">The Propmyganda roster settles it on the block. Best of three rounds.</p>
          <div className="pmg-col">
            <button className="pmg-btn" onClick={() => { setMode("cpu"); setPicks([]); setScreen("select"); }}>
              1 PLAYER<small>You vs the computer · phone, tablet or PC</small>
            </button>
            <button className="pmg-btn ghost" onClick={() => { setMode("2p"); setPicks([]); setScreen("select"); }}>
              2 PLAYERS<small>Two people, one keyboard</small>
            </button>
            <button className="pmg-btn ghost" onClick={() => setSettings(true)}>SETTINGS<small>Music · sound effects · next song</small></button>
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
                {portraits?.[r.id] ? <img src={portraits[r.id]} alt={`${r.name} portrait`} /> : <div className="ph">{portraits ? "NO MODEL" : "LOADING…"}</div>}
                {picks[0] === i && <span className="pmg-badge">P1</span>}
                <h3>{r.name.toUpperCase()}</h3>
                <div className="bar" style={{ background: r.color }} />
                <div className="meta">{r.lookLabel} · {r.style}</div>
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

      {screen === "stage" && picks.length === 2 && (
        <>
          <h1 className="pmg-h2">SELECT LOCATION</h1>
          <p className="pmg-sub">{ROSTER[picks[0]].name} vs {ROSTER[picks[1]].name}. Where does it go down?</p>
          <div className="pmg-locs">
            {LOCATIONS.map((l) => (
              <button key={l.id} className="pmg-card pmg-loc" onClick={() => { setLoc(l.id); setRound((r) => r + 1); setScreen("fight"); }}>
                {stagePics?.[l.id] ? <img src={stagePics[l.id]} alt={`${l.name} preview`} /> : <div className="ph">{stagePics ? "PREVIEW UNAVAILABLE" : "LOADING…"}</div>}
                <h3>{l.name.toUpperCase()}</h3>
                <div className="meta">{l.blurb}</div>
              </button>
            ))}
          </div>
          <div className="pmg-col" style={{ marginTop: 18 }}>
            <button className="pmg-btn ghost" onClick={() => { setPicks([]); setScreen("select"); }}>BACK</button>
          </div>
        </>
      )}

      {screen === "fight" && picks.length === 2 && (
        <FightView3D
          key={round}
          p1={ROSTER[picks[0]]} p2={ROSTER[picks[1]]} cpu={mode === "cpu"} isTouch={isTouch} loc={loc}
          onRematch={() => setRound((r) => r + 1)}
          onChange={() => { setPicks([]); setScreen("select"); }}
          onStage={() => setScreen("stage")}
          onMenu={() => { setPicks([]); setScreen("menu"); }}
        />
      )}
    </div>
  );
}

function FightView3D(props: {
  p1: FighterDef; p2: FighterDef; cpu: boolean; isTouch: boolean; loc: LocationId;
  onRematch: () => void; onChange: () => void; onMenu: () => void; onStage: () => void;
}) {
  const { p1, p2, cpu, isTouch, loc } = props;
  const glRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [over, setOver] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; if (gameRef.current) gameRef.current.ctl.forEach((c) => { c.left = c.right = c.up = c.down = false; c.queue.length = 0; }); }, [paused]);
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

  // 3D scene, game loop, keyboard
  useEffect(() => {
    let alive = true, raf = 0;
    const cleanups: (() => void)[] = [];
    (async () => {
      let a1: Asset, a2: Asset;
      await getLogo();
       const stagePreload = loc === "subway"
         ? Promise.all([loadGLB("subway"), loadGLB("bench"), loadGLB("rat")])
         : Promise.all([loadGLB("dumpster"), loadGLB("rat"), loadGLB("car"), loadGLB("billboard")]);
      try { [a1, a2] = await Promise.all([loadFighter(p1.id), loadFighter(p2.id)]); await stagePreload; }
      catch { if (alive) setStatus("error"); return; }
      if (!alive) return;

      const canvas = glRef.current!, hud = hudRef.current!;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const stage = buildStage(renderer, loc);
      const cam = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 80);
      const rigs = [makeRig(a1, p1.color), makeRig(a2, p2.color)];
      rigs.forEach((r) => stage.scene.add(r.root));
      const fx = makeFx(stage.scene);
      const hctx = hud.getContext("2d")!;
      cleanups.push(() => { renderer.dispose(); stage.scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); }); });

      // HUD portraits
      const pics: (HTMLImageElement | null)[] = [null, null];
      renderPortraits().then((pp) => [p1, p2].forEach((d, i) => { if (pp[d.id]) { const im = new Image(); im.src = pp[d.id]; pics[i] = im; } }));

      const g = newGame(p1, p2, cpu, () => setOver(true));
      gameRef.current = g;
      updateCamera(cam, g, true);
      setStatus("ready");

      const map = new Map<string, [0 | 1, Action]>();
      Object.entries(KEYS_P1).forEach(([k, a]) => map.set(k, [0, a]));
      Object.entries(KEYS_P2).forEach(([k, a]) => map.set(k, [cpu ? 0 : 1, a]));
      const isHold = (a: Action): a is "left" | "right" | "up" | "down" => a === "left" || a === "right" || a === "up" || a === "down";
      const down = (e: KeyboardEvent) => {
        if (e.code === "Escape" || e.code === "KeyP") { setPaused((v) => !v); return; }
        if (pausedRef.current) return;
        const hit = map.get(e.code); if (!hit) return;
        e.preventDefault();
        const [pi, a] = hit, c = g.ctl[pi];
        if (isHold(a)) c[a] = true; else if (!e.repeat) c.queue.push(a);
      };
      const up = (e: KeyboardEvent) => { const hit = map.get(e.code); if (!hit) return; const [pi, a] = hit; if (isHold(a)) g.ctl[pi][a] = false; };
      const blur = () => g.ctl.forEach((c) => { c.left = c.right = c.up = c.down = false; });
      window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
      cleanups.push(() => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); });

      const v = new THREE.Vector3();
      const project = (x: number, y: number, z: number): [number, number] => { v.set(x, y, z).project(cam); return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H]; };

      let last = performance.now(), acc = 0, clock = 0;
      const loop = (now: number) => {
        const dtMs = Math.min(now - last, 100); last = now; acc += dtMs; clock += dtMs / 1000;
        let n = 0;
        if (pausedRef.current) acc = 0;
        while (acc >= FRAME_MS && n < 5) { tick(g); acc -= FRAME_MS; n++; }
        // size the drawing buffers to the element
        const cw = canvas.clientWidth, ch = canvas.clientHeight;
        if (cw && (canvas.width !== Math.round(cw * renderer.getPixelRatio()) || canvas.height !== Math.round(ch * renderer.getPixelRatio()))) {
          renderer.setSize(cw, ch, false); cam.aspect = cw / ch; cam.updateProjectionMatrix();
          const dpr = Math.min(2, window.devicePixelRatio || 1); hud.width = cw * dpr; hud.height = ch * dpr;
        }
        const slow = pausedRef.current ? 0 : g.slow > 0 ? 0.5 : 1;
        rigs.forEach((r, i) => poseRig(r, g.f[i], (dtMs / 1000) * slow, clock));
        updateStage(stage, g, clock, pausedRef.current ? 0 : dtMs / 1000);
        updateFx(fx, g);
        if (g.sfx.length) { const seen = new Set<string>(); for (const e of g.sfx) if (!seen.has(e)) { seen.add(e); Sound.play(e); } g.sfx.length = 0; }
        updateCamera(cam, g);
        renderer.render(stage.scene, cam);
        hctx.setTransform(hud.width / W, 0, 0, hud.height / H, 0, 0);
        hctx.clearRect(0, 0, W, H);
        drawHud(hctx, g, isTouch, project, pics);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();
    return () => { alive = false; cancelAnimationFrame(raf); cleanups.forEach((f) => f()); };
  }, [p1, p2, cpu, isTouch, loc]);

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
        <canvas ref={glRef} className="pmg-canvas" style={{ width: size.w, height: size.h }} />
        <canvas ref={hudRef} style={{ position: "absolute", left: 3, top: 3, width: size.w, height: size.h, pointerEvents: "none" }} />
        {status !== "ready" && (
          <div className="pmg-load">
            {status === "loading" ? "LOADING FIGHTERS…" : `COULDN'T LOAD THE FIGHTER FILES. CHECK THAT ${p1.id}.glb AND ${p2.id}.glb ARE IN THE public FOLDER`}
          </div>
        )}
        <div className="pmg-top"><button className="pmg-mini" onClick={() => setPaused(true)}>MENU</button></div>
        {paused && (
          <SettingsPanel onClose={() => setPaused(false)} extra={<>
            <button className="pmg-btn" onClick={() => setPaused(false)}>RESUME</button>
            <button className="pmg-btn ghost" onClick={props.onChange}>CHANGE FIGHTERS</button>
            <button className="pmg-btn ghost" onClick={props.onStage}>CHANGE LOCATION</button>
            <button className="pmg-btn ghost" onClick={props.onMenu}>QUIT TO TITLE</button>
          </>} />
        )}
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
