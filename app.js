// ─────────────────────────────────────────────────────────────────────────────
// sggandhi.com — liquid chrome studio.
// A single glossy mercury-like form floating in a dark void, morphing with time
// and twisting as you scroll. Real studio reflections (RoomEnvironment), accent
// rim lights. Original Three.js — nothing borrowed.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, t) => a + (b - a) * t;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

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

// ── renderer / scene / camera ──
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, 6);

// studio reflections (bright neutral room) — makes the metal read as chrome
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// accent rim lights — one cool, one warm — for colored highlights on the chrome
const cool = new THREE.PointLight(0x5b8cff, 40, 40);
cool.position.set(-5, 3, 4); scene.add(cool);
const warm = new THREE.PointLight(0xff8a4c, 26, 40);
warm.position.set(5, -3, 3); scene.add(warm);
scene.add(new THREE.AmbientLight(0x404052, 0.6));

// ── the liquid chrome form ──
const SNOISE = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy; i=mod(i,289.0);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const geo = new THREE.IcosahedronGeometry(1.6, 48);
const mat = new THREE.MeshStandardMaterial({ color: 0xdfe2ea, metalness: 1.0, roughness: 0.12 });
let shaderRef = null;
mat.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = { value: 0 };
  shader.uniforms.uAmp  = { value: 0.18 };
  shader.uniforms.uFreq = { value: 1.5 };
  shader.vertexShader = `
    uniform float uTime; uniform float uAmp; uniform float uFreq;
    ${SNOISE}
  ` + shader.vertexShader.replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
     float t = uTime * 0.22;
     // two smooth octaves of noise → gentle mercury undulation, always rounded
     float n  = snoise(vec3(position * uFreq + vec3(0.0, t, 0.0)));
     float n2 = snoise(vec3(position * (uFreq * 1.9) - vec3(t * 0.6)));
     float d = n * uAmp + n2 * uAmp * 0.3;
     transformed += normal * d;
    `
  );
  shaderRef = shader;
};
const blob = new THREE.Mesh(geo, mat);
scene.add(blob);

// ── cursor parallax ──
let tmx = 0, tmy = 0, mx = 0, my = 0;
addEventListener('mousemove', (e) => {
  tmx = e.clientX / innerWidth - 0.5;
  tmy = e.clientY / innerHeight - 0.5;
});

// ── caption crossfade ──
const caps = [...document.querySelectorAll('.caption span')];
const cueEl = document.querySelector('.scroll-cue');

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const t0 = performance.now();
function frame(now) {
  const time = (now - t0) / 1000;
  const p = progress();

  // morph + twist — stays a rounded liquid sphere throughout
  if (shaderRef) {
    shaderRef.uniforms.uTime.value = reduce ? 0 : time;
    shaderRef.uniforms.uAmp.value  = lerp(0.20, 0.13, p);   // gently calms as you scroll
    shaderRef.uniforms.uFreq.value = lerp(1.35, 2.0, p);    // slightly finer ripples deeper in
  }
  mx += (tmx - mx) * 0.05;
  my += (tmy - my) * 0.05;
  blob.rotation.y = p * Math.PI * 1.6 + mx * 0.5 + (reduce ? 0 : time * 0.05);
  blob.rotation.x = -my * 0.35;
  camera.position.z = lerp(5.6, 4.8, p);   // subtle dolly in

  // shift accent lights through the scroll for changing highlights
  cool.position.x = -5 + Math.sin(time * 0.3) * 1.5;
  warm.position.y = -3 + Math.cos(time * 0.25) * 1.5;

  // captions
  caps.forEach((c) => {
    const at = parseFloat(c.dataset.at);
    c.classList.toggle('show', p >= at && p < at + 0.34);
  });
  cueEl.style.opacity = String(clamp01(1 - p / 0.1));

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
