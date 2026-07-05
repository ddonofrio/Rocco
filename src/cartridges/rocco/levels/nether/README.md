# Nether Levels

This directory contains the Nether level family for the `rocco-default` cartridge.

## Files

- `nether-console-hardware-spawn-level.ts` - `RoccoNetherConsoleHardwareSpawnLevel`, the first Nether screen with the one-time portal arrival sequence, region-aware perspective scaling, and the forward connector into Nether 2.
- `nether-end-of-hallway-door-level.ts` - `RoccoNetherEndOfHallwayDoorLevel`, the second Nether screen with a fixed-scale player setup and the return connector back to Nether 1.
- `nether-level-support.ts` - Shared scene loading, walk-map projection, and ground-point helpers for Nether screens.
- `nether-arrival-effects.ts` - Shared portal and smoke sprite definitions reused by the Nether arrival sequence.
- `nether-assets.ts` - Local asset URIs for the Nether backgrounds and walk maps.
- `assets/` - The Nether background and walk-map assets used by both screens.

## Runtime Notes

- The first-screen level id is `nether-console-hardware-spawn` and the scene id is `rocco-nether-console-hardware-spawn-scene`.
- The second-screen level id is `nether-end-of-hallway-door` and the scene id is `rocco-nether-end-of-hallway-door-scene`.
- Both Nether levels implement the shared `RoccoLevel` contract and are registered by `RoccoLevelManager`.
- The first screen uses a one-time portal arrival sequence that reuses the bait-shop toilet portal and smoke art, sounds, and timing helpers.
- The first screen applies region-aware perspective scaling to Rocco, including vertical-only movement speed compensation, without changing other levels.
- The first screen also runs a non-blocking foreground lighting plane, a matching background-contrast pulse, a matching Rocco-contrast pulse, and a left-weighted ambient machine loop mix.
- The second screen keeps Rocco at a fixed scale, runs its own lighting plane plus ambient machine loop, and returns to Nether 1 through a bottom exit connector.
- All Nether assets live under this cartridge directory. The runtime does not depend on `.local` content.
