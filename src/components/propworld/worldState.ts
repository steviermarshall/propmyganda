import * as THREE from "three";

/** Shared, mutable world state for the explorable forest (read inside useFrame, no re-renders). */

export type Portal = "room" | "game" | "fight";

export interface PortalSpec {
  id: Portal;
  /** Tree trunk center on the ground (x, z). */
  pos: [number, number];
  /** Spot in front of the hollow where the explorer stands to enter. */
  door: [number, number];
  label: string;
  sub: string;
  color: string;
}

export const PORTALS: PortalSpec[] = [
  { id: "game", pos: [-7, 0], door: [-7, 2.6], label: "The Game", sub: "Blue Tree · Space combat", color: "#38e1ff" },
  { id: "fight", pos: [0, -3], door: [0, -0.4], label: "PMG Fight", sub: "Crimson Tree · Arcade battle", color: "#ff3030" },
  { id: "room", pos: [7, 0], door: [7, 2.6], label: "The Room", sub: "Amber Tree · PMG Exclusive", color: "#ffb13b" },
];

export const PORTAL_BY_ID: Record<Portal, PortalSpec> = Object.fromEntries(
  PORTALS.map((p) => [p.id, p]),
) as Record<Portal, PortalSpec>;

/** Solid circles the explorer can't walk through: [x, z, radius]. */
export const COLLIDERS: [number, number, number][] = [
  ...PORTALS.map((p) => [p.pos[0], p.pos[1], 1.9] as [number, number, number]),
  [-5.5, 7.5, 2.0], // pond
];

export const WORLD_RADIUS = 12.5;
export const START_POS = new THREE.Vector3(0, 0, 9);

export const player = {
  pos: START_POS.clone(),
  heading: Math.PI,
  moving: false,
  target: null as THREE.Vector3 | null,
  pendingEnter: null as Portal | null,
};

/** Camera yaw around the explorer (drag to turn). */
export const cam = { yaw: 0, zoom: 1 };

/** On-screen joystick input (-1..1), y = forward. */
export const joystick = { x: 0, y: 0 };

export function placePlayerAtDoor(p: Portal) {
  const d = PORTAL_BY_ID[p].door;
  player.pos.set(d[0], 0, d[1] + 1.4);
  player.heading = 0;
  player.target = null;
  player.pendingEnter = null;
}
