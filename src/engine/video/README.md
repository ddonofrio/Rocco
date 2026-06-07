# Video System

The video system is the visual rendering layer of the ROCCO console. It keeps cartridge-facing state APIs separate from PixiJS renderer implementations.

## Key Files

- `video-system.ts` - `RoccoRuntimeVideoSystem`, the top-level visual facade.
- `types.ts` - Video system interface types.
- `render-layers.ts` - Render layer definitions and z-order.
- `renderer.ts` - Renderer mount, unmount, render, and sync contract.
- `video-scene.ts` - Lightweight video scene descriptor.
- `index.ts` - Barrel export.

## Render Layers

```text
background.back      0
background.main      10
world.behind         20
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

| Directory          | Purpose                                                   |
| ------------------ | --------------------------------------------------------- |
| `planes/`          | Layered graphic backgrounds and plane scenes              |
| `sprites/`         | Animated entities, motion, action profiles, and walk maps |
| `action-menu/`     | SCUMM-style radial action menus                           |
| `grid-menu/`       | Generic slot-panel menus, slot reorder, and item payloads |
| `messages/`        | Sprite-anchored speech and thought bubbles                |
| `primitives/`      | Debug shapes                                              |
| `titles/`          | Temporary text overlays and hover descriptions            |
| `display/`         | CRT-style display profile                                 |
| `cursor/`          | Custom cursor, image attachments, and pointer coordinates |
| `viewport/`        | Fullscreen contain-scaling host                           |
| `post-processing/` | Pixel-level helpers and water effects                     |

## Architecture Notes

- `RoccoRuntimeVideoSystem` owns SDK and renderer pairs for visual subsystems.
- SDK modules manage state and domain rules.
- Pixi renderer modules sync SDK state into Pixi containers.
- Rendering is initiated by `GameRuntime`; subsystems do not self-render.
- Cartridges should call engine/video APIs and avoid Pixi renderer internals.
