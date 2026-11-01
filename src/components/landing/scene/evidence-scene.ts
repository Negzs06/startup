/**
 * The evidence-room scene: a spilled case file on a table that is gathered,
 * audited, sealed and filed as the visitor scrolls (states 0…6, see
 * docs/landing-concept.md). Loaded with a dynamic import on the client only.
 *
 * - Objects: paper sheets, receipts and kraft tags with code-drawn records, a
 *   glassine envelope, a manila folder with a hinged cover, a brass seal stamp.
 * - Light: softbox-like key from the left with soft shadows, a warm rim from
 *   behind-right, RoomEnvironment for reflections (bundled with three, no CDN).
 * - One shader effect: the seal's ink bleeds into the manila fibres.
 * - A camera that travels a Catmull-Rom path through seven keyed positions.
 */
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  LatheGeometry,
  Material,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  Euler,
  Scene,
  ShaderMaterial,
  Shape,
  ShadowMaterial,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Texture,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { SceneRecords } from "../data";
import { drawPaper, loadImage, type Fonts } from "./paper-textures";

export type Tier = "high" | "low";

export type EvidenceScene = {
  /** Scroll-driven state: progress 0…6 and opacity 0…1. */
  setTarget(progress: number, opacity: number): void;
  setPointer(x: number, y: number, active: boolean): void;
  resize(width: number, height: number): void;
  setRunning(running: boolean): void;
  /** Renders a frame now and returns it as a data URL (testing only). */
  snapshot(): string;
  dispose(): void;
};

export type EvidenceSceneOptions = {
  records: SceneRecords;
  fonts: Fonts;
  images: { cotton: string; manila: string };
  tier: Tier;
  maxPixelRatio: number;
  onFirstFrame?: () => void;
  onFrame?: (frames: number, progress: number) => void;
  onDegrade?: (level: "reduced" | "off") => void;
};

// ---------------------------------------------------------------------------
// Dimensions (metres) and helpers

const A4 = { w: 0.21, h: 0.297 };
const FOLDER = { w: 0.235, h: 0.31, t: 0.0018 };
const STATES = 6;
const smooth = (a: number, b: number, x: number) => {
  const t = MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

type Key = { t: number; p: [number, number, number]; r?: [number, number, number] };

/** Interpolate a keyed pose at progress t with an ease between neighbouring keys. */
function samplePose(keys: Key[], t: number, outP: Vector3, outQ: Quaternion) {
  let a = keys[0];
  let b = keys[keys.length - 1];
  if (t <= a.t) b = a;
  else if (t >= b.t) a = b;
  else {
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i].t) {
        a = keys[i - 1];
        b = keys[i];
        break;
      }
    }
  }
  const k = a === b ? 0 : smooth(0, 1, (t - a.t) / (b.t - a.t));
  outP.set(MathUtils.lerp(a.p[0], b.p[0], k), MathUtils.lerp(a.p[1], b.p[1], k), MathUtils.lerp(a.p[2], b.p[2], k));
  const ra = a.r ?? [0, 0, 0];
  const rb = b.r ?? [0, 0, 0];
  _qa.setFromEuler(_e.set(ra[0], ra[1], ra[2]));
  _qb.setFromEuler(_e.set(rb[0], rb[1], rb[2]));
  outQ.slerpQuaternions(_qa, _qb, k);
}
const _qa = new Quaternion();
const _qb = new Quaternion();
const _e = new Euler();

/** A flat sheet lying on the table (normal +Y) with a gentle, fixed curl. */
function sheetGeometry(w: number, h: number, curl: number, segs = 14) {
  const g = new PlaneGeometry(w, h, segs, Math.round(segs * (h / w)));
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const corner = Math.max(0, (x / (w / 2)) * (z / (h / 2)));
    pos.setY(i, curl * (x * x * 1.6 + corner * corner * 0.012));
  }
  g.computeVertexNormals();
  return g;
}

/** A thermal receipt: a strip that curls up at both ends. */
function receiptGeometry(w: number, h: number) {
  const g = new PlaneGeometry(w, h, 2, 48);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const flat = h * 0.32;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const over = Math.max(0, Math.abs(z) - flat);
    const r = 0.022;
    const a = over / r;
    if (over > 0) {
      const sign = Math.sign(z);
      pos.setZ(i, sign * (flat + Math.sin(Math.min(a, Math.PI * 0.85)) * r));
      pos.setY(i, (1 - Math.cos(Math.min(a, Math.PI * 0.85))) * r);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** A kraft tag with clipped corners and a hole, lying flat, UVs normalised to the tag. */
function tagGeometry(w: number, h: number) {
  const s = new Shape();
  const c = w * 0.22;
  s.moveTo(-w / 2, -h / 2);
  s.lineTo(w / 2, -h / 2);
  s.lineTo(w / 2, h / 2 - c);
  s.lineTo(w / 2 - c, h / 2);
  s.lineTo(-w / 2 + c, h / 2);
  s.lineTo(-w / 2, h / 2 - c);
  s.closePath();
  const hole = new Shape();
  hole.absarc(0, h / 2 - w * 0.2, w * 0.06, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const g = new ExtrudeGeometry(s, { depth: 0.0006, bevelEnabled: false, curveSegments: 16 });
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

/** The ink-bleed shader: a canvas-drawn stamp revealed by a fibrous noise front. */
function inkMaterial(mask: Texture, paper: Texture) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    uniforms: {
      uMask: { value: mask },
      uPaper: { value: paper },
      uInk: { value: 0 },
      uColor: { value: new Color("#1d5a3c") },
      uShade: { value: 0.92 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMask;
      uniform sampler2D uPaper;
      uniform float uInk;
      uniform vec3 uColor;
      uniform float uShade;
      varying vec2 vUv;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
        return v;
      }

      void main() {
        vec4 m = texture2D(uMask, vUv);
        float fibre = texture2D(uPaper, vUv * 2.5).r;
        // Ink spreads from the contact point; the front is broken up by paper fibre and noise.
        float d = distance(vUv, vec2(0.5));
        float front = uInk * 0.95 - d + (fbm(vUv * 18.0) - 0.5) * 0.28 + (fibre - 0.85) * 0.4;
        float reveal = smoothstep(0.0, 0.035, front);
        // Uneven density and small voids, like a real hand stamp.
        float density = 0.72 + 0.28 * fbm(vUv * 60.0);
        float voids = smoothstep(0.22, 0.3, fbm(vUv * 140.0 + 3.0));
        float sharp = m.r * density * voids;
        // Feathered bleed along the fibres once the ink has soaked in.
        float bleed = max(0.0, m.g - m.r) * 0.45 * smoothstep(0.6, 1.0, uInk) * fbm(vUv * 90.0 + fibre);
        float a = clamp((sharp + bleed) * reveal, 0.0, 1.0) * 0.9;
        gl_FragColor = vec4(uColor * uShade, a);
      }
    `,
  });
}

// ---------------------------------------------------------------------------

export async function createEvidenceScene(
  canvas: HTMLCanvasElement,
  options: EvidenceSceneOptions,
): Promise<EvidenceScene> {
  const high = options.tier === "high";
  const renderer = new WebGLRenderer({ canvas, antialias: high, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const [cotton, manilaImg] = await Promise.all([loadImage(options.images.cotton), loadImage(options.images.manila)]);
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const paper = drawPaper(
    options.records,
    options.fonts,
    { cotton, manila: manilaImg },
    { sheetWidth: high ? 1024 : 640, anisotropy },
  );

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  // Lights: soft key from camera-left, warm rim from behind-right, a little sky fill.
  const key = new DirectionalLight("#fff6ea", 2.4);
  key.position.set(-0.7, 1.25, 0.55);
  key.castShadow = true;
  key.shadow.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024);
  key.shadow.camera.left = -0.7;
  key.shadow.camera.right = 0.7;
  key.shadow.camera.top = 0.7;
  key.shadow.camera.bottom = -0.7;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 4;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.002;
  key.shadow.radius = 4;
  const rim = new DirectionalLight("#ffd9a8", 1.1);
  rim.position.set(0.9, 0.6, -0.9);
  const fill = new HemisphereLight("#f4efe4", "#b8ab92", 0.5);
  scene.add(key, key.target, rim, fill);

  // Shadow catcher: the page itself is the table.
  const table = new Mesh(new PlaneGeometry(6, 6), new ShadowMaterial({ color: new Color("#3b2c18"), opacity: 0.2 }));
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = true;
  scene.add(table);

  const world = new Group();
  scene.add(world);

  const materials: Material[] = [];
  const geometries: BufferGeometry[] = [];
  const track = <T extends Material>(m: T) => (materials.push(m), m);
  const geo = <T extends BufferGeometry>(g: T) => (geometries.push(g), g);

  const paperMat = (map: Texture) =>
    track(
      new MeshPhysicalMaterial({
        map,
        roughness: 0.92,
        metalness: 0,
        sheen: 0.4,
        sheenRoughness: 0.9,
        sheenColor: new Color("#ffffff"),
        side: DoubleSide,
        bumpMap: paper.cottonTile,
        bumpScale: 0.6,
      }),
    );

  type Item = { obj: Object3D; keys: Key[] };
  const items: Item[] = [];
  const add = (obj: Object3D, keys: Key[]) => {
    obj.traverse((o) => {
      if ((o as Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    world.add(obj);
    items.push({ obj, keys });
    return obj;
  };

  // Folder at S2+ sits at the origin; the stack sits on its back board.
  const FILE_X = 1.15; // how far the file slides out at S6
  const stackY = (i: number) => FOLDER.t + 0.0012 + i * 0.0011;
  const out = (p: [number, number, number]): [number, number, number] => [p[0] + FILE_X, p[1], p[2] - 0.05];

  // --- Sheets --------------------------------------------------------------------
  const sheets: Array<{ map: Texture; s0: Key["p"]; r0: number; stack: number; fan: [number, number] }> = [
    { map: paper.notice, s0: [0.05, 0.004, -0.02], r0: 0.32, stack: 5, fan: [0, 0] },
    { map: paper.logins, s0: [0.2, 0.002, 0.07], r0: -0.4, stack: 4, fan: [0.012, -0.018] },
    { map: paper.usage, s0: [-0.07, 0.003, -0.13], r0: 0.9, stack: 3, fan: [0.024, -0.036] },
    { map: paper.ticket, s0: [0.25, 0.0025, -0.15], r0: -1.1, stack: 2, fan: [0.036, -0.054] },
  ];
  sheets.forEach((s, i) => {
    const mesh = new Mesh(geo(sheetGeometry(A4.w, A4.h, 0.35 + i * 0.12)), paperMat(s.map));
    const isNotice = i === 0;
    const stacked: Key["p"] = [s.fan[0], stackY(s.stack), s.fan[1]];
    const squared: Key["p"] = [0, stackY(s.stack), 0];
    add(mesh, [
      { t: 0, p: s.s0, r: [0, s.r0, 0] },
      ...(isNotice
        ? [
            { t: 0.75, p: [0.0, 0.17, 0.1] as Key["p"], r: [1.05, 0, 0] as Key["r"] },
            { t: 1.25, p: [0.0, 0.17, 0.1] as Key["p"], r: [1.05, 0, 0] as Key["r"] },
          ]
        : [{ t: 1.0 + i * 0.12, p: s.s0, r: [0, s.r0, 0] as Key["r"] }]),
      { t: 2, p: stacked, r: [0, 0, 0] },
      { t: 3.4, p: stacked, r: [0, 0, 0] },
      { t: 3.85, p: squared, r: [0, 0, 0] },
      { t: 5, p: squared, r: [0, 0, 0] },
      { t: 6, p: out(squared), r: [0, 0.15, 0] },
    ]);
  });

  // --- Receipts ------------------------------------------------------------------
  const receiptGeo = geo(receiptGeometry(0.075, 0.24));
  [
    { map: paper.receipt, s0: [-0.13, 0.002, 0.12] as Key["p"], r0: 1.25, stack: 7, on: [-0.03, 0.02] },
    { map: paper.priorReceipt, s0: [0.3, 0.002, -0.02] as Key["p"], r0: -0.2, stack: 6, on: [0.05, -0.01] },
  ].forEach((r, i) => {
    const mesh = new Mesh(receiptGeo, paperMat(r.map));
    const onStack: Key["p"] = [r.on[0], stackY(r.stack), r.on[1]];
    const squared: Key["p"] = [0.02 * i, stackY(r.stack), 0];
    add(mesh, [
      { t: 0, p: r.s0, r: [0, r.r0, 0] },
      { t: 1.2, p: r.s0, r: [0, r.r0, 0] },
      { t: 2.1, p: onStack, r: [0, 0.35 - i * 0.6, 0] },
      { t: 3.4, p: onStack, r: [0, 0.35 - i * 0.6, 0] },
      { t: 3.85, p: squared, r: [0, Math.PI / 2, 0] },
      { t: 5, p: squared, r: [0, Math.PI / 2, 0] },
      { t: 6, p: out(squared), r: [0, Math.PI / 2 + 0.15, 0] },
    ]);
  });

  // --- Glassine envelope -------------------------------------------------------
  {
    const envelope = new Group();
    const card = new Mesh(geo(sheetGeometry(0.13, 0.085, 0.2, 6)), paperMat(paper.cottonTile));
    card.position.y = 0.0006;
    const glassMat = high
      ? track(
          new MeshPhysicalMaterial({
            color: "#f4f1ea",
            roughness: 0.5,
            transmission: 0.82,
            thickness: 0.0008,
            ior: 1.45,
            side: DoubleSide,
          }),
        )
      : track(
          new MeshStandardMaterial({
            color: "#f4f1ea",
            roughness: 0.6,
            transparent: true,
            opacity: 0.55,
            side: DoubleSide,
          }),
        );
    const glass = new Mesh(geo(sheetGeometry(0.15, 0.1, 0.25, 6)), glassMat);
    glass.position.y = 0.0016;
    glass.castShadow = false;
    envelope.add(card, glass);
    const sq: Key["p"] = [0.03, stackY(8), 0.08];
    add(envelope, [
      { t: 0, p: [-0.24, 0.002, -0.02], r: [0, 0.2, 0] },
      { t: 1.6, p: [-0.24, 0.002, -0.02], r: [0, 0.2, 0] },
      { t: 2.3, p: [0.03, stackY(8), 0.08], r: [0, -0.1, 0] },
      { t: 3.85, p: sq, r: [0, 0, 0] },
      { t: 5, p: sq, r: [0, 0, 0] },
      { t: 6, p: out(sq), r: [0, 0.15, 0] },
    ]);
  }

  // --- Kraft tags on waxed string -------------------------------------------------
  const tagW = 0.05;
  const tagH = 0.1;
  const tagGeo = geo(tagGeometry(tagW, tagH));
  const stringMat = track(new MeshStandardMaterial({ color: "#e6dcc4", roughness: 0.75 }));
  paper.tags.forEach((map, i) => {
    const g = new Group();
    const mesh = new Mesh(
      tagGeo,
      track(new MeshStandardMaterial({ map, roughness: 0.85, bumpMap: paper.cottonTile, bumpScale: 0.8 })),
    );
    g.add(mesh);
    // a loop of string through the hole (hole at -z in the flat tag)
    const hz = -(tagH / 2 - tagW * 0.2);
    const loop = new CatmullRomCurve3(
      [
        new Vector3(0, 0.0008, hz),
        new Vector3(0.008, 0.004, hz - 0.012),
        new Vector3(0.002, 0.003, hz - 0.045),
        new Vector3(-0.02, 0.002, hz - 0.075),
        new Vector3(-0.045, 0.0015, hz - 0.08),
      ],
      false,
    );
    g.add(new Mesh(geo(new TubeGeometry(loop, 40, 0.0011, 6, false)), stringMat));
    const scatter: Key["p"][] = [
      [0.13, 0.006, 0.14],
      [-0.02, 0.006, 0.17],
      [0.32, 0.006, 0.1],
    ];
    const row: Key["p"] = [-0.075 + i * 0.075, 0.055, 0.12];
    const inFile: Key["p"] = [-0.06 + i * 0.05, stackY(9), 0.05];
    add(g, [
      { t: 0, p: scatter[i], r: [0, 0.6 - i * 0.9, 0] },
      { t: 2.2, p: scatter[i], r: [0, 0.6 - i * 0.9, 0] },
      { t: 2.75 + i * 0.08, p: row, r: [Math.PI / 2 - 0.12, 0, 0] },
      { t: 3.3, p: row, r: [Math.PI / 2 - 0.12, 0, 0] },
      { t: 3.75, p: inFile, r: [0, 0.2, 0] },
      { t: 5, p: inFile, r: [0, 0.2, 0] },
      { t: 6, p: out(inFile), r: [0, 0.35, 0] },
    ]);
  });

  // --- Manila folder with a hinged cover and the ink decal ---------------------
  const manilaMat = track(
    new MeshStandardMaterial({ map: paper.manila, roughness: 0.82, bumpMap: paper.manila, bumpScale: 0.5 }),
  );
  paper.manila.repeat.set(1, 1.3);
  const folder = new Group();
  const back = new Mesh(geo(new BoxGeometry(FOLDER.w, FOLDER.t, FOLDER.h)), manilaMat);
  back.position.y = FOLDER.t / 2;
  const tab = new Mesh(geo(new BoxGeometry(0.07, FOLDER.t, 0.025)), manilaMat);
  tab.position.set(0.06, FOLDER.t / 2, -FOLDER.h / 2 - 0.0125);
  const hinge = new Group();
  hinge.position.set(-FOLDER.w / 2, stackY(10), 0);
  const cover = new Mesh(geo(new BoxGeometry(FOLDER.w, FOLDER.t, FOLDER.h)), manilaMat);
  cover.position.set(FOLDER.w / 2, FOLDER.t / 2, 0);
  const inkDecal = new Mesh(geo(new PlaneGeometry(0.12, 0.12)), track(inkMaterial(paper.sealMask, paper.cottonTile)));
  inkDecal.rotation.x = -Math.PI / 2;
  inkDecal.position.set(FOLDER.w / 2 + 0.01, FOLDER.t + 0.0004, 0.02);
  inkDecal.castShadow = false;
  hinge.add(cover, inkDecal);
  folder.add(back, tab, hinge);
  add(folder, [
    { t: 0, p: [-0.16, 0, 0.04], r: [0, -0.38, 0] },
    { t: 1.1, p: [-0.16, 0, 0.04], r: [0, -0.38, 0] },
    { t: 1.9, p: [0, 0, 0], r: [0, 0, 0] },
    { t: 5, p: [0, 0, 0], r: [0, 0, 0] },
    { t: 6, p: [FILE_X, 0, -0.05], r: [0, 0.15, 0] },
  ]);
  inkDecal.receiveShadow = false;

  // --- Brass seal stamp -------------------------------------------------------------
  const seal = new Group();
  const brass = track(
    new MeshPhysicalMaterial({
      color: "#a8834a",
      metalness: 1,
      roughness: 0.32,
      clearcoat: 0.25,
      clearcoatRoughness: 0.4,
    }),
  );
  const ebony = track(new MeshStandardMaterial({ color: "#1a1714", roughness: 0.45, metalness: 0 }));
  const basePts = [
    [0, 0],
    [0.034, 0],
    [0.035, 0.002],
    [0.035, 0.012],
    [0.03, 0.016],
    [0.013, 0.02],
    [0.011, 0.03],
    [0, 0.03],
  ].map(([x, y]) => new Vector2(x, y));
  const handlePts = [
    [0, 0.028],
    [0.012, 0.028],
    [0.009, 0.045],
    [0.012, 0.07],
    [0.021, 0.093],
    [0.02, 0.106],
    [0.012, 0.114],
    [0, 0.116],
  ].map(([x, y]) => new Vector2(x, y));
  seal.add(
    new Mesh(geo(new LatheGeometry(basePts, 48)), brass),
    new Mesh(geo(new LatheGeometry(handlePts, 48)), ebony),
  );
  const press = stackY(10) + FOLDER.t + 0.0004;
  add(seal, [
    { t: 0, p: [0.42, 0, -0.2], r: [0, 0, 0] },
    { t: 3.6, p: [0.42, 0, -0.2], r: [0, 0, 0] },
    { t: 4.15, p: [0.01, 0.12, 0.02], r: [0.05, 0, -0.05] },
    { t: 4.45, p: [0.01, press, 0.02], r: [0, 0, 0] },
    { t: 4.62, p: [0.01, press - 0.0006, 0.02], r: [0, 0, 0] },
    { t: 4.95, p: [0.09, 0.11, -0.03], r: [-0.15, 0, 0.2] },
    { t: 5.5, p: [0.36, 0, -0.22], r: [0, 0, 0] },
  ]);

  // ---------------------------------------------------------------------------
  // Camera: Catmull-Rom path through one position per state; targets eased.

  const camera = new PerspectiveCamera(30, 1, 0.02, 20);
  const camKeys: Array<{ pos: [number, number, number]; target: [number, number, number]; anchor: number }> = [
    { pos: [0.05, 0.78, 0.78], target: [0.04, 0, 0], anchor: 0.7 },
    { pos: [0.04, 0.44, 0.66], target: [0.0, 0.11, 0.06], anchor: 0.7 },
    { pos: [0.18, 0.66, 0.52], target: [0.0, 0.0, 0.0], anchor: 0.69 },
    { pos: [0.0, 0.2, 0.56], target: [0.0, 0.055, 0.1], anchor: 0.69 },
    { pos: [-0.22, 0.6, 0.5], target: [0.0, 0.0, 0.0], anchor: 0.68 },
    { pos: [0.08, 0.46, 0.34], target: [0.01, 0.01, 0.02], anchor: 0.66 },
    { pos: [0.55, 0.7, 0.62], target: [0.75, 0.0, -0.02], anchor: 0.55 },
  ];
  const camPath = new CatmullRomCurve3(
    camKeys.map((k) => new Vector3(...k.pos)),
    false,
    "catmullrom",
    0.4,
  );
  const tmpTarget = new Vector3();
  const tmpA = new Vector3();
  const tmpB = new Vector3();

  let width = 1;
  let height = 1;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, options.maxPixelRatio);
  let portrait = false;

  function resize(w: number, h: number) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    portrait = width / height < 0.85;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = portrait ? 46 : 30;
    camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------------------
  // Loop

  const target = { progress: 0, opacity: 1 };
  const current = { progress: 0, opacity: 0 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, active: false };
  const tmpP = new Vector3();
  const tmpQ = new Quaternion();
  let running = false;
  let raf = 0;
  let last = 0;
  let frames = 0;
  let firstFrame = false;
  let degraded = false;
  let gaveUp = false;
  const frameTimes: number[] = [];
  const decalMat = inkDecal.material as ShaderMaterial;

  function apply(p: number) {
    for (const item of items) {
      samplePose(item.keys, p, tmpP, tmpQ);
      item.obj.position.copy(tmpP);
      item.obj.quaternion.copy(tmpQ);
    }
    // Folder cover: open flat to the left until the dossier closes it.
    hinge.rotation.z = MathUtils.lerp(Math.PI, 0, smooth(3.55, 3.95, p));
    decalMat.uniforms.uInk.value = smooth(4.5, 4.95, p);

    // Camera along its path; the anchor shifts the subject off-centre for the copy.
    const u = MathUtils.clamp(p / STATES, 0, 1);
    camPath.getPoint(u, camera.position);
    const i = Math.min(STATES - 1, Math.floor(p));
    const k = smooth(0, 1, p - i);
    const a = camKeys[i];
    const b = camKeys[Math.min(STATES, i + 1)];
    tmpTarget.lerpVectors(tmpA.set(...a.target), tmpB.set(...b.target), k);
    camera.lookAt(tmpTarget);
    const anchor = MathUtils.lerp(a.anchor, b.anchor, k);
    if (portrait) camera.setViewOffset(width, height, 0, height * 0.14, width, height);
    else camera.setViewOffset(width, height, -(anchor - 0.5) * width, 0, width, height);
  }

  function degrade() {
    degraded = true;
    pixelRatio = 1;
    key.castShadow = false;
    renderer.shadowMap.needsUpdate = true;
    resize(width, height);
    options.onDegrade?.("reduced");
  }

  function frame(now: number) {
    raf = -1; // inside a frame: callbacks fired from here cannot start a second loop
    if (!running) {
      raf = 0;
      return;
    }
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
    last = now;

    if (!gaveUp) {
      frameTimes.push(dt);
      if (frameTimes.length === 90) {
        const median = [...frameTimes].sort((x, y) => x - y)[45];
        frameTimes.length = 0;
        if (!degraded && median > 1 / 45) degrade();
        else if (degraded && median > 1 / 30) {
          gaveUp = true;
          options.onDegrade?.("off");
        }
      }
    }

    current.progress += (target.progress - current.progress) * (1 - Math.exp(-dt * 6));
    current.opacity += (target.opacity - current.opacity) * (1 - Math.exp(-dt * 6));
    if (Math.abs(target.progress - current.progress) < 0.0005) current.progress = target.progress;

    // Spring-damped pointer tilt.
    const stiffness = 40;
    const damping = 9;
    pointer.vx += ((pointer.active ? pointer.tx : 0) - pointer.x) * stiffness * dt - pointer.vx * damping * dt;
    pointer.vy += ((pointer.active ? pointer.ty : 0) - pointer.y) * stiffness * dt - pointer.vy * damping * dt;
    pointer.x += pointer.vx * dt;
    pointer.y += pointer.vy * dt;
    world.rotation.set(pointer.y * 0.045, pointer.x * 0.07, 0);

    if (current.opacity < 0.003 && target.opacity === 0) {
      current.opacity = 0;
      renderer.clear();
      canvas.style.opacity = "0";
      last = 0;
      raf = 0;
      return;
    }

    apply(current.progress);
    canvas.style.opacity = current.opacity.toFixed(3);
    renderer.render(scene, camera);
    frames++;
    options.onFrame?.(frames, current.progress);
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
    setTarget(progress, opacity) {
      target.progress = MathUtils.clamp(progress, 0, STATES);
      target.opacity = MathUtils.clamp(opacity, 0, 1);
      if (target.opacity > 0) kick();
    },
    setPointer(x, y, active) {
      pointer.tx = x;
      pointer.ty = y;
      pointer.active = active;
    },
    resize,
    setRunning(next) {
      running = next;
      if (next) kick();
      else if (raf > 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    snapshot() {
      current.progress = target.progress;
      apply(current.progress);
      renderer.render(scene, camera);
      return canvas.toDataURL("image/png");
    },
    dispose() {
      running = false;
      if (raf > 0) cancelAnimationFrame(raf);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      Object.values(paper)
        .flat()
        .forEach((t) => (t as Texture).dispose());
      env.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
