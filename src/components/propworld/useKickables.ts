import { create } from "zustand";
import * as THREE from "three";

export type Kickable = {
  id: string;
  // Live position the renderer reads each frame
  position: THREE.Vector3;
  // Linear velocity (units/s)
  velocity: THREE.Vector3;
  // Angular velocity around Y (rad/s)
  angularY: number;
  // Current Y rotation
  rotationY: number;
  // Approximate radius for kick detection / wall collision
  radius: number;
  // Resting Y on the floor (so it doesn't sink)
  groundY: number;
  // Mass-ish factor — heavier = less kick
  mass: number;
};

type State = {
  items: Map<string, Kickable>;
  register: (k: Kickable) => void;
  unregister: (id: string) => void;
  /** Apply an impulse to any kickable inside a forward cone from the camera. */
  kickFromCamera: (origin: THREE.Vector3, dir: THREE.Vector3) => void;
};

export const useKickables = create<State>((set, get) => ({
  items: new Map(),
  register: (k) => {
    const items = get().items;
    items.set(k.id, k);
    set({ items: new Map(items) });
  },
  unregister: (id) => {
    const items = get().items;
    items.delete(id);
    set({ items: new Map(items) });
  },
  kickFromCamera: (origin, dir) => {
    const REACH = 3.5; // how far in front of the camera the "foot" reaches
    const CONE_DOT = 0.55; // ~55° half-angle
    const items = get().items;
    const flatDir = new THREE.Vector3(dir.x, 0, dir.z).normalize();

    items.forEach((k) => {
      const toItem = new THREE.Vector3(
        k.position.x - origin.x,
        0,
        k.position.z - origin.z
      );
      const dist = toItem.length();
      if (dist > REACH + k.radius) return;
      const itemDir = toItem.clone().normalize();
      const dot = itemDir.dot(flatDir);
      if (dot < CONE_DOT) return;

      // Strength falls off with distance, lighter mass = stronger kick
      const power = THREE.MathUtils.clamp(1 - dist / (REACH + k.radius), 0.2, 1);
      const speed = (6 + 4 * power) / k.mass;
      k.velocity.x += itemDir.x * speed;
      k.velocity.z += itemDir.z * speed;
      // Small upward pop
      k.velocity.y += 1.5 * power;
      // Spin
      k.angularY += (Math.random() - 0.5) * 6 + (itemDir.x - itemDir.z) * 2;
    });
  },
}));
