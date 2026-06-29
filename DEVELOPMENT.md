# Development Guide

This document covers local setup, command usage, validation, and recurring workflow details for the ROCCO project.

## Prerequisites

- Node.js compatible with the version range in `package.json`.
- npm.
- PowerShell on Windows.

The repository scripts prefer the portable Node installation managed by `scripts/setup.ps1` when it is available.

## Setup

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

This installs dependencies through the local script workflow.

## Development Server

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1
```

The Vite development server serves the app on the default Vite port unless the port is already in use.

## Npm Wrapper

For agent work, prefer `scripts/run-npm.ps1` with a real PowerShell array. This avoids execution-policy and argument-parsing issues.

```powershell
powershell -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath 'C:\Users\diego\Documents\New project\Rocco'; & .\scripts\run-npm.ps1 -NpmArgs @('run','typecheck')"
```

Focused test example:

```powershell
powershell -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath 'C:\Users\diego\Documents\New project\Rocco'; & .\scripts\run-npm.ps1 -NpmArgs @('run','test','--','src/cartridges/rocco/rocco-default-cartridge.test.ts')"
```

Build example:

```powershell
powershell -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath 'C:\Users\diego\Documents\New project\Rocco'; & .\scripts\run-npm.ps1 -NpmArgs @('run','build')"
```

Avoid these command forms:

- `powershell -ExecutionPolicy Bypass -File .\scripts\run-npm.ps1 run typecheck`
- Direct `.\scripts\run-npm.ps1` execution without `-ExecutionPolicy Bypass`
- Comma-separated arguments around `--`

## Available Commands

- `npm run dev` starts Vite.
- `npm run build` runs TypeScript checking and Vite build.
- `npm run preview` serves the built output.
- `npm run typecheck` runs `tsc --noEmit`.
- `npm run lint` runs ESLint.
- `npm run format` runs Prettier across the repository.
- `npm run test` runs Vitest once.
- `npm run test:watch` runs Vitest in watch mode.

Use the wrapper examples above for Windows agent sessions.

## Validation Workflow

Start with the narrowest useful validation:

1. Run the focused test for the touched module when one exists.
2. Run `npm run typecheck` through the wrapper for TypeScript changes.
3. Run `npm run build` when bundling, assets, imports, or integration behavior need coverage.
4. Run `npm run lint` when style or static analysis risk is relevant.

Do not run `npm run format` for a narrow task unless the user asks for whole-repository formatting.

## Refinement Workflow

- During an active refinement session, make the requested gameplay or UI change first and ask the user to validate it manually before adding tests or broader feature-documentation updates for that specific change.
- After the user explicitly confirms the behavior is correct, add the deferred automated coverage and documentation updates that belong to the validated change.
- If a new development request arrives while earlier validated work still has deferred tests or docs pending, flag that outstanding follow-up before starting the new scope.

## Text Encoding

- Keep source files and localization catalogs in UTF-8.
- If a terminal, patch path, or editor risks mangling non-ASCII text, prefer ASCII-only text or TypeScript Unicode escapes such as `\u00f1` instead of pasting raw accented characters.
- Before handing off localization edits, search the touched files for mojibake fragments such as `Ã`, `â‚¬`, or replacement glyphs and fix them immediately.

## Test Environment Notes

- Vitest runs with the configuration in `vitest.config.ts`.
- Tests that instantiate Pixi asset loading should mock `pixi.js` `Assets.load`.
- jsdom can print canvas-related limitations after the test summary. Treat the Vitest summary and process exit code as authoritative.
- Test mocks mirror the engine SDK surface and exposed subsystem contracts. When a required member changes, nearby mocks usually need the same member.

## Git Status Notes

- Check `git diff --name-status` and `git diff --stat` before assuming a file has textual changes.
- Windows checkout or formatting can produce stat-only entries. Inspect diffs before restoring anything.
- Use `git restore --worktree -- <paths>` only for files with no intended content changes.
- Do not commit, stage, or create branches unless the user explicitly asks.

## Project Structure

- `src/engine/` contains the console runtime and generic systems.
- `src/cartridges/` contains built-in cartridge implementations.
- `scripts/` contains local development scripts.
- `public/` contains static browser assets.
- `dist/` contains generated production output.
- `.local/` contains local generated tools and temporary files.

## Rocco Pier Notes

- The active Rocco cartridge is `rocco-default`.
- Pier exterior code lives in `src/cartridges/rocco/levels/pier`.
- The Pier map has three levels: `pier-start`, `pier-middle`, and `pier-end`.
- `RoccoLevelManager` owns level registration, transitions, entry placement, status text, and per-level state retention across Rocco screens.
- Pier Middle east and west exits require keys in the Rocco cartridge inventory. The gate is silent.
- `rocco-default` supports English and Spanish localization through `src/cartridges/rocco/localization`.
- Rocco inventory is cartridge state. The engine provides generic reorderable slot-panel UI and generic cursor item payloads through `engine.video.gridMenus` and the cursor subsystem.

## Water Rendering Notes

The Pier water effect selects water-colored pixels, animates those pixels with a horizontal wave, and clips each animated frame back to the original water alpha mask.

Relevant files:

- `src/engine/video/post-processing/rocco-water-color-effect.ts`
- `src/engine/video/planes/pixi-renderer.ts`
- `src/cartridges/rocco/levels/pier/pier-video-effects.ts`
- `src/cartridges/rocco/rocco-default-constants.ts`

If water appears over wooden posts or pier edges, inspect the color mask, tolerance, strength, foreground transparency, clipping behavior, and plane layering together.

## Documentation Workflow

- Read `AGENTS.md` before editing.
- Read `README-AGENT.md` for architecture, the engine SDK surface, and subsystem SDKs.
- Read the README chain for the target folder.
- Keep documentation in present tense and focused on current behavior.
- Do not add dated notes, historical edit logs, or narrative descriptions of edits.
