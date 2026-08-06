/* ============================================================
   scene-transitions.js — persistent Three.js transition engine
   One canvas, one renderer, one particle system, alive for the
   whole SPA session. Never torn down between routes/sections —
   only its formation, color and camera framing change.

   Public API (see bottom): initScene, morphTo, pulseAt,
   setReducedMotion, destroy-free by design.
   ============================================================ */
import * as THREE from "./vendor/three/three.module.min.js";

const ACCENT = { r: 0x25 / 255, g: 0x63 / 255, b: 0xeb / 255 };   // #2563eb
const WARM   = { r: 0xff / 255, g: 0xb5 / 255, b: 0x45 / 255 };   // #ffb545
const WHITE  = { r: 1, g: 1, b: 1 };

let renderer, scene, camera, points, geometry;
let posAttr, colAttr;
let particleCount = 0;
let running = false;
let rafId = null;
let clock;
let reducedMotion = false;
let currentFormation = "starfield";
let activeTweens = 0;
let bursts = []; // transient spark effects

/* ---------- sprite texture (soft round dot) ------------------ */
function makeSpriteTexture() {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* ---------- viewport-scaled world size at z=0 ----------------- */
function visibleSizeAtZ0() {
  const dist = camera.position.z;
  const vFov = (camera.fov * Math.PI) / 180;
  const height = 2 * Math.tan(vFov / 2) * dist;
  const width = height * camera.aspect;
  return { width, height };
}

/* ---------- formation generators ------------------------------
   Each returns Float32Array positions (n*3). Colors handled
   separately by mixColors() so hue can change independently of
   shape during a morph. */
function formationStarfield(n) {
  const { width, height } = visibleSizeAtZ0();
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const i3 = i * 3;
    out[i3] = (Math.random() - 0.5) * width * 1.3;
    out[i3 + 1] = (Math.random() - 0.5) * height * 1.3;
    out[i3 + 2] = (Math.random() - 0.5) * 500 - 150;
  }
  return out;
}

function formationGrid(n) {
  const { width, height } = visibleSizeAtZ0();
  const w = width * 0.82;
  const h = height * 0.72;
  const cols = Math.round(Math.sqrt((n * w) / h)) || 1;
  const rows = Math.ceil(n / cols);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const i3 = i * 3;
    const cx = i % cols;
    const ry = Math.floor(i / cols);
    const jitter = Math.min(w / cols, h / rows) * 0.18;
    out[i3] = (cx / (cols - 1 || 1) - 0.5) * w + (Math.random() - 0.5) * jitter;
    out[i3 + 1] = (ry / (rows - 1 || 1) - 0.5) * h + (Math.random() - 0.5) * jitter;
    out[i3 + 2] = (Math.random() - 0.5) * 120;
  }
  return out;
}

function formationRings(n) {
  const { width, height } = visibleSizeAtZ0();
  const maxR = Math.min(width, height) * 0.46;
  const ringCount = 5;
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const i3 = i * 3;
    const ring = i % ringCount;
    const r = maxR * ((ring + 1) / ringCount) + (Math.random() - 0.5) * 14;
    const a = Math.random() * Math.PI * 2;
    out[i3] = Math.cos(a) * r;
    out[i3 + 1] = Math.sin(a) * r * 0.62;
    out[i3 + 2] = (ring - ringCount / 2) * 24 + (Math.random() - 0.5) * 20;
  }
  return out;
}

function formationHelix(n) {
  const { width, height } = visibleSizeAtZ0();
  const R = Math.min(width, height) * 0.22;
  const H = height * 0.85;
  const turns = 3.2;
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const i3 = i * 3;
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    const r = R * (0.55 + 0.45 * Math.sin(t * Math.PI));
    out[i3] = Math.cos(a) * r + (Math.random() - 0.5) * 8;
    out[i3 + 1] = (t - 0.5) * H;
    out[i3 + 2] = Math.sin(a) * r + (Math.random() - 0.5) * 8;
  }
  return out;
}

function formationCover(n) {
  const R = 260;
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const i3 = i * 3;
    const r = R * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    out[i3] = r * Math.sin(phi) * Math.cos(theta);
    out[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    out[i3 + 2] = r * Math.cos(phi) * 0.6;
  }
  return out;
}

const FORMATIONS = {
  starfield: formationStarfield,
  home: formationStarfield,
  featured: formationRings,
  projects: formationGrid,
  tools: formationRings,
  about: formationHelix,
  cover: formationCover,
};

const ROUTE_COLOR = {
  home: [ACCENT, WHITE],
  featured: [ACCENT, WHITE],
  projects: [ACCENT, WHITE],
  tools: [ACCENT, WHITE],
  about: [WARM, WHITE],
  cover: [ACCENT, WARM],
};

function buildColors(n, [a, b]) {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const i3 = i * 3;
    const m = Math.random() * 0.75;
    out[i3] = a.r + (b.r - a.r) * m;
    out[i3 + 1] = a.g + (b.g - a.g) * m;
    out[i3 + 2] = a.b + (b.b - a.b) * m;
  }
  return out;
}

/* ---------- easing ------------------------------------------- */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ---------- init ------------------------------------------------ */
export function initScene(canvas) {
  const count = window.innerWidth < 700 ? 700 : 1700;
  particleCount = count;

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 3000);
  camera.position.set(0, 0, 620);
  camera.lookAt(0, 0, 0);

  const positions = formationStarfield(count);
  const colors = buildColors(count, ROUTE_COLOR.home);

  geometry = new THREE.BufferGeometry();
  posAttr = new THREE.BufferAttribute(positions, 3);
  colAttr = new THREE.BufferAttribute(colors, 3);
  geometry.setAttribute("position", posAttr);
  geometry.setAttribute("color", colAttr);

  const material = new THREE.PointsMaterial({
    size: 6,
    map: makeSpriteTexture(),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  points = new THREE.Points(geometry, material);
  scene.add(points);

  clock = new THREE.Clock(false);

  window.addEventListener("resize", onResize, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopLoop();
    else if (activeTweens > 0 || bursts.length) startLoop();
  });

  renderer.render(scene, camera);
}

function onResize() {
  if (!renderer) return;
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  if (!running) renderer.render(scene, camera);
}

export function setReducedMotion(v) {
  reducedMotion = !!v;
}

/* ---------- render loop, only alive while something animates -- */
function startLoop() {
  if (running) return;
  running = true;
  clock.start();
  const tick = () => {
    if (!running) return;
    const t = clock.getElapsedTime();
    if (!reducedMotion) {
      points.rotation.y = Math.sin(t * 0.05) * 0.08;
      points.rotation.x = Math.sin(t * 0.07) * 0.03;
    }
    updateBursts();
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

function stopLoop() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  clock.stop();
}

function maybeStop() {
  if (activeTweens === 0 && bursts.length === 0) stopLoop();
}

/* ---------- morphTo: tween the whole particle system ---------- */
export function morphTo(routeKey, { duration = 900 } = {}) {
  if (!geometry) return Promise.resolve();
  const gen = FORMATIONS[routeKey] || formationStarfield;
  const toPos = gen(particleCount);
  const toColorPair = ROUTE_COLOR[routeKey] || ROUTE_COLOR.home;
  const toCol = buildColors(particleCount, toColorPair);
  const fromPos = posAttr.array.slice();
  const fromCol = colAttr.array.slice();
  currentFormation = routeKey;

  if (reducedMotion) {
    posAttr.array.set(toPos);
    colAttr.array.set(toCol);
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    renderer.render(scene, camera);
    return Promise.resolve();
  }

  startLoop();
  activeTweens++;
  const start = performance.now();

  return new Promise((resolve) => {
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const e = easeInOutCubic(t);
      for (let i = 0; i < fromPos.length; i++) {
        posAttr.array[i] = fromPos[i] + (toPos[i] - fromPos[i]) * e;
      }
      for (let i = 0; i < fromCol.length; i++) {
        colAttr.array[i] = fromCol[i] + (toCol[i] - fromCol[i]) * e;
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        activeTweens--;
        maybeStop();
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

/* ---------- pulseAt: small spark burst near a screen point ---- */
export function pulseAt(clientX, clientY, { warm = false } = {}) {
  if (!scene || reducedMotion) return;
  const nx = (clientX / window.innerWidth) * 2 - 1;
  const ny = -(clientY / window.innerHeight) * 2 + 1;
  const vec = new THREE.Vector3(nx, ny, 0.5).unproject(camera);
  const dir = vec.sub(camera.position).normalize();
  const dist = -camera.position.z / dir.z;
  const origin = camera.position.clone().add(dir.multiplyScalar(dist));

  const n = 90;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const velocities = new Float32Array(n * 3);
  const pair = warm ? [WARM, WHITE] : [ACCENT, WHITE];
  for (let i = 0; i < n; i++) {
    const i3 = i * 3;
    positions[i3] = origin.x;
    positions[i3 + 1] = origin.y;
    positions[i3 + 2] = origin.z;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = 90 + Math.random() * 140;
    velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed;
    velocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
    velocities[i3 + 2] = Math.cos(phi) * speed * 0.4;
    const m = Math.random();
    colors[i3] = pair[0].r + (pair[1].r - pair[0].r) * m;
    colors[i3 + 1] = pair[0].g + (pair[1].g - pair[0].g) * m;
    colors[i3 + 2] = pair[0].b + (pair[1].b - pair[0].b) * m;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 7,
    map: makeSpriteTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const mesh = new THREE.Points(geo, mat);
  scene.add(mesh);

  bursts.push({ mesh, geo, mat, velocities, start: performance.now(), life: 750 });
  startLoop();
}

function updateBursts() {
  if (!bursts.length) return;
  const now = performance.now();
  bursts = bursts.filter((b) => {
    const t = (now - b.start) / b.life;
    if (t >= 1) {
      scene.remove(b.mesh);
      b.geo.dispose();
      b.mat.dispose();
      return false;
    }
    const dt = 1 / 60;
    const pos = b.geo.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i] += b.velocities[i] * dt;
      pos[i + 1] += b.velocities[i + 1] * dt;
      pos[i + 2] += b.velocities[i + 2] * dt;
    }
    b.geo.attributes.position.needsUpdate = true;
    b.mat.opacity = 1 - easeInOutCubic(t);
    return true;
  });
  if (!bursts.length) maybeStop();
}

export function getCurrentFormation() {
  return currentFormation;
}
