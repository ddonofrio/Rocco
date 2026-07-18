# Video SDK

The video tree contains both console-runtime implementation and cartridge-facing visual facades.

`RoccoRuntimeVideoSystem` is the console-owned runtime coordinator. It owns visual subsystem instances, update ordering, stage synchronization, rendering integration, and the internal zoom controller.

SDK v1 cartridges access negotiated visual operations through `CartridgeSdkV1.video`. They do not receive `RoccoRuntimeVideoSystem`.

## Key Files

- `runtime-system.ts` - `RoccoRuntimeVideoSystem`, the top-level visual facade.
- `types.ts` - Video SDK module and system interface types.
- `render-layers.ts` - Render layer definitions and z-order.
- `index.ts` - Barrel export.

## Render Layers

```text
background.back      0
background.main      10
world.behind         20
world.mid            25
world.actors         30
world.front          40
foreground           50
ui.action-menu       55
overlay.primitives   60
overlay.messages     68
overlay.titles       70
ui                   80
display.profile      90
```

## Subsystems

| Directory          | Purpose                                                                        |
| ------------------ | ------------------------------------------------------------------------------ |
| `planes/`          | Layered graphic backgrounds and plane scenes                                   |
| `sprites/`         | Animated entities, motion, action profiles, and walk maps                      |
| `scene-targets/`   | Invisible rect, circle, and polygon hotspots                                   |
| `action-menu/`     | SCUMM-style radial action menus                                                |
| `grid-menu/`       | Generic slot-panel menus, text choice lists, slot reorder, and item payloads   |
| `messages/`        | Sprite-anchored speech and thought bubbles                                     |
| `primitives/`      | Debug shapes                                                                   |
| `titles/`          | Temporary text overlays and hover descriptions                                 |
| `display/`         | CRT-style display profile                                                      |
| `cursor/`          | Custom cursor, image attachments, and pointer coordinates                      |
| `viewport/`        | Runtime-owned fullscreen contain-scaling host                                  |
| `post-processing/` | Pixel-level helpers and water effects                                          |
| `zoom/`            | Runtime presentation-transform controller and cartridge camera-facade boundary |

## Architecture

- `RoccoRuntimeVideoSystem` owns console-side visual subsystem instances and renderer coordination.
- Cartridge-facing SDK modules contain domain operations and controlled facades, not render-loop ownership.
- Pixi renderer implementations synchronize subsystem state into Pixi objects.
- `GameRuntime` initiates the console update and render cycle.
- Cartridges do not call console update or render methods.
- The console owns the Pixi stage and renderer.
- The viewport subsystem owns browser and canvas sizing, contain scaling, DOM integration, and pointer-coordinate plumbing.
- The zoom subsystem owns a presentation transform applied inside the Pixi scene.
- Viewport scaling and presentation zoom are separate systems.

## SDK v1 cartridge entry points

SDK v1 cartridges use the optional members exposed through `context.sdk`. Every
subsystem is optional on the public SDK type; availability depends on the
negotiated capability set. See
[`cartridges/sdk-v1/README.md`](../cartridges/sdk-v1/README.md) for the full
entry-point surface and capability model.

## Camera facade

`sdk.video?.camera` is the complete cartridge-facing presentation-transform API.
It exposes only `setTransform`, `animateTo`, and `clear`, and intentionally
excludes transform-state inspection, animation-state inspection, per-frame
update, stage application, direct Pixi stage access, renderer access, viewport
sizing, browser fullscreen handling, and pointer-coordinate conversion.

The facade delegates to the internal runtime zoom controller documented in [`zoom/README.md`](zoom/README.md).

## Frame interaction

During a frame:

1. The console advances time-based visual subsystem state.
2. The zoom controller advances any active transform animation.
3. Visual subsystem state is synchronized with Pixi objects.
4. The current presentation transform is applied to the Pixi stage.
5. The console renders the frame.

Cartridges can request camera transforms but cannot drive this frame lifecycle.

## Reading Next

- `sprites/README.md` for animated entities, motion, walk maps, and depth modes.
- `planes/README.md` for layered graphic backgrounds and plane scenes.
- `scene-targets/README.md` for invisible hotspots and hover descriptions.
- `action-menu/README.md` for radial target actions.
- `grid-menu/README.md` for generic slot-panel and text-choice menus.
- `messages/README.md` for sprite-anchored speech and thought bubbles.
- `primitives/README.md` for debug geometry overlays.
- `titles/README.md` for hover descriptions and other text overlays.
- `display/README.md` for display-profile state and CRT chrome.
- `cursor/README.md` for the custom cursor and pointer plumbing.
- `viewport/README.md` for browser-host scaling, cursor plumbing, and display integration.
- `post-processing/README.md` for pixel-level helpers and water-color effects.
- [`zoom/README.md`](zoom/README.md) for presentation transforms and the camera-facade boundary.
