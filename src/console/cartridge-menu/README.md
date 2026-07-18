# Cartridge Menu

The cartridge menu is the boot-time selection UI shown when multiple cartridges are available and no configured cartridge bypasses selection.

## Files

- `cartridge-menu.ts` — `RoccoCartridgeMenu`, the boot-menu facade that owns Pixi composition, event handling, and final selection confirmation.
- `cartridge-menu-session.ts` — Internal boot-menu session state and routing helper.
- `system-settings-page-renderer.ts` — Internal Pixi composition helper for the `System Settings` pages.
- `pixi-ui-primitives.ts` — Internal PixiJS panel, footer, button, control, interaction, and text helpers reused by the menu.

## Boot-time ownership

`RoccoCartridgeManager` creates the menu after cartridge manifests are discovered and any boot-time setup hooks have run, and before a cartridge is mounted.

The menu resolves with `{ selectedId, selectedLocale? }`. `selectedId` chooses the cartridge; `selectedLocale` is present when the selected cartridge has localized manifest metadata and the user chooses a locale. `RoccoCartridgeManager` persists the locale and passes it through `CartridgeContextV1.locale`.

## Settings-extension boundary

The console contributes built-in `System Settings` modules (video, sound). Cartridge setup hooks can contribute additional generic boot settings through `RoccoCartridgeBootSetting`. The runtime seeds the menu with the current display profile, sound profile, and merged boot settings.

`getSoundProfile()` and `setSoundProfile()` are runtime-owned boot-menu hooks used by `RoccoCartridgeManager`. They are not part of the cartridge-facing SDK or the internal `ConsoleKernel` contract.

## Interaction invariant

Pointer activation is two-step: the first click selects a row or module, and a second click activates it. Keyboard activation uses Enter or Space on the selected row. Radio button hit areas are local to their option container.

## Localization

Manifests can include `localizations`, keyed by locale. The menu uses the selected locale to display localized manifest fields; the base manifest is treated as English by convention. Cartridges without `localizations` do not show language controls.

## Reading next

- `src/console/cartridges/README.md` for cartridge discovery and the mount boundary.
- `src/console/video/README.md` for the visual subsystems the menu composes against.
