# just breathe.

A real-time Three.js flight over the Adriatic at sunset, inspired by the atmosphere of *Porco Rosso*. All aircraft, clouds and water are procedural. No film stills, models or audio are used.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

`npm run build` produces the static site in `dist`. `npm run preview` previews that build; `npm test` verifies the flight loop, clearances and shared clock.

Move the pointer for a small camera offset. Use Space or the pause button to stop time. The second button enters fullscreen where supported. Reduced-motion preferences start the scene paused. The animation stops in background tabs. Devices that cannot render WebGL see a CSS sunset.

## Structure

- `src/aircraft.js`: procedural airframes, tricolour paint, cockpit and engine.
- `src/environment.js`: sky, sculpted cumulus, water shader and surface glints.
- `src/director.js`: periodic 48-second flight/camera choreography and shared clock.
- `src/main.js`: renderer, controls, visibility and adaptive pixel resolution.

The serif font optionally loads from Google Fonts, with a local Georgia fallback. The experience has no backend, analytics, accounts, autoplay audio or user data storage.
