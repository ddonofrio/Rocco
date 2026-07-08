# Bait Shop Level

This directory contains the bait shop interior levels for the `rocco-default` cartridge.

## Files

- `bait-shop-level.ts` - `RoccoBaitShopLevel`, the first interior screen with the bench, register, hidden keys, and south connector.
- `bait-shop-second-level.ts` - `RoccoBaitShopSecondLevel`, the second interior screen with the magazine, toilet door interaction, and south connector.
- `bait-shop-toilet-level.ts` - `RoccoBaitShopToiletLevel`, the toilet room screen behind the second-screen toilet door, including the seated magazine sequence, the coral-relic survival branch, the post-toilet police exchange, and the portal trigger.
- `bait-shop-assets.ts` - Local asset URIs for the bait shop background, foreground, and walk map.
- `assets/` - The bait shop background, foreground, toilet, door, sprite sheet, smoke, portal, sound, and walk-map assets used by the levels.

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
- All bait shop assets live under this cartridge directory. The runtime does not depend on workspace-only generated content.
