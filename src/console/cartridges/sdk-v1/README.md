# Cartridge SDK v1

This directory holds the version-stamped, cartridge-facing SDK surface. It is the stable contract a cartridge receives at mount via context.sdk, kept intentionally narrow so host-only runtime methods never leak.

## Files

| File              | Responsibility                                                           |
| ----------------- | ------------------------------------------------------------------------ |
| api.ts          | CartridgeSdkV1 and the neutral Cartridge*Api subsystem interfaces.    |
| capabilities.ts | CartridgeCapability ids and CONSOLE_SUPPORTED_CAPABILITIES.           |
| version.ts      | CARTRIDGE_SDK_VERSION and the minimal satisfies() semver matcher.     |
| adapter.ts      | createCartridgeSdkV1({ engine, scope, manifest }) wraps RoccoEngine. |
| validator.ts    | checkCartridgeSdkCompatibility / assertCartridgeSdkCompatibility.     |
| index.ts        | Barrel export.                                                          |

## What the SDK is

CartridgeSdkV1 is composed only from the already-narrow neutral subsystem module interfaces, so host-only members — video.update, video.render, video.viewport, the kernel video.zoom module, render-layer ordering, effects.tick, jukebox.unlock — are never part of the contract. The adapter returns an object that does not even carry those members at runtime, so a cartridge cannot reach them.

Visual cartridges may receive video.camera, a controlled facade exposing only setTransform, animateTo, and clear for cartridge-owned presentation sequences. It is not the kernel zoom object and does not expose render timing or viewport ownership.

It carries its own ResourceScope (scope) so a cartridge can register disposers that are cleaned up with the cartridge, and advertises the negotiated capabilities plus sdkVersion.

```typescript
interface CartridgeSdkV1 {
  readonly sdkVersion: string;
  readonly capabilities: readonly CartridgeCapability[];
  readonly video?: CartridgeVideoApi;
  readonly audio?: CartridgeAudioApi;
  readonly jukebox?: CartridgeJukeboxApi;
  readonly effects?: CartridgeEffectsApi;
  readonly input?: CartridgeInputApi;
  readonly storage?: CartridgeStorageApi;
  readonly logger?: CartridgeLoggerApi;
  readonly scope?: ResourceScope;
  beginCompositionSession?(ownerId: string, options?: { message?: string }): CompositionSession;
}
```

beginCompositionSession is exposed flat as part of the SDK v1 contract.
Legacy cartridges remain on the explicit LegacyCartridgeContext path and do
not receive an SDK v1 fallback.

## Internal required facade

CartridgeSdkV1Runtime is the internal required-facade type used by the official cartridge after capability negotiation. It is the full, non-optional view of the negotiated SDK surface and is not RoccoEngine. The official cartridge narrows CartridgeSdkV1 to CartridgeSdkV1Runtime only after negotiating its complete capability set.

## Capability negotiation

A cartridge declares the console runtime it targets and the capabilities it uses in its manifest runtime block:

```typescript
runtime: {
  sdk: '^1.0.0',
  capabilities: ['audio.v1', 'video.sprites.v1', 'composition.v1'],
}
```

RoccoCartridgeManager validates this with assertCartridgeSdkCompatibility before mount() and rejects incompatible SDK ranges or unknown capabilities. Legacy cartridges without a runtime block keep mounting against the full RoccoEngine kernel.

The exact supported capability IDs are:

- video.sprites.v1
- video.planes.v1
- video.menus.v1
- audio.v1
- jukebox.v1
- effects.v1
- input.v1
- storage.v1
- composition.v1
- logger.v1
- scope.v1

## Camera

Visual cartridges may receive video.camera, a controlled facade that exposes only setTransform, animateTo, and clear for cartridge-owned presentation sequences. It is linked to the runtime zoom controller documented in ../../video/zoom/README.md. The facade is not the kernel zoom object and does not expose render timing or viewport ownership.

## Contract tests

The surface and validation behavior are pinned by tests/console/cartridges/cartridge-sdk-v1.contract.test.ts, which proves the adapter hides internal members, delegates public members, and that compatibility validation accepts/rejects correctly.
