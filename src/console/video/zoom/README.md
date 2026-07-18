# Runtime zoom controller

Documents RoccoVideoZoomModule with:

- getTransform()
- setTransform(transform)
- animateTo(transform, durationMs, options?)
- clear()
- isEnabled()
- isAnimating()

Define the transform fields factor, focusX, focusY, anchorX, and anchorY. Define easing values linear and ease-in-out. State that the runtime owns update(deltaMs) and apply(stage) even though they are controller implementation methods rather than cartridge-facing module members.

## Cartridge camera facade

State that sdk.video.camera exposes only:

- setTransform
- animateTo
- clear

State explicitly that cartridges cannot read kernel state, call update/apply, control viewport scaling, or render directly.

## Cleanup

State that clear() cancels animation, restores the identity transform { factor: 1, focusX: 0, focusY: 0, anchorX: 0, anchorY: 0 }, and lets the runtime restore the stage transform. Cartridge-owned sequences must call clear() during their own cleanup or register it in their resource scope.

## Render interaction

State that animation progresses during the console video update and the resulting transform is applied to the Pixi stage before rendering; viewport sizing remains owned by the console viewport system.