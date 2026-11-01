/**
 * "Chain of custody" particle scene for the landing page.
 *
 * One THREE.Points draw call. Every particle carries four target shapes as
 * attributes (scattered fragment, position on an evidence strand, position on
 * the seal, position on the filing line) and the vertex shader blends between
 * them from a single `uProgress` uniform (0 → 3). The CPU only updates a few
 * uniforms per frame, so the cost is one vertex shader pass over N points.
 *
 * This module is imported dynamically by `scene-stage.tsx` on the client only,
 * after the page is interactive, so three.js never sits in the initial bundle.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from "three";

export type SceneState = {
  /** 0 fragments · 1 strands · 2 seal · 3 filed */
  progress: number;
  /** Horizontal offset of the formation, as a fraction of the viewport width. */
  offsetX: number;
  /** 0 hides the scene (and lets the loop idle), 1 is full strength. */
  opacity: number;
};

export type ParticleScene = {
  setTarget(state: SceneState): void;
  setPointer(x: number, y: number, active: boolean): void;
  resize(width: number, height: number): void;
  setRunning(running: boolean): void;
  dispose(): void;
};

export type ParticleSceneOptions = {
  count: number;
  maxPixelRatio: number;
  onFirstFrame?: () => void;
  /** Called once if the device cannot keep up and quality is lowered. */
  onDegrade?: () => void;
};

const STRANDS = 7;
const CAMERA_Z = 12;
const FOV = 35;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uPixelRatio;
  uniform float uScale;
  uniform float uAspect;
  uniform vec2 uPointer;
  uniform float uPointerStrength;

  attribute vec3 aScatter;
  attribute vec3 aSeal;
  attribute vec4 aRand;   // x seed · y size · z amber flag · w phase
  attribute vec2 aStrand; // x strand index · y position along strand

  varying vec3 vColor;
  varying float vAlpha;

  vec3 bezier(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
    float u = 1.0 - t;
    return u * u * u * a + 3.0 * u * u * t * b + 3.0 * u * t * t * c + t * t * t * d;
  }

  // Staggered transition: each particle starts a little later than the last.
  // Each particle moves within its own short window, so at any moment most
  // particles are clearly in one shape or the next rather than in between.
  float stage(float p, float start, float seed) {
    float x = clamp(((p - start) - seed * 0.72) / 0.28, 0.0, 1.0);
    return x * x * (3.0 - 2.0 * x);
  }

  void main() {
    float seed = aRand.x;
    float t = uTime;
    float e1 = stage(uProgress, 0.0, seed);
    float e2 = stage(uProgress, 1.0, seed);
    float e3 = stage(uProgress, 2.0, seed);

    // 1 · fragments drifting
    vec3 drift = vec3(
      sin(t * 0.21 + aRand.w * 6.2831),
      cos(t * 0.17 + aRand.w * 4.1),
      sin(t * 0.13 + aRand.w * 2.3)
    );
    vec3 pScatter = aScatter + drift * 0.32;

    // 2 · evidence strands spiralling in from every side to the seal's rim
    float k = aStrand.x;
    float th = k * ${((Math.PI * 2) / STRANDS).toFixed(5)} + 0.4;
    float zk = sin(k * 2.3) * 1.6;
    vec3 a = vec3(cos(th), sin(th), 0.0) * 8.5 + vec3(0.0, 0.0, zk - 1.5);
    vec3 b = vec3(cos(th + 0.55), sin(th + 0.55), 0.0) * 5.0 + vec3(0.0, 0.0, zk * 0.6);
    vec3 c = vec3(cos(th + 0.95), sin(th + 0.95), 0.0) * 2.9 + vec3(0.0, 0.0, zk * 0.2);
    vec3 d = vec3(cos(th + 1.25), sin(th + 1.25), 0.0) * 1.78;
    float st = fract(aStrand.y + t * 0.03 * (0.6 + seed * 0.8));
    vec3 jitter = normalize(aScatter + vec3(0.001)) * ((1.0 - st) * 0.3 + 0.02) * fract(seed * 7.31);
    vec3 pStrand = bezier(a, b, c, d, st) + jitter;

    // 3 · the seal, turning slowly
    float r = t * 0.045;
    vec3 pSeal = vec3(mat2(cos(r), sin(r), -sin(r), cos(r)) * aSeal.xy, aSeal.z);

    // 4 · filed: the seal unspools into a single line leaving to the right
    vec3 pFiled = vec3(-1.5 + pow(fract(seed * 13.7), 1.4) * 13.0, -0.75 + (fract(seed * 31.1) - 0.5) * 0.05, 0.0);

    vec3 pos = mix(pScatter, pStrand, e1);
    pos = mix(pos, pSeal, e2);
    pos = mix(pos, pFiled, e3);
    pos *= uScale;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // Pointer: particles lean away from the cursor (less once they are sealed).
    vec2 ndc = gl_Position.xy / gl_Position.w;
    vec2 dlt = ndc - uPointer;
    dlt.x *= uAspect;
    float len = length(dlt) + 1e-4;
    float push = smoothstep(0.3, 0.0, len) * uPointerStrength * (1.0 - e2 * 0.75);
    vec2 offset = (dlt / len) * push * 0.07;
    offset.x /= uAspect;
    gl_Position.xy += offset * gl_Position.w;

    float size = aRand.y * (1.0 - e2 * 0.2);
    gl_PointSize = size * uPixelRatio * (${CAMERA_Z.toFixed(1)} / -mv.z);

    vec3 paper = vec3(0.86, 0.89, 0.95);
    vec3 teal = vec3(0.42, 0.93, 0.86);
    vec3 amber = vec3(1.0, 0.6, 0.24);
    vec3 col = mix(paper, teal, clamp(e1 * 0.3 + e2 * 0.7, 0.0, 1.0) * (0.5 + 0.5 * fract(seed * 5.13)));
    col = mix(col, amber, aRand.z * (1.0 - e2));
    vColor = col;

    float flowFade = mix(1.0, smoothstep(0.0, 0.07, st) * smoothstep(1.0, 0.93, st), e1 * (1.0 - e2));
    float depthFade = smoothstep(-28.0, -7.0, mv.z);
    vAlpha = (0.45 + 0.55 * fract(seed * 3.71)) * flowFade * depthFade;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float halo = pow(smoothstep(0.5, 0.0, d), 1.6);
    float core = smoothstep(0.2, 0.0, d);
    float a = (halo * 0.85 + core) * vAlpha * uOpacity;
    gl_FragColor = vec4(vColor * a, a);
  }
`;

function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Deterministic PRNG so the formation is identical on every visit. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildGeometry(count: number) {
  const rand = mulberry32(1041);
  const scatter = new Float32Array(count * 3);
  const seal = new Float32Array(count * 3);
  const rnd = new Float32Array(count * 4);
  const strand = new Float32Array(count * 2);
  const position = new Float32Array(count * 3); // required by three; unused by the shader

  const rings = RINGS;
  const ringWeight = rings.reduce((s, r) => s + r, 0);
  const spokes = SPOKES;

  for (let i = 0; i < count; i++) {
    // Fragments: denser on the left, like evidence scattered before it is gathered.
    const sx = Math.pow(rand(), 0.8) * 2 - 1;
    scatter[i * 3] = sx * 9.5 - 1.2;
    scatter[i * 3 + 1] = (rand() * 2 - 1) * 4.6;
    scatter[i * 3 + 2] = -6 + rand() * 9;

    // Seal
    const kind = rand();
    const theta = rand() * Math.PI * 2;
    let x = 0;
    let y = 0;
    let z = 0;
    if (kind < 0.56) {
      let pick = rand() * ringWeight;
      let radius = rings[rings.length - 1];
      for (const ring of rings) {
        if (pick < ring) {
          radius = ring;
          break;
        }
        pick -= ring;
      }
      const thickness = (rand() - 0.5) * 0.03;
      x = Math.cos(theta) * (radius + thickness);
      y = Math.sin(theta) * (radius + thickness);
      z = (rand() - 0.5) * 0.04;
    } else if (kind < 0.84) {
      const s = Math.floor(rand() * spokes);
      const a = (s / spokes) * Math.PI * 2;
      const long = s % 4 === 0;
      const radius = 0.5 + rand() * (long ? 2.15 : 1.35);
      x = Math.cos(a) * radius;
      y = Math.sin(a) * radius;
      z = (rand() - 0.5) * 0.03;
    } else if (kind < 0.93) {
      const radius = Math.pow(rand(), 2.2) * 0.3;
      x = Math.cos(theta) * radius;
      y = Math.sin(theta) * radius;
    } else {
      const radius = 1.9 + rand() * 1.4;
      x = Math.cos(theta) * radius;
      y = Math.sin(theta) * radius;
      z = (rand() - 0.5) * 0.6;
    }
    seal[i * 3] = x;
    seal[i * 3 + 1] = y;
    seal[i * 3 + 2] = z;

    const bokeh = rand() < 0.022;
    rnd[i * 4] = rand();
    rnd[i * 4 + 1] = bokeh ? 10 + rand() * 16 : 1.8 + Math.pow(rand(), 2) * 3.2;
    rnd[i * 4 + 2] = rand() < 0.09 ? 1 : 0;
    rnd[i * 4 + 3] = rand();

    strand[i * 2] = Math.floor(rand() * STRANDS);
    strand[i * 2 + 1] = rand();
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(position, 3));
  geometry.setAttribute("aScatter", new BufferAttribute(scatter, 3));
  geometry.setAttribute("aSeal", new BufferAttribute(seal, 3));
  geometry.setAttribute("aRand", new BufferAttribute(rnd, 4));
  geometry.setAttribute("aStrand", new BufferAttribute(strand, 2));
  // The shader moves points far from `position`; skip frustum culling.
  return geometry;
}

const RINGS = [0.42, 0.78, 1.12, 1.42, 1.78];
const SPOKES = 48;

/** Hairline rings and spokes that sharpen the particle seal once it forms. */
function buildSealLines() {
  const segments: number[] = [];
  const steps = 160;
  for (const r of RINGS) {
    for (let i = 0; i < steps; i++) {
      const a0 = (i / steps) * Math.PI * 2;
      const a1 = ((i + 1) / steps) * Math.PI * 2;
      segments.push(Math.cos(a0) * r, Math.sin(a0) * r, 0, Math.cos(a1) * r, Math.sin(a1) * r, 0);
    }
  }
  for (let s = 0; s < SPOKES; s++) {
    const a = (s / SPOKES) * Math.PI * 2;
    const outer = s % 4 === 0 ? 2.65 : 1.85;
    segments.push(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0, Math.cos(a) * outer, Math.sin(a) * outer, 0);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(segments), 3));
  const material = new LineBasicMaterial({
    color: new Color(0.42, 0.93, 0.86),
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  return new LineSegments(geometry, material);
}

/** Soft bloom-like glow for the seal's core: a quad with a radial falloff. */
function buildGlow() {
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    premultipliedAlpha: true,
    uniforms: { uOpacity: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float g = pow(max(0.0, 1.0 - d), 3.0) * 0.55 + pow(max(0.0, 1.0 - d * 5.0), 2.0) * 0.9;
        gl_FragColor = vec4(vec3(0.55, 0.95, 0.9) * g * uOpacity, g * uOpacity);
      }
    `,
  });
  return new Mesh(new PlaneGeometry(6, 6), material);
}

export function createParticleScene(canvas: HTMLCanvasElement, options: ParticleSceneOptions): ParticleScene {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    premultipliedAlpha: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
  });
  // Transparent: the generated poster behind the canvas stays visible where the scene is empty.
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
  camera.position.set(0, 0, CAMERA_Z);

  const geometry = buildGeometry(options.count);
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    premultipliedAlpha: true,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uPixelRatio: { value: 1 },
      uScale: { value: 1 },
      uAspect: { value: 1 },
      uPointer: { value: new Vector2(10, 10) },
      uPointerStrength: { value: 0 },
      uOpacity: { value: 0 },
    },
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  const sealLines = buildSealLines();
  const glow = buildGlow();
  const formation = new Group();
  formation.add(glow, sealLines, points);
  scene.add(formation);

  let pixelRatio = Math.min(window.devicePixelRatio || 1, options.maxPixelRatio);
  let viewWidth = 1;
  let viewHeight = 1;
  let worldWidth = 1;
  let baseY = 0;

  const target: SceneState = { progress: 0, offsetX: 0, opacity: 1 };
  const current: SceneState = { progress: 0, offsetX: 0, opacity: 0 };
  const pointer = { x: 10, y: 10, tx: 10, ty: 10, strength: 0, active: false };

  let running = false;
  let raf = 0;
  let last = 0;
  let elapsed = 0;
  let firstFrame = false;
  let degraded = false;
  const frameTimes: number[] = [];

  function resize(width: number, height: number) {
    viewWidth = Math.max(1, width);
    viewHeight = Math.max(1, height);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(viewWidth, viewHeight, false);
    camera.aspect = viewWidth / viewHeight;
    camera.updateProjectionMatrix();
    const worldHeight = 2 * CAMERA_Z * Math.tan(((FOV / 2) * Math.PI) / 180);
    worldWidth = worldHeight * camera.aspect;
    // Portrait screens: lift the formation into the upper third, away from body copy.
    baseY = camera.aspect < 0.85 ? worldHeight * 0.22 : 0;
    material.uniforms.uAspect.value = camera.aspect;
    material.uniforms.uPixelRatio.value = pixelRatio;
    // Keep the seal comfortably inside narrow (portrait) viewports.
    material.uniforms.uScale.value = Math.min(1, worldWidth / 8.6);
  }

  function degrade() {
    if (degraded) return;
    degraded = true;
    pixelRatio = 1;
    geometry.setDrawRange(0, Math.floor(options.count * 0.55));
    resize(viewWidth, viewHeight);
    options.onDegrade?.();
  }

  function frame(now: number) {
    raf = 0;
    if (!running) return;
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
    last = now;

    // Adaptive quality: if the first ~2 seconds run well below 45fps, lower it once.
    if (!degraded && frameTimes.length < 120) {
      frameTimes.push(dt);
      if (frameTimes.length === 120) {
        const sorted = [...frameTimes].sort((a, b) => a - b);
        if (sorted[60] > 1 / 45) degrade();
      }
    }

    const ease = 1 - Math.exp(-dt * 3.2);
    current.progress += (target.progress - current.progress) * ease;
    current.offsetX += (target.offsetX - current.offsetX) * ease;
    current.opacity += (target.opacity - current.opacity) * (1 - Math.exp(-dt * 4));

    pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 8));
    pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 8));
    pointer.strength += ((pointer.active ? 1 : 0) - pointer.strength) * (1 - Math.exp(-dt * 3));

    // Nothing visible and nothing about to be: stop rendering until something changes.
    if (current.opacity < 0.004 && target.opacity === 0) {
      current.opacity = 0;
      renderer.clear();
      last = 0;
      return;
    }

    elapsed += dt;
    const u = material.uniforms;
    u.uTime.value = elapsed;
    u.uProgress.value = current.progress;
    u.uOpacity.value = current.opacity;
    (u.uPointer.value as Vector2).set(pointer.x, pointer.y);
    u.uPointerStrength.value = pointer.strength;
    formation.position.x = current.offsetX * worldWidth;
    formation.position.y = baseY;
    // A slow parallax tilt keeps the field alive without demanding attention.
    const lean = pointer.strength * (Math.abs(pointer.x) < 2 ? 1 : 0);
    formation.rotation.y = Math.sin(elapsed * 0.05) * 0.08 + pointer.x * 0.035 * lean;
    formation.rotation.x = -pointer.y * 0.025 * lean;

    // Hairlines and glow appear only while the seal is formed.
    const p = current.progress;
    const sealed = smooth(1.55, 2.0, p) * (1 - smooth(2.15, 2.55, p)) * current.opacity;
    const scale = u.uScale.value as number;
    sealLines.scale.setScalar(scale);
    sealLines.rotation.z = elapsed * 0.045;
    (sealLines.material as LineBasicMaterial).opacity = sealed * 0.32;
    glow.scale.setScalar(scale);
    (glow.material as ShaderMaterial).uniforms.uOpacity.value = smooth(1.3, 2.0, p) * (1 - smooth(2.2, 2.7, p)) * current.opacity;

    renderer.render(scene, camera);
    if (!firstFrame) {
      firstFrame = true;
      options.onFirstFrame?.();
    }
    raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (running && !raf) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  return {
    setTarget(state) {
      target.progress = state.progress;
      target.offsetX = state.offsetX;
      target.opacity = state.opacity;
      if (state.opacity > 0) kick();
    },
    setPointer(x, y, active) {
      pointer.tx = x;
      pointer.ty = y;
      pointer.active = active;
      if (!active) {
        pointer.tx = pointer.x;
        pointer.ty = pointer.y;
      }
    },
    resize,
    setRunning(next) {
      running = next;
      if (next) kick();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    dispose() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      geometry.dispose();
      material.dispose();
      sealLines.geometry.dispose();
      (sealLines.material as LineBasicMaterial).dispose();
      glow.geometry.dispose();
      (glow.material as ShaderMaterial).dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
