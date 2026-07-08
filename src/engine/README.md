# Engine

The engine is the core ROCCO console runtime. It owns rendering, audio, input, effects, persistence, and cartridge lifecycle.

## Key Files

- `engine-sdk.ts` - `RoccoEngine`, the cartridge-facing SDK surface and subsystem entry point.
- `runtime.ts` - `GameRuntime`, the subsystem owner and runtime tick coordinator.
- `input-handler.ts` - Pointer routing, menu activation, scene clicks, and input-blocking logic.
- `runtime-default-player-move-policy-coordinator.ts` - Runtime-owned default move policy seam that combines scene-target metadata and cartridge scene-click results before player movement is issued.
- `runtime-input-presentation-coordinator.ts` - Runtime-owned hover-title and carried-cursor presentation bridge used by input handling.
- `cartridge-manager.ts` - Cartridge discovery, menu selection, locale selection, and lifecycle.
- `persistence-adapter.ts` - Engine-facing wrapper around persistence functions.

## Subdirectories

| Directory         | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `audio/`          | Web Audio sound playback and jukebox playlists             |
| `cartridge-menu/` | Boot-time cartridge selection UI                           |
| `cartridges/`     | Cartridge interfaces, loader, and providers                |
| `effects/`        | Per-tick scriptable effects                                |
| `persistence/`    | IndexedDB scene and asset records                          |
| `video/`          | Rendering systems and visual subsystems                    |

## Architecture

- `GameRuntime` creates the Pixi application and engine subsystems.
- `RoccoCartridgeManager` collects boot-time cartridge setup, shows the boot menu, and mounts a cartridge.
- Cartridges receive `RoccoCartridgeContext` with `engine` and optional `locale`.
- Cartridge code uses `RoccoEngine`; the engine keeps PixiJS and subsystem internals behind that SDK surface and the subsystem SDKs it exposes.
- Runtime-owned coordinators can centralize console concerns when rules span multiple runtime inputs, such as default player-move suppression or input-driven hover titles plus cursor attachments.
- The render loop runs effects, video state, cartridge logic, and renderer sync in order.

## Reading Next

- Cartridge lifecycle: `src/engine/cartridges/README.md`.
- Boot menu and locale selection: `src/engine/cartridge-menu/README.md`.
- Rendering concepts: `src/engine/video/README.md`.
- Sound concepts: `src/engine/audio/README.md`.
- Effects: `src/engine/effects/README.md`.
