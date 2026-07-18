# Source

This directory holds the application entry, global style, and the two top-level source trees.

Dependency direction:

- `console/` is the console host and runtime. It owns runtime initialization, rendering, audio, input, effects, persistence, cartridge lifecycle, and resource teardown.
- `cartridges/` holds cartridge implementations. A cartridge consumes the public SDK received at mount and must not import console internals.
- `main.ts` is the application entry point. `style.css` is the global page style.

Console and cartridge code never import from one another except through the SDK surface defined by `src/console/cartridges/sdk-v1`.

## Reading next

- [`console/README.md`](console/README.md) — console host boundary and child-document index.
- [`cartridges/README.md`](cartridges/README.md) — rules common to all built-in cartridge implementations.
