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
