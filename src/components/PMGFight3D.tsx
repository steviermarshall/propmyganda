/**
 * PMG FIGHT 3D — browser version
 * Def Jam-style street fight for the Propmyganda roster, in real 3D (three.js).
 * Play: arcade rules — move and jump (WASD or arrow keys), crouch, hold BACK to block, sweeps, jump-ins, signature special.
 * Animation: each fighter holds a stance for their fighting style (see STANCES), feet stay planted on the floor,
 * knockdowns land flat on the back and go limp, and the CharacterAnatomyController adds breathing, weight and hit recoil.
 *
 * Lovable build: every file below is imported from its src/assets/pmg/*.asset.json entry (Lovable's asset CDN):
 *   jpeez.glb  jahballa.glb  stockz.glb  zoe.glb  hammad.glb  katbot.glb   (fighters, meshopt-compressed)
 *   dumpster car billboard rat subway bench spraycan .glb                (stage props + the intro's spray can)
 *   portrait-<fighter>.jpg  stage-<location>.jpg                        (select-screen cards; optional — rendered live if missing)
 *   pmg-logo.png  sign-34th.jpg                                         (intro + title, subway sign)
 *   song-*.mp3                                                          (music, listed in SONGS below)
 *
 * First fight downloads about 2.5 MB (two fighters + one stage) instead of the old 20 MB: only the picked fighters and the chosen stage load.
 * Lovable: lives at  src/components/PMGFight3D.tsx ; Propworld renders <PMGFight3D onExit={...} />.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as RPointerEvent, ReactNode } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import pmgGraffitiLogo from "@/assets/pmg/pmg-logo-correct.png.asset.json";
import jpeezModel from "@/assets/pmg/jpeez-v2.glb.asset.json";
import jahballaModel from "@/assets/pmg/jahballa-v2.glb.asset.json";
import stockzModel from "@/assets/pmg/stockz-v2.glb.asset.json";
import zoeModel from "@/assets/pmg/zoe-v2.glb.asset.json";
import hammadModel from "@/assets/pmg/hammad-v2.glb.asset.json";
import katbotModel from "@/assets/pmg/katbot-v2.glb.asset.json";
import subwayModel from "@/assets/pmg/subway-v2.glb.asset.json";
import benchModel from "@/assets/pmg/bench-v2.glb.asset.json";
import spraycanModel from "@/assets/pmg/spraycan-v2.glb.asset.json";
import ratModel from "@/assets/pmg/rat-v2.glb.asset.json";
import dumpsterModel from "@/assets/pmg/dumpster-v2.glb.asset.json";
import billboardModel from "@/assets/pmg/billboard-v2.glb.asset.json";
import carModel from "@/assets/pmg/car-v2.glb.asset.json";
import portrait_jpeezPic from "@/assets/pmg/portrait-jpeez.jpg.asset.json";
import portrait_jahballaPic from "@/assets/pmg/portrait-jahballa.jpg.asset.json";
import portrait_stockzPic from "@/assets/pmg/portrait-stockz.jpg.asset.json";
import portrait_zoePic from "@/assets/pmg/portrait-zoe.jpg.asset.json";
import portrait_katbotPic from "@/assets/pmg/portrait-katbot.jpg.asset.json";
import portrait_hammadPic from "@/assets/pmg/portrait-hammad.jpg.asset.json";
import stage_streetsPic from "@/assets/pmg/stage-streets.jpg.asset.json";
import stage_subwayPic from "@/assets/pmg/stage-subway.jpg.asset.json";
import sign34Pic from "@/assets/pmg/sign-34th.jpg.asset.json";
import voice_fight from "@/assets/pmg/voice-fight.mp3.asset.json";
import voice_final from "@/assets/pmg/voice-final.mp3.asset.json";
import voice_finisher from "@/assets/pmg/voice-finisher.mp3.asset.json";
import voice_ko from "@/assets/pmg/voice-ko.mp3.asset.json";
import voice_perfect from "@/assets/pmg/voice-perfect.mp3.asset.json";
import voice_round1 from "@/assets/pmg/voice-round1.mp3.asset.json";
import voice_round2 from "@/assets/pmg/voice-round2.mp3.asset.json";
import dirtyDanTrack from "@/assets/pmg/song-dirty-dan.mp3.asset.json";
import stockzTrack from "@/assets/pmg/song-fine-tiino-stockz.mp3.asset.json";
import jahballaPrideTrack from "@/assets/pmg/song-jahballa-pride.mp3.asset.json";
import zoeTrack from "@/assets/pmg/song-zoe-tuesday-rayny.mp3.asset.json";

/** Where the game files live: Lovable's asset CDN (the .asset.json files in src/assets/pmg). The -v2 models are meshopt-compressed. */
const ASSET_URLS: Record<string, string> = {
  jpeez: jpeezModel.url, jahballa: jahballaModel.url, stockz: stockzModel.url, zoe: zoeModel.url, hammad: hammadModel.url, katbot: katbotModel.url, subway: subwayModel.url, bench: benchModel.url, spraycan: spraycanModel.url, rat: ratModel.url, dumpster: dumpsterModel.url, billboard: billboardModel.url, car: carModel.url,
  "portrait-jpeez": portrait_jpeezPic.url, "portrait-jahballa": portrait_jahballaPic.url, "portrait-stockz": portrait_stockzPic.url, "portrait-zoe": portrait_zoePic.url, "portrait-katbot": portrait_katbotPic.url, "portrait-hammad": portrait_hammadPic.url, "stage-streets": stage_streetsPic.url, "stage-subway": stage_subwayPic.url, "sign-34th": sign34Pic.url,
};
/** Resolve a file name to its hosted copy; unknown names return "" so loaders fail fast and fall back. */
const assetUrl = (name: string) => ASSET_URLS[name] ?? "";
const LOGO_URL = pmgGraffitiLogo.url;
/** Pre-rendered pictures for the select screens (made with tools/render-cards). If one is missing the game renders it from the 3D model instead. */
const PORTRAIT_URL = (id: string) => assetUrl(`portrait-${id}`);
const STAGE_PIC_URL = (id: string) => assetUrl(`stage-${id}`);
/** Announcer and fighter voice lines (ElevenLabs clips): round1 round2 final fight ko perfect finisher wins-<id> quote-<id>. A missing clip is skipped. */
const VOICE_URLS: Record<string, string> = { "fight": voice_fight.url, "final": voice_final.url, "finisher": voice_finisher.url, "ko": voice_ko.url, "perfect": voice_perfect.url, "round1": voice_round1.url, "round2": voice_round2.url };
const voiceUrl = (name: string) => VOICE_URLS[name] ?? "";

/** Every .glb is meshopt-compressed (about 4× smaller than the originals), so each loader gets the decoder. */
function gltfLoader() { const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder); return l; }

/** Music — plays in random order. Add a song: put the mp3 in public/pmg and add a line here. */
const SONGS = [
  { url: zoeTrack.url,           title: "Zoe — Tuesday Rayny" },
  { url: stockzTrack.url,        title: "Fine — Tiino x Stockz" },
  { url: dirtyDanTrack.url,      title: "Dirty Dan" },
  { url: jahballaPrideTrack.url, title: "JahBalla — Pride" },
];

/* ================================================================== */
/*  ROSTER                                                             */
/* ================================================================== */

type Btn = "punch" | "kick" | "special" | "grab" | "dodge" | "parry" | "duck" | "sig";   // sig = the signature move: hold Punch about a third of a second, let go
type Arch = "aggressive" | "technical" | "balanced";
type ProjKind = "record" | "gold" | "ticker" | "note" | "wave" | "paw";

/** Fighting style — picks the idle stance automatically (see STANCES). A new fighter only needs one of these. */
type FightStyle = "Streetfighter" | "Kickboxer" | "Submission";

/** Combat archetypes (from the PMG Master Rumble design). Each fighting style fights as one of these.
 *  strikeMod = damage ×, speedMod = walk speed and move speed ×, reachMod = punch/kick reach ×. Tweak the numbers here. */
type ArchetypeKind = "BRAWLER" | "KICKBOXER" | "SUBMISSION";
/** takenMod = damage taken × (the archetype's weakness), grabMod = grab damage and reach ×. Tuned with sim/matchup.ts so every fighter lands near 50 %. */
interface ArchetypeStats { kind: ArchetypeKind; displayName: string; strikeMod: number; speedMod: number; reachMod: number; takenMod: number; grabMod: number; passiveDesc: string; weakness: string }
const ARCHETYPES: Record<ArchetypeKind, ArchetypeStats> = {
  BRAWLER:    { kind: "BRAWLER",    displayName: "Street Brawler",    strikeMod: 1.16, speedMod: 1.0,  reachMod: 0.9,  takenMod: 1.0,  grabMod: 1.0,  passiveDesc: "Haymaker Criticals: 25% chance to hit for double damage.", weakness: "Shortest reach in the game." },
  KICKBOXER:  { kind: "KICKBOXER",  displayName: "Kickboxer",         strikeMod: 1.12, speedMod: 1.35, reachMod: 1.3,  takenMod: 1.06, grabMod: 0.9,  passiveDesc: "Velocity Footwork: out-reach opponents with minimal frame lag.", weakness: "Glass chin: takes 6% more damage." },
  SUBMISSION: { kind: "SUBMISSION", displayName: "Submission Expert", strikeMod: 1.0,  speedMod: 0.95, reachMod: 1.0,  takenMod: 1.0,  grabMod: 1.0,   passiveDesc: "Adrenaline Drain: grapples hit hard and drain the enemy's heat meter.", weakness: "Slowest hands." },
};
const ARCHETYPE_OF: Record<FightStyle, ArchetypeKind> = { Streetfighter: "BRAWLER", Kickboxer: "KICKBOXER", Submission: "SUBMISSION" };
const archOf = (d: FighterDef) => ARCHETYPES[ARCHETYPE_OF[d.fightStyle]];

interface FighterDef {
  id: string; name: string; lookLabel: string; arch: Arch; style: string; fightStyle: FightStyle;
  power: number; speed: number; defense: number; special: number;
  color: string;                               // signature colour (HUD, specials)
  sig: { name: string; kind: ProjKind };       // signature special — rename after a song if you like
  quote: string;                               // shown on the select screen and in the finisher cutscene
  finisher: string;                            // name of the full-heat cinematic finisher
  sigName: string; sigDesc: string;            // the signature move (hold Punch, let go) and what it does
  headUp?: number;                             // per-fighter: lift the chin if the model's idle looks at the floor
  elbowsIn?: boolean;                          // per-fighter: keep the elbows tight to the ribs
}

const ROSTER: FighterDef[] = [
  { id: "jpeez",    name: "JPeez",    lookLabel: "Street wear",  fightStyle: "Streetfighter", arch: "aggressive", style: "Heavy hitter — slow, but every hit hurts", power: 9, speed: 6, defense: 5, special: 7, color: "#FF8A1F", sig: { name: "HEAT ROCK", kind: "record" }, quote: "Step up or step out.", finisher: "HEAT ROCK REVENGE", sigName: "HAYMAKER", sigDesc: "Slow, huge, and it smashes through a block." },
  { id: "jahballa", name: "JahBalla", lookLabel: "Street wear",  headUp: 0.3, fightStyle: "Streetfighter", arch: "aggressive", style: "Brawler — heavy hands, nonstop pressure",  power: 8, speed: 7, defense: 5, special: 6, color: "#F5C400", sig: { name: "GOLD RUSH", kind: "gold" }, quote: "Respect ain't given here, it's taken.", finisher: "GOLD RUSH SLAM", sigName: "BODY SHOT", sigDesc: "Quick low hook: knocks down and fills your heat." },
  { id: "stockz",   name: "Stockz",   lookLabel: "High fashion", fightStyle: "Kickboxer", arch: "technical",  style: "Technician — fast, safe, precise",         power: 6, speed: 8, defense: 6, special: 8, color: "#3AA0FF", sig: { name: "BULL RUN", kind: "ticker" }, quote: "Your numbers just crashed.", finisher: "BULL RUN MATRIX", sigName: "STEP-IN KICK", sigDesc: "Lunges a full step forward and recovers fast." },
  { id: "zoe",      name: "Zoe",      lookLabel: "High fashion", fightStyle: "Kickboxer", arch: "balanced",   style: "All-rounder — quick feet, sharp kicks",    power: 6, speed: 6, defense: 7, special: 6, color: "#FF5FB0", sig: { name: "HIGH NOTE", kind: "note" }, quote: "Catch the rhythm of this hit.", finisher: "HIGH NOTE FREQUENCY", sigName: "HIGH KICK", sigDesc: "Head-height kick: knocks jumpers out of the air for extra damage." },
  { id: "katbot",   name: "KatBot",   lookLabel: "Street tech",  fightStyle: "Kickboxer", arch: "technical",  style: "Wildcard — fastest in the roster, but fragile", power: 8, speed: 9, defense: 4, special: 8, color: "#B070FF", sig: { name: "NINE LIVES", kind: "paw" }, quote: "Fast hands, faster exits.", finisher: "NINE LIVES BLITZ", sigName: "NINE LIVES DASH", sigDesc: "Blinks through the rival and hits them from behind." },
  { id: "hammad",   name: "Hammad",   lookLabel: "Casual",       fightStyle: "Submission", arch: "balanced",   style: "All-rounder — solid at every range",       power: 7, speed: 7, defense: 6, special: 6, color: "#2ED47A", sig: { name: "BASS DROP", kind: "wave" }, quote: "Feel the pressure drop.", finisher: "BASS DROP CHOKE", sigName: "CHOKE SLAM", sigDesc: "Long-reach grab that can't be dodged and breaks a block." },
];

const ZOOM = 1.25;                                    // gameplay: max distance apart = what the camera can show
/* ================================================================== */
/*  MOVES — frame data (60 frames = 1 second)                          */
/* ================================================================== */

type Pose = "jab" | "cross" | "hook" | "roundhouse" | "lowpunch" | "sweep" | "airpunch" | "airkick" | "fireball" | "grab";

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
  // signature-move properties
  lunge?: number;                  // units travelled forward during the startup (the step-in)
  guardCrush?: boolean;            // a block only takes 40 % off it, and it still knocks down
  antiAir?: number;                // damage × against an airborne rival, and it knocks them down
  crossUp?: boolean;               // blinks to the far side of the rival as the hit comes out
  heatGain?: number;               // extra heat for the attacker on hit
  noDodge?: boolean;               // a sidestep does not escape it (grabs only; a duck never beats a grab anyway)
  onBlock?: number;                // frame advantage when blocked: + = the attacker moves first, − = the defender can punish
}

/** Counter-hit: striking a rival while their own attack is still winding up. */
const COUNTER_DMG = 1.3, COUNTER_STUN = 12;

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
    LP:  mk({ id: "LP",  btn: "punch", pose: "jab",   startup: 5 + d.su, recovery: 9 + d.rec,  damage: 5,         hitstun: 16, blockstun: 11 + d.bs, hitstop: 4, reach: 80, chain: "LP2", cancelStart: 7, cancelEnd: 14 + d.cw, onBlock: 2 }),
    LP2: mk({ id: "LP2", btn: "punch", pose: "cross", startup: 6 + d.su, recovery: 11 + d.rec, damage: 6,         hitstun: 17, blockstun: 11 + d.bs, hitstop: 5, reach: 82, knockback: 5, chain: "LP3", chainOnly: true, cancelStart: 8, cancelEnd: 16 + d.cw, onBlock: 0 }),
    LP3: mk({ id: "LP3", btn: "punch", pose: "hook",  startup: 8 + d.su, active: 4, recovery: 18 + d.rec, damage: 9 + d.dmg, hitstun: 22, blockstun: 13 + d.bs, hitstop: 9, reach: 88, knockback: 9, knockdown: true, chainOnly: true, onBlock: -4 }),
    // standing kick: roundhouse, also a good anti-air
    HK:  mk({ id: "HK",  btn: "kick", pose: "roundhouse", height: 140, startup: 11 + d.su, active: 5, recovery: 20 + d.rec, damage: 12 + d.dmg, hitstun: 22, blockstun: 13 + d.bs, hitstop: 9, reach: 104, knockback: 8, knockdown: true, onBlock: -6 }),
    // crouching
    CP:  mk({ id: "CP",  btn: "punch", pose: "lowpunch", ctx: "crouch", height: 108, startup: 4 + d.su, recovery: 8 + d.rec, damage: 4, hitstun: 14, blockstun: 10 + d.bs, hitstop: 4, reach: 78, knockback: 3, onBlock: 1 }),
    CK:  mk({ id: "CK",  btn: "kick",  pose: "sweep", ctx: "crouch", level: "low", height: 10, startup: 8 + d.su, active: 4, recovery: 22 + d.rec, damage: 9 + d.dmg, hitstun: 20, blockstun: 12, hitstop: 7, reach: 112, knockback: 6, knockdown: true, onBlock: -10 }),
    // jumping
    JP:  mk({ id: "JP",  btn: "punch", pose: "airpunch", ctx: "air", level: "air", height: 90, startup: 3, active: 12, recovery: 6, damage: 7, hitstun: 18, blockstun: 12, hitstop: 6, reach: 76, knockback: 4 }),
    JK:  mk({ id: "JK",  btn: "kick",  pose: "airkick",  ctx: "air", level: "air", height: 60, startup: 4, active: 14, recovery: 6, damage: 9 + d.dmg, hitstun: 20, blockstun: 13, hitstop: 7, reach: 92, knockback: 5 }),
    // special: throws a flaming PMG record
    SP:  mk({ id: "SP",  btn: "special", pose: "fireball", startup: 13 + d.su, active: 1, recovery: 26 + d.rec, damage: 12 + d.dmg, hitstun: 22, blockstun: 14, hitstop: 6, knockback: 6, cost: SP_COST, projectile: true }),
    // grapple: grab and slam. Goes straight through a block (GUARD BREAK) and can't be parried — but you can dodge it
    GR:  mk({ id: "GR",  btn: "grab", pose: "grab", startup: 6, active: 3, recovery: 26, damage: 12, hitstun: 0, blockstun: 0, hitstop: 9, reach: 64, knockback: 5, knockdown: true }),
  };
}

/** One signature move per fighter — the thing that makes JPeez play differently from JahBalla. Input: hold Punch, let go. */
function sigMoveFor(id: string): Move {
  const base: Move = { id: "SIG", btn: "sig", pose: "hook", ctx: "stand", level: "high", height: 160, startup: 10, active: 4, recovery: 20, damage: 12,
    hitstun: 22, blockstun: 14, hitstop: 8, reach: 90, knockback: 8, knockdown: true, cost: 0, cancelStart: 0, cancelEnd: 0 };
  switch (id) {
    case "jpeez":    return { ...base, pose: "hook",       startup: 14, active: 4, recovery: 24, damage: 19, hitstop: 12, reach: 86, knockback: 11, guardCrush: true };        // HAYMAKER
    case "jahballa": return { ...base, pose: "lowpunch",   startup: 7,  active: 3, recovery: 16, damage: 10, height: 110, reach: 80, knockback: 7, heatGain: 20, onBlock: -6 };           // BODY SHOT
    case "stockz":   return { ...base, pose: "roundhouse", startup: 9,  active: 5, recovery: 10, damage: 9, height: 130, reach: 112, knockback: 9, lunge: 60, onBlock: -5 }; // STEP-IN KICK (fast recovery: only -3 on block)
    case "zoe":      return { ...base, pose: "roundhouse", startup: 6,  active: 6, recovery: 18, damage: 11, height: 195, reach: 100, knockback: 6, knockdown: false, antiAir: 1.6, onBlock: -6 }; // HIGH KICK
    case "katbot":   return { ...base, pose: "cross",      startup: 8,  active: 4, recovery: 14, damage: 13, reach: 90, knockback: 9, crossUp: true, hitstun: 26, onBlock: -4 };          // NINE LIVES DASH
    case "hammad":   return { ...base, btn: "grab", pose: "grab", startup: 12, active: 3, recovery: 30, damage: 12, reach: 92, knockback: 6, hitstop: 10, noDodge: true };   // CHOKE SLAM
    default:         return base;
  }
}

/** Archetype footwork: Kickboxers reach further and recover faster, Brawlers work up close, Submission grabs reach further and hit harder. */
function withArchetype(moves: Record<string, Move>, def: FighterDef): Record<string, Move> {
  const a = archOf(def);
  moves.SIG = sigMoveFor(def.id);
  for (const m of Object.values(moves)) {
    if (m.projectile) continue;
    if (m.btn === "grab") { m.reach = Math.round(m.reach * a.grabMod); m.damage = Math.round(m.damage * a.grabMod); }
    else if (m.id !== "SIG") m.reach = Math.round(m.reach * a.reachMod);
    if (m.id !== "SIG") { m.startup = Math.max(2, Math.round(m.startup / a.speedMod)); m.recovery = Math.max(4, Math.round(m.recovery / a.speedMod)); }
  }
  return moves;
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

type St = "idle" | "walk" | "crouch" | "jump" | "block" | "attack" | "hitstun" | "blockstun" | "knockdown" | "wakeup" | "ko" | "win" | "dodge" | "parry" | "duck";

interface Fighter {
  def: FighterDef; moves: Record<string, Move>; tag: string;
  x: number; y: number; vx: number; vy: number; facing: 1 | -1;
  air: boolean; airUsed: boolean; crouch: boolean; back: boolean;
  hp: number; lag: number; sta: number;
  heat: number;                    // 0–100, builds from landing and taking hits; full = cinematic finisher
  state: St; sf: number; dur: number;
  move: Move | null; hitDone: boolean; connected: boolean;
  combo: number; hitstop: number; flash: number;
  buffer: { b: Btn; age: number }[];
  qDown: number; qReady: number;
}

interface Ctl { left: boolean; right: boolean; up: boolean; down: boolean; queue: Btn[]; charge: number }   // charge = frames Punch has been held (≥ 20 arms the signature)
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
  impacts: { who: 0 | 1; dir: 1 | -1; force: number }[];     // hits for the anatomy controllers to react to
  ai: { t: number; walk: number; guard: number; low: boolean; react: number; crouch: number; airKick: boolean };
  aiLevel: number;                 // 0 easy, 1 medium, 2 hard — set by the turf
  cine: { who: 0 | 1; t: number } | null;   // the 4-second finisher cutscene
  ev: string[];                    // what happened this tick ("hit:0:LP", "blocked:1", "ducked:0" …) — the tutorial reads these
  tut: Tut | null;                 // first-play tutorial, see TUT_STEPS
  touch: boolean;                  // phone controls — picks the wording of hints
  onOver: () => void;
}
interface Tut { step: number; t: number; wait: number }

const newCtl = (): Ctl => ({ left: false, right: false, up: false, down: false, queue: [], charge: 0 });
const SIG_HOLD = 20;                                         // frames of holding Punch before letting go fires the signature

function newFighter(def: FighterDef, tag: string): Fighter {
  return {
    def, moves: withArchetype(movesFor(def.arch), def), tag, x: 0, y: 0, vx: 0, vy: 0, facing: 1,
    air: false, airUsed: false, crouch: false, back: false,
    hp: 100, lag: 100, sta: 25, heat: 0, state: "idle", sf: 0, dur: 0,
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
  g.sparks = []; g.proj = []; g.comboShow = [{ n: 0, t: 0 }, { n: 0, t: 0 }]; g.cine = null;
}

function newGame(p1: FighterDef, p2: FighterDef, cpu: boolean, onOver: () => void, aiLevel = 1): Game {
  const g: Game = {
    f: [newFighter(p1, "P1"), newFighter(p2, cpu ? "CPU" : "P2")],
    ctl: [newCtl(), newCtl()], cpu, phase: "intro", pf: 0, timer: 0, round: 1,
    wins: [0, 0], roundWinner: -1, msg: "", frame: 0, sparks: [], proj: [],
    comboShow: [{ n: 0, t: 0 }, { n: 0, t: 0 }], hype: 0, slow: 0, shake: 0, sfx: [], dust: [], camX: (W - W / ZOOM) / 2, camY: H - H / ZOOM,
    callout: [{ text: "", t: 0 }, { text: "", t: 0 }], impacts: [],
    ai: { t: 20, walk: 0, guard: 0, low: false, react: 0, crouch: 0, airKick: false }, aiLevel, cine: null, ev: [], tut: null, touch: false, onOver,
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
/** Dodge: frames 2–16 of the sidestep pass cleanly under anything except the finisher. */
const dodging = (f: Fighter) => f.state === "dodge" && f.sf >= 2 && f.sf <= 16;
/** Duck: frames 2–20 drop under punches, high kicks and specials. Sweeps, low punches, jump-ins and grabs still hit. */
const ducking = (f: Fighter) => f.state === "duck" && f.sf >= 2 && f.sf <= 20;
const duckable = (m: Move) => m.ctx === "stand" && m.btn !== "grab";
/** Parry: the first 8 frames after pressing it catch a strike or special. */
const parrying = (f: Fighter) => f.state === "parry" && f.sf <= 8;

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
  if (b === "grab") return f.air ? null : M.GR;
  if (b === "sig") return f.air ? null : M.SIG;
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
  flat?: boolean;                  // finisher: fixed damage, no stat or combo scaling
}

function landHit(g: Game, i: 0 | 1, o: HitOpts) {
  const a = g.f[i], d = g.f[1 - i];
  let dmg = o.flat ? o.damage : o.damage * powerMult(a.def) * archOf(a.def).strikeMod * Math.max(0.3, 1 - 0.1 * a.combo);
  if (o.blocked) dmg *= 0.12;
  // Brawler passive: haymaker criticals
  if (!o.blocked && !o.flat && archOf(a.def).kind === "BRAWLER" && Math.random() < 0.25) { dmg *= 2; g.callout[i] = { text: "CRITICAL!", t: 45 }; g.sfx.push("hitHeavy"); }
  dmg *= takenMult(d.def) * (o.flat ? 1 : archOf(d.def).takenMod);
  if (!o.flat) { a.heat = Math.min(100, a.heat + (o.blocked ? 2 : 9)); d.heat = Math.min(100, d.heat + (o.blocked ? 3 : 4)); }
  if (g.tut) dmg = Math.min(dmg, d.hp - 1);                       // nobody gets knocked out in class (a critical haymaker could do it)
  d.hp = Math.max(0, d.hp - dmg);
  if (!o.blocked && !d.air && Math.abs(a.x - d.x) > 4) d.facing = a.x > d.x ? 1 : -1;    // hit from behind (a cross-up): turn round to face them
  d.move = null; d.flash = 6; d.hitstop = o.hitstop;
  if (!o.proj) a.hitstop = o.hitstop;                  // both freeze = the punch "lands"
  g.sparks.push({ x: o.sx, y: o.sy, t: 14, blocked: o.blocked });
  g.impacts.push({ who: (1 - i) as 0 | 1, dir: o.dir, force: (o.blocked ? 0.35 : 0.9) + o.knockback * 0.18 + (o.proj ? 0.6 : 0) });
  if (g.impacts.length > 8) g.impacts.shift();
  g.sfx.push(o.blocked ? "block" : o.proj ? "blast" : o.knockdown || o.damage >= 9 ? "hitHeavy" : "hit");

  // pinned in the corner? the attacker gets pushed back instead
  if (!o.proj && !a.air && (d.x <= 60 || d.x >= W - 60)) a.vx = -a.facing * o.knockback * 0.6;

  if (o.blocked) {
    d.vx = o.dir * o.knockback * 0.5;
    setState(d, "blockstun", o.blockstun);
    a.sta = Math.min(100, a.sta + 1.5);
    g.ev.push(`blocked:${1 - i}`);
    return;
  }
  a.combo++; a.sta = Math.min(100, a.sta + 6);
  g.ev.push(`combo:${i}:${a.combo}`);
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
  if (dist < -10 || dist > m.reach + 22) return;
  if (dodging(d) && !m.noDodge) {                               // slipped it: the move whiffs (Hammad's choke can't be slipped)
    a.hitDone = true; g.callout[1 - i] = { text: "EVADED!", t: 40 }; g.sfx.push("dodge"); g.ev.push(`evaded:${1 - i}`); return;
  }
  if (ducking(d) && duckable(m)) {                              // ducked under it
    a.hitDone = true; g.callout[1 - i] = { text: "DUCKED!", t: 40 }; g.sfx.push("dodge"); g.ev.push(`ducked:${1 - i}`); return;
  }
  if (invulnerable(d)) return;
  if (m.btn === "grab") {
    if (d.air) return;
    a.hitDone = true; a.connected = true;
    const guardBreak = d.state === "block" || d.state === "blockstun" || (d.back && canBlockState(d));
    landHit(g, i, { damage: m.damage * (guardBreak ? 1.3 : 1), hitstun: 0, blockstun: 0, hitstop: m.hitstop, knockback: m.knockback, knockdown: true,
      sx: a.x + a.facing * 40, sy: GROUND - 120, blocked: false, proj: false, dir: a.facing });
    g.sfx.push("grab"); g.ev.push(`grab:${i}`);
    if (m.id === "SIG") { g.callout[i] = { text: a.def.sigName + "!", t: 50 }; g.ev.push(`sig:${i}`); }
    else if (guardBreak) g.callout[i] = { text: "GUARD BREAK!", t: 50 };
    if (archOf(a.def).kind === "SUBMISSION") { d.heat = Math.max(0, d.heat - (m.id === "SIG" ? 35 : 25)); if (!guardBreak && m.id !== "SIG") g.callout[i] = { text: "HEAT DRAINED", t: 45 }; }
    return;
  }
  if (parrying(d)) { a.hitDone = true; parried(g, (1 - i) as 0 | 1); return; }
  const hy = a.y - m.height;                                    // negative = above the ground
  const top = d.y - (d.crouch && !d.air ? 160 : 200);
  if ((a.air || d.air) && (hy < top - 12 || hy > d.y + 12)) return;
  if (d.air && m.level === "low") return;

  a.hitDone = true; a.connected = true;
  const levelOk = m.level === "low" ? d.crouch : m.level === "air" ? !d.crouch : true;
  // a cross-up switches sides a frame before it lands: holding back from either side blocks it (too fast to read otherwise)
  const dc = g.ctl[1 - i], holdingSide = dc.left || dc.right;
  let blocked = (m.crossUp ? holdingSide : d.back) && canBlockState(d) && levelOk;
  let damage = m.damage, knockdown = m.knockdown, hitstun = m.hitstun, blockstun = m.blockstun;
  if (blocked && m.guardCrush) { blocked = false; damage *= 0.6; g.callout[i] = { text: "GUARD CRUSH!", t: 50 }; }     // the haymaker goes through a block
  if (m.antiAir && d.air) { damage *= m.antiAir; knockdown = true; g.callout[i] = { text: "OUT OF THE AIR!", t: 45 }; }
  // counter-hit: caught them winding up — more damage and longer stun, so a jab links into the roundhouse
  if (!blocked && d.state === "attack" && d.move && !d.move.projectile && d.sf - 1 < d.move.startup) {
    damage *= COUNTER_DMG; hitstun += COUNTER_STUN;
    if (g.callout[i].t <= 0 || !/!$/.test(g.callout[i].text) || g.callout[i].text === "COUNTER!") g.callout[i] = { text: "COUNTER!", t: 40 };
    g.sfx.push("hitHeavy"); g.ev.push(`counter:${i}`);
  }
  // frame advantage on block: the defender stays stuck exactly long enough that the attacker is +N (or −N) when both can act
  if (blocked && m.onBlock !== undefined && !a.air) {
    const left = m.startup + m.active + m.recovery - 1 - (a.sf - 1);          // frames of this move the attacker still has to play out
    blockstun = Math.max(4, left + m.onBlock + 1);                             // +1: the defender's stun starts counting a frame later than the attacker's
  }
  if (!blocked) g.ev.push(`hit:${i}:${m.id}`);
  landHit(g, i, {
    damage, hitstun, blockstun, hitstop: m.hitstop, knockback: m.knockback,
    knockdown, sx: a.x + a.facing * Math.max(12, Math.min(dist, m.reach) * 0.85), sy: GROUND + hy,
    blocked, proj: false, dir: a.facing,
  });
  if (m.id === "SIG") {
    if (!blocked) { a.heat = Math.min(100, a.heat + (m.heatGain ?? 0)); if (g.callout[i].t <= 0) g.callout[i] = { text: a.def.sigName + "!", t: 50 }; }
    g.ev.push(`sig:${i}`);
  }
}

/** A frame-perfect parry: no damage, the attacker is frozen open, the parrier gets heat. */
function parried(g: Game, di: 0 | 1) {
  const d = g.f[di], a = g.f[1 - di];
  setState(d, "idle"); d.heat = Math.min(100, d.heat + 15);
  if (!a.air) { a.move = null; setState(a, "hitstun", 45); a.vx = -a.facing * 3; }
  a.combo = 0;
  g.sparks.push({ x: (a.x + d.x) / 2, y: GROUND - 150, t: 14, blocked: true });
  g.callout[di] = { text: "PARRY!", t: 50 }; g.sfx.push("parry"); g.slow = 10; g.ev.push(`parry:${di}`);
}

function spawnProjectile(g: Game, i: 0 | 1) {
  const f = g.f[i];
  g.sfx.push("special");
  g.proj.push({ x: f.x + f.facing * 70, y: -140, dir: f.facing, owner: i, speed: 6 + f.def.speed * 0.25, dmg: f.move!.damage, spin: 0, kind: f.def.sig.kind, col: f.def.color });
  g.callout[i] = { text: f.def.sig.name + "!", t: 60 }; g.ev.push(`special:${i}`);
}

function stepProjectiles(g: Game) {
  for (const p of g.proj) {
    p.x += p.dir * p.speed; p.spin += 0.35;
    const d = g.f[1 - p.owner];
    if (Math.abs(p.x - d.x) < 34 && d.y > -70 && parrying(d)) {
      p.dead = true; setState(d, "idle"); d.heat = Math.min(100, d.heat + 10);
      g.sparks.push({ x: p.x, y: GROUND + p.y, t: 14, blocked: true }); g.callout[d === g.f[0] ? 0 : 1] = { text: "PARRY!", t: 50 }; g.sfx.push("parry");
      continue;
    }
    const under = ducking(d) || (d.crouch && !d.air && (d.state === "crouch" || d.state === "block"));
    if (under && Math.abs(p.x - d.x) < 34 && !(p as { ducked?: boolean }).ducked) {   // the special sails overhead
      (p as { ducked?: boolean }).ducked = true; g.callout[d === g.f[0] ? 0 : 1] = { text: "DUCKED!", t: 40 }; g.sfx.push("dodge");
    }
    if (!invulnerable(d) && !dodging(d) && !under && Math.abs(p.x - d.x) < 34 && d.y > -70) {
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
      // the chained punches step in: the first jab's knockback pushes the rival just out of a Brawler's reach otherwise
      if (m.chainOnly && !f.air && fr < m.startup) f.x += f.facing * 3.2;
      if (m.lunge && !f.air && fr < m.startup) f.x = Math.max(40, Math.min(W - 40, f.x + f.facing * (m.lunge / m.startup)));
      if (m.crossUp && fr === m.startup - 1 && !o.air) {                            // blink to the far side, strike from behind
        f.x = Math.max(40, Math.min(W - 40, o.x + f.facing * 60)); f.facing = o.x >= f.x ? 1 : -1; kickUpDust(g, f.x, 4, 40); g.sfx.push("dodge");   // rival in the corner: no room behind them, so don't end up facing the wall
      }
      if (m.projectile) { if (fr === m.startup) spawnProjectile(g, i); }
      else if (!f.hitDone && fr >= m.startup && fr < m.startup + m.active) tryHit(g, i);
      if (f.state === "attack" && fr >= m.startup + m.active + m.recovery - 1) { f.move = null; setState(f, f.air ? "jump" : "idle"); }
      break;
    }
    case "hitstun":   if (f.sf >= f.dur) { o.combo = 0; setState(f, "idle"); } break;
    case "blockstun": if (f.sf >= f.dur) setState(f, "idle"); break;
    case "knockdown": if (f.air) f.sf = 0; else if (f.sf >= f.dur) { o.combo = 0; setState(f, "wakeup", 22); } break;
    case "wakeup":    if (f.sf >= f.dur) setState(f, "idle"); break;
    case "dodge": case "parry": case "duck": if (f.sf >= f.dur) setState(f, "idle"); break;
  }

  // turn to face the rival before reading block or starting a move: after a jump over someone (theirs or yours),
  // the first attack out of landing used to go off backwards, and every buffered move after it stayed turned away
  if (live && isFree(f)) f.facing = o.x >= f.x ? 1 : -1;

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
    if (e.b === "special" && f.heat >= 100 && !f.air && !g.cine && isFree(f)) startFinisher(g, i);
    else if (e.b === "dodge" || e.b === "parry" || e.b === "duck") {
      if (isFree(f)) { f.crouch = false; setState(f, e.b, e.b === "dodge" ? 24 : e.b === "duck" ? 26 : 20); g.sfx.push(e.b === "parry" ? "swing" : "dodge"); }
    } else {
      const m = chooseMove(g, i, e.b);
      if (m) { const had = f.move; startMove(f, m); if (f.move !== had) g.sfx.push(m.projectile ? "charge" : m.id === "SIG" || m.btn === "kick" ? "swingHeavy" : "swing"); }
    }
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
      f.x += dir * BASE_WALK * speedMult(f.def) * archOf(f.def).speedMod * (dir !== f.facing ? 0.7 : 1);
      if (f.state !== "walk") setState(f, "walk");
    } else if (f.state !== "idle") setState(f, "idle");
  }

  if (live) f.sta = Math.min(100, f.sta + regenPerSec(f.def) / 60);
}

/* ---------- the 4-second cinematic finisher ---------- */
const CINE_FRAMES = 150;                                     // 2.5 seconds
function startFinisher(g: Game, i: 0 | 1) {
  const f = g.f[i];
  f.heat = 0; f.move = f.moves.SP; f.hitDone = true; setState(f, "attack"); f.sf = 9;   // wind-up pose, hands glowing
  g.cine = { who: i, t: 0 }; g.proj = [];
  g.ctl.forEach((c) => { c.queue.length = 0; }); g.f.forEach((x) => { x.buffer = []; });
  g.sfx.push("finisher"); g.sfx.push("say:finisher"); g.ev.push(`finisher:${i}`);
}
function tickCine(g: Game) {
  const c = g.cine!; c.t++;
  if (c.t === 45 || c.t === 97) g.sfx.push("charge");
  if (c.t < CINE_FRAMES) return;
  const a = g.f[c.who], d = g.f[1 - c.who];
  g.cine = null;
  a.sf = (a.move?.startup ?? 12) + 1;                                   // release (no projectile: the hit lands directly)
  landHit(g, c.who, { damage: 35, hitstun: 30, blockstun: 0, hitstop: 12, knockback: 10, knockdown: true,
    sx: d.x, sy: GROUND - 120, blocked: false, proj: true, dir: a.facing, flat: true });   // unblockable
  g.callout[c.who] = { text: a.def.finisher + "!", t: 90 }; g.shake = 20; g.slow = 30; g.sfx.push("blast");
}

function keepApart(g: Game) {
  const [a, b] = g.f;
  const clamp = (f: Fighter) => { f.x = Math.max(40, Math.min(W - 40, f.x)); };
  clamp(a); clamp(b);
  const far = b.x - a.x, maxSep = W / ZOOM - 90;             // the camera can't show them further apart
  if (Math.abs(far) > maxSep) { const e = (Math.abs(far) - maxSep) / 2, s2 = far > 0 ? 1 : -1; a.x += e * s2; b.x -= e * s2; clamp(a); clamp(b); }
  if (Math.abs(a.y - b.y) > 90) return;                     // you can jump over each other
  const dx = b.x - a.x, min = 80;                         // bodies never pass through each other
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
  // full heat: sometimes cash it in on the finisher
  if (me.heat >= 100 && isFree(me) && Math.random() < 0.02 + g.aiLevel * 0.01) { c.queue.push("special"); return; }

  // keep a punch string going once it connects
  if (me.state === "attack" && me.connected && me.move?.chain && Math.random() < 0.3) c.queue.push("punch");

  // react like a person: at most one decision every 12–26 frames
  if (ai.react > 0) ai.react--;
  else {
    const incoming = g.proj.some((p) => p.owner === 0 && (me.x - p.x) * p.dir > 0 && Math.abs(me.x - p.x) < 240);
    const swing = opp.state === "attack" && !!opp.move && opp.sf - 1 < opp.move.startup + 2 && dist < 180;
    const diving = opp.air && dist < 220 && opp.vx * toward < 0;
    if (incoming || swing || diving) {
      ai.react = [20, 12, 8][g.aiLevel] + Math.floor(Math.random() * 14);
      const r = Math.random();
      const def = [0.08, 0.14, 0.22][g.aiLevel];                     // chance to dodge / parry, by difficulty
      if ((incoming || (swing && opp.move && duckable(opp.move))) && r < def * 0.8) { c.queue.push("duck"); return; }
      if ((incoming || swing) && r < def * 1.4) { c.queue.push("dodge"); return; }
      if ((incoming || swing) && r < def * 2.2) { c.queue.push("parry"); return; }
      if (incoming) {
        if (r < 0.3) { c.up = true; walk(toward); ai.airKick = true; return; }
        if (r < 0.75) { ai.guard = 22; ai.low = false; walk(-toward); return; }
      } else if (diving) {
        if (r < 0.35) { c.queue.push(me.def.id === "zoe" ? "sig" : "kick"); return; }      // Zoe's high kick is made for this
        if (r < 0.7) { ai.guard = 24; ai.low = false; walk(-toward); return; }
      } else if (r < 0.5 && opp.move) {
        ai.guard = 16; ai.low = opp.move.level === "low"; walk(-toward); c.down = ai.low; return;
      }
    }
  }

  // punish: the rival's move was blocked and they're still stuck in it — hit back before they recover
  if (isFree(me) && opp.state === "attack" && opp.move && !opp.move.projectile && opp.sf - 1 > opp.move.startup + opp.move.active && dist < me.moves.LP.reach + 10
      && Math.random() < [0.25, 0.5, 0.75][g.aiLevel]) {
    const left = opp.move.startup + opp.move.active + opp.move.recovery - opp.sf;
    c.queue.push(left > me.moves.HK.startup + 2 ? "kick" : "punch"); ai.t = 8; return;
  }

  if (--ai.t > 0) { walk(ai.walk); return; }
  ai.t = 10 + Math.random() * 16;
  const r = Math.random();
  ai.walk = 0;
  const kind = archOf(me.def).kind, sigRate = [0.08, 0.12, 0.16][g.aiLevel];
  const oppDown = opp.state === "knockdown" || opp.state === "wakeup";
  if (dist > 320) {
    if (me.sta >= SP_COST && r < 0.35) c.queue.push("special"); else ai.walk = toward;
  } else if (kind === "KICKBOXER") {
    // KICKBOXER: lives at the end of its kick. Too close → step out; at kick range → poke; just outside → close in (Stockz lunges).
    const poke = me.moves.HK.reach;
    if (dist < 78) {
      if (me.def.id === "katbot" && r < 0.3) c.queue.push("sig");                       // cross-up from point blank
      else if (r < 0.5) { ai.walk = -toward; ai.t = 8 + Math.random() * 8; }
      else if (r < 0.75) c.queue.push("punch");
      else if (r < 0.85) c.queue.push("grab");
      else { ai.crouch = 10; c.down = true; c.queue.push("kick"); }
    } else if (dist <= poke + 6) {
      if (r < 0.38) c.queue.push("kick");
      else if (r < 0.52) { ai.crouch = 14; c.down = true; c.queue.push("kick"); }        // sweep
      else if (r < 0.52 + sigRate) c.queue.push("sig");
      else if (r < 0.8) c.queue.push("punch");
      else ai.walk = -toward;
    } else if (me.def.id === "stockz" && dist <= poke + 70 && r < 0.35) {
      c.queue.push("sig");                                                                // step-in kick from outside their reach
    } else if (dist > 170 && me.sta >= SP_COST && r < 0.25) {
      c.queue.push("special");
    } else ai.walk = toward;
  } else if (kind === "SUBMISSION") {
    // SUBMISSION: get them down, stand over them, choke them as they get up.
    if (oppDown) { ai.walk = dist > 70 ? toward : 0; ai.t = 4; }
    else if (opp.state === "idle" && opp.sf < 8 && dist < me.moves.SIG.reach + 10 && r < 0.45) c.queue.push("sig");      // wake-up choke
    else if (dist > 170) {
      if (me.sta >= SP_COST && r < 0.25) c.queue.push("special"); else ai.walk = toward;
    } else if (dist > 92) {
      if (dist < me.moves.SIG.reach + 6 && r < sigRate * 1.5) c.queue.push("sig"); else ai.walk = toward;
    } else {
      if (opp.state === "block" && r < 0.6) c.queue.push("sig");                         // a block won't save them
      else if (r < 0.3) { ai.crouch = 14; c.down = true; c.queue.push("kick"); }       // sweep → knockdown → wake-up choke
      else if (r < 0.45) c.queue.push("grab");
      else if (r < 0.75) c.queue.push("punch");
      else if (r < 0.88) c.queue.push("kick");
      else ai.walk = -toward;
    }
  } else if (dist > 170) {
    if (r < 0.18) { c.up = true; walk(toward); ai.airKick = true; return; }
    if (me.sta >= SP_COST && r < 0.3) c.queue.push("special"); else ai.walk = toward;
  } else if (dist > 88) {
    ai.walk = toward;
  } else {
    // BRAWLER: walks you down and keeps swinging — punch strings, the signature on a block, rarely backs off
    if (opp.state === "block" && r < 0.5) c.queue.push(me.def.id === "jpeez" ? "sig" : "grab");   // turtling? break the guard
    else if (r < 0.1) c.queue.push("grab");
    else if (r < 0.1 + sigRate) c.queue.push("sig");
    else if (r < 0.48) c.queue.push("punch");
    else if (r < 0.62) { ai.crouch = 14; c.down = true; c.queue.push("kick"); }
    else if (r < 0.78) c.queue.push("kick");
    else if (r < 0.92) { ai.crouch = 10; c.down = true; c.queue.push("punch"); }
    else ai.walk = -toward;
  }
  walk(ai.walk);
}

/* ---------- first-play tutorial: ten short lessons on a sparring dummy, about a minute ---------- */
interface TutStep { text: string; keys: string; touch: string; done: (g: Game) => boolean; jab?: boolean; prep?: (g: Game) => void; timeout: number }
const TUT_STEPS: TutStep[] = [
  { text: "WALK UP TO YOUR RIVAL", keys: "{right} or {right2}", touch: "push the stick toward them", done: (g) => Math.abs(g.f[0].x - g.f[1].x) < 150, timeout: 900 },
  { text: "MASH PUNCH FOR THE COMBO", keys: "{punch} · {punch} · {punch}", touch: "P · P · P", done: (g) => g.ev.some((e) => e === "hit:0:LP2" || e === "hit:0:LP3" || (e.startsWith("combo:0:") && Number(e.split(":")[2]) >= 2)), timeout: 900 },
  { text: "KICK — IT KNOCKS THEM DOWN", keys: "{kick}  (crouch + {kick} = sweep)", touch: "K", done: (g) => g.ev.some((e) => /^hit:0:(HK|CK|JK)$/.test(e)), timeout: 720 },
  { text: "BLOCK THE JAB: HOLD BACK (AWAY FROM YOUR RIVAL)", keys: "hold {left} or {left2}", touch: "hold the stick away from them", done: (g) => g.ev.includes("blocked:0"), jab: true, timeout: 720 },
  { text: "DUCK UNDER THE NEXT JAB", keys: "{duck}", touch: "swipe ↓ on the arena", done: (g) => g.ev.includes("ducked:0"), jab: true, timeout: 720 },
  { text: "DODGE THE NEXT JAB", keys: "{dodge}", touch: "swipe ← or → on the arena", done: (g) => g.ev.includes("evaded:0"), jab: true, timeout: 720 },
  { text: "PARRY: PRESS JUST AS THE JAB LANDS", keys: "{parry}", touch: "two-finger tap on the arena", done: (g) => g.ev.includes("parry:0"), jab: true, timeout: 720 },
  { text: "SPECIAL — YOUR BARS ARE FULL", keys: "{special}", touch: "S", done: (g) => g.ev.includes("special:0"), prep: (g) => { g.f[0].sta = 100; }, timeout: 600 },
  { text: "GRAB AND SLAM — IT BREAKS A BLOCK", keys: "{grab}", touch: "G", done: (g) => g.ev.includes("grab:0"), timeout: 600 },
  { text: "YOUR SIGNATURE: HOLD PUNCH, THEN LET GO", keys: "hold {punch} a moment, release", touch: "hold P a moment, release", done: (g) => g.ev.includes("sig:0"), timeout: 720 },
  { text: "YOUR HEAT IS FULL — HIT THE FINISHER", keys: "{special}", touch: "S", done: (g) => g.ev.includes("finisher:0"), prep: (g) => { g.f[0].heat = 100; }, timeout: 600 },
];
function startTutorial(g: Game) {
  g.tut = { step: 0, t: 0, wait: 0 };
  g.phase = "fight"; g.msg = ""; g.timer = 99 * 60;
}
function finishTutorial(g: Game) {
  g.tut = null; store.set("tutorial-done", true); Profile.push();
  g.round = 1; g.wins = [0, 0]; g.msg = "";
  startRound(g);
}
function tickTutorial(g: Game) {
  const t = g.tut!, p = g.f[0], d = g.f[1], c = g.ctl[1];
  g.timer = 99 * 60;                                                  // the clock waits
  p.hp = Math.max(p.hp, 60); d.lag = d.hp = Math.max(d.hp, 50);      // nobody gets knocked out in class
  const step = TUT_STEPS[t.step];
  t.t++;
  if (t.t === 1) { step.prep?.(g); g.sfx.push("round"); } else if (t.t % 30 === 0) step.prep?.(g);
  // the sparring dummy: walks into range, stands there, and only jabs when the lesson asks for it
  c.left = c.right = c.up = c.down = false;
  const dist = Math.abs(d.x - p.x), toward = p.x > d.x ? 1 : -1;
  if (t.step > 0 && dist > 120 && isFree(d)) { if (toward > 0) c.right = true; else c.left = true; }
  if (step.jab && t.t % 100 === 40 && isFree(d) && dist < 130) c.queue.push("punch");
  if (t.wait > 0) {
    if (--t.wait === 0) { t.step++; t.t = 0; if (t.step >= TUT_STEPS.length) finishTutorial(g); }
    return;
  }
  if (step.done(g)) { t.wait = 50; g.callout[0] = { text: "NICE!", t: 50 }; g.sfx.push("fight"); }
  else if (t.t >= step.timeout) { t.wait = 50; g.callout[0] = { text: "WE'LL PRACTISE THAT LATER", t: 60 }; }
}

function endRound(g: Game, winner: number, label: string) {
  g.phase = "roundEnd"; g.pf = 0; g.msg = label; g.roundWinner = winner; g.proj = [];
  if (winner >= 0) g.wins[winner as 0 | 1]++;
}

function tick(g: Game) {
  if (g.slow > 0) { g.slow--; if (g.slow % 2 === 1) return; }   // K.O. slow-motion
  g.frame++;
  if (g.cine) {                                               // the world holds still while the finisher plays
    tickCine(g);
    g.sparks.forEach((s) => s.t--); g.sparks = g.sparks.filter((s) => s.t > 0);
    g.callout.forEach((c) => { if (c.t > 0) c.t--; });
    return;
  }
  if (g.cpu && !g.tut) cpuThink(g);
  stepFighter(g, 0); stepFighter(g, 1); stepProjectiles(g); keepApart(g);
  if (g.tut) tickTutorial(g);
  g.ev.length = 0;

  g.sparks.forEach((s) => s.t--); g.sparks = g.sparks.filter((s) => s.t > 0);
  g.dust.forEach((p) => { p.t++; p.x += p.vx; p.y += p.vy; p.vx *= 0.93; }); g.dust = g.dust.filter((p) => p.t < p.life);
  g.comboShow.forEach((c) => { if (c.t > 0) c.t--; });
  g.callout.forEach((c) => { if (c.t > 0) c.t--; });
  g.f.forEach((f) => { f.lag = Math.max(f.hp, f.lag - 0.4); });
  g.hype = Math.max(0, g.hype - 0.4);
  if (g.shake > 0) g.shake--;

  if (g.tut) return;                                          // the tutorial runs its own clock (see tickTutorial)
  switch (g.phase) {
    case "intro":
      g.pf++;
      if (g.pf === 1) { g.sfx.push("round"); g.sfx.push(`say:${g.round >= 3 ? "final" : g.round === 2 ? "round2" : "round1"}`); }
      if (g.pf === 70) { g.sfx.push("fight"); g.sfx.push("say:fight"); }
      g.msg = g.pf < 70 ? `ROUND ${g.round}` : "FIGHT!";
      if (g.pf >= 105) { g.phase = "fight"; g.msg = ""; }
      break;
    case "fight": {
      g.timer--;
      const out0 = g.f[0].hp <= 0, out1 = g.f[1].hp <= 0;
      if (out0 && out1) { endRound(g, -1, "DOUBLE K.O."); g.sfx.push("say:ko"); }          // traded the last hit: nobody takes the round
      else if (out0 || out1) { endRound(g, out0 ? 1 : 0, "K.O."); g.sfx.push("say:ko"); }
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
          g.sfx.push(w.hp >= 100 ? "say:perfect" : `say:wins-${w.def.id}`);
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
const U = 0.009;                                      // one game unit in metres (fighters ≈ 200 units ≈ 1.8 m)
const X3 = (x: number) => (x - W / 2) * U;
const Y3 = (y: number) => -y * U;

/* ---------- model loading (cached, shared between screens) ---------- */

interface Asset { scene: THREE.Group; clips: THREE.AnimationClip[] }
const assetCache = new Map<string, Promise<Asset>>();
function loadFighter(id: string): Promise<Asset> {
  let p = assetCache.get(id);
  if (!p) {
    p = gltfLoader().loadAsync(assetUrl(id)).then((g) => {
      // The Mixamo idles move the hips around the floor (JPeez's travel 57 cm forward and back, JahBalla's 52 cm).
      // Where a fighter stands is the game's job, so drop the hips' travel: the body stays on its spot and the
      // stances + foot planting do the rest.
      for (const c of g.animations) c.tracks = c.tracks.filter((tr) => !/Hips\.position$/.test(tr.name));
      return { scene: g.scene as THREE.Group, clips: g.animations };
    });
    assetCache.set(id, p);
    p.catch(() => assetCache.delete(id));
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
/** Turf: each location has a difficulty (how sharp the computer fights) and a Street Cred bounty for winning there. */
type Difficulty = "EASY" | "MEDIUM" | "HARD";
const LOCATIONS: { id: LocationId; name: string; blurb: string; difficulty: Difficulty; credBonus: number }[] = [
  { id: "streets", name: "The Streets", blurb: "A fenced lot on the block — dumpsters, the crew, the PMG wall", difficulty: "EASY", credBonus: 100 },
  { id: "subway", name: "Subway Station", blurb: "34th Street platform after the last train", difficulty: "MEDIUM", credBonus: 250 },
];
const AI_LEVEL: Record<Difficulty, number> = { EASY: 0, MEDIUM: 1, HARD: 2 };
const BOUNTY: Record<Difficulty, number> = { EASY: 100, MEDIUM: 250, HARD: 500 };     // Street Cred for winning the match
const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

/** What Street Cred buys. KATBOT and HARD TURF change the game; the other two are flex. */
type UnlockId = "goldtag" | "katbot" | "altcolors" | "hardturf";
const UNLOCKS: { id: UnlockId; name: string; cost: number; blurb: string }[] = [
  { id: "goldtag",   name: "GOLD NAME PLATE", cost: 500,  blurb: "Your name and P1 tag in gold chrome on the fight HUD." },
  { id: "katbot",    name: "KATBOT",          cost: 2000, blurb: "The wildcard joins your roster: fastest fighter in the game, fragile as glass. Until then the computer keeps KatBot for itself." },
  { id: "altcolors", name: "ALT COLORS",      cost: 1500, blurb: "A second colour set for your fighter — glow, special, callouts and HUD. Switch it on and off here." },
  { id: "hardturf",  name: "HARD TURF",       cost: 2500, blurb: "HARD difficulty on every location: the sharpest computer, and a +500 cred bounty per win." },
];
/** Fighters a player has to unlock before picking them (the computer may still use them as a rival). */
const LOCKED_FIGHTER: Partial<Record<string, UnlockId>> = { katbot: "katbot" };
const fighterLocked = (id: string) => { const u = LOCKED_FIGHTER[id]; return !!u && !Cred.has(u); };
const ALT_COLOR: Record<string, string> = { jpeez: "#4FD1FF", jahballa: "#FF3B5C", stockz: "#39E075", zoe: "#B76BFF", katbot: "#C6FF3A", hammad: "#FF7A1F" };
const withAlt = (d: FighterDef): FighterDef => ({ ...d, color: ALT_COLOR[d.id] ?? d.color });

/** Street Cred: earned by beating the computer, spent on unlocks, kept in this browser. */
const Cred = {
  get(): number { try { const raw = localStorage.getItem("pmg-cred"); if (raw === null) return 1200; const v = Number(raw); return Number.isFinite(v) && v >= 0 ? v : 1200; } catch { return 1200; } },
  set(v: number) { try { localStorage.setItem("pmg-cred", String(v)); } catch { /* private mode */ } Profile.push(); },
  add(n: number): number { const v = this.get() + n; this.set(v); return v; },
  owned(): Set<UnlockId> { try { return new Set(JSON.parse(localStorage.getItem("pmg-unlocks") || "[]") as UnlockId[]); } catch { return new Set(); } },
  has(id: UnlockId): boolean { return this.owned().has(id); },
  /** Buy an unlock: false if it costs more than the balance. */
  buy(id: UnlockId): boolean {
    const u = UNLOCKS.find((x) => x.id === id); if (!u || this.has(id)) return false;
    const bal = this.get(); if (bal < u.cost) return false;
    this.set(bal - u.cost);
    const o = this.owned(); o.add(id);
    try { localStorage.setItem("pmg-unlocks", JSON.stringify([...o])); } catch { /* private mode */ }
    Profile.push();
    return true;
  },
  altOn(): boolean { return this.has("altcolors") && store.get("altcolors", true); },
};

/* ---------- the player's profile: recognised on return, saved in this browser and (when the site has a database) in the cloud ---------- */

/** Everything worth keeping between visits. */
interface Snapshot { cred: number; unlocks: UnlockId[]; tutorial: boolean; matches: number; keys: [Record<string, Action>, Record<string, Action>]; updated: number }
/** Cloud store: the site's database, reached straight over REST so this file needs no client library. Off when the page has no database (the test build). */
const SB_URL: string = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SUPABASE_URL) ?? "";
const SB_KEY: string = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SUPABASE_PUBLISHABLE_KEY) ?? "";
const CLOUD_ON = !!(SB_URL && SB_KEY);
const PROFILE_TABLE = "pmg_fight_profiles";
function sbHeaders(extra: Record<string, string> = {}) { return { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", ...extra }; }

const Profile = {
  pushTimer: 0 as ReturnType<typeof setTimeout> | 0,
  listeners: new Set<() => void>(),
  emit() { this.listeners.forEach((l) => l()); },
  /** The player code: 8 letters/digits, made once, kept in this browser (and a cookie as a backup). Typed on another device, it brings the save along. */
  code(): string {
    let c = "";
    try { c = localStorage.getItem("pmg-player") || ""; } catch { /* private mode */ }
    if (!c) { const m = typeof document !== "undefined" && document.cookie.match(/(?:^|; )pmg_player=([A-Z0-9]{8})/); if (m) c = m[1]; }
    if (!c) { const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; c = Array.from({ length: 8 }, () => A[Math.floor(Math.random() * A.length)]).join(""); }
    this.setCode(c);
    return c;
  },
  setCode(c: string) {
    try { localStorage.setItem("pmg-player", c); } catch { /* private mode */ }
    try { document.cookie = `pmg_player=${c}; max-age=31536000; path=/; SameSite=Lax`; } catch { /* no document */ }
  },
  pretty(c?: string) { const v = c ?? this.code(); return `${v.slice(0, 4)}-${v.slice(4)}`; },
  matches(): number { try { return Number(localStorage.getItem("pmg-matches")) || 0; } catch { return 0; } },
  /** True once this browser has fought: the title says WELCOME BACK instead of PRESS START. */
  returning(): boolean { return this.matches() > 0 || Cred.get() !== 1200 || Cred.owned().size > 0; },
  matchPlayed() { try { localStorage.setItem("pmg-matches", String(this.matches() + 1)); } catch { /* private mode */ } this.push(); },
  updated(): number { try { return Number(localStorage.getItem("pmg-updated")) || 0; } catch { return 0; } },
  touch() { try { localStorage.setItem("pmg-updated", String(Date.now())); } catch { /* private mode */ } },
  snapshot(): Snapshot { return { cred: Cred.get(), unlocks: [...Cred.owned()], tutorial: store.get("tutorial-done", false), matches: this.matches(), keys: [{ ...KEYMAPS[0] }, { ...KEYMAPS[1] }], updated: this.updated() }; },
  /** A browser that has never fought or bought anything: a save from the cloud simply replaces it. */
  fresh(): boolean { const l = this.snapshot(); return l.matches === 0 && l.unlocks.length === 0 && l.cred === 1200; },
  /** Put a saved profile into this browser, replacing what is here. (Never merged: adding cred from two copies would let spent cred come back.) */
  apply(sn: Snapshot) {
    try {
      localStorage.setItem("pmg-cred", String(Math.max(0, Math.floor(sn.cred))));
      localStorage.setItem("pmg-unlocks", JSON.stringify(sn.unlocks.filter((u) => UNLOCKS.some((x) => x.id === u))));
      localStorage.setItem("pmg-matches", String(Math.max(0, sn.matches)));
      localStorage.setItem("pmg-tutorial-done", sn.tutorial || store.get("tutorial-done", false) ? "1" : "0");
      localStorage.setItem("pmg-updated", String(sn.updated));
    } catch { /* private mode */ }
    for (const p of [0, 1] as const) { const m = KEYMAPS[p], src = sn.keys?.[p]; if (src && typeof src === "object" && Object.keys(src).length) { for (const k of Object.keys(m)) delete m[k]; Object.assign(m, src); try { localStorage.setItem("pmg-keys-" + p, JSON.stringify(m)); } catch { /* private mode */ } } }
    this.emit();
  },
  /** Cloud → this browser. Runs once when the game opens (the newer copy wins); typing a code in Settings always takes the cloud copy. */
  async pull(code?: string, explicit = false): Promise<"loaded" | "none" | "off" | "error"> {
    if (!CLOUD_ON) return "off";
    code = code ?? this.code();
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${PROFILE_TABLE}?code=eq.${encodeURIComponent(code)}&select=cred,unlocks,tutorial_done,matches,keys,updated_at`, { headers: sbHeaders() });
      if (!r.ok) return "error";
      const rows = (await r.json()) as { cred: number; unlocks: UnlockId[] | null; tutorial_done: boolean; matches: number | null; keys: Snapshot["keys"] | null; updated_at: string | null }[];
      if (!rows.length) { if (!explicit && !this.fresh()) this.push(); return "none"; }           // first time this browser meets the cloud: send what it has
      const row = rows[0];
      const cloud: Snapshot = { cred: Number(row.cred) || 0, unlocks: row.unlocks ?? [], tutorial: !!row.tutorial_done, matches: row.matches ?? 0, keys: row.keys ?? [{}, {}], updated: row.updated_at ? Date.parse(row.updated_at) : 0 };
      if (explicit || this.fresh() || cloud.updated > this.updated()) this.apply(cloud);
      else this.push();                                                                            // this browser is newer: the cloud catches up
      return "loaded";
    } catch { return "error"; }
  },
  /** This browser → cloud, a moment after the last change (cred won, unlock bought, key rebound, match played). */
  push() {
    if (!CLOUD_ON) return;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.touch();
    this.pushTimer = setTimeout(() => {
      this.pushTimer = 0;
      const sn = this.snapshot();
      fetch(`${SB_URL}/rest/v1/${PROFILE_TABLE}?on_conflict=code`, {
        method: "POST", headers: sbHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify({ code: this.code(), cred: sn.cred, unlocks: sn.unlocks, tutorial_done: sn.tutorial, matches: sn.matches, keys: sn.keys, updated_at: new Date(sn.updated).toISOString() }),
      }).catch(() => { /* offline: the local copy is still the truth; next change retries */ });
    }, 1500);
  },
};

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
    p = gltfLoader().loadAsync(assetUrl(name)).then((g) => {
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
  return loc === "subway" ? buildSubway() : buildStreets(renderer);
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
    jobs.push(loadProp("dumpster").then((d) => { if (!d) return; d.position.set(bx, 0, -1.45); d.rotation.y = ry; scene.add(d); }));
    const light = new THREE.PointLight(0xff7a2a, 12, 10, 1.6); light.position.set(bx * 1.35, 1.2, -0.6); scene.add(light);
    flames.push({ spr: [], light });
  }

  // the Benz parked behind the cage, nose toward the PMG wall; the Propmyganda billboard
  jobs.push(loadProp("car").then((car) => { if (!car) return;
    car.position.set(-3.6, 0, -4.3); car.rotation.y = Math.PI / 2; carEnv(renderer, car); scene.add(car);
  }));
  jobs.push(loadProp("billboard").then((bb) => { if (!bb) return;
    bb.scale.setScalar(0.4); bb.position.set(3.7, -1.85, -5.0); bb.rotation.y = -Math.PI / 2; scene.add(bb);
  }));

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

function buildSubway(): Stage {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080a);
  scene.fog = new THREE.Fog(0x0a0b0d, 10, 26);
  const rats: RatInst[] = [];
  const flicker: THREE.Light[] = [];
  const WALL_Z = -3.3;

  const ready = loadProp("subway").then(async (st) => {
    if (!st) return;
    // the model's back wall runs along its x = -3.6 side: turn it to face the camera, centre it
    st.rotation.y = -Math.PI / 2; scene.add(st); st.updateMatrixWorld(true);
    let wallBox: THREE.Box3 | null = null;
    st.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && /wall/i.test((m.material as THREE.Material).name)) wallBox = new THREE.Box3().setFromObject(m); });
    const wb = (wallBox as THREE.Box3 | null) ?? new THREE.Box3().setFromObject(st);
    const c = wb.getCenter(new THREE.Vector3());
    st.position.x -= c.x; st.position.z += WALL_Z - wb.max.z; st.updateMatrixWorld(true);

    // the 34th Street sign, brought down from high on the wall to where the camera can see it
    new THREE.TextureLoader().loadAsync(assetUrl("sign-34th")).then((tx) => {
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
  stanceW: number;                                               // 0 → 1 blend of the idle stance
  footRest: number;                                              // ankle height above the floor when standing
  hipsRest: THREE.Quaternion;                                    // hips orientation in the model's own space, in the bind pose
  anatomy: CharacterAnatomyController;
  idle: THREE.AnimationAction | null;                            // the model's own idle clip
}

const BONE_NAMES = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "LeftArm", "LeftForeArm", "LeftHand", "RightArm", "RightForeArm", "RightHand",
  "LeftUpLeg", "LeftLeg", "LeftFoot", "RightUpLeg", "RightLeg", "RightFoot"];

function makeRig(asset: Asset, color: string): Rig3 {
  const model = SkeletonUtils.clone(asset.scene);
  model.scale.setScalar(0.01);
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; }
  });
  const bones: Rig3["bones"] = {};
  model.traverse((o) => { if ((o as THREE.Bone).isBone) { const n = o.name.replace(/^mixamorig\d*:?/, ""); if (BONE_NAMES.includes(n)) { bones[n] = o as THREE.Bone; o.userData.rest = o.quaternion.clone(); } } });
  const root = new THREE.Group(); root.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const clip = asset.clips.find((c) => c.duration > 0);
  const idle = clip ? mixer.clipAction(clip) : null;
  idle?.play();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("rgba(255,255,255,1)", color), blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.visible = false; root.add(glow);
  // readability: a cool rim light just behind each fighter's shoulders, so the body outline reads against the dark set
  const rim = new THREE.PointLight(0x9fc4ff, 6, 4.5, 1.6); rim.position.set(0, 1.7, -0.9); root.add(rim);
  root.updateMatrixWorld(true);
  const footRest = Math.min(footY(bones.LeftFoot), footY(bones.RightFoot));   // measured in the bind pose, before the clip runs
  const hipsRest = hipsInModel(model, bones.Hips);
  mixer.update(0.4 + Math.random() * 1.2);                      // prime the clip: no bind-pose (T-pose) frame, and the two fighters don't breathe in sync
  return { root, model, mixer, bones, glow, stanceW: 1, hipsRest, footRest: Number.isFinite(footRest) ? footRest : 0.08, anatomy: new CharacterAnatomyController(), idle };
}

const _f = new THREE.Vector3();
function footY(b: THREE.Bone | undefined) { if (!b) return Infinity; b.getWorldPosition(_f); return _f.y; }
const _mq = new THREE.Quaternion(), _hq = new THREE.Quaternion(), _fv = new THREE.Vector3();
function hipsInModel(model: THREE.Object3D, hips: THREE.Bone | undefined) {
  if (!hips) return new THREE.Quaternion();
  model.getWorldQuaternion(_mq); hips.getWorldQuaternion(_hq);
  return _mq.clone().invert().multiply(_hq);
}
/** Turn the hips so the body squares up to the rival (a little open to the camera), whatever the idle clip does. */
function faceRival(rg: Rig3, s: number) {
  const hips = rg.bones.Hips; if (!hips) return;
  rg.root.updateMatrixWorld(true);
  const q = hipsInModel(rg.model, hips).multiply(rg.hipsRest.clone().invert());   // how far the clip turned the hips
  _fv.set(0, 0, 1).applyQuaternion(q);                                            // model forward is +Z
  const yaw = Math.atan2(_fv.x, _fv.z), want = -s * 0.3;                          // 0.3 rad open toward the camera
  let d = want - yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  turn(hips, UP, d);
}

/** Shift the body up/down so the lower foot sits exactly on the floor — no sinking, no floating. */
function plantFeet(rg: Rig3) {
  rg.root.updateMatrixWorld(true);
  const low = Math.min(footY(rg.bones.LeftFoot), footY(rg.bones.RightFoot)) - rg.root.position.y;
  if (Number.isFinite(low)) rg.model.position.y += rg.footRest - low;
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
const UP = V(0, 1, 0);

/* ---------- idle stances, one per fighting style ---------- */
// Sides: when a fighter faces +x their right side is toward the camera (+z), facing −x it is away (−z) — so every
// sideways offset is multiplied by s. Leaning uses the fixed Z axis: turn(bone, ZAX, -s * k) leans forward by k.

type Bones = Rig3["bones"];
const ZAX = V(0, 0, 1);
const lean = (b: THREE.Bone | undefined, s: number, k: number) => turn(b, ZAX, -s * k);

/** Orthodox stance: left foot leads toward the rival, right foot back, knees soft. `bend` 0 = tall … 1 = low. */
function stanceLegs(B: Bones, s: number, bend: number, w: number) {
  aim(B.LeftUpLeg, B.LeftLeg, V(s * (0.3 + 0.35 * bend), -1, -0.13 * s), w);
  aim(B.LeftLeg, B.LeftFoot, V(-s * (0.02 + 0.25 * bend), -1, -0.04 * s), w);
  aim(B.RightUpLeg, B.RightLeg, V(-s * (0.08 - 0.3 * bend), -1, 0.15 * s), w);
  aim(B.RightLeg, B.RightFoot, V(-s * (0.38 + 0.25 * bend), -1, 0.06 * s), w);
}
/** Fists up: lead (left) hand out in front at chin height, rear (right) hand tucked by the jaw. `hi` lifts both. */
function guardArms(B: Bones, s: number, hi: number, w: number, elbowsIn = false) {
  // elbows down and in, fists up by the chin — compact, the way a real guard sits
  const out = elbowsIn ? 0.08 : 0.3, fwd = elbowsIn ? 0.12 : 0;
  aim(B.LeftArm, B.LeftForeArm, V(s * (0.3 + fwd), -0.88, -out * s), w); aim(B.LeftForeArm, B.LeftHand, V(s * 0.4, 0.9 * hi, (elbowsIn ? 0.02 : 0.22) * s), w);
  aim(B.RightArm, B.RightForeArm, V(s * (0.1 + fwd), -0.95, out * s), w); aim(B.RightForeArm, B.RightHand, V(s * 0.25, hi, (elbowsIn ? -0.04 : -0.32) * s), w);
}

/** The stance each style holds between moves. Add a style here and every fighter with it picks it up. */
const STANCES: Record<FightStyle, (rg: Rig3, s: number, t: number, w: number, d: FighterDef) => void> = {
  // streetfighterIdle — easy bounce in the knees, one bounce every 0.8 s, boxer's guard
  Streetfighter: (rg, s, t, w, d) => {
    const B = rg.bones, b = (1 - Math.cos(t * 7.85)) / 2;
    stanceLegs(B, s, 0.3 + 0.22 * b, w);
    lean(B.Spine, s, 0.08 * w);
    turn(B.Spine1, UP, Math.sin(t * 3.9) * 0.05 * w);
    guardArms(B, s, 1, w, d.elbowsIn);
  },
  // kickboxerIdle — high guard, weight rocking between the front and back foot
  Kickboxer: (rg, s, t, w, d) => {
    const B = rg.bones, sh = Math.sin(t * 5.2);
    stanceLegs(B, s, 0.28 + 0.12 * Math.abs(sh), w);
    turn(B.Hips, UP, sh * 0.07 * w);
    lean(B.Spine, s, (0.04 + sh * 0.04) * w);
    guardArms(B, s, 1.2, w, d.elbowsIn);
  },
  // submissionIdle — low and wide, hands open and forward ready to grab, slow sway
  Submission: (rg, s, t, w) => {
    const B = rg.bones, sw = Math.sin(t * 1.7);
    stanceLegs(B, s, 0.75 + 0.06 * sw, w);
    lean(B.Spine, s, 0.3 * w);
    turn(B.Spine1, UP, sw * 0.08 * w);
    // elbows bent, open hands out in front at chest height, ready to tie up
    aim(B.LeftArm, B.LeftForeArm, V(s * 0.45, -0.8, -0.3 * s), w); aim(B.LeftForeArm, B.LeftHand, V(s * 0.85, 0.45, 0.12 * s), w);
    aim(B.RightArm, B.RightForeArm, V(s * 0.3, -0.85, 0.34 * s), w); aim(B.RightForeArm, B.RightHand, V(s * 0.8, 0.35, -0.2 * s), w);
    lean(B.Head, s, -0.22 * w);                                   // eyes up on the rival despite the lean
  },
};

/* ---------- weight and impact: the CharacterAnatomyController ---------- */
// Built from Cloud's CharacterAnatomyController. Changes to fit this game:
//  • The game logic owns where a fighter stands, so the controller only adds a small, temporary offset on top of that
//    each frame. Impacts become a springy offset that settles back to zero instead of moving the mesh for good
//    (adding to mesh.position every frame would make fighters drift off their spot).
//  • Axes in the fighter's own terms: z = forward toward the rival, x = sideways sway, y = chest heave.
//    Forward/sideways move the body; heave lifts and drops the chest (the feet stay planted on the floor).
//  • Lerp amounts use 1 − e^(−speed·dt), so the smoothing is the same at 30 fps or 144 fps and never overshoots.
type AnatomyState = "IDLE" | "ATTACKING" | "HITSTUN" | "STILL";
interface Vec3o { x: number; y: number; z: number }

class CharacterAnatomyController {
  state: AnatomyState = "IDLE";
  currentOffset: Vec3o = { x: 0, y: 0, z: 0 };
  targetOffset: Vec3o = { x: 0, y: 0, z: 0 };
  impactVelocity: Vec3o = { x: 0, y: 0, z: 0 };
  impactOffset: Vec3o = { x: 0, y: 0, z: 0 };
  breathingTimer = Math.random() * 6;

  /** Call once per rendered frame. */
  update(deltaTime: number) {
    // 1. impact: the push decays like friction, the body springs back to its spot
    const k = 1 - Math.exp(-8 * deltaTime);
    this.impactVelocity.x = this.lerp(this.impactVelocity.x, 0, k);
    this.impactVelocity.z = this.lerp(this.impactVelocity.z, 0, k);
    this.impactOffset.x += this.impactVelocity.x * deltaTime;
    this.impactOffset.z += this.impactVelocity.z * deltaTime;
    const back = 1 - Math.exp(-5 * deltaTime);
    this.impactOffset.x = this.lerp(this.impactOffset.x, 0, back);
    this.impactOffset.z = this.lerp(this.impactOffset.z, 0, back);

    // 2. what the body is doing
    switch (this.state) {
      case "IDLE": this.applyProceduralIdling(deltaTime); break;
      case "ATTACKING":                                   // weight onto the front foot, centre of gravity lower
        this.targetOffset = { x: 0, y: -0.04, z: 0.05 };
        this.shiftWeight(12, deltaTime); break;
      case "STILL":                                       // after the fight: no sway, just a slow breath
        this.breathingTimer += deltaTime * 1.6;
        this.targetOffset = { x: 0, y: Math.cos(this.breathingTimer) * 0.006, z: 0 };
        this.shiftWeight(4, deltaTime); break;
      case "HITSTUN":                                     // snap back to base alignment
        this.targetOffset = { x: 0, y: 0, z: 0 };
        this.shiftWeight(15, deltaTime); break;
    }
  }

  /** A hit landed: push the body back along the hit. `dirForward` is −1 when shoved away from the rival. */
  applyHitPhysics(dirSide: number, dirForward: number, hitForce: number) {
    this.state = "HITSTUN";
    this.impactVelocity.x = dirSide * hitForce;
    this.impactVelocity.z = dirForward * hitForce;
  }

  /** Breathing and micro-sway, so a fighter standing still still looks alive. */
  applyProceduralIdling(deltaTime: number) {
    this.breathingTimer += deltaTime * 2.5;
    this.targetOffset = { x: Math.sin(this.breathingTimer) * 0.02, y: Math.cos(this.breathingTimer * 0.5) * 0.015, z: 0 };
    this.shiftWeight(3, deltaTime);
  }

  shiftWeight(speed: number, deltaTime: number) {
    const a = 1 - Math.exp(-speed * deltaTime);
    this.currentOffset.x = this.lerp(this.currentOffset.x, this.targetOffset.x, a);
    this.currentOffset.y = this.lerp(this.currentOffset.y, this.targetOffset.y, a);
    this.currentOffset.z = this.lerp(this.currentOffset.z, this.targetOffset.z, a);
  }

  /** Put the result on the fighter: s = which way they face. Runs before the feet are planted. */
  apply(rg: Rig3, s: number) {
    // Everything is applied as a bend in the spine, never as a shift of the whole model, so the feet stay planted.
    const fwd = this.currentOffset.z + this.impactOffset.z, sway = this.currentOffset.x + this.impactOffset.x;
    const B = rg.bones;
    lean(B.Spine, s, fwd * 2.2);                                   // weight forward on attacks, knocked back by hits
    turn(B.Spine, V(1, 0, 0), sway * 2.5 * s);                     // sideways micro-sway
    lean(B.Spine1, s, -this.currentOffset.y * 3);                  // heave: chest rises and settles
    lean(B.Spine, s, -this.impactVelocity.z * 0.12);               // the hit snaps the torso back, then recovers
  }

  lerp(start: number, end: number, amt: number) { return (1 - amt) * start + amt * end; }
}

/* ---------- going down: falling, lying on the floor, getting up ---------- */

const ease = (x: number) => x * x * (3 - 2 * x);
/** 0 = standing … 1 = flat on the back. Follows the flight while airborne, then eases back up on wake-up. */
function fallAmount(f: Fighter) {
  if (f.state === "knockdown" || f.state === "ko") {
    if (!f.air) return 1;
    const v0 = f.state === "ko" ? 8 : 5;                          // launch speed from landHit()
    return 0.12 + 0.88 * ease(Math.min(1, Math.max(0, (f.vy + v0) / (2 * v0))));
  }
  if (f.state === "wakeup") return 1 - ease(Math.min(1, f.sf / Math.max(1, f.dur)));
  return 0;
}

// how far each bone's centre sits inside the body — the floor must stay below the skin, not the bone
const FLOOR_CLEAR: [string, number][] = [
  ["Hips", 0.13], ["Spine1", 0.13], ["Spine2", 0.13], ["Head", 0.12], ["Neck", 0.08],
  ["LeftUpLeg", 0.08], ["RightUpLeg", 0.08], ["LeftLeg", 0.06], ["RightLeg", 0.06], ["LeftFoot", 0.06], ["RightFoot", 0.06],
  ["LeftForeArm", 0.04], ["RightForeArm", 0.04], ["LeftHand", 0.03], ["RightHand", 0.03],
];

/** Tip the body onto its back (head away from the rival), go limp, and lift it so nothing sinks into the floor. */
function layDown(rg: Rig3, s: number, amt: number, limp: number, bounce: number) {
  const B = rg.bones;
  rg.root.rotation.z = s * amt * (Math.PI / 2);
  rg.root.updateMatrixWorld(true);
  if (limp > 0) {
    // arms thrown out to the sides, one bent up by the head; one leg straight, the other knee up
    aim(B.RightArm, B.RightForeArm, V(-s * 0.35, -0.08, 0.9 * s), limp); aim(B.RightForeArm, B.RightHand, V(-s * 0.75, -0.06, 0.5 * s), limp);
    aim(B.LeftArm, B.LeftForeArm, V(-s * 0.1, -0.08, -0.95 * s), limp); aim(B.LeftForeArm, B.LeftHand, V(s * 0.3, -0.06, -0.9 * s), limp);
    aim(B.RightUpLeg, B.RightLeg, V(s, -0.03, 0.14 * s), limp); aim(B.RightLeg, B.RightFoot, V(s, -0.04, 0.18 * s), limp);
    aim(B.LeftUpLeg, B.LeftLeg, V(s * 0.65, 0.5, -0.12 * s), limp); aim(B.LeftLeg, B.LeftFoot, V(s * 0.55, -0.62, -0.06 * s), limp);
    turn(B.Head, V(1, 0, 0), 0.35 * limp * s);                    // head rolls to the side
  }
  // lift the body so every part rests on top of the floor
  rg.root.updateMatrixWorld(true);
  let lift = 0;
  for (const [n, clear] of FLOOR_CLEAR) {
    const y = footY(B[n]); if (!Number.isFinite(y)) continue;
    lift = Math.max(lift, clear * amt - y);                     // y is height above the floor (world)
  }
  rg.root.position.y += lift + bounce;
}

/** Put the fighter where the game says, then layer the stance or move on top of the idle animation. */
function poseRig(rg: Rig3, f: Fighter, dt: number, t: number) {
  const s = f.facing, B = rg.bones;
  const st = f.state;
  const defeated = st === "ko";                                   // K.O.: stays down for good
  // Lying on the floor: hold the animation still. update(0) still re-applies that frame every render, which matters —
  // turn() adds to a bone's current rotation, so without a reset each frame the head would keep spinning.
  const frozen = (defeated || st === "knockdown") && !f.air;
  // start every frame from the rest pose; bones the idle clip doesn't animate would otherwise keep last frame's twist
  for (const b of Object.values(B)) if (b?.userData.rest) b.quaternion.copy(b.userData.rest as THREE.Quaternion);
  // the winner lets go of the fight idle completely: stands still in a relaxed pose instead of bouncing
  // the idle clip is a fighting crouch: let go of it when the fighter wins (stand relaxed) or goes down (lie flat —
  // a crouched spine rotated onto its back curls up off the floor and looks like it's hovering)
  const fall0 = fallAmount(f);
  if (rg.idle) rg.idle.setEffectiveWeight(st === "win" ? 1 - ease(Math.min(1, f.sf / 24)) : 1 - fall0);
  rg.mixer.update(frozen ? 0 : dt);
  rg.root.position.set(X3(f.x), Y3(f.y), 0);
  rg.root.scale.setScalar(1);
  rg.model.rotation.set(0, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
  rg.root.rotation.z = 0;
  if (fall0 === 0) faceRival(rg, s);
  rg.model.position.set(0, 0, 0);
  rg.glow.visible = false;
  const side = ZAX;                                              // lean axis; angles below carry the facing (s)

  // knocked down / defeated / getting up — see layDown()
  const downAmt = fallAmount(f);
  if (downAmt > 0) {
    rg.stanceW = 0;
    // limp once they hit the floor; while getting back up the limbs blend back from limp
    const limp = st === "wakeup" ? downAmt : f.air ? downAmt * 0.6 : 1;
    // small bounce as the body hits the concrete
    const bounce = !f.air && (st === "knockdown" || st === "ko") && f.sf < 12 ? Math.sin((f.sf / 12) * Math.PI) * 0.05 : 0;
    layDown(rg, s, downAmt, limp, bounce);
    return;
  }
  rg.root.rotation.z = 0;

  // idle stance, faded in and out so attacks flow back into it
  rg.stanceW += ((st === "idle" || st === "walk" ? 1 : 0) - rg.stanceW) * Math.min(1, dt * 7);
  if (rg.stanceW > 0.01) {
    STANCES[f.def.fightStyle](rg, s, t, rg.stanceW, f.def);
    if (f.def.headUp) lean(B.Head, s, -f.def.headUp * rg.stanceW);
  }

  // jumping away from the rival = a backflip, turning around the hips (not around the feet, which spun the whole
  // body like a wheel); jumping forward or straight up = a tucked jump, no rotation
  if (f.air && st === "jump" && f.vx * s < -0.5) {
    const q = Math.min(1, Math.max(0, (f.vy + JUMP_V) / (2 * JUMP_V)));  // 0 take-off … 1 landing
    const k = ease(Math.min(1, Math.max(0, (q - 0.12) / 0.7)));        // flip done before the feet come down
    const th = s * k * Math.PI * 2, h = 0.95;                          // hips ≈ 0.95 m up
    rg.root.rotation.z = th;
    rg.root.position.x += h * Math.sin(th);
    rg.root.position.y += h - h * Math.cos(th);
  }

  const crouched = !f.air && ((f.crouch && (st === "crouch" || st === "block" || st === "blockstun")) || (st === "attack" && f.move?.ctx === "crouch"));
  if (crouched) {
    rg.model.position.y = -0.34;
    aim(B.RightUpLeg, B.RightLeg, V(s * 0.85, -0.5, 0.1 * s), 1); aim(B.RightLeg, B.RightFoot, V(-s * 0.15, -1, 0), 1);
    aim(B.LeftUpLeg, B.LeftLeg, V(s * 0.55, -0.8, -0.1 * s), 1); aim(B.LeftLeg, B.LeftFoot, V(-s * 0.5, -1, 0), 1);
    turn(B.Spine, side, -s * 0.25);
  }
  if (f.air && st !== "attack") {                                  // tuck
    aim(B.RightUpLeg, B.RightLeg, V(s * 0.8, 0.3, 0.1 * s), 0.9); aim(B.RightLeg, B.RightFoot, V(-s * 0.3, -1, 0), 0.9);
    aim(B.LeftUpLeg, B.LeftLeg, V(s * 0.6, 0.1, -0.1 * s), 0.9); aim(B.LeftLeg, B.LeftFoot, V(-s * 0.4, -1, 0), 0.9);
  }
  if (st === "walk") {
    // shuffle-step: the stride follows the distance actually travelled, so feet don't skate
    const ph = f.x * 0.11, w = Math.sin(ph), lift = Math.max(0, Math.cos(ph));
    aim(B.LeftUpLeg, B.LeftLeg, V(s * (0.35 + w * 0.3), -1, -0.13 * s), 0.7); aim(B.LeftLeg, B.LeftFoot, V(-s * 0.2 * lift, -1, -0.04 * s), 0.7);
    aim(B.RightUpLeg, B.RightLeg, V(-s * (0.1 + w * 0.3), -1, 0.15 * s), 0.7); aim(B.RightLeg, B.RightFoot, V(-s * (0.35 - 0.2 * lift), -1, 0.06 * s), 0.7);
    turn(B.Spine1, UP, w * 0.05);
  }
  if (st === "dodge") {                                            // sidestep into the background and back
    const k = Math.sin(Math.PI * Math.min(1, f.sf / Math.max(1, f.dur)));
    rg.model.position.z -= 0.6 * k;
    lean(B.Spine, s, 0.18 * k); turn(B.Spine1, UP, -0.45 * k * s);
    aim(B.LeftArm, B.LeftForeArm, V(s * 0.3, -0.85, -0.3 * s), k); aim(B.LeftForeArm, B.LeftHand, V(s * 0.4, 0.9, 0.2 * s), k);
    aim(B.RightArm, B.RightForeArm, V(s * 0.1, -0.95, 0.3 * s), k); aim(B.RightForeArm, B.RightHand, V(s * 0.25, 1, -0.3 * s), k);
  }
  if (st === "duck") {                                             // drop low: knees deep, head tucked behind the gloves
    const k = f.sf < 5 ? f.sf / 5 : f.sf > f.dur - 6 ? Math.max(0, (f.dur - f.sf) / 6) : 1;
    aim(B.LeftUpLeg, B.LeftLeg, V(s * 0.9, -0.45, -0.14 * s), k); aim(B.LeftLeg, B.LeftFoot, V(-s * 0.35, -1, -0.04 * s), k);
    aim(B.RightUpLeg, B.RightLeg, V(s * 0.6, -0.8, 0.16 * s), k); aim(B.RightLeg, B.RightFoot, V(-s * 0.7, -1, 0.06 * s), k);
    lean(B.Spine, s, 0.45 * k); lean(B.Spine1, s, 0.2 * k); lean(B.Neck, s, 0.25 * k);
    aim(B.LeftArm, B.LeftForeArm, V(s * 0.5, -0.8, -0.25 * s), k); aim(B.LeftForeArm, B.LeftHand, V(s * 0.3, 1, 0.2 * s), k);
    aim(B.RightArm, B.RightForeArm, V(s * 0.35, -0.9, 0.3 * s), k); aim(B.RightForeArm, B.RightHand, V(s * 0.2, 1, -0.25 * s), k);
  }
  if (st === "parry") {                                            // forearms snap out to catch the strike
    const k = f.sf <= 8 ? Math.min(1, f.sf / 3) : Math.max(0, 1 - (f.sf - 8) / 12);
    aim(B.LeftArm, B.LeftForeArm, V(s * 0.7, -0.45, -0.25 * s), k); aim(B.LeftForeArm, B.LeftHand, V(s * 0.55, 0.85, 0.25 * s), k);
    aim(B.RightArm, B.RightForeArm, V(s * 0.6, -0.5, 0.3 * s), k); aim(B.RightForeArm, B.RightHand, V(s * 0.45, 0.9, -0.2 * s), k);
    lean(B.Spine, s, -0.06 * k);
  }
  if (st === "block" || st === "blockstun") {                     // forearms up in front of the face
    aim(B.RightArm, B.RightForeArm, V(s * 0.45, -0.8, 0.25 * s), 1); aim(B.RightForeArm, B.RightHand, V(s * 0.25, 1, 0.05 * s), 1);
    aim(B.LeftArm, B.LeftForeArm, V(s * 0.45, -0.8, -0.25 * s), 1); aim(B.LeftForeArm, B.LeftHand, V(s * 0.25, 1, -0.05 * s), 1);
    turn(B.Spine1, side, -s * 0.15);
  }
  if (st === "hitstun") {                                          // head and chest snap back
    const k = Math.max(0, 1 - f.sf / Math.max(1, f.dur));
    turn(B.Spine, side, s * 0.5 * k); turn(B.Spine2, side, s * 0.2 * k); turn(B.Neck, side, s * 0.45 * k);
    rg.model.position.x = -s * 0.08 * k;
  }
  if (st === "win") {
    const k = ease(Math.min(1, f.sf / 24));                          // eases out of the fight stance
    aim(B.LeftUpLeg, B.LeftLeg, V(s * 0.06, -1, -0.12 * s), k); aim(B.LeftLeg, B.LeftFoot, V(0, -1, -0.04 * s), k);
    aim(B.RightUpLeg, B.RightLeg, V(-s * 0.04, -1, 0.12 * s), k); aim(B.RightLeg, B.RightFoot, V(0, -1, 0.04 * s), k);
    aim(B.LeftArm, B.LeftForeArm, V(s * 0.06, -1, -0.2 * s), k); aim(B.LeftForeArm, B.LeftHand, V(s * 0.18, -1, -0.1 * s), k);
    aim(B.RightArm, B.RightForeArm, V(s * 0.06, -1, 0.2 * s), k); aim(B.RightForeArm, B.RightHand, V(s * 0.18, -1, 0.1 * s), k);
    lean(B.Spine, s, -0.04 * k);                                     // chest up
    lean(B.Neck, s, 0.08 * k); lean(B.Head, s, (0.06 - (f.def.headUp ?? 0)) * k);   // chin level, eyes on the loser
  }

  if (st === "attack" && f.move) {
    const m = f.move, k = moveProgress(f), reach = Math.min(1, k);
    // body behind the move: punches drive the shoulder in, low moves dip, the special winds up and shakes
    if (m.btn === "punch" && m.ctx === "stand") turn(B.Spine, side, -s * 0.12 * reach);
    else if (m.ctx === "crouch") turn(B.Spine, side, -s * 0.2 * reach);
    else if (m.btn === "special" && f.sf - 1 < m.startup) {
      rg.root.scale.setScalar(1 + 0.08 * reach);
      rg.model.position.x += Math.sin(t * 57) * 0.015 * reach; rg.model.position.y += Math.cos(t * 43) * 0.01 * reach;
    }
    const punch = (side2: "Right" | "Left", dir: THREE.Vector3) => {
      aim(B[`${side2}Arm`], B[`${side2}ForeArm`], dir, reach); aim(B[`${side2}ForeArm`], B[`${side2}Hand`], dir, reach);
      turn(B.Spine1, UP, (side2 === "Right" ? 1 : -1) * 0.35 * reach);
    };
    switch (m.pose) {
      case "jab": punch("Right", V(s, 0.12, 0.08 * s)); break;
      case "cross": punch("Left", V(s, 0.1, -0.08 * s)); break;
      case "hook": punch("Right", V(s, 0.35, (0.5 - reach * 0.5) * s)); turn(B.Spine, side, -s * 0.1 * reach); break;
      case "lowpunch": punch("Right", V(s, -0.25, 0.05 * s)); break;
      case "airpunch": punch("Right", V(s, -0.6, 0.05 * s)); break;
      case "roundhouse":
        aim(B.RightUpLeg, B.RightLeg, V(s, 0.25 + 0.5 * reach, 0.1 * s), reach); aim(B.RightLeg, B.RightFoot, V(s, 0.35 * reach, 0.1 * s), reach);
        turn(B.Spine, side, s * 0.35 * reach); break;
      case "sweep":
        aim(B.RightUpLeg, B.RightLeg, V(s, -0.18, 0.25 * s), reach); aim(B.RightLeg, B.RightFoot, V(s, -0.25, 0.3 * s), reach); break;
      case "airkick":
        aim(B.RightUpLeg, B.RightLeg, V(s, -0.35, 0.1 * s), 1); aim(B.RightLeg, B.RightFoot, V(s, -0.5, 0.1 * s), 1); break;
      case "grab": {                                               // both hands out, then drag the rival down
        const d2 = V(s, -0.1 - 0.3 * Math.max(0, k - 0.9) * 10, 0);
        aim(B.RightArm, B.RightForeArm, V(s, -0.05, 0.12 * s), reach); aim(B.RightForeArm, B.RightHand, d2, reach);
        aim(B.LeftArm, B.LeftForeArm, V(s, -0.05, -0.12 * s), reach); aim(B.LeftForeArm, B.LeftHand, d2, reach);
        lean(B.Spine, s, 0.3 * reach);
        break;
      }
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
  // weight shifts, breathing and hit recoil from the anatomy controller
  rg.anatomy.state = st === "attack" ? "ATTACKING" : st === "hitstun" ? "HITSTUN" : st === "win" ? "STILL" : "IDLE";
  rg.anatomy.update(dt);
  rg.anatomy.apply(rg, s);
  if (!f.air) plantFeet(rg);
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
  if (g.cine) {                                                    // finisher: push in on the fighter's face
    const f = g.f[g.cine.who], x = X3(f.x), k = 0.11;
    cam.position.x += (x + f.facing * 1.15 - cam.position.x) * k;
    cam.position.y += (1.55 - cam.position.y) * k;
    cam.position.z += (2.3 - cam.position.z) * k;
    cam.lookAt(x + f.facing * 0.2, 1.35, 0);
    return;
  }
  const [a, b] = g.f;
  const sep = Math.abs(a.x - b.x);
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
  if (g.shake > 0 && !Motion.reduced) { cam.position.x += Math.sin(g.frame * 7.3) * 0.03; cam.position.y += Math.cos(g.frame * 5.1) * 0.03; }
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

/** The finisher cutscene: letterbox, colour pulse in the fighter's colour, three title cards over 4 seconds. */
function drawCinematic(c: CanvasRenderingContext2D, g: Game) {
  const cn = g.cine!, f = g.f[cn.who], t = cn.t, NAME = f.def.name.toUpperCase();
  const flash = Motion.reduced ? 0.08 : Math.sin(t * 0.55) > 0 ? 0.16 : 0.04;   // reduced motion: a steady tint instead of a strobe
  c.save();
  c.globalAlpha = flash; c.fillStyle = f.def.color; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
  const bar = Math.min(1, t / 10) * 62;                                   // letterbox slides in
  c.fillStyle = "#000"; c.fillRect(0, 0, W, bar); c.fillRect(0, H - bar, W, bar);
  c.restore();
  const [big, small] = t < 45 ? ["FINISHER GAUGE BURNING...", `${NAME} PREPARES DESTRUCTION`]
    : t < 97 ? [`"${f.def.quote.toUpperCase()}"`, NAME]
    : [f.def.finisher, "UNBLOCKABLE HIT"];
  const size = big.length > 24 ? 30 : big.length > 16 ? 40 : 54;
  const y = H - 118;
  outlined(c, big, W / 2, y, size, t >= 97 ? gold(c, y - size / 2, y + size / 2) : "#ffffff", "center", 0.18);
  outlined(c, small, W / 2, y + size * 0.5 + 22, 16, f.def.color, "center", 0.12);
}

let GOLD_TAG = false;                                              // refreshed when a fight starts (Cred.has reads storage)
function drawHud(c: CanvasRenderingContext2D, g: Game, touch: boolean, project: (x: number, y: number, z: number) => [number, number], pics: (HTMLImageElement | null)[], compact = false) {
  // compact = a phone: the arena is only ~600 px wide there, so text and bars draw about a third bigger
  const k = compact ? 1.35 : 1;
  const PS = 66 * k, BY = 18, BH = 26 * k, SK = 10, GAP = 54 * k;
  const BW = W / 2 - GAP - 20 - PS - 16;
  const pulse = 0.5 + Math.sin(g.frame * 0.25) * 0.5;
  if (g.cine) { drawCinematic(c, g); return; }

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
    const fillIn = g.phase === "intro" && !Motion.reduced ? ease(Math.min(1, g.pf / 36)) : 1;      // round start: the bars fill up
    const lagW = fill(f.lag) * fillIn, hpW = fill(f.hp) * fillIn;
    c.fillStyle = "#e01a00"; c.fillRect(left ? bx + BW + SK - lagW : bx - SK, BY, lagW + SK, BH);
    const low = f.hp < 30;
    c.fillStyle = low ? `rgb(255,${Math.round(80 + 120 * pulse)},0)` : gold(c, BY, BY + BH);
    c.fillRect(left ? bx + BW + SK - hpW : bx - SK, BY, hpW + (hpW > 0 ? SK : 0), BH);
    c.fillStyle = "rgba(255,255,255,0.35)"; c.fillRect(bx - SK, BY + 2, BW + SK * 2, BH * 0.3);
    c.restore();

    // name plate + player tag
    const ny = BY + BH + 20 * k, nameX = left ? bx + 4 : bx + BW - 4;
    const goldName = left && GOLD_TAG;                                            // the GOLD NAME PLATE unlock
    outlined(c, f.def.name.toUpperCase(), nameX, ny, 20 * k, goldName ? gold(c, ny - 10 * k, ny + 10 * k) : "#ffffff", left ? "left" : "right");
    c.font = `${20 * k}px ${HUDF}`; const nw = c.measureText(f.def.name.toUpperCase()).width;
    c.fillStyle = f.def.color; c.fillRect(left ? nameX : nameX - nw, ny + 13 * k, nw, 3);
    outlined(c, f.tag, left ? nameX + nw + 14 : nameX - nw - 14, ny + 1, 12 * k, "#ffd23f", left ? "left" : "right");

    // round wins: gold diamonds (empty = outline) near the timer
    for (let k = 0; k < 2; k++) {
      const cx = left ? bx + BW - 12 - k * 24 : bx + 12 + k * 24, cy = ny;
      c.save(); c.translate(cx, cy); c.rotate(Math.PI / 4);
      c.fillStyle = "#000"; c.fillRect(-8, -8, 16, 16);
      c.fillStyle = g.wins[i] > k ? gold(c, -7, 7) : "#2a2a30"; c.fillRect(-6, -6, 12, 12);
      c.restore();
    }

    // special gauge: 10 segments, label says when it's ready (not just colour)
    const gy = ny + 22 * k, segs = 10, gw = BW * 0.62, segW = gw / segs, gh = 8 * k;
    const gx = left ? bx : bx + BW - gw;
    c.fillStyle = "#000"; slantRect(c, gx - 3, gy - 3, gw + 6, gh + 6, sk * 0.5); c.fill();
    const lit = (f.sta / 100) * segs;
    for (let k = 0; k < segs; k++) {
      const idx = left ? k : segs - 1 - k;
      const on = Math.min(1, Math.max(0, lit - idx));
      const sx = gx + k * segW + 1;
      c.fillStyle = "#101a2e"; c.fillRect(sx, gy, segW - 2, gh);
      if (on > 0) {
        const gg = c.createLinearGradient(0, gy, 0, gy + gh); gg.addColorStop(0, "#bff3ff"); gg.addColorStop(1, "#1e78ff");
        c.fillStyle = gg; c.globalAlpha = on; c.fillRect(sx, gy, segW - 2, gh); c.globalAlpha = 1;
      }
    }
    const ready = f.sta >= SP_COST;
    outlined(c, ready ? "SPECIAL READY" : "SPECIAL", left ? gx + gw + 10 : gx - 10, gy + gh / 2, 11 * k, ready ? `rgb(255,${Math.round(200 + 55 * pulse)},${Math.round(80 * pulse)})` : "#9fb3d9", left ? "left" : "right", 0.15);

    // heat gauge: fills from landing and taking hits; full = the cinematic finisher
    const hy = gy + gh + 8 * k, hh = 6 * k, full = f.heat >= 100;
    c.fillStyle = "#000"; slantRect(c, gx - 3, hy - 2, gw + 6, hh + 4, sk * 0.5); c.fill();
    c.fillStyle = "#2a1206"; c.fillRect(gx, hy, gw, hh);
    const hw = (gw * f.heat) / 100;
    const hg = c.createLinearGradient(0, hy, 0, hy + hh); hg.addColorStop(0, "#ffe08a"); hg.addColorStop(1, full ? "#ff2300" : "#ff8a1f");
    c.fillStyle = hg; c.fillRect(left ? gx : gx + gw - hw, hy, hw, hh);
    const finKey = touch ? "S" : "L";
    const finLabel = full ? (i === 0 || !g.cpu ? `FINISHER READY — ${finKey}` : "FINISHER READY") : "HEAT";
    outlined(c, finLabel, left ? gx + gw + 10 : gx - 10, hy + hh / 2, 10 * k, full ? `rgb(255,${Math.round(90 + 120 * pulse)},40)` : "#e0a070", left ? "left" : "right", 0.15);

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
    outlined(c, f.tag, tx, ty, 13 * k, i === 0 ? "#ffd23f" : "#ffffff");
    const ch = g.ctl[i].charge;
    if (ch > 0 && (isFree(f) || f.state === "attack")) {                       // holding Punch: a bar fills to the signature
      const bw = 54 * k, bx0 = tx - bw / 2, by0 = ty + 10 * k, p = Math.min(1, ch / SIG_HOLD);
      c.fillStyle = "#000"; c.fillRect(bx0 - 2, by0 - 2, bw + 4, 8 * k + 4);
      c.fillStyle = p >= 1 ? f.def.color : "#6b7380"; c.fillRect(bx0, by0, bw * p, 8 * k);
      if (p >= 1) outlined(c, `LET GO: ${f.def.sigName}`, tx, by0 + 18 * k, 11 * k, f.def.color);
    }
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

  for (const s of g.sparks) if (s.blocked) { const [bx, by] = project(X3(s.x), (GROUND - s.y) * U + 0.35, 0.4); outlined(c, "BLOCK", bx, by, 14 * k, "#bfe0ff"); }

  // tutorial lesson card
  if (g.tut) {
    const st = TUT_STEPS[g.tut.step];
    if (st) {
      // key hints follow the player's own bindings: {punch} = player 1's key, {left2} = the second keyboard's (it also drives player 1 against the computer)
      const keyHint = (s: string) => s.replace(/\{(\w+?)(2?)\}/g, (_, a: Action, two: string) => { const ks = keysFor(two ? 1 : 0, a); return ks.length ? keyName(ks[0]) : "?"; });
      const y = 150 * k, hint = touch ? st.touch : keyHint(st.keys);
      c.save(); c.fillStyle = "rgba(0,0,0,0.62)";
      c.beginPath(); c.moveTo(0, y - 34 * k); c.lineTo(W, y - 40 * k); c.lineTo(W, y + 36 * k); c.lineTo(0, y + 42 * k); c.closePath(); c.fill();
      c.fillStyle = "#3AA0FF"; c.fillRect(0, y + 42 * k - 3, W, 3); c.restore();
      outlined(c, `TUTORIAL ${g.tut.step + 1} / ${TUT_STEPS.length}`, W / 2, y - 20 * k, 11 * k, "#9fc4ff", "center", 0.1);
      outlined(c, st.text, W / 2, y + 2 * k, (st.text.length > 34 ? 17 : 21) * k, "#ffffff", "center", 0.15);
      outlined(c, hint.toUpperCase(), W / 2, y + 24 * k, 13 * k, gold(c, y + 16 * k, y + 32 * k), "center", 0.1);
      // progress ticks
      for (let i = 0; i < TUT_STEPS.length; i++) { c.fillStyle = i < g.tut.step ? "#ffc21a" : i === g.tut.step ? "#ffffff" : "#2a2e36"; c.fillRect(W / 2 - TUT_STEPS.length * 7 + i * 14, y + 36 * k, 10, 3); }
    }
  }

  if (g.round === 1 && g.frame < 420 && !g.tut) {
    outlined(c, touch ? "HOLD THE STICK AWAY FROM YOUR RIVAL TO BLOCK" : "HOLD BACK (AWAY FROM YOUR RIVAL) TO BLOCK", W / 2, H - 92, 13 * k, "#ffcf7a", "center", 0.1);
    if (touch) outlined(c, "SWIPE ↓ DUCK · SWIPE ← → DODGE · TWO-FINGER TAP PARRY", W / 2, H - 92 + 20 * k, 12 * k, "#bfe0ff", "center", 0.1);
  }

  // big announcements on a slanted banner
  if (g.msg) {
    const age = g.phase === "intro" && g.pf >= 70 ? g.pf - 70 : g.pf;                       // frames since this message appeared
    const pop = Motion.reduced ? 1 : 1 + 0.9 * (1 - ease(Math.min(1, age / 10)));             // slams in from large
    const size = (g.msg.length > 16 ? 34 : g.msg.length > 10 ? 44 : 70) * pop;
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

/** True when a picture exists at this address (the pre-rendered cards). */
function imageExists(url: string): Promise<boolean> {
  return new Promise((res) => { const im = new Image(); im.onload = () => res(im.naturalWidth > 0); im.onerror = () => res(false); im.src = url; });
}

let stagePreviewJob: Promise<Record<string, string>> | null = null;
/** A snapshot of each location from the fight camera, for the location-select cards.
 *  Uses the pre-rendered stage-<id>.jpg when it exists (a few KB); otherwise builds the stage and renders it live (several MB). */
function renderStagePreviews(): Promise<Record<string, string>> {
  if (stagePreviewJob) return stagePreviewJob;
  stagePreviewJob = (async () => {
    const out: Record<string, string> = {};
    const pre = await Promise.all(LOCATIONS.map((l) => imageExists(STAGE_PIC_URL(l.id))));
    LOCATIONS.forEach((l, i) => { if (pre[i]) out[l.id] = STAGE_PIC_URL(l.id); });
    const todo = LOCATIONS.filter((l) => !out[l.id]);
    if (!todo.length) return out;
    await getLogo();
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    r.setSize(640, 360); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    const cam = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 80);
    cam.position.set(0, 1.35, 7.2); cam.lookAt(0, 1.15, 0);
    for (const l of todo) {
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
/** Head-and-shoulders shots of every fighter, framed from the model's real pose, on an arcade-style card background.
 *  Uses the pre-rendered portrait-<id>.jpg when it exists (≈ 20 KB each); otherwise loads that fighter's model and renders it live. */
function renderPortraits(): Promise<Record<string, string>> {
  if (portraitJob) return portraitJob;
  portraitJob = (async () => {
    const out: Record<string, string> = {};
    const pre = await Promise.all(ROSTER.map((d) => imageExists(PORTRAIT_URL(d.id))));
    ROSTER.forEach((d, i) => { if (pre[i]) out[d.id] = PORTRAIT_URL(d.id); });
    const todo = ROSTER.filter((d) => !out[d.id]);
    if (!todo.length) return out;
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
    for (const d of todo) {
      try {
        const rg = makeRig(await loadFighter(d.id), d.color);
        rg.mixer.update(0.5); rg.model.rotation.y = 0.3;
        scene.add(rg.root); rg.root.updateMatrixWorld(true);
        faceRival(rg, 0);                                                          // square the hips to the camera (Stockz's idle turns his back)
        turn(rg.bones.Head, V(1, 0, 0), -(d.headUp ?? 0)); rg.root.updateMatrixWorld(true);   // chin up for the fighters whose idle looks down
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
const KEYS_P1: Record<string, Action> = {
  KeyA: "left", KeyD: "right", KeyW: "up", KeyS: "down", KeyJ: "punch", KeyK: "kick", KeyL: "special",
  KeyI: "grab", KeyU: "dodge", Space: "parry", KeyO: "duck",
};
const KEYS_P2: Record<string, Action> = {
  ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
  Comma: "punch", Period: "kick", Slash: "special", Numpad1: "punch", Numpad2: "kick", Numpad3: "special",
  Semicolon: "grab", Quote: "dodge", Enter: "parry", KeyM: "duck", Numpad4: "grab", Numpad5: "dodge", Numpad6: "parry", Numpad0: "duck",
};
type Dir = { left: boolean; right: boolean; up: boolean; down: boolean };
const noDir = (): Dir => ({ left: false, right: false, up: false, down: false });

/* ---------- rebindable keys (saved in this browser) ---------- */
const ACTIONS: Action[] = ["left", "right", "up", "down", "punch", "kick", "special", "grab", "dodge", "duck", "parry"];
const ACTION_LABEL: Record<Action, string> = { left: "Walk left", right: "Walk right", up: "Jump", down: "Crouch", punch: "Punch", kick: "Kick", special: "Special / finisher", grab: "Grab", dodge: "Dodge", duck: "Duck", parry: "Parry", sig: "Signature" };
const DEFAULT_KEYS: [Record<string, Action>, Record<string, Action>] = [KEYS_P1, KEYS_P2];
function loadKeys(p: 0 | 1): Record<string, Action> {
  try { const v = localStorage.getItem("pmg-keys-" + p); if (v) { const o = JSON.parse(v); if (o && typeof o === "object") return o as Record<string, Action>; } } catch { /* private mode */ }
  return { ...DEFAULT_KEYS[p] };
}
/** The live maps — the fight reads these every key press, so a rebind takes effect at once. */
const KEYMAPS: [Record<string, Action>, Record<string, Action>] = [loadKeys(0), loadKeys(1)];
function saveKeys(p: 0 | 1) { try { localStorage.setItem("pmg-keys-" + p, JSON.stringify(KEYMAPS[p])); } catch { /* private mode */ } Profile.push(); }
function bindKey(p: 0 | 1, action: Action, code: string) {
  const m = KEYMAPS[p];
  for (const k of Object.keys(m)) if (m[k] === action || k === code) delete m[k];     // one key per action; a key does one thing
  const other = KEYMAPS[(1 - p) as 0 | 1]; if (other[code]) { delete other[code]; saveKeys((1 - p) as 0 | 1); }   // …for one player only
  m[code] = action; saveKeys(p);
}
function resetKeys(p: 0 | 1) { const m = KEYMAPS[p]; for (const k of Object.keys(m)) delete m[k]; Object.assign(m, DEFAULT_KEYS[p]); saveKeys(p); }
const keysFor = (p: 0 | 1, action: Action) => Object.keys(KEYMAPS[p]).filter((k) => KEYMAPS[p][k] === action);
const KEY_NAMES: Record<string, string> = { ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓", Space: "Space", Enter: "Enter", Comma: ",", Period: ".", Slash: "/", Semicolon: ";", Quote: "'", Backquote: "`", Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]", Backslash: "\\", ShiftLeft: "L Shift", ShiftRight: "R Shift", ControlLeft: "L Ctrl", ControlRight: "R Ctrl", AltLeft: "L Alt", AltRight: "R Alt", Tab: "Tab", Backspace: "Bksp", CapsLock: "Caps" };
function keyName(code: string) { return KEY_NAMES[code] ?? code.replace(/^Key/, "").replace(/^Digit/, "").replace(/^Numpad/, "Num "); }

/* ---------- gamepads (standard mapping: PlayStation / Xbox layouts) ---------- */
const PAD_BTN: Record<number, Btn> = { 2: "punch", 0: "kick", 3: "special", 1: "grab", 4: "dodge", 5: "parry", 6: "duck", 7: "duck" };
const PAD_HINT = "□ / X punch (hold and release = signature) · ✕ / A kick · △ / Y special · ○ / B grab · L1 dodge · R1 parry · L2 / R2 duck · stick or d-pad move · Start pause";

/* ================================================================== */
/*  REACT                                                              */
/* ================================================================== */

const WET = "'Rubik Wet Paint', 'Permanent Marker', Impact, sans-serif";
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Russo+One&family=Rubik+Wet+Paint&display=swap');
.pmg{position:relative;min-height:100dvh;width:100%;overflow-x:hidden;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  background:radial-gradient(120% 70% at 50% 115%,#5a1a08 0%,#1a0a06 45%,#050304 100%);
  display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;box-sizing:border-box;
  user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;overscroll-behavior:none}
.pmg *{box-sizing:border-box}
/* motion graphics: slanted stripes drifting behind the menus, slam-ins, staggered rises, a wipe between screens. All off under .rm */
.pmg.menu::before,.pmg.select::before,.pmg.stage::before{content:"";position:absolute;inset:-20%;pointer-events:none;z-index:0;opacity:.6;
  background:repeating-linear-gradient(-32deg,rgba(255,255,255,.045) 0 14px,transparent 14px 86px);animation:pmgDrift 26s linear infinite}
.pmg>*{position:relative;z-index:1}
@keyframes pmgDrift{to{transform:translate3d(-140px,80px,0)}}
@keyframes pmgSlam{0%{transform:scale(2.4) rotate(-6deg);opacity:0;filter:blur(6px)}60%{transform:scale(.94) rotate(0);opacity:1;filter:blur(0)}80%{transform:scale(1.04)}100%{transform:scale(1)}}
@keyframes pmgBurst{0%{transform:translate(-50%,-50%) scale(.2);opacity:0}30%{opacity:.9}100%{transform:translate(-50%,-50%) scale(2.6);opacity:0}}
@keyframes pmgSkewIn{0%{transform:translateX(-70px) skewX(-22deg);opacity:0}100%{transform:translateX(0) skewX(-6deg);opacity:1}}
@keyframes pmgRise{0%{transform:translateY(26px) skewX(-4deg);opacity:0}100%{transform:none;opacity:1}}
@keyframes pmgFromL{0%{transform:translateX(-60%);opacity:0}70%{transform:translateX(4%)}100%{transform:none;opacity:1}}
@keyframes pmgFromR{0%{transform:translateX(60%);opacity:0}70%{transform:translateX(-4%)}100%{transform:none;opacity:1}}
@keyframes pmgPop{0%{transform:scale(3) skewX(-8deg);opacity:0}60%{transform:scale(.9) skewX(-8deg);opacity:1}100%{transform:scale(1) skewX(-8deg)}}
@keyframes pmgPanel{0%{transform:scale(.94) translateY(12px);opacity:0}100%{transform:none;opacity:1}}
@keyframes pmgWipe{0%{transform:translateX(-130%) skewX(-18deg)}100%{transform:translateX(130%) skewX(-18deg)}}
@keyframes pmgSweep{0%,55%{transform:translateX(-130%) skewX(-25deg)}100%{transform:translateX(230%) skewX(-25deg)}}
@keyframes pmgBadge{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
@keyframes pmgBarStripes{to{transform:translateX(20px)}}
.pmg-titlewrap{position:relative}
.pmg-burst{position:absolute;left:50%;top:42%;width:min(420px,70vw);height:min(420px,70vw);border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,rgba(255,194,26,.55) 0,rgba(255,138,31,.25) 35%,transparent 70%);animation:pmgBurst .9s .1s ease-out both}
.pmg-titlelogo{animation:pmgSlam .75s cubic-bezier(.2,.9,.25,1.2) both}
.pmg-fight{animation:pmgSkewIn .5s .35s cubic-bezier(.2,.9,.25,1) both}
.pmg.menu .pmg-tag,.pmg.menu .pmg-sub,.pmg.menu .pmg-cred,.pmg.menu .pmg-code{animation:pmgRise .45s .55s both}
.pmg-col>.pmg-btn{animation:pmgRise .45s both;animation-delay:calc(.65s + var(--i,0) * 70ms)}
.pmg-btn{position:relative;overflow:hidden}
.pmg-btn.primary::after{content:"";position:absolute;top:0;bottom:0;left:0;width:34%;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:pmgSweep 2.8s 1.4s ease-in-out infinite}
.pmg-btn,.pmg-card{transition:transform .15s ease,filter .15s ease}
.pmg-btn:hover{transform:translateY(-2px)}
.pmg-grid .pmg-card,.pmg-locs .pmg-card{animation:pmgRise .5s both;animation-delay:calc(var(--i,0) * 70ms)}
.pmg-card:hover{transform:translateY(-5px)}
.pmg-card .pmg-badge{animation:pmgBadge .9s ease-in-out infinite}
.pmg-h2{animation:pmgSkewIn .45s both}
.pmg-vs .side.l{animation:pmgFromL .55s .05s cubic-bezier(.2,.9,.25,1) both}
.pmg-vs .side.r{animation:pmgFromR .55s .05s cubic-bezier(.2,.9,.25,1) both}
.pmg-vs .vs{animation:pmgPop .5s .45s cubic-bezier(.2,.9,.25,1) both}
.pmg-vs .foot{animation:pmgRise .45s .7s both}
.pmg-vs .bar b{position:relative;overflow:hidden}
.pmg-vs .bar b::after{content:"";position:absolute;top:0;bottom:0;left:-28px;right:0;background:repeating-linear-gradient(-45deg,rgba(255,255,255,.28) 0 7px,transparent 7px 14px);animation:pmgBarStripes .5s linear infinite}
.pmg-panel{animation:pmgPanel .28s cubic-bezier(.2,.9,.25,1) both}
.pmg-over .pmg-col>*{animation:pmgRise .4s both}
.pmg-over .pmg-col>*:nth-child(2){animation-delay:.08s}.pmg-over .pmg-col>*:nth-child(3){animation-delay:.16s}
.pmg-wipe{position:fixed;inset:0;z-index:45;pointer-events:auto;overflow:hidden}
.pmg-wipe::before,.pmg-wipe::after{content:"";position:absolute;top:-10%;bottom:-10%;left:0;width:120%;animation:pmgWipe .7s cubic-bezier(.7,0,.3,1) both}
.pmg-wipe::before{background:#050304;border-right:14px solid #ffc21a;box-shadow:8px 0 0 #000}
.pmg-wipe::after{background:#0b0c0f;animation-delay:.09s;opacity:.85}
.pmg.rm *,.pmg.rm::before{animation:none!important;transition:none!important}
.pmg.rm .pmg-fight{transform:skewX(-6deg)}.pmg.rm .pmg-burst{display:none}.pmg.rm .pmg-vs .vs{transform:skewX(-8deg)}
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
.pmg-cred{font:14px ${HUDF};letter-spacing:2px;margin:-10px 0 16px;background:linear-gradient(#fff7c2,#ffc21a 45%,#e07b00 55%,#ffd45a);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(1px 2px 0 #000)}
.pmg-card .arch{font-size:11.5px;color:#d9dde6;line-height:1.35;margin-bottom:6px}
.pmg-card .arch b{display:block;font:12px ${HUDF};color:#ffcf7a;letter-spacing:.5px}
.pmg-card .arch i{color:#9aa3b0;font-style:italic}
.pmg-card .arch.sig b{color:#9fc4ff}
.pmg-card .quote{font-size:12px;font-style:italic;color:#efdcc6;margin-top:8px;line-height:1.35}
.pmg-card .turf{display:flex;gap:10px;align-items:center;margin-top:6px;font:12px ${HUDF};letter-spacing:1px;color:#ffcf7a}
.pmg-card .diff{padding:2px 8px;border:2px solid #000;color:#000}
.pmg-card .diff.easy{background:#6fdc8c}.pmg-card .diff.medium{background:#ffc21a}.pmg-card .diff.hard{background:#ff5a3c}
.pmg-vs{position:absolute;inset:0;z-index:5;display:grid;grid-template-columns:1fr auto 1fr;grid-template-rows:1fr auto;align-items:center;gap:8px;padding:5% 6% 4%;
  background:radial-gradient(90% 90% at 50% 45%,#2a0d06 0%,#0b0505 70%);overflow:hidden}
.pmg-vs .side{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0}
.pmg-vs .side.l{grid-column:1;grid-row:1}.pmg-vs .vs{grid-column:2;grid-row:1}.pmg-vs .side.r{grid-column:3;grid-row:1}
.pmg-vs .side img,.pmg-vs .side .ph{width:min(34vh,72%);aspect-ratio:1;object-fit:cover;border:3px solid #000;box-shadow:0 0 0 3px var(--c),6px 8px 0 3px #000;background:#1a0f0a}
.pmg-vs .side.l img{transform:skewY(-3deg)}.pmg-vs .side.r img{transform:skewY(3deg) scaleX(-1)}
.pmg-vs h3{margin:6px 0 0;font:clamp(18px,3vw,34px) ${HUDF};font-style:italic;color:var(--c);-webkit-text-stroke:1px #000;text-shadow:3px 3px 0 #000}
.pmg-vs .side span{font:clamp(10px,1.4vw,14px) ${HUDF};color:#efdcc6;letter-spacing:1px}
.pmg-vs .vs{font:clamp(40px,8vw,96px) ${WET};color:#FF2300;-webkit-text-stroke:2px #000;text-shadow:4px 5px 0 #000;transform:skewX(-8deg)}
.pmg-vs .foot{grid-column:1/-1;display:flex;flex-direction:column;align-items:center;gap:6px}
.pmg-vs .where{font:clamp(11px,1.5vw,15px) ${HUDF};color:#ffcf7a;letter-spacing:2px;text-align:center}
.pmg-vs .bar{width:min(420px,70%);height:8px;background:#1a0f0a;border:2px solid #000;box-shadow:0 0 0 2px #6b7380}
.pmg-vs .bar b{display:block;height:100%;background:linear-gradient(90deg,#3AA0FF,#ffc21a,#FF2300);transition:width .25s}
.pmg-vs small{font:11px ${HUDF};color:#9aa3b0;letter-spacing:2px}
.pmg-credwon{font:15px ${HUDF};text-align:center;letter-spacing:1px;color:#ffcf7a;background:rgba(0,0,0,.7);border:2px solid #000;padding:8px}
.pmg-locs{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;width:min(900px,96vw)}
.pmg-loc img,.pmg-loc .ph{aspect-ratio:16/9 !important}
.pmg-loc h3{font-size:24px}
.pmg-canvas{display:block;touch-action:none;background:#000;border:3px solid #000;box-shadow:0 0 0 3px #6b7380,8px 8px 0 3px #000}
.pmg-top{position:absolute;bottom:2.5%;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:3}
@media (pointer:coarse) and (orientation:portrait){.pmg{justify-content:flex-start;padding-top:10px}}
.pmg-top .pmg-mini{font-size:clamp(9px,1.3vw,12px);padding:clamp(3px,.6vw,6px) clamp(8px,1.2vw,14px);letter-spacing:1px}
.pmg-modal{position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:16px}
.pmg-panel{width:min(400px,94vw);max-height:94dvh;overflow:auto;padding:20px;border-radius:6px;background:linear-gradient(#2a2e36,#101217);box-shadow:0 0 0 2px #c9d1dc,0 0 0 4px #000,6px 8px 0 4px rgba(0,0,0,.6);display:flex;flex-direction:column;align-items:center}
.pmg-panel .pmg-col{width:100%}
.pmg-row{display:flex;align-items:center;justify-content:space-between;gap:10px;font:16px ${HUDF};letter-spacing:1px;padding:6px 2px;border-bottom:1px solid #2f343d}
.pmg-nowp{font:13px ${HUDF};color:#ffcf7a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.pmg-row small{display:block;font:11px ${HUDF};color:#9aa3b0;letter-spacing:1px;margin-top:2px}
.pmg-slider input[type=range]{flex:1;max-width:46%;accent-color:#ffc21a;height:28px;cursor:pointer}
.pmg-toggle{appearance:none;min-width:84px;border:2px solid #c9d1dc;border-radius:3px;background:#15171c;color:#fff;font:14px ${HUDF};padding:8px 10px;cursor:pointer;flex:none}
.pmg-toggle[aria-pressed="true"]{background:linear-gradient(#fff7c2,#ffc21a 45%,#e07b00 55%,#ffd45a);color:#000;border-color:#000}
.pmg-toggle:focus-visible{outline:3px solid #fff;outline-offset:3px}
.pmg-mini{appearance:none;border:2px solid #c9d1dc;border-radius:3px;background:rgba(12,12,16,.85);color:#fff;font:12px ${HUDF};padding:8px 10px;cursor:pointer;white-space:nowrap}
.pmg-mini[aria-pressed="true"]{border-color:#6b7380;color:#9aa3b0}
.pmg kbd{background:#15171c;border:2px solid #c9d1dc;border-radius:3px;padding:0 6px;font:12px ${HUDF};color:#fff;white-space:nowrap}
.pmg-ctl{display:grid;grid-template-columns:auto 1fr;gap:7px 14px;align-items:center;width:100%;color:#efdcc6;font-size:14px;line-height:1.5;margin-bottom:14px}
.pmg-ctl b{font:13px ${HUDF};color:#ffcf7a;letter-spacing:1px;text-align:right}
.pmg-ctl h4{grid-column:1/-1;margin:8px 0 0;font:14px ${HUDF};color:#fff;letter-spacing:2px;border-bottom:1px solid #2f343d;padding-bottom:4px}
.pmg-hint{color:#c9c2b6;font-size:13px;margin-top:10px;text-align:center}
.pmg-keybtn{appearance:none;background:#15171c;border:2px solid #c9d1dc;border-radius:3px;padding:2px 8px;font:12px ${HUDF};color:#fff;cursor:pointer;margin:0 4px 2px 0;min-width:34px}
.pmg-keybtn:hover{border-color:#ffc21a}
.pmg-keybtn.listening{background:#ffc21a;color:#000;border-color:#000;animation:pmgblink 1s steps(1) infinite}
.pmg-ctl .pmg-alt,.pmg-ctl .pmg-note{color:#9aa3b0;font-size:12px;margin-left:4px}
.pmg-unlock{display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:center;padding:10px 2px;border-bottom:1px solid #2f343d}
.pmg-unlock h5{margin:0;font:15px ${HUDF};letter-spacing:1px;color:#fff}
.pmg-unlock p{margin:2px 0 0;font-size:12.5px;color:#d9dde6;line-height:1.4}
.pmg-unlock .cost{font:13px ${HUDF};color:#ffcf7a;letter-spacing:1px}
.pmg-unlock .pmg-toggle{grid-row:1/3}
.pmg-diff{display:flex;gap:8px;justify-content:center;margin:0 0 16px;flex-wrap:wrap}
.pmg-code{font:12px ${HUDF};letter-spacing:1px;color:#9aa3b0;margin:-8px 0 16px;text-align:center;max-width:46ch;line-height:1.6}
.pmg-code b{color:#fff;letter-spacing:3px;font-size:14px}
.pmg-codeval{font:16px ${HUDF};letter-spacing:4px;color:#ffcf7a}
.pmg-profile{width:100%;padding:6px 2px 10px;border-bottom:1px solid #2f343d}
.pmg-loadcode{display:flex;gap:8px;align-items:stretch}
.pmg-input{flex:1;min-width:0;appearance:none;background:#0c0c12;border:2px solid #c9d1dc;border-radius:3px;color:#fff;font:16px ${HUDF};letter-spacing:3px;padding:8px 10px;text-transform:uppercase}
.pmg-input:focus{outline:none;border-color:#ffc21a}
.pmg-card.locked{cursor:pointer}
.pmg-card.locked img,.pmg-card.locked .ph{filter:grayscale(1) brightness(.45)}
.pmg-lock{position:absolute;top:0;left:0;right:0;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font:15px ${HUDF};color:#ffc21a;letter-spacing:1px;text-shadow:2px 2px 0 #000;padding:8px}
.pmg-lock small{font:11px ${HUDF};color:#fff;letter-spacing:2px}
.pmg-diff .pmg-toggle{min-width:120px}
.pmg-diff .pmg-toggle:disabled{opacity:.55;cursor:not-allowed}
.pmg-link{appearance:none;background:none;border:0;color:#9aa3b0;font:12px ${HUDF};letter-spacing:2px;cursor:pointer;text-decoration:underline;padding:6px;margin-top:8px}
.pmg-link:hover{color:#fff}
.pmg-pad{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:14px;width:100%;max-width:100%;padding:0 4px}
.pmg-pad.overlay{position:absolute;left:10px;right:10px;bottom:10px;width:auto;margin:0;padding:0;pointer-events:none;align-items:flex-end}
.pmg-pad.overlay>*{pointer-events:auto}
.pmg-dpad{position:relative;width:clamp(120px,40vw,190px);aspect-ratio:1;border-radius:50%;background:rgba(12,12,16,.55);border:3px solid rgba(201,209,220,.9);touch-action:none;flex:none}
.pmg-pad.overlay .pmg-dpad{width:clamp(96px,26vh,140px)}
.pmg-gest{position:absolute;inset:0;touch-action:none}
.pmg-dpad .ar{position:absolute;font:14px ${HUDF};color:#e6eaf0;line-height:1}
.pmg-knob{position:absolute;left:50%;top:50%;width:42%;height:42%;margin:-21% 0 0 -21%;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#a9b2bf 40%,#4a5160);border:3px solid #000;pointer-events:none}
.pmg-cluster{--kb:clamp(56px,17vw,84px);display:grid;grid-template-columns:repeat(3,var(--kb));grid-template-rows:repeat(3,var(--kb));gap:0;flex:none}
.pmg-pad.overlay .pmg-cluster{--kb:clamp(48px,13vh,64px)}
.pmg-key{appearance:none;border:3px solid #c9d1dc;background:rgba(12,12,16,.7);color:#fff;border-radius:50%;width:var(--kb);height:var(--kb);
  font:700 11px system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:none;padding:0;gap:1px;box-shadow:0 3px 0 #000}
.pmg-key:active{transform:translateY(2px);box-shadow:none;background:rgba(40,40,52,.9)}
.pmg-key span{font:calc(var(--kb) * .34) ${HUDF};line-height:1}
.pmg-key.p{border-color:#ffc21a;grid-area:2/1}
.pmg-key.k{border-color:#c9d1dc;grid-area:2/3}
.pmg-key.sp{border-color:#FF2300;grid-area:1/2}
.pmg-key.g{border-color:#2ED47A;grid-area:3/2}
.pmg-over{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;padding-bottom:12%;pointer-events:none}
.pmg-over .pmg-col{pointer-events:auto;width:min(320px,80%)}
.pmg-rotate{color:#9aa3b0;font-size:12px;margin-top:10px;text-align:center}
.pmg-intro{position:fixed;inset:0;z-index:50;background:#050304;display:flex;align-items:center;justify-content:center;cursor:pointer}
.pmg-intro canvas{width:100%;height:100%;display:block}
.pmg-skip{position:absolute;bottom:18px;right:20px;font:12px ${HUDF};color:#8a8f99;letter-spacing:2px}
.pmg-tap{font:clamp(16px,3vw,22px) ${HUDF};color:#e9e3d6;letter-spacing:4px}
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

function TapKey({ glyph, label, cls, onPress, onRelease }: { glyph: string; label: string; cls: string; onPress: () => void; onRelease?: (heldMs: number) => void }) {
  const t0 = useRef(0);
  return (
    <button
      className={`pmg-key ${cls}`} aria-label={label}
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); t0.current = performance.now(); onPress(); }}
      onPointerUp={() => { if (onRelease && t0.current) onRelease(performance.now() - t0.current); t0.current = 0; }}
      onPointerCancel={() => { t0.current = 0; }}
      onContextMenu={(e) => e.preventDefault()}
    ><span>{glyph}</span>{label}</button>
  );
}

/** Touch: the four attack buttons in a diamond — Punch left, Kick right, Special top, Grab bottom. */
function ButtonCluster({ onTap }: { onTap: (b: Btn | "release") => void }) {
  return (
    <div className="pmg-cluster" role="group" aria-label="Attack buttons">
      <TapKey glyph="P" label="Punch" cls="p" onPress={() => onTap("punch")} onRelease={(ms) => { onTap(ms >= SIG_HOLD * 1000 / 60 ? "sig" : "release"); }} />
      <TapKey glyph="K" label="Kick" cls="k" onPress={() => onTap("kick")} />
      <TapKey glyph="S" label="Special" cls="sp" onPress={() => onTap("special")} />
      <TapKey glyph="G" label="Grab" cls="g" onPress={() => onTap("grab")} />
    </div>
  );
}

/** Touch: defend by swiping the arena itself — swipe down = duck, swipe sideways = dodge, two fingers at once = parry. */
function GestureLayer({ onGesture }: { onGesture: (b: Btn) => void }) {
  const pts = useRef(new Map<number, { x: number; y: number; t: number }>());
  const lastParry = useRef(0);
  const down = (e: RPointerEvent<HTMLDivElement>) => {
    e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
    if (pts.current.size >= 2 && performance.now() - lastParry.current > 300) { lastParry.current = performance.now(); onGesture("parry"); }
  };
  const up = (e: RPointerEvent<HTMLDivElement>) => {
    const p = pts.current.get(e.pointerId); pts.current.delete(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (performance.now() - p.t > 900 || Math.hypot(dx, dy) < 28) return;        // a tap or a slow drag: not a swipe
    if (Math.abs(dy) > Math.abs(dx)) { if (dy > 0) onGesture("duck"); }
    else onGesture("dodge");
  };
  return (
    <div className="pmg-gest" aria-hidden="true"
      onPointerDown={down} onPointerUp={up}
      onPointerCancel={(e) => pts.current.delete(e.pointerId)} onContextMenu={(e) => e.preventDefault()} />
  );
}

/** The controls, laid out in one panel (opened with the ? button, also inside the pause menu). */
const ACTION_NOTE: Partial<Record<Action, string>> = {
  left: "hold away from your rival to block", punch: "tap three times for the combo", kick: "roundhouse; crouching = sweep",
  special: "needs 3 bars · with full HEAT = the finisher", grab: "breaks a block", duck: "under punches and specials", parry: "the first 8 frames catch a strike",
};
/** The controls, laid out in one panel (opened with the ? button, also inside the pause menu).
 *  On a keyboard every key is a button: click it, press the new key, done. Saved in this browser. */
function ControlsHelp({ touch, cpu }: { touch: boolean; cpu: boolean }) {
  const [listening, setListening] = useState<{ p: 0 | 1; a: Action } | null>(null);
  const [, bump] = useState(0);
  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (e.code !== "Escape") bindKey(listening.p, listening.a, e.code);
      setListening(null); bump((n) => n + 1);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [listening]);
  if (touch) return (
    <div className="pmg-ctl">
      <h4>MOVE</h4>
      <b>STICK</b><span>Left / right walk · up jumps · down crouches · hold it <em>away</em> from your rival to block</span>
      <h4>ATTACK</h4>
      <b>P</b><span>Punch — tap up to three times for the combo. Crouching: low punch</span>
      <b>K</b><span>Kick — roundhouse (knocks down). Crouching: sweep. In the air: jump kick</span>
      <b>S</b><span>Special (needs 3 bars) — with full HEAT: the cinematic finisher</span>
      <b>G</b><span>Grab and slam — breaks through a block</span>
      <b>HOLD P</b><span>Hold Punch about a third of a second and let go: your fighter's <em>signature move</em> (each one is different)</span>
      <b>COUNTER</b><span>Hit them while they're winding up: 30% more damage, and a jab then links into a kick</span>
      <h4>DEFEND — SWIPE THE ARENA</h4>
      <b>SWIPE ↓</b><span>Duck under punches, high kicks and specials</span>
      <b>SWIPE ← →</b><span>Dodge: sidestep anything except a grab</span>
      <b>2 FINGERS</b><span>Tap with two fingers to parry a strike the moment it lands</span>
      <h4>CONTROLLER</h4>
      <b>PAD</b><span>{PAD_HINT}</span>
    </div>
  );
  const rows = (p: 0 | 1) => ACTIONS.map((a) => (
    <span key={a} style={{ display: "contents" }}>
      <b>{ACTION_LABEL[a].toUpperCase()}</b>
      <span>
        {keysFor(p, a).map((k) => (
          <button key={k} className={`pmg-keybtn${listening?.p === p && listening.a === a ? " listening" : ""}`} onClick={() => setListening({ p, a })} aria-label={`${ACTION_LABEL[a]}: ${keyName(k)}. Click to change`}>
            {listening?.p === p && listening.a === a ? "PRESS A KEY…" : keyName(k)}
          </button>
        ))}
        {keysFor(p, a).length === 0 && <button className={`pmg-keybtn${listening?.p === p && listening.a === a ? " listening" : ""}`} onClick={() => setListening({ p, a })}>{listening?.p === p && listening.a === a ? "PRESS A KEY…" : "SET"}</button>}
        {p === 0 && cpu && keysFor(1, a).length > 0 && <small className="pmg-alt">or {keysFor(1, a).map(keyName).join(" / ")}</small>}
        {ACTION_NOTE[a] && <small className="pmg-note">— {ACTION_NOTE[a]}</small>}
      </span>
    </span>
  ));
  return (
    <div className="pmg-ctl">
      <h4>{cpu ? "KEYBOARD — CLICK A KEY TO CHANGE IT" : "PLAYER 1 — CLICK A KEY TO CHANGE IT"}</h4>
      {rows(0)}
      {!cpu && <><h4>PLAYER 2</h4>{rows(1)}</>}
      <h4>GAME</h4>
      <b>COUNTER</b><span>hit them while they're winding up: 30% more damage, and a jab links into a kick · a blocked jab leaves you ahead, a blocked kick or sweep can be punished</span>
      <b>SIGNATURE</b><span>hold <kbd>{keysFor(0, "punch").map(keyName).join(" / ")}</kbd> about a third of a second, let go — every fighter's is different (see the select screen)</span>
      <b>PAUSE</b><span><kbd>P</kbd> or <kbd>Esc</kbd> · <small className="pmg-note">special also: <kbd>↓</kbd> <kbd>→</kbd> + punch</small></span>
      <b>CONTROLLER</b><span><small className="pmg-note">{PAD_HINT}</small></span>
      <b></b><span><button className="pmg-mini" onClick={() => { resetKeys(0); resetKeys(1); bump((n) => n + 1); }}>RESET TO DEFAULT KEYS</button></span>
    </div>
  );
}


/* ================================================================== */
/*  SOUND — music playlist + synthesised hit sounds (no sound files)   */
/* ================================================================== */

const store = {
  get(k: string, d: boolean) { try { const v = localStorage.getItem("pmg-" + k); return v === null ? d : v === "1"; } catch { return d; } },
  set(k: string, v: boolean) { try { localStorage.setItem("pmg-" + k, v ? "1" : "0"); } catch { /* private mode: ignore */ } },
  num(k: string, d: number) { try { const v = localStorage.getItem("pmg-" + k); if (v === null) return d; const n = Number(v); return Number.isFinite(n) ? n : d; } catch { return d; } },
  setNum(k: string, v: number) { try { localStorage.setItem("pmg-" + k, String(v)); } catch { /* private mode: ignore */ } },
};

/** Motion: one switch for people who get motion-sick or just want a calmer screen. Follows the system's reduce-motion setting
 *  until changed here. Off = no camera shake, no finisher strobe, no screen wipes or slam-in animations (things still move in the fight). */
const Motion = {
  reduced: (() => { const sys = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches; try { const v = localStorage.getItem("pmg-reduced-motion"); return v === null ? sys : v === "1"; } catch { return sys; } })(),
  set(v: boolean) { this.reduced = v; store.set("reduced-motion", v); Sound.emit(); },
};

type AudioListener = () => void;
const Sound = {
  music: null as HTMLAudioElement | null,
  order: [] as number[], pos: -1,
  musicOn: store.get("music", true), fxOn: store.get("fx", true),
  musicVol: store.num("vol-music", 70), fxVol: store.num("vol-fx", 100),       // 0–100 sliders in Settings
  started: false, title: "",
  holdMusic: true,                                  // no music until the intro is over
  ctx: null as AudioContext | null, fxGain: null as GainNode | null, noise: null as AudioBuffer | null,
  listeners: new Set<AudioListener>(),
  emit() { this.listeners.forEach((l) => l()); },

  /** Browsers only allow sound after a tap/click/key — call this from any user action. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        this.ctx = new AC();
        this.fxGain = this.ctx.createGain(); this.fxGain.gain.value = 0.55 * (this.fxVol / 100); this.fxGain.connect(this.ctx.destination);
        const n = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate), d = n.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        this.noise = n;
      }
    }
    this.ctx?.resume?.();
    if (!this.started && !this.holdMusic) { this.started = true; if (this.musicOn) this.next(); }
  },
  /** The intro is over: let the music start (right away if sound is already unlocked). */
  releaseMusic() { this.holdMusic = false; if (this.ctx) this.unlock(); },

  /**
   * Spray-paint sound for the intro: the mixing ball rattling in the can, then the hiss of the nozzle.
   * `at` = seconds from now the spraying starts, `dur` = how long it sprays, `passes` = strokes across the wall
   * (the hiss swells mid-stroke and dips where the hand turns around). Returns a function that cuts it off.
   */
  spray(at: number, dur: number, passes: number): () => void {
    const c = this.ctx, out = this.fxGain;
    if (!c || !out || !this.fxOn || !this.noise) return () => {};
    const now = c.currentTime, t0 = now + at, end = t0 + dur;
    const nodes: AudioScheduledSourceNode[] = [];
    // shake: four clacks of the mixing ball before the first stroke
    for (let k = 0; k < 4; k++) {
      const tt = now + Math.max(0, at - 0.44) + k * 0.1;
      const n = c.createBufferSource(); n.buffer = this.noise;
      const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2800;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.5, tt + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.03);
      n.connect(hp).connect(g).connect(out); n.start(tt, Math.random() * 0.5); n.stop(tt + 0.05); nodes.push(n);
      const o = c.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(2300 + k * 90, tt);
      const og = c.createGain(); og.gain.setValueAtTime(0.0001, tt); og.gain.exponentialRampToValueAtTime(0.12, tt + 0.002); og.gain.exponentialRampToValueAtTime(0.0001, tt + 0.04);
      o.connect(og).connect(out); o.start(tt); o.stop(tt + 0.06); nodes.push(o);
    }
    // hiss: bright filtered noise with a little nozzle flutter
    const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2600; hp.Q.value = 0.5;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 6800; bp.Q.value = 0.55;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.42, t0 + 0.04);
    const per = dur / passes;
    for (let p = 0; p < passes; p++) {
      const ps = t0 + p * per;
      g.gain.setTargetAtTime(0.5, ps + 0.03, 0.06);              // swell across the stroke
      g.gain.setTargetAtTime(0.3, ps + per - 0.07, 0.025);       // hand turns around
    }
    g.gain.setTargetAtTime(0.0001, end, 0.035);
    const lfo = c.createOscillator(); lfo.frequency.value = 7.5;
    const depth = c.createGain(); depth.gain.value = 450;
    lfo.connect(depth).connect(bp.frequency);
    src.connect(hp).connect(bp).connect(g).connect(out);
    src.start(t0, Math.random() * 0.5); src.stop(end + 0.35); lfo.start(t0); lfo.stop(end + 0.35);
    nodes.push(src, lfo);
    return () => { const t = c.currentTime; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0.0001, t, 0.02); nodes.forEach((n) => { try { n.stop(t + 0.1); } catch { /* already stopped */ } }); };
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
      this.music = new Audio(); this.music.volume = 0.7 * (this.musicVol / 100); this.music.preload = "auto";
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
  toggleFx() { this.fxOn = !this.fxOn; store.set("fx", this.fxOn); this.emit(); },
  setMusicVol(v: number) { this.musicVol = Math.max(0, Math.min(100, Math.round(v))); store.setNum("vol-music", this.musicVol); if (this.music) this.music.volume = 0.7 * (this.musicVol / 100); this.emit(); },
  setFxVol(v: number) { this.fxVol = Math.max(0, Math.min(100, Math.round(v))); store.setNum("vol-fx", this.fxVol); if (this.fxGain) this.fxGain.gain.value = 0.55 * (this.fxVol / 100); this.emit(); },

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
      case "dodge": noise(1600, 500, 0.9, 0.22, 0.16); break;                                   // whoosh past
      case "parry": tone("sine", 1500, 3000, 0.25, 0.18); tone("triangle", 2200, 2600, 0.12, 0.25, 0.04); noise(6000, 4000, 3, 0.25, 0.06); break;
      case "grab": noise(500, 120, 0.8, 0.6, 0.2, "lowpass"); tone("sine", 110, 45, 0.7, 0.25); break;
      case "finisher": tone("sine", 700, 120, 0.25, 0.5); tone("sawtooth", 60, 450, 0.25, 0.6, 0.05); noise(300, 2500, 0.6, 0.3, 0.7); break;
    }
  },
};

/** Voice lines: short mp3 clips, one <audio> each, cached. Follows the SOUND FX switch. */
const Voice = {
  cache: new Map<string, HTMLAudioElement>(),
  say(name: string, vol = 0.9) {
    if (!Sound.fxOn) return;
    if (!voiceUrl(name)) return;
    let a = this.cache.get(name);
    if (!a) { a = new Audio(voiceUrl(name)); a.preload = "auto"; a.addEventListener("error", () => a!.dataset.missing = "1"); this.cache.set(name, a); }
    if (a.dataset.missing) return;
    a.volume = vol * (Sound.fxVol / 100); a.currentTime = 0; a.play().catch(() => { /* blocked until a tap, or no clip */ });
  },
  preload(names: string[]) { for (const n of names) if (voiceUrl(n) && !this.cache.has(n)) { const a = new Audio(voiceUrl(n)); a.preload = "auto"; a.addEventListener("error", () => a.dataset.missing = "1"); this.cache.set(n, a); } },
};

function useSound() {
  const [, set] = useState(0);
  useEffect(() => { const l = () => set((n) => n + 1); Sound.listeners.add(l); return () => { Sound.listeners.delete(l); }; }, []);
  return Sound;
}

/** Street Cred shop: what the cred buys. */
function UnlocksPanel({ onClose }: { onClose: () => void }) {
  const [, bump] = useState(0);
  const bal = Cred.get(), owned = Cred.owned();
  return (
    <div className="pmg-modal" role="dialog" aria-label="Unlocks">
      <div className="pmg-panel">
        <h2 className="pmg-h2" style={{ margin: "0 0 4px" }}>UNLOCKS</h2>
        <p className="pmg-cred" style={{ margin: "0 0 10px" }}>STREET CRED · {bal.toLocaleString()}</p>
        <div className="pmg-col">
          {UNLOCKS.map((u) => {
            const has = owned.has(u.id), can = bal >= u.cost;
            return (
              <div className="pmg-unlock" key={u.id}>
                <h5>{u.name}</h5>
                {has && u.id === "altcolors"
                  ? <button className="pmg-toggle" aria-pressed={Cred.altOn()} onClick={() => { Sound.unlock(); store.set("altcolors", !Cred.altOn()); bump((n) => n + 1); }}>{Cred.altOn() ? "ON" : "OFF"}</button>
                  : <button className="pmg-toggle" aria-pressed={has} disabled={has || !can} onClick={() => { Sound.unlock(); if (Cred.buy(u.id)) { Sound.play("round"); bump((n) => n + 1); } }}>{has ? "OWNED" : can ? "BUY" : "LOCKED"}</button>}
                <p>{u.blurb}</p>
                <span className="cost">{has ? "UNLOCKED" : `${u.cost.toLocaleString()} CRED`}</span>
              </div>
            );
          })}
          <p className="pmg-hint" style={{ margin: "4px 0 0" }}>Earn cred by beating the computer: EASY +100 · MEDIUM +250 · HARD +500 per match.</p>
          <button className="pmg-btn ghost" onClick={onClose}>BACK</button>
        </div>
      </div>
    </div>
  );
}

/** Settings: music, sound effects, next song. Opened from the MENU button (fight) or SETTINGS (home screen). */
/** Settings: your player code, and a box to type a code from another device — its cred, unlocks and keys come over and merge. */
function ProfileRow() {
  const [typed, setTyped] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const code = typed.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length !== 8) { setMsg("A player code is 8 letters and digits, like 7KQ2-M9FD."); return; }
    setBusy(true);
    const r = await Profile.pull(code, true);
    setBusy(false);
    if (r === "loaded") { Profile.setCode(code); Profile.push(); setMsg(`Loaded. Street Cred ${Cred.get().toLocaleString()} · ${Cred.owned().size} unlocks. This device now uses ${Profile.pretty(code)}.`); setTyped(""); }
    else if (r === "none") setMsg("No save under that code yet — check the letters (O and 0, I and 1 are never used).");
    else if (r === "off") setMsg("Cloud save is off in this build; your progress still stays in this browser.");
    else setMsg("Couldn't reach the server. Try again in a moment.");
  };
  return (
    <div className="pmg-profile">
      <div className="pmg-row"><span>PLAYER CODE</span><b className="pmg-codeval">{Profile.pretty()}</b></div>
      <p className="pmg-hint" style={{ margin: "6px 0 8px", textAlign: "left" }}>{CLOUD_ON ? "Your Street Cred, unlocks and keys are saved to this code. On another computer or phone, type it below to bring them over." : "Your Street Cred, unlocks and keys are saved in this browser."}</p>
      {CLOUD_ON && (
        <div className="pmg-loadcode">
          <input className="pmg-input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="XXXX-XXXX" maxLength={9} spellCheck={false} autoCapitalize="characters" aria-label="Player code from another device" onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") load(); }} />
          <button className="pmg-toggle" disabled={busy} onClick={load}>{busy ? "…" : "LOAD CODE"}</button>
        </div>
      )}
      {msg && <p className="pmg-hint" style={{ margin: "6px 0 0", textAlign: "left", color: "#ffcf7a" }}>{msg}</p>}
    </div>
  );
}

function SettingsPanel({ onClose, extra }: { onClose: () => void; extra?: ReactNode }) {
  const s = useSound();
  return (
    <div className="pmg-modal" role="dialog" aria-label="Menu">
      <div className="pmg-panel">
        <h2 className="pmg-h2" style={{ margin: "0 0 14px" }}>{extra ? "PAUSED" : "SETTINGS"}</h2>
        <div className="pmg-col">
          {extra}
          <div className="pmg-row"><span>MUSIC</span><button className="pmg-toggle" aria-pressed={s.musicOn} onClick={() => { s.unlock(); s.toggleMusic(); }}>{s.musicOn ? "ON" : "OFF"}</button></div>
          <div className="pmg-row pmg-slider"><span>MUSIC VOLUME <small>{s.musicVol}%</small></span><input type="range" min={0} max={100} value={s.musicVol} aria-label="Music volume" onChange={(e) => { s.unlock(); s.setMusicVol(Number(e.target.value)); }} onKeyDown={(e) => e.stopPropagation()} /></div>
          <div className="pmg-row"><span>SOUND FX &amp; VOICE</span><button className="pmg-toggle" aria-pressed={s.fxOn} onClick={() => { s.unlock(); s.toggleFx(); }}>{s.fxOn ? "ON" : "OFF"}</button></div>
          <div className="pmg-row pmg-slider"><span>FX VOLUME <small>{s.fxVol}%</small></span><input type="range" min={0} max={100} value={s.fxVol} aria-label="Sound effects volume" onChange={(e) => { s.unlock(); s.setFxVol(Number(e.target.value)); }} onKeyDown={(e) => e.stopPropagation()} onPointerUp={() => s.play("hit")} /></div>
          <div className="pmg-row"><span>REDUCED MOTION <small>no shake, strobe or wipes</small></span><button className="pmg-toggle" aria-pressed={Motion.reduced} onClick={() => { s.unlock(); Motion.set(!Motion.reduced); }}>{Motion.reduced ? "ON" : "OFF"}</button></div>
          <div className="pmg-row"><span className="pmg-nowp">♪ {s.musicOn ? (s.title || "—") : "Music off"}</span><button className="pmg-toggle" onClick={() => { s.unlock(); if (!s.musicOn) s.toggleMusic(); else s.next(); }}>NEXT ▶▶</button></div>
          {!extra && <ProfileRow />}
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
  // Browsers block sound until the viewer taps once, so the intro waits for that tap — then plays with its spray sound.
  const [started, setStarted] = useState(false);
  const finish = () => { if (!doneRef.current) { doneRef.current = true; store.set("intro-seen", true); Sound.releaseMusic(); onDone(); } };

  useEffect(() => {
    if (!started) return;
    const cv = ref.current!, ctx = cv.getContext("2d")!;
    let raf = 0, alive = true, t0 = 0, stopSpray = () => {};
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
      canCam = new THREE.PerspectiveCamera(28, CW / CH, 0.01, 10); canCam.position.set(0, 0.1, 0.8); canCam.lookAt(0, 0.1, 0);   // pulled back: the whole can fits
      gltfLoader().loadAsync(assetUrl("spraycan")).then((g) => { can = g.scene; canScene!.add(can); }).catch(() => {});
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
      if (!t0) { t0 = now; stopSpray = Sound.spray(0.45, SPRAY, ROWS); }
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
    return () => { alive = false; cancelAnimationFrame(raf); canR?.dispose(); stopSpray(); };
  }, [started]);

  const start = () => { Sound.unlock(); setStarted(true); };
  if (!started) return (
    <div className="pmg-intro" onPointerDown={start} onKeyDown={start} role="button" tabIndex={0} aria-label="Start">
      <div className="pmg-tap pmg-blink">TAP TO START</div>
    </div>
  );
  return (
    <div className="pmg-intro" onPointerDown={() => { Sound.unlock(); finish(); }} role="button" aria-label="Skip intro">
      <canvas ref={ref} />
      <div className="pmg-skip">TAP TO SKIP</div>
    </div>
  );
}

export default function PMGFight3D({ onExit }: { onExit?: () => void } = {}) {
  // the spray-paint intro plays on the first visit; after that the title comes straight up (REPLAY INTRO brings it back)
  const [screen, setScreen] = useState<"intro" | "menu" | "select" | "stage" | "fight">(() => (store.get("intro-seen", false) ? "menu" : "intro"));
  // screen changes go through a slanted wipe (motion-graphics style); reduced motion switches at once
  const [wipe, setWipe] = useState(false);
  const moving = useRef(false);                                   // a wipe is under way: taps wait until it's done
  const go = (next: "intro" | "menu" | "select" | "stage" | "fight") => {
    if (moving.current) return;
    if (Motion.reduced) { setScreen(next); return; }
    moving.current = true;
    setWipe(true); setTimeout(() => setScreen(next), 260); setTimeout(() => { setWipe(false); moving.current = false; }, 700);
  };
  useSound();                                                     // re-render when the reduced-motion switch flips
  const [loc, setLoc] = useState<LocationId>("streets");
  const [stagePics, setStagePics] = useState<Record<string, string> | null>(null);
  const [mode, setMode] = useState<"cpu" | "2p">("cpu");
  const [picks, setPicks] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [portraits, setPortraits] = useState<Record<string, string> | null>(null);
  const [settings, setSettings] = useState(false);
  const [unlocks, setUnlocks] = useState(false);
  const [quickPick, setQuickPick] = useState(false);          // SELECT CHARACTER: you pick, the rival and the turf are random
  const [diff, setDiff] = useState<Difficulty>("EASY");
  const isTouch = useIsTouch();

  useEffect(() => { if (screen !== "intro" && !portraits) renderPortraits().then(setPortraits); }, [screen, portraits]);
  useEffect(() => { getLogo(); if (screen === "menu") Sound.releaseMusic(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps
  // Leaving the game (back to Propworld) must silence the soundtrack.
  useEffect(() => () => { Sound.music?.pause(); }, []);
  // the profile: recognise a returning player (saved in this browser; pulled from the cloud when the site has one)
  const [, bumpProfile] = useState(0);
  useEffect(() => { const l = () => bumpProfile((n) => n + 1); Profile.listeners.add(l); Profile.pull(); return () => { Profile.listeners.delete(l); }; }, []);

  /** QUICK FIGHT: a random fighter against a random rival on a random turf — one tap from the title to the block. */
  const quickFight = (a = -1) => {
    if (a < 0) { const open = ROSTER.map((_, i) => i).filter((i) => !fighterLocked(ROSTER[i].id)); a = open[Math.floor(Math.random() * open.length)]; }
    let b = Math.floor(Math.random() * (ROSTER.length - 1)); if (b >= a) b++;
    const pool = DIFFICULTIES.filter((d) => d !== "HARD" || Cred.has("hardturf"));
    setMode("cpu"); setPicks([a, b]); setLoc(LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)].id); setDiff(pool[Math.floor(Math.random() * pool.length)]);
    setQuickPick(false); setRound((r) => r + 1); go("fight");
  };
  useEffect(() => { if (screen === "stage" && !stagePics) renderStagePreviews().then(setStagePics); }, [screen, stagePics]);

  // alt colours (an unlock) recolour player 1; memoised so the fight doesn't restart on every render
  const altOn = Cred.altOn();
  const fighters = useMemo(() => picks.length === 2 ? [altOn ? withAlt(ROSTER[picks[0]]) : ROSTER[picks[0]], ROSTER[picks[1]]] : [], [picks, altOn]);

  const choose = (i: number) => {
    if (moving.current || picks.length >= 2) return;              // a fast double tap can't add a third fighter
    if (quickPick) { quickFight(i); return; }
    const next = [...picks, i];
    if (next.length === 2) { setPicks(next); go("stage"); }
    else setPicks(next);
  };

  return (
    <div className={`pmg ${screen}${Motion.reduced ? " rm" : ""}`} onPointerDownCapture={() => Sound.unlock()} onKeyDownCapture={() => Sound.unlock()}>
      {wipe && <div className="pmg-wipe" aria-hidden="true" />}
      {onExit && <button onClick={onExit} style={{ position: "fixed", top: 12, left: 12, zIndex: 9999, padding: "8px 14px", background: "rgba(0,0,0,.7)", color: "#f5f0e6", border: "1px solid #f5f0e6", font: "700 12px/1 Barlow, sans-serif", letterSpacing: ".12em", cursor: "pointer" }}>← PROPWORLD</button>}
      <style>{CSS}</style>
      {screen === "intro" && <SprayIntro onDone={() => go("menu")} />}
      {settings && <SettingsPanel onClose={() => setSettings(false)} />}
      {unlocks && <UnlocksPanel onClose={() => setUnlocks(false)} />}

      {screen === "menu" && (
        <>
          <h1 className="pmg-titlewrap" aria-label="PMG Fight">
            <span className="pmg-burst" aria-hidden="true" />
            <img className="pmg-titlelogo" src={LOGO_URL} alt="PMG" />
            <span className="pmg-fight">FIGHT</span>
          </h1>
          <p className="pmg-tag">STREETS OF NEW YORK</p>
          <p className="pmg-sub">The Propmyganda roster settles it on the block. Best of three rounds.</p>
          <p className="pmg-cred">{Profile.returning() ? "WELCOME BACK · " : ""}STREET CRED · {Cred.get().toLocaleString()}</p>
          <p className="pmg-code">PLAYER CODE <b>{Profile.pretty()}</b>{CLOUD_ON ? " · your cred follows this code — type it in Settings on another device" : ""}</p>
          <div className="pmg-col">
            <button className="pmg-btn primary" style={{ ["--i" as string]: 0 }} onClick={() => quickFight()}>
              QUICK FIGHT<small>Random fighters, random turf — straight to the block</small>
            </button>
            <button className="pmg-btn" style={{ ["--i" as string]: 1 }} onClick={() => { setMode("cpu"); setPicks([]); setQuickPick(true); go("select"); }}>
              SELECT CHARACTER<small>Pick your fighter — random rival, random turf</small>
            </button>
            <button className="pmg-btn ghost" style={{ ["--i" as string]: 2 }} onClick={() => { setMode("cpu"); setPicks([]); setQuickPick(false); go("select"); }}>
              1 PLAYER<small>Pick your fighter, your rival and the turf</small>
            </button>
            <button className="pmg-btn ghost" style={{ ["--i" as string]: 3 }} onClick={() => { setMode("2p"); setPicks([]); setQuickPick(false); go("select"); }}>
              2 PLAYERS<small>Two people, one keyboard</small>
            </button>
            <button className="pmg-btn ghost" style={{ ["--i" as string]: 4 }} onClick={() => setUnlocks(true)}>UNLOCKS<small>Spend your Street Cred · {Cred.owned().size} of {UNLOCKS.length} owned</small></button>
            <button className="pmg-btn ghost" style={{ ["--i" as string]: 5 }} onClick={() => setSettings(true)}>SETTINGS<small>Music · sound effects · next song</small></button>
          </div>
          <button className="pmg-link" onClick={() => go("intro")}>REPLAY INTRO</button>
        </>
      )}

      {screen === "select" && (
        <>
          <h1 className="pmg-h2">
            {quickPick ? "SELECT YOUR FIGHTER" : picks.length === 0 ? "PLAYER 1 · SELECT YOUR FIGHTER" : mode === "cpu" ? "PICK YOUR RIVAL" : "PLAYER 2 · SELECT YOUR FIGHTER"}
          </h1>
          <p className="pmg-sub">{quickPick ? "Tap or click a fighter — a random rival and turf are waiting." : "Stats are 1 to 10. Tap or click a fighter."}</p>
          <div className="pmg-grid">
            {ROSTER.map((r, i) => {
              // a locked fighter can be picked as the rival (the computer's side), never as a player
              const locked = fighterLocked(r.id) && (mode === "2p" || quickPick || picks.length === 0);
              const price = UNLOCKS.find((u) => u.id === LOCKED_FIGHTER[r.id])?.cost ?? 0;
              return (
              <button key={r.id} className={`pmg-card${locked ? " locked" : ""}`} style={{ ["--i" as string]: i }} aria-pressed={picks[0] === i} aria-disabled={locked} onClick={() => (locked ? setUnlocks(true) : choose(i))}>
                {portraits?.[r.id] ? <img src={portraits[r.id]} alt={`${r.name} portrait`} /> : <div className="ph">{portraits ? "NO MODEL" : "LOADING…"}</div>}
                {locked && <span className="pmg-lock">🔒 {price.toLocaleString()} CRED<small>TAP TO UNLOCK</small></span>}
                {picks[0] === i && <span className="pmg-badge">P1</span>}
                <h3>{r.name.toUpperCase()}</h3>
                <div className="bar" style={{ background: r.color }} />
                <div className="meta">{r.lookLabel} · {r.style}</div>
                <div className="arch"><b>{archOf(r).displayName}</b> {archOf(r).passiveDesc} <i>{archOf(r).weakness}</i></div>
                <div className="arch sig"><b>SIG · {r.sigName}</b> {r.sigDesc} <i>Hold Punch, let go.</i></div>
                {(["power", "speed", "defense", "special"] as const).map((k) => (
                  <div className="pmg-stat" key={k}>
                    <span style={{ textTransform: "capitalize" }}>{k}</span>
                    <i><b style={{ width: `${r[k] * 10}%` }} /></i>
                    <strong>{r[k]}</strong>
                  </div>
                ))}
                <div className="quote">“{r.quote}”</div>
              </button>
              );
            })}
          </div>
          <div className="pmg-col" style={{ marginTop: 18 }}>
            <button className="pmg-btn ghost" onClick={() => (picks.length ? setPicks([]) : (setQuickPick(false), go("menu")))}>BACK</button>
          </div>
        </>
      )}

      {screen === "stage" && picks.length === 2 && (
        <>
          <h1 className="pmg-h2">SELECT YOUR TURF</h1>
          <p className="pmg-sub">{ROSTER[picks[0]].name} vs {ROSTER[picks[1]].name}. Where does it go down?</p>
          <p className="pmg-cred">CRED BALANCE · {Cred.get().toLocaleString()}</p>
          {mode === "cpu" && (
            <div className="pmg-diff" role="group" aria-label="Difficulty">
              {DIFFICULTIES.map((d) => {
                const locked = d === "HARD" && !Cred.has("hardturf");
                return <button key={d} className="pmg-toggle" aria-pressed={diff === d} disabled={locked} title={locked ? "Unlock HARD TURF with Street Cred" : undefined} onClick={() => setDiff(d)}>{d}{locked ? " 🔒" : ` · +${BOUNTY[d]}`}</button>;
              })}
            </div>
          )}
          <div className="pmg-locs">
            {LOCATIONS.map((l) => (
              <button key={l.id} className="pmg-card pmg-loc" style={{ ["--i" as string]: LOCATIONS.indexOf(l) }} onClick={() => { setLoc(l.id); setRound((r) => r + 1); go("fight"); }}>
                {stagePics?.[l.id] ? <img src={stagePics[l.id]} alt={`${l.name} preview`} /> : <div className="ph">{stagePics ? "PREVIEW UNAVAILABLE" : "LOADING…"}</div>}
                <h3>{l.name.toUpperCase()}</h3>
                <div className="meta">{l.blurb}</div>
                <div className="turf"><span className={`diff ${(mode === "cpu" ? diff : l.difficulty).toLowerCase()}`}>{mode === "cpu" ? diff : l.difficulty}</span>{mode === "cpu" ? <span>BOUNTY +{BOUNTY[diff]} CRED</span> : <span>2-player: no cred</span>}</div>
              </button>
            ))}
          </div>
          <div className="pmg-col" style={{ marginTop: 18 }}>
            <button className="pmg-btn ghost" onClick={() => { setPicks([]); go("select"); }}>BACK</button>
          </div>
        </>
      )}

      {screen === "fight" && picks.length === 2 && (
        <FightView3D
          key={round}
          p1={fighters[0]} p2={fighters[1]} cpu={mode === "cpu"} isTouch={isTouch} loc={loc} diff={mode === "cpu" ? diff : "MEDIUM"}
          onRematch={() => setRound((r) => r + 1)}
          onChange={() => { setPicks([]); go("select"); }}
          onStage={() => go("stage")}
          onMenu={() => { setPicks([]); go("menu"); }}
        />
      )}
    </div>
  );
}

function FightView3D(props: {
  p1: FighterDef; p2: FighterDef; cpu: boolean; isTouch: boolean; loc: LocationId; diff: Difficulty;
  onRematch: () => void; onChange: () => void; onMenu: () => void; onStage: () => void;
}) {
  const { p1, p2, cpu, isTouch, loc, diff } = props;
  const glRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [over, setOver] = useState(false);
  const turf = LOCATIONS.find((l) => l.id === loc) ?? LOCATIONS[0];
  const [credWon, setCredWon] = useState<{ won: number; total: number } | null>(null);
  const [loadPct, setLoadPct] = useState(0);
  const [vsPics, setVsPics] = useState<Record<string, string> | null>(null);
  useEffect(() => { renderPortraits().then(setVsPics); }, []);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [paused, setPaused] = useState(false);
  const [help, setHelp] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const tutRef = useRef(false);
  const [padOn, setPadOn] = useState(false);
  const touchDir = useRef<Dir>(noDir());
  const pausedRef = useRef(false), helpRef = useRef(false);
  useEffect(() => { pausedRef.current = paused || help; helpRef.current = help; if (gameRef.current) gameRef.current.ctl.forEach((c) => { c.left = c.right = c.up = c.down = false; c.queue.length = 0; }); }, [paused, help]);
  const [size, setSize] = useState({ w: 960, h: 540, landscape: true });

  // fit the arena to the screen
  useEffect(() => {
    const fit = () => {
      const landscape = window.innerWidth > window.innerHeight;
      const overlay = isTouch && landscape;
      const reserve = overlay ? 20 : isTouch ? 280 : 110;        // portrait phone: room for the stick and the button diamond under the arena
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
      const stagePreload = loc === "subway" ? Promise.all([loadGLB("subway"), loadGLB("bench"), loadGLB("rat")]) : Promise.all([loadGLB("dumpster"), loadGLB("rat")]);
      // VS card: count the three loads, and hold the card at least 2.2 s so it reads (fighter quote clips play here when they exist)
      Voice.preload(["round1", "round2", "final", "fight", "ko", "perfect", "finisher", `wins-${p1.id}`, `wins-${p2.id}`]);
      Voice.say(`quote-${p1.id}`); setTimeout(() => { if (alive) Voice.say(`quote-${p2.id}`); }, 1700);
      let done = 0; const step = <T,>(p: Promise<T>) => p.then((v) => { done++; if (alive) setLoadPct(Math.round((done / 3) * 100)); return v; });
      try {
        const loads = await Promise.all([step(loadFighter(p1.id)), step(loadFighter(p2.id)), step(stagePreload as Promise<unknown>), new Promise((r) => setTimeout(r, 2200))]);
        a1 = loads[0]; a2 = loads[1];
      }
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

      const g: Game = newGame(p1, p2, cpu, () => {
        if (cpu && g.wins[0] >= 2) setCredWon({ won: BOUNTY[diff], total: Cred.add(BOUNTY[diff]) });   // bounty for the difficulty
        Profile.matchPlayed();
        setOver(true);
      }, AI_LEVEL[diff]);
      g.touch = isTouch; GOLD_TAG = Cred.has("goldtag");
      if (cpu && !store.get("tutorial-done", false)) { startTutorial(g); tutRef.current = true; setTutorial(true); }   // first fight ever: a minute of lessons first
      gameRef.current = g;
      updateCamera(cam, g, true);
      setStatus("ready");

      // inputs: keyboard (the live, rebindable KEYMAPS), gamepads and the touch stick all feed the same holds, merged every frame
      const lookup = (code: string): [0 | 1, Action] | null => {
        if (KEYMAPS[0][code]) return [0, KEYMAPS[0][code]];
        if (KEYMAPS[1][code]) return [cpu ? 0 : 1, KEYMAPS[1][code]];
        return null;
      };
      const isHold = (a: Action): a is "left" | "right" | "up" | "down" => a === "left" || a === "right" || a === "up" || a === "down";
      const kb: [Dir, Dir] = [noDir(), noDir()], pad: [Dir, Dir] = [noDir(), noDir()];
      const punchDown: [number, number] = [0, 0], padPunch: [number, number] = [0, 0];     // frame Punch went down (keyboard / pad), for the signature
      const down = (e: KeyboardEvent) => {
        if (helpRef.current) { if (e.code === "Escape" || e.code === "KeyP") setHelp(false); return; }
        if (e.code === "Escape" || e.code === "KeyP") { setPaused((v) => !v); return; }
        if (pausedRef.current) return;
        const hit = lookup(e.code); if (!hit) return;
        e.preventDefault();
        const [pi, a] = hit;
        if (isHold(a)) kb[pi][a] = true; else if (!e.repeat) { g.ctl[pi].queue.push(a); if (a === "punch") punchDown[pi] = g.frame; }
      };
      const up = (e: KeyboardEvent) => {
        const hit = lookup(e.code); if (!hit) return; const [pi, a] = hit;
        if (isHold(a)) kb[pi][a] = false;
        else if (a === "punch") { if (punchDown[pi] && g.frame - punchDown[pi] >= SIG_HOLD && !pausedRef.current) g.ctl[pi].queue.push("sig"); punchDown[pi] = 0; }
      };
      const blur = () => { kb.forEach((d) => { d.left = d.right = d.up = d.down = false; }); punchDown[0] = punchDown[1] = 0; };
      window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
      cleanups.push(() => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); });
      const onPad = () => setPadOn([...(navigator.getGamepads?.() ?? [])].some((p) => p && p.connected));
      window.addEventListener("gamepadconnected", onPad); window.addEventListener("gamepaddisconnected", onPad); onPad();
      cleanups.push(() => { window.removeEventListener("gamepadconnected", onPad); window.removeEventListener("gamepaddisconnected", onPad); });
      const padPrev: boolean[][] = [[], []];
      const pollPads = () => {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        let slot = 0;
        pad[0] = noDir(); pad[1] = noDir();
        for (const gp of pads) {
          if (!gp || !gp.connected) continue;
          const pi = slot as 0 | 1; if (pi > (cpu ? 0 : 1)) break;
          const b = (i: number) => !!gp.buttons[i]?.pressed, ax = gp.axes[0] ?? 0, ay = gp.axes[1] ?? 0;
          pad[pi] = { left: ax < -0.5 || b(14), right: ax > 0.5 || b(15), up: ay < -0.6 || b(12), down: ay > 0.5 || b(13) };
          const prev = padPrev[pi];
          for (const [idx, act] of Object.entries(PAD_BTN)) {
            const i = Number(idx), now = b(i);
            if (now && !prev[i] && !pausedRef.current) { g.ctl[pi].queue.push(act); if (act === "punch") padPunch[pi] = g.frame; }
            if (!now && prev[i] && act === "punch") { if (padPunch[pi] && g.frame - padPunch[pi] >= SIG_HOLD && !pausedRef.current) g.ctl[pi].queue.push("sig"); padPunch[pi] = 0; }
            prev[i] = now;
          }
          if (b(9) && !prev[9]) { if (helpRef.current) setHelp(false); else setPaused((v) => !v); } prev[9] = b(9);
          slot++;
        }
      };
      const applyHolds = () => {
        for (const pi of [0, 1] as const) {
          if (pi === 1 && cpu) break;
          const c = g.ctl[pi], t = pi === 0 ? touchDir.current : noDir();
          c.left = kb[pi].left || pad[pi].left || t.left; c.right = kb[pi].right || pad[pi].right || t.right;
          c.up = kb[pi].up || pad[pi].up || t.up; c.down = kb[pi].down || pad[pi].down || t.down;
          const since = Math.max(punchDown[pi], padPunch[pi], pi === 0 ? touchPunch.current : 0);
          c.charge = since ? g.frame - since : 0;
        }
      };

      const v = new THREE.Vector3();
      const project = (x: number, y: number, z: number): [number, number] => { v.set(x, y, z).project(cam); return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H]; };

      let last = performance.now(), acc = 0, clock = 0;
      const loop = (now: number) => {
        const dtMs = Math.min(now - last, 100); last = now; acc += dtMs; clock += dtMs / 1000;
        let n = 0;
        pollPads();                                               // read the pads even while paused, so Start can resume
        if (pausedRef.current) acc = 0; else applyHolds();
        while (acc >= FRAME_MS && n < 5) { tick(g); acc -= FRAME_MS; n++; }
        if (tutRef.current && !g.tut) { tutRef.current = false; setTutorial(false); }
        // size the drawing buffers to the element
        const cw = canvas.clientWidth, ch = canvas.clientHeight;
        if (cw && (canvas.width !== Math.round(cw * renderer.getPixelRatio()) || canvas.height !== Math.round(ch * renderer.getPixelRatio()))) {
          renderer.setSize(cw, ch, false); cam.aspect = cw / ch; cam.updateProjectionMatrix();
          const dpr = Math.min(2, window.devicePixelRatio || 1); hud.width = cw * dpr; hud.height = ch * dpr;
        }
        const slow = pausedRef.current ? 0 : g.slow > 0 ? 0.5 : 1;
        for (const hit of g.impacts) rigs[hit.who].anatomy.applyHitPhysics((Math.random() - 0.5) * 0.4, -1, hit.force);
        g.impacts.length = 0;
        rigs.forEach((r, i) => poseRig(r, g.f[i], (dtMs / 1000) * slow, clock));
        updateStage(stage, g, clock, pausedRef.current ? 0 : dtMs / 1000);
        updateFx(fx, g);
        if (g.sfx.length) { const seen = new Set<string>(); for (const e of g.sfx) if (!seen.has(e)) { seen.add(e); if (e.startsWith("say:")) Voice.say(e.slice(4)); else Sound.play(e); } g.sfx.length = 0; }
        updateCamera(cam, g);
        renderer.render(stage.scene, cam);
        hctx.setTransform(hud.width / W, 0, 0, hud.height / H, 0, 0);
        hctx.clearRect(0, 0, W, H);
        drawHud(hctx, g, isTouch, project, pics, cw < 700);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();
    return () => { alive = false; cancelAnimationFrame(raf); cleanups.forEach((f) => f()); };
  }, [p1, p2, cpu, isTouch, loc, diff]);

  const setDir = (d: Dir) => { touchDir.current = d; };
  const skipTutorial = () => { const g = gameRef.current; if (g?.tut) { finishTutorial(g); tutRef.current = false; setTutorial(false); } };
  const touchPunch = useRef(0);
  const tap = (b: Btn | "release") => { const g = gameRef.current; if (!g) return; if (b === "release") { touchPunch.current = 0; return; } g.ctl[0].queue.push(b); if (b === "punch") touchPunch.current = g.frame; if (b === "sig") touchPunch.current = 0; };

  const overlay = isTouch && size.landscape;
  const pad = isTouch && (
    <div className={`pmg-pad${overlay ? " overlay" : ""}`}>
      <DPad onDir={setDir} />
      <ButtonCluster onTap={tap} />
    </div>
  );

  return (
    <>
      <div className={`pmg-stage${size.w < 700 ? " compact" : ""}`} style={{ width: size.w }}>
        <canvas ref={glRef} className="pmg-canvas" style={{ width: size.w, height: size.h }} />
        <canvas ref={hudRef} style={{ position: "absolute", left: 3, top: 3, width: size.w, height: size.h, pointerEvents: "none" }} />
        {isTouch && status === "ready" && <GestureLayer onGesture={tap} />}
        {status === "loading" && (
          <div className="pmg-vs" role="status" aria-label={`${p1.name} versus ${p2.name}, loading`}>
            {[p1, p2].map((d, k) => (
              <div className={`side ${k ? "r" : "l"}`} key={d.id} style={{ ["--c" as string]: d.color }}>
                {vsPics?.[d.id] ? <img src={vsPics[d.id]} alt="" /> : <div className="ph" />}
                <h3>{d.name.toUpperCase()}</h3>
                <span>{archOf(d).displayName}</span>
              </div>
            ))}
            <div className="vs">VS</div>
            <div className="foot">
              <div className="where">{turf.name.toUpperCase()}{cpu ? ` · ${diff} · BOUNTY +${BOUNTY[diff]} CRED` : " · 2 PLAYERS"}</div>
              <div className="bar"><b style={{ width: `${loadPct}%` }} /></div>
              <small>LOADING {loadPct}%</small>
            </div>
          </div>
        )}
        {status === "error" && (
          <div className="pmg-load">{`COULDN'T LOAD THE FIGHTER FILES. CHECK THAT ${p1.id}.glb AND ${p2.id}.glb COULD BE DOWNLOADED`}</div>
        )}
        <div className="pmg-top">
          <button className="pmg-mini" onClick={() => setPaused(true)}>MENU</button>
          <button className="pmg-mini" onClick={() => setHelp(true)} aria-label="Controls">? CONTROLS</button>
          {tutorial && <button className="pmg-mini" onClick={skipTutorial}>SKIP TUTORIAL</button>}
        </div>
        {help && (
          <div className="pmg-modal" role="dialog" aria-label="Controls">
            <div className="pmg-panel">
              <h2 className="pmg-h2" style={{ margin: "0 0 14px" }}>CONTROLS</h2>
              <ControlsHelp touch={isTouch} cpu={cpu} />
              <div className="pmg-col"><button className="pmg-btn" onClick={() => setHelp(false)}>GOT IT</button></div>
            </div>
          </div>
        )}
        {paused && !help && (
          <SettingsPanel onClose={() => setPaused(false)} extra={<>
            <button className="pmg-btn" onClick={() => setPaused(false)}>RESUME</button>
            <button className="pmg-btn ghost" onClick={() => setHelp(true)}>CONTROLS</button>
            {tutorial && <button className="pmg-btn ghost" onClick={() => { skipTutorial(); setPaused(false); }}>SKIP TUTORIAL</button>}
            <button className="pmg-btn ghost" onClick={props.onChange}>CHANGE FIGHTERS</button>
            <button className="pmg-btn ghost" onClick={props.onStage}>CHANGE LOCATION</button>
            <button className="pmg-btn ghost" onClick={props.onMenu}>QUIT TO TITLE</button>
          </>} />
        )}
        {overlay && pad}
        {over && (
          <div className="pmg-over">
            <div className="pmg-col">
              {cpu && <div className="pmg-credwon">{credWon ? `+${credWon.won} STREET CRED · TOTAL ${credWon.total.toLocaleString()}` : "NO CRED THIS TIME"}</div>}
              <button className="pmg-btn" onClick={props.onRematch}>REMATCH</button>
              <button className="pmg-btn ghost" onClick={props.onChange}>CHANGE FIGHTERS</button>
            </div>
          </div>
        )}
      </div>
      {!overlay && pad}
      {isTouch && !size.landscape && <div className="pmg-rotate">Swipe the arena to defend · turn sideways for a bigger arena</div>}
      {!isTouch && (
        <div className="pmg-hint">
          {padOn ? <>🎮 Controller connected — {PAD_HINT}</>
            : cpu ? <>Move <kbd>{keysFor(0, "left").map(keyName).join(" ")}</kbd> <kbd>{keysFor(0, "right").map(keyName).join(" ")}</kbd> · Jump <kbd>{keysFor(0, "up").map(keyName).join(" ")}</kbd> · Punch <kbd>{keysFor(0, "punch").map(keyName).join(" ")}</kbd> · Kick <kbd>{keysFor(0, "kick").map(keyName).join(" ")}</kbd> · Special <kbd>{keysFor(0, "special").map(keyName).join(" ")}</kbd> · Grab <kbd>{keysFor(0, "grab").map(keyName).join(" ")}</kbd> · hold back to block — <kbd>? CONTROLS</kbd> has the rest and rebinds keys</>
            : <>P1 <kbd>{keysFor(0, "left").map(keyName).join(" ")}</kbd> <kbd>{keysFor(0, "right").map(keyName).join(" ")}</kbd> + <kbd>{keysFor(0, "punch").map(keyName).join(" ")}</kbd> <kbd>{keysFor(0, "kick").map(keyName).join(" ")}</kbd> <kbd>{keysFor(0, "special").map(keyName).join(" ")}</kbd> · P2 <kbd>{keysFor(1, "left").map(keyName).join(" ")}</kbd> <kbd>{keysFor(1, "right").map(keyName).join(" ")}</kbd> + <kbd>{keysFor(1, "punch").map(keyName).join(" ")}</kbd> <kbd>{keysFor(1, "kick").map(keyName).join(" ")}</kbd> <kbd>{keysFor(1, "special").map(keyName).join(" ")}</kbd> — <kbd>? CONTROLS</kbd> has the rest and rebinds keys</>}
        </div>
      )}
    </>
  );
}
