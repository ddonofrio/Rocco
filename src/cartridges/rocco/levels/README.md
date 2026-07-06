# Rocco Level Development Guide

This directory contains the level systems and level implementations for the `rocco-default` cartridge.

Use this file as the reference manual for creating, mounting, extending, and connecting screens inside the cartridge.

## Purpose

A level is one playable screen or one connected screen in the Rocco cartridge.

The current cartridge uses three level families:

- `pier/` for the exterior panorama split into connected horizontal windows.
- `bait-shop/` for full-screen interior rooms with their own background and walk map.
- `nether/` for full-screen interior rooms with their own background and walk map plus local perspective adjustments for the player sprite.

The same runtime supports both base patterns plus level-specific variants, so new screens can follow either model.

## Core Model

Each level implements `RoccoLevel` from `rocco-level-types.ts`.

A level provides:

- `id` for manager registration and graph connections.
- `title` for the status line.
- `connectors` for level-to-level travel.
- `mount()` to load the scene, walk map, player, level-specific content, and optional scripted transition callbacks.
- `unmount()` to remove runtime content cleanly.
- `update()` for per-frame behavior.
- `handleAction()` for radial action menus.
- Optional `handleGridMenu()` for grid menu activations.
- Optional `handleSceneClick()` for scene-target and scripted click handling.

`RoccoLevelManager` owns:

- Level registration.
- The active level.
- Screen-to-screen transitions.
- Scripted connector transitions requested by the active level.
- Shared cartridge inventory.
- Level lifetime and per-level state retention.
- Status text updates.

This is the main separation of responsibilities:

- A level defines one screen and its local behavior.
- The manager connects levels and moves Rocco between them.

## Design Resolution And Asset Space

The cartridge design resolution is `960 x 540`.

The current large painted source artwork uses `1672 x 941`.

That gives two useful working patterns:

1. Shared panorama screens.
   The pier uses one large source image and chooses a visible window by changing plane scroll.

2. Dedicated full-screen screens.
   The bait shop backgrounds and walk maps are drawn into a `960 x 540` runtime canvas during mount, so a background image and its walk map stay aligned when they share the same source framing.

For new assets, the most reliable workflow is:

- Paint the background and the walk map from the same camera framing.
- Keep both images in the same source dimensions.
- Let the level helper scale both into design space together.

That is the current bait shop and Nether pattern.

## Directory Layout

```text
levels/
  README.md               This guide
  rocco-level-manager.ts  Shared active-level orchestration for Rocco screens
  rocco-level-types.ts    Shared level, connector, rectangle, and mount option types
  pier/                   Exterior level graph, shared panorama scene, shared walk map
  bait-shop/              Interior levels, dedicated room scenes, dedicated walk maps
  nether/                 Nether levels, arrival effects, dedicated room scenes, and perspective helpers
```

Use one folder per location family when several screens share assets, state, or behavior.

## Scripted Connector Transitions

Levels are not limited to static exit rectangles.

`RoccoLevelMountOptions.onConnectorTransitionRequested` lets a level request one of its own registered connectors at the exact frame a local sequence decides the transition should happen.

Use this for cases where:

- A portal opens after a dialogue or animation.
- A door transition waits for a custom cutscene instead of a raw edge trigger.
- A level needs overlap or state checks that are more specific than one persistent exit area.

The current toilet room uses this pattern to delay the Nether portal until the opening sequence finishes and Rocco is physically clear of the portal zone.

## Checkpoint Restarts

`RoccoLevelMountOptions.onRestartRequested` also supports level-local checkpoint restarts.

A level can call it without arguments to request the cartridge-level restart behavior, or pass a `RoccoLevelRestartRequest` to remount a specific level with a chosen connector, player position, and optional forced arrival sequence.

The current Nether first screen uses this path so a local defeat can remount the same screen at its entry checkpoint without rebuilding the whole cartridge state.

## Level IDs, Scene IDs, And Naming

Use a stable naming convention:

- Level ids describe gameplay identity, for example `pier-middle` or `bait-shop-second`.
- Scene ids describe persisted scene identity, for example `rocco-pier-middle-scene`.
- Plane ids stay unique inside the scene, for example `rocco-bait-shop-background`.
- Connector ids describe the travel edge or opening, for example `west`, `east`, or `south`.

This helps with:

- Transition graph readability.
- Persistence stability.
- Debugging logs and status lines.
- Matching scene content back to the owning level.

## Two Supported Screen Patterns

### Shared Panorama Pattern

Use this when several screens are different windows into one larger painted background.

The current pier implementation shows the full pattern:

- `pier-scene.ts` builds the default planes.
- `pier-walkmap.ts` loads the shared walk map.
- `pier-level.ts` and `pier-side-level.ts` mount specific windows.
- `rocco-level-manager.ts` connects the screens.

Key idea:

- The scene keeps the same background assets.
- Each level chooses a different `backgroundScrollX`.
- The walk map uses the negative scroll as its origin so the visible walkable area lines up with the visible background window.

This is ideal for:

- Left/center/right views of one exterior.
- Reusing one walkable painting across several linked screens.
- Keeping all exits in one shared spatial language.

### Dedicated Full-Screen Pattern

Use this when a room has its own complete background and its own complete walk map.

The bait shop and Nether implementations show the full pattern:

- `bait-shop-level.ts` mounts the first interior screen.
- `bait-shop-second-level.ts` mounts the second interior screen.
- `bait-shop-assets.ts` resolves the local asset URIs.
- `nether-console-hardware-spawn-level.ts` mounts the first Nether screen with portal arrival and perspective scaling.
- `nether-end-of-hallway-door-level.ts` mounts the second Nether screen with a lighter perspective slope than Nether 1.

Key idea:

- The level creates a scene definition with one or more full-screen planes.
- The level draws the walk map image into a `960 x 540` canvas at mount time.
- The player uses the registered walk map for click-to-walk navigation.

This is ideal for:

- Interior rooms.
- Unique camera angles.
- Screens with their own local props and local interaction geometry.

## Scene Composition

A level scene is a `RoccoPlaneScene`.

The most common plane stack is:

1. A solid backplate on `background.back`.
2. One background image on `background.main`.
3. An optional foreground image on `world.front` or another suitable layer.

The current bait shop helper also supports an optional foreground occlusion plane through `foregroundDepthMode`.

### Full-Screen Scene Helper Pattern

The current bait shop scene helper uses:

- A reusable full-screen plane base.
- A scene definition object that names the scene id, plane ids, and asset URIs.
- A normalization step that refreshes built-in default planes while preserving extra custom planes already stored in persistence.

This pattern is useful because it gives you:

- Stable defaults for the room.
- Automatic refresh when a built-in plane changes.
- Space for custom runtime planes such as overlays, masks, or future room-specific effects.

### Multiple Backgrounds And Extra Planes

A screen can use any number of planes.

The current runtime supports these plane source kinds directly:

- `solid`
- `image`
- `tilemap`
- `procedural`

This means a single screen can combine:

- One backplate.
- One main painted background.
- One foreground cutout.
- Additional overlay images.
- Extra underlays.
- Tilemap or procedural support when a level needs it.

The plane array is the composition surface. Add as many planes as the screen needs, choose their `renderLayer`, and tune `priority`, `opacity`, `scroll`, `viewport`, and `depthMode` for the look you want.

## Foreground Occlusion And Depth

Use `depthMode: { kind: 'sprite-y-threshold' }` when a foreground object should appear in front of or behind Rocco depending on his position.

The current bait shop counter uses this pattern:

- The counter art is a separate transparent foreground PNG.
- The plane watches the active player.
- The plane samples the player ground point.
- A Y threshold decides whether the counter renders in front of or behind him.

This is the right pattern for:

- Counters.
- Door frames.
- Railings.
- Low walls.
- Table edges.
- Props that should partially occlude the player.

## Walk Map Authoring

Walk maps are alpha masks:

- Opaque pixels are walkable.
- Transparent pixels are blocked.

The engine binds movement to the walk map after the player sprite is created.

### Shared Panorama Walk Maps

For shared panorama levels, use one walk map that matches the full source painting and apply the same window offset used by the visible background.

The current pier pattern uses:

- Shared source art at `1672 x 941`.
- `backgroundScrollX` and `backgroundScrollY` for the visible window.
- Walk map origin `{ x: -scrollX, y: -scrollY }` so the collision space matches the visible crop.

### Dedicated Room Walk Maps

For dedicated room levels, use a walk map image that shares the same framing as the room background.

The current bait shop pattern uses:

- A room background image.
- A room walk map image with the same source dimensions.
- `drawImage(..., 0, 0, 960, 540)` for both the scene and the walk map space.

That gives direct alignment between the background and the walking zone.

### Walk Map Preparation Workflow

Use this workflow when preparing a new walk map:

1. Start from the final room framing.
2. Paint the walkable floor area as opaque.
3. Leave walls, shelves, counters, water, voids, and blocked props transparent.
4. Save the walk map beside the room assets.
5. Mount the room and bind the player to the registered walk map.

### Edge Transition Strips

For screen-to-screen walking transitions, shape the walk map so it reaches the travel edge where Rocco is allowed to leave the screen.

Then place a connector `exitArea` as a thin strip on that edge.

This combination gives the expected travel flow:

1. The player clicks the edge zone.
2. Rocco walks there through the walk map.
3. The transition fires when his ground point enters the connector strip.

That is the same flow used by the pier levels.

## Player Setup

Use `installDefaultSprite()` to mount Rocco.

The most useful options are:

- `initialFacing`
- `initialPosition`
- `scale`
- `tint`
- `playIntro`
- `perspectiveAutoAdjust`

The current interior levels use:

- A larger scale than the pier.
- A tint to match the room lighting.
- `playIntro: false` because room re-entry should place Rocco immediately.
- Perspective auto-adjust to soften the painted-room perspective from top to bottom.

## Connectors And Level Graphs

Connectors are the level-to-level travel language.

Each connector can define:

- `id`
- `exitArea`
- `entryPoint`
- `entryFacing`
- `requiresKeys`
- `preservePlayerPosition`

### What Each Field Does

- `exitArea` is the scene-space rectangle that counts as the travel trigger.
- `entryPoint` is the spawn point used by the destination level.
- `entryFacing` is the first facing after arrival.
- `requiresKeys` adds a silent inventory gate.
- `preservePlayerPosition` allows a connected screen pair to carry part of the previous player position into the next mount flow.

### Transition Flow

The manager already supports the standard transition pattern:

1. A scene click in a connector zone records a pending exit intent.
2. Rocco starts walking through the walk map.
3. The manager checks the player ground point during `update()`.
4. When the ground point enters the connector `exitArea`, the manager switches levels.

This is the reference behavior for edge travel.

### Connecting Two Screens

To connect two screens:

1. Give each level a connector with its own local `id`.
2. Register both levels in `RoccoLevelManager`.
3. Add one connection entry that pairs `(levelId, connectorId)` with `(otherLevelId, otherConnectorId)`.

The current manager keeps the connection graph in `ROCCO_LEVEL_CONNECTIONS`, covering both Pier exterior edges and interior links such as the bait shop screen pair.

### Choosing Exit Areas

Use shapes that match the travel style:

- Thin full-height strips for left and right edge travel.
- Thin bottom strips for walk-down transitions.
- Small doorway rectangles for narrow openings.

The current second bait shop screen uses a bottom strip so "click below, walk below, transition below" matches the room layout.

### Keeping Position Between Connected Room Screens

Some rooms feel best when Rocco keeps the same horizontal placement across screens.

The current bait shop screen pair uses this pattern:

- The connector sets `preservePlayerPosition: true`.
- The manager forwards the previous player position in `entryPosition`.
- The destination level keeps the incoming `x` and uses its connector `entryPoint.y` as the safe arrival depth.

This creates a natural "same walkway, same horizontal placement" feel while still placing Rocco outside the exit trigger on the new screen.

## Scripted Transitions

A level graph connector is the best fit for walk-to-edge travel.

A scripted transition is the best fit for an interactive prop that opens into a new level.

The bait shop door uses the scripted pattern:

- A sprite interaction detects the right inventory use.
- The level plays the door animation and sound.
- The manager enters the bait shop after a short hold.

This pattern is ideal for:

- Doors.
- Elevators.
- Ladders.
- Special transitions that need a short sequence before switching screens.

## Local State Retention

`RoccoLevelManager` keeps one level instance per registered level.

That means each level object can store stable state directly on the instance.

Examples already used in the cartridge:

- Pier Beginning ambient progress.
- Pier Middle bait bucket, Pelikan, and keys state.
- Bait shop hidden key reveal and collection state.

This is a good pattern for:

- One-time reveals.
- Local prop states.
- Room-specific milestone flags.
- Local animation or sequence state.

## Interactions Inside A Level

Use the level class to own room-local interaction behavior.

The current cartridge uses several complementary tools:

- `actionMenus` for radial verbs on room props.
- `sceneTargets` for invisible clickable geometry with hover descriptions.
- `scripted-scene-interaction-controller` for "walk there, face there, then say/do something."
- `handleSceneClick()` for custom click semantics such as bench jump logic or collection hotspots.

This gives you two broad interaction styles:

1. Sprite-anchored interactions.
2. Room-geometry interactions.

Both are valid inside the same screen.

## Persistence Pattern

Scene persistence is keyed by `scene.id`.

Use a stable scene id for a stable saved room.

The current scene loaders follow this pattern:

1. Try `engine.persistence.loadPlaneSceneRecord(sceneId)`.
2. Create and save a default scene if none exists.
3. Normalize built-in planes if a saved scene exists.
4. Keep extra custom planes that are not part of the built-in defaults.

This pattern supports:

- Stable saved scenes.
- Safe scene evolution over time.
- Room-specific custom plane additions.

## Asset URIs

Use Vite-friendly URL resolution for room assets:

```ts
new URL('./assets/your-image.png', import.meta.url).href
```

This is the standard asset-loading pattern across the cartridge.

## Recommended Level Creation Recipes

### Recipe: New Shared Exterior Screen

Use this when one panorama should produce several connected screens.

1. Add the new background window role to the level family.
2. Reuse the shared source image planes.
3. Choose the new `backgroundScrollX`.
4. Reuse the shared walk map with the matching negative origin offset.
5. Add connectors for neighboring screens.
6. Register the level in the manager.

### Recipe: New Full-Screen Interior

Use this when a room has its own background and walk map.

1. Add room assets under the room folder.
2. Create a local asset file with the URIs.
3. Define a scene id and plane ids.
4. Build the room planes.
5. Load or create the scene through the persistence helper pattern.
6. Register the room walk map.
7. Install Rocco with room-specific spawn, facing, scale, and tint.
8. Add local action menus and scene targets.

### Recipe: Second Screen In The Same Room

Use this when one interior expands into another connected camera view.

1. Create a second level class for the second screen.
2. Give it its own scene id and asset definition.
3. Give both screens matching connectors.
4. Use thin edge strips as `exitArea` values for walk-through travel.
5. Link the two connector endpoints in the manager.
6. Reuse shared room tuning such as sprite scale, tint, and perspective auto-adjust.
7. Preserve horizontal placement with `preservePlayerPosition` when that supports the room layout.

## Checklist For A New Screen

- Choose a stable `levelId`.
- Choose a stable `sceneId`.
- Add local assets under the owning level folder.
- Keep the background and walk map in the same framing.
- Build the plane stack.
- Register and bind the walk map.
- Install Rocco with the right room tuning.
- Add connectors for travel.
- Register the level in the manager.
- Add room-local menus, targets, and scripted interactions.
- Set a localized `title`.

## Current Reference Files

Use these files as the working examples:

- `levels/rocco-level-manager.ts` for graph transitions and active-level ownership.
- `levels/rocco-level-types.ts` for the level and connector contracts.
- `levels/pier/pier-scene.ts` for shared panorama scene construction and normalization.
- `levels/pier/pier-walkmap.ts` for scroll-aligned shared walk maps.
- `levels/bait-shop/bait-shop-level.ts` for a full-screen interior with foreground occlusion, action menus, scene targets, and scripted interactions.
- `levels/bait-shop/bait-shop-second-level.ts` for a connected second room screen with the same-room connector pattern.

Use this guide plus those files together when asking a model to create a new screen. They cover the current cartridge patterns end to end.
