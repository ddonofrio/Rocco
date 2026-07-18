# Cartridge Infrastructure

This directory contains the console-side infrastructure for cartridges: shared types, loader logic, and cartridge providers.

Actual cartridge implementations live in `src/cartridges`.

## Files

- `types.ts` - `RoccoCartridge`, `RoccoCartridgeManifest`, `CartridgeContextV1`, provider, and loader types.
- `loader.ts` - `RoccoDefaultCartridgeLoader`, which resolves provider and fallback cartridges.
- `index.ts` - Barrel export.

## Subdirectories

| Directory    | Contents                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| `providers/` | Built-in console-side cartridge providers; see `providers/README.md`                                   |
| `sdk-v1/`    | Public SDK v1 contract, capability validation, and the `ConsoleKernel` adapter; see `sdk-v1/README.md` |

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
  -> selectedCartridge.mount({ sdk, locale })
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

`CartridgeContextV1` carries the capability-filtered `sdk` (`CartridgeSdkV1`)
and an optional `locale`. It is defined in `types.ts` alongside the manifest and
loader types.

- Every cartridge receives `CartridgeContextV1`.
- The context never exposes the console kernel.

Cartridges receive the narrow, version-stamped `context.sdk`, which
hides internal runtime methods (`render`, `viewport`, `effects.tick`,
`jukebox.unlock`, ...).
`locale` is set by the cartridge menu when a localized cartridge is loaded.

Every manifest declares a `runtime` block:

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
before mounting and rejects a missing `runtime` block, incompatible SDK ranges,
or unknown capabilities. The v1 SDK and capability set live in `sdk-v1/`.

Boot-time setup uses a narrower `RoccoCartridgeSetupContext` that exposes only `console.getFlags()` and `console.setFlags(patch)`; both context and boot-setting types are defined in `types.ts`.

The setup result can contribute generic boot settings (`RoccoCartridgeBootSetting`): an `id`, `label`, `description`, optional `statusLabel`/`detailLabel`, `getValueLabel()`, and an optional `activate()`.

`RoccoCartridgeManager` merges contributed boot settings by `id` and passes them to the cartridge menu.

## Cartridge Actions

`RoccoCartridgeAction` contains action-menu activations, `scene-click`, `grid-menu`, `advance-sequence`, and `carry-use` actions.

`handleAction` receives an optional `CartridgeActionContext` (signal, action id, correlation id, cartridge id, level id) and returns a synchronous `CartridgeActionDisposition` (consumed, `defaultPlayerMovement`, optional `completion`). Both types are defined in `types.ts`.

`handleAction` returns its disposition synchronously. The host uses `defaultPlayerMovement` immediately and does not await a movement decision. Optional asynchronous work belongs in `completion`. The host monitors that promise separately and aborts `context.signal` when the action is cancelled.

## Manifest

`RoccoCartridgeManifest` declares the cartridge identity and a required `runtime` block (`sdk` range plus optional `capabilities`). `id`, `title`, `version`, and `runtime` are required; the remaining fields improve boot-menu presentation. The full shape is defined in `types.ts`.

## Localized Manifest Fields

`RoccoCartridgeLocalizedManifest` is a `Partial<Pick<RoccoCartridgeManifest, ...>>` keyed by menu-facing fields (`title`, `description`, `author`, `publisher`, `genre`, `players`, `tags`); it is defined in `types.ts`.

`localizations` is keyed by locale code and contains menu-facing overrides. Locale selection and fallback behavior belong to the cartridge localization implementation; the console passes the selected locale through the mount context.

When a localized cartridge is selected, `RoccoCartridgeMenu` returns
`selectedLocale`; `RoccoCartridgeManager` passes it to
`mount({ sdk, locale })`.

## Creating a Cartridge

1. Create a folder under `src/cartridges`.
2. Add a cartridge README.
3. Implement `RoccoCartridge`.
4. Define `RoccoCartridgeManifest`.
5. Add cartridge assets.
6. Register the cartridge in `src/cartridges/index.ts`.

Avoid importing PixiJS rendering classes or engine renderer internals into
cartridge code. Cartridges use `context.sdk.video` helpers for asset
preloading and scene work and must not import kernel contracts or runtime
implementations.

## Reading Next

- `src/console/cartridges/providers/README.md` for the console-side provider layer used by the default cartridge loader.
- `src/console/cartridges/sdk-v1/README.md` for the public SDK contract and capability model.
