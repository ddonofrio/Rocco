# Rocco Cartridge Development Guide

Use this file as the fast agent-oriented map for work inside `src/cartridges/rocco`.

## Read First

Before editing cartridge code, read:

1. Root `AGENTS.md`
2. Root `README.md`
3. Root `README-AGENT.md`
4. Root `DEVELOPMENT.md`
5. `src/cartridges/rocco/README.md`
6. The README chain for the folder you will touch
7. This file

After reading docs, inspect the closest implementation and nearby tests before changing code.

## Fast Routes

- Inventory or pickups:
  - `src/cartridges/rocco/inventory/README.md`
  - `src/cartridges/rocco/levels/rocco-level-manager.ts`
  - The level that triggers the pickup
- Scene targets, hover captions, or action menus:
  - `src/cartridges/rocco/levels/README.md`
  - The target level README
  - `src/engine/video/scene-targets/README.md`
  - `src/engine/video/action-menu/README.md`
- Localization:
  - `src/cartridges/rocco/localization/README.md`
  - `src/cartridges/rocco/localization/types.ts`
  - `src/cartridges/rocco/localization/{en,es}/`
- Nether screens:
  - `src/cartridges/rocco/levels/nether/README.md`
- Bait shop screens:
  - `src/cartridges/rocco/levels/bait-shop/README.md`

## Core Rules

- Keep all code and docs in English.
- Keep player-facing behavior localized. Do not leave inline strings in level code if the player can see them.
- Do not bypass localization for placeholders. Temporary text must still go through the catalogs or a localized helper.
- Keep docs factual and current-state only. Do not document aspirational behavior.
- Promote runtime assets into repo-owned cartridge paths before wiring them into code. Do not make the game depend on `.local` or other workspace-only locations.

## Localization Checklist

When adding a new visible object, verb response, caption, or item label:

1. Add the key to `src/cartridges/rocco/localization/types.ts`.
2. Add English and Spanish text in the correct locale files.
3. Resolve the text through `localization.text...` or a localized helper.
4. Re-check the touched files for mojibake fragments before handoff.

Important:

- Do not mix localized strings and hardcoded strings for the same interaction.
- Hover captions must match the current gameplay state. If the object state changes, refresh the caption too.

## Inventory Item Checklist

If you add or change a player-carried item, handle the full lifecycle:

1. Add the item id and factory in `src/cartridges/rocco/inventory/rocco-inventory.ts`.
2. Export it from `src/cartridges/rocco/inventory/index.ts` if another module needs it.
3. Add localized labels in the inventory catalogs.
4. Decide whether the item is droppable.
5. If droppable, define `groundSprite` and a repo-owned ground asset.
6. Verify pickup, drop, and pickup-again behavior manually.
7. If the item can be used on targets, wire the responses through the inventory interaction path.

Important:

- An inventory item without `groundSprite` cannot be dropped by the generic inventory drop flow.
- A new pickup should not mutate scene state until inventory admission succeeds.

## Generic Pickup Pattern

Use the manager-owned pickup callbacks from `RoccoLevelMountOptions`:

- `onPickupRequested(item)` checks whether the pickup is currently allowed, including full inventory cases.
- `onPickupCollected(item)` commits the pickup and shows the generic success line.

Safe order:

1. Build the item.
2. Call `onPickupRequested(item)`.
3. If it returns `false`, leave the level state unchanged.
4. Only then mark the prop as taken and call `onPickupCollected(item)`.

Reference examples:

- Hidden key and magazine pickups through `RoccoLevelManager`
- Nether shelf lab coat pickup

## Scene Target Pattern

For an invisible hotspot on a background:

1. Add a localized description key.
2. Register the target in the level mount flow.
3. Unregister it on unmount.
4. If it opens a radial menu, register and unregister the menu too.
5. Keep the caption synchronized with the object state.

Interaction variants:

- Hover-only target
- Click-to-inspect target
- Click-to-open-action-menu target

Good references:

- Bait shop postcard rack
- Shell City sign
- Cash register
- Nether shelf and noisy machine

## Message Runtime Notes

`roccoCartridgeMessageRuntime.think()` and `.say()` support non-repeating line selection.

Important:

- The selection memory is runtime-local only.
- It is not persisted across game sessions.
- Use a stable `historyKey` for repeated interactions.

## Validation

For TypeScript gameplay changes:

1. Run the most focused test you have.
2. Run `npm run typecheck` through the wrapper.
3. Run broader tests only when the change crosses system boundaries.

For pickup or inventory changes, manually verify:

1. Pickup with space available
2. Pickup with full inventory
3. Drop item
4. Pick the dropped item back up
5. Leave and re-enter the screen if local state is involved

## Common Pitfalls

- Hardcoded player-facing text in level files
- Placeholder text committed to gameplay
- New items without drop support decisions
- Scene captions that do not match the current prop state
- Assets referenced from workspace-only folders
- Overstating what a helper or runtime actually persists
