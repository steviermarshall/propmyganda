import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  mode: "forest" | "transitioning" | "theater";
  hovered?: boolean;
  onTransitionComplete: () => void;
}

/**
 * Camera choreography:
 *  - forest: gentle orbit; on hover, slowly drift forward toward the tree
 *  - transitioning: cinematic zoom into the hollow with FOV punch
 *  - theater: settle in the seat with subtle sway
 */
export default function CameraRig({ mode, hovered, onTransitionComplete }: Props) {
  const { camera } = useThree();
  const startTimeRef = useRef<number | null>(null);
  const startPosRef = useRef(new THREE.Vector3());
  const startFovRef = useRef(55);
  const completedRef = useRef(false);

  // Drift offset added during hover (lerped, not snapped)
  const driftRef = useRef(0);
  // Orbit angle accumulator so we can freeze it during transitions
  const angleRef = useRef(0);

  const forestTarget = useRef(new THREE.Vector3(0, 4, 0));
  const theaterTarget = useRef(new THREE.Vector3(0, 3, -5.35));
  const theaterPos = useRef(new THREE.Vector3(0, 3, 4));

  useEffect(() => {
    if (mode === "transitioning") {
      startTimeRef.current = null;
      completedRef.current = false;
      startPosRef.current.copy(camera.position);
      const persp = camera as THREE.PerspectiveCamera;
      startFovRef.current = persp.fov;
    }
    if (mode === "forest") {
      const persp = camera as THREE.PerspectiveCamera;
      persp.fov = 55;
      persp.updateProjectionMatrix();
    }
  }, [mode, camera]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const persp = camera as THREE.PerspectiveCamera;

    if (mode === "forest") {
      // Slow continuous orbit
      angleRef.current += delta * 0.08;
      const baseRadius = 14;

      // Hover: lerp drift toward the tree (reduce radius), ease back when not hovered
      const targetDrift = hovered ? 4.5 : 0;
      driftRef.current = THREE.MathUtils.lerp(driftRef.current, targetDrift, 0.025);
      const radius = baseRadius - driftRef.current;

      camera.position.x = Math.sin(angleRef.current) * radius;
      camera.position.z = Math.cos(angleRef.current) * radius;
      camera.position.y = 5 + Math.sin(t * 0.3) * 0.4 - driftRef.current * 0.15;

      // Hover: tighten FOV for a subtle "leaning in" feel
      const targetFov = hovered ? 48 : 55;
      persp.fov = THREE.MathUtils.lerp(persp.fov, targetFov, 0.04);
      persp.updateProjectionMatrix();

      camera.lookAt(forestTarget.current);
      return;
    }

    if (mode === "transitioning") {
      if (startTimeRef.current === null) startTimeRef.current = t;
      const elapsed = t - startTimeRef.current;
      const duration = 2.8;
      const k = Math.min(elapsed / duration, 1);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

      const p0 = startPosRef.current;
      const p1 = new THREE.Vector3(0, 2.8, 6.0);   // align with entrance
      const p2 = new THREE.Vector3(0, 2.8, 3.25);  // mouth of the hollow
      const p3 = new THREE.Vector3(0, 3, 4);       // theater seat

      let pos: THREE.Vector3;
      if (e < 0.4) {
        pos = p0.clone().lerp(p1, e / 0.4);
      } else if (e < 0.75) {
        pos = p1.clone().lerp(p2, (e - 0.4) / 0.35);
      } else {
        pos = p2.clone().lerp(p3, (e - 0.75) / 0.25);
      }
      camera.position.copy(pos);

      // FOV punch — narrows on approach, widens as you "step in"
      const fov =
        e < 0.75
          ? THREE.MathUtils.lerp(startFovRef.current, 38, e / 0.75)
          : THREE.MathUtils.lerp(38, 60, (e - 0.75) / 0.25);
      persp.fov = fov;
      persp.updateProjectionMatrix();

      const lookStart = forestTarget.current;
      const lookMid = new THREE.Vector3(0, 2.8, 3.25);
      const lookEnd = theaterTarget.current;
      const look =
        e < 0.55
          ? lookStart.clone().lerp(lookMid, e / 0.55)
          : lookMid.clone().lerp(lookEnd, (e - 0.55) / 0.45);
      camera.lookAt(look);

      if (k >= 1 && !completedRef.current) {
        completedRef.current = true;
        onTransitionComplete();
      }
      return;
    }

    // theater
    const sway = Math.sin(t * 0.4) * 0.06;
    camera.position.lerp(
      new THREE.Vector3(theaterPos.current.x + sway, theaterPos.current.y, theaterPos.current.z),
      0.05
    );
    persp.fov = THREE.MathUtils.lerp(persp.fov, 55, 0.05);
    persp.updateProjectionMatrix();
    camera.lookAt(theaterTarget.current);
  });

  return null;
}
