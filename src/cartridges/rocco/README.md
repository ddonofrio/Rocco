# Default Cartridge: `rocco-default`

`rocco-default` is the main built-in cartridge for the ROCCO console. It implements a three-level Pier map starring Rocco, a Pelikan, a bait bucket, keys, and Rocco's inventory.

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
| `inventory/`    | Rocco cartridge inventory state and grid-menu projection           |
| `levels/pier/`  | Pier map levels, transitions, assets, effects, and interactions    |
| `localization/` | English and Spanish text catalogs for the cartridge                |

## Pier Map

The cartridge starts in Pier Middle. The map uses the same background, foreground, cloud, and walk-map artwork across three horizontal windows.

| Level          | ID            | Scene ID                  | Source Window |
| -------------- | ------------- | ------------------------- | ------------- |
| Pier Beginning | `pier-start`  | `rocco-pier-start-scene`  | Right side    |
| Pier Middle    | `pier-middle` | `rocco-pier-middle-scene` | Center        |
| Pier End       | `pier-end`    | `rocco-pier-end-scene`    | Left side     |

Rocco transitions through edge connectors. When his ground point enters an exit area, `RoccoPierLevelManager` loads the connected level, places Rocco on the matching entry point, and sets his facing direction.

## Interactions

- Rocco is the player sprite and supports click-to-walk.
- The bait bucket can be examined, grabbed, kicked, and dropped.
- The Pelikan reacts to Rocco and can enter a feeding sequence after the bait bucket is dropped.
- The keys are revealed through the Pier Middle sequence and can be collected.
- The inventory starts with a 20 EUR bill and later stores collected keys.
- Clicking Rocco opens a radial menu with self-talk and inventory options.
- The inventory option toggles a reorderable 3x3 grid menu populated from Rocco cartridge inventory state.
- Picking an inventory item can carry it on the console cursor for generic use attempts on sprites.
- Keys and the 20 EUR bill have localized failed-use responses for the bait bucket and the Pelikan.
- Pier Middle exits require keys in Rocco inventory. The gate is silent.

## Localization

The cartridge supports:

- `en` - English source text.
- `es` - Spanish text.

The boot menu shows language radio buttons for this cartridge. The selected locale is passed as `RoccoCartridgeContext.locale` and resolved through `createRoccoLocalization(locale)`.

Internal cartridge restarts such as the keys defeat restart preserve the selected locale and rebuild the cartridge with the same localization context.

Localized catalogs cover:

- Manifest metadata.
- Action labels.
- Speech and thought lines.
- Inventory title, item labels, and failed-use responses.
- Object descriptions.
- Level titles and status labels.
- Keys defeat title.

## Assets Layout

```text
assets/
  actions/              Action menu icons
  characters/
    rocco/              Rocco standing and running frames
    pelikan/            Pelikan idle, flight, feeding frames, and sound
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
