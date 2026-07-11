# Nether Levels

This directory is the legacy compatibility path for the Nether level family of the
`rocco-default` cartridge.

The current concrete implementation and assets live in
`src/cartridges/rocco/games/rocco-default/maps/nether/**`.

## Files

- `nether-console-hardware-spawn-level.ts` - `RoccoNetherConsoleHardwareSpawnLevel`, the first Nether screen with the one-time portal arrival sequence, region-aware perspective scaling, security-camera defeat logic, and the forward connector into Nether 2.
- `nether-end-of-hallway-door-level.ts` - `RoccoNetherEndOfHallwayDoorLevel`, the second Nether screen with a milder perspective setup, mounted doorbell, door-handle, ascending-pipes, and wheel-valve interactions, and the return connector back to Nether 1.
- `nether-reset-office-level.ts` - `RoccoNetherResetOfficeLevel`, the first Reset Office screen, available through developer mode and connected to its second screen through the same mirrored horizontal handoff used by the bait shop pair.
- `nether-reset-office-second-level.ts` - `RoccoNetherResetOfficeSecondLevel`, the second Reset Office screen, which mirrors horizontal return placement.
- `nether-level-support.ts` - Shared scene loading, walk-map projection, and ground-point helpers for Nether screens.
- `nether-arrival-effects.ts` - Shared portal and smoke sprite definitions reused by the Nether arrival sequence.
- `nether-assets.ts` - Local asset URIs for the Nether backgrounds and walk maps.
- `assets/` - Legacy asset path kept only for migration context; the current asset ownership now lives under the game-owned Nether map folder.

## Runtime Notes

- The first-screen level id is `nether-console-hardware-spawn` and the scene id is `rocco-nether-console-hardware-spawn-scene`.
- The second-screen level id is `nether-end-of-hallway-door` and the scene id is `rocco-nether-end-of-hallway-door-scene`.
- The Reset Office first-screen level id is `nether-reset-office` and the scene id is `rocco-nether-reset-office-scene`.
- The Reset Office second-screen level id is `nether-reset-office-second` and the scene id is `rocco-nether-reset-office-second-scene`.
- Both Nether levels implement the shared `RoccoLevel` contract and are registered by `RoccoLevelManager`.
- The first screen uses a one-time portal arrival sequence that reuses the bait-shop toilet portal and smoke art, sounds, and timing helpers.
- The first screen applies region-aware perspective scaling to Rocco, including vertical-only movement speed compensation, without changing other levels.
- The first screen also runs a non-blocking foreground lighting plane, a matching background-contrast pulse, a matching Rocco-contrast pulse, and a left-weighted ambient machine loop mix.
- The first screen mounts animated pipe-smoke decoration behind Rocco plus an interactive security camera that can trigger a local checkpoint restart back to the entry sequence.
- The second screen runs its own lighting plane plus ambient machine loop, uses a softer perspective scale response than Nether 1, mounts scene targets for the doorbell, door handle, ascending pipes, and wheel valve, registers radial action menus for the doorbell, door handle, and wheel valve, and returns to Nether 1 through its bottom `south` exit connector.
- The Reset Office pair is intentionally disconnected from the normal Nether graph and currently loads only through developer mode.
- Developer mode groups the Reset Office pair under the Nether screen picker rather than treating it as a separate map.
- The Reset Office first screen uses a fixed developer entry at `371,138` facing down, while both office screens enter from each other at the bottom edge with mirrored horizontal placement.
- The legacy files in this directory now re-export from the game-owned Nether map folder so older imports keep resolving during the refactor.
