# ADR-002: Cartridge SDK Versioning and Capability Negotiation

- Status: Accepted
- Date: 2026-07-13
- Supersedes: none
- Related: audit SDK-001, ROCCO-011 (Phase 2 — Stabilize the platform)

## Context

The `RoccoEngine` type exposed the entire internal runtime surface to cartridges.
It leaked host-only methods (`video.update`, `video.render`, `video.viewport.setHost`,
`video.zoom`, render-layer ordering, `effects.tick`, `jukebox.unlock`) and had no
version or capability concept. Any change to a subsystem broke unrelated cartridges
and their mocks, and there was no way to reject an incompatible cartridge before
`setup()`/`mount()`.

## Decision

1. **Three surfaces.** The runtime is split into `ConsoleKernel` (private:
   `update`/`render`/`viewport`/scheduler/adapters), `CartridgeSdkV1` (stable,
   narrow, versioned API), and `CartridgeCapabilities` (negotiated optional
   features).
2. **Versioning.** The manifest declares `runtime.sdk` as a semver range
   (e.g. `'^1.0.0'`). The console implements `CARTRIDGE_SDK_VERSION = '1.0.0'`
   and rejects manifests whose range is not satisfied.
3. **Capability negotiation.** The manifest declares `runtime.capabilities` from a
   fixed set (`video.sprites.v1`, `audio.v1`, `jukebox.v1`, `effects.v1`,
   `input.v1`, `storage.v1`, `composition.v1`, `logger.v1`, `scope.v1`, ...).
   Unknown capabilities are rejected before mount.
4. **Compatibility adapter.** `createCartridgeSdkV1({ engine, scope, manifest })`
   wraps the full `RoccoEngine` and exposes only the v1 subset, so legacy
   `RoccoEngine` code keeps working while new cartridges use the stable surface.
5. **Migration.** Internal call sites adopt `context.sdk`. New code must not depend
   on the old `RoccoEngine` surface for cartridge-facing needs. The old surface is
   removed in a future major version.

## Consequences

- A cartridge cannot invoke `render()` or mutate the viewport through the SDK.
- Incompatible SDK versions and unknown capabilities are caught before mount.
- Cartridge mocks implement only the capabilities they use.
- Surface changes are now backward-compatible within a major version.

## Alternatives considered

- **Full `src/contracts/` extraction immediately.** Rejected for now: it requires
  relocating every shared data type out of `src/console`, which belongs to the
  broader dependency-inversion effort (TYP-001 / ROCCO-027). The v1 interfaces are
  written as neutral `Cartridge*Api` types so they can be lifted later without
  touching call sites.
- **Expose `RoccoEngine` directly with documentation only.** Rejected: documentation
  alone did not prevent leakage or breaking changes.
