// ─────────────────────────────────────────────────────────────────────────────
// sggandhi.com — a dreamy purple dreamscape you pan across as you scroll.
// Lilac sky, a huge soft moon, floating arches / monoliths / layered discs
// receding into fog. Original Three.js scene, no external assets.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Debug: ?p=0.5 pins the pan for tuning/screenshots.
const forcedP = (() => {
  const v = new URLSearchParams(location.search).get('p');
  return v === null ? null : clamp01(parseFloat(v));
})();

const scrollEl = document.getElementById('scroll');
function progress() {
  if (forcedP !== null) return forcedP;
  const total = scrollEl.offsetHeight - window.innerHeight;
  return clamp01(window.scrollY / (total || 1));
}

// ── palette (duotone lilac / pink / cream) ──
const C = {
  lilac:  0xb7a6ee,
  purple: 0x6f5bc4,
  pink:   0xe4a6cf,
  cream:  0xf3e8df,
  deep:   0x4b3a86,
  moon:   0xf6eefc,
};

// ── renderer / scene / camera ──
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = skyTexture();
scene.fog = new THREE.Fog(0xcaa9dd, 16, 62);

const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
camera.position.set(0, 1.6, 12);

// ── lights ──
scene.add(new THREE.HemisphereLight(0xd9ccff, 0xe7b9cf, 1.05));
const key = new THREE.DirectionalLight(0xfff0f6, 1.15);
key.position.set(-8, 12, 6);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9a7de0, 0.6);
rim.position.set(10, 4, -8);
scene.add(rim);

// ── sky gradient as a background texture ──
function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 256;
  const g = c.getContext('2d').createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0.0, '#8a7fe0');
  g.addColorStop(0.45, '#a992dd');
  g.addColorStop(0.78, '#d7abcf');
  g.addColorStop(1.0, '#f2cdd4');
  const ctx = c.getContext('2d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ── soft moon (glowing sprite) ──
function moonSprite() {
  const s = 256, c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s/2, s/2, s*0.12, s/2, s/2, s*0.5);
  g.addColorStop(0, 'rgba(246,238,252,1)');
  g.addColorStop(0.45, 'rgba(240,225,248,0.9)');
  g.addColorStop(0.75, 'rgba(220,190,235,0.25)');
  g.addColorStop(1, 'rgba(220,190,235,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  spr.scale.set(16, 16, 1);
  spr.position.set(30, 12, -46);
  return spr;
}
scene.add(moonSprite());

// ── ground ──
{
  const geo = new THREE.PlaneGeometry(300, 200, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0xecccd6, roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(geo, mat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.2;
  scene.add(ground);
}

// ── object factories ──
const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...opts });

function arch(color, scale = 1) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.34, 20, 40, Math.PI), mat(color));
  ring.position.y = 1.55; g.add(ring);
  for (const sx of [-1.6, 1.6]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.6, 24), mat(color));
    leg.position.set(sx, 0.75, 0); g.add(leg);
  }
  g.scale.setScalar(scale);
  return g;
}

function monolith(color, h = 4) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, h, 1), mat(color));
  m.position.y = h / 2 - 2.2 + 0.001;
  m.rotation.y = Math.PI * 0.12;
  return m;
}

function discStack(colors) {
  const g = new THREE.Group();
  colors.forEach((col, i) => {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(1.15 - i * 0.06, 1.15 - i * 0.06, 0.16, 10), mat(col, { roughness: 0.5, metalness: 0.15 }));
    d.position.y = i * 0.3;
    d.rotation.y = i * 0.22;
    g.add(d);
  });
  g.userData.spin = true;
  g.userData.bob = Math.random() * Math.PI * 2;
  return g;
}

function cactus(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 2, 6, 12), mat(color));
  body.position.y = -0.4; g.add(body);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.8, 6, 10), mat(color));
    arm.position.set(s * 0.5, 0.1, 0); arm.rotation.z = s * 0.5; g.add(arm);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.6, 6, 10), mat(color));
    up.position.set(s * 0.8, 0.7, 0); g.add(up);
  }
  return g;
}

// ── lay out the world along +X ──
const floaters = [];
function place(obj, x, z, y = 0) { obj.position.x = x; obj.position.z = z; obj.position.y += y; scene.add(obj); return obj; }

floaters.push(place(discStack([C.pink, C.lilac, C.cream, C.purple, C.pink]), 3, -6, 1.6));
place(arch(C.cream, 1.1), 9, -11);
place(monolith(C.lilac, 5), 13.4, -15);
place(monolith(C.deep, 3), 15, -15.6);
place(cactus(C.purple), 19, -7.5);
place(cactus(C.deep), 20.6, -8.2);
place(arch(C.pink, 1.5), 27, -13);
floaters.push(place(discStack([C.cream, C.pink, C.lilac, C.purple]), 34, -7, 1.9));
place(monolith(C.pink, 6), 40, -17);
place(monolith(C.lilac, 4), 41.6, -16);
place(arch(C.cream, 1.2), 47, -10);
place(cactus(C.purple), 51, -8);
floaters.push(place(discStack([C.pink, C.cream, C.lilac]), 55, -12, 2.2));

// ── dust / stars ──
{
  const n = 260, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i*3] = (Math.random() - 0.2) * 90;
    pos[i*3+1] = Math.random() * 26 + 2;
    pos[i*3+2] = -Math.random() * 55 - 5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xfbeffb, size: 0.09, transparent: true, opacity: 0.7, depthWrite: false, fog: false }));
  scene.add(pts);
}

// ── camera pan ──
const CAM_START = 0, CAM_END = 52;

// ── cursor parallax ──
let mx = 0, my = 0, tmx = 0, tmy = 0;
addEventListener('mousemove', (e) => {
  tmx = (e.clientX / innerWidth - 0.5);
  tmy = (e.clientY / innerHeight - 0.5);
});

// ── chat bubbles ──
const bubbles = [...document.querySelectorAll('.bubble')];
const cueEl = document.querySelector('.scroll-cue');

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

let t0 = performance.now();
function frame(now) {
  const time = (now - t0) / 1000;
  const p = easeInOut(progress());

  // pan the camera across the world
  const camX = lerp(CAM_START, CAM_END, p);
  camera.position.x = camX;

  // cursor parallax (smoothed)
  mx += (tmx - mx) * 0.05;
  my += (tmy - my) * 0.05;
  camera.position.y = 1.6 - my * 0.8 + (reduce ? 0 : Math.sin(time * 0.5) * 0.08);
  camera.lookAt(camX + mx * 2.2, 1.2 - my * 0.6, -10);

  // idle life
  if (!reduce) {
    for (const f of floaters) {
      if (f.userData.spin) f.rotation.y += 0.004;
      f.position.y = (f.position.y || 0);
      f.children.forEach((c, i) => {}); // keep
    }
    floaters.forEach((f) => { f.rotation.z = Math.sin(time * 0.4 + f.userData.bob) * 0.05; });
  }

  // reveal bubbles by scroll threshold
  const raw = progress();
  bubbles.forEach((b) => b.classList.toggle('show', raw >= parseFloat(b.dataset.at) && raw <= parseFloat(b.dataset.at) + 0.22));

  // fade scroll cue
  cueEl.style.opacity = String(clamp01(1 - raw / 0.12));

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
