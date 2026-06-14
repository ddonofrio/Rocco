# Engine

The engine is the core ROCCO console runtime. It owns rendering, audio, input, effects, persistence, and cartridge lifecycle.

## Key Files

- `engine-api.ts` - `RoccoEngine`, the cartridge-facing interface and subsystem entry point.
- `runtime.ts` - `GameRuntime`, the subsystem owner and game-loop coordinator.
- `input-handler.ts` - Pointer, cursor, action-menu, hover, and input-blocking logic.
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
- `RoccoCartridgeManager` selects and mounts a cartridge.
- Cartridges receive `RoccoCartridgeContext` with `engine` and optional `locale`.
- Cartridge code uses `RoccoEngine`; the engine keeps PixiJS and subsystem internals behind that interface and the subsystem SDKs it exposes.
- The render loop runs effects, video state, cartridge logic, and renderer sync in order.

## Reading Next

- Cartridge lifecycle: `src/engine/cartridges/README.md`.
- Boot menu and locale selection: `src/engine/cartridge-menu/README.md`.
- Rendering concepts: `src/engine/video/README.md`.
- Sound concepts: `src/engine/audio/README.md`.
- Effects: `src/engine/effects/README.md`.
