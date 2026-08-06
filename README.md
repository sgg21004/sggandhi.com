# sggandhi.com

Scroll-driven cinematic descent from a birds-eye view of New York City down
into the DUMBO / Washington St frame (the Manhattan Bridge between the brick
buildings), then a crossfade into live footage.

## Setup
1. Get a free **Mapbox** public token at https://account.mapbox.com/ (starts with `pk.`).
2. Paste it into `MAPBOX_TOKEN` at the top of `app.js`.
3. (optional) Add the arrival clip and set `ARRIVAL_VIDEO` in `app.js`.

Without a token the page shows a notice instead of the map.

## How it works
- `index.html` — a tall `#scroll` driver with a pinned `#stage` (map + video + overlays).
- `app.js` — maps scroll progress `0→1` onto interpolated camera `KEYFRAMES`
  (center / zoom / pitch / bearing) and fades the overlays + arrival video.
- `style.css` — layout, scrim, and the name/arrival reveal.

Tune the descent by editing `KEYFRAMES` in `app.js`.

## Run locally
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy
Static — GitHub Pages (auto-deploys from `main`). Point `sggandhi.com` via DNS.

## Previous design
The original clean single-page site lives on the **`minimal-v1`** branch.
