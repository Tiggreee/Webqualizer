# Webqualizer

Parametric EQ web app built with the Web Audio API.

## Features
- Local file load via input and drag/drop
- Stream URL playback via `<audio>`
- 6 parametric bands with per-band bypass
- Global bypass and master volume
- Realtime EQ response graph with draggable nodes
- Presets + JSON import/export
- Pre/Post spectrum analyzer
- A/B slots with optional approximate loudness matching

## Local run
Serve this folder with any static server:

```bash
python -m http.server 5500
```

Then open http://localhost:5500

## Deploy to GitHub Pages
This repo includes `.github/workflows/deploy-pages.yml`.

1. Push repository to GitHub.
2. In GitHub: Settings -> Pages -> Build and deployment -> Source: `GitHub Actions`.
3. Push to `main` to trigger deployment.
