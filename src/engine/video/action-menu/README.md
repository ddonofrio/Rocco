# Action Menu

The action-menu subsystem is the console-owned radial interaction menu used for SCUMM-style target actions. It matches scene targets to menu definitions, tracks the active orbit state, and returns generic activations to the active cartridge.

## Files

- `types.ts` - Action-menu item, definition, state, activation, renderable, and SDK contract types.
- `system.ts` - `RoccoActionMenuSystemSDK`, the pure SDK state for registration, target matching, hover, activation, orbit timing, and screen-edge clamping.
- `pixi-renderer.ts` - PixiJS renderer for radial button layout, hover scale, and circular chrome.
- `index.ts` - Barrel export.

## Behavior

- A menu definition can target specific sprite or scene-target instance ids through `targetInstanceIds` or reusable target kinds through `targetDefinitionIds`.
- The system keeps one active action menu at a time.
- `openMenuForTarget()` resolves the first matching definition and stores the target id, target definition id, menu center, elapsed time, and hovered item.
- `update(deltaMs)` advances the orbit animation state while a menu is open.
- Clicking outside any action item closes the menu without producing an activation.
- Activating an item closes the menu and returns a generic `RoccoActionMenuActivation` with the menu id, target ids, item id, and cartridge-defined `actionId`.

## Boundary

Cartridges use this subsystem through `engine.video.actionMenus`. They usually register and unregister menu definitions while a level is active, and the input handler opens the matching menu when the player clicks a visible scene target. The console owns hover, close-on-miss, cursor flow, and rendering; the cartridge owns the meaning of each returned `actionId`.
