# Bait Shop Level

This directory is the legacy compatibility path for the bait shop interior levels of the
`rocco-default` cartridge.

The current concrete implementation and assets live in
`src/cartridges/rocco/games/rocco-default/maps/shop/**`.

## Files

- `bait-shop-level.ts` - `RoccoBaitShopLevel`, the first interior screen with the bench, register, hidden keys, and south connector.
- `bait-shop-second-level.ts` - `RoccoBaitShopSecondLevel`, the second interior screen with the magazine, toilet door interaction, and south connector.
- `bait-shop-toilet-level.ts` - `RoccoBaitShopToiletLevel`, the toilet room screen behind the second-screen toilet door, including the seated magazine sequence, the coral-relic survival branch, the post-toilet police exchange, and the portal trigger.
- `bait-shop-assets.ts` - Local asset URIs for the bait shop background, foreground, and walk map.
- `assets/` - Legacy asset path kept only for migration context; the current asset ownership now lives under the game-owned Shop map folder.

## Runtime Notes

- The first-screen level id is `bait-shop` and the scene id is `rocco-bait-shop-scene`.
- The second-screen level id is `bait-shop-second` and the scene id is `rocco-bait-shop-second-scene`.
- The toilet-room level id is `bait-shop-toilet` and the scene id is `rocco-bait-shop-toilet-scene`.
- All bait shop levels implement the shared `RoccoLevel` contract and are registered by `RoccoLevelManager`.
- Rocco uses a bait-shop-specific spawn position, facing, and scale override without changing his shared cartridge definition.
- The counter foreground uses plane `depthMode: { kind: 'sprite-y-threshold', subject: 'active-player' }` so it can render in front of or behind Rocco depending on his Y position.
- Grabbing the first-screen souvenir table opens a close-up plus a shared transfer inventory with the table on the left, Rocco on the right, and the table storage projected as a 5x4 grid.
- The toilet-room survival branch starts only when Rocco reads the magazine while holding the Coral Relic, then keeps local urgency state so he cannot sit back down, can step on the dropped relic, and can open the wish menu.
- The magazine can also guide any craftable Coral Relic path that is already accessible inside the toilet room, including the final instruction to drop the relic on the floor, make a wish, and break it.
- Developer mode can override toilet-room event flags through `Alter events -> Bait Shop -> Bathroom`, including a toggle that allows the toilet to be reused during the urgency state for manual testing.
- The toilet-room portal is a scripted connector transition. The level keeps the portal pending until Rocco no longer overlaps the portal zone, then moves to the first Nether screen on contact.
- The legacy files in this directory now re-export from the game-owned Shop map folder so older imports keep resolving during the refactor.
