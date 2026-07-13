# Cartridge SDK v1

This directory holds the version-stamped, cartridge-facing SDK surface (audit
SDK-001 / ROCCO-011). It is the stable contract a cartridge receives at
`mount` via `context.sdk`, kept intentionally narrow so host-only runtime
methods never leak.

## Files

| File           | Responsibility                                                              |
| -------------- | -------------------------------------------------------------------------- |
| `api.ts`       | `CartridgeSdkV1` and the neutral `Cartridge*Api` subsystem interfaces.     |
| `capabilities.ts` | `CartridgeCapability` ids and `CONSOLE_SUPPORTED_CAPABILITIES`.        |
| `version.ts`   | `CARTRIDGE_SDK_VERSION` and the minimal `satisfies()` semver matcher.      |
| `adapter.ts`   | `createCartridgeSdkV1({ engine, scope, manifest })` wraps `RoccoEngine`.   |
| `validator.ts` | `checkCartridgeSdkCompatibility` / `assertCartridgeSdkCompatibility`.      |
| `index.ts`     | Barrel export.                                                             |

## What the SDK is

`CartridgeSdkV1` is composed only from the already-narrow neutral subsystem
module interfaces, so host-only members — `video.update`, `video.render`,
`video.viewport`, `video.zoom`, render-layer ordering, `effects.tick`,
`jukebox.unlock` — are never part of the contract. The adapter returns an
object that does not even carry those members at runtime, so a cartridge
cannot reach them.

It carries its own `ResourceScope` (`scope`) so a cartridge can register
disposers that are cleaned up with the cartridge, and advertises the
negotiated `capabilities` plus `sdkVersion`.

```typescript
interface CartridgeSdkV1 {
  readonly video: CartridgeVideoApi;
  readonly audio: CartridgeAudioApi;
  readonly jukebox: CartridgeJukeboxApi;
  readonly effects: CartridgeEffectsApi;
  readonly input: CartridgeInputApi;
  readonly storage: CartridgeStorageApi;
  readonly logger: CartridgeLoggerApi;
  readonly scope: ResourceScope;
  readonly sdkVersion: string;
  readonly capabilities: readonly CartridgeCapability[];
  beginCompositionSession(ownerId: string, options?: { message?: string }): CompositionSession;
}
```

`beginCompositionSession` is exposed flat (mirroring `RoccoEngine`) so the
`engine` fallback path in tests and legacy call sites keeps working.

## Capability negotiation

A cartridge declares the console runtime it targets and the capabilities it
uses in its manifest `runtime` block:

```typescript
runtime: {
  sdk: '^1.0.0',
  capabilities: ['audio.v1', 'video.sprites.v1', 'composition.v1'],
}
```

`RoccoCartridgeManager` validates this with
`assertCartridgeSdkCompatibility` before `mount()` and rejects incompatible
SDK ranges or unknown capabilities. Legacy cartridges without a `runtime`
block keep mounting against the full `RoccoEngine` kernel. See
`docs/adr/ADR-002-cartridge-sdk-versioning.md`.

## Future: extraction to `src/contracts/`

The `Cartridge*Api` types are written as neutral, self-contained interfaces so
they can later be lifted into a top-level `src/contracts/` directory (the
broader dependency-inversion effort, TYP-001 / ROCCO-027, Phase 5) without
touching call sites. The adapter and validator stay console-owned; only the
interface declarations move.

## Contract tests

The surface and validation behavior are pinned by
`tests/console/cartridges/cartridge-sdk-v1.contract.test.ts`, which proves
the adapter hides internal members, delegates public members, and that
compatibility validation accepts/rejects correctly.
