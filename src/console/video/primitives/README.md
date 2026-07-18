# Primitives

The primitives subsystem draws simple debug geometry on top of the scene. It is a lightweight console-owned overlay for points, lines, rectangles, circles, and polygons.

## Files

- `types.ts` - Primitive shape unions and the primitive SDK contract.
- `system.ts` - `RoccoPrimitiveSystemSDK`, the pure SDK state for registering, removing, and listing primitives.
- `pixi-renderer.ts` - PixiJS renderer for debug geometry on the configured render layer.
- `system.test.ts` - Unit tests under `tests/console/video/primitives/` for primitive registration and replacement behavior.
- `index.ts` - Barrel export.

## Behavior

- Every primitive has a stable `id`, `renderLayer`, `zIndex`, `color`, `alpha`, and `visible` flag.
- Shape-specific fields describe the geometry for `point`, `line`, `rect`, `circle`, or `polygon`.
- Adding a primitive with an existing id replaces the stored shape data for that id.
- The subsystem stores cloned state and exposes cloned reads so callers do not mutate the live registry by reference.

## Boundary

Cartridges can add primitives through `sdk.video.primitives`, usually for walk-map, hotspot, or trigger visualization. The console owns the overlay registry and Pixi drawing. Primitives are debug-facing renderables, not a substitute for scene planes, sprites, or scene-target definitions.
