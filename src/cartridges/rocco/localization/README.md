# Rocco Localization

This directory contains localized text for the `rocco-default` cartridge.

## Files

- `types.ts` - Locale, localization, and text catalog types.
- `index.ts` - Locale resolution, catalog lookup helpers, and public catalog exports.
- `dialogue-helpers.ts` - Shared helpers for building localized dialogue choice trees.

## Locale Directories

Each locale has its own directory. The directory `index.ts` assembles a complete `RoccoTextCatalog` from smaller domain files.

| Path                                   | Contents                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `en/`                                  | English source catalog                                                                      |
| `es/`                                  | Spanish catalog                                                                             |
| `en/system.ts`, `es/system.ts`         | Manifest metadata, action labels, visible descriptions, level labels, and developer UI text |
| `en/inventory.ts`, `es/inventory.ts`   | Inventory labels, crafted-item labels, and item-use responses                               |
| `en/pier.ts`, `es/pier.ts`             | Pier object, feeding, keys, and Pier Middle lines                                           |
| `en/characters.ts`, `es/characters.ts` | Rocco, Pelikan, and Stan action-menu lines                                                  |
| `en/bait-shop.ts`, `es/bait-shop.ts`   | Bait shop interior text                                                                     |
| `en/stan/`, `es/stan/`                 | Stan branching dialogue, split by top-level dialogue route                                  |

## Supported Locales

- `en` - English, default.
- `es` - Spanish.

## Coverage

Catalogs cover:

- Cartridge manifest metadata shown in the boot menu.
- Action menu labels.
- Speech and thought lines.
- Stan branching dialogue tree and action-menu reaction lines.
- Rocco self-talk lines.
- Inventory title, base-item labels, crafted-item labels, failed-use lines, and Stan's police trap line.
- Visible object descriptions, including the bait shop door.
- Pier level titles and status labels, including the bait shop title.
- Keys defeat title.

## Usage

Use `createRoccoLocalization(locale)` to resolve a `RoccoLocalization` object. Unknown locales fall back to English.

Pass the localization object to Pier-level controllers, sprite definitions, action menu definitions, and status rendering so the cartridge uses one consistent catalog for the whole boot.

Cartridge code should import localization helpers from `./localization`. Locale internals should stay inside the locale directory unless a manifest or localization assembly needs direct catalog access.

When the cartridge restarts itself after an in-game defeat, reuse the same selected locale instead of resolving a fresh default locale.

Stan conversation content stays localized here as nested dialogue trees. The reusable sequencing logic lives in `../dialogue`, so new NPCs can reuse the same runtime while keeping their authored text inside the localization catalogs.
