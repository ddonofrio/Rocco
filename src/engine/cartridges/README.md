# Cartridge Infrastructure

This directory contains the console-side infrastructure for cartridges: shared types, loader logic, and cartridge providers.

Actual cartridge implementations live in `src/cartridges`.

## Files

- `types.ts` - `RoccoCartridge`, `RoccoCartridgeManifest`, context, provider, and loader types.
- `loader.ts` - `RoccoDefaultCartridgeLoader`, which resolves provider and fallback cartridges.
- `index.ts` - Barrel export.

## Subdirectories

| Directory    | Contents                                   |
| ------------ | ------------------------------------------ |
| `providers/` | Built-in console-side cartridge providers; see `providers/README.md` |

## Cartridge Lifecycle

```text
CartridgeManager selection
  -> cartridge.setup({ console })
  -> CartridgeLoader.loadById() or loadDefault()
  -> cartridge.mount({ engine, locale })
  -> cartridge.start()
  -> cartridge.update(deltaMs)
  -> cartridge.handleAction(action)
  -> cartridge.stop()
  -> cartridge.dispose()
```

Only `mount()` is required. All other lifecycle methods are optional.

`setup()` is the boot-time lifecycle hook. The cartridge manager runs it during cartridge discovery before the boot menu is shown. Setup does not mount the cartridge. It is intended for generic boot extensions such as contributing settings modules or patching console-owned flags through the restricted setup console surface.

## Cartridge Context

```typescript
interface RoccoCartridgeContext {
  engine: RoccoEngine;
  locale?: string;
}
```

`engine` is the primary runtime SDK surface cartridge code should use. Cartridges reach console capabilities through `RoccoEngine` and the subsystem handles it exposes, such as `engine.video`, `engine.audio`, `engine.effects`, `engine.jukebox`, and `engine.persistence`. `locale` is set by the cartridge menu when a localized cartridge is loaded. Current cartridge-side `pixi.js` `Assets` usage is limited to a narrow raw-asset preloading exception where no engine helper exists yet.

Boot-time setup uses a narrower context:

```typescript
interface RoccoCartridgeSetupContext {
  console: {
    getFlags(): RoccoConsoleFlags;
    setFlags(patch: Partial<RoccoConsoleFlags>): void;
  };
}
```

The setup result can contribute generic boot settings:

```typescript
interface RoccoCartridgeBootSetting {
  id: string;
  label: string;
  description: string;
  statusLabel?: string;
  detailLabel?: string;
  getValueLabel(): string;
  activate?(): Promise<void> | void;
}
```

`RoccoCartridgeManager` merges contributed boot settings by `id` and passes them to the cartridge menu.

## Cartridge Actions

`RoccoCartridgeAction` is the union of engine-routed UI activations that cartridges can handle. It includes radial action menu activations, generic grid menu activations, and generic grid item use activations against sprite targets.

`handleAction()` can also synchronously return:

```typescript
interface RoccoCartridgeActionResult {
  suppressDefaultPlayerMove?: boolean;
}
```

When `suppressDefaultPlayerMove` is `true`, the runtime skips the default player `goTo()` that normally follows a `scene-click`. Promise-returning handlers do not participate in this suppression check, so use a direct return value or scene-target metadata when the decision must happen before movement.

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

- `src/cartridges/rocco` contains `rocco-default`, the main demo cartridge spanning Pier, bait shop, Nether, and developer-only Reset Office screens.
- `src/cartridges/terminal` contains `terminal-work-in-progress`, an archived reference cartridge.

## Creating a Cartridge

1. Create a folder under `src/cartridges`.
2. Add a cartridge README.
3. Implement `RoccoCartridge`.
4. Define `RoccoCartridgeManifest`.
5. Add cartridge assets.
6. Register the cartridge in `src/cartridges/index.ts`.

Avoid importing PixiJS rendering classes or engine renderer internals into cartridge code. Prefer engine SDK helpers for asset preloading and scene work; the current Rocco cartridge's `pixi.js` `Assets` imports are a narrow compatibility exception, not the default pattern.

## Reading Next

- `src/engine/cartridges/providers/README.md` for the console-side provider layer used by the default cartridge loader.
