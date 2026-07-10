# Cartridge Menu

The cartridge menu is the boot-time selection UI shown when multiple cartridges are available and no configured cartridge bypasses selection.

## Files

- `cartridge-menu.ts` - `RoccoCartridgeMenu`, the boot-menu facade that owns Pixi composition, event handling, and final selection confirmation.
- `cartridge-menu-session.ts` - Internal boot-menu session state and routing helper for page selection, list scroll/selection, localized manifest selection, and display/sound profiles.
- `system-settings-page-renderer.ts` - Internal Pixi composition helper for the `System Settings` home, video, sound, and filter pages.
- `pixi-ui-primitives.ts` - Internal PixiJS panel, footer, button, control, interaction, and text helpers reused by the menu.

## Role in Boot

`RoccoCartridgeManager` creates the menu after cartridge manifests are discovered and any boot-time cartridge setup hooks have run, and before a cartridge is mounted.

The menu resolves with:

```typescript
interface CartridgeMenuResult {
  selectedId: string;
  selectedLocale?: string;
}
```

`selectedId` chooses the cartridge. `selectedLocale` is present when the selected cartridge has localized manifest metadata and the user chooses a locale.

The current implementation keeps boot-menu session state and page routing in `cartridge-menu-session.ts`, delegates settings-page Pixi composition to `system-settings-page-renderer.ts`, delegates repeated Pixi primitives to `pixi-ui-primitives.ts`, and does not use a dedicated menu sound asset.

## System Settings

The boot menu includes a `System Settings` page.

- The engine contributes built-in console modules such as video and sound.
- Cartridge setup hooks can contribute additional generic boot settings through `RoccoCartridgeBootSetting`.
- The runtime seeds the menu with the current display profile, sound profile, and merged boot settings so the settings pages reflect live console state.
- A settings row can expose a live value label and an activation callback.
- Keyboard activation uses Enter or Space on the selected row.
- Pointer activation is two-step: the first click selects a row, and a second click activates it.

## Visual Design

- Dark green monochrome palette.
- LucasArts-inspired boot-screen layout.
- Cartridge list on the left.
- Detail panel on the right.
- Uppercase monospaced labels.
- Scanline overlay.
- Mouse and keyboard support.

## Cartridge List

Each list item shows:

- Title.
- Publisher or author.
- Genre.
- Release year when present.
- Version.

The list supports scrolling when more cartridges exist than fit on screen.

## Detail Panel

The selected cartridge detail panel shows:

- Title.
- Description.
- Publisher or author.
- Year.
- Genre.
- Players.
- Version.
- Cartridge ID.
- Tags.
- Language radio buttons when localized metadata exists.
- `LOAD` button.

## Navigation

- Arrow up and arrow down select cartridges.
- Enter and Space load the selected cartridge.
- Clicking a cartridge selects it.
- Clicking scroll arrows moves the list window.
- Clicking `LOAD` loads the selected cartridge.
- Clicking a language radio button changes the selected locale and redraws localized metadata.
- In `System Settings`, the first click selects a module row and the second click activates it.

Radio button hit areas are local to their option container. Keep the container position and hit-area coordinates aligned when changing layout.

## Localization

Manifests can include `localizations`, keyed by locale. The menu uses the selected locale to display localized manifest fields.

The base manifest is treated as English by convention. Additional locale keys come from `manifest.localizations`.

For `rocco-default`, the menu shows `EN` and `ES`. The selected value is persisted by `RoccoCartridgeManager` and passed to the cartridge through `RoccoCartridgeContext.locale`.

Cartridges without `localizations` do not show language controls.

## Layout Constants

- Design resolution: `960 x 540`.
- Header height: `90`.
- Footer height: `52`.
- Item height: `64`.
- Visible items: calculated from available height.
- Item margin: `6`.

## Palette

| Element          | Color     |
| ---------------- | --------- |
| Background       | `#0d110c` |
| Selected item    | `#1f3c1b` |
| Selected border  | `#5cb84a` |
| Brand title      | `#8ecf6e` |
| Item title       | `#d4ecc8` |
| Detail labels    | `#4a6b42` |
| Detail values    | `#b0c8a8` |
| Scanlines        | `#000000` |

## Usage

Minimal engine-side usage:

```typescript
const menu = new RoccoCartridgeMenu(app);
const result = await menu.show(manifests, {
  initialLocales: {
    'rocco-default': 'en',
  },
});

menu.dispose();
```

The runtime-owned cartridge manager uses the fuller integration shape:

```typescript
const result = await menu.show(manifests, {
  initialLocales,
  initialDisplayProfile: runtimeEngine.video.display.getProfile(),
  initialSoundProfile: runtimeEngine.getSoundProfile(),
  bootSettings,
  onDisplayProfileChange: (profile) => {
    runtimeEngine.video.display.setProfile(profile);
  },
  onSoundProfileChange: (profile) => {
    runtimeEngine.setSoundProfile(profile);
  },
});
```

`getSoundProfile()` and `setSoundProfile()` are runtime-owned boot-menu hooks used by `RoccoCartridgeManager`. They are not part of the cartridge-facing `RoccoEngine` interface.

The menu owns its Pixi containers while displayed and removes them on disposal.
