# Default Cartridge: `rocco-default`

`rocco-default` is the main built-in cartridge for the ROCCO console. It implements the Pier exterior plus the bait shop interior starring Rocco, a Pelikan, a bait bucket, keys, and Rocco's inventory.

## Files

- `rocco-default-cartridge.ts` - `RoccoDefaultCartridge`, which mounts the Pier level manager and delegates runtime actions.
- `rocco-default-manifest.ts` - Cartridge identity and localized menu metadata.
- `rocco-default-constants.ts` - Shared design, scene, level, scroll, color, and sprite IDs.
- `rocco-default-assets.ts` - Shared cartridge asset URIs.
- `rocco-default-sprite-definition.ts` - Rocco player sprite definition.
- `rocco-default-sprites.ts` - Rocco player sprite installation.
- `rocco-player-action-menu.ts` - Rocco self action menu with Talk and Inventory actions.

## Subdirectories

| Directory       | Contents                                                          |
| --------------- | ----------------------------------------------------------------- |
| `assets/`       | Shared cartridge assets for characters, props, sounds, and icons  |
| `dialogue/`     | Reusable cartridge dialogue helpers and branching conversation runtime |
| `inventory/`    | Rocco cartridge inventory state, prop storages, and grid-menu projection |
| `levels/pier/`  | Pier exterior levels, transitions, assets, effects, and interactions |
| `levels/bait-shop/` | Bait shop interior level, scene assets, walk map, and per-level Rocco setup |
| `localization/` | English and Spanish text catalogs for the cartridge                |

## Pier Map

The cartridge starts in Pier Middle. The exterior uses the same background, foreground, cloud, and walk-map artwork across three horizontal windows, and Pier Beginning can branch into the bait shop interior.

| Level          | ID            | Scene ID                  | Source Window |
| -------------- | ------------- | ------------------------- | ------------- |
| Pier Beginning | `pier-start`  | `rocco-pier-start-scene`  | Right side    |
| Pier Middle    | `pier-middle` | `rocco-pier-middle-scene` | Center        |
| Pier End       | `pier-end`    | `rocco-pier-end-scene`    | Left side     |
| Bait Shop      | `bait-shop`   | `rocco-bait-shop-scene`   | Interior      |

Rocco transitions through edge connectors on connected screens. When his ground point enters an exit area, `RoccoLevelManager` loads the connected level, places Rocco on the matching entry point, and sets his facing direction. Using the keys on the bait shop door while Stan sleeps opens a separate transition into the bait shop scene.

## Interactions

- Rocco is the player sprite and supports click-to-walk.
- Pier Beginning includes Stan asleep on a chair between the right mooring post and the bait shop.
- Stan supports the same four action verbs as the Pelikan, and Talk wakes him and then opens the first text choice dialogue panel built from the cartridge dialogue library.
- The bait shop door stays visible and hoverable from the start, and using the keys on it only works while Stan is asleep and transitions into the bait shop interior.
- The bait bucket can be examined, grabbed, kicked, and dropped.
- The Pelikan reacts to Rocco and can enter a feeding sequence after the bait bucket is dropped.
- The keys are revealed through the Pier Middle sequence and can be collected.
- The inventory starts with a 20 EUR bill and later stores collected keys.
- Clicking Rocco opens a radial menu with self-talk and inventory options.
- The inventory option toggles a reorderable 3x3 grid menu populated from Rocco cartridge inventory state.
- The bait shop souvenir table reuses the same cartridge inventory layer as a left-right transfer view, with a 5x4 table layout and table-only placement rules.
- Full player inventory blocks new pickups instead of reusing an occupied slot.
- Picking an inventory item can carry it on the console cursor for generic use attempts on sprites.
- Keys and the 20 EUR bill have localized failed-use responses for the bait bucket and the Pelikan.
- Pier Middle exits are available without an inventory gate.

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
- Inventory title, item labels, and failed-use responses.
- Object descriptions, including the bait shop door hover label.
- Level titles and status labels, including the bait shop title.
- Keys defeat title.

## Assets Layout

```text
assets/
  actions/              Action menu icons
  characters/
    rocco/              Rocco standing and running frames
    pelikan/            Pelikan idle, flight, feeding frames, and sound
    stan/               Stan seated pose sheet for Pier Beginning
  props/
    bait-bucket/        Normal and dropped bait bucket images
    keys/               Keys image and defeat sound
    money/              20 EUR bill image
  sounds/               Shared cartridge sounds
```

## Conventions

- Instance IDs for interactive sprites are defined in `rocco-default-constants.ts`.
- Asset URIs use Vite-compatible `import ... as string` patterns.
- Shared Rocco sprite logic lives in `rocco-default-sprites.ts` and `rocco-default-sprite-definition.ts`.
- Pier-specific state, transitions, sprites, and controllers live inside `levels/pier`.
- Bait shop interior scene state, planes, and assets live inside `levels/bait-shop`.
- Localized dialogue trees stay in `localization/`; the reusable turn sequencing stays in `dialogue/`.
