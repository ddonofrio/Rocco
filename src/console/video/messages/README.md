# Messages

The messages subsystem shows sprite-anchored speech and thought bubbles. It keeps message state separate from sprite rendering and turns cartridge text requests into renderable overlays tied to live sprite instances.

## Files

- `types.ts` - Message mode, style, request, state, renderable, and SDK contract types.
- `system.ts` - `RoccoSpriteMessageSystemSDK`, the pure SDK state for adding, updating, sequencing, and removing messages.
- `pixi-renderer.ts` - PixiJS renderer for bubble layout, side selection, thought trails, and stage-aware placement.
- `pixi-renderer.test.ts` - Renderer tests for bubble layout and visual constraints.
- `index.ts` - Barrel export.

## Behavior

- `showMessage()` accepts a fully specified message request anchored to a `spriteInstanceId`.
- `say()` and `think()` are convenience helpers that set `mode` for speech or thought text.
- Message text can be a string or an array of strings. Arrays advance one line at a time as each `ttlMs` window expires.
- Messages can opt into `background: true` so they stay out of the foreground click-to-dismiss flow used by the input handler.
- Renderables are only produced while the referenced sprite instance still exists in the current sprite render list.

## Boundary

Cartridges use the subsystem through `engine.video.messages`. They supply text, timing, and optional styling, but they do not position Pixi text or bubble geometry directly. The runtime contributes live sprite bounds and design-size metrics, and the renderer decides final placement on the `overlay.messages` layer or another specified render layer.
