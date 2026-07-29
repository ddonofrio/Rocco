# Default Cartridge: `rocco-default`

`rocco-default` is the main built-in cartridge for the ROCCO console. The cartridge reads as `cartridge bootstrap -> RPCE -> rocco-default game`. It implements the Pier exterior, the bait shop interior, the Nether path including the Reset Office branch, and the cartridge-owned inventory systems that tie those spaces together.

## Files

- `rocco-default-cartridge.ts` — `RoccoDefaultCartridge`, which mounts the RPCE runtime and delegates gameplay actions into the current game.
- `rocco-default-manifest.ts` — Cartridge identity and localized menu metadata.
- `rocco-developer-mode.ts` — Developer-mode menu definitions, inventory seeding, event toggles, and screen shortcuts.
- `scripted-scene-interaction-controller.ts` — Shared walk-then-react controller for scene-target choreography.
- `games/rocco-default/` — Current game definition and map-first ownership for Pier, Shop, and Nether.
  - `audio/` — Game music playlist registration and playback.
  - `player/` — Player sprite definition, assets, config, action menu, and runtime installation.
  - `characters/` — Non-player character sprite definitions and assets.
  - `sprites/` — Shared directional character sprite definition builder.
  - `ui/` — Shared action-menu icon asset URLs.
  - `maps/pier/` — Pier outdoor levels, characters, props, and video effects.
  - `maps/shop/` — Bait shop interior and toilet levels.
  - `maps/nether/` — Nether path levels including console hardware and reset office.
  - `maps/final/` — the independent final credits level and its end-image assets.
  - `preload/` — Shared asset manifest that aggregates preloadable assets from domain owners.
  - `game-design.ts` — Shared design dimensions and background color.

## Subdirectories

- `rpce/` — Cartridge-local point-and-click runtime, reusable dialogue helpers, and generic inventory primitives.
- `games/` — Game definitions, shared game-owned modules, and map-first ownership.
- `interactions/` — Distributed interaction rules and interaction-registry assembly.
- `dialogue/` — Import surface for the RPCE dialogue helpers owned by `rpce/dialogue`.
- `inventory/` — Rocco cartridge inventory state, assets, souvenir assets, fusion recipes, prop storages, and grid-menu projection.
- `levels/runtime/` — Cartridge-runtime coordination backed by the RPCE/game split.
- `levels/pier/`, `levels/bait-shop/`, `levels/nether/` — Import surfaces for the game-owned map implementations under `games/rocco-default/maps`.
- `localization/` — English and Spanish text catalogs for the cartridge.

## RPCE and game boundary

The cartridge bootstrap mounts RPCE, RPCE mounts the current `rocco-default` game, and the game owns Pier, Shop, Nether, and Final map definitions plus the concrete implementations under `games/rocco-default/maps/*`. The `levels/pier`, `levels/bait-shop`, and `levels/nether` folders re-export those game-owned map implementations. New implementation work belongs in the owning map directory under `games/rocco-default/maps`.

## Localization

The cartridge supports `en` (English source) and `es` (Spanish). The boot menu shows language radio buttons; the selected locale is passed as `CartridgeContextV1.locale` and resolved through `createRoccoLocalization(locale)`. Internal cartridge restarts preserve the selected locale. Localized catalogs cover manifest metadata, action labels, speech and thought lines, Stan branching dialogue, inventory labels, object descriptions, and level titles.

## Conventions

- Each domain owns its physical assets and a `*-assets.ts` module that declares its asset URLs.
- Asset URL literals only appear in modules whose name ends in `-assets.ts`, except for the game music module at `games/rocco-default/audio/rocco-game-music.ts`.
- Asset URIs use Vite-compatible `new URL(..., import.meta.url).href` patterns.
- Player configuration lives in `games/rocco-default/player/rocco-player-config.ts`.
- Player sprite IDs, action IDs, and placement values are owned by the player domain, not by individual maps.
- Map-local configuration lives in per-feature `*-config.ts` modules under each map folder.
- Map definitions live under `games/rocco-default/maps/*`.
- The shared preload manifest at `games/rocco-default/preload/` aggregates preloadable assets from domain owners; it contains no URL literals and no gameplay configuration.
- Level transitions preload destination-level assets during the transition composition.
- Adding a new asset requires choosing a semantic owner first.
- Localized dialogue trees stay in `localization/`; reusable turn sequencing lives under `rpce/dialogue` and is re-exported from `dialogue/`.

## Reading next

- [`rpce/README.md`](rpce/README.md) — the cartridge-local point-and-click runtime and game-graph compiler.
- [`games/rocco-default/README.md`](games/rocco-default/README.md) — the `rocco-default` game graph and shared game-owned modules.
- [`interactions/README.md`](interactions/README.md) — the distributed interaction registry and rule dispatch.
- [`inventory/README.md`](inventory/README.md) — inventory domain, storage, and fusion behavior.
- [`localization/README.md`](localization/README.md) — locale resolution and text catalogs.
- [`dialogue/README.md`](dialogue/README.md) — import surface for the RPCE dialogue runtime.
- [`levels/README.md`](levels/README.md) — the `RoccoLevel` contract and runtime orchestration.
