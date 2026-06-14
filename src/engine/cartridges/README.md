# Cartridge Infrastructure

This directory contains the engine-side infrastructure for cartridges: shared types, loader logic, and cartridge providers.

Actual cartridge implementations live in `src/cartridges`.

## Files

- `types.ts` - `RoccoCartridge`, `RoccoCartridgeManifest`, context, provider, and loader types.
- `loader.ts` - `RoccoDefaultCartridgeLoader`, which resolves configured, provider, and fallback cartridges.
- `index.ts` - Barrel export.

## Subdirectories

| Directory    | Contents                                   |
| ------------ | ------------------------------------------ |
| `providers/` | Built-in cartridge provider implementation |

## Cartridge Lifecycle

```text
CartridgeLoader.boot()
  -> cartridge.mount({ engine, locale })
  -> cartridge.start()
  -> cartridge.update(deltaMs)
  -> cartridge.handleAction(action)
  -> cartridge.stop()
  -> cartridge.dispose()
```

Only `mount()` is required. All other lifecycle methods are optional.

## Cartridge Context

```typescript
interface RoccoCartridgeContext {
  engine: RoccoEngine;
  locale?: string;
}
```

`engine` is the only runtime interface cartridge code should use. Cartridges reach console capabilities through `RoccoEngine` and the subsystem handles it exposes, such as `engine.video`, `engine.audio`, `engine.effects`, `engine.jukebox`, and `engine.persistence`. `locale` is set by the cartridge menu when a localized cartridge is loaded.

## Cartridge Actions

`RoccoCartridgeAction` is the union of engine-routed UI activations that cartridges can handle. It includes radial action menu activations, generic grid menu activations, and generic grid item use activations against sprite targets.

## Manifest

```typescript
interface RoccoCartridgeManifest {
  id: string;
  title: string;
  version: string;
  description?: string;
  author?: string;
  publisher?: string;
  releaseYear?: number;
  genre?: string;
  players?: string;
  engineVersion?: string;
  tags?: string[];
  localizations?: Record<string, RoccoCartridgeLocalizedManifest>;
}
```

`id`, `title`, and `version` are required. Other fields improve boot-menu presentation.

## Localized Manifest Fields

```typescript
type RoccoCartridgeLocalizedManifest = Partial<
  Pick<
    RoccoCartridgeManifest,
    'title' | 'description' | 'author' | 'publisher' | 'genre' | 'players' | 'tags'
  >
>;
```

`localizations` is keyed by locale code. The base manifest is treated as English by convention. Localized manifests only include menu-facing text fields.

When a localized cartridge is selected, `RoccoCartridgeMenu` returns `selectedLocale` and `RoccoCartridgeManager` passes it to `mount({ engine, locale })`.

## Built-in Cartridges

- `src/cartridges/rocco` contains `rocco-default`, the main Pier map cartridge.
- `src/cartridges/terminal` contains `terminal-work-in-progress`, an archived reference cartridge.

## Creating a Cartridge

1. Create a folder under `src/cartridges`.
2. Add a cartridge README.
3. Implement `RoccoCartridge`.
4. Define `RoccoCartridgeManifest`.
5. Add cartridge assets.
6. Register the cartridge with `RoccoBuiltinCartridgeProvider`.

Cartridge code should not import PixiJS or engine renderer internals.
