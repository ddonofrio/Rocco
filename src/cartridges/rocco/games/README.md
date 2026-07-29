# Rocco Games

A game is cartridge content that runs on the cartridge-local RPCE layer.

This directory sits between the cartridge bootstrap and the concrete map implementations. It owns the declarative game graph and the shared game-owned barrels (constants, inventory, localization, player, sprites).

Scope boundary:

- This directory defines the game as a compiled graph of maps, levels, and connections.
- Map implementations, level behavior, and local assets belong under the owning map folder in `rocco-default/maps/*`.
- RPCE contracts, helpers, and orchestration belong in `src/cartridges/rocco/rpce`.
- Cartridge bootstrap, inventory, localization, and interaction rules belong in their sibling directories under `src/cartridges/rocco`.

## Reading next

- [`rocco-default/README.md`](rocco-default/README.md) — the `rocco-default` game graph and shared game-owned barrels.
- [`rocco-default/maps/README.md`](rocco-default/maps/README.md) — map ownership and the Pier, Shop, Nether, and Final maps.
