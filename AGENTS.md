# ROCCO Agent Instructions

This file applies to the entire repository.

## Search Priority

Treat semantic search as a required first step for repository discovery whenever it is available. Use it before any other search method for code discovery, ownership discovery, intent lookup, and related-implementation discovery. This rule is as important as the minimum documentation reading protocol. Use `rg "<concept>" src` and `rg "<id-or-file-name>" src` only for exact string matches, file-name lookups, or when semantic search is unavailable.

## Core Rules

- Communicate with the user in their language, but write all code and documentation in English.
- Do not inspect local images or other visual assets unless the user explicitly asks for it or gives permission. Use the user's coordinates, descriptions, and file context first. If visual confirmation would help, ask the user to do the check or grant permission.
- Read documentation before editing. Do not jump directly into code unless the change is trivial and the relevant README has already been read in the same context window.
- Keep documentation as present-tense reference material. Do not add historical edit logs, dated notes, or narrative descriptions of edits.
- Maintain the relevant README when behavior, concepts, public interfaces, SDK surfaces, folder roles, or cartridge structure shift.
- During active refinement loops, implement the requested code change first, hand it to the user for manual validation, and wait for explicit approval before adding or updating tests and broader feature documentation for that change.
- If the user pivots to a new development request while earlier validated work still has deferred tests or documentation pending, call out that outstanding follow-up before continuing.
- Prefer focused, root-cause fixes. Do not fix unrelated bugs or reformat unrelated files.
- Do not commit, branch, or stage changes unless the user explicitly asks.

## Minimum Reading Protocol

Before touching code, read this minimum set:

1. `AGENTS.md`
2. `README.md`
3. `README-AGENT.md`
4. `DEVELOPMENT.md`
5. The README chain for the files you expect to touch, from broadest to narrowest directory.

Use this command to list project-owned docs without dependency noise:

```powershell
Get-ChildItem -Path . -Filter "README*.md" -Recurse | Where-Object { $_.FullName -notmatch 'node_modules|dist|[\\/]\.[^\\/]+[\\/]' } | Select-Object FullName
```

If the available context window is large, prefer reading all project-owned documentation before editing. The docs are intentionally layered: root docs give the map, engine docs give system concepts, cartridge docs give cartridge rules, and leaf docs give implementation details.

## Efficient Reading Routes

- For cartridge behavior, read `README-AGENT.md`, `src/console/cartridges/README.md`, the cartridge README, and any level README involved.
- For the Rocco Pier map, read `src/cartridges/rocco/README.md`, `src/cartridges/rocco/games/rocco-default/README.md`, and `src/cartridges/rocco/games/rocco-default/maps/pier/README.md`. Read `src/cartridges/rocco/levels/pier/README.md` when you need the compatibility path details.
- For localization, read `src/console/cartridges/README.md`, `src/console/cartridge-menu/README.md`, `src/cartridges/rocco/README.md`, and `src/cartridges/rocco/localization/README.md`.
- For water, planes, or rendering artifacts, read `src/console/video/README.md`, `src/console/video/planes/README.md`, `src/console/video/post-processing/README.md`, and the relevant cartridge/level README.
- For sprites, action menus, motion, walk maps, or interaction sequences, read `src/console/video/sprites/README.md` and the relevant cartridge README.
- For commands, tests, Windows quirks, or local workflow, read `DEVELOPMENT.md`.

After reading docs, inspect the closest existing implementation and its tests before writing new code. If a semantic search tool is available, use it before any other repository search method. This repository is indexed, so semantic search usually finds conceptually related code, ownership boundaries, and intent more reliably than literal grep. Use `rg "<concept>" src` and `rg "<id-or-file-name>" src` for exact string matches, file-name lookups, and fallback when semantic search is unavailable.

## Documentation Shape

- `README.md` is the human overview.
- `README-AGENT.md` is the technical architecture and console SDK reference.
- `DEVELOPMENT.md` is the local workflow and command guide.
- `src/console/**/README.md` files document console systems.
- `src/cartridges/**/README.md` files document cartridge content, rules, and state.

Keep repeated concepts at increasing depth. For example, the root README may say that Rocco has connected Pier levels; the cartridge README should name those levels; the Pier README should define connectors, state, and transition rules.

## Command Usage on Windows

Run npm scripts through the repository wrapper with a PowerShell array and a repo-root lookup:

```powershell
powershell -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath (([string](git rev-parse --show-toplevel)).Trim()); & .\scripts\run-npm.ps1 -NpmArgs @('run','typecheck')"
```

Focused Rocco cartridge test:

```powershell
powershell -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath (([string](git rev-parse --show-toplevel)).Trim()); & .\scripts\run-npm.ps1 -NpmArgs @('run','test','--','tests/cartridges/rocco/rocco-default-cartridge.test.ts')"
```

Avoid direct `.\scripts\run-npm.ps1` calls without `-ExecutionPolicy Bypass`, and avoid passing npm arguments after `-File` as plain positional arguments.

## Rocco Cartridge Notes

- The default cartridge is the Pier map.
- Current Pier implementation code lives in `src/cartridges/rocco/games/rocco-default/maps/pier`. `src/cartridges/rocco/levels/pier` remains the compatibility path.
- `RoccoLevelManager` lives in `src/cartridges/rocco/levels/rocco-level-manager.ts` and owns map transitions, per-level state retention, and inventory-based exit gates across Rocco screens.
- Pier Middle east and west exits are available without an inventory gate.
- `rocco-default` is localized in English and Spanish through `src/cartridges/rocco/localization`.
- `rocco-default` uses `engine.video.gridMenus` as generic console UI for its cartridge inventory.
- The console owns cursor rendering. Cartridges pass generic grid item payloads; cartridge folders decide what item use means.
- The boot menu language radio buttons are only shown for manifests with `localizations`.
- The water animation is clipped to its original alpha mask to avoid sliding over pier posts. Read `src/console/video/post-processing/README.md` before changing water constants or plane composition.

## Validation

- For code changes, run the most focused test first.
- Run `npm run typecheck` through the wrapper before handing off TypeScript changes.
- Run `npm run build` only when broader integration or bundling needs verification.
- Before any `git push`, always run `npm run build:web` through the wrapper, even if focused tests and `npm run typecheck` already passed locally.
- Avoid `npm run format` for narrow tasks because it rewrites the whole repository.
