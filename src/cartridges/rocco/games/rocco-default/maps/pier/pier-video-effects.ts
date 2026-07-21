import type { RoccoWaterColorEffect } from '../../../../../../console/video/post-processing';

export const PIER_WATER_EFFECT_COLORS = [
  '#106880',
  '#085058',
  '#084850',
  '#105860',
  '#085860',
  '#106068',
  '#187088',
  '#086078',
] as const;

export const PIER_WATER_EFFECT_TOLERANCE = 0.08;
export const PIER_WATER_EFFECT_AMPLITUDE = 5;
export const PIER_WATER_EFFECT_WAVELENGTH = 30;
export const PIER_WATER_EFFECT_SPEED = 2.1;
export const PIER_WATER_EFFECT_STRENGTH = 0.75;

export function makeDefaultWaterColorEffect(): RoccoWaterColorEffect {
  return {
    enabled: true,
    colors: [...PIER_WATER_EFFECT_COLORS],
    tolerance: PIER_WATER_EFFECT_TOLERANCE,
    amplitude: PIER_WATER_EFFECT_AMPLITUDE,
    wavelength: PIER_WATER_EFFECT_WAVELENGTH,
    speed: PIER_WATER_EFFECT_SPEED,
    strength: PIER_WATER_EFFECT_STRENGTH,
  };
}
