# Shop Map

The Shop map owns the bait shop front room, back room, and bathroom branch:

- `bait-shop`
- `bait-shop-second`
- `bait-shop-toilet`

It also owns the local interior connections, the scripted bathroom transition entry point, the
current concrete level implementations, and the local Shop assets.

Local scripted flow is decomposed into level-local state-machine helpers under this folder.
The bait shop bench jump and the toilet sit/stand choreography are owned by screen controllers;
the exported level classes remain small coordinators for the common `RoccoLevel` and capability
contracts. The toilet controller also owns reading, wish, police-alert, portal, and dropped-relic
sequences, while the public level forwards those capabilities explicitly.

`src/cartridges/rocco/levels/bait-shop/**` re-exports the game-owned implementations from this folder.
