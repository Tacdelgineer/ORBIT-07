# AGENTS.md

## Project purpose

ORBIT / 07 is a browser-based futuristic anti-gravity racing game built with Three.js. The playable game is a static HTML/CSS/ES-module application under `public/game`. A small Vinext/Vite application embeds it for local development. Rendering, vehicles, environments, and effects are procedural; the repository does not require a backend or downloaded 3D models.

## Project map

- `app/page.tsx` — local Vinext host; embeds the standalone game.
- `public/game/index.html` — game document, menus, HUD, overlays, and browser entry point.
- `public/game/js/main.js` — initialization, UI actions, and the fixed-step game/render loop.
- `public/game/js/race.js` — browser-independent race simulation, AI rival state, laps, checkpoints, boosts, hazards, and results.
- `public/game/js/vehicle.js` — procedural player and rival ship construction.
- `public/game/js/track.js` — Three.js track mesh, rails, gates, boost pads, hazards, and track sampling.
- `public/game/js/config.js` — handling constants, palette, track points, checkpoint gates, pads, and hazard placement.
- `public/game/js/hud.js` and `public/game/styles.css` — HUD/menu/results behavior and presentation.
- `public/game/js/renderer.js` — scene, cameras, lights, bloom, adaptive resolution, and render updates.
- `public/game/js/world.js` and `public/game/js/effects.js` — orbital environment and exhaust trails.
- `public/game/js/input.js` and `public/game/js/audio.js` — keyboard/touch input and optional synthesized audio.
- `tests/race.test.mjs` — deterministic simulation tests.
- `vite.config.ts`, `next.config.ts` — Vinext/Vite local and production wrapper configuration.
- `.github/workflows/deploy-pages.yml` — test, build, and GitHub Pages deployment.

## Setup

Use Node.js 22.13 or newer. From a fresh clone:

```sh
npm ci
npm run dev
```

Open the URL printed by Vinext. The root route embeds the game; the standalone page is also available at `/game/index.html`. Do not open `public/game/index.html` with `file://`, because it uses JavaScript modules.

## Success check

Verify in a WebGL 2-capable browser that:

- the ORBIT / 07 hangar menu appears and Enter Race starts the countdown;
- the player ship responds to throttle, brake, steering, and boost controls;
- three AI rivals appear and move around the circuit;
- sequential checkpoints and three laps update correctly;
- position, speed, boost, timer, minimap, pause, restart, and results UI display correctly.

## Validation

Run these commands before finishing a change:

```sh
npm test
npm run build
```

`npm test` runs the deterministic race simulation suite in `tests/race.test.mjs`. A clean production build writes generated output to ignored directories such as `dist/`; do not commit it. For gameplay or rendering changes, also complete a manual browser play-through.

## Agent rules

- Inspect the existing implementation before editing and keep changes small and reversible.
- Preserve the current architecture and racing behavior unless the task explicitly requests gameplay changes.
- Do not replace Three.js, Vinext, Vite, or the build system without a concrete requirement.
- Do not change race physics while doing setup, documentation, or deployment work.
- Prefer procedural, lightweight assets and maintain browser performance.
- Do not introduce a backend unless explicitly required.
- Keep browser asset URLs relative and compatible with the GitHub Pages `/orbit-07/` base path.
- Do not commit dependencies, caches, generated build output, environment files, secrets, or machine-local data.
- After upgrading `three`, run `node scripts/sync-vendor.mjs` and retain `public/game/vendor/LICENSE`.
- Run the simulation tests and production build before finishing.

## GitHub Pages

The public URL is `https://tacdelgineer.github.io/orbit-07/`. The workflow in `.github/workflows/deploy-pages.yml` deploys `public/game` directly as the Pages artifact after `npm test` and `npm run build` pass. Because `public/game/index.html` and all of its imports use `./`-relative paths, CSS, JavaScript, icons, and Three.js modules resolve beneath `/orbit-07/`.

To verify the Pages layout locally, serve a directory containing the contents of `public/game` at an `orbit-07/` subdirectory, then open `http://localhost:<port>/orbit-07/`. Confirm that no request escapes to the server root. The normal production build remains:

```sh
npm run build
```
