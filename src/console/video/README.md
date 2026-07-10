# Video SDK

The video SDK is the visual rendering layer of the ROCCO console. It keeps cartridge-facing state modules separate from PixiJS renderer implementations.

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
| `viewport/`        | Runtime-owned fullscreen contain-scaling host             |
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

- `engine.video.preloadAssetUrls(assetUrls)` preloads raw image or UI asset URLs that belong to the console video layer.
- `engine.video.preloadPlaneScene(scene)` and `engine.video.preloadSpriteDefinition(definition)` preload scene and sprite-definition assets.
- Use `engine.loadPlaneScene(scene)` through the engine SDK surface when replacing the active scene so runtime bookkeeping stays in sync.
- `engine.video.planes` handles plane-level inspection and mutation after a scene is active, including planes that resolve their render layer dynamically at render time.
- `engine.video.sprites`, `sceneTargets`, `actionMenus`, `gridMenus`, `messages`, `primitives`, `titles`, and `display` expose cartridge-facing visual capabilities.
- The default runtime always wires `sceneTargets`, but the top-level `RoccoVideoSystem` interface keeps it optional so alternative implementations can omit it.
- `engine.video.viewport` exists for runtime coordination with the browser host. Cartridges should treat viewport lifecycle and DOM ownership as runtime-internal.
- The active player selected through `engine.setPlayerSprite(id | null)` is also used by player-aware plane depth modes.
- `engine.video.render(0)` can be used to force an immediate visual sync after scripted changes.

## Reading Next

- `src/console/video/action-menu/README.md` for radial target actions.
- `src/console/video/display/README.md` for display-profile state and CRT chrome.
- `src/console/video/messages/README.md` for sprite-anchored speech and thought bubbles.
- `src/console/video/primitives/README.md` for debug geometry overlays.
- `src/console/video/titles/README.md` for hover descriptions and other text overlays.
- `src/console/video/viewport/README.md` for browser-host scaling, cursor plumbing, and display integration.
