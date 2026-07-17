export const ROCCO_WATER_COLOR_EFFECT_MAX_COLORS = 8;

export type RoccoWaterColorRgb = readonly [number, number, number];
export type RoccoWaterColorDebugMode = 'none' | 'transparent-mask';

export interface RoccoWaterColorEffect {
  enabled: boolean;
  colors: string[];
  debugMode?: RoccoWaterColorDebugMode;
  tolerance?: number;
  amplitude?: number;
  wavelength?: number;
  speed?: number;
  strength?: number;
}

export interface RoccoResolvedWaterColorEffect {
  enabled: boolean;
  colors: RoccoWaterColorRgb[];
  debugMode: RoccoWaterColorDebugMode;
  tolerance: number;
  amplitude: number;
  wavelength: number;
  speed: number;
  strength: number;
}

export const defaultRoccoWaterColorEffect: RoccoResolvedWaterColorEffect = {
  enabled: false,
  colors: [],
  debugMode: 'none',
  tolerance: 0.045,
  amplitude: 3,
  wavelength: 42,
  speed: 2.2,
  strength: 0.75,
};

export function resolveRoccoWaterColorEffect(
  effect: Partial<RoccoWaterColorEffect> | null | undefined,
): RoccoResolvedWaterColorEffect {
  if (!effect) {
    return { ...defaultRoccoWaterColorEffect, colors: [] };
  }

  const colors = (effect.colors ?? [])
    .map((color) => parseRoccoWaterColor(color))
    .filter((color): color is RoccoWaterColorRgb => Boolean(color))
    .slice(0, ROCCO_WATER_COLOR_EFFECT_MAX_COLORS);

  return {
    enabled: (effect.enabled ?? true) && colors.length > 0,
    colors,
    debugMode: effect.debugMode ?? defaultRoccoWaterColorEffect.debugMode,
    tolerance: clamp(effect.tolerance ?? defaultRoccoWaterColorEffect.tolerance, 0.001, 1),
    amplitude: Math.max(0, effect.amplitude ?? defaultRoccoWaterColorEffect.amplitude),
    wavelength: Math.max(1, effect.wavelength ?? defaultRoccoWaterColorEffect.wavelength),
    speed: effect.speed ?? defaultRoccoWaterColorEffect.speed,
    strength: clamp(effect.strength ?? defaultRoccoWaterColorEffect.strength, 0, 1),
  };
}

export function cloneRoccoWaterColorEffect(
  effect: RoccoResolvedWaterColorEffect | null,
): RoccoResolvedWaterColorEffect | null {
  if (!effect) {
    // Preserved `null` return: `water-color-effect.test.ts` asserts `.toBeNull()`.
    return null;
  }

  return {
    ...effect,
    colors: effect.colors.map((color) => [...color] as const),
  };
}

export function parseRoccoWaterColor(value: string): RoccoWaterColorRgb | null {
  const normalized = value.trim().toLowerCase();
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/u.exec(normalized);
  if (!match) {
    // Preserved `null` return: callers (incl. tests) assert `.toBeNull()`.
    return null;
  }

  const raw = match[1] ?? '';
  const expanded =
    raw.length === 3
      ? raw
          .split('')
          .map((digit) => `${digit}${digit}`)
          .join('')
      : raw;

  const numeric = Number.parseInt(expanded, 16);
  return [
    ((numeric >> 16) & 0xff) / 255,
    ((numeric >> 8) & 0xff) / 255,
    (numeric & 0xff) / 255,
  ] as const;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}
