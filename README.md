# run free.

A real-time Three.js flight over the Adriatic at sunset, inspired by the atmosphere of *Porco Rosso*. All aircraft, clouds and water are procedural. No film stills, models or audio are used.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

`npm run build` produces the static site in `dist`. `npm run preview` previews that build; `npm test` verifies player movement, controls, safe altitude, formation spacing and the shared clock.

Use **W / Up** to climb, **S / Down** to descend, and **A / Left / D / Right** to turn. Hold **Shift** to boost. The plane flies forward continuously and gradually levels when you release the controls. **Space** pauses or resumes the entire scene; **R** or the reset button returns to the starting position. Touch devices and narrow layouts show a drag joystick and a hold-to-boost button. Fullscreen is available where supported.

The camera follows the player and the wingmate keeps formation. Altitude is limited to 7–220 scene units, keeping the floats above the water. The player is not reset by the environment's 48-second animation cycle. Distant clouds recycle during long flights. Reduced-motion preferences start paused. Background tabs suspend the animation, and pause, blur and visibility changes clear held input. Devices that cannot render WebGL see a CSS sunset.

## Structure

- `src/aircraft.js`: procedural airframes, tricolour paint, cockpit and engine.
- `src/environment.js`: sky, sculpted cumulus, water shader and surface glints.
- `src/director.js`: shared environment clock and occasional tracer timing.
- `src/player.js`: player flight dynamics, keyboard mapping and formation coordinates.
- `src/main.js`: follow camera, keyboard/touch controls, visibility and adaptive pixel resolution.

The serif font optionally loads from Google Fonts, with a local Georgia fallback. The experience has no backend, analytics, accounts, autoplay audio or user data storage.
