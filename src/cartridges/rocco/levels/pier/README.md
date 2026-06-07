# Pier Levels

This directory contains the three-level Pier map for the `rocco-default` cartridge.

## Files

- `pier-level-manager.ts` - `RoccoPierLevelManager`, which owns active level selection, graph transitions, entry placement, per-level state, and status text.
- `pier-level-types.ts` - Shared level, connector, rectangle, and mount option types.
- `pier-level.ts` - `RoccoPierMiddleLevel`, the main interactive Pier level.
- `pier-side-level.ts` - `RoccoPierSideLevel`, used by Pier Beginning and Pier End.
- `pier-scene.ts` - Scene creation and persistence for each Pier level window.
- `pier-walkmap.ts` - Walk-map loading and scroll-window alignment.
- `pier-assets.ts` - Pier-specific asset URIs.
- `pier-clouds.ts` - Cloud sprite installation.
- `pier-bait-bucket.ts` - Bait bucket sprite, menus, state, and kick sequence.
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

The manager checks Rocco's ground point during `update()`. When it enters an exit area, input is blocked, the active level is unmounted, the connected level is mounted, Rocco is placed at the entry point, and input is restored.

Pier Middle exits require keys in the Rocco cartridge inventory. This gate is intentionally silent.

## Level State

`RoccoPierLevelManager` keeps one level instance per registered level. Level instances keep their own mutable state while their sprites are unmounted between transitions.

Pier Middle retains these stable milestones:

- Bait bucket dropped.
- Pelikan feeding at the bait bucket.
- Keys hidden, revealed, or collected.
- Rocco inventory slots, the 20€ bill, and collected keys.

When Pier Middle mounts again, it restores sprite poses, menus, key visibility, and interaction state from those milestones.

## Mount Flow

1. Load or create the Pier scene for the active window.
2. Install the walk map aligned to that window.
3. Load background, front, and effect planes.
4. Install cloud, bait bucket, keys, Pelikan, and Rocco.
5. Register action menus.
6. Enable Rocco as the player sprite.
7. Set localized status text.

## Interaction Logic

- Bait bucket: normal state offers grab, kick, and look; kicking drops it.
- Pelikan: normal state offers look, talk, grab, and kick; talking after the bait bucket is dropped starts feeding.
- Feeding Pelikan: only look is active.
- Keys: revealed after Pelikan takeoff; look, grab, and kick are available; grab collects them and unlocks Pier exits.
- Rocco: talk opens a self-talk line; inventory toggles the reorderable 3x3 grid menu.
- Inventory item use: carried keys and the 20€ bill can be attempted on the bait bucket and Pelikan; current responses are localized failed-use lines.

## Assets

```text
assets/
  background-back.png    Background layer with water, pier, and sky
  background-front.png   Foreground pier layer
  cloud.png              Cloud sprite
  walking-path.png       Alpha-mask walkable area
```
