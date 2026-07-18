# Nether Map

The Nether map owns the current Nether path and the Reset Office branch:

- `nether-console-hardware-spawn`
- `nether-end-of-hallway-door`
- `nether-reset-office`
- `nether-reset-office-second`

The Reset Office pair remains a separate branch in current gameplay flow, but it is modeled as
part of the Nether map for structural ownership, reset behavior, and developer-menu grouping.

This folder also owns the current concrete Nether and Reset Office implementations plus the local
Nether assets.

`src/cartridges/rocco/levels/nether/**` re-exports the game-owned implementations from this folder.
