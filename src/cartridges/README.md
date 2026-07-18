# Cartridges

This directory holds the built-in cartridge implementations for the ROCCO console.

Rules common to every cartridge:

- A cartridge consumes the public SDK (`CartridgeSdkV1`) received through `context.sdk` at mount. It must not import PixiJS rendering classes, renderer implementations, or other console-kernel internals.
- All cartridge-owned content and state stays inside its own cartridge tree.
- Each cartridge owns its local documentation and validation guidance through its own README chain.

## Reading next

- [`rocco/README.md`](rocco/README.md) — the `rocco-default` cartridge and its bootstrap, RPCE, game content, inventory, localization, and interaction ownership.
