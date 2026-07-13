# RPCE

RPCE stands for `Rocco Point & Click Engine`.

This directory contains the cartridge-local runtime layer that sits between the generic ROCCO
console and the concrete `rocco-default` game content. RPCE owns reusable point-and-click
contracts, helpers, and orchestration that can be shared by multiple games inside the same
cartridge.

Dependency direction:

- `console` may not import from `cartridges/rocco/rpce`
- `rpce` may import from `console`
- `games/rocco-default` may import from `rpce`

Glossary:

- `console` is the generic ROCCO host runtime
- `cartridge` is the package loaded by the console
- `RPCE` is the cartridge-local point-and-click runtime
- `game` is a playable product that runs on RPCE
- `map` owns one or more levels plus the local connection graph
- `level` is one playable camera/screen inside a map
- `scene` is console video composition data

## Game graph compiler

`core/rpce-game-compiler.ts` turns an `RpceGameDefinition` (or any `RpceGameGraph`) into a
`CompiledGame`:

- `mapsById`, `levelsById`, and `transitionsByEndpoint` (an index keyed by `levelId#connectorId`);
- `initialMapId` / `initialLevelId` resolved from the definition;
- `resolveConnectedEndpoint(levelId, connectorId)` for O(1) transition lookup;
- `reachableLevelIds` computed from the initial level for observability.

The compiler is the single validator of the declared graph: it fails fast on duplicate map/level
ids, connections that reference unknown levels, a missing `initialMapId`, an initial map without
an `initialLevelId`, duplicate connections, and self-loop connections. Runtime controllers
(`RoccoLevelRegistry`, `RoccoLevelTransitionController`) consume the `CompiledGame` rather than
re-building or re-importing a connection list.
