import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  mode: "forest" | "transitioning" | "theater";
  onTransitionComplete: () => void;
}

/**
 * Animates the camera through three phases:
 *  - forest: gentle orbit around the ancient tree
 *  - transitioning: cinematic fly-through into the hollow entrance
 *  - theater: settle in front of the screen
 */
export default function CameraRig({ mode, onTransitionComplete }: Props) {
  const { camera } = useThree();
  const startTimeRef = useRef<number | null>(null);
  const startPosRef = useRef(new THREE.Vector3());
  const startQuatRef = useRef(new THREE.Quaternion());
  const completedRef = useRef(false);

  // Forest target (orbit center)
  const forestTarget = useRef(new THREE.Vector3(0, 4, 0));
  const theaterTarget = useRef(new THREE.Vector3(0, 3, -5.35));
  const theaterPos = useRef(new THREE.Vector3(0, 3, 4));

  // Reset transition state when mode changes
  useEffect(() => {
    if (mode === "transitioning") {
      startTimeRef.current = null;
      completedRef.current = false;
      startPosRef.current.copy(camera.position);
      startQuatRef.current.copy(camera.quaternion);
    }
  }, [mode, camera]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    if (mode === "forest") {
      // Slow cinematic orbit
      const radius = 14;
      const speed = 0.08;
      camera.position.x = Math.sin(t * speed) * radius;
      camera.position.z = Math.cos(t * speed) * radius;
      camera.position.y = 5 + Math.sin(t * 0.3) * 0.4;
      camera.lookAt(forestTarget.current);
      return;
    }

    if (mode === "transitioning") {
      if (startTimeRef.current === null) startTimeRef.current = t;
      const elapsed = t - startTimeRef.current;
      const duration = 2.6;
      const k = Math.min(elapsed / duration, 1);
      // ease in-out cubic
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

      // Path: current → entrance mouth → into the dark → settled in theater
      const p0 = startPosRef.current;
      const p1 = new THREE.Vector3(0, 2.5, 5.5);   // approach entrance
      const p2 = new THREE.Vector3(0, 2.5, 3.0);   // through portal
      const p3 = new THREE.Vector3(0, 3, 4);       // theater seat

      let pos: THREE.Vector3;
      if (e < 0.4) {
        const u = e / 0.4;
        pos = p0.clone().lerp(p1, u);
      } else if (e < 0.7) {
        const u = (e - 0.4) / 0.3;
        pos = p1.clone().lerp(p2, u);
      } else {
        const u = (e - 0.7) / 0.3;
        pos = p2.clone().lerp(p3, u);
      }
      camera.position.copy(pos);

      // Look target glides from tree center → portal → screen
      const lookStart = forestTarget.current;
      const lookMid = new THREE.Vector3(0, 2.5, 3);
      const lookEnd = theaterTarget.current;
      const look =
        e < 0.5
          ? lookStart.clone().lerp(lookMid, e / 0.5)
          : lookMid.clone().lerp(lookEnd, (e - 0.5) / 0.5);
      camera.lookAt(look);

      if (k >= 1 && !completedRef.current) {
        completedRef.current = true;
        onTransitionComplete();
      }
      return;
    }

    // theater mode — gentle sway in the seat
    const sway = Math.sin(t * 0.4) * 0.06;
    camera.position.lerp(
      new THREE.Vector3(theaterPos.current.x + sway, theaterPos.current.y, theaterPos.current.z),
      0.05
    );
    camera.lookAt(theaterTarget.current);
  });

  return null;
}
