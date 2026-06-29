# ROCCO

ROCCO is a browser-based retro game console emulator with built-in cartridges. The project is designed for cartridge development through code and AI-assisted editing rather than a visual level editor.

The console is called ROCCO, the main demo cartridge is called ROCCO, and the player character is also Rocco.

## For AI Agents

Start with these files before editing:

- `AGENTS.md` for repository rules and reading routes.
- `README-AGENT.md` for architecture, the engine SDK surface, subsystem SDKs, and cartridge conventions.
- `DEVELOPMENT.md` for local commands and Windows workflow notes.
- The README files inside the engine or cartridge folders related to the requested change.

## For Humans

ROCCO is both a small game console runtime and a development platform. The engine provides rendering, audio, input, effects, persistence, and cartridge loading. Cartridges provide the actual game content and interact with the engine through a stable TypeScript SDK surface plus subsystem SDKs.

ROCCO works well with AI-powered coding tools because the codebase is organized around documented concepts: engine systems, cartridge infrastructure, built-in cartridges, levels, sprites, effects, and localized text catalogs.

## Tech Stack

- TypeScript for typed development with explicit SDK interfaces.
- PixiJS for accelerated 2D rendering.
- Dexie and IndexedDB for local persistence.
- Vite for the development server and production build.
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
- Cartridge selection menu with localized metadata support.
- CRT-style display profile and fullscreen viewport scaling.

## Project Structure

```text
src/
  main.ts                  Entry point
  engine/                  Core console engine
    audio/                 Sound and jukebox systems
    cartridges/            Cartridge interfaces, loader, and providers
    cartridge-menu/        Boot-time cartridge selection UI
    effects/               Per-tick effect system
    persistence/           IndexedDB persistence adapter
    video/                 Rendering systems and visual subsystems
  cartridges/              Built-in cartridge implementations
    rocco/                 Main Pier map demo cartridge
    terminal/              Archived reference demo cartridge
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

If a compatible global Node installation is already available, standard npm commands also work:

```powershell
npm install
npm run dev
```

## Built-in Cartridges

### ROCCO Pier Map

`rocco-default` is the main demo cartridge.

- Three connected Pier levels: Pier Beginning, Pier Middle, and Pier End.
- Shared scene artwork with right, centered, and left horizontal windows.
- Edge connectors that teleport Rocco between levels and set the entry facing.
- Per-level state retention for Pier interactions.
- Opening beat where Rocco arrives at the pier, asks the player for help, and can be skipped with a scene click.
- Click-to-walk pathfinding through walk maps.
- Pelikan NPC, Stan branching dialogue, bait bucket interaction, bait shop door gating, bait shop interior transition, keys reveal, and key collection.
- Rocco action menu with self-talk and inventory access.
- Cartridge inventory shown through a generic reorderable 3x3 grid menu.
- Inventory item cursor use for keys and the 20 EUR bill against Pier objects.
- English and Spanish localization for menu metadata, level titles, actions, descriptions, and dialogue.
- Water wave post-processing clipped to the original water mask.

### Terminal

`terminal-work-in-progress` is an archived reference cartridge.

- Star-field procedural plane generation.
- Auto-scroll effect demonstration.
- Minimal sprite setup.

## Architecture Overview

ROCCO uses a console/cartridge architecture:

1. The engine is the console runtime.
2. Cartridges are self-contained games.
3. Cartridges mount through `RoccoCartridge` and receive a `RoccoEngine` context with subsystem SDKs such as `engine.video`, `engine.audio`, and `engine.persistence`.
4. The engine stays generic; cartridge logic stays inside cartridge folders.

For implementation details, read `README-AGENT.md`.
