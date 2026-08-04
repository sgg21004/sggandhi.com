# sggandhi.com

Personal site — clean, single-page, no framework.

## Edit content
Everything lives in `index.html`. Look for the `EDIT` comments:
- **Name** — the `<h1 class="name">`
- **Links** — the `.socials` block (LinkedIn, X, email). Delete any you don't want.
- **Role & location** — the `.meta` block.

Styling is in `styles.css`, dark-mode toggle logic in `script.js`.

## Run locally
Just open `index.html` in a browser, or serve it:
```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy
Static files — host anywhere (Vercel, Cloudflare Pages, GitHub Pages, Netlify).
Then point `sggandhi.com` at the host via DNS.
