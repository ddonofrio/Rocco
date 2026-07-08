import { describe, expect, it } from 'vitest';

import {
  ROCCO_WATER_COLOR_EFFECT_MAX_COLORS,
  parseRoccoWaterColor,
  resolveRoccoWaterColorEffect,
} from '../../../../src/engine/video/post-processing/water-color-effect';

describe('Rocco water color post-processing effect', () => {
  it('parses hex colors into normalized rgb values', () => {
    expect(parseRoccoWaterColor('#0f8040')).toEqual([15 / 255, 128 / 255, 64 / 255]);
    expect(parseRoccoWaterColor('#abc')).toEqual([170 / 255, 187 / 255, 204 / 255]);
    expect(parseRoccoWaterColor('not-a-color')).toBeNull();
  });

  it('disables the resolved effect when no valid colors are configured', () => {
    const resolved = resolveRoccoWaterColorEffect({
      enabled: true,
      colors: ['bad-color'],
    });

    expect(resolved.enabled).toBe(false);
    expect(resolved.colors).toEqual([]);
  });

  it('limits the configured palette to the shader color capacity', () => {
    const colors = Array.from({ length: ROCCO_WATER_COLOR_EFFECT_MAX_COLORS + 3 }, () => '#106880');
    const resolved = resolveRoccoWaterColorEffect({
      colors,
      tolerance: 2,
      amplitude: -4,
      wavelength: -10,
      strength: 5,
    });

    expect(resolved.enabled).toBe(true);
    expect(resolved.colors).toHaveLength(ROCCO_WATER_COLOR_EFFECT_MAX_COLORS);
    expect(resolved.tolerance).toBe(1);
    expect(resolved.amplitude).toBe(0);
    expect(resolved.wavelength).toBe(1);
    expect(resolved.strength).toBe(1);
  });
});
