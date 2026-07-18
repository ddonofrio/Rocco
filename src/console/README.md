# Console

This directory contains the ROCCO host runtime.

The console owns runtime initialization, rendering, audio, input routing, effects, persistence, composition, viewport integration, cartridge discovery, cartridge selection, cartridge lifecycle, action dispatch, and resource teardown.

`GameRuntime` coordinates the host runtime. `RoccoEngine` is the broad runtime surface used internally by the console and supplied only to legacy cartridges through `LegacyCartridgeContext.engine`.

SDK v1 cartridges do not receive `RoccoEngine`. They receive the capability-filtered `CartridgeSdkV1` contract through `CartridgeContextV1.sdk`.

`src/console/**` is the source of truth for console implementation and console-owned documentation.

## Runtime boundaries

### Console runtime

The console runtime owns:

- application initialization;
- the Pixi application and render loop;
- browser viewport integration;
- input routing and effective input policy;
- composition-session presentation;
- cartridge loading and compatibility validation;
- action dispatch and cancellation;
- subsystem update and render ordering;
- resource-scope ownership and teardown.

These responsibilities are not cartridge-facing APIs.

### SDK v1 cartridges

A manifest containing `runtime` is mounted through:

```ts
cartridge.mount({
  sdk: CartridgeSdkV1,
  locale,
});
```

`CartridgeSdkV1` exposes only negotiated cartridge capabilities. It excludes kernel update, render, viewport, stage, scheduler, and teardown control.

### Legacy cartridges

A manifest without `runtime` is mounted through:

```ts
cartridge.mount({
  engine: RoccoEngine,
  locale,
});
```

This is the explicit legacy path. New cartridge documentation and examples must use `CartridgeSdkV1`.

The runtime lifecycle and resource ownership live in `src/console/lifecycle`
(see `src/console/lifecycle/README.md`). `GameRuntime` runs through the explicit
`new → initializing → ready → … → disposing → disposed` state machine and tears
down every subsystem through a hierarchical `ResourceScope` rooted at the
runtime scope with a `cartridge` child.

## Reading next

- [`lifecycle/README.md`](lifecycle/README.md) — runtime states, `ResourceScope`, and teardown ownership.
- [`input/README.md`](input/README.md) — input routing and composable input-policy leases.
- [`composition/README.md`](composition/README.md) — owned loading and composition sessions.
- [`cartridges/README.md`](cartridges/README.md) — cartridge discovery, contexts, lifecycle, manifests, and actions.
- [`cartridges/sdk-v1/README.md`](cartridges/sdk-v1/README.md) — the public SDK v1 contract and capability model.
- [`video/README.md`](video/README.md) — video runtime architecture and cartridge-facing visual APIs.
- [`video/zoom/README.md`](video/zoom/README.md) — internal zoom controller and public camera-facade boundary.
- [`../cartridges/rocco/interactions/README.md`](../cartridges/rocco/interactions/README.md) — Rocco cartridge interaction dispatch.
