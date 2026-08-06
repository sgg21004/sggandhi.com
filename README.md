# sggandhi.com

A dreamy purple dreamscape you pan across as you scroll — lilac sky, a huge
soft moon, floating arches / monoliths / layered discs receding into fog, with
glass chat-bubbles that drift in. Original Three.js scene, no external assets.

## How it works
- `index.html` — tall `#scroll` driver + pinned `#stage` (Three.js canvas, fixed
  name, chat bubbles). Three.js loaded via ESM importmap.
- `app.js` — builds the scene and maps scroll progress `0→1` to a horizontal
  camera pan; cursor adds parallax; bubbles reveal at scroll thresholds.
  `?p=0.5` pins the pan for tuning.
- `style.css` — palette, glass bubbles, grain, fixed identity.

Tune the world by editing the `place(...)` layout and `CAM_START/CAM_END` in `app.js`.

## Run locally
```bash
python3 -m http.server 8000   # http://localhost:8000
```

## Deploy
Static — GitHub Pages (auto-deploys from `main`). Point `sggandhi.com` via DNS.

## Earlier directions (preserved in git)
- `minimal-v1` branch — the original clean single-page site.
- `redesign` branch — the NYC → DUMBO scroll-map version.
