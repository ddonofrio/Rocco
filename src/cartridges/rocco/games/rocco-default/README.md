# Rocco Default Game

This directory is the game layer that runs on top of RPCE inside the `rocco` cartridge.

The shipped game is `rocco-default`, expressed in game terms: the cartridge runtime is not the game itself.

Current map model:

- `pier` for the exterior panorama
- `shop` for the bait shop and bathroom branch
- `nether` for the hardware spawn, hallway, and Reset Office path

Reset Office is modeled as part of the Nether map. It remains a separate branch in current
behavior, but it is not treated as a separate map in the structural model.

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
asset surface for that map. The `src/cartridges/rocco/levels/**` folders re-export
from these game-owned paths.

## Game graph and the compiled model

`createRoccoDefaultGameDefinition` is the single declarative source of truth. It is built from
the per-map `*MapStructure()` builders (the canonical literal structure of ids, levels,
connections, and `initialLevelId`) plus the game-level cross-map connections exported as
`ROCCO_DEFAULT_GAME_CROSS_CONNECTIONS` (the bait-shop toilet portal into the Nether entry).

The functional `createRoccoDefault*Map(options)` builders derive their level list from the same
`*MapStructure()` source and only attach the runtime `createLevel` factories. There is no second,
independent copy of the graph.

At runtime `RoccoLevelManager` compiles the functional maps once with `RpceGameCompiler`
(see `src/cartridges/rocco/rpce/core/rpce-game-compiler.ts`). The resulting `CompiledGame` is the
only model the level registry and the transition controller consume:

- the initial level is read from `compiledGame.initialLevelId` (never hard-coded);
- the registry instantiates levels from `compiledGame.levelsById`;
- the transition controller resolves endpoints through the indexed `compiledGame.transitionsByEndpoint`.

The compiler fails fast on duplicate map/level ids, connections that reference unknown levels, a
missing `initialMapId`, an initial map without an `initialLevelId`, duplicate connections, and
self-loop connections. It also computes `reachableLevelIds` from the initial level for
observability; note that pier and shop are linked by scripted transitions (for example
`enterBaitShop`), not by the connector graph, so the shop is intentionally not connector-reachable.

## Reading next

- [`maps/README.md`](maps/README.md) — map ownership and the Pier, Shop, and Nether maps.
