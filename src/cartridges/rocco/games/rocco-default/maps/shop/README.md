# Shop Map

The Shop map owns the bait shop front room, back room, and bathroom branch:

- `bait-shop`
- `bait-shop-second`
- `bait-shop-toilet`

It also owns the local interior connections, the scripted bathroom transition entry point, the
current concrete level implementations, and the local Shop assets.

Local scripted flow is now decomposed into level-local state-machine helpers under this folder.
The bait shop bench jump and the toilet sit/stand choreography no longer live entirely inline
inside the level classes; the level classes remain the screen coordinators while the extracted
controllers own those phase transitions.

`src/cartridges/rocco/levels/bait-shop/**` remains as a compatibility wrapper over this folder.
