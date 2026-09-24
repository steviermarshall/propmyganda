import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { PORTALS, WORLD_RADIUS, cam, joystick, player } from "./worldState";

/** Touch joystick → shared joystick input. */
export function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);

  const update = (cx: number, cy: number) => {
    const r = base.current!.getBoundingClientRect();
    const max = r.width / 2;
    let dx = cx - (r.left + max);
    let dy = cy - (r.top + max);
    const d = Math.hypot(dx, dy);
    if (d > max) { dx *= max / d; dy *= max / d; }
    setKnob({ x: dx, y: dy });
    joystick.x = dx / max;
    joystick.y = -dy / max;
  };
  const end = () => {
    active.current = null;
    setKnob({ x: 0, y: 0 });
    joystick.x = 0;
    joystick.y = 0;
  };
  useEffect(() => end, []);

  return (
    <div
      ref={base}
      aria-label="Move joystick"
      className="pointer-events-auto absolute bottom-10 left-6 h-28 w-28 touch-none rounded-full border border-cyan-200/30 bg-black/30 backdrop-blur-sm"
      onPointerDown={(e) => { active.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); update(e.clientX, e.clientY); }}
      onPointerMove={(e) => { if (active.current === e.pointerId) update(e.clientX, e.clientY); }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-cyan-200/60 shadow-[0_0_20px_rgba(120,240,255,0.5)]"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}

/** Top-down minimap with the three trees and the explorer. */
export function Minimap() {
  const dot = useRef<SVGGElement>(null);
  const map = useRef<SVGGElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const s = 44 / WORLD_RADIUS;
      if (dot.current) dot.current.setAttribute("transform", `translate(${player.pos.x * s} ${player.pos.z * s}) rotate(${(-player.heading * 180) / Math.PI + 180})`);
      if (map.current) map.current.setAttribute("transform", `rotate(${(cam.yaw * 180) / Math.PI})`);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);
  const s = 44 / WORLD_RADIUS;
  return (
    <svg viewBox="-50 -50 100 100" className="h-24 w-24 md:h-28 md:w-28" aria-label="Minimap">
      <circle r="48" fill="rgba(2,12,16,0.6)" stroke="rgba(160,240,255,0.3)" />
      <g ref={map}>
        <path d={`M0 ${11 * s} L0 ${0.4 * s} M0 ${3.4 * s} L${-7 * s} ${3.2 * s} M0 ${3.4 * s} L${7 * s} ${3.2 * s}`} stroke="rgba(120,220,220,0.35)" strokeWidth="2" />
        <circle cx={-5.5 * s} cy={7.5 * s} r={2 * s} fill="rgba(40,120,150,0.5)" />
        {PORTALS.map((p) => (
          <circle key={p.id} cx={p.pos[0] * s} cy={p.pos[1] * s} r="5" fill={p.color} />
        ))}
        <g ref={dot}>
          <path d="M0 -5 L4 4 L0 2 L-4 4 Z" fill="#f4f1e8" />
        </g>
      </g>
    </svg>
  );
}

/** Soft generated forest ambience: wind + crickets. Off until the user turns it on. */
export function SoundToggle() {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!on) return;
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    // wind — brown noise through a low-pass with slow swell
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; data[i] = last * 3.5; }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 500;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.12;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.06;
    lfo.connect(lfoGain).connect(windGain.gain);
    noise.connect(lp).connect(windGain).connect(master);
    noise.start();
    lfo.start();

    // crickets
    const chirp = () => {
      const t = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 4200 + Math.random() * 300;
        g.gain.setValueAtTime(0, t + i * 0.07);
        g.gain.linearRampToValueAtTime(0.012, t + i * 0.07 + 0.01);
        g.gain.linearRampToValueAtTime(0, t + i * 0.07 + 0.045);
        o.connect(g).connect(master);
        o.start(t + i * 0.07);
        o.stop(t + i * 0.07 + 0.05);
      }
    };
    const iv = setInterval(() => { if (Math.random() < 0.6) chirp(); }, 900);
    return () => { clearInterval(iv); ctx.close(); ctxRef.current = null; };
  }, [on]);

  return (
    <button
      onClick={() => setOn((v) => !v)}
      aria-label={on ? "Mute forest sound" : "Play forest sound"}
      className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/30 bg-black/40 text-cyan-100 backdrop-blur transition-colors hover:bg-cyan-200/15"
    >
      {on ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
