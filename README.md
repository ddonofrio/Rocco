# ROCCO

ROCCO is a browser-based retro console runtime with built-in cartridges. The project is organized for cartridge development through code and AI-assisted editing rather than a visual level editor.

The console is called ROCCO, the main demo cartridge is called ROCCO, and the player character is also Rocco.

## For AI Agents

Start with these files before editing:

- `AGENTS.md` for repository rules and reading routes.
- `README-AGENT.md` for architecture, the console SDK surface, subsystem SDKs, and cartridge conventions.
- `DEVELOPMENT.md` for local commands and Windows workflow notes.
- The README files inside the console or cartridge folders related to the requested change.

## For Humans

ROCCO is a cartridge-oriented console runtime. Its console layer provides rendering, audio, input, effects, persistence, and cartridge loading. Cartridges provide the cartridge content and interact with the runtime through a stable TypeScript SDK surface plus subsystem SDKs.

ROCCO works well with AI-powered coding tools because the codebase is organized around documented concepts: console systems, cartridge infrastructure, built-in cartridges, levels, sprites, effects, and localized text catalogs.

## Tech Stack

- TypeScript for typed development with explicit SDK interfaces.
- PixiJS for accelerated 2D rendering.
- Dexie and IndexedDB for local persistence.
- Vite for the development server and production build.
- Electron and electron-builder for portable desktop packaging.
- Vitest for tests.
- PWA tooling for installable web builds.

## Features

- Graphic planes for layered backgrounds, parallax, procedural generation, and image effects.
- Sprite definitions and instances with animation, actions, movement, depth sorting, and walk maps.
- SCUMM-style radial action menus.
- Generic slot grid menus and text choice lists for cartridge-defined panels, reorderable slots, and carried item payloads.
- Character speech bubbles, thought bubbles, hover titles, and status text.
- Web Audio sound playback and jukebox playlists.
- Scriptable effects such as auto-scroll.
- Cartridge selection menu with localized metadata support and extensible boot-time settings modules.
- CRT-style display profile and fullscreen viewport scaling.

## Project Structure

```text
src/
  main.ts                  Entry point
  console/                 Console runtime implementation and SDK surface
    audio/                 Sound and jukebox systems
    cartridges/            Cartridge interfaces, loader, and providers
    cartridge-menu/        Boot-time cartridge selection UI
    effects/               Per-tick effect system
    persistence/           IndexedDB persistence adapter
    video/                 Rendering systems and visual subsystems
  cartridges/              Built-in cartridge implementations
    rocco/                 Cartridge bootstrap, RPCE runtime, and the rocco-default game
      rpce/                Cartridge-local point-and-click runtime
      games/rocco-default/ Current game content organized by maps
public/                    Static browser assets
scripts/                   Windows-friendly development scripts
```

## Local Development

This project includes scripts that use a portable local Node.js installation when available.

First setup and dev server:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1
```

Common scripts:

- `.\scripts\setup.ps1` installs dependencies.
- `.\scripts\dev.ps1` starts the Vite dev server.
- `.\scripts\build.ps1` runs the production build.
- `.\scripts\test.ps1` runs the Vitest suite.
- `.\scripts\lint.ps1` runs ESLint.
- `npm run build:web` builds the browser bundle.
- `npm run build:mac` builds the unsigned macOS DMG.
- `npm run build:windows` builds the portable Windows executable.
- `npm run build:linux` builds the Linux AppImage.

If a compatible global Node installation is already available, standard npm commands also work:

```powershell
npm install
npm run dev
```

## Build Artifacts

The GitHub Actions workflow publishes these downloadable artifacts:

- `web-app-latest` for the web `dist/` bundle.
- `macos-latest-dmg` for the unsigned macOS DMG build.
- `windows-latest-portable` for the portable Windows executable.
- `ubuntu-latest-appimage` for the Linux AppImage build.

## Built-in Cartridges

### ROCCO Default Cartridge

`rocco-default` is the main demo cartridge.

- Three connected Pier exterior levels with shared panorama artwork and edge connectors.
- Separate bait shop interior screens, a toilet-room branch, and a Nether path that also includes the Reset Office branch.
- Reset Office currently remains developer-only in gameplay flow, but it is modeled as part of Nether ownership.
- Per-level state retention across Pier, bait shop, Nether, and developer screens.
- Opening beat where Rocco arrives at the pier, asks the player for help, and can be skipped with a scene click.
- Click-to-walk pathfinding through walk maps.
- Pelikan NPC, Stan branching dialogue, bait bucket interaction, bait shop door gating, keys reveal, key collection, and Nether interaction sequences.
- Rocco action menu with self-talk, inventory access, and shared transfer storage for the bait shop souvenir table.
- Cartridge inventory shown through a generic reorderable 3x3 grid menu with carried-item cursor use.
- Inventory fusion chains that craft Floating Amulet, Turritella Razor, Abyssal Talisman, and Coral Relic from compatible souvenir items, with the rules living under `src/cartridges/rocco/inventory`.
- English and Spanish localization for menu metadata, level titles, actions, descriptions, and dialogue.
- Water wave post-processing clipped to the original water mask.

## Architecture Overview

ROCCO uses a console/cartridge architecture:

1. The console is the generic host runtime.
2. Cartridges are self-contained software cartridges.
3. The Rocco cartridge now layers `RPCE` between the cartridge bootstrap and the `rocco-default` game, so the structure reads `console -> cartridge -> RPCE -> game -> maps -> levels`.
4. Cartridges mount through `RoccoCartridge` and receive a `RoccoEngine` context with subsystem SDKs such as `engine.video`, `engine.audio`, and `engine.persistence`.
5. Cartridges can contribute boot-time setup and settings modules before a cartridge is mounted.
6. The console runtime stays generic; cartridge logic stays inside cartridge folders.

For implementation details, read `README-AGENT.md`.
