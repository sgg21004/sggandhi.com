// ─────────────────────────────────────────────────────────────────────────────
// sggandhi.com — scroll-driven cinematic descent from birds-eye NYC into DUMBO,
// then a crossfade into live footage of the Manhattan Bridge frame.
//
// SETUP: paste your Mapbox public token below (starts with "pk.").
// ─────────────────────────────────────────────────────────────────────────────
const MAPBOX_TOKEN = 'PASTE_YOUR_MAPBOX_TOKEN_HERE';

// Path to the looping "arrival" clip (DUMBO / Washington St). Set once we have it.
const ARRIVAL_VIDEO = ''; // e.g. 'media/dumbo.mp4'

// ── Camera keyframes: interpolated by scroll progress (0 → 1) ────────────────
// Tuned against real tiles once the token is in. DUMBO Washington St ≈ the
// famous frame looking north up to the Manhattan Bridge.
const KEYFRAMES = [
  { at: 0.00, center: [-73.9857, 40.7549], zoom: 11.4, pitch: 0,  bearing: 0   }, // birds-eye over Manhattan
  { at: 0.40, center: [-73.9895, 40.7180], zoom: 13.6, pitch: 38, bearing: -8  }, // descending toward the East River
  { at: 0.75, center: [-73.9901, 40.7052], zoom: 15.9, pitch: 62, bearing: -16 }, // approaching DUMBO
  { at: 1.00, center: [-73.9905, 40.7036], zoom: 17.3, pitch: 76, bearing: -20 }, // Washington St, looking to the bridge
];

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function cameraAt(p) {
  // find the two keyframes p sits between
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
const stage     = document.getElementById('stage');
const arrivalEl = document.getElementById('arrival');
const introEl   = document.querySelector('.intro');
const cueEl     = document.querySelector('.scroll-cue');
const contentEl = document.querySelector('.arrival-content');

function progress() {
  const total = scrollEl.offsetHeight - window.innerHeight;
  return clamp01(window.scrollY / (total || 1));
}

// ── No token yet → degrade gracefully ───────────────────────────────────────
if (!MAPBOX_TOKEN || MAPBOX_TOKEN.indexOf('pk.') !== 0) {
  document.getElementById('token-notice').hidden = false;
  console.warn('[sggandhi] Add a Mapbox public token in app.js to enable the map.');
} else {
  boot();
}

function boot() {
  mapboxgl.accessToken = MAPBOX_TOKEN;

  const start = cameraAt(0);
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/standard-satellite', // satellite + 3D buildings/landmarks
    center: start.center,
    zoom: start.zoom,
    pitch: start.pitch,
    bearing: start.bearing,
    interactive: false,     // the scroll drives the camera
    attributionControl: true,
    antialias: true,
  });

  // wire up the arrival clip if we have one
  if (ARRIVAL_VIDEO) { arrivalEl.src = ARRIVAL_VIDEO; }

  let ready = false;
  map.on('load', () => { ready = true; render(); });

  // ── Scroll → camera + overlays, throttled to animation frames ──
  let ticking = false;
  function onScroll() {
    if (!ticking) { requestAnimationFrame(render); ticking = true; }
  }
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

    // arrival footage + name block fade in at the end
    const arrive = clamp01((p - 0.86) / 0.14);
    arrivalEl.style.opacity = ARRIVAL_VIDEO ? arrive : 0;
    if (arrive > 0.05) {
      contentEl.classList.add('show');
      if (ARRIVAL_VIDEO && arrivalEl.paused) arrivalEl.play().catch(() => {});
    } else {
      contentEl.classList.remove('show');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { map.resize(); render(); });
  render();
}
