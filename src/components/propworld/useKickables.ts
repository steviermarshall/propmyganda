import * as THREE from "three";

export type Kickable = {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  angularY: number;
  rotationY: number;
  radius: number;
  groundY: number;
  mass: number;
};

// Module-level singleton — shared across CameraRig + TheaterInterior.
const items = new Map<string, Kickable>();

export const kickables = {
  register(k: Kickable) {
    items.set(k.id, k);
  },
  unregister(id: string) {
    items.delete(id);
  },
  all(): Kickable[] {
    return Array.from(items.values());
  },
  /** Apply an impulse to any kickable inside a forward cone from the camera. */
  kickFromCamera(origin: THREE.Vector3, dir: THREE.Vector3) {
    const REACH = 3.5;
    const CONE_DOT = 0.55; // ~55° half-angle
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

      const power = THREE.MathUtils.clamp(1 - dist / (REACH + k.radius), 0.2, 1);
      const speed = (6 + 4 * power) / k.mass;
      k.velocity.x += itemDir.x * speed;
      k.velocity.z += itemDir.z * speed;
      k.velocity.y += 1.5 * power;
      k.angularY += (Math.random() - 0.5) * 6 + (itemDir.x - itemDir.z) * 2;
    });
  },
};
