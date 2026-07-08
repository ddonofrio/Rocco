# Cartridge Providers

This folder contains console-side cartridge providers. A provider is the loader-facing adapter that lists available manifests and creates cartridge instances on demand.

## Files

- `builtin-cartridge-provider.ts` - `RoccoBuiltinCartridgeProvider`, the provider for statically registered built-in cartridges.

## Current Provider

`RoccoBuiltinCartridgeProvider` accepts `RoccoCartridgeRegistration[]` at construction time, stores them by manifest id, and exposes two loader-facing operations:

- `list()` returns cloned cartridge manifests for boot-menu discovery.
- `load(id)` creates a fresh cartridge instance from the matching registration, or returns `undefined` when the id is unknown.

## Boundary

Providers are part of the console cartridge-loading pipeline. `RoccoDefaultCartridgeLoader` queries providers while `RoccoCartridgeManager` handles discovery and menu flow above that layer. Cartridge folders implement `RoccoCartridge`; they do not import provider internals.
