import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { kickables } from "./useKickables";

interface Props {
  mode: "forest" | "transitioning" | "theater";
  hovered?: boolean;
  isMobile?: boolean;
  onTransitionComplete: () => void;
}

/**
 * Camera choreography:
 *  - forest: gentle orbit; on hover/touch, slowly drift forward toward the tree
 *  - transitioning: cinematic zoom into the hollow with FOV punch
 *  - theater: settle in the seat with subtle sway
 *
 * Interactivity:
 *  - Drag (mouse or touch) to rotate around the tree manually.
 *  - Releases back to auto-orbit after a short idle.
 */
export default function CameraRig({ mode, hovered, isMobile, onTransitionComplete }: Props) {
  const { camera, gl } = useThree();
  const startTimeRef = useRef<number | null>(null);
  const startPosRef = useRef(new THREE.Vector3());
  const startFovRef = useRef(55);
  const completedRef = useRef(false);

  // Drift offset added during hover (lerped, not snapped)
  const driftRef = useRef(0);
  // Orbit angle accumulator so we can freeze it during transitions
  const angleRef = useRef(0);

  // Drag-to-rotate state
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const userInteractRef = useRef(0); // timestamp of last user interaction
  const userAngleVelRef = useRef(0); // momentum

  const forestTarget = useRef(new THREE.Vector3(0, 4, 0));
  const theaterTarget = useRef(new THREE.Vector3(0, 3, -5.35));
  const theaterPos = useRef(new THREE.Vector3(0, 3, 4));

  // Theater look-around state — yaw/pitch are smoothed via target refs
  const theaterYawRef = useRef(0);
  const theaterPitchRef = useRef(0);
  const theaterYawTargetRef = useRef(0);
  const theaterPitchTargetRef = useRef(0);
  // Velocity (rad/s) for fling/momentum
  const yawVelRef = useRef(0);
  const pitchVelRef = useRef(0);
  const lastYRef = useRef(0);

  // Track press position for tap-vs-drag detection (kick on tap)
  const pressXRef = useRef(0);
  const pressYRef = useRef(0);
  const pressTimeRef = useRef(0);
  const movedRef = useRef(false);

  // Pointer drag handlers — attached to the canvas DOM element.
  useEffect(() => {
    const dom = gl.domElement;

    const onDown = (e: PointerEvent) => {
      if (mode !== "forest" && mode !== "theater") return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target && target.tagName !== "CANVAS") return;
      draggingRef.current = true;
      lastXRef.current = e.clientX;
      lastYRef.current = e.clientY;
      pressXRef.current = e.clientX;
      pressYRef.current = e.clientY;
      pressTimeRef.current = performance.now();
      movedRef.current = false;
      // Kill momentum so the user gets immediate control
      yawVelRef.current = 0;
      pitchVelRef.current = 0;
      userAngleVelRef.current = 0;
      userInteractRef.current = performance.now();
      try {
        dom.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - lastXRef.current;
      const dy = e.clientY - lastYRef.current;
      lastXRef.current = e.clientX;
      lastYRef.current = e.clientY;

      const totalDx = e.clientX - pressXRef.current;
      const totalDy = e.clientY - pressYRef.current;
      if (Math.hypot(totalDx, totalDy) > 6) movedRef.current = true;

      if (mode === "theater") {
        // Higher sensitivity on mobile so flicks rotate more
        const sens =
          (Math.PI / Math.max(window.innerWidth, 1)) * (isMobile ? 2.0 : 1.6);
        theaterYawTargetRef.current -= dx * sens;
        theaterPitchTargetRef.current = THREE.MathUtils.clamp(
          theaterPitchTargetRef.current - dy * sens * 0.55,
          -0.45,
          0.45
        );
        // Track instantaneous velocity for fling
        yawVelRef.current = -dx * sens * 60; // approx rad/s @ 60fps
        pitchVelRef.current = -dy * sens * 0.55 * 60;
      } else {
        const sensitivity = (Math.PI / window.innerWidth) * 1.2;
        const delta = -dx * sensitivity;
        angleRef.current += delta;
        userAngleVelRef.current = delta;
      }
      userInteractRef.current = performance.now();
    };
    const onUp = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      const elapsed = performance.now() - pressTimeRef.current;
      const isTap = !movedRef.current && elapsed < 300;

      if (isTap && mode === "theater") {
        // KICK! Send an impulse along the camera's forward direction.
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        kickables.kickFromCamera(camera.position.clone(), dir);
      }

      try {
        dom.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    dom.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    dom.style.touchAction = "none";

    return () => {
      dom.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [gl, mode, camera, isMobile]);

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
      persp.fov = isMobile ? 62 : 55;
      persp.updateProjectionMatrix();
    }
  }, [mode, camera, isMobile]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const persp = camera as THREE.PerspectiveCamera;

    if (mode === "forest") {
      const idleMs = performance.now() - userInteractRef.current;
      const isUserActive = draggingRef.current || idleMs < 1500;

      if (draggingRef.current) {
        // angle controlled directly by pointer move
      } else if (isUserActive && Math.abs(userAngleVelRef.current) > 0.0001) {
        // Coast on momentum, then decay
        angleRef.current += userAngleVelRef.current;
        userAngleVelRef.current *= 0.92;
      } else {
        // Auto orbit
        angleRef.current += delta * 0.08;
      }

      const baseRadius = isMobile ? 20 : 14;

      // Hover/touch-near: lerp drift toward the tree
      const targetDrift = hovered ? (isMobile ? 6 : 4.5) : 0;
      driftRef.current = THREE.MathUtils.lerp(driftRef.current, targetDrift, 0.025);
      const radius = baseRadius - driftRef.current;

      camera.position.x = Math.sin(angleRef.current) * radius;
      camera.position.z = Math.cos(angleRef.current) * radius;
      camera.position.y =
        (isMobile ? 7 : 5) + Math.sin(t * 0.3) * 0.4 - driftRef.current * 0.15;

      // Hover: tighten FOV for a subtle "leaning in" feel
      const baseFov = isMobile ? 62 : 55;
      const targetFov = hovered ? baseFov - 7 : baseFov;
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
      const p1 = new THREE.Vector3(0, 2.8, 6.0);
      const p2 = new THREE.Vector3(0, 2.8, 3.25);
      const p3 = new THREE.Vector3(0, 3, 4);

      let pos: THREE.Vector3;
      if (e < 0.4) {
        pos = p0.clone().lerp(p1, e / 0.4);
      } else if (e < 0.75) {
        pos = p1.clone().lerp(p2, (e - 0.4) / 0.35);
      } else {
        pos = p2.clone().lerp(p3, (e - 0.75) / 0.25);
      }
      camera.position.copy(pos);

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

    // theater — sit in the center of the rounded room, auto-rotate + drag to look around (full 360°)
    const idleMs = performance.now() - userInteractRef.current;
    const isUserActive = draggingRef.current || idleMs < 2500;

    // Auto-rotate yaw when idle so users see embeds drift past
    if (!isUserActive) {
      theaterYawRef.current += delta * 0.12;
    }

    // Camera sits at the center of the room with a gentle bob
    const bob = Math.sin(t * 0.4) * 0.05;
    camera.position.lerp(new THREE.Vector3(0, 2.6 + bob, 0), 0.08);

    const targetFov = isMobile ? 75 : 70;
    persp.fov = THREE.MathUtils.lerp(persp.fov, targetFov, 0.05);
    persp.updateProjectionMatrix();

    // Full 360° look-around: build a target on a unit sphere from yaw/pitch
    const yaw = theaterYawRef.current;
    const pitch = theaterPitchRef.current;
    const lookTarget = new THREE.Vector3(
      camera.position.x + Math.sin(yaw) * Math.cos(pitch) * 5,
      camera.position.y + Math.sin(pitch) * 5,
      camera.position.z + Math.cos(yaw) * Math.cos(pitch) * 5
    );
    camera.lookAt(lookTarget);
  });

  return null;
}
