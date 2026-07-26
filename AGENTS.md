# ROCCO Agent Instructions

This file is the only repository-wide operating contract for coding agents.

## Delivery Workflow

Assume the repository starts clean, up to date, and with all validations passing. Treat new failures and unrelated modifications as consequences of the current work until demonstrated otherwise.

For every implementation task:

1. Implement the complete requested behavior.
2. Update the directly affected documentation in the same work.
3. Run typecheck and the applicable non-mutating lint validation against the changed source scope. Fix every introduced failure.
4. Provide precise manual verification instructions derived from the affected behavior. State the location, action, expected result, and any important adjacent behavior to check. A gameplay change must be verified in the actual affected screen or interaction.
5. Wait for explicit user approval.
6. Only after approval, implement or update the automated tests.
7. During normal iteration, run only tests relevant to the approved behavior.

Visual verification of gameplay screens is performed by the user. Agents must not inspect,
render, or otherwise use image tools to judge the appearance or behavior of a screen; they
must provide precise manual verification instructions instead.

Read the required documentation chain and the nearest existing implementation and tests before introducing a new pattern. Gameplay and creative requirements may change during manual verification; tests must codify the approved behavior, not an intermediate interpretation.

Do not run tests before functional approval. Do not run `npm run build` during normal iteration; it is an alias of `build:web` and executes the full quality gate.

When the user explicitly requests commit or push:

1. Complete any tests deferred until functional approval.
2. Run the complete test suite.
3. Run `build:web`.
4. Fix every failure.
5. Review the changed and staged file scope.
6. Commit and push only the files owned by the task.

Do not stage, commit, create branches, or push unless explicitly requested.

## Context Loading

Before modifying a file, read:

1. `AGENTS.md`.
2. Every `README.md` encountered from the repository root down to the target file's directory, in path order.
3. `DEVELOPMENT.md` only when commands, validation, setup, or environment behavior are relevant.
4. The authoritative configuration files directly relevant to the change.

Each README inherits all parent instructions and adds only information specific to its own directory. It must not repeat parent content.

For example, before modifying `src/cartridges/rocco/games/rocco-default/maps/shop/bait-shop-assets.ts`, read in order:

1. `AGENTS.md`
2. `src/README.md`
3. `src/cartridges/README.md`
4. `src/cartridges/rocco/README.md`
5. `src/cartridges/rocco/games/README.md`
6. `src/cartridges/rocco/games/rocco-default/README.md`
7. `src/cartridges/rocco/games/rocco-default/maps/README.md`
8. `src/cartridges/rocco/games/rocco-default/maps/shop/README.md`

Define the information and scope to inspect; use the capabilities available in your environment.

## Scope and Modifying Tools

- Modify only files required by the task and its directly affected documentation or tests.
- Do not fix unrelated defects, perform opportunistic refactors, or reformat unrelated files.
- Any tool capable of modifying files must be explicitly scoped to the files included in the task. Repository-wide autofix, formatting, codemods, migrations, generators, or repair commands are prohibited unless the work order explicitly authorizes repository-wide changes.
- This applies to every command or tool with behavior equivalent to `--write`, `--fix`, `--apply`, automatic migration, generated replacement, or bulk rewrite.
- Do not introduce or expand allowlists, exclusions, ignored paths, disabled rules, inline suppressions, validation bypasses, or equivalent exceptions unless the work order explicitly requires them or the user explicitly approves them.
- Do not alter lint, TypeScript, test, coverage, format, or tracked-content configuration merely to make a change pass.
- When a command fails, verify the supported syntax or available repository command and continue toward the requested outcome. Do not invent an environmental explanation.

## Authoritative Sources

Documentation points to authoritative files rather than copying volatile rules:

- `package.json` owns available npm scripts and the supported Node.js range.
- `eslint.config.js` owns lint scopes, enabled plugins, rules, and existing file-specific exceptions. Inspect it before changing TypeScript or JavaScript.
- `tsconfig.json` owns TypeScript compiler behavior.
- `vitest.config.ts` and the relevant tests own test-runner behavior and established test patterns.
- `.prettierignore`, the Prettier configuration, and repository format scripts own formatting scope.
- `.github/workflows/**` owns CI workflow behavior.
- Source interfaces and exported types own API shape. Documentation describes intent, boundaries, and invariants instead of reproducing whole interfaces.
- The nearest current implementation owns concrete behavior when documentation and code disagree. Correct the documentation in the same task.

## Documentation Rules

- Write in English.
- Use present tense.
- Describe current ownership and behavior only.
- Do not include dated notes, edit narratives, audit identifiers, work-order identifiers, migration commentary, previous designs, or future intentions.
- Do not mention removed console surfaces or deleted compatibility types.
- Do not prescribe a specific code-search implementation or discovery tool.
- Do not reproduce lint-rule lists.
- Do not reproduce large interfaces or API method catalogs that are already discoverable in source.
- Do not restate parent documentation.
- Prefer links to the nearest authoritative child README over summaries of that child's contents.
- Keep examples only when they clarify a non-obvious invariant or workflow.
- Maintain the relevant README when behavior, concepts, public interfaces, SDK surfaces, folder roles, or cartridge structure shift.

## Validation and User Approval

- Run `npm run typecheck` before handing off TypeScript changes.
- Run the non-mutating lint validation against the changed source scope.
- Do not run `npm run build` during normal iteration. It is an alias of `build:web` and runs the full quality gate; reserve it for the commit or push gate.
- Before any `git push`, run `npm run build:web`, even if focused tests and `npm run typecheck` already passed locally.
- Keep repository-wide validation commands as non-mutating gates, not as autofix instructions.
