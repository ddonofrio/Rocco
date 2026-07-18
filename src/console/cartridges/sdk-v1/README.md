# Cartridge SDK v1

This directory holds the version-stamped, cartridge-facing SDK surface. It is the stable contract a cartridge receives at `mount` via `context.sdk`, kept intentionally narrow so host-only runtime methods never leak.

## Files

- `api.ts` — `CartridgeSdkV1` and the neutral `Cartridge*Api` subsystem interfaces (authoritative member surface).
- `capabilities.ts` — `CartridgeCapability` ids and `CONSOLE_SUPPORTED_CAPABILITIES`.
- `version.ts` — `CARTRIDGE_SDK_VERSION` and the minimal semver matcher.
- `adapter.ts` — `createCartridgeSdkV1({ kernel, scope, manifest })` wraps `ConsoleKernel`.
- `validator.ts` — `checkCartridgeSdkCompatibility` / `assertCartridgeSdkCompatibility`.
- `index.ts` — Barrel export.

## Capability-filtering invariant

The adapter returns an object filtered from the negotiated capability list, so members outside the negotiated set are absent at runtime and callers must narrow or use optional access. A manifest that omits `runtime.capabilities` receives the complete SDK v1 capability set. Unknown capability identifiers are rejected before mount. The supported capability identifiers and the per-capability video availability matrix are defined in `capabilities.ts`.

`CartridgeSdkV1` is composed only from the narrow neutral subsystem interfaces, so host-only members (`video.update`, `video.render`, `video.viewport`, `effects.tick`, `jukebox.unlock`, …) are never part of the contract.

## Public SDK vs internal required facade

`CartridgeSdkV1` is the public, capability-filtered contract that general cartridge documentation and third-party examples must use.

`CartridgeSdkV1Runtime` is an internal type used by the official cartridge after its manifest has negotiated every capability it requires. It still contains only cartridge-facing facades and is not a console kernel or direct kernel access. Do not describe it as such.

## Contract tests

The surface and validation behavior are pinned in `tests/console/cartridges/`:

- `cartridge-sdk-v1-adapter.contract.test.ts` owns runtime shape, capability filtering, delegation, receiver binding, storage namespacing, aliases, and host-member exclusion.
- `cartridge-sdk-v1-validator.test.ts` owns malformed runtime values, SDK-range compatibility, unsupported capabilities, error result contents, and `CartridgeSdkIncompatibleError`.
