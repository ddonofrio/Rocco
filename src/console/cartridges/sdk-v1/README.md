# Cartridge SDK v1

This directory holds the version-stamped, cartridge-facing SDK surface. It is
the stable contract a cartridge receives at `mount` via `context.sdk`, kept
intentionally narrow so host-only runtime methods never leak.

## Files

| File              | Responsibility                                                             |
| ----------------- | -------------------------------------------------------------------------- |
| `api.ts`          | `CartridgeSdkV1` and the neutral `Cartridge*Api` subsystem interfaces.     |
| `capabilities.ts` | `CartridgeCapability` ids and `CONSOLE_SUPPORTED_CAPABILITIES`.            |
| `version.ts`      | `CARTRIDGE_SDK_VERSION` and the minimal `satisfies()` semver matcher.      |
| `adapter.ts`      | `createCartridgeSdkV1({ kernel, scope, manifest })` wraps `ConsoleKernel`. |
| `validator.ts`    | `checkCartridgeSdkCompatibility` / `assertCartridgeSdkCompatibility`.      |
| `index.ts`        | Barrel export.                                                             |

## What the SDK is

`CartridgeSdkV1` is composed only from the already-narrow neutral subsystem
module interfaces, so host-only members — `video.update`, `video.render`,
`video.viewport`, the kernel `video.zoom` module, render-layer ordering, `effects.tick`,
`jukebox.unlock` — are never part of the contract. The adapter returns an
object that does not even carry those members at runtime, so a cartridge
cannot reach them.

Visual cartridges may receive `video.camera`, a controlled facade exposing only
`setTransform`, `animateTo`, and `clear` for cartridge-owned presentation
sequences. It is not the kernel zoom object and does not expose render timing or
viewport ownership.

When `scope.v1` is negotiated, the SDK exposes the cartridge-owned `ResourceScope` through `scope`, allowing the cartridge to register disposers that are cleaned up with the cartridge. `sdkVersion` and the negotiated `capabilities` are always present.

```typescript
interface CartridgeSdkV1 {
  readonly video?: CartridgeVideoApi;
  readonly audio?: CartridgeAudioApi;
  readonly jukebox?: CartridgeJukeboxApi;
  readonly effects?: CartridgeEffectsApi;
  readonly input?: CartridgeInputApi;
  readonly storage?: CartridgeStorageApi;
  readonly logger?: CartridgeLoggerApi;

  readonly log?: CartridgeLoggerApi['log'];
  readonly setStatus?: CartridgeLoggerApi['setStatus'];
  readonly scope?: ResourceScope;

  readonly sdkVersion: string;
  readonly capabilities: readonly CartridgeCapability[];

  acquireInputLease?: CartridgeInputApi['acquireInputLease'];
  getInputMode?: CartridgeInputApi['getInputMode'];

  loadPlaneScene?: (scene: RoccoPlaneScene) => void;
  serializePlaneScene?: (sceneId: string) => RoccoPlaneScene;

  setPlayerSprite?: (instanceId: string | undefined) => void;
  getPlayerSprite?: () => string | undefined;

  isDeveloperModeEnabled?: () => boolean;
  getConsoleFlags?: () => RoccoConsoleFlags | undefined;
  setConsoleFlags?: (patch: Partial<RoccoConsoleFlags>) => void;

  beginCompositionSession?: (ownerId: string, options?: { message?: string }) => CompositionSession;
}
```

- `sdkVersion` and `capabilities` are always present.
- All other public members are optional.
- The adapter filters subsystem availability from the negotiated capability list.
- Callers using the public type must narrow or use optional access.
- A manifest that omits `runtime.capabilities` receives the complete SDK v1 capability set.

Most optional members are controlled by capability negotiation. The adapter also installs `isDeveloperModeEnabled`, `getConsoleFlags`, and `setConsoleFlags` as optional compatibility helpers without a dedicated capability identifier.

`beginCompositionSession` is exposed flat as part of the SDK v1 contract.

## Video capability structure

- `video` exists when at least one of `video.planes.v1`, `video.sprites.v1`, or `video.menus.v1` is negotiated.
- `video.planes` and `video.preloadPlaneScene` require `video.planes.v1`.
- `video.sprites`, `video.sceneTargets`, `video.preloadSpriteDefinition`, and `video.preloadSpriteDefinitions` require `video.sprites.v1`.
- `video.actionMenus`, `video.gridMenus`, `video.messages`, `video.primitives`, and `video.titles` require `video.menus.v1`.
- `video.display` is exposed when either `video.planes.v1` or `video.menus.v1` is negotiated.
- `video.camera` is exposed whenever the video facade exists. It has no separate capability identifier and exposes only `setTransform`, `animateTo`, and `clear`.
- `video.preloadAssetUrls` is present whenever the video facade exists.

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
`assertCartridgeSdkCompatibility` before `mount()` and rejects a missing
`runtime` block, incompatible SDK ranges, or unknown capabilities.

## Capabilities

The supported capability identifiers are:

- `video.sprites.v1`
- `video.planes.v1`
- `video.menus.v1`
- `audio.v1`
- `jukebox.v1`
- `effects.v1`
- `input.v1`
- `storage.v1`
- `composition.v1`
- `logger.v1`
- `scope.v1`

Unknown capability identifiers are rejected before mount.

## Internal required facade

`CartridgeSdkV1Runtime` is an internal type used by the official cartridge after its manifest has negotiated every capability required by that cartridge.

It converts the negotiated public facade into the required view expected by the official runtime. It still contains only cartridge-facing facades and must not be described as the console kernel or as direct kernel access.

General cartridge documentation and third-party cartridge examples must use `CartridgeSdkV1`, not `CartridgeSdkV1Runtime`.

## Camera facade

Visual SDK v1 cartridges may use `sdk.video?.camera` for cartridge-owned presentation transforms.

The facade exposes only:

- `setTransform`
- `animateTo`
- `clear`

It does not expose the kernel zoom controller, transform inspection, animation-state inspection, `update`, stage application, rendering, or viewport ownership.

## Contract tests

The surface and validation behavior are pinned by
`tests/console/cartridges/cartridge-sdk-v1.contract.test.ts`, which proves
the adapter hides internal members, delegates public members, and that
compatibility validation accepts/rejects correctly.
