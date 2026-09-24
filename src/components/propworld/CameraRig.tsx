import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PORTAL_BY_ID, cam, player, type Portal } from "./worldState";

interface Props {
  mode: "forest" | "transitioning";
  target: Portal | null;
  isMobile?: boolean;
  onTransitionComplete: () => void;
}

/**
 * Zelda-style three-quarter follow camera.
 *  - forest: trails the explorer from above/behind. Drag to turn, wheel to zoom.
 *  - transitioning: swoops into the chosen tree's hollow.
 */
export default function CameraRig({ mode, target, isMobile, onTransitionComplete }: Props) {
  const { camera, gl } = useThree();
  const look = useRef(new THREE.Vector3(player.pos.x, 1, player.pos.z));
  const trans = useRef<{ t0: number | null; from: THREE.Vector3; fromLook: THREE.Vector3; done: boolean }>({
    t0: null, from: new THREE.Vector3(), fromLook: new THREE.Vector3(), done: false,
  });
  const yawTarget = useRef(cam.yaw);
  const zoomTarget = useRef(cam.zoom);
  const doneRef = useRef(onTransitionComplete);
  doneRef.current = onTransitionComplete;

  // Drag to rotate, wheel to zoom
  useEffect(() => {
    const dom = gl.domElement;
    let dragging = false;
    let lastX = 0;
    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      lastX = e.clientX;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      yawTarget.current -= dx * (Math.PI / Math.max(window.innerWidth, 1)) * 1.4;
    };
    const up = () => { dragging = false; };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomTarget.current = THREE.MathUtils.clamp(zoomTarget.current + e.deltaY * 0.0012, 0.6, 1.5);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "q" || e.key === "Q") yawTarget.current += Math.PI / 4;
      if (e.key === "r" || e.key === "R") yawTarget.current -= Math.PI / 4;
    };
    dom.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    dom.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", key);
    dom.style.touchAction = "none";
    return () => {
      dom.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      dom.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", key);
    };
  }, [gl]);

  useEffect(() => {
    if (mode === "transitioning") {
      trans.current = { t0: null, from: camera.position.clone(), fromLook: look.current.clone(), done: false };
    }
  }, [mode, camera]);

  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    const persp = camera as THREE.PerspectiveCamera;

    if (mode === "forest") {
      cam.yaw += (yawTarget.current - cam.yaw) * (1 - Math.exp(-8 * dt));
      cam.zoom += (zoomTarget.current - cam.zoom) * (1 - Math.exp(-8 * dt));
      const dist = (isMobile ? 14 : 10.5) * cam.zoom;
      const height = (isMobile ? 11.5 : 8.5) * cam.zoom;
      const desired = new THREE.Vector3(
        player.pos.x + Math.sin(cam.yaw) * dist,
        height,
        player.pos.z + Math.cos(cam.yaw) * dist,
      );
      camera.position.lerp(desired, 1 - Math.exp(-5 * dt));
      look.current.lerp(new THREE.Vector3(player.pos.x, 1, player.pos.z), 1 - Math.exp(-7 * dt));
      camera.lookAt(look.current);
      const fov = isMobile ? 58 : 50;
      if (Math.abs(persp.fov - fov) > 0.01) {
        persp.fov += (fov - persp.fov) * 0.1;
        persp.updateProjectionMatrix();
      }
      return;
    }

    // transitioning: swoop into the hollow
    if (!target) return;
    const tr = trans.current;
    const t = state.clock.getElapsedTime();
    if (tr.t0 === null) tr.t0 = t;
    const k = Math.min((t - tr.t0) / 1.6, 1);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const p = PORTAL_BY_ID[target];
    const endPos = new THREE.Vector3(p.pos[0], 1.6, p.pos[1] + 1.6);
    const endLook = new THREE.Vector3(p.pos[0], 1.5, p.pos[1] - 2);
    camera.position.copy(tr.from.clone().lerp(endPos, e));
    look.current.copy(tr.fromLook.clone().lerp(endLook, e));
    camera.lookAt(look.current);
    persp.fov = THREE.MathUtils.lerp(isMobile ? 58 : 50, 34, e);
    persp.updateProjectionMatrix();
    if (k >= 1 && !tr.done) {
      tr.done = true;
      doneRef.current();
    }
  });

  return null;
}
