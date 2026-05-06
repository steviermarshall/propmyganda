import { useRef, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import CosmicEnvironment, { ImpactBursts, triggerImpact } from "./CosmicEnvironment";

// ─── Types ────────────────────────────────────────────────────────────────────

type EnemyType = "scout" | "fighter" | "dreadnought";
type EState = "formation" | "diving" | "returning" | "dying";

interface ESlot {
  row: number; col: number; colCount: number;
  type: EnemyType;
  hp: number; maxHp: number;
  pos: THREE.Vector3;
  state: EState;
  deathT: number;
  // Dive bezier
  divePts: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3] | null;
  diveT: number;
  returnT: number;
  returnStart: THREE.Vector3;
  lastShot: number;
  shotInterval: number;
}

interface LSlot {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  born: number;
}

interface GS {
  slots: (ESlot | null)[];
  aliveCount: number;
  pLasers: (LSlot | null)[];
  eLasers: (LSlot | null)[];
  playerX: number; playerY: number;
  playerHp: number; score: number; wave: number;
  waveState: "active" | "cleared";
  waveTimer: number;
  nextDiveT: number;
  formOffX: number; marchDir: number;
  stepOffset: number;
  gameOver: boolean; lastHud: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ROWS = 4;
const COL_SPACING  = 2.6;
const ROW_SPACING  = 2.2;
const FORMATION_Z  = -24;
const BASE_Y       = 0.6;  // y of bottom row

// Bottom row = scouts (row 0), top row = dreadnoughts (row 3)
const ROW_TYPES:  EnemyType[] = ["scout", "scout", "fighter", "dreadnought"];
const ROW_COUNTS: number[]    = [8,       8,       6,         4            ];

const CFG = {
  scout:       { hp: 1, radius: 0.85, score: 100,  formShotInt: 999, diveShotInt: 2.8,  hpBarY: 1.2 },
  fighter:     { hp: 2, radius: 1.2,  score: 300,  formShotInt: 999, diveShotInt: 2.2,  hpBarY: 1.8 },
  dreadnought: { hp: 5, radius: 2.0,  score: 1000, formShotInt: 7.0, diveShotInt: 1.8,  hpBarY: 2.8 },
} as const;

const MAX_ENEMIES       = 32;
const MAX_P_LASERS      = 24;
const MAX_E_LASERS      = 32;
const P_LASER_SPEED     = 55;
const P_LASER_TTL       = 1.8;
const E_LASER_SPEED     = 11;
const E_LASER_TTL       = 4.0;
const PLAYER_Z          = 0.0;
const PLAYER_X_MAX      = 9.5;
const PLAYER_Y_MAX      = 1.4;
const PLAYER_HIT_R      = 0.9;
const MARCH_SPEED       = 1.6;
const MARCH_LIMIT       = 7.5;
const STEP_DOWN         = 0.9;
const MAX_STEPS         = 9;
const DIVE_DURATION     = 3.0;
const RETURN_DURATION   = 2.2;
const DIVE_INT_MIN      = 1.6;
const DIVE_INT_MAX      = 3.5;
const WAVE_GAP          = 4.5;
const MOVE_SENS         = 0.018;
const CAM_POS           = new THREE.Vector3(0, 5.5, 14);
const CAM_LOOK          = new THREE.Vector3(0, 1.0, -8);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slotPos(row: number, col: number, colCount: number, offX: number, stepOff: number): THREE.Vector3 {
  const w = (colCount - 1) * COL_SPACING;
  return new THREE.Vector3(
    -w / 2 + col * COL_SPACING + offX,
    BASE_Y + row * ROW_SPACING - stepOff,
    FORMATION_Z,
  );
}

function bezier(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number): THREE.Vector3 {
  const u = 1 - t;
  return new THREE.Vector3(
    u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x,
    u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y,
    u*u*u*p0.z + 3*u*u*t*p1.z + 3*u*t*t*p2.z + t*t*t*p3.z,
  );
}

function divePath(
  start: THREE.Vector3,
  px: number, py: number,
  wave: number,
): [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3] {
  const side = start.x >= 0 ? 1 : -1;
  const arc  = 7 + Math.min(wave, 5) * 0.6;
  return [
    start.clone(),
    new THREE.Vector3(start.x + side * arc, start.y + 4, start.z * 0.5),
    new THREE.Vector3(px - side * 2,        py + 4,       FORMATION_Z * 0.2),
    new THREE.Vector3(px + (Math.random() - 0.5) * 3, py - 3, PLAYER_Z + 8),
  ];
}

function dispatchHud(g: GS, waveComplete = false) {
  if (g.gameOver) localStorage.setItem('pmg_score', String(g.score));
  window.dispatchEvent(new CustomEvent("game:hud", {
    detail: { score: g.score, hp: g.playerHp, wave: g.wave, gameOver: g.gameOver, waveComplete },
  }));
}

function spawnWave(
  wave: number, g: GS,
  eGroups: (THREE.Group | null)[],
  hpFg:    (THREE.Mesh  | null)[],
) {
  g.formOffX = 0; g.marchDir = 1; g.stepOffset = 0;
  g.aliveCount = 0;
  g.nextDiveT = 2.2;

  let slot = 0;
  for (let row = 0; row < ROWS; row++) {
    const cnt  = ROW_COUNTS[row];
    const type = ROW_TYPES[row];
    const cfg  = CFG[type];
    for (let col = 0; col < cnt; col++) {
      if (slot >= MAX_ENEMIES) break;
      const pos = slotPos(row, col, cnt, 0, 0);
      g.slots[slot] = {
        row, col, colCount: cnt, type,
        hp: cfg.hp, maxHp: cfg.hp,
        pos: pos.clone(), state: "formation",
        deathT: 0, divePts: null, diveT: 0,
        returnT: 0, returnStart: pos.clone(),
        lastShot: Math.random() * cfg.diveShotInt,
        shotInterval: cfg.diveShotInt * (1 - Math.min(wave - 1, 4) * 0.08),
      };
      const g3 = eGroups[slot];
      if (g3) {
        g3.position.copy(pos); g3.visible = true; g3.scale.setScalar(1);
        g3.children.forEach((c) => {
          c.visible = c.name === "hpbar" ? true : c.name === type;
        });
      }
      const fg = hpFg[slot];
      if (fg) { fg.scale.x = 1; fg.position.x = 0; }
      g.aliveCount++;
      slot++;
    }
  }
  for (let i = slot; i < MAX_ENEMIES; i++) {
    g.slots[i] = null;
    const g3 = eGroups[i]; if (g3) g3.visible = false;
  }
  dispatchHud(g);
}

// ─── Ship meshes ──────────────────────────────────────────────────────────────

function PlayerShip() {
  return (
    <group>
      {/* Hull */}
      <mesh>
        <boxGeometry args={[0.45, 0.18, 1.5]} />
        <meshStandardMaterial color="#1a3a5a" roughness={0.4} metalness={0.8} emissive="#0a2040" emissiveIntensity={0.4} />
      </mesh>
      {/* Left wing */}
      <mesh position={[-1.1, 0, 0.35]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[1.5, 0.07, 0.9]} />
        <meshStandardMaterial color="#122a44" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Right wing */}
      <mesh position={[1.1, 0, 0.35]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[1.5, 0.07, 0.9]} />
        <meshStandardMaterial color="#122a44" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Gun */}
      <mesh position={[0, 0, -0.9]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.075, 0.55, 8]} />
        <meshStandardMaterial color="#88ccff" roughness={0.2} metalness={1} emissive="#44aaff" emissiveIntensity={0.8} />
      </mesh>
      {/* Engine */}
      <mesh position={[0, 0, 0.82]}>
        <cylinderGeometry args={[0.12, 0.17, 0.3, 10]} />
        <meshBasicMaterial color="#00eeff" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0, 1.1]} intensity={2.5} distance={5} color="#00eeff" decay={2} />
    </group>
  );
}

function ScoutMesh() {
  return (
    <group name="scout">
      <mesh><boxGeometry args={[0.5, 0.2, 1.4]} /><meshStandardMaterial color="#1e2a1e" roughness={0.7} metalness={0.5} emissive="#0a2a0a" emissiveIntensity={0.3} /></mesh>
      <mesh position={[-0.75, 0, 0.2]} rotation={[0, 0, 0.25]}><boxGeometry args={[1.0, 0.06, 0.7]} /><meshStandardMaterial color="#162816" roughness={0.8} metalness={0.4} /></mesh>
      <mesh position={[0.75, 0, 0.2]} rotation={[0, 0, -0.25]}><boxGeometry args={[1.0, 0.06, 0.7]} /><meshStandardMaterial color="#162816" roughness={0.8} metalness={0.4} /></mesh>
      <mesh position={[0, 0, 0.72]}><cylinderGeometry args={[0.13, 0.18, 0.28, 10]} /><meshBasicMaterial color="#ff2200" toneMapped={false} /></mesh>
      <pointLight position={[0, 0, 0.9]} intensity={1.4} distance={4} color="#ff3300" decay={2} />
    </group>
  );
}

function FighterMesh() {
  return (
    <group name="fighter">
      <mesh><boxGeometry args={[0.7, 0.5, 2.0]} /><meshStandardMaterial color="#1a1a2e" roughness={0.6} metalness={0.6} emissive="#0a0a20" emissiveIntensity={0.2} /></mesh>
      <mesh position={[0, 0.55, 0.3]}><boxGeometry args={[0.08, 0.8, 1.2]} /><meshStandardMaterial color="#12122a" roughness={0.8} /></mesh>
      <mesh position={[-1.3, 0, 0.3]} rotation={[0, -0.15, 0.15]}><boxGeometry args={[1.6, 0.09, 1.1]} /><meshStandardMaterial color="#141428" roughness={0.75} metalness={0.5} /></mesh>
      <mesh position={[1.3, 0, 0.3]} rotation={[0, 0.15, -0.15]}><boxGeometry args={[1.6, 0.09, 1.1]} /><meshStandardMaterial color="#141428" roughness={0.75} metalness={0.5} /></mesh>
      <mesh position={[-0.3, 0, 1.05]}><cylinderGeometry args={[0.14, 0.2, 0.35, 10]} /><meshBasicMaterial color="#ff8800" toneMapped={false} /></mesh>
      <mesh position={[0.3, 0, 1.05]}><cylinderGeometry args={[0.14, 0.2, 0.35, 10]} /><meshBasicMaterial color="#ff8800" toneMapped={false} /></mesh>
      <pointLight position={[0, 0, 1.3]} intensity={2} distance={5} color="#ff6600" decay={2} />
    </group>
  );
}

function DreadnoughtMesh() {
  return (
    <group name="dreadnought">
      <mesh><boxGeometry args={[2.0, 1.0, 4.5]} /><meshStandardMaterial color="#12081e" roughness={0.55} metalness={0.7} emissive="#18003a" emissiveIntensity={0.25} /></mesh>
      <mesh position={[0, 0.75, 0]}><boxGeometry args={[1.0, 0.6, 2.5]} /><meshStandardMaterial color="#1a0a2e" roughness={0.6} metalness={0.6} /></mesh>
      <mesh position={[-1.6, 0, 0.3]}><boxGeometry args={[1.0, 0.6, 2.0]} /><meshStandardMaterial color="#0e0618" roughness={0.7} metalness={0.6} /></mesh>
      <mesh position={[1.6, 0, 0.3]}><boxGeometry args={[1.0, 0.6, 2.0]} /><meshStandardMaterial color="#0e0618" roughness={0.7} metalness={0.6} /></mesh>
      <mesh position={[0, 0.5, -2.4]}><cylinderGeometry args={[0.18, 0.22, 1.4, 10]} /><meshStandardMaterial color="#1a0a1a" roughness={0.5} metalness={0.8} /></mesh>
      {[-0.7, 0, 0.7].map((x, i) => (
        <mesh key={i} position={[x, 0, 2.3]}><cylinderGeometry args={[0.22, 0.30, 0.5, 12]} /><meshBasicMaterial color="#4040ff" toneMapped={false} /></mesh>
      ))}
      <pointLight position={[0, 0, 2.8]} intensity={3} distance={8} color="#4040ff" decay={2} />
    </group>
  );
}

function HpBar({ onRef }: { onRef: (m: THREE.Mesh | null) => void }) {
  return (
    <group>
      <mesh renderOrder={10}>
        <planeGeometry args={[2, 0.12]} />
        <meshBasicMaterial color="#222" transparent opacity={0.75} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={onRef} position={[0, 0, 0.01]} renderOrder={11}>
        <planeGeometry args={[2, 0.12]} />
        <meshBasicMaterial color="#22ff44" transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  isMobile?: boolean;
  onRegisterShoot: (fn: () => void) => void;
}

export default function SpaceGame({ isMobile = false, onRegisterShoot }: Props) {
  const { camera, gl } = useThree();

  const eGroupRefs = useRef<(THREE.Group | null)[]>(new Array(MAX_ENEMIES).fill(null));
  const hpFgRefs   = useRef<(THREE.Mesh  | null)[]>(new Array(MAX_ENEMIES).fill(null));
  const pLaserRefs = useRef<(THREE.Mesh  | null)[]>(new Array(MAX_P_LASERS).fill(null));
  const eLaserRefs = useRef<(THREE.Mesh  | null)[]>(new Array(MAX_E_LASERS).fill(null));
  const shipRef    = useRef<THREE.Group  | null>(null);

  const gs = useRef<GS>({
    slots: new Array(MAX_ENEMIES).fill(null),
    aliveCount: 0,
    pLasers:  new Array(MAX_P_LASERS).fill(null),
    eLasers:  new Array(MAX_E_LASERS).fill(null),
    playerX: 0, playerY: 0,
    playerHp: 10, score: Number(localStorage.getItem('pmg_score') || 0), wave: 1,
    waveState: "cleared", waveTimer: 0,
    nextDiveT: 999,
    formOffX: 0, marchDir: 1, stepOffset: 0,
    gameOver: false, lastHud: 0,
  });

  const clockRef       = useRef(0);
  const spawnedRef     = useRef(false);
  const lastHoldRef    = useRef(0);

  // ── Player fire ─────────────────────────────────────────────────────────────

  const firePLaser = useCallback(() => {
    const g = gs.current;
    if (g.gameOver) return;
    const idx = g.pLasers.findIndex((l) => l === null);
    if (idx === -1) return;
    const laser: LSlot = {
      pos: new THREE.Vector3(g.playerX, g.playerY + 0.3, PLAYER_Z - 0.5),
      vel: new THREE.Vector3(0, 0, -P_LASER_SPEED),
      born: clockRef.current,
    };
    g.pLasers[idx] = laser;
    const m = pLaserRefs.current[idx];
    if (m) { m.position.copy(laser.pos); m.rotation.set(Math.PI / 2, 0, 0); m.visible = true; }
  }, []);

  useEffect(() => { onRegisterShoot(firePLaser); }, [onRegisterShoot, firePLaser]);

  // Spacebar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space" && !e.repeat) firePLaser(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [firePLaser]);

  // ── Pointer: ship movement + tap-to-fire ─────────────────────────────────────

  const ptrRef = useRef({ down: false, moved: false, lastX: 0, lastY: 0, t0: 0 });

  useEffect(() => {
    const dom = gl.domElement;
    const pr = ptrRef.current;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pr.down = true; pr.moved = false;
      pr.lastX = e.clientX; pr.lastY = e.clientY; pr.t0 = performance.now();
      firePLaser();
      lastHoldRef.current = -999;
      try { dom.setPointerCapture(e.pointerId); } catch { /* */ }
    };
    const onMove = (e: PointerEvent) => {
      if (!pr.down) return;
      const dx = e.clientX - pr.lastX;
      const dy = e.clientY - pr.lastY;
      pr.lastX = e.clientX; pr.lastY = e.clientY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) pr.moved = true;
      const g = gs.current;
      g.playerX = THREE.MathUtils.clamp(g.playerX + dx * MOVE_SENS, -PLAYER_X_MAX, PLAYER_X_MAX);
      g.playerY = THREE.MathUtils.clamp(g.playerY - dy * MOVE_SENS * 0.5, -PLAYER_Y_MAX, PLAYER_Y_MAX);
    };
    const onUp = (e: PointerEvent) => {
      if (!pr.down) return;
      pr.down = false;
      if (!pr.moved && performance.now() - pr.t0 < 320) firePLaser();
      try { dom.releasePointerCapture(e.pointerId); } catch { /* */ }
    };

    const onCtx = (e: Event) => e.preventDefault();
    dom.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    dom.addEventListener("contextmenu", onCtx);
    dom.style.touchAction = "none";
    (dom.style as unknown as Record<string, string>).webkitUserSelect = "none";
    dom.style.userSelect = "none";
    return () => {
      dom.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      dom.removeEventListener("contextmenu", onCtx);
    };
  }, [gl, firePLaser]);

  // ── Game loop ─────────────────────────────────────────────────────────────────

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    clockRef.current = t;
    const g = gs.current;
    const persp = camera as THREE.PerspectiveCamera;

    // Fixed Galaxiga camera
    camera.position.lerp(CAM_POS, 0.08);
    camera.lookAt(CAM_LOOK);
    const fovTarget = isMobile ? 62 : 55;
    persp.fov = THREE.MathUtils.lerp(persp.fov, fovTarget, 0.04);
    persp.updateProjectionMatrix();

    // Hold-to-fire (pointer held without drag)
    if (ptrRef.current.down && !ptrRef.current.moved && t - lastHoldRef.current > 0.18) {
      lastHoldRef.current = t;
      firePLaser();
    }

    // Update player ship mesh position
    if (shipRef.current) {
      shipRef.current.position.x = THREE.MathUtils.lerp(shipRef.current.position.x, g.playerX, 0.22);
      shipRef.current.position.y = THREE.MathUtils.lerp(shipRef.current.position.y, g.playerY, 0.22);
    }

    // ── Wave management ────────────────────────────────────────────────────────
    if (!spawnedRef.current) {
      spawnedRef.current = true;
      g.waveState = "active";
      spawnWave(g.wave, g, eGroupRefs.current, hpFgRefs.current);
      return;
    }
    if (g.gameOver) return;

    if (g.aliveCount === 0 && g.waveState === "active") {
      g.waveState = "cleared"; g.waveTimer = 0; dispatchHud(g, true);
    }
    if (g.waveState === "cleared") {
      g.waveTimer += delta;
      if (g.waveTimer >= WAVE_GAP) {
        g.wave++; g.waveState = "active";
        spawnWave(g.wave, g, eGroupRefs.current, hpFgRefs.current);
      }
      return;
    }

    // ── Formation march ────────────────────────────────────────────────────────
    const effectiveMarchSpeed = Math.min(MARCH_SPEED * (1 + (g.wave - 1) * 0.1), MARCH_SPEED * 2.5);
    g.formOffX += delta * effectiveMarchSpeed * g.marchDir;
    if (Math.abs(g.formOffX) >= MARCH_LIMIT) {
      g.marchDir *= -1;
      g.stepOffset += STEP_DOWN;
      if (g.stepOffset > MAX_STEPS * STEP_DOWN) { g.gameOver = true; dispatchHud(g); }
    }

    // ── Dive scheduler ─────────────────────────────────────────────────────────
    g.nextDiveT -= delta;
    if (g.nextDiveT <= 0) {
      let divingCount = 0;
      const pool: number[] = [];
      for (let i = 0; i < MAX_ENEMIES; i++) {
        const e = g.slots[i];
        if (!e) continue;
        if (e.state === "formation") pool.push(i);
        if (e.state === "diving" || e.state === "returning") divingCount++;
      }
      const maxDivers = Math.min(1 + Math.floor((g.wave - 1) / 2), 3);
      if (pool.length > 0 && divingCount < maxDivers) {
        const idx = pool[Math.floor(Math.random() * pool.length)];
        const e = g.slots[idx]!;
        e.state = "diving"; e.diveT = 0;
        e.divePts = divePath(e.pos.clone(), g.playerX, g.playerY, g.wave);
      }
      const baseInterval = Math.max(DIVE_INT_MIN, DIVE_INT_MAX - (g.wave - 1) * 0.2);
      g.nextDiveT = DIVE_INT_MIN + Math.random() * (baseInterval - DIVE_INT_MIN);
    }

    // ── Enemy update ───────────────────────────────────────────────────────────
    for (let i = 0; i < MAX_ENEMIES; i++) {
      const e = g.slots[i];
      const grp = eGroupRefs.current[i];
      if (!e || !grp) continue;

      if (e.state === "dying") {
        e.deathT += delta;
        grp.scale.setScalar(Math.max(0, 1 - e.deathT * 3));
        if (e.deathT > 0.38) {
          g.slots[i] = null; g.aliveCount--;
          grp.visible = false; grp.scale.setScalar(1);
        }
        continue;
      }

      const hpBar = grp.children.find((c) => c.name === "hpbar");

      if (e.state === "formation") {
        const fp = slotPos(e.row, e.col, e.colCount, g.formOffX, g.stepOffset);
        e.pos.copy(fp); grp.position.copy(fp);
        // Face toward player (+Z direction since player is in front)
        grp.lookAt(new THREE.Vector3(fp.x, fp.y, 10));
        if (hpBar) hpBar.lookAt(camera.position);

        // Formation shooting: dreadnoughts only, very rare
        const formShotInt = CFG[e.type].formShotInt;
        if (t - e.lastShot > formShotInt) {
          e.lastShot = t + (Math.random() - 0.5) * formShotInt * 0.4;
          fireELaser(e.pos, g, t, eLaserRefs.current, 4.5);
        }
      }

      else if (e.state === "diving") {
        e.diveT += delta / DIVE_DURATION;
        if (e.diveT >= 1) {
          e.state = "returning"; e.returnT = 0; e.returnStart = e.pos.clone();
        } else {
          if (e.divePts) e.pos.copy(bezier(...e.divePts, e.diveT));
          grp.position.copy(e.pos);
          // Face movement direction
          if (e.divePts) {
            const next = bezier(...e.divePts, Math.min(e.diveT + 0.04, 1));
            grp.lookAt(next);
          }
          if (hpBar) hpBar.lookAt(camera.position);

          // Shoot while diving — accuracy increases with wave
          const diveSpread = Math.max(0.8, 4.5 - (g.wave - 1) * 0.35);
          if (t - e.lastShot > e.shotInterval) {
            e.lastShot = t + (Math.random() - 0.5) * 0.6;
            fireELaser(e.pos, g, t, eLaserRefs.current, diveSpread);
          }

          // Ram player
          const dx = e.pos.x - g.playerX, dy = e.pos.y - g.playerY, dz = e.pos.z - PLAYER_Z;
          if (Math.sqrt(dx*dx + dy*dy + dz*dz) < CFG[e.type].radius + 0.8) {
            e.state = "dying"; e.deathT = 0;
            g.playerHp = Math.max(0, g.playerHp - 2);
            triggerImpact(e.pos.clone());
            if (g.playerHp <= 0) g.gameOver = true;
            dispatchHud(g);
          }
        }
      }

      else if (e.state === "returning") {
        e.returnT += delta / RETURN_DURATION;
        if (e.returnT >= 1) {
          e.state = "formation"; e.returnT = 0;
        } else {
          const target = slotPos(e.row, e.col, e.colCount, g.formOffX, g.stepOffset);
          e.pos.lerpVectors(e.returnStart, target, e.returnT * e.returnT);
          grp.position.copy(e.pos);
          grp.lookAt(new THREE.Vector3(e.pos.x, e.pos.y, 10));
          if (hpBar) hpBar.lookAt(camera.position);
        }
      }
    }

    // ── Player lasers ──────────────────────────────────────────────────────────
    for (let i = 0; i < MAX_P_LASERS; i++) {
      const l = g.pLasers[i];
      const m = pLaserRefs.current[i];
      if (!l || !m) continue;
      if (t - l.born > P_LASER_TTL || l.pos.z < -40) {
        g.pLasers[i] = null; m.visible = false; continue;
      }
      l.pos.addScaledVector(l.vel, delta);
      m.position.copy(l.pos);

      for (let j = 0; j < MAX_ENEMIES; j++) {
        const e = g.slots[j];
        if (!e || e.state === "dying") continue;
        const cfg = CFG[e.type];
        const dx = l.pos.x - e.pos.x, dy = l.pos.y - e.pos.y, dz = l.pos.z - e.pos.z;
        if (Math.sqrt(dx*dx + dy*dy + dz*dz) < cfg.radius) {
          g.pLasers[i] = null; m.visible = false;
          triggerImpact(l.pos.clone());
          e.hp--;
          const mult = e.state === "diving" ? 2 : 1;
          if (e.hp <= 0) { e.state = "dying"; e.deathT = 0; g.score += cfg.score * mult; }
          const fg = hpFgRefs.current[j];
          const ratio = Math.max(0, e.hp / e.maxHp);
          if (fg) { fg.scale.x = ratio; fg.position.x = ratio - 1; }
          break;
        }
      }
    }

    // ── Enemy lasers ───────────────────────────────────────────────────────────
    for (let i = 0; i < MAX_E_LASERS; i++) {
      const l = g.eLasers[i];
      const m = eLaserRefs.current[i];
      if (!l || !m) continue;
      if (t - l.born > E_LASER_TTL || l.pos.z > PLAYER_Z + 9) {
        g.eLasers[i] = null; m.visible = false; continue;
      }
      l.pos.addScaledVector(l.vel, delta);
      m.position.copy(l.pos);

      const dx = l.pos.x - g.playerX, dy = l.pos.y - g.playerY, dz = l.pos.z - PLAYER_Z;
      if (Math.sqrt(dx*dx + dy*dy + dz*dz) < PLAYER_HIT_R) {
        g.eLasers[i] = null; m.visible = false;
        g.playerHp = Math.max(0, g.playerHp - 1);
        triggerImpact(l.pos.clone());
        if (g.playerHp <= 0) g.gameOver = true;
        dispatchHud(g);
      }
    }

    // Throttled HUD
    if (t - g.lastHud > 0.4) { g.lastHud = t; dispatchHud(g); }
  });

  return (
    <group>
      <CosmicEnvironment isMobile={isMobile} noSway />
      <ImpactBursts />

      {/* Player ship — sits at z=PLAYER_Z, moves on XY */}
      <group ref={(el) => { shipRef.current = el as THREE.Group | null; }} position={[0, 0, PLAYER_Z]}>
        <PlayerShip />
      </group>

      {/* Enemy pool */}
      {Array.from({ length: MAX_ENEMIES }, (_, i) => (
        <group key={`e${i}`} ref={(el) => { eGroupRefs.current[i] = el as THREE.Group | null; }} visible={false}>
          <ScoutMesh />
          <FighterMesh />
          <DreadnoughtMesh />
          <group name="hpbar" position={[0, CFG.scout.hpBarY, 0]}>
            <HpBar onRef={(el) => { hpFgRefs.current[i] = el; }} />
          </group>
        </group>
      ))}

      {/* Player lasers — cyan */}
      {Array.from({ length: MAX_P_LASERS }, (_, i) => (
        <mesh key={`pl${i}`} ref={(el) => { pLaserRefs.current[i] = el as THREE.Mesh | null; }} visible={false}>
          <capsuleGeometry args={[0.04, 1.4, 4, 8]} />
          <meshBasicMaterial color="#00ffee" toneMapped={false} />
        </mesh>
      ))}

      {/* Enemy lasers — orange */}
      {Array.from({ length: MAX_E_LASERS }, (_, i) => (
        <mesh key={`el${i}`} ref={(el) => { eLaserRefs.current[i] = el as THREE.Mesh | null; }} visible={false}>
          <capsuleGeometry args={[0.055, 1.0, 4, 8]} />
          <meshBasicMaterial color="#ff5500" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ── Enemy laser helper (extracted to avoid repetition) ─────────────────────────

function fireELaser(
  ePos: THREE.Vector3,
  g: GS,
  t: number,
  eLaserMeshes: (THREE.Mesh | null)[],
  spread = 4.0,
) {
  const idx = g.eLasers.findIndex((l) => l === null);
  if (idx === -1) return;
  const toPlayer = new THREE.Vector3(
    g.playerX - ePos.x + (Math.random() - 0.5) * spread,
    g.playerY - ePos.y + (Math.random() - 0.5) * spread * 0.4,
    PLAYER_Z - ePos.z,
  ).normalize();
  const laser: LSlot = {
    pos: ePos.clone().addScaledVector(toPlayer, 1.5),
    vel: toPlayer.clone().multiplyScalar(E_LASER_SPEED),
    born: t,
  };
  g.eLasers[idx] = laser;
  const m = eLaserMeshes[idx];
  if (m) {
    m.position.copy(laser.pos);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), toPlayer);
    m.visible = true;
  }
}
