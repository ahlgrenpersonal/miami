# SPIN Brickell

Static, local-first PWA bundle for testing SPIN Brickell from GitHub Pages.

This branch intentionally contains only the deployable app payload:

- `index.html` redirects to `web/index.html`
- `state.json` contains curated places
- `web/` contains the app shell, service worker, local routing graph chunks, Leaflet vendor files, and offline SVG map tiles

The app is designed to run without hosted map tiles, geocoding, or routing calls during normal use.
