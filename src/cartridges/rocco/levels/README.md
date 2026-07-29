# Rocco Level Contracts

This directory holds the `RoccoLevel` contract, the shared level types, and the
runtime orchestration that connects screens inside the `rocco-default` cartridge.

The concrete level implementations live under
`src/cartridges/rocco/games/rocco-default/maps/*`. This directory keeps the
shared contracts and the runtime helpers that span screens. The `pier`,
`bait-shop`, and `nether` folders re-export the game-owned map implementations.

## Level contract

Each level implements `RoccoLevel` from `rocco-level-types.ts`:

- `id` for manager registration and graph connections.
- `title` for the status line.
- `connectors` for level-to-level travel.
- `mount()` to load the scene, walk map, player, level content, and optional scripted transition or
  state-reset callbacks.
- `unmount()` to remove runtime content cleanly.
- `update()` for per-frame behavior.
- `handleAction()` for radial action menus.
- Optional `handleGridMenu()` for grid menu activations.
- Optional `handleSceneClick()` for scene-target and scripted click handling.

A level defines one screen and its local behavior. Runtime helpers describe how
screens connect and own cartridge-wide subsystems that span multiple screens.

## Runtime orchestration

`RoccoLevelManager` owns the active level, shared cartridge inventory, level
lifetime and per-level state retention, and status text. `levels/runtime/` owns
registration, connector-graph resolution, transition cooldown, inventory and
dropped-item runtime, scripted sequences, and developer mode. See
[`runtime/README.md`](runtime/README.md) for the controller and coordinator
responsibilities.

## Screen patterns

Two screen patterns are supported:

- Shared panorama: several connected screens share one painted background, chosen by changing plane scroll and aligning the walk map origin to the scroll.
- Dedicated full-screen: a room has its own background and walk map drawn into one canvas at mount.

New screens follow the pattern used by their map. The final credits screen is a dedicated
full-screen level with no player, walk map, or connectors; its runtime entry and continuation are
owned by the cartridge level runtime.

## Connectors and walk maps

Connectors are the level-to-level travel language. Each connector can define an
`exitArea`, `entryPoint`, `entryFacing`, an optional localized
`exitDescriptionKey`, an optional inventory `requiresKeys` gate, and
`preservePlayerPosition`. Levels that expose an exit description register a
look-only scene target over the same `exitArea`; the target provides hover
guidance while click-to-walk and connector transition intent continue to use
the connector coordinates. Walk maps are alpha masks: opaque pixels are
walkable, transparent pixels are blocked.

## Persistence

Scene persistence is keyed by `scene.id`. The scene loaders try
`sdk.storage.loadPlaneSceneRecord(sceneId)`, create and save a default scene
when none exists, normalize built-in planes when a saved scene exists, and keep
extra custom planes.
