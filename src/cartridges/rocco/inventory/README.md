# Rocco Inventory

This directory contains inventory state for the `rocco-default` cartridge.

The inventory belongs to the Rocco cartridge. The console supplies generic slot-panel UI, slot movement, and carried cursor payloads through `sdk.video.gridMenus`. The console does not own Rocco item identity, storage, recipes, persistence within the active run, or game-specific item-use behavior.

## Ownership

The implementation in this directory is the canonical Rocco inventory domain.

`src/cartridges/rocco/games/rocco-default/inventory` re-exports this domain for game-local imports. New inventory implementation and documentation belong in this directory.

## Files

- `types.ts` — owns the Rocco item model.
- `inventory-storage.ts` — owns generic cartridge storage placement and slot validation.
- `inventory-transfer-session.ts` — projects two storages into a transfer menu and commits valid placement changes.
- `rocco-inventory.ts` — owns the player inventory storage and grid projection.
- `souvenir-table-items.ts` — owns the reusable souvenir catalog.
- `souvenir-table-storage.ts` — creates the bait-shop souvenir storage.
- `rocco-inventory-interactions.ts` — resolves item-use text and inventory-domain responses.
- `assets/souvenirs/` — souvenir-table item art plus crafted ritual-item images owned by the inventory domain.
- `rocco-inventory.test.ts` and `inventory-transfer-session.test.ts` — focused unit tests for inventory behavior and shared storage transfers.
- `index.ts` — public barrel.

## Runtime orchestration

`RoccoInventoryRuntimeController`, located in `src/cartridges/rocco/levels/runtime`, coordinates the inventory domain with the active cartridge runtime.

It owns:

- the live player inventory instance;
- registered cartridge storages;
- the bait-shop souvenir-table storage instance;
- storage-transfer sessions;
- opening and closing player and transfer grid menus;
- grid-menu activation routing;
- carried-item scene-click routing;
- inventory fusion coordination;
- world-drop handoff;
- inventory snapshots and restoration;
- status-refresh callbacks.

The controller seeds the player inventory with the 20 EUR item when it is created.

The controller is created once for the active `RoccoLevelManager` runtime and survives ordinary level switches. Individual levels do not own the player inventory.

## Interaction boundary

The interaction registry decides which inventory-related rule owns an action.

`register-inventory-interactions.ts` routes player-inventory grid actions and ordinary carried-item scene clicks.

Pier-specific special uses, including interactions involving Stan, money, keys, the bait-shop door, or Rocco's appearance, are owned by Pier interaction rules.

`RoccoInventoryRuntimeController` provides storage and carried-item mechanics. Map and interaction rules decide game-specific outcomes.

`RoccoLevelManager` owns the high-level cartridge runtime and delegates inventory behavior to the runtime controller and interaction registry.

## Behavior

- Items are stored in memory for the active cartridge run.
- `RoccoInventory` itself is the storage/domain object.
- The runtime controller seeds the default `rocco-twenty-euros` (20 EUR) item when the player inventory is created.
- Story pickups can add the magazine, the mysterious key, the lab coat, and crafted bait-shop ritual items such as `rocco-floating-amulet`, `rocco-spiral-razor`, `rocco-abyssal-talisman`, and `rocco-coral-relic`.
- The player inventory projects a 3×3 grid menu definition.
- The bait-shop souvenir table is a 5×4 prop storage seeded with 19 reusable souvenir items.
- Items keep a slot index so grid reorder operations survive within the live cartridge state for the current run.
- `RoccoLevelManager.mount` preloads every player-inventory item image (`ROCCO_INVENTORY_ITEM_IMAGE_URLS`) and the bait shop souvenir-table item images (`ROCCO_SOUVENIR_TABLE_ITEM_IMAGE_URLS`) through the shared asset preloader, so the grid menus never fetch those PNGs on demand over a slow connection.
- Swapping a compatible carried item onto another player-inventory item fuses both ingredients into one result and replaces them in the grid.
- `planRoccoCoralRelicAssembly()` derives whether the accessible inventory can already reach the Coral Relic and returns the ordered fusion steps used by the bait-shop toilet flow. The current recipe chain remains cartridge-owned.
- The cartridge can project two storages into one transfer menu, with the prop storage on the left and Rocco on the right.
- Storage-specific items can refuse invalid placements through `allowedStorageIds`.
- Storages refuse overfill and reject duplicate slot commits, so failed pickups or transfers do not overwrite another item.
- When the player inventory is full, new pickups are handled as inventory-full cases rather than overwriting existing slots.
- Developer mode can seed selected inventory items directly, including the Coral Relic, through the cartridge-specific developer inventory menu.
- The same player inventory stays available after the bait shop transition because `RoccoInventoryRuntimeController` owns it above the active level instance.
- Inventory snapshots capture the current storage and placement state; restoration rebuilds the player inventory from a snapshot.

## UI boundary

Inventory code does not import PixiJS and does not render UI directly.

The cartridge creates `RoccoGridMenuDefinition` values. The console grid-menu subsystem renders them and owns only generic menu state, slot interaction, and carried payload presentation.

The Rocco cartridge owns:

- item identity;
- labels and localization;
- storage membership;
- slot persistence;
- recipes;
- placement restrictions;
- item-use results;
- world-drop behavior;
- transfer semantics.

## Adding a carried item

If you add or change a player-carried item, handle the full lifecycle:

1. Add the item id and factory in `rocco-inventory.ts`.
2. Export it from `index.ts` if another module needs it.
3. Add localized labels in the inventory catalogs.
4. Decide whether the item is droppable.
5. If droppable, define `groundSprite` and a repo-owned ground asset.
6. Verify pickup, drop, and pickup-again behavior manually.
7. If the item can be used on targets, wire the responses through the inventory interaction path.

An inventory item without `groundSprite` cannot be dropped by the generic inventory drop flow. A new pickup should not mutate scene state until inventory admission succeeds.

## Pickup pattern

Use the manager-owned pickup callbacks from `RoccoLevelMountOptions`:

- `onPickupRequested(item)` checks whether the pickup is currently allowed, including full inventory cases.
- `onPickupCollected(item)` commits the pickup and shows the generic success line.

Safe order:

1. Build the item.
2. Call `onPickupRequested(item)`.
3. If it returns `false`, leave the level state unchanged.
4. Only then mark the prop as taken and call `onPickupCollected(item)`.
