# Video SDK

The video tree contains both console-runtime implementation and cartridge-facing visual facades.

`RoccoRuntimeVideoSystem` is the console-owned runtime coordinator. It owns visual subsystem instances, update ordering, stage synchronization, rendering integration, and the internal zoom controller.

SDK v1 cartridges access negotiated visual operations through `CartridgeSdkV1.video`. They do not receive `RoccoRuntimeVideoSystem`.

## Boundary invariants

- `GameRuntime` initiates the console update and render cycle; cartridges do not call console update or render methods.
- The console owns the Pixi stage and renderer. Pixi renderer implementations synchronize subsystem state into Pixi objects.
- The viewport subsystem owns browser and canvas sizing, contain scaling, DOM integration, and pointer-coordinate plumbing.
- The zoom subsystem owns a presentation transform applied inside the Pixi scene.
- Viewport scaling and presentation zoom are separate systems.

## Camera facade

`sdk.video?.camera` is the complete cartridge-facing presentation-transform API. It exposes only `setTransform`, `animateTo`, and `clear`, and intentionally excludes transform-state inspection, animation-state inspection, per-frame update, stage application, renderer access, viewport sizing, or pointer-coordinate conversion. The facade delegates to the internal runtime zoom controller documented in [`zoom/README.md`](zoom/README.md).

## Subsystems

- `planes/` — Layered graphic backgrounds and plane scenes.
- `sprites/` — Animated entities, motion, action profiles, and walk maps.
- `scene-targets/` — Invisible rect, circle, and polygon hotspots.
- `action-menu/` — SCUMM-style radial action menus.
- `grid-menu/` — Generic slot-panel menus, text choice lists, slot reorder, and item payloads.
- `messages/` — Sprite-anchored speech and thought bubbles.
- `primitives/` — Debug shapes.
- `titles/` — Temporary text overlays and hover descriptions.
- `display/` — CRT-style display profile.
- `cursor/` — Custom cursor, image attachments, and pointer coordinates.
- `viewport/` — Runtime-owned fullscreen contain-scaling host.
- `post-processing/` — Pixel-level helpers and water effects.
- `zoom/` — Runtime presentation-transform controller and cartridge camera-facade boundary.

## Reading next

- [`cartridges/sdk-v1/README.md`](../cartridges/sdk-v1/README.md) for the SDK v1 entry-point surface and capability model.
- `sprites/README.md`, `planes/README.md`, `scene-targets/README.md`, `action-menu/README.md`, `grid-menu/README.md`, `messages/README.md`, `primitives/README.md`, `titles/README.md`, `display/README.md`, `cursor/README.md`, `viewport/README.md`, `post-processing/README.md`, and [`zoom/README.md`](zoom/README.md) for each subsystem's ownership.
