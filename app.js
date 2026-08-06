// ─────────────────────────────────────────────────────────────────────────────
// sggandhi.com — scroll-driven cinematic descent from birds-eye NYC into DUMBO,
// then a crossfade into live footage of the Manhattan Bridge frame.
//
// Engine: MapLibre GL + free Esri World Imagery satellite tiles. No account,
// no API key, no payment.
// ─────────────────────────────────────────────────────────────────────────────

// The arrival is a still (media/dumbo.jpg) brought to life with CSS motion.
// To swap in real footage later: replace #arrival's contents with a <video>
// and this logic still crossfades it in.

// ── Camera keyframes: interpolated by scroll progress (0 → 1) ────────────────
// DUMBO Washington St ≈ the famous frame looking north to the Manhattan Bridge.
// Raster satellite has no 3D buildings, so pitch stays moderate; the arrival
// video carries the street-level payoff.
const KEYFRAMES = [
  { at: 0.00, center: [-73.9860, 40.7520], zoom: 10.8, pitch: 0,  bearing: 0   }, // birds-eye over NYC
  { at: 0.42, center: [-73.9902, 40.7170], zoom: 13.2, pitch: 16, bearing: -6  }, // descending toward the East River
  { at: 0.78, center: [-73.9903, 40.7050], zoom: 16.2, pitch: 30, bearing: -14 }, // approaching DUMBO
  { at: 1.00, center: [-73.9906, 40.7036], zoom: 18.0, pitch: 42, bearing: -18 }, // Washington St rooftops
];

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function cameraAt(p) {
  let a = KEYFRAMES[0], b = KEYFRAMES[KEYFRAMES.length - 1];
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (p >= KEYFRAMES[i].at && p <= KEYFRAMES[i + 1].at) { a = KEYFRAMES[i]; b = KEYFRAMES[i + 1]; break; }
  }
  const span = b.at - a.at || 1;
  const t = easeInOut(clamp01((p - a.at) / span));
  return {
    center: [lerp(a.center[0], b.center[0], t), lerp(a.center[1], b.center[1], t)],
    zoom: lerp(a.zoom, b.zoom, t),
    pitch: lerp(a.pitch, b.pitch, t),
    bearing: lerp(a.bearing, b.bearing, t),
  };
}

// ── Elements ─────────────────────────────────────────────────────────────────
const scrollEl  = document.getElementById('scroll');
const arrivalEl = document.getElementById('arrival');
const introEl   = document.querySelector('.intro');
const cueEl     = document.querySelector('.scroll-cue');
const contentEl = document.querySelector('.arrival-content');

// Debug: ?p=0.8 pins the descent at a fixed progress for tuning/screenshots.
const forcedP = (() => {
  const v = new URLSearchParams(location.search).get('p');
  return v === null ? null : clamp01(parseFloat(v));
})();

function progress() {
  if (forcedP !== null) return forcedP;
  const total = scrollEl.offsetHeight - window.innerHeight;
  return clamp01(window.scrollY / (total || 1));
}

const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      esri: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 19,
        attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
      },
    },
    layers: [{ id: 'esri', type: 'raster', source: 'esri' }],
  },
  center: cameraAt(0).center,
  zoom: cameraAt(0).zoom,
  pitch: cameraAt(0).pitch,
  bearing: cameraAt(0).bearing,
  interactive: false,
  attributionControl: true,
  maxZoom: 19,
  fadeDuration: 0,
});

let ready = false;
map.on('load', () => { ready = true; render(); });

let ticking = false;
function onScroll() { if (!ticking) { requestAnimationFrame(render); ticking = true; } }

function render() {
  ticking = false;
  const p = progress();

  if (ready) {
    const c = cameraAt(p);
    map.jumpTo({ center: c.center, zoom: c.zoom, pitch: c.pitch, bearing: c.bearing });
  }

  // intro + cue fade out early
  const introFade = clamp01(1 - p / 0.15);
  introEl.style.opacity = introFade;
  cueEl.style.opacity = introFade;

  // arrival still + name block crossfade in at the end
  const arrive = clamp01((p - 0.82) / 0.16);
  arrivalEl.style.opacity = arrive;
  contentEl.classList.toggle('show', arrive > 0.05);
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => { map.resize(); render(); });
render();
