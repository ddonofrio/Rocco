# Sprite System

The sprite system manages animated entities such as player characters, NPCs, and interactive props.

## Files

- `types.ts` - Sprite definitions, instances, frames, clips, action profiles, walk maps, motion, facing, depth, and system types.
- `store.ts` - Definition validation and instance creation.
- `system.ts` - Sprite state, movement, animation, walk maps, hit testing, and depth sorting.
- `walkmap.ts` - Walk-map creation from image data or URI.
- `auto-crop.ts` - Automatic frame extraction from transparent sprite sheets.
- `pixi-renderer.ts` - PixiJS sprite renderer.
- `index.ts` - Barrel export.

## Core Concepts

### Definition and Instance

- A definition is a reusable blueprint with images, frames, animation clips, actions, motion profiles, and hit areas.
- An instance is a live runtime object with position, visibility, motion state, animation state, and facing.
- Definitions and instances can set `ignoreMessages` so the speech-bubble layout skips that sprite as an obstacle.
- Instances can also set `tint` and `contrast` for per-sprite color grading without changing the shared sprite definition.
- Cartridges can retune those values at runtime through the sprite SDK, which is useful for local lighting reactions without swapping sprite art.
- Load a definition with `engine.video.sprites.loadSpriteDefinition()`.
- Create instances with `engine.video.sprites.createSpriteFromDefinition()`.

### Actions

An action profile groups:

- A named action ID such as `walk`, `idle`, or `kick`.
- Directional animation mappings.
- Optional movement speed and playback rate.

### Walk Maps

Walk maps are alpha-mask images. Opaque pixels are walkable and transparent pixels are blocked.

Use `loadRoccoSpriteWalkMapFromImage()`, register the map with `engine.video.sprites.registerWalkMap()`, and bind it with `engine.video.sprites.bindToWalkMap()` before using walk-map-constrained movement.

`goTo()` builds walk-map-aware routes from those spans and simplifies dense curve segments into longer traversable lines before movement starts. This keeps click-to-walk motion responsive on curved corridors instead of repeatedly scraping against nearby blocked pixels.

### Auto Adjust

Sprite definitions can opt into `autoAdjust` when the rendered pose needs runtime compensation without changing the world transform.

- `mode: 'match-visible-height'` normalizes frames that have different visible heights after trimming or auto-cropping.
- `perspectiveByY` interpolates between `farScale` and `nearScale` from the sprite ground-point Y so cartridges can soften perspective distortion in painted scenes.
- Both adjustments compose into one `visualAdjustment` that the renderer and hit-testing paths use consistently.

### Depth Modes

| Mode            | Description                                   |
| --------------- | --------------------------------------------- |
| `fixed`         | Static z-index                                |
| `y-sort`        | Z-index follows Y position                    |
| `baseline-sort` | Z-index follows the sprite baseline           |
| `manual`        | Z-index is set explicitly by cartridge logic  |

### Auto Crop

`createRoccoSpriteAutoCroppedFrames()` extracts component frames from transparent sprite sheets. It is useful for assets such as Pelikan flight and feeding sheets.

## Facing Directions

The sprite SDK supports:

```text
right, down-right, down, down-left, left, up-left, up, up-right
```
