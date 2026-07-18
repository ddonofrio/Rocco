# Default Cartridge: `rocco-default`

`rocco-default` is the main built-in cartridge for the ROCCO console. The cartridge reads as `cartridge bootstrap -> RPCE -> rocco-default game`. It implements the Pier exterior, the bait shop interior, the Nether path including the Reset Office branch, and the cartridge-owned inventory systems that tie those spaces together.

## Files

- `rocco-default-cartridge.ts` — `RoccoDefaultCartridge`, which mounts the RPCE runtime and delegates gameplay actions into the current game.
- `rocco-default-manifest.ts` — Cartridge identity and localized menu metadata.
- `rocco-default-constants.ts` — Shared design, scene, level, scroll, color, and sprite IDs.
- `rocco-default-assets.ts` — Shared cartridge asset URIs.
- `rocco-default-sprite-definition.ts` — Rocco player sprite definition.
- `rocco-default-sprites.ts` — Rocco player sprite installation.
- `rocco-player-appearance.ts` — Player appearance IDs and the default versus lab-coat appearance contract.
- `rocco-player-action-menu.ts` — Rocco self action menu with Talk and Inventory actions.
- `rocco-developer-mode.ts` — Developer-mode menu definitions, inventory seeding, and event-toggle helpers.
- `scripted-scene-interaction-controller.ts` — Shared walk-then-react controller for scene-target choreography.
- `rpce/` — Cartridge-local point-and-click runtime, reusable dialogue helpers, and generic inventory primitives.
- `games/rocco-default/` — Current game definition and map-first ownership for Pier, Shop, and Nether.

## Subdirectories

- `assets/` — Shared cartridge assets for characters, props, sounds, and icons.
- `rpce/` — Cartridge-local point-and-click runtime, reusable dialogue helpers, and generic inventory primitives.
- `games/` — Game definitions, shared game-owned barrels, and map-first ownership.
- `interactions/` — Distributed interaction rules and interaction-registry assembly.
- `dialogue/` — Import surface for the RPCE dialogue helpers owned by `rpce/dialogue`.
- `inventory/` — Rocco cartridge inventory state, souvenir assets, fusion recipes, prop storages, and grid-menu projection.
- `levels/runtime/` — Cartridge-runtime coordination backed by the RPCE/game split.
- `levels/pier/`, `levels/bait-shop/`, `levels/nether/` — Import surfaces for the game-owned map implementations under `games/rocco-default/maps`.
- `localization/` — English and Spanish text catalogs for the cartridge.

## RPCE and game boundary

The cartridge bootstrap mounts RPCE, RPCE mounts the current `rocco-default` game, and the game owns Pier, Shop, and Nether map definitions plus the concrete implementations under `games/rocco-default/maps/*`. The `levels/pier`, `levels/bait-shop`, and `levels/nether` folders re-export those game-owned map implementations. New implementation work belongs in the owning map directory under `games/rocco-default/maps`.

## Localization

The cartridge supports `en` (English source) and `es` (Spanish). The boot menu shows language radio buttons; the selected locale is passed as `CartridgeContextV1.locale` and resolved through `createRoccoLocalization(locale)`. Internal cartridge restarts preserve the selected locale. Localized catalogs cover manifest metadata, action labels, speech and thought lines, Stan branching dialogue, inventory labels, object descriptions, and level titles.

## Conventions

- Instance IDs for interactive sprites are defined in `rocco-default-constants.ts`.
- Asset URIs use Vite-compatible `import ... as string` patterns.
- Shared Rocco sprite logic lives in `rocco-default-sprites.ts` and `rocco-default-sprite-definition.ts`.
- Map definitions live under `games/rocco-default/maps/*`.
- Localized dialogue trees stay in `localization/`; reusable turn sequencing lives under `rpce/dialogue` and is re-exported from `dialogue/`.

## Reading next

- [`rpce/README.md`](rpce/README.md) — the cartridge-local point-and-click runtime and game-graph compiler.
- [`games/rocco-default/README.md`](games/rocco-default/README.md) — the `rocco-default` game graph and shared game-owned barrels.
- [`interactions/README.md`](interactions/README.md) — the distributed interaction registry and rule dispatch.
- [`inventory/README.md`](inventory/README.md) — inventory domain, storage, and fusion behavior.
- [`localization/README.md`](localization/README.md) — locale resolution and text catalogs.
- [`dialogue/README.md`](dialogue/README.md) — import surface for the RPCE dialogue runtime.
- [`levels/README.md`](levels/README.md) — the `RoccoLevel` contract and runtime orchestration.
