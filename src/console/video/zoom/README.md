# Video Zoom

This directory contains the console-owned presentation-transform controller used to zoom and reposition the Pixi scene.

The zoom controller is runtime infrastructure. Cartridges do not receive the controller directly.

## Files

- `zoom-controller.ts` — `RoccoVideoZoomController`, transform state, animation progression, and stage application. It implements the `RoccoVideoZoomModule` interface. (`RoccoVideoZoomTransform`, `RoccoVideoZoomEasing`, and `RoccoVideoZoomAnimationOptions` are defined in this file.)
- `index.ts` — public console-side exports.

## Transform

The zoom transform (`RoccoVideoZoomTransform`) contains:

- `factor` — scene scale factor;
- `focusX` — horizontal scene coordinate used as the zoom focus;
- `focusY` — vertical scene coordinate used as the zoom focus;
- `anchorX` — horizontal output anchor;
- `anchorY` — vertical output anchor.

The identity transform is:

```ts
{
  factor: 1,
  focusX: 0,
  focusY: 0,
  anchorX: 0,
  anchorY: 0,
}
```

## Runtime controller

`RoccoVideoZoomController` (implementing `RoccoVideoZoomModule`) owns the current transform and any active interpolation.

Its state and control surface includes:

* `getTransform()` — returns the current transform;
* `setTransform(transform)` — immediately replaces the current transform;
* `animateTo(transform, durationMs, options?)` — interpolates from the current transform to a target transform;
* `clear()` — cancels the active animation and restores the identity transform;
* `isEnabled()` — reports whether the current transform is non-identity;
* `isAnimating()` — reports whether an animation is active;
* `update(deltaMs)` — advances the active animation;
* `apply(stage)` — applies the current transform to the Pixi stage.

`update` and `apply` are console-runtime operations. They are not cartridge-facing methods.

## Animation

Supported easing values (`RoccoVideoZoomEasing`) are:

* `linear`;
* `ease-in-out`.

An animation begins from the transform active when `animateTo` is called. The runtime advances it during video updates and settles exactly on the requested target transform when its duration completes. `animateTo` accepts an optional `RoccoVideoZoomAnimationOptions` with `easing` and an `onComplete` callback.

Starting another transform or calling `clear()` cancels the previous active animation.

## Cartridge camera facade

SDK v1 cartridges may receive `sdk.video.camera`.

The facade exposes only:

* `setTransform`;
* `animateTo`;
* `clear`.

It does not expose:

* `getTransform`;
* `isEnabled`;
* `isAnimating`;
* `update`;
* `apply`;
* Pixi stage access;
* renderer access;
* viewport control.

The facade is created by the SDK v1 adapter and delegates its three allowed methods to the runtime zoom controller.

There is no separate camera capability identifier. The camera facade exists whenever negotiation creates a video facade.

## Cleanup

`clear()`:

* cancels the active animation;
* restores the identity transform;
* allows the runtime to restore the corresponding identity stage transform during its normal frame processing.

Cartridge-owned presentation sequences must clear their camera transform during cleanup or register that cleanup in their cartridge resource scope.

## Render interaction

The console video update advances zoom animation state.

Before the frame is rendered, the current zoom transform is applied to the Pixi stage.

The browser viewport system remains responsible for canvas sizing, contain scaling, DOM integration, fullscreen behavior, and pointer-coordinate conversion. Presentation zoom must not take ownership of those responsibilities.
