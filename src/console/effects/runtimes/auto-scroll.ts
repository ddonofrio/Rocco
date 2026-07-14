import type { RoccoGraphicPlane } from '../../video/planes';
import type { RoccoEffect, RoccoEffectRuntime } from '../types';
import { wrapValue } from '../../video/planes/wrap';

export type RoccoAutoScrollUnits = 'pixels-per-second' | 'pixels-per-frame';

export interface RoccoAutoScrollParams {
  velocityX: number;
  velocityY: number;
  units?: RoccoAutoScrollUnits;
}

export interface RoccoAutoScrollEffect extends RoccoEffect<RoccoAutoScrollParams> {
  kind: 'auto-scroll';
  targetType: 'graphic-plane';
}

export interface RoccoGraphicPlaneAutoScrollEffectOptions {
  id: string;
  targetId: string;
  velocityX: number;
  velocityY: number;
  units?: RoccoAutoScrollUnits;
  enabled?: boolean;
}

export function makeGraphicPlaneAutoScrollEffect(
  options: RoccoGraphicPlaneAutoScrollEffectOptions,
): RoccoAutoScrollEffect {
  return {
    id: options.id,
    kind: 'auto-scroll',
    targetType: 'graphic-plane',
    targetId: options.targetId,
    enabled: options.enabled ?? true,
    params: {
      velocityX: options.velocityX,
      velocityY: options.velocityY,
      units: options.units ?? 'pixels-per-second',
    },
  };
}

export const roccoAutoScrollRuntime: RoccoEffectRuntime<RoccoGraphicPlane, RoccoAutoScrollParams> = {
  kind: 'auto-scroll',
  targetType: 'graphic-plane',
  apply(target, parameters, context) {
    const units = parameters.units ?? 'pixels-per-second';
    const factor = units === 'pixels-per-frame' ? 1 : context.deltaSeconds;

    target.scroll.x += parameters.velocityX * factor;
    target.scroll.y += parameters.velocityY * factor;

    if (target.wrap.x) {
      target.scroll.x = wrapValue(target.scroll.x, resolveWrapSpan(target, 'x'));
    }
    if (target.wrap.y) {
      target.scroll.y = wrapValue(target.scroll.y, resolveWrapSpan(target, 'y'));
    }
  },
};

function resolveWrapSpan(target: RoccoGraphicPlane, axis: 'x' | 'y'): number {
  const fallback = 0;

  switch (target.source.kind) {
    case 'image': {
      return axis === 'x' ? target.source.width ?? fallback : target.source.height ?? fallback;
    }
    case 'bitmap': {
      return axis === 'x' ? target.source.width : target.source.height;
    }
    case 'tilemap': {
      return axis === 'x'
        ? target.source.width * target.source.tileWidth
        : target.source.height * target.source.tileHeight;
    }
    case 'procedural': {
      const key = axis === 'x' ? 'width' : 'height';
      const fromParameters = Number(target.source.params?.[key] ?? NaN);
      return Number.isFinite(fromParameters) ? fromParameters : fallback;
    }
    default: {
      return fallback;
    }
  }
}
