# Rocco Inventory

This directory contains inventory state for the `rocco-default` cartridge.

The inventory belongs to the cartridge. The engine provides generic slot-panel UI, slot movement, and cursor item payloads through `engine.video.gridMenus` and the cursor subsystem.

## Files

- `types.ts` - Rocco inventory item shape.
- `inventory-storage.ts` - Reusable storage grid for player and prop inventories.
- `inventory-transfer-session.ts` - Shared left-right transfer menu projection and placement validation.
- `rocco-inventory.ts` - Inventory storage, item factories, slot updates, and grid-menu definition projection.
- `souvenir-table-items.ts` - Reusable bait shop souvenir item catalog and asset URIs.
- `souvenir-table-storage.ts` - The first 5x4 prop storage seeded from the souvenir catalog.
- `rocco-inventory-interactions.ts` - Inventory item use resolution against cartridge sprite targets.
- `rocco-inventory.test.ts` and `inventory-transfer-session.test.ts` - Focused unit tests for inventory behavior and shared storage transfers.
- `index.ts` - Barrel export.

## Behavior

- Items are stored in memory for the active cartridge run.
- The default Pier inventory starts with `rocco-twenty-euros`.
- Collected keys are added as `rocco-keys`.
- Items keep a slot index so grid reorder operations can persist.
- The inventory projects its current items into a reorderable 3x3 grid menu definition.
- The cartridge can also project two storages into one transfer menu, with the prop storage on the left and Rocco on the right.
- Storage-specific items can refuse invalid placements through `allowedStorageIds`.
- Storages refuse overfill and reject duplicate slot commits, so failed pickups or transfers do not overwrite another item.
- Pier exits check whether `rocco-keys` exists in this inventory.
- The same inventory stays available after the bait shop transition because `RoccoLevelManager` owns it above the active level instance.
- The first prop storage is the bait shop souvenir table, a 5x4 layout that starts with 19 reusable souvenir items.

## UI Boundary

Inventory code does not import PixiJS and does not draw directly. It returns `RoccoGridMenuDefinition` objects, and the engine renders them through the generic grid menu subsystem.

The console owns the cursor and only carries generic grid item payloads. Rocco inventory code owns item identity, slot persistence, labels, and game-specific use responses. `RoccoLevelManager` interprets carried inventory payloads through cartridge `scene-click` handling, including scripted outcomes such as handing the keys to Stan, unlocking the bait shop door while Stan sleeps, and opening shared storage transfers such as the bait shop souvenir table.
