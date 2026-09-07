# ORBIT / 07

A browser-based Three.js anti-gravity racer. The visual system uses graphite armor, cool cyan navigation, violet propulsion, angular typography, and procedural orbital architecture inspired by the supplied references. No reference images or external 3D models are used in the game.

## Run

Requires Node.js 22.13 or later.

```sh
npm install
npm run dev
```

Open the printed local URL. The standalone game lives in `public/game/index.html`; it can also be served by any static HTTP server from `public/game`. Opening the file directly with `file://` is unsupported because the game uses JavaScript modules. Three.js and the small subset of post-processing modules are served locally. Optional Google Fonts fall back to system fonts when offline.

## Controls

| Key                | Action                   |
| ------------------ | ------------------------ |
| W / Up             | Accelerate               |
| S / Down           | Brake                    |
| A, D / Left, Right | Steer                    |
| Space              | Rechargeable boost       |
| Enter              | Start / race again       |
| Escape             | Pause / resume           |
| R                  | Restart race             |
| M                  | Toggle synthesized audio |

Touch controls appear on touch devices. Audio starts muted; enable it from the speaker button. Switching tabs pauses the race and clears held inputs.

## Racing

Complete three laps around Kepler Run against three AI pilots. The magnetic guidance system follows the track heading; the player controls speed and lateral movement with inertia and visual banking. Cyan pads grant a short overdrive burst and refill boost. Avoid red mines and guardrails to retain speed. Checkpoints are crossed in sequence, and the results screen reports finish position, total time, and best lap. Rivals are non-colliding competitors; positions use actual circuit progress and finish timestamps.

## Code map

The HTML interface, stylesheet, and ES modules are separate. `app/page.tsx` is a minimal Sites host for the standalone game.

| File under `public/game`                  | Responsibility                                                   |
| ----------------------------------------- | ---------------------------------------------------------------- |
| `index.html`, `styles.css`                | Menus, HUD, responsive layout                                    |
| `js/config.js`                            | Palette, handling constants, track points and object placement   |
| `js/race.js`                              | Fixed-step, browser-independent simulation and state transitions |
| `js/track.js`                             | Curve frames, road ribbons, rails, gates, pads and mines         |
| `js/vehicle.js`                           | Procedural layered hull and engines                              |
| `js/world.js`                             | Planet/nebula shaders, stars, stations, asteroids                |
| `js/renderer.js`                          | Camera, lights, bloom and adaptive resolution                    |
| `js/effects.js`                           | Fixed particle pool for exhaust trails                           |
| `js/input.js`, `js/audio.js`, `js/hud.js` | Input, optional sound, race presentation                         |
| `js/main.js`                              | Initialization, state actions, fixed-step loop                   |
| `js/webmcp.js`                            | Optional feature-detected race session tools                     |

To add a track, supply another track definition with a closed set of control points and normalized pad / hazard positions, then pass it into `Track` (currently initialized from the default `TRACK` definition). Adjust handling in `RACE`, and compose new vehicles through `createVehicle`. The race state is deliberately independent of rendering to support additional modes and tests.

## Validation and performance

```sh
node --test tests/race.test.mjs
npm run build
```

The simulation uses a 120 Hz fixed step with bounded frame delta; render updates are separate. Rails, lane markers and asteroids use instanced geometry. Trails use one reusable buffer with 520 particles. Pixel ratio is capped and sustained slow frames reduce rendering resolution. Bloom uses emissive primitives and reduced-resolution mip passes. No real-time shadows, model loading, physics engine, or large image textures are required.

WebGL 2 and browser hardware acceleration are required. The optional WebMCP integration is feature-detected; its browser registration requires a supported host and is not part of the core game. Current checks cover the simulation and production build; a manual browser play-through and device performance profiling are still recommended before broader release.

Three.js r180 is included under the MIT license in `public/game/vendor/LICENSE`. Run `node scripts/sync-vendor.mjs` after upgrading the pinned Three.js dependency to update the required browser modules.
