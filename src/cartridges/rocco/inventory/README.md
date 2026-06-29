# Rocco Inventory

This directory contains inventory state for the `rocco-default` cartridge.

The inventory belongs to the cartridge. The engine provides generic slot-panel UI, slot movement, and cursor item payloads through `engine.video.gridMenus` and the cursor subsystem.

## Files

- `types.ts` - Rocco inventory item shape.
- `rocco-inventory.ts` - Inventory storage, item factories, slot updates, and grid-menu definition projection.
- `rocco-inventory-interactions.ts` - Inventory item use resolution against cartridge sprite targets.
- `rocco-inventory.test.ts` - Unit tests for inventory behavior.
- `index.ts` - Barrel export.

## Behavior

- Items are stored in memory for the active cartridge run.
- The default Pier inventory starts with `rocco-twenty-euros`.
- Collected keys are added as `rocco-keys`.
- Items keep a slot index so grid reorder operations can persist.
- The inventory projects its current items into a reorderable 3x3 grid menu definition.
- Pier exits check whether `rocco-keys` exists in this inventory.
- The same inventory stays available after the bait shop transition because `RoccoLevelManager` owns it above the active level instance.

## UI Boundary

Inventory code does not import PixiJS and does not draw directly. It returns a `RoccoGridMenuDefinition`, and the engine renders that definition through the generic grid menu subsystem.

The console owns the cursor and only carries generic grid item payloads. Rocco inventory code owns item identity, slot persistence, labels, and game-specific use responses. `RoccoLevelManager` interprets carried inventory payloads through cartridge `scene-click` handling, including scripted outcomes such as handing the keys to Stan, unlocking the bait shop door while Stan sleeps, and keeping those items available inside the bait shop level.
