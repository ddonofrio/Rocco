# ROCCO Agent Reference

This document is written for AI coding agents. It explains the ROCCO console architecture, the cartridge model, the console SDK surface, the subsystem SDK surfaces, and the documentation workflow expected in this repository.

## Operating Rules

- Communicate with the user in their language. Write code and documentation in English.
- Read `AGENTS.md`, this file, `DEVELOPMENT.md`, and the relevant directory READMEs before editing.
- If the context window is large, read all project-owned README files before touching code.
- Keep documentation as present-tense reference material. Do not write dated notes, historical edit logs, or edit narratives.
- Treat README files as live contracts for current shipped behavior and architecture. When cartridge scope, asset ownership, or engine-cartridge boundaries change, update the root overview and the nearest leaf README in the same change.
- Use the `RoccoEngine` SDK surface and exposed subsystem SDKs from cartridge code. Avoid importing PixiJS rendering classes or internal engine renderers into cartridges. Use engine-owned preload helpers such as `engine.video.preloadAssetUrls(...)`, `engine.video.preloadPlaneScene(...)`, and `engine.video.preloadSpriteDefinition(...)` instead.
- Remove dead code. Do not leave unused imports, variables, or functions.
- Match nearby naming, file layout, and test style before introducing new patterns.

## Documentation Reading Strategy

Use documentation in layers:

1. `README.md` gives the human overview.
2. `AGENTS.md` gives repository rules and reading routes.
3. `README-AGENT.md` gives architecture, console SDK, and subsystem SDK concepts.
4. `DEVELOPMENT.md` gives commands, validation, and Windows workflow notes.
5. `src/console/**/README.md` files document the current console subsystems.
6. `src/cartridges/**/README.md` files explain cartridge content and cartridge rules, with `games/rocco-default/maps/*` as the structural ownership point for the current Rocco maps.

Useful routes:

- Cartridge behavior: `src/console/cartridges/README.md`, then the target cartridge README.
- Rocco cartridge behavior: `src/cartridges/rocco/README.md`, then `src/cartridges/rocco/games/rocco-default/README.md`, then the relevant map README under `src/cartridges/rocco/games/rocco-default/maps/*`. Read the matching `src/cartridges/rocco/levels/*/README.md` when you need the compatibility wrappers.
- Localization: `src/console/cartridges/README.md`, `src/console/cartridge-menu/README.md`, and `src/cartridges/rocco/localization/README.md`.
- Rendering and water effects: `src/console/video/README.md`, `src/console/video/planes/README.md`, and `src/console/video/post-processing/README.md`.
- Sprites, walk maps, or actions: `src/console/video/sprites/README.md` and the relevant cartridge README.

After reading, inspect the closest existing implementation and tests. If a semantic search tool is available, use it as the default code-discovery path because this repository is indexed and semantic matches usually outperform literal text search for concept-level lookups. Use `rg "<concept>" src` for exact text matches and fallback when semantic search is unavailable.

## Project Overview

ROCCO is a browser-based retro console runtime built with TypeScript, PixiJS, and Vite. It runs cartridges: self-contained cartridge modules that plug into a stable console SDK surface and subsystem SDKs.

The key metaphor is:

- The console is the generic host runtime.
- Cartridges are the software cartridges that plug into the runtime.
- The `RoccoEngine` SDK surface and subsystem SDKs are the slot between them. The type name still says `Engine`, but it is the console-facing SDK.

The console provides capabilities such as rendering, audio, input, effects, persistence, and lifecycle management. Cartridges provide content and cartridge logic.

## Directory Map

```text
src/
  main.ts                         Entry point
  style.css                       Global page style
  console/                        Console runtime implementation and SDK surface
    engine-sdk.ts                 RoccoEngine SDK surface
    runtime.ts                    GameRuntime implementation
    input-handler.ts              Input routing and blocking
    cartridge-manager.ts          Cartridge selection and lifecycle
    persistence-adapter.ts        Console-facing persistence adapter
    audio/                        Web Audio and jukebox systems
    cartridges/                   Cartridge interfaces, loader, providers
    cartridge-menu/               Boot-time cartridge selection UI
    effects/                      Per-tick effects
    persistence/                  Dexie and IndexedDB records
    video/                        Rendering systems and visual subsystems
  cartridges/
    rocco/                        Cartridge bootstrap plus RPCE and rocco-default game content
      rpce/                       Cartridge-local point-and-click runtime
      games/rocco-default/        Current game content organized by maps
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
        -> cartridge.setup({ console }) for discovered cartridges
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
  setup?(
    context: RoccoCartridgeSetupContext,
  ): Promise<RoccoCartridgeSetupResult | void> | RoccoCartridgeSetupResult | void;
  mount(context: RoccoCartridgeContext): Promise<void> | void;
  start?(): Promise<void> | void;
  update?(deltaMs: number): void;
  handleAction?(
    activation: RoccoCartridgeAction,
  ): Promise<void> | RoccoCartridgeActionResult | void;
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

`setup()` is an optional boot-time hook. The cartridge manager runs it during cartridge discovery before the boot menu is shown. Setup can inspect or patch console flags through a narrow console surface and can contribute boot-time settings modules to the boot menu without mounting the cartridge.

```typescript
export interface RoccoCartridgeSetupContext {
  console: {
    getFlags(): RoccoConsoleFlags;
    setFlags(patch: Partial<RoccoConsoleFlags>): void;
  };
}

export interface RoccoCartridgeSetupResult {
  consoleFlags?: Partial<RoccoConsoleFlags>;
  bootSettings?: readonly RoccoCartridgeBootSetting[];
}
```

`handleAction()` can synchronously return:

```typescript
export interface RoccoCartridgeActionResult {
  suppressDefaultPlayerMove?: boolean;
}
```

When `suppressDefaultPlayerMove` is `true`, the runtime skips the default click-to-walk that would otherwise follow a `scene-click`. This check is synchronous: the runtime only inspects the direct return value, not a later async resolution. Scene targets can request the same behavior through `RoccoSceneTargetDefinition.suppressDefaultPlayerMove`.

## Cartridge SDK v1

The cartridge-facing surface is split into three (audit SDK-001 / ROCCO-011):

```text
ConsoleKernel   (private runtime API: update/render/viewport/scheduler)
CartridgeSdkV1  (stable, narrow, versioned API used by cartridges)
CartridgeCapabilities (negotiated optional features)
```

The full `RoccoEngine` kernel lives in `src/console/engine-sdk.ts`. Inside
`mount(context)`, prefer the narrow, version-stamped `context.sdk` of type
`CartridgeSdkV1` (defined in `src/console/cartridges/sdk-v1`). It is built by
`createCartridgeSdkV1({ engine, scope, manifest })`, which wraps `RoccoEngine`
and exposes only the stable subset. Internal-only methods (`video.update`,
`video.render`, `video.viewport`, the kernel `video.zoom` module, render-layer ordering,
`effects.tick`, `jukebox.unlock`) are absent from the SDK object, so a cartridge
cannot reach them even at runtime.

`CartridgeSdkV1` exposes:

- Subsystem handles: `video`, `audio`, `jukebox`, `effects`, `input`, `storage`.
- `beginCompositionSession(ownerId, options?)` for the owned loading overlay.
- `setStatus(message)` and `log(channel, message)` via `logger`.
- `scope`: the cartridge's own `ResourceScope` for registering disposers.
- `sdkVersion` (`'1.0.0'`) and `capabilities` (the negotiated capability ids).

The manifest may declare the runtime it targets:

```typescript
runtime: {
  sdk: '^1.0.0',
  capabilities: ['audio.v1', 'video.sprites.v1', 'composition.v1'],
}
```

`RoccoCartridgeManager` validates this with `assertCartridgeSdkCompatibility`
before `mount()` and rejects incompatible SDK ranges or unknown capabilities.
Legacy cartridges without a `runtime` block keep mounting against the full
`RoccoEngine` kernel.

`RoccoEngine` still exposes (kept for legacy callers and the kernel itself):

- Scene management: `loadPlaneScene(scene)` and `serializePlaneScene(sceneId)`.
- Player selection: `setPlayerSprite(id | null)` and `getPlayerSprite()`.
- Input control: `acquireInputLease(ownerId, mode)` / `getInputMode()`
  (prefer these over the deprecated `setInputEnabled` / `isInputEnabled`).
- Console flags: `isDeveloperModeEnabled()`, `getConsoleFlags()`, and
  `setConsoleFlags(patch)`.
- Composition control: `beginCompositionSession()` (prefer over the deprecated
  `beginComposition` / `endComposition` / `setCompositionText`).
- Status and logging: `setStatus(message)` and `log(channel, message)`.

`RoccoConsoleFlags` is the console-owned boot state shared between the runtime, the cartridge manager, and any boot-time cartridge setup hooks:

```typescript
export interface RoccoConsoleFlags {
  developerModeEnabled: boolean;
}
```

### Composition

Use composition when mounting a scene to prevent visual pop-in:

```typescript
engine.beginComposition();
// Load scenes, assets, sprites, sounds, and menus.
engine.endComposition();
```

`setCompositionText(text)` optionally writes a single line of text inside the composition overlay while it is active. Pass `null` to clear it.

### Input Blocking

Use input blocking for non-cancelable sequences:

```typescript
engine.setInputEnabled(false);
// Start movement, animation, or cutscene.
engine.setInputEnabled(true);
```

Always re-enable input after a sequence completes or fails.

### Scene Management and Persistence

- `loadPlaneScene(scene)` replaces the active graphic scene and keeps runtime scene bookkeeping in sync.
- `serializePlaneScene(sceneId)` snapshots the current scene state.
- `CartridgeSdkV1.storage.savePlaneScene(scene)` persists a scene for SDK v1.
- `CartridgeSdkV1.storage.loadPlaneSceneRecord(sceneId)` loads a persisted scene for SDK v1.
- Legacy cartridges use the explicit `LegacyCartridgeContext.engine.persistence` equivalents.

## Audio, Jukebox, and Effects SDKs

SDK v1 cartridges reach these capabilities through subsystem handles on
`CartridgeSdkV1`; legacy cartridges use the explicit `RoccoEngine` context.

- `engine.audio.registerSound(definition)` registers a sound asset.
- `engine.audio.unregisterSound(id)` removes a sound definition and stops its active instances.
- `engine.audio.preloadSound(id)` loads a sound buffer.
- `engine.audio.playSound(id, options?)` plays a sound.
- `engine.audio.setSoundVolume(id, volume)` updates the gain of currently playing instances.
- `engine.audio.stopSound(id)` stops active instances of a sound.
- `engine.audio.stopAllSounds()` stops every active one-shot sound.
- `engine.jukebox.registerPlaylist(playlist)` registers background music.
- `engine.jukebox.unregisterPlaylist(id)` removes a playlist definition.
- `engine.jukebox.playPlaylist(id)` starts a playlist.
- `engine.jukebox.stopPlaylist()` stops the active playlist.
- `engine.jukebox.isPlaying()` reports whether a playlist is currently active.
- `engine.jukebox.setVolume(volume)` sets the master jukebox volume multiplier.
- `engine.jukebox.getCurrentTrack()` returns the active track id when one is playing.
- `engine.effects.add(effect)` registers and starts a per-tick effect.
- `engine.effects.remove(effectId)` removes an effect.
- `engine.effects.update(effectId, patch)` edits an active effect.
- `engine.effects.enable(effectId)` and `engine.effects.disable(effectId)` toggle an effect.

The built-in `auto-scroll` effect targets graphic planes.

## Video SDK

The cartridge-facing video SDK lives under `CartridgeSdkV1.video`.
`RoccoRuntimeVideoSystem` exposes subsystem modules plus asset-preload helpers
used by cartridges.

### Video Preloading

- `engine.video.preloadAssetUrls(assetUrls)` preloads raw image or UI asset URLs through the console video layer.
- `engine.video.preloadPlaneScene(scene)` preloads plane assets before the active scene is switched through `engine.loadPlaneScene(scene)`.
- `engine.video.preloadSpriteDefinition(definition)` preloads a single sprite definition and its assets.
- `engine.video.preloadSpriteDefinitions(definitions)` preloads multiple sprite definitions.

### Graphic Planes

- Use `engine.loadPlaneScene(scene)` to replace the active scene.
- Use `engine.serializePlaneScene(sceneId)` to snapshot a scene through the runtime.
- Use `engine.video.planes.updatePlane(sceneId, planeId, patch)` for plane-level mutations.
- Use `engine.video.planes.resolvePlane(sceneId, planeId)` to inspect a live plane definition.

### Sprites

- `engine.video.sprites.loadSpriteDefinition(definition)` registers a sprite blueprint.
- `engine.video.sprites.createSpriteFromDefinition(definitionId, options?)` creates an instance.
- `engine.video.sprites.setPosition(id, x, y)` teleports an instance.
- `engine.video.sprites.moveTo(id, x, y, options?)` moves directly.
- `engine.video.sprites.goTo(id, x, y, options?)` moves through the bound walk map.
- `engine.video.sprites.playAction(id, actionId, options?)` plays a directional action profile.
- `engine.video.sprites.playAnimation(id, animationId, options?)` plays an animation clip.
- `engine.video.sprites.registerWalkMap(walkMap)` registers a walk map.
- `engine.video.sprites.bindToWalkMap(id, binding)` binds a walk map to an instance.
- `setPlayerSprite(id | null)` selects the click-to-walk player sprite through the engine SDK surface and feeds player-aware plane depth modes.

### UI and Feedback

- `engine.video.actionMenus.registerMenu(definition)` registers a radial action menu.
- `engine.video.actionMenus.unregisterMenu(id)` removes a radial action menu.
- `engine.video.actionMenus.closeMenu()` closes the active radial action menu.
- `engine.video.gridMenus.openMenu(definition)` opens a generic slot grid panel or text choice list.
- `engine.video.gridMenus.toggleMenu(definition)` toggles a generic slot grid panel.
- `engine.video.gridMenus.closeMenu()` closes the active generic slot grid panel.
- `engine.video.gridMenus.getCarriedItem()` returns the source menu id and generic grid item currently attached to the cursor.
- `engine.video.gridMenus.clearCarriedItem()` clears the carried grid item payload.
- `engine.video.messages.showMessage(message)` shows a fully specified sprite-anchored message.
- `engine.video.messages.say(id, text, options?)` shows speech.
- `engine.video.messages.think(id, text, options?)` shows thought text.
- `engine.video.messages.clearMessages()` clears active sprite messages.
- `engine.video.titles.addTitle(message)` shows a title overlay.
- `engine.video.titles.removeTitle(id)` removes a title overlay.
- `engine.video.primitives.addPrimitive(primitive)` draws debug geometry.
- `engine.video.primitives.removePrimitive(id)` removes debug geometry.
- `engine.setStatus(message)` writes the status line.
- `engine.log(channel, message)` writes a debug log entry.

### Display and Immediate Sync

- `engine.video.display.getProfile()` returns the current display-profile state.
- `engine.video.display.setProfile(profile)` applies the display profile such as CRT overlay settings.
- The console render loop synchronizes scripted UI and choreography changes; SDK
  v1 cartridges do not call the kernel render method.

The cursor attachment is a console capability owned by input and viewport systems. Cartridge code does not call `viewportHost` directly.

## Video SDK Architecture

Render layers define drawing order:

| Layer ID             | Kind       | Z Index | Depth Sort    |
| -------------------- | ---------- | ------- | ------------- |
| `background.back`    | background | 0       | none          |
| `background.main`    | background | 10      | none          |
| `world.behind`       | world      | 20      | y-sort        |
| `world.mid`          | world      | 25      | y-sort        |
| `world.actors`       | world      | 30      | baseline-sort |
| `world.front`        | world      | 40      | y-sort        |
| `foreground`         | foreground | 50      | none          |
| `ui.action-menu`     | ui         | 55      | none          |
| `overlay.primitives` | overlay    | 60      | none          |
| `overlay.messages`   | overlay    | 68      | none          |
| `overlay.titles`     | overlay    | 70      | none          |
| `ui`                 | ui         | 80      | none          |
| `display.profile`    | display    | 90      | none          |

Each video subsystem keeps domain state separate from Pixi rendering. Cartridge code should call `engine.video` SDK modules, not renderer internals.

## Grid Menus

Grid menus are generic slot-panel UI owned by the console. They are useful for cartridge-defined panels such as inventories and dialogue choice lists, but the engine does not own inventory state or conversation state.

`engine.video.gridMenus` opens, closes, toggles, hovers, activates, reorders slots, and carries a generic item payload. The active cartridge receives `RoccoGridMenuActivation` through `handleAction()`. When the cartridge wants to interpret a carried payload on a scene target, it combines the next `scene-click` with `engine.video.gridMenus.getCarriedItem()`.

The cursor is a console capability. Grid item payloads can become cursor attachments, and cartridge code decides what using that payload on a sprite means.

## Graphic Planes

Planes are layered image, tilemap, solid, or procedural backgrounds in the current Pixi runtime. A `RoccoPlaneScene` contains planes, palettes, color register sets, and attribute maps.

Supported plane source kinds:

- `solid`
- `image`
- `tilemap`
- `procedural`

`bitmap` and `tileset` are scene-data shapes in the plane types without runtime rendering support. Treat them as reserved data shapes, not as cartridge-ready runtime features.

Image planes can opt into water animation through `metadata.waterColorEffect`.

Planes can also declare `depthMode`. The current runtime supports `fixed` and the player-aware `sprite-y-threshold` mode, which swaps a plane between two render layers at render time using either the active player sprite or a specific sprite instance plus `origin-y` or `ground-y` sampling.

## Sprite System

Sprite definitions are blueprints. Sprite instances are live entities.

- Definitions contain images, frames, clips, action profiles, walk maps, motion profiles, and hit areas.
- Instances contain position, visibility, motion state, animation state, and facing.
- Walk maps are alpha-mask images where opaque pixels are walkable.
- Action profiles map named actions such as `walk`, `idle`, or `kick` to directional animation clips.

## Effects System

Effects are per-tick operations on engine targets. The built-in `auto-scroll` runtime supports `targetType: 'graphic-plane'` and scrolls a plane with optional wrap-around.

```typescript
engine.effects.add({
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
- Applies boot-time cartridge setup before rendering.
- Supports keyboard and mouse selection.
- Shows console settings modules supplied by the engine and by cartridge setup hooks.
- Shows language radio buttons for manifests with `localizations`.
- Returns `{ selectedId, selectedLocale }`.

Boot-time settings modules are generic menu entries contributed through `RoccoCartridgeBootSetting`. They appear inside `System Settings`, can expose a current value label, and can perform synchronous or asynchronous actions when activated.

`RoccoCartridgeManager` stores the selected locale for `rocco-default` in `localStorage` and passes it to `cartridge.mount({ engine, locale })`.

`RoccoCartridgeManager` also seeds `RoccoCartridgeMenu.show()` with the current locale selections, display profile, sound profile, and merged boot settings. Display and sound changes made inside the boot menu are wired back into runtime-owned setters while the menu is open. Those sound-profile hooks are part of the runtime/menu integration and are not cartridge-facing `RoccoEngine` methods.

`rocco-default` supports English and Spanish. Text catalogs live in `src/cartridges/rocco/localization`.

`rocco-default` uses the generic grid menu system as a reorderable 3x3 inventory panel.

## Built-in Cartridges

### `rocco-default`

The main demo cartridge lives in `src/cartridges/rocco`.

- Three connected Pier exterior levels: Pier Beginning, Pier Middle, and Pier End.
- Separate bait shop front room, back room, and toilet-room branch under `src/cartridges/rocco/levels/bait-shop`.
- Connected Nether screen pair plus a developer-only Reset Office pair under `src/cartridges/rocco/levels/nether`.
- Shared pier scene artwork with right, centered, and left source-image windows.
- Level graph with east/west connectors, entry points, and entry facing.
- Per-level state retained by keeping level instances alive in `RoccoLevelManager`.
- The first Pier Middle mount plays an opening beat through the Rocco sprite controller, and scene clicks can cancel it.
- Rocco cartridge inventory for the 20 EUR bill, collected keys, the magazine, the mysterious key, the lab coat, and souvenir-derived ritual items.
- Bait shop souvenir-table storage projected as a shared 5x4 transfer grid seeded from inventory-owned souvenir assets.
- Inventory fusion by swapping compatible items inside the player grid, with recipe chains for Floating Amulet, Turritella Razor, Abyssal Talisman, and Coral Relic.
- Rocco self action menu with Talk and Inventory options.
- Cartridge-owned inventory item use attempts against Pier objects through `scene-click` plus the carried grid payload.
- Rocco player sprite with click-to-walk and directional actions.
- Pelikan NPC, bait bucket, feeding sequence, keys reveal, key collection, the bait shop door gate in Pier Beginning, the bait shop interior transition, and the bait-shop toilet portal into Nether.
- Stan wake logic, branching dialogue menus, and the reusable cartridge dialogue runtime.
- English and Spanish localization.
- Water wave post-processing clipped to the source water mask.

## Creating a Cartridge

1. Create a folder under `src/cartridges/`.
2. Add a README describing cartridge purpose, files, state, assets, and interactions.
3. Implement `RoccoCartridge` in a `*-cartridge.ts` file.
4. Define a manifest in a `*-manifest.ts` file.
5. Add assets under the cartridge folder.
6. Register the cartridge in `src/cartridges/index.ts`.

Only use the `RoccoEngine` interface and exposed subsystem SDKs inside cartridge code.

## Constraints

- The engine design resolution is `960 x 540`.
- Browser audio requires a user gesture before playback can unlock.
- Walk maps use alpha masks.
- Plane scenes are persisted per `scene.id`.
- The cartridge menu is bypassed when only one cartridge is available.
- Engine feature requests should be clarified if the current interface or SDK surface does not support them.

## Testing

Tests use Vitest. Run focused tests first, then typecheck.

```powershell
powershell -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath (([string](git rev-parse --show-toplevel)).Trim()); & .\scripts\run-npm.ps1 -NpmArgs @('run','test','--','tests/cartridges/rocco/rocco-default-cartridge.test.ts')"
```

```powershell
powershell -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath (([string](git rev-parse --show-toplevel)).Trim()); & .\scripts\run-npm.ps1 -NpmArgs @('run','typecheck')"
```

## Code Conventions

- TypeScript interfaces at the engine and SDK boundaries.
- Interfaces for data shapes.
- `structuredClone` for defensive copies when crossing module boundaries.
- Avoid direct PixiJS usage outside Pixi renderer modules and Pixi-specific UI modules.
- Barrel `index.ts` exports for modules.
- `kebab-case` file names.
- `PascalCase` class names.
- Interfaces use the `Rocco` prefix.
