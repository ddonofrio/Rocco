# Default Cartridge: `rocco-default`

`rocco-default` is the main built-in cartridge for the ROCCO console. The cartridge reads as `cartridge bootstrap -> RPCE -> rocco-default game`. It implements the Pier exterior, the bait shop interior, the Nether path including the Reset Office branch, and the cartridge-owned inventory systems that tie those spaces together.

## Files

- `rocco-default-cartridge.ts` - `RoccoDefaultCartridge`, which mounts the RPCE runtime and delegates gameplay actions into the current game.
- `rocco-default-manifest.ts` - Cartridge identity and localized menu metadata.
- `rocco-default-constants.ts` - Shared design, scene, level, scroll, color, and sprite IDs.
- `rocco-default-assets.ts` - Shared cartridge asset URIs.
- `rocco-default-sprite-definition.ts` - Rocco player sprite definition.
- `rocco-default-sprites.ts` - Rocco player sprite installation.
- `rocco-player-appearance.ts` - Player appearance IDs and the default versus lab-coat appearance contract.
- `rocco-player-action-menu.ts` - Rocco self action menu with Talk and Inventory actions.
- `rocco-developer-mode.ts` - Developer-mode menu definitions, inventory seeding, and event-toggle helpers used by the runtime controller.
- `scripted-scene-interaction-controller.ts` - Shared walk-then-react controller for scene-target choreography.
- `rpce/` - Cartridge-local point-and-click runtime, reusable dialogue helpers, inventory primitives, and RPCE contracts.
- `games/rocco-default/` - Current game definition and map-first ownership for Pier, Shop, and Nether.
- `levels/rocco-asset-preloader.ts` - Compatibility re-export of the RPCE asset preloader.

## Subdirectories

| Directory           | Contents                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `assets/`           | Shared cartridge assets for characters, props, sounds, and icons                                          |
| `rpce/`             | Cartridge-local point-and-click runtime, reusable dialogue helpers, and generic inventory primitives      |
| `games/`            | Game definitions, shared game-owned barrels, and map-first ownership                                      |
| `interactions/`     | Distributed interaction rules and interaction-registry assembly                                           |
| `dialogue/`         | Compatibility re-export of RPCE dialogue helpers                                                          |
| `inventory/`        | Rocco cartridge inventory state, souvenir assets, fusion recipes, prop storages, and grid-menu projection |
| `levels/runtime/`   | Compatibility-path runtime helpers backed by the RPCE/game split                                          |
| `levels/pier/`      | Compatibility exports for the game-owned Pier implementation                                              |
| `levels/bait-shop/` | Compatibility exports for the game-owned Shop implementation                                              |
| `levels/nether/`    | Compatibility exports for the game-owned Nether implementation, including Reset Office                    |
| `localization/`     | English and Spanish text catalogs for the cartridge                                                       |

## World Structure

The cartridge starts in Pier Middle and currently spans three maps.

| Map           | Level                  | ID                              | Scene ID                                    | Notes                                                       |
| ------------- | ---------------------- | ------------------------------- | ------------------------------------------- | ----------------------------------------------------------- |
| Pier exterior | Pier Beginning         | `pier-start`                    | `rocco-pier-start-scene`                    | Right panorama window                                       |
| Pier exterior | Pier Middle            | `pier-middle`                   | `rocco-pier-middle-scene`                   | Center panorama window and default start                    |
| Pier exterior | Pier End               | `pier-end`                      | `rocco-pier-end-scene`                      | Left panorama window                                        |
| Bait shop     | Front room             | `bait-shop`                     | `rocco-bait-shop-scene`                     | First interior screen                                       |
| Bait shop     | Back room              | `bait-shop-second`              | `rocco-bait-shop-second-scene`              | Souvenir-table and toilet-door screen                       |
| Bait shop     | Toilet room            | `bait-shop-toilet`              | `rocco-bait-shop-toilet-scene`              | Magazine sequence, ritual branch, and portal trigger        |
| Nether        | Console hardware spawn | `nether-console-hardware-spawn` | `rocco-nether-console-hardware-spawn-scene` | First Nether screen after the portal arrival                |
| Nether        | End of hallway door    | `nether-end-of-hallway-door`    | `rocco-nether-end-of-hallway-door-scene`    | Second Nether screen with mounted scene-target interactions |
| Nether        | Reset Office 1         | `nether-reset-office`           | `rocco-nether-reset-office-scene`           | Developer-only branch inside the Nether map                 |
| Nether        | Reset Office 2         | `nether-reset-office-second`    | `rocco-nether-reset-office-second-scene`    | Developer-only branch                                       |

Rocco transitions through edge connectors on connected screens. The cartridge bootstrap mounts RPCE, RPCE mounts the current `rocco-default` game, and the game owns Pier, Shop, and Nether map definitions plus the current concrete implementations under `games/rocco-default/maps/*`. The `levels/**` folders re-export the game-owned implementations so existing imports keep resolving.

## Interactions

- Rocco is the player sprite and supports click-to-walk.
- Pier Beginning includes Stan asleep on a chair between the right mooring post and the bait shop.
- Stan supports the same four action verbs as the Pelikan, and Talk wakes him and then opens the first text choice dialogue panel built from the cartridge dialogue library.
- The bait shop door stays visible and hoverable from the start, and using the keys on it only works while Stan is asleep and transitions into the bait shop interior.
- The bait bucket can be examined, grabbed, kicked, and dropped.
- The Pelikan reacts to Rocco and can enter a feeding sequence after the bait bucket is dropped.
- The keys are revealed through the Pier Middle sequence and can be collected.
- The inventory starts with a 20 EUR bill and later stores collected keys, the magazine, the mysterious key, the lab coat, and fused ritual items.
- Clicking Rocco opens a radial menu with self-talk and inventory options.
- The cartridge assembles scene-click, action-menu, and grid-menu behavior through a distributed interaction registry under `interactions/`, with feature-owned rules ordered by priority instead of one feature-heavy central router.
- The inventory option toggles a reorderable 3x3 grid menu populated from Rocco cartridge inventory state.
- The bait shop souvenir table reuses the same cartridge inventory layer as a left-right transfer view, with a 5x4 table layout and table-only placement rules.
- Full player inventory blocks new pickups instead of reusing an occupied slot.
- Picking an inventory item can carry it on the console cursor for generic use attempts on sprites.
- Swapping a compatible carried item onto another inventory item fuses both ingredients into one result. The current recipe chain crafts Floating Amulet, Turritella Razor, Abyssal Talisman, and Coral Relic.
- Fusion rules live in `inventory/rocco-inventory.ts` through `ROCCO_INVENTORY_FUSION_RECIPES` and `planRoccoCoralRelicAssembly()`.
- The bait-shop toilet branch can inspect the reachable Coral Relic assembly plan and adapts its ritual guidance to the ingredients that are already accessible.
- Keys and the 20 EUR bill have localized failed-use responses for the bait bucket and the Pelikan.
- Pier Middle exits are available without an inventory gate.
- The toilet-room portal opens a first-time arrival sequence in Nether and then hands off to a connected second Nether screen.
- Developer mode also exposes an `Alter events` path for runtime-only test overrides such as allowing the bait-shop toilet to be reused after the magazine warning.
- Developer mode also exposes the two-screen Reset Office branch inside the Nether map through the Nether screen picker.

## Localization

The cartridge supports:

- `en` - English source text.
- `es` - Spanish text.

The boot menu shows language radio buttons for this cartridge. The selected locale is passed as `CartridgeContextV1.locale` and resolved through `createRoccoLocalization(locale)`.

Internal cartridge restarts such as the keys defeat or Stan police defeat restart preserve the selected locale and rebuild the cartridge with the same localization context.

Localized catalogs cover:

- Manifest metadata.
- Action labels.
- Speech and thought lines.
- Stan branching dialogue tree and cowardly Grab and Kick reactions.
- Inventory title, item labels, crafted-item labels, and failed-use responses.
- Object descriptions, including the bait shop door hover label.
- Level titles and status labels, including the bait shop title.
- Keys defeat title.

## Assets Layout

```text
assets/
  actions/              Action menu icons and the developer sprite-cycle cursor
  characters/
    rocco/              Default Rocco standing, running, and pickup frames
      lab-coat/         Lab-coat standing and running variants
    pelikan/            Pelikan idle, flight, feeding frames, and sound
    stan/               Stan seated pose sheet for Pier Beginning
  props/
    bait-bucket/        Normal and dropped bait bucket images
    keys/               Keys image, mysterious key image, and defeat sound
    lab-coat*.png       Lab coat prop and ground variant
    magazine/           Closed and inventory magazine images
    money/              20 EUR bill image
  sounds/               Shared cartridge sounds
inventory/
  assets/
    souvenirs/          Souvenir-table collectibles and crafted ritual-item images
```

## Conventions

- Instance IDs for interactive sprites are defined in `rocco-default-constants.ts`.
- Asset URIs use Vite-compatible `import ... as string` patterns.
- Shared Rocco sprite logic lives in `rocco-default-sprites.ts` and `rocco-default-sprite-definition.ts`.
- Inventory-owned souvenir and crafted-item art lives under `inventory/assets/souvenirs`.
- Map definitions live under `games/rocco-default/maps/*`.
- Shared game-owned barrels live under `games/rocco-default/{constants,inventory,localization,player,sprites}`.
- Map folders under `games/rocco-default/maps/*` own the level list, connection graph, current concrete implementations, and local assets.
- `src/cartridges/rocco/levels/pier`, `levels/bait-shop`, and `levels/nether` re-export the game-owned paths under [`games/rocco-default/maps`](games/rocco-default/maps/README.md).
- Localized dialogue trees stay in `localization/`; reusable turn sequencing lives under `rpce/dialogue` with re-exports in `dialogue/`.

## Reading next

- [`rpce/README.md`](rpce/README.md) — the cartridge-local point-and-click runtime and game-graph compiler.
- [`games/rocco-default/README.md`](games/rocco-default/README.md) — the `rocco-default` game graph and shared game-owned barrels.
- [`interactions/README.md`](interactions/README.md) — the distributed interaction registry and rule dispatch.
- [`inventory/README.md`](inventory/README.md) — inventory domain, storage, and fusion behavior.
- [`localization/README.md`](localization/README.md) — locale resolution and text catalogs.
- [`dialogue/README.md`](dialogue/README.md) — re-export of the RPCE dialogue runtime.
- [`levels/README.md`](levels/README.md) — the `RoccoLevel` contract and runtime orchestration.
