# Rocco Localization

This directory contains localized text for the `rocco-default` cartridge.

## Ownership

This directory contains the canonical Rocco localization catalogs and locale-resolution implementation.

`src/cartridges/rocco/games/rocco-default/localization` re-exports this directory for game-local imports. New catalog content and locale-resolution work belong here.

## Files

- `types.ts` — defines the supported locales, default locale, catalog structure, localization result, and localized manifest fields.
- `index.ts` — assembles locale-to-catalog lookup and exports `resolveRoccoLocale()` and `createRoccoLocalization()`.
- `dialogue-helpers.ts` — helps authored catalogs construct typed dialogue choice trees.
- `en/` — English catalog assembled from domain files into a complete `RoccoTextCatalog`.
- `es/` — Spanish catalog assembled from domain files into a complete `RoccoTextCatalog`.

## Supported locales

- `en` — English.
- `es` — Spanish and the default locale.

`ROCCO_SUPPORTED_LOCALES` is `['en', 'es']`.

`ROCCO_DEFAULT_LOCALE` is `es`.

`resolveRoccoLocale()` returns the requested supported locale or falls back to `es`.

## Locale Directories

Each locale has its own directory. The directory `index.ts` assembles a complete `RoccoTextCatalog` from smaller domain files.

| Path                                       | Contents                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `en/`                                      | English source catalog                                                                      |
| `es/`                                      | Spanish catalog                                                                             |
| `en/system.ts`, `es/system.ts`             | Manifest metadata, action labels, visible descriptions, level labels, and developer UI text |
| `en/inventory.ts`, `es/inventory.ts`       | Inventory labels, crafted-item labels, and item-use responses                               |
| `en/pier.ts`, `es/pier.ts`                 | Pier object, feeding, keys, and Pier Middle lines                                           |
| `en/characters.ts`, `es/characters.ts`     | Rocco, Pelikan, and Stan action-menu lines                                                  |
| `en/bait-shop.ts`, `es/bait-shop.ts`       | Bait shop interior text                                                                     |
| `en/stan/`, `es/stan/`                     | Stan branching dialogue, split by top-level dialogue route                                  |
| `en/final-screen.ts`, `es/final-screen.ts` | Final dedication and ordered credit catalogs                                                |

## Coverage

Catalogs cover:

- manifest metadata;
- action labels;
- descriptions;
- level and status labels;
- inventory and fusion labels;
- developer UI;
- Rocco lines;
- Pelikan lines;
- Stan dialogue;
- Pier interactions;
- bait-shop interactions and toilet sequences;
- Nether interactions and intercom dialogue;
- final-screen dedication and credits;
- defeat and restart text.

## Dialogue ownership

Dialogue text and choice trees remain in the localization catalogs.

The canonical dialogue runtime lives in [`../rpce/dialogue`](../rpce/dialogue/README.md). It owns menu projection, timed conversation flow, input leases, sequence advancement, line selection, and reusable message helpers.

The directory `../dialogue` is an import surface that re-exports the runtime owned by `../rpce/dialogue`. Localized text and dialogue trees remain owned by `localization/`; the dialogue runtime behavior is owned by `rpce/dialogue/`.

Authored localized text must remain separate from reusable runtime sequencing.

## Usage

```ts
const localization = createRoccoLocalization(selectedLocale);
```

The result contains the resolved `locale` and complete `text` catalog.

The same localization object is passed throughout one cartridge run.

A cartridge restart reuses the selected locale.

Callers should consume `RoccoLocalization` instead of independently resolving locale fragments.

## Adding visible text

When adding a new visible object, verb response, caption, or item label:

1. Add the key to `types.ts`.
2. Add English and Spanish text in the correct locale files.
3. Resolve the text through `createRoccoLocalization(locale).text` or a localized helper.
4. Re-check the touched files for mojibake fragments before handoff.

Do not mix localized strings and hardcoded strings for the same interaction. Hover captions must match the current gameplay state; if the object state changes, refresh the caption too. Do not bypass localization for placeholders.
