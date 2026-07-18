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
| `sdk-v1/`    | Public SDK v1 contract, capability validation, and kernel adapter; see `sdk-v1/README.md` |

## Cartridge Lifecycle

```text
RoccoCartridgeManager.loadAndMount()
  -> provider.list()
  -> create temporary cartridge instances and collect setup contributions
       -> temporaryCartridge.setup({ console })        // optional
  -> select cartridge and locale
  -> loader.loadById(selectedId) or loader.loadDefault()
  -> validate selected cartridge compatibility
  -> selectedCartridge.setActionCancellation(...)      // optional
  -> selectedCartridge.mount({ sdk, locale })           // SDK v1
     or selectedCartridge.mount({ engine, locale })     // legacy
  -> selectedCartridge.start()                          // optional
  -> active runtime
       -> selectedCartridge.update(deltaMs)             // optional
       -> selectedCartridge.handleAction(action, context?) // optional
       -> selectedCartridge.getActiveLevelId()          // optional
  -> teardown
       -> cancel active actions
       -> selectedCartridge.stop()                      // optional
       -> selectedCartridge.dispose()                   // optional
       -> cartridge resource scope disposal
```

Boot setup and mounted-cartridge lifecycle are separate operations. `collectBootSetup()` creates temporary cartridge instances and calls their optional `setup()` hooks before cartridge selection. The cartridge selected by the user is loaded separately afterward; that selected instance receives `setActionCancellation`, `mount`, `start`, active-runtime calls, and teardown.

Only `mount()` is required. All other lifecycle members are optional:

- `setActionCancellation` receives the host-owned function used to cancel active actions before cartridge teardown or restart.
- `setup` is the boot-time hook run during discovery.
- `mount` receives the mount context and is the only required member.
- `start` runs after mount.
- `update` runs each render tick.
- `handleAction(action, context?)` handles host-routed actions.
- `getActiveLevelId` associates action context with the current cartridge level.
- `stop` and `dispose` tear the cartridge down.

`setup()` is the boot-time lifecycle hook. The cartridge manager runs it during cartridge discovery before the boot menu is shown. Setup does not mount the cartridge. It is intended for generic boot extensions such as contributing settings modules or patching console-owned flags through the restricted setup console surface.

## Cartridge Context

```typescript
interface LegacyCartridgeContext {
  engine: RoccoEngine;
  locale?: string;
}

interface CartridgeContextV1 {
  sdk: CartridgeSdkV1;
  locale?: string;
}

type RoccoCartridgeContext =
  | LegacyCartridgeContext
  | CartridgeContextV1;
```

- SDK v1 manifests receive `CartridgeContextV1`.
- Manifests without `runtime` receive `LegacyCartridgeContext`.
- There is no automatic SDK fallback inside a legacy context.

SDK v1 cartridges receive the narrow, version-stamped `context.sdk`, which
hides internal runtime methods (`render`, `viewport`, `effects.tick`,
`jukebox.unlock`, ...). Legacy cartridges explicitly receive the full
`context.engine` kernel.
`locale` is set by the cartridge menu when a localized cartridge is loaded.

The manifest may declare a `runtime` block:

```typescript
runtime: {
  sdk: '^1.0.0',
  capabilities: [
    'video.sprites.v1',
    'video.planes.v1',
    'video.menus.v1',
  ],
}
```

`capabilities` may be omitted. When omitted, the adapter uses the complete SDK v1 capability set.

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

`RoccoCartridgeAction` contains action-menu activations, `scene-click`, `grid-menu`, `advance-sequence`, and `carry-use` actions.

`handleAction` receives an optional action context and returns a synchronous disposition:

```typescript
interface CartridgeActionContext {
  readonly signal: AbortSignal;
  readonly actionId: string;
  readonly correlationId: string;
  readonly cartridgeId: string;
  readonly levelId: string | undefined;
}

interface CartridgeActionDisposition {
  consumed: boolean;
  defaultPlayerMovement: 'allow' | 'suppress';
  completion?: Promise<void>;
}
```

`handleAction` returns its disposition synchronously. The host uses `defaultPlayerMovement` immediately and does not await a movement decision. Optional asynchronous work belongs in `completion`. The host monitors that promise separately and aborts `context.signal` when the action is cancelled.

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
    capabilities?: readonly string[];
  };
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

`localizations` is keyed by locale code and contains menu-facing overrides. Locale selection and fallback behavior belong to the cartridge localization implementation; the console passes the selected locale through the mount context.

When a localized cartridge is selected, `RoccoCartridgeMenu` returns
`selectedLocale`; `RoccoCartridgeManager` passes it to either
`mount({ sdk, locale })` or the explicit legacy `mount({ engine, locale })`.

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
- `src/console/cartridges/sdk-v1/README.md` for the public SDK contract and capability model.
