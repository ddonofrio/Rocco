# Rocco Level Runtime

This directory contains cartridge-specific runtime helpers that sit between `RoccoLevelManager` and the concrete level classes.

These files are not generic console systems. They are the legacy compatibility path over the newer `rpce/` plus `games/rocco-default/` split. They still coordinate the `rocco-default` runtime graph, but level registration and connection ownership now originate from the game map definitions under `src/cartridges/rocco/games/rocco-default/maps/*`.

## Files

- `rocco-level-registry.ts` - Creates and stores the level instances used by the cartridge from the compiled game graph (`CompiledGame`). It instantiates levels from `compiledGame.levelsById` and re-creates a map on `resetMap(mapId)` (used for Nether re-creation during checkpoint restores). It no longer owns any game-specific map concept.
- `rocco-level-transition-controller.ts` - Wraps the generic `RpceTransitionController` and resolves connector endpoints through the compiled graph's indexed `transitionsByEndpoint`. It keeps pending exit intent, connector hit resolution, scripted connector resolution, and transition cooldown state in one compatibility controller. It does not import a flat global connection list.
- `rocco-scene-action-router.ts` - Builds the interaction context, runs the staged interaction registry dispatch, keeps the blocking-sequence guard, and updates exit intent at the correct point in the scene-click pipeline.
- `rocco-inventory-runtime-controller.ts` - Owns player inventory storage, storage-transfer sessions, carried-item routing, item fusion coordination, and world-drop handoff.
- `rocco-dropped-inventory-controller.ts` - Owns per-level dropped-item state, dropped-item presentation, and pickup flow.
- `rocco-scripted-sequence-controller.ts` - Owns blocking scripted sequences such as the Stan police defeat, Stan money exchange, and bait-shop door entry choreography.
- `rocco-developer-runtime-controller.ts` - Owns developer-only menus, jump placement state, runtime event overrides, and sprite-cycle preview mode.

## Responsibility Split

- `RoccoLevelManager` owns active-level lifecycle, shared cartridge state, high-level delegation, and interaction-registry assembly.
- `runtime/` helpers own reusable cartridge runtime concerns that do not belong inside one concrete level class.
- `src/cartridges/rocco/interactions/` owns feature-level interaction rules and their priorities.
- `games/rocco-default/maps/*` owns the concrete screen-local behavior and presentation.
- `levels/pier`, `levels/bait-shop`, and `levels/nether` remain compatibility wrappers over those map folders.

## Current Scope

The current runtime layer covers:

- Level registration and lookup.
- Connector-to-connector graph traversal.
- Exit-intent tracking from scene clicks.
- Transition cooldown enforcement.
- Interaction-context assembly plus staged dispatch into the distributed interaction registry.
- Inventory storage and transfer orchestration.
- Carried-item scene-click handling and world drops.
- Dropped-item persistence, presentation, and pickup.
- Blocking scripted cartridge sequences.
- Developer-only jump, event override, and sprite-cycle runtime state.
