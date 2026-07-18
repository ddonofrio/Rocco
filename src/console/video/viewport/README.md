# Viewport

The viewport subsystem hosts the entire console inside the browser window. It owns contain scaling, stage centering, display-profile application, cursor integration, and the DOM root that Pixi renders into.

## Files

- `host.ts` - `RoccoViewportHost`, viewport metrics, scaling, DOM host creation, display-profile integration, and cursor-event wiring.
- `index.ts` - Barrel export plus type re-exports used by the engine entry point and runtime.

## Runtime Role

`RoccoViewportHost`:

- Creates the fixed full-window host element and the scaled stage element.
- Maintains `RoccoViewportMetrics` with viewport size, design size, scale, render size, and offsets.
- Applies `contain` or `cover` scaling for the fixed `960 x 540` design resolution.
- Supports drag panning while `cover` mode is active so tall mobile viewports can explore the widened stage safely across remounts.
- Forwards metrics to `RoccoDisplayProfileRenderer` and `RoccoCursorHost`.
- Owns cursor action, move, leave, and attachment plumbing used by `RoccoInputHandler`.

`src/main.ts` mounts the viewport host first, then mounts the Pixi application into `getStageElement()`.

## Boundary

This folder is runtime-facing, not cartridge-facing. Cartridges do not manipulate viewport DOM or scaling logic. `RoccoRuntimeVideoSystem` can keep a host reference through `video.viewport` so subsystems can resolve design metrics and cursor integration, but the entry point and runtime own viewport lifecycle.
