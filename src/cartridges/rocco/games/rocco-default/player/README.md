# Rocco Player

The player domain owns the Rocco player character: appearance, configuration, sprite definition, runtime installation, and the self action-menu.

## Modules

- `rocco-player-appearance.ts` — appearance identifiers and `RoccoPlayerAppearance` type.
- `rocco-player-config.ts` — typed `ROCCO_PLAYER_CONFIG` object with IDs, frame dimensions, motion values, placement constants, and Pier entry positions.
- `rocco-player-assets.ts` — asset URL declarations for default and lab-coat appearance sets, and the appearance-to-assets resolver.
- `rocco-player-sprite-definition.ts` — `createRoccoPlayerSpriteDefinition`, which builds the player sprite definition on top of the shared directional character builder and adds the pick-up action.
- `rocco-player-sprite-runtime.ts` — `installRoccoPlayerSprite`, `uninstallRoccoPlayerSprite`, `applyRoccoPlayerAppearance`, sprite controller, and intro sequence.
- `rocco-player-action-menu.ts` — self action-menu definition, install/uninstall helpers, and activation queries.
- `index.ts` — public barrel.

## Conventions

- Asset URL literals live in `rocco-player-assets.ts`.
- Player configuration lives in `rocco-player-config.ts` and is read by runtime and definition modules.
- The sprite definition uses the shared directional builder from `../sprites/directional-character-sprite-definition.ts` and adds the pick-up image, frame, animation, action, and visible description.
- The runtime installer creates the sprite instance, sets up the walk map binding, and runs the optional intro sequence.
