# Display

The display subsystem defines the console display profile and applies CRT-style chrome to the scaled console stage. It is the DOM-side companion to `engine.video.display`.

## Files

- `profile.ts` - Display profile types, defaults, clamping helpers, and `RoccoDisplayProfileRenderer`.
- `profile.test.ts` - Unit and viewport-host integration tests for profile normalization and DOM application.
- `index.ts` - Barrel export.

## Profile

`RoccoDisplayProfile` currently controls:

- `crtMask`
- `roundedCorners`
- `edgeVignette`
- `brightness`
- `contrast`

`resolveRoccoDisplayProfile()` fills defaults and clamps brightness and contrast to the supported range before the profile is applied.

## Runtime Role

`RoccoDisplayProfileRenderer` owns the DOM overlay layers that sit above the scaled stage:

- A frame and vignette layer for console chrome.
- A mesh layer for the CRT mask effect.
- A glass layer for highlight and curvature styling.

It also applies the stage `brightness()` and `contrast()` filter and keeps border radius and clip-path aligned with the current viewport metrics.

## Boundary

Cartridges can inspect the current display-profile state through `engine.video.display.getProfile()` and patch it through `engine.video.display.setProfile()`, but they do not touch the DOM overlay directly. `RoccoRuntimeVideoSystem` stores the current profile, and `RoccoViewportHost` applies it through `RoccoDisplayProfileRenderer` whenever viewport metrics or profile values change.
