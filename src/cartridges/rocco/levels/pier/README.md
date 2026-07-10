# Pier Levels

This directory is the legacy compatibility path for the Pier exterior levels of the
`rocco-default` cartridge.

The current concrete implementation and assets live in
`src/cartridges/rocco/games/rocco-default/maps/pier/**`.

## Files

- `../rocco-level-manager.ts` - `RoccoLevelManager`, which owns active level selection, graph transitions, entry placement, shared cartridge state, and status text across Rocco screens.
- `../rocco-level-types.ts` - Shared level, connector, rectangle, and mount option types.
- `pier-level-manager.ts` - Compatibility export for the shared level manager.
- `pier-level-types.ts` - Compatibility export for the shared level types.
- `pier-start-level.ts` - `RoccoPierStartLevel`, used by Pier Beginning.
- `pier-middle-level.ts` - `RoccoPierMiddleLevel`, the main interactive Pier level.
- `pier-end-level.ts` - `RoccoPierEndLevel`, used by Pier End.
- `pier-side-level.ts` - `RoccoPierSideLevel`, shared base class for Pier Beginning and Pier End.
- `pier-scene.ts` - Scene creation and persistence for each Pier level window.
- `pier-walkmap.ts` - Walk-map loading and scroll-window alignment.
- `pier-assets.ts` - Pier-specific asset URIs.
- `pier-beginning-ambient.ts` - Pier Beginning ambient installer that combines Stan and the bait shop door.
- `pier-clouds.ts` - Cloud sprite installation.
- `pier-bait-shop-door.ts` - Bait shop door sprite state and opening sound registration.
- `pier-stan.ts` - Stan ambient sprite for Pier Beginning.
- `pier-stan-action-menu.ts` - Stan action menu definition with cowardly Grab and Kick reactions.
- `pier-bait-bucket.ts` - Bait bucket sprite, menus, state, and kick sequence.
- `pier-keys-definition.ts` - Keys sprite definition and radial action menu.
- `pier-keys.ts` - Keys sprite, menus, reveal state, collection, and defeat sequence.
- `pier-pelikan.ts` - Pelikan NPC sprite setup.
- `pier-pelikan-action-menu.ts` - Pelikan action menu and talk reaction logic.
- `pier-feeding-interactions.ts` - Feeding look menu and randomized lines.
- `pier-video-effects.ts` - Water color post-processing setup for the Pier background.

## Levels

| Level          | ID            | Scene ID                  | Background Scroll | Role                         |
| -------------- | ------------- | ------------------------- | ----------------- | ---------------------------- |
| Pier Beginning | `pier-start`  | `rocco-pier-start-scene`  | Right window      | Side level west of middle    |
| Pier Middle    | `pier-middle` | `rocco-pier-middle-scene` | Center window     | Main interactive level       |
| Pier End       | `pier-end`    | `rocco-pier-end-scene`    | Left window       | Side level east of middle    |

## Connections

- `pier-middle:east` connects to `pier-start:west`.
- `pier-middle:west` connects to `pier-end:east`.

Each connector can define:

- `exitArea`, the rectangle that triggers a transition.
- `entryPoint`, the target position for Rocco.
- `entryFacing`, the facing direction after arrival.

`RoccoLevelManager` checks Rocco's ground point during `update()`. When it enters an exit area, input is blocked, the active level is unmounted, the connected level is mounted, Rocco is placed at the entry point, and input is restored.

Pier Middle exits are not inventory-gated.

The bait shop door transition is scripted rather than a horizontal edge walk. `RoccoLevelManager` enters the separate `../bait-shop` level directly after the Pier Beginning bait shop door finishes its opening hold while Stan is asleep.

## Level State

`RoccoLevelManager` keeps one level instance per registered level. Level instances keep their own mutable state while their sprites are unmounted between transitions.

Pier Beginning retains these stable milestones:

- Whether Stan has revealed his identity.

Pier Middle retains these stable milestones:

- Bait bucket dropped.
- Pelikan feeding at the bait bucket.
- Keys hidden, revealed, or collected.
- Rocco inventory slots, the 20 EUR bill, and collected keys.

When Pier Middle mounts again, it restores sprite poses, menus, key visibility, and interaction state from those milestones.

The bait shop transition reuses the manager-owned cartridge inventory, so the same carried items remain available after leaving Pier Beginning behind.

## Mount Flow

1. Load or create the active scene for the current level.
2. Install the walk map for that level.
3. Load background, back-mid mask, front, and effect planes.
4. Install cloud, Rocco, and any level-specific ambient sprites or props.
5. Register action menus.
6. Enable Rocco as the player sprite.
7. Set localized status text.

## Interaction Logic

- Pier Beginning: Stan starts asleep near the bait shop, wakes through a two-step pose sequence when spoken to or when Rocco lingers behind his chair, keeps awake while Rocco stays there, keeps facing Rocco while awake, opens the first dialogue menu once awake, and can fall asleep again if Rocco leaves the dialogue menu idle.
- Shop-exit wake reaction: if Rocco re-enters Pier Beginning through the `shop-exit` connector and lingers behind Stan's chair within `STAN_SHOP_EXIT_DOOR_REACTION_WINDOW_MS` (5 seconds), Stan wakes and plays the look-around animation while thinking a localized variant of hearing the shop door (`stan.doorWakeThoughtLines`). After the window expires, proximity wakes use the normal wake sequence.
- Bait shop door: the overlaid door sprite stays visually present and hoverable from the start, exposes no radial action menu, calls the police if the keys are used while Stan is awake, and otherwise switches to the open-door sprite, plays the door sound, turns Rocco back toward the pier, and then transitions into the bait shop interior level.
- Bait bucket: normal state offers grab, kick, and look; kicking drops it.
- Pelikan: normal state offers look, talk, grab, and kick; talking after the bait bucket is dropped starts feeding.
- Feeding Pelikan: only look is active.
- Keys: revealed after Pelikan takeoff; look, grab, and kick are available; grab collects them and unlocks Pier exits.
- Rocco: talk opens a self-talk line; inventory toggles the reorderable 3x3 grid menu.
- Inventory item use: `RoccoLevelManager` reads the generic carried grid payload during `scene-click` handling so carried keys and the 20 EUR bill can be attempted on Pier targets. Most targets return localized failed-use lines, while giving the keys to Stan triggers a defeat restart sequence and using the keys on the bait shop door branches on Stan's awake state.
- Stan dialogue: the controller owns wake and look-around animations, while the cartridge dialogue runtime owns turn sequencing and nested menus.

## Compatibility Note

Each file in this directory re-exports from the game-owned Pier map folder so older imports keep
working during the refactor.

## Legacy Assets Layout

```text
assets/
  background-back.png      Background layer with water, pier, and sky
  background-back-mid.png  Partial shack mask that sits in front of the cloud
  background-front.png     Foreground pier layer
  bait-shop-door-closed.png Closed bait shop door overlay for Pier Beginning
  bait-shop-door-open.png  Open bait shop door overlay for Pier Beginning
  cloud.png                Cloud sprite
  opening-door.mp3         Door opening sound used when Stan is asleep
  walking-path.png         Alpha-mask walkable area
```
