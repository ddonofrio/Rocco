# Rocco Default Game

This directory is the game layer that runs on top of RPCE inside the `rocco` cartridge.

The current game is still the shipped `rocco-default` experience, but its structure is now
expressed in game terms instead of treating the cartridge runtime as the game itself.

Current map model:

- `pier` for the exterior panorama
- `shop` for the bait shop and bathroom branch
- `nether` for the hardware spawn, hallway, and Reset Office path

Reset Office is modeled as part of the Nether map. It remains a separate branch in current
behavior, but it is no longer treated as a separate map in the structural model.

Shared game-owned barrels:

- `constants/` owns shared level ids, scene ids, design values, and sprite constants.
- `inventory/` owns the shipped inventory surface used by the game runtime.
- `localization/` owns the game-localized text surface.
- `player/` owns player appearance ids and the self action-menu surface.
- `sprites/` owns default player sprite installation and shared sprite-facing asset exports.

Map folders are the structural ownership point:

- `maps/pier/`
- `maps/shop/`
- `maps/nether/`

Each map folder exports its map definition, the concrete level implementations, and the local
asset surface for that map. The legacy `src/cartridges/rocco/levels/**` folders now re-export
from these game-owned paths as compatibility wrappers.
