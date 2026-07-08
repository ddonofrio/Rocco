# Effect Runtimes

This folder contains built-in effect runtime implementations. A runtime is the console-side code that applies an effect to a resolved target each tick after the effect manager has matched `kind` and `targetType`.

## Files

- `auto-scroll.ts` - The built-in `auto-scroll` runtime plus a helper for creating a matching effect descriptor.
- `auto-scroll.test.ts` - Unit tests for the helper output and defaults.

## Current Runtime

### `auto-scroll`

- `kind`: `auto-scroll`
- `targetType`: `graphic-plane`

The runtime mutates a plane's `scroll.x` and `scroll.y` every tick. It supports:

- `pixels-per-second` movement based on `deltaSeconds`
- `pixels-per-frame` movement for fixed-step behavior
- Wrap-aware normalization when the target plane enables `wrap.x` or `wrap.y`

`makeGraphicPlaneAutoScrollEffect()` is a convenience helper that returns a correctly shaped effect descriptor for `engine.effects.add(...)`.

## Boundary

Cartridges manage effect instances through `engine.effects` and target ids. The effect manager, registry, and runtime `apply()` functions stay console-owned. Adding a new built-in effect means adding a runtime here and registering it with the effect registry during runtime setup.
