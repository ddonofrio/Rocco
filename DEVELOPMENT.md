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

The Vite development server binds to `0.0.0.0:5174`. If port `5174` is already in use, Vite falls back to the next available port.

## Npm Wrapper

For agent work, prefer `scripts/run-npm.ps1` with a real PowerShell array and a repo-root lookup. This avoids execution-policy and argument-parsing issues.

```powershell
powershell -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath (([string](git rev-parse --show-toplevel)).Trim()); & .\scripts\run-npm.ps1 -NpmArgs @('run','typecheck')"
```

Focused test example:

```powershell
powershell -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath (([string](git rev-parse --show-toplevel)).Trim()); & .\scripts\run-npm.ps1 -NpmArgs @('run','test','--','tests/cartridges/rocco/rocco-default-cartridge.test.ts')"
```

Build example:

```powershell
powershell -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath (([string](git rev-parse --show-toplevel)).Trim()); & .\scripts\run-npm.ps1 -NpmArgs @('run','build')"
```

Windows portable example:

```powershell
powershell -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath (([string](git rev-parse --show-toplevel)).Trim()); & .\scripts\run-npm.ps1 -NpmArgs @('run','build:windows')"
```

macOS DMG example:

```powershell
powershell -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath (([string](git rev-parse --show-toplevel)).Trim()); & .\scripts\run-npm.ps1 -NpmArgs @('run','build:mac')"
```

Avoid these command forms:

- `powershell -ExecutionPolicy Bypass -File .\scripts\run-npm.ps1 run typecheck`
- Direct `.\scripts\run-npm.ps1` execution without `-ExecutionPolicy Bypass`
- Comma-separated arguments around `--`

## Available Commands

- `npm run dev` starts Vite.
- `npm run verify:static` runs tracked-content hygiene, asset-reference checks, ESLint, and TypeScript checking.
- `npm run test:coverage` runs the full Vitest suite with coverage.
- `npm run verify` runs the full quality gate: static checks plus coverage.
- `npm run check` is an alias for `npm run verify`.
- `npm run build` runs the default web build alias.
- `npm run build:web` runs the full quality gate once and then the browser Vite build once.
- `npm run build:mac` runs TypeScript checking, the desktop Vite build, and `electron-builder` for the unsigned macOS DMG.
- `npm run build:windows` runs TypeScript checking, the desktop Vite build, and `electron-builder` for the portable Windows executable.
- `npm run build:linux` runs TypeScript checking, the desktop Vite build, and `electron-builder` for the Linux AppImage.
- `npm run preview` serves the built output.
- `npm run typecheck` runs `tsc --noEmit`.
- `npm run lint` runs ESLint.
- `npm run format` runs Prettier across the repository.
- `npm run test` runs Vitest once.
- `npm run test:watch` runs Vitest in watch mode.

Use the wrapper examples above for Windows agent sessions.

## CI Artifacts

The GitHub Actions `Build` workflow uploads these artifacts:

- `web-app-latest` containing the web `dist/` output.
- `macos-latest-dmg` containing the unsigned macOS DMG.
- `windows-latest-portable` containing the portable Windows executable.
- `ubuntu-latest-appimage` containing the Linux AppImage.

The unsigned macOS DMG is built in the workflow on `macos-26`.
The Linux AppImage is built in the workflow on `ubuntu-latest`.

## Validation Workflow

Start with the narrowest useful validation:

1. Run the focused test for the touched module when one exists.
2. Run `npm run typecheck` through the wrapper for TypeScript changes.
3. Run `npm run verify` when the change touches shared runtime behavior, tests, or repo-wide contracts.
4. Run `npm run build:web` when bundling, assets, imports, or integration behavior need production-build coverage.

Before any `git push`, always run the full web pre-push gate through the wrapper:

```powershell
powershell -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath (([string](git rev-parse --show-toplevel)).Trim()); & .\scripts\run-npm.ps1 -NpmArgs @('run','build:web')"
```

Treat `npm run build:web` as mandatory before a push even if focused tests and `npm run typecheck` already passed. It is the closest local match to the default CI gate because it runs the quality gate and the browser production build together.

When you need the smallest repo-wide CI-equivalent validation flow, run `npm run verify` through the wrapper. `npm run check` is a short alias for the same command.

Do not run `npm run format` for a narrow task unless the user asks for whole-repository formatting. `npm run format` runs Prettier across the entire repository and must not be used to format a single changed file or directory.

## Text Encoding

- Keep source files and localization catalogs in UTF-8.
- `npm run check:tracked-content` scans tracked files that Git classifies as text, not every path in the worktree.
- The check rejects byte streams that are not valid UTF-8 before it runs any content heuristics.
- After UTF-8 validation, the check tries a narrow mojibake repair pass for common Latin-1 and Windows-1252 misdecodes and reports lines whose repaired text scores as clearly less suspicious than the original.
- The check also rejects literal Unicode replacement characters (`U+FFFD`) because they mean the text is already lossy.
- Mojibake detection is heuristic by design. Treat reports as "this line deserves inspection", not as proof that every non-ASCII character is wrong.
- When a legitimate line needs an exception, ask the user before adding an entry to the allowlist in `scripts/check-tracked-content.mjs`, and scope it to one file, one rule, and one stable line pattern.
- If a terminal, patch path, or editor risks mangling non-ASCII text, prefer ASCII-only text or TypeScript Unicode escapes such as `\u00f1` instead of pasting raw accented characters.
- Before handing off localization edits, scan the touched files for likely mojibake, such as stray `U+00C3`/`U+00C2` lead characters, Windows-1252 punctuation fragments, or literal replacement glyphs, and fix them immediately.

## Test Environment Notes

- Vitest runs with the configuration in `vitest.config.ts`.
- Tests that instantiate Pixi asset loading should mock `pixi.js` `Assets.load`.
- jsdom can print canvas-related limitations after the test summary. Treat the Vitest summary and process exit code as authoritative.
- Test mocks mirror the SDK surface and exposed subsystem contracts. When a required member changes, nearby mocks usually need the same member.

## Git Status Notes

- Check `git diff --name-status` and `git diff --stat` before assuming a file has textual changes.
- Windows checkout or formatting can produce stat-only entries. Inspect diffs before restoring anything.
- Use `git restore --worktree -- <paths>` only for files with no intended content changes.
- Do not commit, stage, or create branches unless the user explicitly asks.

## Project Structure

- `src/console/` contains the console runtime and generic systems.
- `src/cartridges/` contains built-in cartridge implementations.
- `scripts/` contains local development scripts.
- `public/` contains static browser assets.
- `dist/` contains generated production output.
- Workspace-only generated tools and temporary files stay untracked.

## Scoped Lint and Format

Lint and format act on task files. `npm run lint` and `npm run format` are repository-wide when run without arguments; variants that accept specific paths or files must stay scoped to the files included in the task. Repository-wide autofix and formatting commands are non-mutating gates, not autofix instructions. Do not add allowlists, suppressions, ignored paths, or validation exceptions as part of a narrow task.
