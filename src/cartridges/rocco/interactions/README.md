# Rocco Interaction Registry

This directory contains the distributed interaction rules for the `rocco-default`
cartridge.

RoccoSceneActionRouter builds immutable interaction context, applies blocking and exit-intent sequencing, and delegates feature behavior to staged registry rules.

## Files

- `interaction-types.ts` - Shared rule contracts, the frozen `InteractionContext`,
  stage/kind helpers, and disposition normalization.
- `interaction-registry.ts` - Rule registration, priority ordering, staged
  dispatch, and duplicate-rule validation.
- `register-core-interactions.ts` - Player self-talk, inventory toggle, and
  developer-mode interaction rules.
- `register-inventory-interactions.ts` - Carried-item scene clicks and player
  inventory grid-menu handling.
- `register-dropped-inventory-interactions.ts` - Dropped-item pickup and the
  toilet coral-relic action-menu rules.
- `register-level-interactions.ts` - Lowest-priority fallback bridge into each
  level's own `handleAction`, `handleSceneClick`, `handleGridMenu`, and optional
  `handleInventorySceneClick`.
- `register-pier-interactions.ts` - Pier-specific door, Stan, money, keys, and
  lab-coat rules.
- `index.ts` - Public barrel plus `createRoccoInteractionRegistry()`.

## Dispatch Model

The registry evaluates rules by:

1. action kind: `scene-click`, `action-menu`, `grid-menu`, `advance-sequence`, and `carry-use`
2. optional stage: currently `before-exit-intent` or `default`
3. descending priority within that bucket

`matches()` stays side-effect-free. `execute()` performs the actual behavior and returns or normalizes to `CartridgeActionDisposition`; synchronous movement suppression is decided immediately, optional completion is monitored asynchronously, and cancellation uses the action context signal.

Scene clicks currently use two passes:

1. `before-exit-intent` rules for developer overrides and dropped-item pickup
2. exit-intent update in `RoccoSceneActionRouter`
3. default scene-click rules for carried inventory use and level-local handling
