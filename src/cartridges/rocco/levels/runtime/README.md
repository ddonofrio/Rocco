# Rocco Level Runtime

This directory contains the cartridge-runtime coordination layer used by `RoccoLevelManager`.

`RoccoLevelManager` is the cartridge-level facade. It owns the active SDK, active level, selected localization, player appearance, transition task, and high-level delegates. It delegates focused responsibilities to the controllers, coordinators, services, registries, and state objects in this directory.

## Responsibility boundary

- `rocco-game-composition-root.ts` builds the compiled game and wires the runtime controllers consumed by the manager.
- RPCE compiles maps and cross-map connections into the game graph.
- `games/rocco-default/maps/*` owns concrete map definitions, screen behavior, and map presentation.
- `interactions/` owns feature rule registration and interaction priority.
- `inventory/` owns inventory-domain models, storages, recipes, and menu definitions.
- The runtime controllers in this directory coordinate those domains with the mounted cartridge.
- `levels/pier`, `levels/bait-shop`, and `levels/nether` re-export the game-owned map implementations.

`RoccoLevelManager` does not implement each lower-level concern directly; it delegates to the components below.

## Coordination invariants

- The composition root creates object relationships but does not replace `RoccoLevelManager` as the owner of the active runtime.
- The scene-action router assembles interaction context and delegates actions to the interaction registry; feature behavior belongs to the registry and the active map implementations, not the router.
- The inventory runtime controller owns storage mechanics and delegates special carried-item target behavior through the interaction router.
- Transitions separate concerns: the transition controller resolves connector intent and cooldown, the plan factory prepares plans, the transition service executes them within a transaction, and world state captures the snapshot needed for rollback or remount.

## Reading next

- `../../games/rocco-default/maps/README.md` — concrete map ownership.
- `../../interactions/README.md` — interaction registry and rule dispatch.
- `../../inventory/README.md` — inventory runtime ownership.
- `../../../../console/cartridges/sdk-v1/README.md` — the active SDK facade type used here.
