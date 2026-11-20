// The hub in 3D: the tower of holographic screens, the PMG logo on top, the light column, the
// rings, the dust, one bloom and one lens, over the Earth at night above New York (Earthlight,
// see ./earth.ts). Screens fly to full size when opened and fly back still playing. It draws
// only when told to.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LinearFilter,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Quaternion,
  Raycaster,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  Shape,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector2,
  Vector3,
  Vector4,
  VideoTexture,
  WebGLRenderer,
} from 'three-hub';
import { EffectComposer } from './three-addons/postprocessing/EffectComposer.js';
import { OutputPass } from './three-addons/postprocessing/OutputPass.js';
import { RenderPass } from './three-addons/postprocessing/RenderPass.js';
import { ShaderPass } from './three-addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from './three-addons/postprocessing/UnrealBloomPass.js';
import { CSS3DObject, CSS3DRenderer } from './three-addons/renderers/CSS3DRenderer.js';
import { uploadAll } from './upload';
import { type Card, ZONES } from './data';
import { EARTH_ASPECT, type EarthLayer, earthKind } from './earth';
import { createKinetic } from './kinetic';
import { type Pose, poseToWorld, RING_R, type Slot, type Tower } from './layout';
import logoShape from './logo-shape.json';

export const MINT = new Color(0x8fe9b8);
export const GROUND = new Color(0x050807);
/** Measuring knob: ?earthTilt=0 keeps the Earth still while scrolling (default 1). */
const EARTH_TILT = Number(new URLSearchParams(location.search).get('earthTilt') ?? 1);
/** How much larger than the screen the Earth picture is drawn, leaving room to slide. */
const EARTH_ZOOM = 1.08;
/** How often the live Earth repaints; measuring knob ?earthFps=. */
const EARTH_FPS = Number(new URLSearchParams(location.search).get('earthFps') ?? 12);
const DISPLAY = '"PMG Shoulders", "Big Shoulders Display", sans-serif';
const MONO = '"PMG Mono", "Space Mono", monospace';

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Screen {
  slot: Slot;
  group: Group;
  mesh: Mesh;
  mat: ShaderMaterial;
  label: Mesh;
  poster: Texture;
  loop?: HTMLVideoElement;
  loopTex?: VideoTexture;
  /** Where the loop's file is, and whether it has been asked for yet (see feedLoop). */
  loopUrl?: string;
  loopAsked?: boolean;
  /** While filming: the loop time this frame should show. */
  filmT?: number;
  hover: number;
  hoverTarget: number;
}

// ------------------------------------------------------------------ shaders
const cardVert = /* glsl */ `
attribute vec3 aFlat;
uniform float uFlat;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vW;
void main() {
  vUv = uv;
  vec3 p = mix(position, aFlat, uFlat);
  // A normal that blends to zero (a back-facing normal half-way to flat) would normalize to NaN.
  vec3 n = mix(normal, vec3(0.0, 0.0, 1.0), uFlat);
  n = dot(n, n) > 1e-8 ? normalize(n) : vec3(0.0, 0.0, 1.0);
  vec4 w = modelMatrix * vec4(p, 1.0);
  vW = w.xyz;
  vN = mat3(modelMatrix) * n;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const cardFrag = /* glsl */ `
uniform sampler2D uMap;
uniform float uTime;
uniform float uHover;
uniform float uOpen;
uniform float uReady;
uniform float uDim;
uniform float uAspect;
uniform vec3 uTint;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vW;
void main() {
  float holo = 1.0 - uOpen;
  vec2 e = min(vUv, 1.0 - vUv);
  float edge = 1.0 - smoothstep(0.0, 0.006, min(e.x * uAspect, e.y));
  vec3 V = normalize(cameraPosition - vW);
  vec3 N = dot(vN, vN) > 1e-8 ? normalize(vN) : vec3(0.0, 0.0, 1.0);
  // Facing the camera head-on, abs(dot(N, V)) rounds to just over 1: pow of the tiny negative
  // remainder is NaN, and the bloom pass spreads one NaN pixel into an all-black frame (Asad's
  // "blacking out all glitchy", 2026-11-18). Clamp before pow.
  float facing = clamp(abs(dot(N, V)), 0.0, 1.0);
  float fres = pow(1.0 - facing, 2.2);
  if (!gl_FrontFacing) {
    // The back of a screen: a faint grid of the same light.
    vec2 g = abs(fract(vUv * vec2(12.0 * uAspect, 12.0)) - 0.5);
    float line = 1.0 - smoothstep(0.46, 0.5, max(g.x, g.y));
    vec3 c = uTint * (0.05 + 0.25 * line + 0.6 * edge) * uDim;
    gl_FragColor = vec4(c, 0.55 * uDim);
    return;
  }
  float split = (0.0018 + 0.0045 * uHover) * holo;
  vec3 tex = vec3(texture2D(uMap, vUv + vec2(split, 0.0)).r, texture2D(uMap, vUv).g, texture2D(uMap, vUv - vec2(split, 0.0)).b);
  tex = mix(vec3(0.02, 0.05, 0.04), tex, uReady);
  float scan = 0.9 + 0.1 * sin(vUv.y * 420.0 + uTime * 5.0);
  float band = smoothstep(0.035, 0.0, abs(fract(vUv.y + uTime * 0.11) - 0.5));
  vec3 c = tex * mix(1.0, scan * (0.8 + 0.2 * uHover), holo) * mix(uDim, 1.0, uOpen);
  c += uTint * holo * (edge * (0.55 + 1.1 * uHover) + fres * 0.45 + band * 0.07) * mix(uDim, 1.0, uHover);
  gl_FragColor = vec4(c, mix(0.97 + 0.03 * uHover, 1.0, uOpen) * mix(uDim, 1.0, max(uHover, uOpen)));
}`;

const logoVert = /* glsl */ `
varying vec3 vP;
varying vec3 vNo;
varying vec3 vW;
varying vec3 vN;
void main() {
  vP = position;
  vNo = normal;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const logoFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uTint;
varying vec3 vP;
varying vec3 vNo;
varying vec3 vW;
varying vec3 vN;
void main() {
  vec3 V = normalize(cameraPosition - vW);
  vec3 N = dot(vN, vN) > 1e-8 ? normalize(vN) : vec3(0.0, 0.0, 1.0);
  float cap = abs(vNo.z);
  // Horizontal lines run through the letters, as on PMG's own home page.
  float lines = smoothstep(0.3, 0.42, abs(fract(vP.y * 0.33) - 0.5));
  vec3 L = normalize(vec3(0.4, 0.7, 0.9));
  float diff = 0.35 + 0.65 * max(dot(N, L), 0.0);
  vec3 base = vec3(0.93, 0.95, 0.92) * mix(0.14, 1.0, lines) * diff;
  base *= mix(0.32, 1.0, cap);
  // Clamped before pow: see the screens' shader (a NaN here blacks out the frame through bloom).
  float fres = pow(clamp(1.0 - abs(dot(N, V)), 0.0, 1.0), 2.0);
  float sweep = smoothstep(0.08, 0.0, abs(fract(vP.y * 0.006 - uTime * 0.07) - 0.5));
  vec3 c = base + uTint * (fres * 0.9 + sweep * 0.35 + (1.0 - cap) * 0.12);
  gl_FragColor = vec4(c, 1.0);
}`;

const lensFrag = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uRes;
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 d = vUv - 0.5;
  float r2 = dot(d, d);
  float ca = 0.006 * r2;
  vec3 c = vec3(texture2D(tDiffuse, vUv + d * ca * 2.0).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d * ca * 2.0).b);
  c *= mix(0.5, 1.0, smoothstep(0.62, 0.12, r2));
  float n = fract(sin(dot(floor(vUv * uRes) + floor(uTime * 24.0), vec2(12.9898, 78.233))) * 43758.5453);
  c += (n - 0.5) * 0.03;
  gl_FragColor = vec4(c, 1.0);
}`;

const dustVert = /* glsl */ `
uniform float uTime;
uniform float uPx;
attribute float aSeed;
varying float vA;
void main() {
  vec3 p = position;
  p.y += sin(uTime * 0.2 + aSeed * 6.28) * 0.06;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPx * (0.6 + aSeed) * (3.0 / -mv.z);
  vA = (0.35 + 0.65 * abs(sin(uTime * (0.6 + aSeed) + aSeed * 40.0))) * smoothstep(14.0, 3.0, -mv.z);
}`;
const dustFrag = /* glsl */ `
uniform vec3 uTint;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vA;
  gl_FragColor = vec4(uTint * a, a);
}`;

const floorFrag = /* glsl */ `
uniform vec3 uTint;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - 0.5) * 40.0;
  vec2 g = abs(fract(p) - 0.5);
  float line = 1.0 - smoothstep(0.0, 0.03, 0.5 - max(g.x, g.y));
  float fade = smoothstep(0.5, 0.05, length(vUv - 0.5));
  gl_FragColor = vec4(uTint * line * fade * 0.5, line * fade * 0.5);
}`;

// ------------------------------------------------------------------ pictures drawn on canvases
function canvasTex(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  draw(ctx);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** An info screen: PMG's own words, set in the hub's two faces. */
/** A roster screen with Spotify's live cover art and title. */
function liveFace(card: Card, cover: HTMLImageElement, title: string): CanvasTexture {
  const W = 800;
  const H = Math.round(W / card.aspect);
  return canvasTex(W, H, (ctx) => {
    ctx.fillStyle = '#050807';
    ctx.fillRect(0, 0, W, H);
    const s = W - 96;
    ctx.drawImage(cover, 48, 110, s, s);
    ctx.strokeStyle = 'rgba(143,233,184,0.35)';
    ctx.strokeRect(48.5, 110.5, s, s);
    ctx.fillStyle = '#8fe9b8';
    ctx.font = `400 26px ${MONO}`;
    ctx.fillText(`// ${card.code.toUpperCase()} · LIVE`, 48, 72);
    ctx.fillStyle = '#eef1ea';
    ctx.font = `900 72px ${DISPLAY}`;
    ctx.fillText(title.toUpperCase(), 48, 110 + s + 80, W - 96);
    ctx.fillStyle = 'rgba(238,241,234,0.6)';
    ctx.font = `400 22px ${MONO}`;
    ctx.fillText(card.sub.toUpperCase(), 48, 110 + s + 120, W - 96);
  });
}

function infoFace(card: Card): CanvasTexture {
  const W = 800;
  const H = Math.round(W / card.aspect);
  return canvasTex(W, H, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0d1a14');
    g.addColorStop(1, '#050807');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(143,233,184,0.12)';
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.fillStyle = '#8fe9b8';
    ctx.font = `400 26px ${MONO}`;
    ctx.fillText(`// ${card.code.toUpperCase()}`, 48, 72);
    ctx.fillStyle = '#eef1ea';
    let size = 120;
    ctx.font = `900 ${size}px ${DISPLAY}`;
    const words = card.title.toUpperCase().split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const wd of words) {
      const t = cur ? `${cur} ${wd}` : wd;
      if (ctx.measureText(t).width > W - 96 && cur) {
        lines.push(cur);
        cur = wd;
      } else cur = t;
    }
    lines.push(cur);
    while (lines.some((l) => ctx.measureText(l).width > W - 96) && size > 60) {
      size -= 6;
      ctx.font = `900 ${size}px ${DISPLAY}`;
    }
    lines.forEach((l, i) => {
      ctx.fillText(l, 48, 200 + i * size * 0.88);
    });
    ctx.font = `400 26px ${MONO}`;
    ctx.fillStyle = 'rgba(238,241,234,0.72)';
    (card.lines ?? []).forEach((l, i) => {
      ctx.fillText(l.toUpperCase(), 48, H - 60 - ((card.lines?.length ?? 0) - 1 - i) * 40, W - 96);
    });
  });
}

function labelTex(card: Card): CanvasTexture {
  return canvasTex(1024, 64, (ctx) => {
    ctx.fillStyle = '#8fe9b8';
    ctx.font = `400 30px ${MONO}`;
    ctx.fillText(`// ${card.code.toUpperCase()}`, 4, 42);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(238,241,234,0.85)';
    ctx.fillText(card.title.toUpperCase().slice(0, 30), 1020, 42);
  });
}

function bandTex(text: string): CanvasTexture {
  const t = canvasTex(2048, 64, (ctx) => {
    ctx.fillStyle = 'rgba(143,233,184,0.75)';
    ctx.font = `400 30px ${MONO}`;
    const s = `${text.toUpperCase()}  ·  `;
    let x = 0;
    while (x < 2048) {
      ctx.fillText(s, x, 44);
      x += ctx.measureText(s).width;
    }
  });
  t.wrapS = RepeatWrapping;
  return t;
}

/** A curved screen: bent around the tower, with its flat shape kept for flying it to full size. */
function screenGeometry(w: number, h: number): BufferGeometry {
  const seg = 32;
  const flat = new PlaneGeometry(w, h, seg, 1);
  const pos = flat.attributes.position;
  const curved = new Float32Array(pos.count * 3);
  const normals = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const a = x / RING_R;
    curved[i * 3] = RING_R * Math.sin(a);
    curved[i * 3 + 1] = pos.getY(i);
    curved[i * 3 + 2] = RING_R * (Math.cos(a) - 1);
    normals[i * 3] = Math.sin(a);
    normals[i * 3 + 1] = 0;
    normals[i * 3 + 2] = Math.cos(a);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(curved, 3));
  g.setAttribute('normal', new BufferAttribute(normals, 3));
  g.setAttribute('aFlat', new BufferAttribute(new Float32Array(pos.array), 3));
  g.setAttribute('uv', flat.attributes.uv);
  g.setIndex(flat.index);
  return g;
}

export interface HubWorld {
  renderer: WebGLRenderer;
  css: CSS3DRenderer;
  setSize(w: number, h: number, dpr: number): void;
  apply(pose: Pose, pointer: [number, number], zoneFocus: number, cardFocus?: number): void;
  /** How much of the shade kept behind words to draw over the Earth: 1 where words are, 0 where none are. */
  setShade(k: number): void;
  /** Advances hover and opening; returns true while something is still moving. */
  step(dt: number, time: number): boolean;
  render(): void;
  warm(): Promise<void>;
  pick(x: number, y: number): number;
  setHover(i: number): void;
  open(i: number, play: boolean): void;
  close(): void;
  stop(): void;
  openIndex(): number;
  playingIndex(): number;
  /** For the checks: each ring loop's state. */
  loops(): { asked: boolean; from: 'memory' | 'address' | 'none'; paused: boolean; time: number; failed: boolean }[];
  playingNeedsFrames(): boolean;
  /** Films step frames slower than real time: the ring loops then follow the hub's clock (paused
   *  and seeked to it) instead of the wall clock, so they play at true speed in the film. */
  filmVideos(on: boolean): void;
  /** While filming: true once every loop in view shows the frame for the current clock. */
  videosSettled(): boolean;
  /** Room to keep clear around an opened screen, in CSS pixels from each edge; null for the default fit. */
  setOpenBox(box: { left: number; top: number; right: number; bottom: number } | null): void;
  setMuted(m: boolean): void;
  /** Fetches the roster's live titles and cover art from Spotify's public oEmbed; resolves with what changed. */
  liveRoster(): Promise<{ id: string; title: string }[]>;
  /** Redraws one screen's face and label after its card's words changed (live data). */
  setCard(i: number, card: Card): void;
  /** Frees the GPU, stops every video and removes the players. The world is dead after this. */
  dispose(): void;
  /** Puts the live Earth behind the hub; the still of the same view shows until it is in focus. */
  attachEarth(layer: EarthLayer): void;
  /** 'still' (poster only), 'loading' or 'live' (the live Earth fully showing). */
  earthState(): string;
  /** Draws the live Earth alone at the current pose and returns it as a PNG data URL (for the stills). */
  earthStill(): string | null;
  screenRect(i: number): Rect | null;
  logoRect(): Rect | null;
  frames(): number;
  /** Measuring only: sample the brightness of a patch at screen point `at` after every frame. */
  probe(at: [number, number] | null): void;
  probeLog(): number[];
  gpu(): string;
}

export async function createWorld(
  canvas: HTMLCanvasElement,
  cssHost: HTMLElement,
  tower: Tower,
  root: string,
  opts: {
    bloom: boolean;
    onProgress?: (done: number, total: number) => void;
    /** A reel was muted or unmuted, by the visitor or by the browser (sound refused before a tap). */
    onMuted?: (muted: boolean) => void;
  },
): Promise<HubWorld> {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.setClearColor(GROUND, 1);
  const scene = new Scene();
  scene.background = GROUND.clone();
  const camera = new PerspectiveCamera(36, 1, 0.05, 60);

  const css = new CSS3DRenderer();
  cssHost.append(css.domElement);
  const cssScene = new Scene();

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // Safety net before the bloom: a single NaN pixel from any shader would be blurred across the
  // whole frame and black it out for that frame. Zero it here instead.
  composer.addPass(
    new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader:
        'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); gl_FragColor = (any(isnan(c)) || any(isinf(c))) ? vec4(0.0, 0.0, 0.0, 1.0) : c; }',
    }),
  );
  const bloom = new UnrealBloomPass(new Vector2(256, 256), 0.55, 0.55, 0.72);
  if (opts.bloom) composer.addPass(bloom);
  const lens = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uRes: { value: new Vector2(1, 1) },
      uTime: { value: 0 },
    },
    vertexShader:
      'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: lensFrag,
  });
  composer.addPass(lens);
  composer.addPass(new OutputPass());

  // ------------------------------------------------------------------ the Earth behind everything
  // A full-screen quad at the far plane, drawn first. It shows a still of the Earthlight view
  // (cover-fitted) and cross-fades to the live canvas once that is drawing and in focus.
  const earthMat = new ShaderMaterial({
    uniforms: {
      tPoster: { value: null },
      tLive: { value: null },
      uHasPoster: { value: 0 },
      uMix: { value: 0 },
      uCover: { value: new Vector2(1, 1) },
      uGround: { value: GROUND.clone() },
      uGain: { value: 0.92 },
      // Quiet the Earth behind the words: x the words' right edge, y where the dimming is full,
      // z where it starts (UV, y up), w how much.
      uShade: { value: new Vector4(0.48, 0.3, 0.46, 0.62) },
      uShadeK: { value: 1 },
      // Parallax for the far-away Earth: the picture is drawn EARTH_ZOOM oversized and slides
      // within that margin, so Earthlight's camera stays parked and streams no new tiles.
      uShift: { value: new Vector2(0, 0) },
      uZoom: { value: EARTH_ZOOM },
    },
    vertexShader:
      'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform sampler2D tPoster;
      uniform sampler2D tLive;
      uniform float uHasPoster;
      uniform float uMix;
      uniform vec2 uCover;
      uniform vec3 uGround;
      uniform float uGain;
      uniform vec4 uShade;
      uniform float uShadeK;
      uniform vec2 uShift;
      uniform float uZoom;
      varying vec2 vUv;
      void main() {
        vec2 uv = ((vUv - 0.5) / uZoom + uShift) * uCover + 0.5;
        vec3 poster = mix(uGround, texture2D(tPoster, uv).rgb, uHasPoster);
        vec3 live = uMix > 0.0 ? texture2D(tLive, uv).rgb : poster;
        float shade = uShade.w * uShadeK * smoothstep(uShade.z, uShade.y, vUv.y)
          * smoothstep(uShade.x + 0.14, uShade.x - 0.04, vUv.x);
        gl_FragColor = vec4(mix(poster, live, uMix) * uGain * (1.0 - shade), 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const earthQuad = new Mesh(new PlaneGeometry(2, 2), earthMat);
  earthQuad.frustumCulled = false;
  earthQuad.renderOrder = -1000;
  scene.add(earthQuad);
  const posters: Record<'wide' | 'tall', Texture | null> = { wide: null, tall: null };
  let earth: EarthLayer | null = null;
  let earthTex: CanvasTexture | null = null;
  let earthSize = '';
  let earthMix = 0;

  let earthDrawnAt = -1;
  /** Hub time when the live Earth finished fading in: its turn (and its clouds) start there,
   *  so the still and the live Earth never blend two different views. */
  let earthStart = -1;
  let timeNow = 0;
  const fitShade = () => {
    // Wide screens keep the words bottom left; one column (narrow or portrait) runs them across.
    const column = width < 900 || width / height2 < 1;
    (earthMat.uniforms.uShade.value as Vector4).set(
      ...((column ? [1.3, 0.36, 0.56, 0.5] : [0.48, 0.3, 0.46, 0.62]) as [
        number,
        number,
        number,
        number,
      ]),
    );
  };
  const fitPoster = () => {
    // The still and the live Earth share one fixed shape per kind (see ./earth.ts), so one
    // cover-fit serves both and they line up at every screen size.
    const kind = earthKind(width, height2);
    const tex = posters[kind];
    earthMat.uniforms.tPoster.value = tex;
    earthMat.uniforms.uHasPoster.value = tex ? 1 : 0;
    // Cover: scale UVs down along the axis where the picture is wider than the screen.
    const screen = width / height2;
    const picture = EARTH_ASPECT[kind];
    earthMat.uniforms.uCover.value.set(
      screen < picture ? screen / picture : 1,
      screen < picture ? 1 : picture / screen,
    );
  };

  const urlOf = (u: string) => (/^(?:[a-z]+:|\/)/i.test(u) ? u : root + u);
  const loader = new TextureLoader();
  // Every picture counts towards the loader, whether it arrives or fails.
  let asked = 0;
  let settled = 0;
  const load = (url: string) => {
    asked += 1;
    const done = () => {
      settled += 1;
      opts.onProgress?.(settled, asked);
    };
    return loader.loadAsync(urlOf(url)).then(
      (t) => {
        done();
        t.colorSpace = SRGBColorSpace;
        t.anisotropy = 8;
        t.generateMipmaps = true;
        return t;
      },
      (err) => {
        done();
        throw err;
      },
    );
  };
  await Promise.all(
    (['wide', 'tall'] as const).map((k) =>
      load(`hub/earth/nyc-${k}.webp`)
        .then((t) => {
          posters[k] = t;
        })
        .catch(() => {}),
    ),
  );

  // ------------------------------------------------------------------ the light column, rings, dust, floor
  const top = tower.zoneY[0] + 3;
  const height = top - tower.bottom;
  const beamMat = new MeshBasicMaterial({
    color: MINT,
    transparent: true,
    opacity: 0.85,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const beam = new Mesh(new CylinderGeometry(0.01, 0.01, height, 8, 1, true), beamMat);
  beam.position.y = tower.bottom + height / 2;
  const glow = new Mesh(
    new CylinderGeometry(0.11, 0.11, height, 16, 1, true),
    new MeshBasicMaterial({
      color: MINT,
      transparent: true,
      opacity: 0.05,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.position.copy(beam.position);
  // The kinetic column stands where the light column was; the light stays only as a faint core.
  glow.visible = false;
  beam.visible = false;
  scene.add(beam, glow);

  const ringMat = new LineBasicMaterial({
    color: MINT,
    transparent: true,
    opacity: 0.55,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const tickMat = new LineBasicMaterial({
    color: MINT,
    transparent: true,
    opacity: 0.35,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  ZONES.forEach((zone, k) => {
    const y = tower.zoneY[k] - 0.72;
    const pts: number[] = [];
    for (let i = 0; i < 256; i += 1) {
      const a = (i / 256) * Math.PI * 2;
      pts.push((RING_R + 0.05) * Math.sin(a), y, (RING_R + 0.05) * Math.cos(a));
    }
    const ringGeo = new BufferGeometry();
    ringGeo.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
    scene.add(new LineLoop(ringGeo, ringMat));
    const ticks: number[] = [];
    for (let i = 0; i < 144; i += 1) {
      const a = (i / 144) * Math.PI * 2;
      const len = i % 6 === 0 ? 0.08 : 0.03;
      const r = RING_R + 0.05;
      ticks.push(r * Math.sin(a), y, r * Math.cos(a), r * Math.sin(a), y - len, r * Math.cos(a));
    }
    const tickGeo = new BufferGeometry();
    tickGeo.setAttribute('position', new BufferAttribute(new Float32Array(ticks), 3));
    scene.add(new LineSegments(tickGeo, tickMat));
    const band = bandTex(`${zone.label} · PMG`);
    band.repeat.x = 3;
    const bandMesh = new Mesh(
      new CylinderGeometry(RING_R + 0.22, RING_R + 0.22, 0.07, 160, 1, true),
      new MeshBasicMaterial({
        map: band,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        opacity: 0.8,
      }),
    );
    bandMesh.position.y = y - 0.17;
    scene.add(bandMesh);
  });

  const dustN = 1800;
  const dustPos = new Float32Array(dustN * 3);
  const dustSeed = new Float32Array(dustN);
  let s = 12345;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < dustN; i += 1) {
    const a = rnd() * Math.PI * 2;
    const r = 1 + rnd() * 7;
    dustPos[i * 3] = r * Math.sin(a);
    dustPos[i * 3 + 1] = tower.bottom - 1 + rnd() * (height + 2);
    dustPos[i * 3 + 2] = r * Math.cos(a);
    dustSeed[i] = rnd();
  }
  const dustGeo = new BufferGeometry();
  dustGeo.setAttribute('position', new BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('aSeed', new BufferAttribute(dustSeed, 1));
  const dustMat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPx: { value: 3 }, uTint: { value: MINT } },
    vertexShader: dustVert,
    fragmentShader: dustFrag,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  scene.add(new Points(dustGeo, dustMat));

  const floor = new Mesh(
    new PlaneGeometry(40, 40),
    new ShaderMaterial({
      uniforms: { uTint: { value: MINT } },
      vertexShader:
        'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: floorFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = tower.bottom - 0.6;
  scene.add(floor);

  // ------------------------------------------------------------------ the PMG logo, extruded
  const shapes = logoShape.shapes.map((sh) => {
    const shape = new Shape(sh.outer.map(([x, y]) => new Vector2(x, -y)));
    for (const h of sh.holes) shape.holes.push(new Shape(h.map(([x, y]) => new Vector2(x, -y))));
    return shape;
  });
  const logoGeo = new ExtrudeGeometry(shapes, {
    depth: 26,
    bevelEnabled: true,
    bevelThickness: 5,
    bevelSize: 2.4,
    bevelSegments: 3,
    curveSegments: 1,
  });
  logoGeo.center();
  const logoMat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uTint: { value: MINT } },
    vertexShader: logoVert,
    fragmentShader: logoFrag,
  });
  const logo = new Mesh(logoGeo, logoMat);
  const logoScale = 2.9 / logoShape.width;
  logo.scale.setScalar(logoScale);
  const logoPivot = new Group();
  logoPivot.position.y = tower.zoneY[0] + 0.25;
  logoPivot.add(logo);
  scene.add(logoPivot);

  // ------------------------------------------------------------------ the screens
  const screens: Screen[] = [];
  const holder = new Group();
  scene.add(holder);
  await Promise.all(
    tower.slots.map(async (slot) => {
      const card = slot.card;
      const m = card.media;
      const poster =
        'poster' in m && m.poster
          ? await load(m.poster).catch(() => infoFace(card))
          : infoFace(card);
      const mat = new ShaderMaterial({
        uniforms: {
          uMap: { value: poster },
          uTime: { value: 0 },
          uHover: { value: 0 },
          uOpen: { value: 0 },
          uFlat: { value: 0 },
          uReady: { value: 1 },
          uDim: { value: 1 },
          uAspect: { value: slot.w / slot.h },
          uTint: { value: MINT },
        },
        vertexShader: cardVert,
        fragmentShader: cardFrag,
        transparent: true,
        side: DoubleSide,
        depthWrite: true,
      });
      const mesh = new Mesh(screenGeometry(slot.w, slot.h), mat);
      mesh.userData.screen = screens.length;
      const group = new Group();
      group.add(mesh);
      const label = new Mesh(
        new PlaneGeometry(slot.w, slot.w / 16),
        new MeshBasicMaterial({
          map: labelTex(card),
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      );
      label.position.set(0, slot.h / 2 + 0.06, 0.01);
      group.add(label);
      const sc: Screen = { slot, group, mesh, mat, label, poster, hover: 0, hoverTarget: 0 };
      if (m.kind === 'reel' && m.loop) {
        const v = document.createElement('video');
        // No address yet: its file is fetched the first time its ring comes near (feedLoop).
        sc.loopUrl = urlOf(m.loop);
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.preload = 'none';
        v.crossOrigin = 'anonymous';
        sc.loop = v;
        sc.loopTex = new VideoTexture(v);
        sc.loopTex.colorSpace = SRGBColorSpace;
        sc.loopTex.minFilter = LinearFilter;
        v.addEventListener('playing', () => {
          if (playing !== screens.indexOf(sc)) mat.uniforms.uMap.value = sc.loopTex;
        });
      }
      screens[tower.slots.indexOf(slot)] = sc;
    }),
  );
  screens.forEach((sc, i) => {
    sc.mesh.userData.screen = i;
    holder.add(sc.group);
  });

  // ------------------------------------------------------------------ the kinetic image column
  const pictures = screens
    .filter(
      (sc) => 'poster' in sc.slot.card.media && sc.slot.card.media.poster && sc.slot.zone !== 3,
    )
    .map((sc) => sc.poster.image as HTMLImageElement);
  const kinetic = createKinetic(pictures, {
    top: tower.zoneY[0] - 0.42,
    bottom: tower.bottom + 0.3,
    radius: 0.85,
    accent: '#8fe9b8',
  });
  scene.add(kinetic.group);
  let scrollProxy = 0;
  let columnTarget = 1;
  let columnLevel = 1;

  // ------------------------------------------------------------------ state
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  let width = 1;
  let height2 = 1;
  let drawn = 0;
  let hovered = -1;
  let opened = -1;
  let filmVideo = false;
  /** Room kept clear around an opened screen, in CSS pixels from each edge (null: the default fit). */
  let openBox: { left: number; top: number; right: number; bottom: number } | null = null;
  let gone = false;
  /** Whether the reels are muted. Kept from one reel to the next. */
  let mutedPref = false;
  /**
   * Hands a ring loop its file. The loops ship with the site, and the site's host answers a
   * request for part of a file with the whole file. iPhone browsers are documented to need
   * partial answers before they play a video from an address. So each loop is downloaded whole,
   * once, the first time its ring comes near, and played from memory, which every browser
   * accepts. If the download fails, the poster stays.
   */
  function feedLoop(sc: Screen) {
    const v = sc.loop;
    if (!v || !sc.loopUrl || sc.loopAsked) return;
    sc.loopAsked = true;
    fetch(sc.loopUrl)
      .then((r) => {
        if (!r.ok || !(r.headers.get('content-type') ?? '').startsWith('video/'))
          throw new Error(`loop ${r.status}`);
        return r.arrayBuffer();
      })
      .then((file) => {
        if (!gone) v.src = URL.createObjectURL(new Blob([file], { type: 'video/mp4' }));
      })
      .catch(() => {});
  }
  let openT = 0;
  let openTarget = 0;
  let closing = -1;
  let playing = -1;
  let full: HTMLVideoElement | null = null;
  let fullTex: VideoTexture | null = null;
  let cssObj: CSS3DObject | null = null;
  let cssOffsetY = 0;
  let zoneNow = 0;
  const tmpV = new Vector3();
  const tmpQ = new Quaternion();
  const slotPos = new Vector3();
  const slotQ = new Quaternion();
  const up = new Vector3(0, 1, 0);

  function placeSlot(sc: Screen, pop: number) {
    const a = sc.slot.angle;
    const r = RING_R + pop * 0.22;
    slotPos.set(r * Math.sin(a), sc.slot.y, r * Math.cos(a));
    slotQ.setFromAxisAngle(up, a);
  }

  let shadeK = 1;
  let shadeTarget = 1;
  function setShade(k: number) {
    shadeTarget = k;
  }
  function apply(pose: Pose, pointer: [number, number], zoneFocus: number, cardFocus = 0) {
    columnTarget = 1 - 0.62 * cardFocus;
    zoneNow = zoneFocus;
    const { cam, look } = poseToWorld(pose);
    camera.fov = pose.fov;
    camera.aspect = width / height2;
    camera.position.set(...cam);
    camera.lookAt(...look);
    camera.updateMatrixWorld();
    tmpV
      .set(1, 0, 0)
      .applyQuaternion(camera.quaternion)
      .multiplyScalar(pointer[0] * 0.08);
    camera.position.add(tmpV);
    tmpV
      .set(0, 1, 0)
      .applyQuaternion(camera.quaternion)
      .multiplyScalar(-pointer[1] * 0.05);
    camera.position.add(tmpV);
    camera.lookAt(...look);
    const fx = opened >= 0 ? 0.5 + (pose.frame[0] - 0.5) * (1 - openT) : pose.frame[0];
    const fy = opened >= 0 ? 0.5 + (pose.frame[1] - 0.5) * (1 - openT) : pose.frame[1];
    camera.setViewOffset(
      width,
      height2,
      -(fx - 0.5) * width,
      -(fy - 0.5) * height2,
      width,
      height2,
    );
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    scrollProxy = pose.theta;
    // The Earth is far away: as the camera descends the tower it looks a little further down,
    // so the planet rises into the frame, with a touch of the pointer. Where it sits at the top
    // is set in ./earth.ts.
    const depth = Math.min(
      1,
      Math.max(0, (tower.zoneY[0] + 1 - pose.y) / (tower.zoneY[0] + 1 - tower.bottom)),
    );
    // Looking further down as the camera descends lifts the planet; the pointer nudges it.
    // Shifts stay inside the oversize margin: (1 - 1 / EARTH_ZOOM) / 2 on each side.
    const margin = (1 - 1 / EARTH_ZOOM) / 2;
    (earthMat.uniforms.uShift.value as Vector2).set(
      Math.max(-margin, Math.min(margin, -pointer[0] * 0.01)),
      Math.max(
        -margin,
        Math.min(margin, -(depth * 2 - 1) * margin * 0.85 * EARTH_TILT + pointer[1] * 0.008),
      ),
    );
    logoPivot.rotation.y = -0.25 + pose.theta * 0.18 + pointer[0] * 0.12;
    logoPivot.rotation.x = 0.06 + pointer[1] * 0.06;
    logoPivot.rotation.z = 0.04;
  }

  /** Pose of a screen flown up to fill the view, in front of the camera. */
  function openPose(sc: Screen) {
    const t = 2 * Math.tan(((camera.fov / 2) * Math.PI) / 180);
    // The room the screen may fill, as parts of the view. With a box set (wide windows), it is
    // the room beside the title panel and under the Back button, so neither covers a player.
    const b = openBox;
    const fw = b ? Math.max(0.2, 1 - (b.left + b.right) / width) : 0.9;
    const fh = b ? Math.max(0.2, 1 - (b.top + b.bottom) / height2) : 0.84;
    const d = Math.max(sc.slot.h / (fh * t), sc.slot.w / (fw * t * camera.aspect));
    const cx = b ? (b.left - b.right) / 2 / width : 0;
    const cy = b ? (b.bottom - b.top) / 2 / height2 : 0;
    tmpV
      .set(cx * t * camera.aspect * d, cy * t * d, -d)
      .applyQuaternion(camera.quaternion)
      .add(camera.position);
    tmpQ.copy(camera.quaternion);
  }

  function step(dt: number, time: number): boolean {
    let moving = false;
    shadeK += (shadeTarget - shadeK) * (1 - Math.exp(-dt * 4));
    if (Math.abs(shadeTarget - shadeK) > 0.002) moving = true;
    else shadeK = shadeTarget;
    earthMat.uniforms.uShadeK.value = shadeK;
    const k = 1 - Math.exp(-dt * 10);
    screens.forEach((sc, i) => {
      sc.hoverTarget = i === hovered && opened < 0 ? 1 : 0;
      sc.hover += (sc.hoverTarget - sc.hover) * k;
      if (Math.abs(sc.hover - sc.hoverTarget) > 0.002) moving = true;
      const near = Math.abs(sc.slot.zone - zoneNow);
      sc.mat.uniforms.uDim.value = near < 0.5 ? 1 : near < 1.5 ? 0.55 : 0.3;
      sc.mat.uniforms.uHover.value = sc.hover;
      sc.mat.uniforms.uTime.value = time;
      // Loops play only near their ring.
      if (sc.loop && i !== playing) {
        const want = near < 0.75;
        if (filmVideo) {
          const v = sc.loop;
          sc.filmT = undefined;
          if (want) {
            feedLoop(sc);
            if (!v.paused) v.pause();
            if (v.preload !== 'auto') {
              v.preload = 'auto';
              v.load();
            }
            const d = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
            if (d && v.readyState >= 1) {
              sc.filmT = time % d;
              if (Math.abs(v.currentTime - sc.filmT) > 0.002 && !v.seeking)
                v.currentTime = sc.filmT;
            }
          }
        } else {
          if (want) feedLoop(sc);
          if (want && sc.loop.src && sc.loop.paused) sc.loop.play().catch(() => {});
          if (!want && !sc.loop.paused) sc.loop.pause();
        }
      }
    });
    const ko = 1 - Math.exp(-dt * 6.5);
    openT += (openTarget - openT) * ko;
    if (Math.abs(openT - openTarget) > 0.001) moving = true;
    else openT = openTarget;
    if (openT === 0 && closing >= 0) closing = -1;
    screens.forEach((sc, i) => {
      placeSlot(sc, sc.hover);
      const active = i === opened || i === closing;
      if (active && openT > 0) {
        openPose(sc);
        sc.group.position.lerpVectors(slotPos, tmpV, openT);
        sc.group.quaternion.slerpQuaternions(slotQ, tmpQ, openT);
        sc.mat.uniforms.uOpen.value = openT;
        sc.mat.uniforms.uFlat.value = openT;
        sc.group.renderOrder = 10;
        sc.mat.depthTest = openT < 0.5;
        sc.label.visible = openT < 0.5;
      } else {
        sc.group.position.copy(slotPos);
        sc.group.quaternion.copy(slotQ);
        sc.mat.uniforms.uOpen.value = 0;
        sc.mat.uniforms.uFlat.value = 0;
        sc.group.renderOrder = 0;
        sc.mat.depthTest = true;
        sc.label.visible = true;
      }
    });
    if (cssObj && playing >= 0) {
      const sc = screens[playing];
      sc.group.updateMatrixWorld();
      cssObj.position
        .copy(sc.group.position)
        .add(tmpV.set(0, cssOffsetY, 0.004).applyQuaternion(sc.group.quaternion));
      cssObj.quaternion.copy(sc.group.quaternion);
      // The player shows only while its screen is open. Closed, it keeps playing (sound and the
      // now-playing chip) but leaves no window hanging in the hub.
      const show = playing === opened && openT > 0.6;
      cssObj.element.style.opacity = show ? '1' : '0';
      cssObj.element.style.pointerEvents = show ? 'auto' : 'none';
    }
    columnLevel += (columnTarget - columnLevel) * (1 - Math.exp(-dt * 5));
    kinetic.setLevel(columnLevel);
    kinetic.update(scrollProxy, time);
    logoMat.uniforms.uTime.value = time;
    dustMat.uniforms.uTime.value = time;
    lens.uniforms.uTime.value = time;
    timeNow = time;
    const earthTarget = earth?.live() && earth.focus() < 0.5 ? 1 : 0;
    if (earthMix !== earthTarget) {
      earthMix +=
        Math.sign(earthTarget - earthMix) * Math.min(Math.abs(earthTarget - earthMix), dt / 1.4);
      moving = true;
    }
    earthMat.uniforms.uMix.value = earthMix * earthMix * (3 - 2 * earthMix);
    return moving;
  }

  /** One live Earth frame at most EARTH_FPS times a second of wall time (a film stepping frame by
   *  frame still repaints it every frame); copied into the texture on draw. The Earth's own motion
   *  is slow (a quarter degree a second of turn, drifting clouds), and scrolling only slides the
   *  finished picture in this scene's shader, so a low rate looks the same and costs a third:
   *  in Asad's Chrome (2009x1052 at 1.8x) the live Earth at ~31 a second halved scrolling,
   *  94 fps with its still against 48 live (2026-11-18). */
  function paintEarth() {
    if (!earth || earth.failed() || !earthTex) return;
    const wall = performance.now();
    if (earthDrawnAt >= 0 && wall - earthDrawnAt < 1000 / EARTH_FPS) return;
    if (earthMix >= 1 && earthStart < 0) earthStart = timeNow;
    if (!earth.paint(earthStart < 0 ? 0 : timeNow - earthStart, 0, 0)) return;
    earthDrawnAt = wall;
    const size = `${earth.canvas.width}x${earth.canvas.height}`;
    // A resized source needs fresh texture storage.
    if (size !== earthSize) {
      earthTex.dispose();
      earthSize = size;
    }
    earthTex.needsUpdate = true;
    if (earthMix > 0) earthMat.uniforms.tLive.value = earthTex;
  }

  function render() {
    paintEarth();
    composer.render();
    css.render(cssScene, camera);
    drawn += 1;
    if (probeAt) sampleProbe(probeAt);
  }

  // A flicker probe for measuring (?probe=x,y in screen fractions): after each frame, the mean
  // brightness of a 24-pixel patch, read back in the same task before the frame is composited.
  // It stalls the GPU a little, so it is only ever on while measuring.
  let probeAt: [number, number] | null = null;
  const probeLog: number[] = [];
  const probePx = new Uint8Array(24 * 24 * 4);
  function sampleProbe([fx, fy]: [number, number]) {
    const gl = renderer.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const x = Math.max(0, Math.min(w - 24, Math.round(fx * w) - 12));
    const y = Math.max(0, Math.min(h - 24, Math.round((1 - fy) * h) - 12));
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(x, y, 24, 24, gl.RGBA, gl.UNSIGNED_BYTE, probePx);
    let sum = 0;
    for (let i = 0; i < probePx.length; i += 4)
      sum += 0.2126 * probePx[i] + 0.7152 * probePx[i + 1] + 0.0722 * probePx[i + 2];
    probeLog.push(sum / (probePx.length / 4));
    if (probeLog.length > 4000) probeLog.shift();
  }

  function setSize(w: number, h: number, dpr: number) {
    width = w;
    height2 = h;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    lens.uniforms.uRes.value.set(w * dpr, h * dpr);
    css.setSize(w, h);
    dustMat.uniforms.uPx.value = 3 * dpr;
    fitPoster();
    fitShade();
  }

  async function warm() {
    uploadAll(renderer, scene);
    if ('compileAsync' in renderer) await renderer.compileAsync(scene, camera);
    composer.render();
  }

  function pick(x: number, y: number): number {
    ndc.set((x / width) * 2 - 1, -(y / height2) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(
      screens.map((s) => s.mesh),
      false,
    );
    for (const h of hits) {
      const i = h.object.userData.screen as number;
      const sc = screens[i];
      // Only the side of the ring that faces you can be picked.
      const n = new Vector3(0, 0, 1).applyQuaternion(sc.group.quaternion);
      if (n.dot(tmpV.subVectors(camera.position, sc.group.position)) > 0) return i;
    }
    return -1;
  }

  function clearMedia() {
    if (full) {
      full.pause();
      full.removeAttribute('src');
      full.load();
      full = null;
    }
    fullTex?.dispose();
    fullTex = null;
    if (cssObj) {
      cssScene.remove(cssObj);
      cssObj.element.remove();
      cssObj = null;
    }
    if (playing >= 0) {
      const sc = screens[playing];
      sc.mat.uniforms.uMap.value = sc.loop && !sc.loop.paused ? sc.loopTex : sc.poster;
    }
    playing = -1;
  }

  function open(i: number, play: boolean) {
    if (opened >= 0 && opened !== i) closing = opened;
    opened = i;
    openTarget = 1;
    hovered = -1;
    if (!play) return;
    const sc = screens[i];
    const m = sc.slot.card.media;
    if (playing === i) return;
    if (m.kind === 'info') return;
    clearMedia();
    playing = i;
    if (m.kind === 'reel') {
      full = document.createElement('video');
      full.src = urlOf(m.full);
      full.playsInline = true;
      full.crossOrigin = 'anonymous';
      full.loop = true;
      full.muted = mutedPref;
      const reel = full;
      reel.addEventListener('volumechange', () => {
        if (full !== reel) return;
        mutedPref = reel.muted;
        opts.onMuted?.(reel.muted);
      });
      fullTex = new VideoTexture(full);
      fullTex.colorSpace = SRGBColorSpace;
      full.addEventListener('playing', () => {
        if (fullTex && playing === i) sc.mat.uniforms.uMap.value = fullTex;
      });
      full.play().catch(() => {
        if (full) {
          full.muted = true;
          full.play().catch(() => {});
        }
      });
    } else {
      // Spotify: its compact player, a bar along the bottom of the screen. YouTube: a 16:9 window
      // in the middle of the screen. Never a tall box with empty space under the player.
      const pxW = 1280;
      const pxH = m.kind === 'spotify' ? 152 : 720;
      const worldH = (sc.slot.w * pxH) / pxW;
      cssOffsetY = m.kind === 'spotify' ? -sc.slot.h / 2 + worldH / 2 + sc.slot.w * 0.03 : 0;
      const box = document.createElement('div');
      box.className = 'holo-frame';
      box.style.width = `${pxW}px`;
      box.style.height = `${pxH}px`;
      const frame = document.createElement('iframe');
      frame.src =
        m.kind === 'youtube'
          ? `https://www.youtube-nocookie.com/embed/${m.id}?autoplay=1&rel=0`
          : m.embed;
      frame.title = `${sc.slot.card.title} — ${sc.slot.card.sub}`;
      frame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      frame.allowFullscreen = true;
      box.append(frame);
      cssObj = new CSS3DObject(box);
      cssObj.scale.setScalar(sc.slot.w / pxW);
      cssScene.add(cssObj);
    }
  }

  function close() {
    if (opened < 0) return;
    closing = opened;
    opened = -1;
    openTarget = 0;
  }

  function screenRect(i: number): Rect | null {
    const sc = screens[i];
    if (!sc) return null;
    sc.group.updateMatrixWorld(true);
    const pos = sc.mesh.geometry.attributes.position;
    const r = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    for (const idx of [0, 32, pos.count - 33, pos.count - 1, 16, pos.count - 17]) {
      tmpV.fromBufferAttribute(pos, idx).applyMatrix4(sc.mesh.matrixWorld).project(camera);
      if (tmpV.z > 1) return null;
      const sx = ((tmpV.x + 1) / 2) * width;
      const sy = ((1 - tmpV.y) / 2) * height2;
      r.left = Math.min(r.left, sx);
      r.right = Math.max(r.right, sx);
      r.top = Math.min(r.top, sy);
      r.bottom = Math.max(r.bottom, sy);
    }
    return r;
  }

  function logoRect(): Rect | null {
    logoGeo.computeBoundingBox();
    const b = logoGeo.boundingBox;
    if (!b) return null;
    logo.updateMatrixWorld(true);
    const r = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    for (const x of [b.min.x, b.max.x])
      for (const y of [b.min.y, b.max.y])
        for (const z of [b.min.z, b.max.z]) {
          tmpV.set(x, y, z).applyMatrix4(logo.matrixWorld).project(camera);
          const sx = ((tmpV.x + 1) / 2) * width;
          const sy = ((1 - tmpV.y) / 2) * height2;
          r.left = Math.min(r.left, sx);
          r.right = Math.max(r.right, sx);
          r.top = Math.min(r.top, sy);
          r.bottom = Math.max(r.bottom, sy);
        }
    return r;
  }

  return {
    renderer,
    css,
    setSize,
    apply,
    setShade,
    step,
    render,
    warm,
    pick,
    setHover: (i) => {
      hovered = i;
    },
    open,
    close,
    stop: () => {
      clearMedia();
    },
    openIndex: () => opened,
    playingIndex: () => playing,
    loops: () =>
      screens.flatMap((sc) =>
        sc.loop
          ? [
              {
                asked: Boolean(sc.loopAsked),
                from: sc.loop.src.startsWith('blob:') ? ('memory' as const) : sc.loop.src ? ('address' as const) : ('none' as const),
                paused: sc.loop.paused,
                time: sc.loop.currentTime,
                failed: Boolean(sc.loop.error),
              },
            ]
          : [],
      ),
    filmVideos(on) {
      filmVideo = on;
      if (!on) return;
      for (const sc of screens) {
        const v = sc.loop;
        const tex = sc.loopTex;
        if (!v || !tex) continue;
        v.addEventListener('seeked', () => {
          tex.needsUpdate = true;
          if (playing !== screens.indexOf(sc)) sc.mat.uniforms.uMap.value = tex;
        });
      }
    },
    videosSettled: () =>
      screens.every((sc) => {
        const v = sc.loop;
        if (!v || sc.filmT === undefined) return true;
        return !v.seeking && v.readyState >= 2 && Math.abs(v.currentTime - sc.filmT) <= 0.002;
      }),
    playingNeedsFrames: () =>
      playing >= 0 ||
      screens.some((sc) => sc.loop && !sc.loop.paused && Math.abs(sc.slot.zone - zoneNow) < 0.75),
    async liveRoster() {
      const changed: { id: string; title: string }[] = [];
      await Promise.all(
        screens.map(async (sc) => {
          const m = sc.slot.card.media;
          if (m.kind !== 'spotify') return;
          const found = /embed\/(track|playlist|artist)\/([A-Za-z0-9]+)/.exec(m.embed);
          if (!found) return;
          try {
            const res = await fetch(
              `https://open.spotify.com/oembed?url=https://open.spotify.com/${found[1]}/${found[2]}`,
            );
            if (!res.ok) return;
            const data = (await res.json()) as { title?: string; thumbnail_url?: string };
            if (!data.thumbnail_url || !data.title) return;
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = data.thumbnail_url;
            await img.decode();
            // Only the roster's playlist and artist cards are named after their Spotify entity. A
            // track embed's title is a song (the artist cards play a track), and other parts use
            // Spotify for a call to action ("Hear it all"), so those keep their own words.
            const named = found[1] !== 'track' && ZONES[sc.slot.zone]?.id === 'roster';
            const title = named ? data.title.trim() : sc.slot.card.title;
            const tex = liveFace(sc.slot.card, img, title);
            renderer.initTexture(tex);
            sc.poster = tex;
            if (playing !== screens.indexOf(sc)) sc.mat.uniforms.uMap.value = tex;
            if (named) changed.push({ id: sc.slot.card.id, title });
          } catch {
            // Offline or blocked: the screen keeps the face it has.
          }
        }),
      );
      return changed;
    },
    setOpenBox: (box) => {
      openBox = box;
    },
    setMuted: (m) => {
      mutedPref = m;
      if (full) full.muted = m;
    },
    setCard(i, card) {
      const sc = screens[i];
      if (!sc) return;
      sc.slot.card = card;
      const label = sc.label.material as MeshBasicMaterial;
      label.map?.dispose();
      label.map = labelTex(card);
      if (card.media.kind !== 'info') return;
      const face = infoFace(card);
      renderer.initTexture(face);
      const old = sc.poster;
      sc.poster = face;
      if (playing !== i) sc.mat.uniforms.uMap.value = face;
      old.dispose();
    },
    dispose() {
      gone = true;
      clearMedia();
      for (const sc of screens) {
        if (!sc.loop) continue;
        sc.loop.pause();
        if (sc.loop.src.startsWith('blob:')) URL.revokeObjectURL(sc.loop.src);
        sc.loop.removeAttribute('src');
        sc.loop.load();
      }
      scene.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) {
          const uniforms = (mat as ShaderMaterial).uniforms ?? {};
          for (const u of Object.values(uniforms)) {
            const v = u.value as { isTexture?: boolean; dispose?: () => void } | null;
            if (v?.isTexture) v.dispose?.();
          }
          (mat as MeshBasicMaterial).map?.dispose();
          mat.dispose();
        }
      });
      for (const sc of screens) {
        sc.poster.dispose();
        sc.loopTex?.dispose();
      }
      earthTex?.dispose();
      composer.dispose();
      css.domElement.remove();
      renderer.dispose();
      renderer.forceContextLoss();
    },
    attachEarth(layer) {
      earth = layer;
      earthTex = new CanvasTexture(layer.canvas);
      earthTex.colorSpace = SRGBColorSpace;
      earthTex.generateMipmaps = false;
      earthTex.minFilter = LinearFilter;
      earthTex.magFilter = LinearFilter;
    },
    earthStill() {
      if (!earth?.live() || !earth.paint(0, 0, 0)) return null;
      return earth.canvas.toDataURL('image/png');
    },
    earthState: () => (!earth || earth.failed() ? 'still' : earthMix >= 1 ? 'live' : 'loading'),
    screenRect,
    logoRect,
    frames: () => drawn,
    probe: (at) => {
      probeAt = at;
      probeLog.length = 0;
    },
    probeLog: () => probeLog.slice(),
    gpu: () => {
      const gl = renderer.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return ext
        ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
        : String(gl.getParameter(gl.RENDERER));
    },
  };
}
