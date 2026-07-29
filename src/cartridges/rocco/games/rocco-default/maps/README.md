# Rocco Maps

A map owns one or more levels, the local connection graph between them, the map-local assets, and the map definition exported to the game graph.

Each map folder under this directory owns:

- its level list and concrete level implementations;
- its local connectors and transition graph;
- its map-local assets and behavior;
- the map definition consumed by the compiled game graph.

Concrete game behavior lives in the map folders, not in this directory.

## Reading next

- [`pier/README.md`](pier/README.md) — the exterior Pier levels and their horizontal connection graph.
- [`shop/README.md`](shop/README.md) — the bait shop front room, back room, and toilet branch.
- [`nether/README.md`](nether/README.md) — the Nether path and the Reset Office branch.
- [`final/README.md`](final/README.md) — the independent final credits level and end images.
