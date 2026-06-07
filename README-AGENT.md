# ROCCO Agent Reference

This document is written for AI coding agents. It explains the ROCCO console architecture, the cartridge model, the engine API surface, and the documentation workflow expected in this repository.

## Operating Rules

- Communicate with the user in their language. Write code and documentation in English.
- Read `AGENTS.md`, this file, `DEVELOPMENT.md`, and the relevant directory READMEs before editing.
- If the context window is large, read all project-owned README files before touching code.
- Keep documentation as present-tense reference material. Do not write dated notes, historical edit logs, or edit narratives.
- Use the `RoccoEngine` API from cartridge code. Do not import PixiJS or internal engine renderers into cartridges.
- Remove dead code. Do not leave unused imports, variables, or functions.
- Match nearby naming, file layout, and test style before introducing new patterns.

## Documentation Reading Strategy

Use documentation in layers:

1. `README.md` gives the human overview.
2. `AGENTS.md` gives repository rules and reading routes.
3. `README-AGENT.md` gives architecture and API concepts.
4. `DEVELOPMENT.md` gives commands, validation, and Windows workflow notes.
5. `src/engine/**/README.md` files explain engine systems.
6. `src/cartridges/**/README.md` files explain cartridge content and game rules.

Useful routes:

- Cartridge behavior: `src/engine/cartridges/README.md`, then the target cartridge README.
- Rocco Pier behavior: `src/cartridges/rocco/README.md`, then `src/cartridges/rocco/levels/pier/README.md`.
- Localization: `src/engine/cartridges/README.md`, `src/engine/cartridge-menu/README.md`, and `src/cartridges/rocco/localization/README.md`.
- Rendering and water effects: `src/engine/video/README.md`, `src/engine/video/planes/README.md`, and `src/engine/video/post-processing/README.md`.
- Sprites, walk maps, or actions: `src/engine/video/sprites/README.md`, `src/game/README.md`, and the relevant cartridge README.

After reading, inspect the closest existing implementation and tests. Prefer `rg "<concept>" src` over broad manual browsing.

## Project Overview

ROCCO is a browser-based retro game console emulator built with TypeScript, PixiJS, and Vite. It runs cartridges: self-contained game modules that plug into a stable engine API.

The key metaphor is:

- The engine is the console runtime.
- Cartridges are games.
- The cartridge API is the slot between them.

The engine provides capabilities such as rendering, audio, input, effects, persistence, and lifecycle management. Cartridges provide content and game logic.

## Directory Map

```text
src/
  main.ts                         Entry point
  style.css                       Global page style
  engine/
    engine-api.ts                 RoccoEngine interface
    runtime.ts                    GameRuntime implementation
    input-handler.ts              Input routing and blocking
    cartridge-manager.ts          Cartridge selection and lifecycle
    persistence-adapter.ts        Engine-facing persistence adapter
    audio/                        Web Audio and jukebox systems
    cartridges/                   Cartridge interfaces, loader, providers
    cartridge-menu/               Boot-time cartridge selection UI
    effects/                      Per-tick effects
    persistence/                  Dexie and IndexedDB records
    video/                        Rendering systems and visual subsystems
  cartridges/
    rocco/                        rocco-default cartridge
    terminal/                     Archived reference cartridge
  game/
    verbs.ts                      Shared point-and-click verb utilities
```

## Boot Flow

```text
index.html
  -> src/main.ts
  -> RoccoViewportHost.mount()
  -> GameRuntime.init()
     -> PixiJS Application
     -> RoccoRuntimeVideoSystem.mount(stage)
     -> effect registry and effect manager
     -> RoccoCartridgeManager.loadAndMount()
        -> RoccoDefaultCartridgeLoader
        -> RoccoBuiltinCartridgeProvider
        -> RoccoCartridgeMenu.show() when multiple cartridges are available
        -> cartridge.mount({ engine, locale })
        -> cartridge.start()
     -> render tick
```

The render tick runs in this order:

1. `effectManager.tick(deltaMs)`
2. `videoSystem.update(deltaMs)`
3. `activeCartridge.update(deltaMs)`
4. `videoSystem.render(delta)`

## Cartridge Interface

A cartridge implements `RoccoCartridge`:

```typescript
export interface RoccoCartridge {
  manifest: RoccoCartridgeManifest;
  mount(context: RoccoCartridgeContext): Promise<void> | void;
  start?(): Promise<void> | void;
  update?(deltaMs: number): void;
  handleAction?(activation: RoccoCartridgeAction): Promise<void> | void;
  stop?(): Promise<void> | void;
  dispose?(): Promise<void> | void;
}
```

The manifest identifies the cartridge and provides boot-menu metadata:

```typescript
export interface RoccoCartridgeManifest {
  id: string;
  title: string;
  version: string;
  description?: string;
  author?: string;
  publisher?: string;
  releaseYear?: number;
  genre?: string;
  players?: string;
  engineVersion?: string;
  tags?: string[];
  localizations?: Record<string, RoccoCartridgeLocalizedManifest>;
}
```

Localized manifest fields are optional and menu-facing:

```typescript
export type RoccoCartridgeLocalizedManifest = Partial<
  Pick<
    RoccoCartridgeManifest,
    'title' | 'description' | 'author' | 'publisher' | 'genre' | 'players' | 'tags'
  >
>;
```

The cartridge context contains the engine and an optional selected locale:

```typescript
export interface RoccoCartridgeContext {
  engine: RoccoEngine;
  locale?: string;
}
```

Cartridges that do not localize content can ignore `locale`.

## RoccoEngine API Surface

The full interface lives in `src/engine/engine-api.ts`.

### Composition

Use composition when mounting a scene to prevent visual pop-in:

```typescript
engine.beginComposition();
// Load scenes, assets, sprites, sounds, and menus.
engine.endComposition();
```

### Input Blocking

Use input blocking for non-cancelable sequences:

```typescript
engine.setInputEnabled(false);
// Start movement, animation, or cutscene.
engine.setInputEnabled(true);
```

Always re-enable input after a sequence completes or fails.

### Scene Management

- `loadPlaneScene(scene)` loads a graphic scene.
- `preloadPlaneScene(scene)` preloads plane assets.
- `serializePlaneScene(sceneId)` serializes current plane state.
- `savePlaneScene(scene)` persists a scene.
- `loadPlaneSceneRecord(sceneId)` loads a persisted scene.

### Sprites

- `loadSpriteDefinition(definition)` registers a sprite blueprint.
- `createSpriteFromDefinition(definitionId, options?)` creates an instance.
- `setSpritePosition(id, x, y)` teleports an instance.
- `moveSpriteTo(id, x, y, options?)` moves directly.
- `goSpriteTo(id, x, y, options?)` moves through the bound walk map.
- `playSpriteAction(id, actionId, options?)` plays a directional action profile.
- `playSpriteAnimation(id, animationId, options?)` plays an animation clip.
- `setPlayerSprite(id | null)` selects the click-to-walk player sprite.

### Audio and Jukebox

- `registerSound(definition)` registers a sound asset.
- `preloadSound(id)` loads a sound buffer.
- `playSound(id, options?)` plays a sound.
- `stopSound(id)` stops active instances of a sound.
- `jukebox.registerPlaylist(playlist)` registers background music.
- `jukebox.playPlaylist(id)` starts a playlist.
- `jukebox.stopPlaylist()` stops the active playlist.
- `jukebox.setVolume(volume)` sets master jukebox volume.

### Effects

- `addEffect(effect)` registers and starts a per-tick effect.
- `removeEffect(effectId)` removes an effect.

The built-in `auto-scroll` effect targets graphic planes.

### UI and Feedback

- `registerActionMenu(definition)` registers a radial action menu.
- `unregisterActionMenu(id)` removes a radial action menu.
- `video.gridMenus.openMenu(definition)` opens a generic slot grid panel.
- `video.gridMenus.toggleMenu(definition)` toggles a generic slot grid panel.
- `video.gridMenus.closeMenu()` closes the active generic slot grid panel.
- `video.gridMenus.getCarriedItem()` returns the generic grid item currently attached to the cursor.
- `video.gridMenus.clearCarriedItem()` clears the carried grid item payload.
- `video.gridMenus.useCarriedItemOnTarget(targetInstanceId, targetDefinitionId)` creates a generic item-use activation.
- `viewportHost.setCursorAttachment(attachment)` renders an image payload as the console cursor.
- `saySprite(id, text, options?)` shows speech.
- `thinkSprite(id, text, options?)` shows thought text.
- `addTitle(message)` shows a title overlay.
- `removeTitle(id)` removes a title overlay.
- `addPrimitive(primitive)` draws debug geometry.
- `removePrimitive(id)` removes debug geometry.
- `setStatus(message)` writes the status line.
- `log(channel, message)` writes a debug log entry.

### Display

- `setDisplayProfile(profile)` applies the display profile such as CRT overlay settings.

## Video System

Render layers define drawing order:

| Layer ID             | Kind       | Z Index | Depth Sort    |
| -------------------- | ---------- | ------- | ------------- |
| `background.back`    | background | 0       | none          |
| `background.main`    | background | 10      | none          |
| `world.behind`       | world      | 20      | y-sort        |
| `world.actors`       | world      | 30      | baseline-sort |
| `world.front`        | world      | 40      | y-sort        |
| `foreground`         | foreground | 50      | none          |
| `ui.action-menu`     | ui         | 55      | none          |
| `overlay.primitives` | overlay    | 60      | none          |
| `overlay.messages`   | overlay    | 68      | none          |
| `overlay.titles`     | overlay    | 70      | none          |
| `ui`                 | ui         | 80      | none          |
| `display.profile`    | display    | 90      | none          |

Each video subsystem keeps domain state separate from Pixi rendering. Cartridge code should call engine/video APIs, not renderer internals.

## Grid Menus

Grid menus are generic slot-panel UI owned by the console. They are useful for cartridge-defined panels such as inventories, but the engine does not own inventory state.

`engine.video.gridMenus` opens, closes, toggles, hovers, activates, reorders slots, and carries a generic item payload. The active cartridge receives `RoccoGridMenuActivation` and `RoccoGridMenuItemUseActivation` through `handleAction()`.

The cursor is a console capability. Grid item payloads can become cursor attachments, and cartridge code decides what using that payload on a sprite means.

## Graphic Planes

Planes are layered image, solid, bitmap, tile, or procedural backgrounds. A `RoccoPlaneScene` contains planes, palettes, color register sets, and attribute maps.

Supported plane source kinds:

- `solid`
- `image`
- `bitmap`
- `tileset`
- `tilemap`
- `procedural`

Image planes can opt into water animation through `metadata.waterColorEffect`.

## Sprite System

Sprite definitions are blueprints. Sprite instances are live entities.

- Definitions contain images, frames, clips, action profiles, walk maps, motion profiles, and hit areas.
- Instances contain position, visibility, motion state, animation state, and facing.
- Walk maps are alpha-mask images where opaque pixels are walkable.
- Action profiles map named actions such as `walk`, `idle`, or `kick` to directional animation clips.

## Effects System

Effects are per-tick operations on engine targets. The built-in `auto-scroll` runtime supports `targetType: 'graphic-plane'` and scrolls a plane with optional wrap-around.

```typescript
engine.addEffect({
  id: 'cloud-scroll',
  kind: 'auto-scroll',
  targetType: 'graphic-plane',
  targetId: 'clouds-plane',
  enabled: true,
  params: { velocityX: 20, velocityY: 0, units: 'pixels-per-second' },
});
```

## Cartridge Menu and Localization

The cartridge menu appears when multiple cartridges are available and no configured cartridge bypasses selection.

The menu:

- Displays cartridge metadata.
- Supports keyboard and mouse selection.
- Shows language radio buttons for manifests with `localizations`.
- Returns `{ selectedId, selectedLocale }`.

`RoccoCartridgeManager` stores the selected locale for `rocco-default` in `localStorage` and passes it to `cartridge.mount({ engine, locale })`.

`rocco-default` supports English and Spanish. Text catalogs live in `src/cartridges/rocco/localization`.

`rocco-default` uses the generic grid menu system as a reorderable 3x3 inventory panel.

## Built-in Cartridges

### `rocco-default`

The main demo cartridge lives in `src/cartridges/rocco`.

- Three connected Pier levels: Pier Beginning, Pier Middle, and Pier End.
- Shared pier scene artwork with right, centered, and left source-image windows.
- Level graph with east/west connectors, entry points, and entry facing.
- Per-level state retained by keeping level instances alive in `RoccoPierLevelManager`.
- The first Pier Middle mount plays a non-cancelable opening beat through the Rocco sprite controller.
- Rocco cartridge inventory for the 20€ bill, collected keys, and slot order.
- Rocco self action menu with Talk and Inventory options.
- Generic cursor item use for inventory attempts against Pier objects.
- Rocco player sprite with click-to-walk and directional actions.
- Pelikan NPC, bait bucket, feeding sequence, keys reveal, and key collection.
- English and Spanish localization.
- Water wave post-processing clipped to the source water mask.

### `terminal-work-in-progress`

The archived reference cartridge lives in `src/cartridges/terminal`.

- Procedural star-field plane.
- Auto-scroll effect.
- Minimal sprite setup.

Do not use Terminal as the template for new cartridges. Use `rocco-default` as the closest working reference.

## Creating a Cartridge

1. Create a folder under `src/cartridges/`.
2. Add a README describing cartridge purpose, files, state, assets, and interactions.
3. Implement `RoccoCartridge` in a `*-cartridge.ts` file.
4. Define a manifest in a `*-manifest.ts` file.
5. Add assets under the cartridge folder.
6. Register the cartridge with `RoccoBuiltinCartridgeProvider`.

Only use the `RoccoEngine` API inside cartridge code.

## Constraints

- The engine design resolution is `960 x 540`.
- Browser audio requires a user gesture before playback can unlock.
- Walk maps use alpha masks.
- Plane scenes are persisted per `scene.id`.
- The cartridge menu is bypassed when only one cartridge is available.
- Engine feature requests should be clarified if the current API does not support them.

## Testing

Tests use Vitest. Run focused tests first, then typecheck.

```powershell
powershell -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath 'C:\Users\diego\Documents\New project\Rocco'; & .\scripts\run-npm.ps1 -NpmArgs @('run','test','--','src/cartridges/rocco/rocco-default-cartridge.test.ts')"
```

```powershell
powershell -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath 'C:\Users\diego\Documents\New project\Rocco'; & .\scripts\run-npm.ps1 -NpmArgs @('run','typecheck')"
```

## Code Conventions

- TypeScript strict mode.
- Interfaces for data shapes.
- `structuredClone` for defensive copies when crossing module boundaries.
- No direct PixiJS usage outside Pixi renderer modules and Pixi-specific UI modules.
- Barrel `index.ts` exports for modules.
- `kebab-case` file names.
- `PascalCase` class names.
- Interfaces use the `Rocco` prefix.
