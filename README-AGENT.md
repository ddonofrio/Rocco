# ROCCO Agent Reference

This document is written for AI coding agents. It explains the ROCCO console architecture, the cartridge model, the console SDK surface, the subsystem SDK surfaces, and the documentation workflow expected in this repository.

## Operating Rules

- Communicate with the user in their language. Write code and documentation in English.
- Read `AGENTS.md`, this file, `DEVELOPMENT.md`, and the relevant directory READMEs before editing.
- If the context window is large, read all project-owned README files before touching code.
- Keep documentation as present-tense reference material. Do not write dated notes, historical edit logs, or edit narratives.
- Treat README files as live contracts for current shipped behavior and architecture. When cartridge scope, asset ownership, or engine-cartridge boundaries change, update the root overview and the nearest leaf README in the same change.
- SDK v1 cartridges use the capability-filtered `CartridgeSdkV1` surface received through `context.sdk`. Legacy cartridges use the explicit `RoccoEngine` context received through `context.engine`. Cartridge code must not import PixiJS rendering classes, renderer implementations, or other console-kernel internals.
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

The key boundary is:

- The console kernel owns runtime initialization, rendering, viewport integration, scheduling, input routing, resource teardown, and cartridge lifecycle.
- SDK v1 cartridges receive the stable, capability-filtered `CartridgeSdkV1` contract through `context.sdk`.
- Legacy cartridges receive the broader `RoccoEngine` runtime surface through `context.engine`.
- `CartridgeSdkV1Runtime` is an internal required-facade type used by the official cartridge only after its complete capability set has been negotiated. It is not the console kernel and it is not `RoccoEngine`.

The console provides capabilities such as rendering, audio, input, effects, persistence, and lifecycle management. Cartridges provide content and cartridge logic.

## Directory Map

```text
src/
  main.ts                         Entry point
  style.css                       Global page style
  console/                        Console runtime implementation and SDK surface
    engine-sdk.ts                 Console kernel and legacy runtime infrastructure
    runtime.ts                    GameRuntime implementation
    input-handler.ts              Input routing and blocking
    cartridge-manager.ts          Cartridge selection and lifecycle
    persistence-adapter.ts        Console-facing persistence adapter
    audio/                        Web Audio and jukebox systems
    cartridges/                   Cartridge interfaces, loader, providers
      sdk-v1/                     Public SDK v1 contract, capability validation, and adapter
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
        -> cartridge.mount({ sdk, locale })       // manifest declares runtime: SDK v1
        -> cartridge.mount({ engine, locale })    // manifest omits runtime: legacy
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
  setActionCancellation?(cancelActiveActions: (reason: string) => void): void;
  setup?(
    context: RoccoCartridgeSetupContext,
  ): Promise<RoccoCartridgeSetupResult | void> | RoccoCartridgeSetupResult | void;
  mount(context: RoccoCartridgeContext): Promise<void> | void;
  start?(): Promise<void> | void;
  update?(deltaMs: number): void;
  handleAction?(
    action: RoccoCartridgeAction,
    context?: CartridgeActionContext,
  ): CartridgeActionDisposition | void;
  getActiveLevelId?(): string | null;
  stop?(): Promise<void> | void;
  dispose?(): Promise<void> | void;
}
```

- `setActionCancellation` receives the host-owned function used to cancel active actions before cartridge teardown or restart.
- `handleAction` must make its movement decision synchronously.
- Asynchronous follow-up work is returned through `CartridgeActionDisposition.completion`.
- `getActiveLevelId` lets the host associate action context with the current cartridge level.

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
  runtime?: {
    sdk: string;
    capabilities?: readonly string[];
  };
}
```

- A manifest with `runtime` uses SDK v1.
- A manifest without `runtime` uses the legacy mount path.
- `runtime.sdk` is the required semver range.
- `runtime.capabilities` is optional. When omitted, the adapter uses the complete SDK v1 capability set.

Localized manifest fields are optional and menu-facing:

```typescript
export type RoccoCartridgeLocalizedManifest = Partial<
  Pick<
    RoccoCartridgeManifest,
    'title' | 'description' | 'author' | 'publisher' | 'genre' | 'players' | 'tags'
  >
>;
```

The cartridge context is a discriminated union of the legacy and SDK v1 mount contexts:

```typescript
export interface LegacyCartridgeContext {
  engine: RoccoEngine;
  locale?: string;
}

export interface CartridgeContextV1 {
  sdk: CartridgeSdkV1;
  locale?: string;
}

export type RoccoCartridgeContext =
  | LegacyCartridgeContext
  | CartridgeContextV1;
```

Cartridge code discriminates the union with `'sdk' in context` or `'engine' in context`.

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

### Action Contract

`RoccoCartridgeAction` is the complete union of host-routed actions a cartridge can handle:

- action-menu activation
- `scene-click`
- `grid-menu`
- `advance-sequence`
- `carry-use`

`handleAction` receives an optional `CartridgeActionContext` and returns a synchronous `CartridgeActionDisposition`:

```typescript
export interface CartridgeActionContext {
  readonly signal: AbortSignal;
  readonly actionId: string;
  readonly correlationId: string;
  readonly cartridgeId: string;
  readonly levelId: string | undefined;
}

export interface CartridgeActionDisposition {
  consumed: boolean;
  defaultPlayerMovement: 'allow' | 'suppress';
  completion?: Promise<void>;
}
```

- `consumed` reports whether the cartridge handled the action.
- `defaultPlayerMovement` is inspected synchronously in the current action frame.
- `completion` contains optional asynchronous work monitored by the dispatcher.
- `context.signal` is aborted when the action is cancelled during teardown, restart, replacement, or other host cancellation.
- `RoccoCartridgeActionResult` remains only as a deprecated internal normalization helper and must not be presented as the public cartridge contract.

## Cartridge SDK v1

The cartridge-facing surface separates these distinct concepts:

```text
Console kernel
  Private host infrastructure. Owns update, render, viewport, scheduling,
  input routing, lifecycle, and resource teardown.

CartridgeSdkV1
  Public capability-filtered cartridge contract. Most members are optional
  because the adapter exposes only negotiated capabilities.

CartridgeSdkV1Runtime
  Internal required view used by the official cartridge after negotiating
  every capability it requires. It remains a facade and is not RoccoEngine.

CartridgeCapability
  Stable capability identifiers declared by a cartridge manifest.
```

Only `sdkVersion` and `capabilities` are unconditionally required by the public `CartridgeSdkV1` type. All other members are optional in the public interface. Most optional members are capability-gated, but the adapter also installs the console-flag compatibility helpers `isDeveloperModeEnabled`, `getConsoleFlags`, and `setConsoleFlags` without a dedicated capability. `video.camera` is installed whenever any negotiated video capability causes the video facade to exist.

The full `RoccoEngine` kernel lives in `src/console/engine-sdk.ts`. Inside
`mount(context)`, SDK v1 cartridges use the narrow, version-stamped `context.sdk` of type
`CartridgeSdkV1` (defined in `src/console/cartridges/sdk-v1`). It is built by
`createCartridgeSdkV1({ engine, scope, manifest })`, which wraps `RoccoEngine`
and exposes only the stable subset. Internal-only methods (`video.update`,
`video.render`, `video.viewport`, the kernel `video.zoom` module, render-layer ordering,
`effects.tick`, `jukebox.unlock`) are absent from the SDK object, so a cartridge
cannot reach them even at runtime.

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

Use a composition session when mounting a scene to prevent visual pop-in:

```typescript
const composition = sdk.beginCompositionSession?.('cartridge-mount', {
  message: 'LOADING',
});

try {
  // Preload and mount cartridge resources.
} catch (error) {
  composition?.fail(error);
  throw error;
} finally {
  composition?.dispose();
}
```

A composition session owns its own progress, failure state, and disposal. A cartridge must dispose the session it opens.

### Input Blocking

Use an input lease for non-cancelable sequences:

```typescript
const inputLease = sdk.acquireInputLease?.(
  'scripted-sequence',
  'blocked',
);

try {
  // Run the sequence.
} finally {
  inputLease?.dispose();
}
```

Input policy is lease-owned. A cartridge releases only the lease it acquired and does not globally re-enable input.

### Scene Management and Persistence

- `loadPlaneScene(scene)` replaces the active graphic scene and keeps runtime scene bookkeeping in sync.
- `serializePlaneScene(sceneId)` snapshots the current scene state.
- `CartridgeSdkV1.storage.savePlaneScene(scene)` persists a scene for SDK v1.
- `CartridgeSdkV1.storage.loadPlaneSceneRecord(sceneId)` loads a persisted scene for SDK v1.
- Legacy cartridges use the explicit `LegacyCartridgeContext.engine.persistence` equivalents.

## Audio, Jukebox, and Effects SDKs

SDK v1 cartridges reach these capabilities through subsystem handles on
`CartridgeSdkV1`; legacy cartridges use the explicit `RoccoEngine` context.

- `sdk.audio?.registerSound(definition)` registers a sound asset.
- `sdk.audio?.unregisterSound(id)` removes a sound definition and stops its active instances.
- `sdk.audio?.preloadSound(id)` loads a sound buffer.
- `sdk.audio?.playSound(id, options?)` plays a sound.
- `sdk.audio?.setSoundVolume(id, volume)` updates the gain of currently playing instances.
- `sdk.audio?.stopSound(id)` stops active instances of a sound.
- `sdk.audio?.stopAllSounds()` stops every active one-shot sound.
- `sdk.jukebox?.registerPlaylist(playlist)` registers background music.
- `sdk.jukebox?.unregisterPlaylist(id)` removes a playlist definition.
- `sdk.jukebox?.playPlaylist(id)` starts a playlist.
- `sdk.jukebox?.stopPlaylist()` stops the active playlist.
- `sdk.jukebox?.isPlaying()` reports whether a playlist is currently active.
- `sdk.jukebox?.setVolume(volume)` sets the master jukebox volume multiplier.
- `sdk.jukebox?.getCurrentTrack()` returns the active track id when one is playing.
- `sdk.effects?.add(effect)` registers and starts a per-tick effect.
- `sdk.effects?.remove(effectId)` removes an effect.
- `sdk.effects?.update(effectId, patch)` edits an active effect.
- `sdk.effects?.enable(effectId)` and `sdk.effects?.disable(effectId)` toggle an effect.

The built-in `auto-scroll` effect targets graphic planes.

## Video SDK

The cartridge-facing video SDK lives under `CartridgeSdkV1.video`.
`RoccoRuntimeVideoSystem` exposes subsystem modules plus asset-preload helpers
used by cartridges.

### Video Preloading

- `sdk.video?.preloadAssetUrls(assetUrls)` preloads raw image or UI asset URLs through the console video layer.
- `sdk.video?.preloadPlaneScene?.(scene)` preloads plane assets before the active scene is switched through `sdk.loadPlaneScene?.(scene)`.
- `sdk.video?.preloadSpriteDefinition?.(definition)` preloads a single sprite definition and its assets.
- `sdk.video?.preloadSpriteDefinitions?.(definitions)` preloads multiple sprite definitions.

### Graphic Planes

- Use `sdk.video?.planes?.loadScene(scene)` to replace the active scene through the planes module.
- Use `sdk.video?.planes?.serializeScene(sceneId)` to snapshot a scene.
- Use `sdk.video?.planes?.updatePlane(sceneId, planeId, patch)` for plane-level mutations.
- Use `sdk.video?.planes?.resolvePlane(sceneId, planeId)` to inspect a live plane definition.

### Sprites

- `sdk.video?.sprites?.registerSpriteDefinition(definition)` registers a sprite blueprint.
- `sdk.video?.sprites?.createSpriteFromDefinition(definitionId, options?)` creates an instance.
- `sdk.video?.sprites?.setPosition(id, x, y)` teleports an instance.
- `sdk.video?.sprites?.moveTo(id, x, y, options?)` moves directly.
- `sdk.video?.sprites?.goTo(id, x, y, options?)` moves through the bound walk map.
- `sdk.video?.sprites?.playAction(id, actionId, options?)` plays a directional action profile.
- `sdk.video?.sprites?.playAnimation(id, animationId, options?)` plays an animation clip.
- `sdk.video?.sprites?.registerWalkMap(walkMap)` registers a walk map.
- `sdk.video?.sprites?.bindToWalkMap(id, binding)` binds a walk map to an instance.
- `sdk.setPlayerSprite?.(id)` selects the click-to-walk player sprite through the SDK surface and feeds player-aware plane depth modes.

### UI and Feedback

- `sdk.video?.actionMenus?.registerMenu(definition)` registers a radial action menu.
- `sdk.video?.actionMenus?.closeMenu()` closes the active radial action menu.
- `sdk.video?.gridMenus?.openMenu(definition)` opens a generic slot grid panel or text choice list.
- `sdk.video?.gridMenus?.toggleMenu(definition)` toggles a generic slot grid panel.
- `sdk.video?.gridMenus?.closeMenu()` closes the active generic slot grid panel.
- `sdk.video?.gridMenus?.getCarriedItem()` returns the source menu id and generic grid item currently attached to the cursor.
- `sdk.video?.gridMenus?.clearCarriedItem()` clears the carried grid item payload.
- `sdk.video?.messages?.showMessage(message)` shows a fully specified sprite-anchored message.
- `sdk.video?.messages?.say(id, text, options?)` shows speech.
- `sdk.video?.messages?.think(id, text, options?)` shows thought text.
- `sdk.video?.messages?.clearMessages()` clears active sprite messages.
- `sdk.video?.titles?.addTitle(message)` shows a title overlay.
- `sdk.video?.titles?.removeTitle(id)` removes a title overlay.
- `sdk.video?.primitives?.addPrimitive(primitive)` draws debug geometry.
- `sdk.video?.primitives?.removePrimitive(id)` removes debug geometry.
- `sdk.setStatus?.(message)` writes the status line.
- `sdk.log?.(channel, message)` writes a debug log entry.

### Display and Immediate Sync

- `sdk.video?.display?.getProfile()` returns the current display-profile state.
- `sdk.video?.display?.setProfile(profile)` applies the display profile such as CRT overlay settings.
- The console render loop synchronizes scripted UI and choreography changes; SDK
  v1 cartridges do not call the kernel render method.

The cursor attachment is a console capability owned by input and viewport systems. Cartridge code does not call `viewportHost` directly.

### Camera

The cartridge-facing camera facade lives under `sdk.video.camera`:

```typescript
sdk.video?.camera?.setTransform(transform);
sdk.video?.camera?.animateTo(transform, durationMs, options);
sdk.video?.camera?.clear();
```

`sdk.video.camera` is the complete cartridge-facing camera facade.

A cartridge cannot access:

- the kernel zoom controller;
- zoom state inspection;
- `update`;
- stage application;
- render timing;
- viewport scaling;
- direct rendering.

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

Each video subsystem keeps domain state separate from Pixi rendering. Cartridge code should call `sdk.video` SDK modules, not renderer internals.

## Grid Menus

Grid menus are generic slot-panel UI owned by the console. They are useful for cartridge-defined panels such as inventories and dialogue choice lists, but the engine does not own inventory state or conversation state.

`sdk.video?.gridMenus` opens, closes, toggles, hovers, activates, reorders slots, and carries a generic item payload. The active cartridge receives `RoccoGridMenuActivation` through `handleAction()`. When the cartridge wants to interpret a carried payload on a scene target, it combines the next `scene-click` with `sdk.video?.gridMenus?.getCarriedItem()`.

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
sdk.effects?.add({
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

`RoccoCartridgeManager` stores the selected locale for `rocco-default` in `localStorage` and passes it through the mount context, using `cartridge.mount({ sdk, locale })` for SDK v1 manifests and `cartridge.mount({ engine, locale })` for legacy manifests.

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

SDK v1 cartridges use the `CartridgeSdkV1` surface received through `context.sdk`; legacy cartridges use the explicit `RoccoEngine` context received through `context.engine`.

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
