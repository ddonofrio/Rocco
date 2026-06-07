import type { RoccoWaterColorEffect } from '../../../../engine/video/post-processing';
import {
  DEFAULT_WATER_EFFECT_AMPLITUDE,
  DEFAULT_WATER_EFFECT_COLORS,
  DEFAULT_WATER_EFFECT_SPEED,
  DEFAULT_WATER_EFFECT_STRENGTH,
  DEFAULT_WATER_EFFECT_TOLERANCE,
  DEFAULT_WATER_EFFECT_WAVELENGTH,
} from '../../rocco-default-constants';

export function makeDefaultWaterColorEffect(): RoccoWaterColorEffect {
  return {
    enabled: true,
    colors: [...DEFAULT_WATER_EFFECT_COLORS],
    tolerance: DEFAULT_WATER_EFFECT_TOLERANCE,
    amplitude: DEFAULT_WATER_EFFECT_AMPLITUDE,
    wavelength: DEFAULT_WATER_EFFECT_WAVELENGTH,
    speed: DEFAULT_WATER_EFFECT_SPEED,
    strength: DEFAULT_WATER_EFFECT_STRENGTH,
  };
}
