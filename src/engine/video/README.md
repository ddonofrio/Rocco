# Video SDK

The video SDK is the visual rendering layer of the ROCCO console. It keeps cartridge-facing state modules separate from PixiJS renderer implementations.

## Key Files

- `video-system.ts` - `RoccoRuntimeVideoSystem`, the top-level visual facade.
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

| Directory          | Purpose                                                   |
| ------------------ | --------------------------------------------------------- |
| `planes/`          | Layered graphic backgrounds and plane scenes              |
| `sprites/`         | Animated entities, motion, action profiles, and walk maps |
| `scene-targets/`   | Invisible rect, circle, and polygon hotspots              |
| `action-menu/`     | SCUMM-style radial action menus                           |
| `grid-menu/`       | Generic slot-panel menus, text choice lists, slot reorder, and item payloads |
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
- `sceneTargets` are console-owned interactive regions with no rendered sprite; input resolves hover and clicks across sprites plus scene targets.
- Plane `depthMode` can resolve a runtime render layer from sprite state, including player-aware front/back swaps driven by the active player sprite.
- Rendering is initiated by `GameRuntime`; subsystems do not self-render.
- Cartridges should call `engine.video` SDK modules and avoid Pixi renderer internals.

## Cartridge-Facing Entry Points

- `engine.video.preloadPlaneScene(scene)` and `engine.video.preloadSpriteDefinition(definition)` preload video assets.
- Use `engine.loadPlaneScene(scene)` through the engine SDK surface when replacing the active scene so runtime bookkeeping stays in sync.
- `engine.video.planes` handles plane-level inspection and mutation after a scene is active, including planes that resolve their render layer dynamically at render time.
- `engine.video.sprites`, `sceneTargets`, `actionMenus`, `gridMenus`, `messages`, `primitives`, `titles`, and `display` expose cartridge-facing visual capabilities.
- The active player selected through `engine.setPlayerSprite(id | null)` is also used by player-aware plane depth modes.
- `engine.video.render(0)` can be used to force an immediate visual sync after scripted changes.
