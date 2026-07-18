# Post-Processing

The post-processing module contains pixel-level helpers used by video renderers.

## Files

- `color-key.ts` - Color parsing, color distance, matching, and pixel replacement helpers.
- `water-color-effect.ts` - Water color effect configuration, defaults, parsing, clamping, and cloning.
- `water-color-effect.test.ts` - Unit tests under `tests/console/video/post-processing/` for water color parsing and option resolution.
- `index.ts` - Barrel export.

## Water Color Effect

Image planes opt into water animation through `plane.metadata.waterColorEffect`.

The Pixi plane renderer:

1. Loads the source image into canvas image data.
2. Selects water-like pixels using configured colors and tolerance.
3. Moves selected pixels into an animated water layer.
4. Keeps non-water pixels in a static base layer.
5. Horizontally offsets thin water rows with a sine wave.
6. Clips each animated frame back to the original selected alpha mask.

The final clip lets water shimmer without sliding over static objects such as pier planks or wooden posts.

This module is not a direct cartridge-facing SDK surface. Cartridges opt in by configuring plane metadata; the plane renderer applies the effect.

## Tuning

- `colors` defines the water color-key palette.
- `tolerance` controls how similar a source pixel must be before it is selected as water.
- `amplitude`, `wavelength`, and `speed` control wave motion.
- `strength` scales visible displacement without changing the selected mask.

Lower `tolerance` when wood, rocks, or props are selected as water. Lower `strength` when the mask is correct but displacement is visually too strong.
