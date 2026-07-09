# Default Cartridge: `rocco-default`

`rocco-default` is the main built-in cartridge for the ROCCO console. It implements the Pier exterior, the bait shop interior, connected Nether screens, the developer-only Reset Office screens, and the cartridge-owned inventory systems that tie those spaces together.

## Files

- `rocco-default-cartridge.ts` - `RoccoDefaultCartridge`, which mounts the Pier level manager and delegates runtime actions.
- `rocco-default-manifest.ts` - Cartridge identity and localized menu metadata.
- `rocco-default-constants.ts` - Shared design, scene, level, scroll, color, and sprite IDs.
- `rocco-default-assets.ts` - Shared cartridge asset URIs.
- `rocco-default-sprite-definition.ts` - Rocco player sprite definition.
- `rocco-default-sprites.ts` - Rocco player sprite installation.
- `rocco-player-appearance.ts` - Player appearance IDs and the default versus lab-coat appearance contract.
- `rocco-player-action-menu.ts` - Rocco self action menu with Talk and Inventory actions.
- `rocco-developer-mode.ts` - Developer-mode menu definitions, inventory seeding, and event-toggle helpers used by the runtime controller.
- `scripted-scene-interaction-controller.ts` - Shared walk-then-react controller for scene-target choreography.

## Subdirectories

| Directory       | Contents                                                          |
| --------------- | ----------------------------------------------------------------- |
| `assets/`       | Shared cartridge assets for characters, props, sounds, and icons  |
| `dialogue/`     | Reusable cartridge dialogue helpers and branching conversation runtime |
| `inventory/`    | Rocco cartridge inventory state, souvenir assets, fusion recipes, prop storages, and grid-menu projection |
| `levels/runtime/` | Cartridge runtime helpers for registration, transitions, action routing, inventory runtime, dropped-item runtime, scripted sequences, and developer mode |
| `levels/pier/`  | Pier exterior levels, transitions, assets, effects, and interactions |
| `levels/bait-shop/` | Bait shop interior levels, scene assets, walk maps, and per-level Rocco setup |
| `levels/nether/` | Nether and Reset Office levels, arrival effects, walk maps, and per-level Rocco setup |
| `localization/` | English and Spanish text catalogs for the cartridge                |

## World Structure

The cartridge starts in Pier Middle and currently spans four level families.

| Family | Level | ID | Scene ID | Notes |
| ------ | ----- | -- | -------- | ----- |
| Pier exterior | Pier Beginning | `pier-start` | `rocco-pier-start-scene` | Right panorama window |
| Pier exterior | Pier Middle | `pier-middle` | `rocco-pier-middle-scene` | Center panorama window and default start |
| Pier exterior | Pier End | `pier-end` | `rocco-pier-end-scene` | Left panorama window |
| Bait shop | Front room | `bait-shop` | `rocco-bait-shop-scene` | First interior screen |
| Bait shop | Back room | `bait-shop-second` | `rocco-bait-shop-second-scene` | Souvenir-table and toilet-door screen |
| Bait shop | Toilet room | `bait-shop-toilet` | `rocco-bait-shop-toilet-scene` | Magazine sequence, ritual branch, and portal trigger |
| Nether | Console hardware spawn | `nether-console-hardware-spawn` | `rocco-nether-console-hardware-spawn-scene` | First Nether screen after the portal arrival |
| Nether | End of hallway door | `nether-end-of-hallway-door` | `rocco-nether-end-of-hallway-door-scene` | Second Nether screen with mounted scene-target interactions |
| Reset Office | Reset Office 1 | `nether-reset-office` | `rocco-nether-reset-office-scene` | Developer-only branch |
| Reset Office | Reset Office 2 | `nether-reset-office-second` | `rocco-nether-reset-office-second-scene` | Developer-only branch with the printer prop |

Rocco transitions through edge connectors on connected screens. Cartridge runtime controllers resolve the connector graph, exit intent, action-routing priority, inventory runtime, dropped-item flow, scripted sequences, and developer-mode state, while `RoccoLevelManager` mounts the connected level, places Rocco on the matching entry point, and coordinates the active high-level flow. Using the keys on the bait shop door while Stan sleeps opens a separate transition into the bait shop interior. The bait-shop toilet portal then leads into `nether-console-hardware-spawn`, which connects onward to `nether-end-of-hallway-door`. Developer mode also exposes the separate two-screen Reset Office branch, which stays outside the normal level graph.

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
- Developer mode also exposes a two-screen Reset Office branch, and the second screen includes an office printer prop with `look`, `grab`, and `kick` actions.

## Localization

The cartridge supports:

- `en` - English source text.
- `es` - Spanish text.

The boot menu shows language radio buttons for this cartridge. The selected locale is passed as `RoccoCartridgeContext.locale` and resolved through `createRoccoLocalization(locale)`.

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
- Pier-specific state, transitions, sprites, and controllers live inside `levels/pier`.
- Bait shop interior scene state, planes, and assets live inside `levels/bait-shop`.
- Nether scene state, perspective helpers, arrival effects, and assets live inside `levels/nether`.
- Localized dialogue trees stay in `localization/`; the reusable turn sequencing stays in `dialogue/`.
