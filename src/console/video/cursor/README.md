# Cursor

The cursor subsystem owns the console pointer overlay and converts browser pointer coordinates into ROCCO design-space coordinates.

## Files

- `host.ts` - DOM cursor overlay, pointer event routing, design-space conversion, and image attachments.
- `host.test.ts` - jsdom tests for cursor visibility, coordinates, events, and attachments.
- `index.ts` - Barrel export.

## Behavior

- The cursor hides the browser pointer when enabled and renders a ROCCO-style overlay.
- Pointer movement is constrained to the contained game viewport.
- Cursor actions emit scene coordinates for engine input routing.
- A cursor attachment can replace the line cursor with a generic image payload.
- Touch pointers hide the cursor overlay when contact ends, but they do not emit cursor-leave callbacks that would dismiss hover-driven UI between taps.

## Boundary

The cursor is a console capability. Cartridges do not draw cursor DOM or import cursor internals. Higher-level systems can pass generic payload data such as an image URI and label, and cartridge code decides what that payload means.
