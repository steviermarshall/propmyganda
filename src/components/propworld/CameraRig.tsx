import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { kickables } from "./useKickables";

interface Props {
  mode: "forest" | "transitioning" | "theater" | "game";
  hovered?: boolean;
  hoverSide?: "room" | "game" | null;
  isMobile?: boolean;
  onTransitionComplete: () => void;
  onShoot?: () => void;
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
export default function CameraRig({ mode, hovered, hoverSide, isMobile, onTransitionComplete, onShoot }: Props) {
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
  // Theater dolly: how far we've moved along the view direction (clamped inside room).
  // Negative = backed up away from where we're looking. Positive = pushed forward.
  const theaterDollyRef = useRef(0);
  const theaterDollyTargetRef = useRef(0);
  // Velocity (rad/s) for fling/momentum
  const yawVelRef = useRef(0);
  const pitchVelRef = useRef(0);
  const lastYRef = useRef(0);

  // Track press position for tap-vs-drag detection (kick on tap)
  const pressXRef = useRef(0);
  const pressYRef = useRef(0);
  const pressTimeRef = useRef(0);
  const movedRef = useRef(false);

  // Hold-to-shoot (game mode)
  const isHoldingRef = useRef(false);
  const lastAutoShootRef = useRef(0);
  const onShootRef = useRef(onShoot);

  useEffect(() => { onShootRef.current = onShoot; }, [onShoot]);

  // Pointer + pinch + wheel handlers
  useEffect(() => {
    const dom = gl.domElement;
    // Track active pointers for pinch detection
    const activePointers = new Map<number, { x: number; y: number }>();
    let pinchStartDist = 0;
    let pinchStartDolly = 0;
    let isPinching = false;

    const maxBack = mode === "game" ? -20 : -4;
    const dollyClamp = (v: number) => THREE.MathUtils.clamp(v, maxBack, 3.5);

    const onDown = (e: PointerEvent) => {
      if (mode !== "forest" && mode !== "theater") return; // game mode handled by SpaceGame
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target && target.tagName !== "CANVAS") return;

      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // If two fingers down, start pinch
      if (activePointers.size === 2 && mode === "theater") {
        const pts = Array.from(activePointers.values());
        pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        pinchStartDolly = theaterDollyTargetRef.current;
        isPinching = true;
        draggingRef.current = false; // cancel single-finger drag
        userInteractRef.current = performance.now();
        return;
      }

      draggingRef.current = true;
      lastXRef.current = e.clientX;
      lastYRef.current = e.clientY;
      pressXRef.current = e.clientX;
      pressYRef.current = e.clientY;
      pressTimeRef.current = performance.now();
      movedRef.current = false;
      yawVelRef.current = 0;
      pitchVelRef.current = 0;
      userAngleVelRef.current = 0;
      userInteractRef.current = performance.now();
      if (mode === "game") {
        isHoldingRef.current = true;
        lastAutoShootRef.current = 0; // fire on next frame immediately
      }
      try {
        dom.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    const onMove = (e: PointerEvent) => {
      if (activePointers.has(e.pointerId)) {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // Pinch (two pointers): adjust dolly distance based on pinch ratio
      if (isPinching && activePointers.size >= 2 && mode === "theater") {
        const pts = Array.from(activePointers.values()).slice(0, 2);
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (pinchStartDist > 0) {
          const delta = (dist - pinchStartDist) / 60; // pixels-per-unit
          theaterDollyTargetRef.current = dollyClamp(pinchStartDolly + delta);
        }
        userInteractRef.current = performance.now();
        return;
      }

      if (!draggingRef.current) return;
      const dx = e.clientX - lastXRef.current;
      const dy = e.clientY - lastYRef.current;
      lastXRef.current = e.clientX;
      lastYRef.current = e.clientY;

      const totalDx = e.clientX - pressXRef.current;
      const totalDy = e.clientY - pressYRef.current;
      if (Math.hypot(totalDx, totalDy) > 6) movedRef.current = true;

      if (mode === "theater" || mode === "game") {
        const baseSens = (Math.PI / Math.max(window.innerWidth, 1));
        const sens = baseSens * (mode === "game"
          ? (isMobile ? 1.8 : 1.5)
          : (isMobile ? 1.0 : 0.7));
        const pitchMult = mode === "game" ? 0.85 : 0.55;
        const pitchClamp = mode === "game" ? 1.3 : 0.45;
        theaterYawTargetRef.current -= dx * sens;
        theaterPitchTargetRef.current = THREE.MathUtils.clamp(
          theaterPitchTargetRef.current - dy * sens * pitchMult,
          -pitchClamp,
          pitchClamp
        );
        yawVelRef.current = -dx * sens * 60;
        pitchVelRef.current = -dy * sens * pitchMult * 60;
      } else {
        const sensitivity = (Math.PI / window.innerWidth) * 1.2;
        const delta = -dx * sensitivity;
        angleRef.current += delta;
        userAngleVelRef.current = delta;
      }
      userInteractRef.current = performance.now();
    };
    const onUp = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      if (activePointers.size < 2) {
        isPinching = false;
        pinchStartDist = 0;
      }

      if (!draggingRef.current) {
        try {
          dom.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        return;
      }
      draggingRef.current = false;
      isHoldingRef.current = false;
      const elapsed = performance.now() - pressTimeRef.current;
      const isTap = !movedRef.current && elapsed < 300;

      if (isTap && mode === "theater") {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        kickables.kickFromCamera(camera.position.clone(), dir);
      } else if (isTap && mode === "game") {
        onShoot?.();
      }

      try {
        dom.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    // Mouse wheel = dolly back/forward in theater
    const onWheel = (e: WheelEvent) => {
      if (mode !== "theater") return;
      e.preventDefault();
      const delta = e.deltaY * 0.004; // wheel down (positive) = back up
      theaterDollyTargetRef.current = dollyClamp(theaterDollyTargetRef.current - delta);
      userInteractRef.current = performance.now();
    };

    dom.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    dom.addEventListener("wheel", onWheel, { passive: false });
    dom.style.touchAction = "none";

    return () => {
      dom.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      dom.removeEventListener("wheel", onWheel);
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

      const baseRadius = isMobile ? 22 : 16;

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

      // Pan look target toward hovered tree side
      const panTarget = hoverSide === "room" ? 6 : hoverSide === "game" ? -6 : 0;
      forestTarget.current.x = THREE.MathUtils.lerp(forestTarget.current.x, panTarget, 0.03);
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

    // Game mode: SpaceGame owns camera and input — CameraRig does nothing here
    if (mode === "game") return;

    // theater — smoothed look-around with momentum
    const idleMs = performance.now() - userInteractRef.current;

    // Apply fling momentum after release (decay quickly)
    if (!draggingRef.current) {
      if (Math.abs(yawVelRef.current) > 0.001 || Math.abs(pitchVelRef.current) > 0.001) {
        const pitchClamp = mode === "game" ? 1.3 : 0.45;
        theaterYawTargetRef.current += yawVelRef.current * delta;
        theaterPitchTargetRef.current = THREE.MathUtils.clamp(
          theaterPitchTargetRef.current + pitchVelRef.current * delta,
          -pitchClamp,
          pitchClamp
        );
        // Exponential decay (~halves every ~0.3s)
        const decay = Math.pow(0.06, delta);
        yawVelRef.current *= decay;
        pitchVelRef.current *= decay;
      }
    }

    // Gentle auto-rotate only in theater after long idle — never in game mode
    if (mode !== "game" && idleMs > 5000 && !draggingRef.current) {
      theaterYawTargetRef.current += delta * 0.06;
    }

    // Critically-damped lerp toward target — game mode is snappier
    const smooth = 1 - Math.exp(-delta * (mode === "game" ? 22 : 12));
    theaterYawRef.current = THREE.MathUtils.lerp(
      theaterYawRef.current,
      theaterYawTargetRef.current,
      smooth
    );
    theaterPitchRef.current = THREE.MathUtils.lerp(
      theaterPitchRef.current,
      theaterPitchTargetRef.current,
      smooth
    );

    // Smooth dolly toward target
    theaterDollyRef.current = THREE.MathUtils.lerp(
      theaterDollyRef.current,
      theaterDollyTargetRef.current,
      smooth
    );

    // Camera sits at the center, dolly slides it along view direction (clamped inside walls)
    const bob = Math.sin(t * 0.4) * 0.05;
    const yawNow = theaterYawRef.current;
    const dolly = theaterDollyRef.current;
    // Move along XZ direction we're facing
    const targetPos = new THREE.Vector3(
      Math.sin(yawNow) * dolly,
      2.6 + bob,
      Math.cos(yawNow) * dolly
    );
    // Keep inside the room (walls at ±6; leave margin). Game mode has no walls so clamp is wider.
    const wallClamp = mode === "game" ? 20 : 4.8;
    targetPos.x = THREE.MathUtils.clamp(targetPos.x, -wallClamp, wallClamp);
    targetPos.z = THREE.MathUtils.clamp(targetPos.z, -wallClamp, wallClamp);
    camera.position.lerp(targetPos, 0.12);

    const targetFov = mode === "game" ? (isMobile ? 95 : 85) : (isMobile ? 75 : 70);
    persp.fov = THREE.MathUtils.lerp(persp.fov, targetFov, 0.05);
    persp.updateProjectionMatrix();

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
