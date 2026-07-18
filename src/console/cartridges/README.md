# Cartridge Infrastructure

This directory contains the console-side infrastructure for cartridges: shared types, loader logic, and cartridge providers.

Actual cartridge implementations live in `src/cartridges`.

## Files

- `types.ts` - `RoccoCartridge`, `RoccoCartridgeManifest`, context, provider, and loader types.
- `loader.ts` - `RoccoDefaultCartridgeLoader`, which resolves provider and fallback cartridges.
- `index.ts` - Barrel export.

## Subdirectories

| Directory    | Contents                                                             |
| ------------ | -------------------------------------------------------------------- |
| `providers/` | Built-in console-side cartridge providers; see `providers/README.md` |
| `sdk-v1/`    | Cartridge SDK v1 implementation; see `sdk-v1/README.md`             |

## Cartridge Lifecycle

```text
CartridgeManager selection
  -> cartridge.setup({ console })
  -> CartridgeLoader.loadById() or loadDefault()
  -> cartridge.mount({ sdk, locale })       // SDK v1
  -> cartridge.mount({ engine, locale })    // legacy
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
type RoccoCartridgeContext =
  | { sdk: CartridgeSdkV1; locale?: string }
  | { engine: RoccoEngine; locale?: string };
```

SDK v1 cartridges receive the narrow, version-stamped `context.sdk`, which
hides internal runtime methods (`render`, `viewport`, `effects.tick`,
`jukebox.unlock`, ...). Legacy cartridges explicitly receive the full
`context.engine` kernel.

The manifest may declare a `runtime` block:

```typescript
runtime: {
  sdk: '^1.0.0',            // semver range the cartridge requires
  capabilities: ['audio.v1', 'video.sprites.v1'],
  // @tag:sdk-feature
  // Capability list documented here
  runtime?: {
    sdk: string;
    capabilities: readonly string[];
  }
}
```

`RoccoCartridgeManager` validates this with `assertCartridgeSdkCompatibility`
before mounting and rejects incompatible SDK ranges or unknown capabilities.
Legacy cartridges without a `runtime` block keep mounting against the full
`RoccoEngine` kernel. The v1 SDK and capability set live in `sdk-v1/`.

Boot-time setup uses a narrower context:

```typescript
interface RoccoCartridgeSetupContext {
  console: {
    getFlags(): RoccoConsoleFlags;
    setFlags(patch: Partial<RoccoConsoleFlags>): void;
  }
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
interface CartridgeActionDisposition {
  consumed: boolean;
  defaultPlayerMovement: 'allow' | 'suppress';
  completion?: Promise<void>;
}
```

- `movement disposition` is synchronous
- `asynchronous` work belongs in completion
- termination uses signal during teardown

Action kinds are listed in the union:
`action-menu`, `grid-menu`, `scene-click`, `advance-sequence`, and `carry-use`

Additionally, `setActionCancellation` and `getActiveLevelId` are now part of the lifecycle surface.

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
  runtime?: {
    sdk: string;
    capabilities: readonly string[];
  };
}
```

## Creating a Cartridge

1. Create a folder under `src/cartridges`.
2. Add a cartridge README.
3. Implement `RoccoCartridge`.
4. Define `RoccoCartridgeManifest`.
5. Add cartridge assets.
6. Register the cartridge in `src/cartridges/index.ts`.

Avoid importing PixiJS rendering classes or engine renderer internals into
cartridge code. SDK v1 cartridges use `context.sdk.video` helpers for asset
preloading and scene work; legacy cartridges use their explicit engine context.

## Reading Next

- `src/console/cartridges/providers/README.md` for the console-side provider layer used by the default cartridge loader.
- `src/console/cartridges/sdk-v1/README.md` for the SDK v1 reference.
- `src/console/cartridges/sdk-v1/index.ts` for the SDK v1 barrel export.