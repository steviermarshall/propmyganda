import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLLIDERS, PORTALS, WORLD_RADIUS, cam, joystick, player, type Portal } from "./worldState";

const SPEED = 5.2;
const ACCEL = 12;
const NEAR_DIST = 2.4;

interface Props {
  onNear: (p: Portal | null) => void;
  onEnter: (p: Portal) => void;
}

/** Small lantern-carrying explorer. WASD / arrows, click-to-move, joystick. */
export default function Explorer({ onNear, onEnter }: Props) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const marker = useRef<THREE.Mesh>(null);
  const keys = useRef<Record<string, boolean>>({});
  const vel = useRef(new THREE.Vector3());
  const nearRef = useRef<Portal | null>(null);
  const enteredRef = useRef(false);
  const cb = useRef({ onNear, onEnter });
  cb.current = { onNear, onEnter };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.current[k] = true;
      if ((k === "e" || k === "enter") && nearRef.current && !enteredRef.current) {
        enteredRef.current = true;
        cb.current.onEnter(nearRef.current);
      }
      if (k.startsWith("arrow")) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    const blur = () => { keys.current = {}; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    const k = keys.current;
    let ix = (k["d"] || k["arrowright"] ? 1 : 0) - (k["a"] || k["arrowleft"] ? 1 : 0) + joystick.x;
    let iy = (k["w"] || k["arrowup"] ? 1 : 0) - (k["s"] || k["arrowdown"] ? 1 : 0) + joystick.y;
    const len = Math.hypot(ix, iy);
    const desired = new THREE.Vector3();

    if (len > 0.08) {
      ix /= Math.max(len, 1);
      iy /= Math.max(len, 1);
      // camera-relative: forward = away from camera
      const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
      const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
      desired.set(fx * iy + rx * ix, 0, fz * iy + rz * ix).multiplyScalar(SPEED);
      player.target = null;
      player.pendingEnter = null;
    } else if (player.target) {
      const to = player.target.clone().sub(player.pos).setY(0);
      const d = to.length();
      if (d < 0.2) {
        const pending = player.pendingEnter;
        player.target = null;
        player.pendingEnter = null;
        if (pending && !enteredRef.current) {
          enteredRef.current = true;
          cb.current.onEnter(pending);
        }
      } else {
        desired.copy(to.normalize().multiplyScalar(SPEED * Math.min(1, d / 0.8 + 0.35)));
      }
    }

    vel.current.lerp(desired, 1 - Math.exp(-ACCEL * dt));
    const p = player.pos;
    p.addScaledVector(vel.current, dt);

    // Collisions
    for (const [cx, cz, r] of COLLIDERS) {
      const dx = p.x - cx, dz = p.z - cz;
      const d = Math.hypot(dx, dz);
      if (d < r && d > 0.0001) {
        p.x = cx + (dx / d) * r;
        p.z = cz + (dz / d) * r;
      }
    }
    const rr = Math.hypot(p.x, p.z);
    if (rr > WORLD_RADIUS) { p.x *= WORLD_RADIUS / rr; p.z *= WORLD_RADIUS / rr; }

    const speed = vel.current.length();
    player.moving = speed > 0.3;
    if (speed > 0.3) {
      const target = Math.atan2(vel.current.x, vel.current.z);
      let diff = target - player.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      player.heading += diff * (1 - Math.exp(-14 * dt));
    }

    const t = state.clock.getElapsedTime();
    if (root.current) {
      root.current.position.set(p.x, 0, p.z);
      root.current.rotation.y = player.heading;
    }
    if (body.current) {
      const walk = Math.min(speed / SPEED, 1);
      body.current.position.y = Math.abs(Math.sin(t * 11)) * 0.12 * walk + Math.sin(t * 2) * 0.02;
      body.current.rotation.z = Math.sin(t * 11) * 0.06 * walk;
    }
    if (marker.current) {
      marker.current.visible = !!player.target;
      if (player.target) {
        marker.current.position.set(player.target.x, 0.04, player.target.z);
        const s = 1 + Math.sin(t * 6) * 0.15;
        marker.current.scale.set(s, s, s);
      }
    }

    // Nearest doorway
    let near: Portal | null = null;
    let best = NEAR_DIST;
    for (const portal of PORTALS) {
      const d = Math.hypot(p.x - portal.door[0], p.z - portal.door[1]);
      if (d < best) { best = d; near = portal.id; }
    }
    if (near !== nearRef.current) {
      nearRef.current = near;
      cb.current.onNear(near);
    }
  });

  return (
    <>
      <group ref={root}>
        <group ref={body}>
          {/* cloak */}
          <mesh position={[0, 0.5, 0]} castShadow>
            <coneGeometry args={[0.36, 1.0, 10]} />
            <meshStandardMaterial color="#1c4a4a" roughness={0.85} />
          </mesh>
          {/* head */}
          <mesh position={[0, 1.12, 0]} castShadow>
            <sphereGeometry args={[0.2, 16, 12]} />
            <meshStandardMaterial color="#e8c9a4" roughness={0.7} />
          </mesh>
          {/* hood */}
          <mesh position={[0, 1.22, -0.03]} rotation={[-0.25, 0, 0]}>
            <coneGeometry args={[0.24, 0.5, 10]} />
            <meshStandardMaterial color="#123838" roughness={0.9} />
          </mesh>
          {/* scarf — PMG red */}
          <mesh position={[0, 0.94, 0]}>
            <torusGeometry args={[0.17, 0.05, 6, 14]} />
            <meshStandardMaterial color="#d8231d" roughness={0.6} />
          </mesh>
          {/* eyes */}
          <mesh position={[0.07, 1.14, 0.18]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshBasicMaterial color="#10181a" />
          </mesh>
          <mesh position={[-0.07, 1.14, 0.18]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshBasicMaterial color="#10181a" />
          </mesh>
          {/* lantern */}
          <group position={[0.34, 0.62, 0.12]}>
            <mesh position={[0, 0.18, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.3, 4]} />
              <meshStandardMaterial color="#3a2a1a" />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.09, 12, 10]} />
              <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={3} />
            </mesh>
            <pointLight color="#ffc36b" intensity={1.6} distance={6} decay={2} />
          </group>
        </group>
        {/* soft contact shadow */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <circleGeometry args={[0.42, 20]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.35} depthWrite={false} />
        </mesh>
      </group>

      {/* click-to-move target marker */}
      <mesh ref={marker} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.28, 0.38, 28]} />
        <meshBasicMaterial color="#9ff5ff" transparent opacity={0.8} depthWrite={false} />
      </mesh>
    </>
  );
}
