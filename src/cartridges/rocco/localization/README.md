# Rocco Localization

This directory contains localized text for the `rocco-default` cartridge.

## Files

- `types.ts` - Locale, localization, and text catalog types.
- `en.ts` - English source catalog.
- `es.ts` - Spanish catalog.
- `index.ts` - Locale resolution and catalog lookup helpers.

## Supported Locales

- `en` - English, default.
- `es` - Spanish.

## Coverage

Catalogs cover:

- Cartridge manifest metadata shown in the boot menu.
- Action menu labels.
- Speech and thought lines.
- Rocco self-talk lines.
- Inventory title, item labels, and failed-use lines.
- Visible object descriptions.
- Pier level titles and status labels.
- Keys defeat title.

## Usage

Use `createRoccoLocalization(locale)` to resolve a `RoccoLocalization` object. Unknown locales fall back to English.

Pass the localization object to Pier-level controllers, sprite definitions, action menu definitions, and status rendering so the cartridge uses one consistent catalog for the whole boot.
