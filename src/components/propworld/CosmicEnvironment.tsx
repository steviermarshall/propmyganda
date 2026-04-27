import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

/* =========================================================================
   CosmicEnvironment
   AAA-leaning endless space scene:
   - Procedural shader skybox (nebulae + dust)
   - 3 parallax starfield layers w/ animated twinkling
   - 6-10 procedural planets (rocky, gas-giant, ice, lava, earth-like)
   - Instanced meteoroid field with visual-only click impacts (burst + shake)
   Designed to coexist with existing TheaterInterior frames — keeps a clear
   inner zone (~radius 14) free of geometry so frames stay readable.
   ========================================================================= */

interface Props {
  isMobile?: boolean;
  onHittableHover?: (hovering: boolean) => void;
}

export default function CosmicEnvironment({ isMobile = false, onHittableHover }: Props) {
  return (
    <group>
      <Skybox />
      <Starfield count={isMobile ? 1500 : 2200} radius={120} size={0.16} color="#ffffff" speed={0.005} />
      <Starfield count={isMobile ? 1200 : 2000} radius={220} size={0.32} color="#cfe0ff" speed={-0.0025} />
      <Starfield count={isMobile ? 800 : 1400} radius={360} size={0.55} color="#ffd8f2" speed={0.0012} />

      <CinematicLights />
      <Planets isMobile={isMobile} onHittableHover={onHittableHover} />
      <Meteoroids count={isMobile ? 18 : 45} onHittableHover={onHittableHover} />
      <CameraSway />
    </group>
  );
}

/* ----------------------- Skybox shader ----------------------- */
function Skybox() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  useFrame((_, dt) => {
    if (mat.current) (mat.current.uniforms.uTime.value as number) += dt * 0.02;
  });
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  return (
    <mesh scale={[-1, 1, 1]} renderOrder={-1}>
      <sphereGeometry args={[500, 48, 32]} />
      <shaderMaterial
        ref={mat}
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          precision highp float;
          varying vec3 vDir;
          uniform float uTime;

          // hash + value noise + fbm
          float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
          float noise(vec3 p){
            vec3 i = floor(p); vec3 f = fract(p);
            f = f*f*(3.0-2.0*f);
            float n000 = hash(i);
            float n100 = hash(i+vec3(1,0,0));
            float n010 = hash(i+vec3(0,1,0));
            float n110 = hash(i+vec3(1,1,0));
            float n001 = hash(i+vec3(0,0,1));
            float n101 = hash(i+vec3(1,0,1));
            float n011 = hash(i+vec3(0,1,1));
            float n111 = hash(i+vec3(1,1,1));
            return mix(
              mix(mix(n000,n100,f.x), mix(n010,n110,f.x), f.y),
              mix(mix(n001,n101,f.x), mix(n011,n111,f.x), f.y),
              f.z
            );
          }
          float fbm(vec3 p){
            float v=0.0, a=0.5;
            for(int i=0;i<5;i++){ v += a*noise(p); p*=2.02; a*=0.5; }
            return v;
          }

          void main(){
            vec3 d = normalize(vDir);
            // Deep space base
            vec3 col = vec3(0.015, 0.012, 0.035);

            // Two big nebula clouds — purple/magenta and teal
            float n1 = fbm(d * 2.2 + vec3(uTime*0.3, 0.0, 0.0));
            float n2 = fbm(d * 1.6 + vec3(0.0, uTime*0.2, 5.0));
            float n3 = fbm(d * 4.0 + vec3(2.0, uTime*0.15, 0.0));

            vec3 purple = vec3(0.45, 0.12, 0.65);
            vec3 magenta = vec3(0.85, 0.20, 0.55);
            vec3 teal = vec3(0.10, 0.55, 0.70);

            float m1 = smoothstep(0.45, 0.85, n1);
            float m2 = smoothstep(0.50, 0.90, n2);

            col += purple * m1 * 0.55;
            col += magenta * m1 * m2 * 0.35;
            col += teal * m2 * 0.45;

            // Volumetric dust streaks
            float dust = smoothstep(0.55, 0.95, n3) * 0.25;
            col += vec3(0.6, 0.7, 1.0) * dust;

            // Subtle vertical falloff
            float yfade = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
            col *= mix(0.85, 1.05, yfade);

            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}

/* ----------------------- Starfield with twinkle ----------------------- */
function Starfield({
  count,
  radius,
  size,
  color,
  speed,
}: {
  count: number;
  radius: number;
  size: number;
  color: string;
  speed: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const { geo, mat } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * (0.7 + Math.random() * 0.3);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      phases[i] = Math.random() * Math.PI * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: size },
        uColor: { value: new THREE.Color(color) },
      },
      vertexShader: `
        attribute float aPhase;
        varying float vTw;
        uniform float uTime;
        uniform float uSize;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float tw = 0.55 + 0.45 * sin(uTime * 2.0 + aPhase);
          vTw = tw;
          gl_PointSize = uSize * (300.0 / -mv.z) * (0.6 + tw * 0.8);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vTw;
        uniform vec3 uColor;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(uColor, a * vTw);
        }
      `,
      toneMapped: false,
    });
    return { geo: g, mat: m };
  }, [count, radius, size, color]);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * speed;
    (mat.uniforms.uTime.value as number) += dt;
  });

  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  return <points ref={ref} geometry={geo} material={mat} />;
}

/* ----------------------- Cinematic lighting ----------------------- */
function CinematicLights() {
  return (
    <>
      <ambientLight intensity={0.18} color="#3a4a7a" />
      {/* Distant warm sun */}
      <directionalLight position={[80, 40, -60]} intensity={1.6} color="#ffd29a" />
      {/* Electric blue rim */}
      <directionalLight position={[-60, 10, 40]} intensity={0.9} color="#3aa8ff" />
      {/* Magenta rim */}
      <directionalLight position={[40, -30, 50]} intensity={0.7} color="#ff3ad2" />
      <hemisphereLight args={["#7a9bff", "#2a1844", 0.35]} />
    </>
  );
}

/* ----------------------- Planets ----------------------- */

type PlanetType = "rocky" | "gas" | "ice" | "lava" | "earth";
interface PlanetCfg {
  type: PlanetType;
  position: [number, number, number];
  radius: number;
  rotSpeed: number;
  ring?: boolean;
  colors: [string, string, string];
}

function Planets({ isMobile, onHittableHover }: { isMobile: boolean; onHittableHover?: (h: boolean) => void }) {
  const planets = useMemo<PlanetCfg[]>(() => {
    // All placed OUTSIDE the inner frame zone (radius > 22) so frames stay clear
    const list: PlanetCfg[] = [
      { type: "gas",   position: [-55,  18, -70], radius: 9.0, rotSpeed: 0.04, ring: true,  colors: ["#d8b48a", "#8a5a3a", "#fff0d8"] },
      { type: "earth", position: [ 48,  -8, -55], radius: 5.5, rotSpeed: 0.06, colors: ["#2a6fb0", "#3aa86a", "#ffffff"] },
      { type: "lava",  position: [-30, -22,  60], radius: 4.2, rotSpeed: 0.09, colors: ["#3a0a04", "#ff5a1a", "#ffd060"] },
      { type: "ice",   position: [ 70,  25,  35], radius: 6.2, rotSpeed: 0.03, ring: true,  colors: ["#cfe6ff", "#7faed8", "#ffffff"] },
      { type: "rocky", position: [-65, -10, -25], radius: 3.4, rotSpeed: 0.07, colors: ["#7a6a58", "#3a2e22", "#b8a890"] },
      { type: "gas",   position: [ 30,  35,  70], radius: 7.5, rotSpeed: 0.035, colors: ["#a85a8a", "#5a2a55", "#ffd8e8"] },
      { type: "rocky", position: [ 25, -30, -85], radius: 2.8, rotSpeed: 0.08, colors: ["#665548", "#2a1f18", "#a89880"] },
    ];
    if (!isMobile) {
      list.push(
        { type: "ice",  position: [-85,   8,  10], radius: 3.6, rotSpeed: 0.05, colors: ["#b0d8ff", "#5080b0", "#ffffff"] },
        { type: "earth", position: [ -20,  40, -50], radius: 4.0, rotSpeed: 0.06, ring: true, colors: ["#1a4a8a", "#2a8a5a", "#e8f0ff"] },
      );
    }
    return list;
  }, [isMobile]);

  return (
    <group>
      {planets.map((p, i) => (
        <Planet key={i} cfg={p} onHittableHover={onHittableHover} />
      ))}
    </group>
  );
}

function Planet({ cfg, onHittableHover }: { cfg: PlanetCfg; onHittableHover?: (h: boolean) => void }) {
  const ref = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const [pulse, setPulse] = useState(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(cfg.colors[0]) },
      uColorB: { value: new THREE.Color(cfg.colors[1]) },
      uColorC: { value: new THREE.Color(cfg.colors[2]) },
      uType: { value: typeIndex(cfg.type) },
      uPulse: { value: 0 },
    }),
    [cfg.type, cfg.colors],
  );

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * cfg.rotSpeed;
    if (matRef.current) {
      (matRef.current.uniforms.uTime.value as number) += dt;
      const p = Math.max(0, pulse - dt * 2.5);
      setPulse(p);
      (matRef.current.uniforms.uPulse.value as number) = p;
    }
  });

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setPulse(1);
    triggerImpact(e.point);
  }, []);

  return (
    <group position={cfg.position}>
      <group ref={ref}>
        <mesh
          castShadow={false}
          onPointerOver={(e) => { e.stopPropagation(); onHittableHover?.(true); document.body.style.cursor = "crosshair"; }}
          onPointerOut={(e) => { e.stopPropagation(); onHittableHover?.(false); document.body.style.cursor = ""; }}
          onPointerDown={handleClick}
        >
          <sphereGeometry args={[cfg.radius, 64, 48]} />
          <shaderMaterial
            ref={matRef}
            uniforms={uniforms}
            vertexShader={`
              varying vec3 vN;
              varying vec3 vP;
              void main(){
                vN = normalize(normalMatrix * normal);
                vP = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
              }
            `}
            fragmentShader={planetFragment()}
          />
        </mesh>

        {/* Atmospheric fresnel glow */}
        <mesh scale={1.06}>
          <sphereGeometry args={[cfg.radius, 32, 24]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            uniforms={{ uColor: { value: new THREE.Color(cfg.colors[0]).lerp(new THREE.Color("#88c8ff"), 0.5) } }}
            vertexShader={`
              varying vec3 vN; varying vec3 vV;
              void main(){
                vN = normalize(normalMatrix * normal);
                vec4 mv = modelViewMatrix * vec4(position,1.0);
                vV = normalize(-mv.xyz);
                gl_Position = projectionMatrix * mv;
              }
            `}
            fragmentShader={`
              varying vec3 vN; varying vec3 vV;
              uniform vec3 uColor;
              void main(){
                float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.5);
                gl_FragColor = vec4(uColor, f * 0.7);
              }
            `}
          />
        </mesh>

        {cfg.ring && <PlanetRing innerR={cfg.radius * 1.4} outerR={cfg.radius * 2.2} color={cfg.colors[2]} />}
      </group>
    </group>
  );
}

function PlanetRing({ innerR, outerR, color }: { innerR: number; outerR: number; color: string }) {
  return (
    <mesh rotation={[Math.PI / 2 + 0.35, 0.2, 0]}>
      <ringGeometry args={[innerR, outerR, 96, 1]} />
      <shaderMaterial
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        uniforms={{
          uColor: { value: new THREE.Color(color) },
          uInner: { value: innerR },
          uOuter: { value: outerR },
        }}
        vertexShader={`
          varying vec2 vUv; varying vec3 vP;
          void main(){
            vUv = uv; vP = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }
        `}
        fragmentShader={`
          varying vec3 vP;
          uniform vec3 uColor;
          uniform float uInner;
          uniform float uOuter;
          float hash(float n){ return fract(sin(n)*43758.5453); }
          void main(){
            float r = length(vP.xy);
            float t = (r - uInner) / (uOuter - uInner);
            // banded noise
            float bands = 0.5 + 0.5 * sin(t * 60.0 + hash(floor(t*40.0))*6.28);
            float a = smoothstep(0.0,0.1,t) * smoothstep(1.0,0.85,t) * (0.4 + 0.6*bands);
            gl_FragColor = vec4(uColor, a * 0.85);
          }
        `}
      />
    </mesh>
  );
}

function typeIndex(t: PlanetType): number {
  return ({ rocky: 0, gas: 1, ice: 2, lava: 3, earth: 4 } as const)[t];
}

function planetFragment() {
  return `
    precision highp float;
    varying vec3 vN; varying vec3 vP;
    uniform float uTime;
    uniform vec3 uColorA; uniform vec3 uColorB; uniform vec3 uColorC;
    uniform float uType;
    uniform float uPulse;

    float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
    float noise(vec3 p){
      vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
      float n000=hash(i), n100=hash(i+vec3(1,0,0));
      float n010=hash(i+vec3(0,1,0)), n110=hash(i+vec3(1,1,0));
      float n001=hash(i+vec3(0,0,1)), n101=hash(i+vec3(1,0,1));
      float n011=hash(i+vec3(0,1,1)), n111=hash(i+vec3(1,1,1));
      return mix(mix(mix(n000,n100,f.x),mix(n010,n110,f.x),f.y),
                 mix(mix(n001,n101,f.x),mix(n011,n111,f.x),f.y), f.z);
    }
    float fbm(vec3 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }

    void main(){
      vec3 p = normalize(vP);
      vec3 col;
      float lat = p.y;

      if (uType < 0.5) {
        // rocky: cratered fbm
        float n = fbm(p*4.0);
        float c = smoothstep(0.4,0.7,n);
        col = mix(uColorB, uColorA, n);
        col = mix(col, uColorC, c*0.4);
      } else if (uType < 1.5) {
        // gas giant: horizontal bands + swirls
        float bands = sin(lat*14.0 + fbm(p*2.0 + uTime*0.05)*4.0);
        float t = bands*0.5 + 0.5;
        col = mix(uColorB, uColorA, t);
        float storm = smoothstep(0.6, 0.9, fbm(p*3.0 + uTime*0.03));
        col = mix(col, uColorC, storm*0.5);
      } else if (uType < 2.5) {
        // ice: cool whites + cracks
        float n = fbm(p*5.0);
        float crack = smoothstep(0.55, 0.6, n) - smoothstep(0.6, 0.65, n);
        col = mix(uColorA, uColorC, smoothstep(0.3,0.7,n));
        col = mix(col, uColorB, crack*1.5);
      } else if (uType < 3.5) {
        // lava: fissures glow
        float n = fbm(p*4.0 + uTime*0.05);
        float lava = smoothstep(0.55,0.7,n);
        col = mix(uColorA, uColorB, lava);
        col += uColorC * smoothstep(0.7,0.85,n) * 1.4;
      } else {
        // earth-like: continents + oceans
        float n = fbm(p*3.0);
        float land = smoothstep(0.48, 0.52, n);
        col = mix(uColorA, uColorB, land);
        float clouds = smoothstep(0.6, 0.85, fbm(p*4.0 + uTime*0.04));
        col = mix(col, uColorC, clouds*0.55);
      }

      // simple light from sun direction
      vec3 L = normalize(vec3(0.6, 0.4, -0.7));
      float diff = max(dot(normalize(vN), L), 0.0);
      col *= 0.35 + 0.85*diff;

      // impact pulse flash
      col += vec3(1.0, 0.6, 0.9) * uPulse * 0.6;

      gl_FragColor = vec4(col, 1.0);
    }
  `;
}

/* ----------------------- Meteoroids (instanced) ----------------------- */

function Meteoroids({ count, onHittableHover }: { count: number; onHittableHover?: (h: boolean) => void }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const trailMeshRef = useRef<THREE.InstancedMesh>(null);

  const data = useMemo(() => {
    const arr: {
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      rot: THREE.Euler;
      angVel: THREE.Vector3;
      scale: number;
    }[] = [];
    for (let i = 0; i < count; i++) {
      arr.push(makeMeteoroid());
    }
    return arr;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const trailDummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    const trail = trailMeshRef.current;
    if (!mesh) return;
    const d = Math.min(dt, 0.05);
    for (let i = 0; i < data.length; i++) {
      const m = data[i];
      m.pos.addScaledVector(m.vel, d);
      m.rot.x += m.angVel.x * d;
      m.rot.y += m.angVel.y * d;
      m.rot.z += m.angVel.z * d;

      // Recycle if too far
      if (m.pos.length() > 130) {
        Object.assign(m, makeMeteoroid(true));
      }

      dummy.position.copy(m.pos);
      dummy.rotation.copy(m.rot);
      dummy.scale.setScalar(m.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      if (trail) {
        // trail: stretched cone behind, opposite of velocity
        const dir = m.vel.clone().normalize();
        trailDummy.position.copy(m.pos).addScaledVector(dir, -m.scale * 1.6);
        trailDummy.lookAt(m.pos.clone().addScaledVector(dir, 1));
        trailDummy.rotateX(Math.PI / 2);
        const len = m.scale * 4;
        trailDummy.scale.set(m.scale * 0.4, len, m.scale * 0.4);
        trailDummy.updateMatrix();
        trail.setMatrixAt(i, trailDummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (trail) trail.instanceMatrix.needsUpdate = true;
  });

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const i = e.instanceId;
    if (i == null) return;
    triggerImpact(e.point);
    // Recycle this meteoroid (visual "shatter": just respawn far away)
    Object.assign(data[i], makeMeteoroid(true));
  }, [data]);

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, count]}
        onPointerOver={(e) => { e.stopPropagation(); onHittableHover?.(true); document.body.style.cursor = "crosshair"; }}
        onPointerOut={(e) => { e.stopPropagation(); onHittableHover?.(false); document.body.style.cursor = ""; }}
        onPointerDown={handleClick}
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#7a6855" roughness={0.85} metalness={0.15} flatShading />
      </instancedMesh>

      <instancedMesh
        ref={trailMeshRef}
        args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, count]}
        raycast={() => null}
      >
        <coneGeometry args={[1, 1, 8, 1, true]} />
        <meshBasicMaterial
          color="#ffb070"
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}

function makeMeteoroid(fromEdge = false) {
  const r = fromEdge ? 90 + Math.random() * 30 : 30 + Math.random() * 80;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const pos = new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta) * 0.4,
    r * Math.cos(phi),
  );
  // velocity drifts loosely across the play space
  const vel = new THREE.Vector3(
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 2,
    (Math.random() - 0.5) * 4,
  );
  return {
    pos,
    vel,
    rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
    angVel: new THREE.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6),
    scale: 0.25 + Math.random() * 1.6,
  };
}

/* ----------------------- Camera idle sway + parallax ----------------------- */
function CameraSway() {
  const { camera, pointer } = useThree();
  const base = useRef<THREE.Vector3 | null>(null);
  useFrame((state, dt) => {
    if (!base.current) base.current = camera.position.clone();
    const t = state.clock.getElapsedTime();
    // gentle sway + mouse parallax
    const swayX = Math.sin(t * 0.25) * 0.15 + pointer.x * 0.6;
    const swayY = Math.cos(t * 0.2) * 0.1 + pointer.y * 0.4;
    camera.position.x += (base.current.x + swayX - camera.position.x) * Math.min(1, dt * 1.2);
    camera.position.y += (base.current.y + swayY - camera.position.y) * Math.min(1, dt * 1.2);
  });
  return null;
}

/* ----------------------- Visual impact (burst + screen shake) ----------------------- */

type Burst = { id: number; pos: THREE.Vector3; t: number };
const burstSubs = new Set<(b: Burst) => void>();
let burstId = 0;

export function triggerImpact(point: THREE.Vector3) {
  const b: Burst = { id: ++burstId, pos: point.clone(), t: 0 };
  burstSubs.forEach((fn) => fn(b));
  // dispatch screen-shake event picked up by HUD
  window.dispatchEvent(new CustomEvent("cosmic:shake"));
  window.dispatchEvent(new CustomEvent("cosmic:hit"));
}

export function ImpactBursts() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  useEffect(() => {
    const onB = (b: Burst) => setBursts((prev) => [...prev, b]);
    burstSubs.add(onB);
    return () => { burstSubs.delete(onB); };
  }, []);
  useFrame((_, dt) => {
    setBursts((prev) =>
      prev
        .map((b) => ({ ...b, t: b.t + dt }))
        .filter((b) => b.t < 0.9),
    );
  });
  return (
    <group>
      {bursts.map((b) => (
        <Burst key={b.id} burst={b} />
      ))}
    </group>
  );
}

function Burst({ burst }: { burst: Burst }) {
  const ref = useRef<THREE.Points>(null);
  const { geo, mat, velocities } = useMemo(() => {
    const N = 60;
    const pos = new Float32Array(N * 3);
    const vels: THREE.Vector3[] = [];
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize().multiplyScalar(2 + Math.random() * 6);
      vels.push(v);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({
      color: "#ffd070",
      size: 0.35,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return { geo: g, mat: m, velocities: vels };
  }, []);

  useFrame((_, dt) => {
    const arr = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < velocities.length; i++) {
      arr[i * 3] += velocities[i].x * dt;
      arr[i * 3 + 1] += velocities[i].y * dt;
      arr[i * 3 + 2] += velocities[i].z * dt;
      velocities[i].multiplyScalar(0.92);
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = Math.max(0, 1 - burst.t / 0.9);
    mat.size = 0.35 + burst.t * 0.4;
  });

  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  return <points position={burst.pos} ref={ref} geometry={geo} material={mat} />;
}
