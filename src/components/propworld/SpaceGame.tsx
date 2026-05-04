import { useRef, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import CosmicEnvironment, { ImpactBursts, triggerImpact } from "./CosmicEnvironment";

// ─── Types ────────────────────────────────────────────────────────────────────

type EnemyType = "scout" | "fighter" | "dreadnought";

interface EnemySlot {
  type: EnemyType;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  hp: number;
  maxHp: number;
  radius: number;
  lastShot: number;
  shotInterval: number;
  dying: boolean;
  deathT: number;
  strafeSeed: number;
}

interface LaserSlot {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  born: number;
  dir: THREE.Vector3;
}

interface WorldState {
  enemies: (EnemySlot | null)[];
  playerLasers: (LaserSlot | null)[];
  enemyLasers: (LaserSlot | null)[];
  aliveCount: number;
  score: number;
  playerHp: number;
  wave: number;
  waitingNextWave: boolean;
  waveTimer: number;
  gameOver: boolean;
  lastHudDispatch: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CFG = {
  scout:       { hp: 1, radius: 1.0, speed: 9,  shotInterval: 3.5, score: 100, hpBarY: 1.8  },
  fighter:     { hp: 3, radius: 1.6, speed: 5,  shotInterval: 2.2, score: 300, hpBarY: 2.4  },
  dreadnought: { hp: 8, radius: 3.0, speed: 1.8,shotInterval: 1.4, score: 800, hpBarY: 3.8  },
} as const;

const MAX_ENEMIES        = 15;
const MAX_PLAYER_LASERS  = 24;
const MAX_ENEMY_LASERS   = 36;
const PLAYER_LASER_SPEED = 85;
const PLAYER_LASER_TTL   = 3.5;
const ENEMY_LASER_SPEED  = 22;
const ENEMY_LASER_TTL    = 7;
const PLAYER_HIT_RADIUS  = 1.2;
const SPAWN_RADIUS       = 75;
const WAVE_GAP           = 3.5;

// ─── Wave definition ─────────────────────────────────────────────────────────

function waveEnemies(wave: number): EnemyType[] {
  const list: EnemyType[] = [];
  const scouts       = Math.min(2 + wave, 7);
  const fighters     = Math.max(0, wave - 1);
  const dreadnoughts = Math.max(0, wave - 3);
  for (let i = 0; i < scouts; i++)                    list.push("scout");
  for (let i = 0; i < Math.min(fighters, 5); i++)     list.push("fighter");
  for (let i = 0; i < Math.min(dreadnoughts, 2); i++) list.push("dreadnought");
  return list;
}

// ─── HUD dispatch ────────────────────────────────────────────────────────────

function dispatchHud(w: WorldState, waveComplete = false) {
  window.dispatchEvent(new CustomEvent("game:hud", {
    detail: { score: w.score, hp: w.playerHp, wave: w.wave, gameOver: w.gameOver, waveComplete },
  }));
}

// ─── Ship geometry ────────────────────────────────────────────────────────────

function ScoutMesh() {
  return (
    <group name="scout">
      {/* Wedge fuselage */}
      <mesh>
        <boxGeometry args={[0.5, 0.22, 1.4]} />
        <meshStandardMaterial color="#1e2a1e" roughness={0.7} metalness={0.5} emissive="#0a2a0a" emissiveIntensity={0.2} />
      </mesh>
      {/* Left wing */}
      <mesh position={[-0.75, 0, 0.2]} rotation={[0, 0, 0.25]}>
        <boxGeometry args={[1.0, 0.06, 0.7]} />
        <meshStandardMaterial color="#162816" roughness={0.8} metalness={0.4} />
      </mesh>
      {/* Right wing */}
      <mesh position={[0.75, 0, 0.2]} rotation={[0, 0, -0.25]}>
        <boxGeometry args={[1.0, 0.06, 0.7]} />
        <meshStandardMaterial color="#162816" roughness={0.8} metalness={0.4} />
      </mesh>
      {/* Engine */}
      <mesh position={[0, 0, 0.72]}>
        <cylinderGeometry args={[0.13, 0.18, 0.28, 10]} />
        <meshBasicMaterial color="#ff2200" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0, 0.9]} intensity={1.4} distance={4} color="#ff3300" decay={2} />
    </group>
  );
}

function FighterMesh() {
  return (
    <group name="fighter">
      {/* Fuselage */}
      <mesh>
        <boxGeometry args={[0.7, 0.5, 2.0]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.6} metalness={0.6} emissive="#0a0a20" emissiveIntensity={0.15} />
      </mesh>
      {/* Upper fin */}
      <mesh position={[0, 0.55, 0.3]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.08, 0.8, 1.2]} />
        <meshStandardMaterial color="#12122a" roughness={0.8} />
      </mesh>
      {/* Wide wings */}
      <mesh position={[-1.3, 0, 0.3]} rotation={[0, -0.15, 0.15]}>
        <boxGeometry args={[1.6, 0.09, 1.1]} />
        <meshStandardMaterial color="#141428" roughness={0.75} metalness={0.5} />
      </mesh>
      <mesh position={[1.3, 0, 0.3]} rotation={[0, 0.15, -0.15]}>
        <boxGeometry args={[1.6, 0.09, 1.1]} />
        <meshStandardMaterial color="#141428" roughness={0.75} metalness={0.5} />
      </mesh>
      {/* Gun barrels */}
      <mesh position={[-0.6, -0.22, -0.9]}>
        <cylinderGeometry args={[0.05, 0.05, 0.9, 8]} />
        <meshStandardMaterial color="#2a2a3a" roughness={0.5} metalness={0.8} />
      </mesh>
      <mesh position={[0.6, -0.22, -0.9]}>
        <cylinderGeometry args={[0.05, 0.05, 0.9, 8]} />
        <meshStandardMaterial color="#2a2a3a" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* Twin engines */}
      <mesh position={[-0.3, 0, 1.05]}>
        <cylinderGeometry args={[0.14, 0.2, 0.35, 10]} />
        <meshBasicMaterial color="#ff8800" toneMapped={false} />
      </mesh>
      <mesh position={[0.3, 0, 1.05]}>
        <cylinderGeometry args={[0.14, 0.2, 0.35, 10]} />
        <meshBasicMaterial color="#ff8800" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0, 1.3]} intensity={2} distance={5} color="#ff6600" decay={2} />
    </group>
  );
}

function DreadnoughtMesh() {
  return (
    <group name="dreadnought">
      {/* Main hull */}
      <mesh>
        <boxGeometry args={[2.0, 1.0, 4.5]} />
        <meshStandardMaterial color="#12081e" roughness={0.55} metalness={0.7} emissive="#18003a" emissiveIntensity={0.2} />
      </mesh>
      {/* Superstructure */}
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[1.0, 0.6, 2.5]} />
        <meshStandardMaterial color="#1a0a2e" roughness={0.6} metalness={0.6} />
      </mesh>
      {/* Side sponsons */}
      <mesh position={[-1.6, 0, 0.3]}>
        <boxGeometry args={[1.0, 0.6, 2.0]} />
        <meshStandardMaterial color="#0e0618" roughness={0.7} metalness={0.6} />
      </mesh>
      <mesh position={[1.6, 0, 0.3]}>
        <boxGeometry args={[1.0, 0.6, 2.0]} />
        <meshStandardMaterial color="#0e0618" roughness={0.7} metalness={0.6} />
      </mesh>
      {/* Heavy gun */}
      <mesh position={[0, 0.5, -2.4]}>
        <cylinderGeometry args={[0.18, 0.22, 1.4, 10]} />
        <meshStandardMaterial color="#1a0a1a" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* Triple engines */}
      {[-0.7, 0, 0.7].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0, 2.3]}>
            <cylinderGeometry args={[0.22, 0.30, 0.5, 12]} />
            <meshBasicMaterial color="#4040ff" toneMapped={false} />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 0, 2.8]} intensity={3} distance={8} color="#4040ff" decay={2} />
    </group>
  );
}

// ─── HP bar geometry ──────────────────────────────────────────────────────────

function HpBar({ onRef }: { onRef: (m: THREE.Mesh | null) => void }) {
  return (
    <group>
      <mesh renderOrder={10}>
        <planeGeometry args={[2, 0.14]} />
        <meshBasicMaterial color="#222" transparent opacity={0.75} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={onRef} position={[0, 0, 0.01]} renderOrder={11}>
        <planeGeometry args={[2, 0.14]} />
        <meshBasicMaterial color="#22ff44" transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomOnSphere(r: number): THREE.Vector3 {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    (Math.random() - 0.5) * r * 0.5,
    r * Math.cos(phi),
  );
}

function spawnWave(
  wave: number,
  w: WorldState,
  eGroups: (THREE.Group | null)[],
  hpFgMeshes: (THREE.Mesh | null)[],
) {
  const types = waveEnemies(wave);
  let slot = 0;
  for (const type of types) {
    while (slot < MAX_ENEMIES && w.enemies[slot] !== null) slot++;
    if (slot >= MAX_ENEMIES) break;

    const cfg = CFG[type];
    const pos = randomOnSphere(SPAWN_RADIUS + Math.random() * 20);

    w.enemies[slot] = {
      type, pos, vel: new THREE.Vector3(),
      hp: cfg.hp, maxHp: cfg.hp, radius: cfg.radius,
      lastShot: Math.random() * cfg.shotInterval,
      shotInterval: cfg.shotInterval + (Math.random() - 0.5) * 0.5,
      dying: false, deathT: 0, strafeSeed: Math.random() * 100,
    };

    const g = eGroups[slot];
    if (g) {
      g.position.copy(pos);
      g.visible = true;
      g.scale.setScalar(1);
      g.children.forEach((child) => {
        if (child.name === "hpbar") {
          child.visible = true;
        } else {
          child.visible = child.name === type;
        }
      });
    }

    // Reset HP bar
    const fg = hpFgMeshes[slot];
    if (fg) {
      fg.scale.x = 1;
      fg.position.x = 0;
    }

    w.aliveCount++;
    slot++;
  }
  dispatchHud(w);
}

function fireEnemyLaser(
  e: EnemySlot,
  camPos: THREE.Vector3,
  t: number,
  w: WorldState,
  eLaserMeshes: (THREE.Mesh | null)[],
) {
  const idx = w.enemyLasers.findIndex((l) => l === null);
  if (idx === -1) return;

  // Aim at player with accuracy falloff by distance
  const dist = e.pos.distanceTo(camPos);
  const spread = Math.min(0.4, 0.05 + dist * 0.003);
  const dir = camPos.clone().sub(e.pos).normalize();
  dir.x += (Math.random() - 0.5) * spread;
  dir.y += (Math.random() - 0.5) * spread;
  dir.z += (Math.random() - 0.5) * spread;
  dir.normalize();

  const laser: LaserSlot = {
    pos: e.pos.clone().addScaledVector(dir, e.radius + 0.3),
    vel: dir.clone().multiplyScalar(ENEMY_LASER_SPEED),
    born: t,
    dir: dir.clone(),
  };
  w.enemyLasers[idx] = laser;

  const m = eLaserMeshes[idx];
  if (m) {
    m.position.copy(laser.pos);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    m.visible = true;
  }
}

// ─── Main game component ──────────────────────────────────────────────────────

interface Props {
  isMobile?: boolean;
  onRegisterShoot: (fn: () => void) => void;
}

export default function SpaceGame({ isMobile = false, onRegisterShoot }: Props) {
  const { camera } = useThree();

  // Pools of refs for Three.js objects
  const eGroupRefs  = useRef<(THREE.Group | null)[]>(new Array(MAX_ENEMIES).fill(null));
  const hpFgRefs    = useRef<(THREE.Mesh  | null)[]>(new Array(MAX_ENEMIES).fill(null));
  const pLaserRefs  = useRef<(THREE.Mesh  | null)[]>(new Array(MAX_PLAYER_LASERS).fill(null));
  const eLaserRefs  = useRef<(THREE.Mesh  | null)[]>(new Array(MAX_ENEMY_LASERS).fill(null));

  // Mutable game state (not React state → no re-renders)
  const w = useRef<WorldState>({
    enemies:      new Array(MAX_ENEMIES).fill(null),
    playerLasers: new Array(MAX_PLAYER_LASERS).fill(null),
    enemyLasers:  new Array(MAX_ENEMY_LASERS).fill(null),
    aliveCount: 0, score: 0, playerHp: 5,
    wave: 1, waitingNextWave: false, waveTimer: 0,
    gameOver: false, lastHudDispatch: 0,
  });

  const clockRef   = useRef(0);
  const spawnedRef = useRef(false);

  // Player shoot
  const shoot = useCallback(() => {
    if (w.current.gameOver) return;
    const idx = w.current.playerLasers.findIndex((l) => l === null);
    if (idx === -1) return;

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);

    const laser: LaserSlot = {
      pos: camera.position.clone().addScaledVector(dir, 1.0),
      vel: dir.clone().multiplyScalar(PLAYER_LASER_SPEED),
      born: clockRef.current,
      dir: dir.clone(),
    };
    w.current.playerLasers[idx] = laser;

    const m = pLaserRefs.current[idx];
    if (m) {
      m.position.copy(laser.pos);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      m.visible = true;
    }
  }, [camera]);

  useEffect(() => { onRegisterShoot(shoot); }, [onRegisterShoot, shoot]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    clockRef.current = t;
    const ws = w.current;
    const camPos = camera.position;

    // ── First frame: spawn wave 1 ─────────────────────────────────────────
    if (!spawnedRef.current) {
      spawnedRef.current = true;
      spawnWave(1, ws, eGroupRefs.current, hpFgRefs.current);
      return;
    }

    if (ws.gameOver) return;

    // ── Wave management ───────────────────────────────────────────────────
    if (ws.aliveCount === 0 && !ws.waitingNextWave) {
      ws.waitingNextWave = true;
      ws.waveTimer = 0;
      dispatchHud(ws, true);
    }
    if (ws.waitingNextWave) {
      ws.waveTimer += delta;
      if (ws.waveTimer >= WAVE_GAP) {
        ws.waitingNextWave = false;
        ws.wave++;
        spawnWave(ws.wave, ws, eGroupRefs.current, hpFgRefs.current);
      }
      return;
    }

    // ── Enemy update ──────────────────────────────────────────────────────
    for (let i = 0; i < MAX_ENEMIES; i++) {
      const e = ws.enemies[i];
      const g = eGroupRefs.current[i];
      if (!e || !g) continue;

      if (e.dying) {
        e.deathT += delta;
        const s = Math.max(0, 1 - e.deathT * 2.5);
        g.scale.setScalar(s);
        if (e.deathT > 0.45) {
          ws.enemies[i] = null;
          ws.aliveCount--;
          g.visible = false;
          g.scale.setScalar(1);
        }
        continue;
      }

      // Move toward player with strafing wiggle
      const toPlayer = camPos.clone().sub(e.pos).normalize();
      const cfg = CFG[e.type];
      const targetVel = toPlayer.clone().multiplyScalar(cfg.speed);
      // Strafing orbit around player
      const orbitT = t * 0.6 + e.strafeSeed;
      targetVel.x += Math.sin(orbitT)       * cfg.speed * 0.3;
      targetVel.y += Math.cos(orbitT * 0.7) * cfg.speed * 0.2;
      e.vel.lerp(targetVel, 0.015);
      e.pos.addScaledVector(e.vel, delta);

      g.position.copy(e.pos);
      g.lookAt(camPos);

      // Rotate HP bar to face camera
      const hpBarGroup = g.children.find((c) => c.name === "hpbar");
      if (hpBarGroup) hpBarGroup.lookAt(camPos);

      // Enemy shoot
      if (t - e.lastShot > e.shotInterval) {
        e.lastShot = t;
        fireEnemyLaser(e, camPos, t, ws, eLaserRefs.current);
      }

      // Ram player
      if (e.pos.distanceTo(camPos) < cfg.radius + 0.8) {
        e.dying = true; e.deathT = 0;
        ws.playerHp = Math.max(0, ws.playerHp - 2);
        triggerImpact(e.pos.clone());
        if (ws.playerHp <= 0) ws.gameOver = true;
        dispatchHud(ws);
      }
    }

    // ── Player lasers ─────────────────────────────────────────────────────
    for (let i = 0; i < MAX_PLAYER_LASERS; i++) {
      const l = ws.playerLasers[i];
      const m = pLaserRefs.current[i];
      if (!l || !m) continue;

      if (t - l.born > PLAYER_LASER_TTL) {
        ws.playerLasers[i] = null;
        m.visible = false;
        continue;
      }

      l.pos.addScaledVector(l.vel, delta);
      m.position.copy(l.pos);

      // Hit enemy
      let hit = false;
      for (let j = 0; j < MAX_ENEMIES; j++) {
        const e = ws.enemies[j];
        if (!e || e.dying) continue;
        if (l.pos.distanceTo(e.pos) < CFG[e.type].radius) {
          ws.playerLasers[i] = null;
          m.visible = false;
          triggerImpact(l.pos.clone());
          e.hp--;
          if (e.hp <= 0) {
            e.dying = true; e.deathT = 0;
            ws.score += CFG[e.type].score;
          }
          // Update HP bar
          const fg = hpFgRefs.current[j];
          const ratio = Math.max(0, e.hp / e.maxHp);
          if (fg) { fg.scale.x = ratio; fg.position.x = ratio - 1; }
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }

    // ── Enemy lasers ──────────────────────────────────────────────────────
    for (let i = 0; i < MAX_ENEMY_LASERS; i++) {
      const l = ws.enemyLasers[i];
      const m = eLaserRefs.current[i];
      if (!l || !m) continue;

      if (t - l.born > ENEMY_LASER_TTL) {
        ws.enemyLasers[i] = null;
        m.visible = false;
        continue;
      }

      l.pos.addScaledVector(l.vel, delta);
      m.position.copy(l.pos);

      // Hit player
      if (l.pos.distanceTo(camPos) < PLAYER_HIT_RADIUS) {
        ws.enemyLasers[i] = null;
        m.visible = false;
        ws.playerHp = Math.max(0, ws.playerHp - 1);
        triggerImpact(l.pos.clone());
        if (ws.playerHp <= 0) ws.gameOver = true;
        dispatchHud(ws);
      }
    }

    // ── Throttled HUD sync ────────────────────────────────────────────────
    if (t - ws.lastHudDispatch > 0.4) {
      ws.lastHudDispatch = t;
      dispatchHud(ws);
    }
  });

  return (
    <group>
      <CosmicEnvironment isMobile={isMobile} noSway />
      <ImpactBursts />

      {/* Enemy pool */}
      {Array.from({ length: MAX_ENEMIES }, (_, i) => (
        <group key={`e${i}`} ref={(el) => { eGroupRefs.current[i] = el as THREE.Group | null; }} visible={false}>
          <ScoutMesh />
          <FighterMesh />
          <DreadnoughtMesh />
          {/* HP bar – positioned above ship, billboard handled in useFrame */}
          <group name="hpbar" position={[0, CFG.scout.hpBarY, 0]}>
            <HpBar onRef={(el) => { hpFgRefs.current[i] = el; }} />
          </group>
        </group>
      ))}

      {/* Player laser pool (cyan) */}
      {Array.from({ length: MAX_PLAYER_LASERS }, (_, i) => (
        <mesh key={`pl${i}`} ref={(el) => { pLaserRefs.current[i] = el as THREE.Mesh | null; }} visible={false}>
          <capsuleGeometry args={[0.045, 1.4, 4, 8]} />
          <meshBasicMaterial color="#00ffee" toneMapped={false} />
        </mesh>
      ))}

      {/* Enemy laser pool (orange-red) */}
      {Array.from({ length: MAX_ENEMY_LASERS }, (_, i) => (
        <mesh key={`el${i}`} ref={(el) => { eLaserRefs.current[i] = el as THREE.Mesh | null; }} visible={false}>
          <capsuleGeometry args={[0.065, 1.1, 4, 8]} />
          <meshBasicMaterial color="#ff4400" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
