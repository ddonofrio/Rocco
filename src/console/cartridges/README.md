# Cartridge Infrastructure

This directory contains the console-side infrastructure for cartridges: shared types, loader logic, and cartridge providers.

Actual cartridge implementations live in `src/cartridges`.

## Files

- `types.ts` — `RoccoCartridge`, `RoccoCartridgeManifest`, `CartridgeContextV1`, provider, loader, action, and boot-setting types.
- `loader.ts` — `RoccoDefaultCartridgeLoader`, which resolves provider and fallback cartridges.
- `index.ts` — Barrel export.

## Subdirectories

- `providers/` — Built-in console-side cartridge providers; see `providers/README.md`.
- `sdk-v1/` — Public SDK v1 contract, capability validation, and the `ConsoleKernel` adapter; see `sdk-v1/README.md`.

## Ownership and boundary

- Only `mount()` is required. `setup`, `start`, `update`, `handleAction`, `getActiveLevelId`, `stop`, and `dispose` are optional.
- `setup()` runs during boot discovery before the cartridge menu; it does not mount the cartridge and may only contribute boot settings or patch console-owned flags through the restricted setup surface (`console.getFlags()` / `console.setFlags(patch)`).
- Boot setup and mounted-cartridge lifecycle are separate operations. The selected cartridge instance is loaded only after discovery and receives `setActionCancellation`, `mount`, `start`, runtime calls, and teardown.
- Cartridges receive the capability-filtered `context.sdk` (`CartridgeSdkV1`) and an optional `locale`. The context never exposes the console kernel.

## Lifecycle invariant

`RoccoCartridgeManager` validates the manifest `runtime` block with `assertCartridgeSdkCompatibility` before mounting and rejects a missing `runtime` block, incompatible SDK ranges, or unknown capabilities. Validation lives in `sdk-v1/`.

## Extension rule

Avoid importing PixiJS rendering classes or runtime internals into cartridge code. Cartridges use `context.sdk.video` helpers for asset preloading and scene work and must not import kernel contracts or runtime implementations.

## Reading next

- `src/console/cartridges/providers/README.md` for the console-side provider layer used by the default cartridge loader.
- `src/console/cartridges/sdk-v1/README.md` for the public SDK contract and capability model.
