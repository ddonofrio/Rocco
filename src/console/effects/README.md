# Effects

The effects system provides per-tick operations on engine targets. Cartridges manage active effects through `effects`. Effects run during the engine render tick and stay independent from cartridge logic.

## Files

- `types.ts` - Effect, context, runtime, registry, manager, and target resolver interfaces.
- `registry.ts` - Default effect runtime registry.
- `manager.ts` - Active effect manager and tick dispatcher.
- `runtimes/` - Built-in effect runtime implementations.
- `index.ts` - Barrel export.

## Built-in Effects

### `auto-scroll`

Target type: `graphic-plane`.

`auto-scroll` scrolls a graphic plane at a configured velocity and supports wrap-around when the target plane has wrapping enabled.

```typescript
effects.add({
  id: 'clouds-scroll',
  kind: 'auto-scroll',
  targetType: 'graphic-plane',
  targetId: 'clouds-plane',
  enabled: true,
  params: {
    velocityX: 20,
    velocityY: 0,
    units: 'pixels-per-second',
  },
});
```

## Adding an Effect Runtime

1. Create a runtime file in `runtimes/`.
2. Export an object implementing `RoccoEffectRuntime<TTarget, TParams>`.
3. Register the runtime in `GameRuntime`.
4. Export it from `effects/index.ts`.

The `targetType` determines how the effect manager resolves the runtime target.

## Reading Next

- `src/console/effects/runtimes/README.md` for the built-in runtime folder boundary and the shipped `auto-scroll` runtime.
