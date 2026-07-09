# Rocco Level Runtime

This directory contains cartridge-specific runtime helpers that sit between `RoccoLevelManager` and the concrete level classes.

These files are not generic engine systems. They coordinate the `rocco-default` level graph and keep cartridge runtime responsibilities grouped by concern.

## Files

- `rocco-level-registry.ts` - Creates and stores the level instances used by the cartridge, including Nether-level re-creation for checkpoint restores.
- `rocco-level-transition-controller.ts` - Owns the shared level-connection graph, pending exit intent, connector hit resolution, scripted connector resolution, and transition cooldown state.
- `rocco-scene-action-router.ts` - Owns action-routing priority across developer mode, dropped items, carried inventory use, grid menus, self actions, and level-specific action handling.
- `rocco-inventory-runtime-controller.ts` - Owns player inventory storage, storage-transfer sessions, carried-item routing, item fusion coordination, and world-drop handoff.
- `rocco-dropped-inventory-controller.ts` - Owns per-level dropped-item state, dropped-item presentation, and pickup flow.
- `rocco-scripted-sequence-controller.ts` - Owns blocking scripted sequences such as the Stan police defeat, Stan money exchange, and bait-shop door entry choreography.
- `rocco-developer-runtime-controller.ts` - Owns developer-only menus, jump placement state, runtime event overrides, and sprite-cycle preview mode.

## Responsibility Split

- `RoccoLevelManager` owns active-level lifecycle, shared cartridge state, and high-level delegation.
- `runtime/` helpers own reusable cartridge runtime concerns that do not belong inside one concrete level class.
- `levels/pier`, `levels/bait-shop`, and `levels/nether` own screen-local behavior and presentation.

## Current Scope

The current runtime layer covers:

- Level registration and lookup.
- Connector-to-connector graph traversal.
- Exit-intent tracking from scene clicks.
- Transition cooldown enforcement.
- Centralized scene-action priority and delegation.
- Inventory storage and transfer orchestration.
- Carried-item scene-click handling and world drops.
- Dropped-item persistence, presentation, and pickup.
- Blocking scripted cartridge sequences.
- Developer-only jump, event override, and sprite-cycle runtime state.
