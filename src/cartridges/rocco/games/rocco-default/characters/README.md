# Characters

Non-player characters that have sprite definitions and assets in the `rocco-default` game.

Each character owns its assets, configuration, and sprite definition.

## Conventions

- Asset URL literals live in `<character>-assets.ts` inside the character folder.
- Character configuration lives in `<character>-config.ts` only when more than one module consumes it.
- Sprite definitions use the shared directional builder from `../sprites/directional-character-sprite-definition.ts`.

## Characters

- [`guysprite/`](guysprite/) — Guysprite Threepwood character.
