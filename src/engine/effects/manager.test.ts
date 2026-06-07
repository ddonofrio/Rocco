import { describe, expect, it } from 'vitest';

import type { RoccoGraphicPlane } from '../video/planes';
import { RoccoDefaultEffectManager } from './manager';
import { RoccoDefaultEffectRegistry } from './registry';
import { roccoAutoScrollRuntime } from './runtimes/auto-scroll';

function makePlane(patch?: Partial<RoccoGraphicPlane>): RoccoGraphicPlane {
  const plane: RoccoGraphicPlane = {
    id: 'clouds-plane',
    enabled: true,
    visible: true,
    opacity: 1,
    priority: 0,
    source: {
      kind: 'solid',
      color: '#000000',
    },
    colorModel: { kind: 'native' },
    transform: {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    },
    scroll: {
      x: 0,
      y: 0,
    },
    wrap: { x: false, y: false },
  };

  if (!patch) {
    return plane;
  }

  return {
    ...plane,
    ...patch,
    source: patch.source ?? plane.source,
    colorModel: patch.colorModel ?? plane.colorModel,
    transform: patch.transform ? { ...plane.transform, ...patch.transform } : plane.transform,
    scroll: patch.scroll ? { ...plane.scroll, ...patch.scroll } : plane.scroll,
    wrap: patch.wrap ? { ...plane.wrap, ...patch.wrap } : plane.wrap,
  };
}

describe('Rocco effects manager', () => {
  it('applies auto-scroll in pixels-per-second', () => {
    const plane = makePlane();
    const registry = new RoccoDefaultEffectRegistry();
    registry.register(roccoAutoScrollRuntime);

    const manager = new RoccoDefaultEffectManager({
      registry,
      resolveTarget: (targetType, targetId) => {
        if (targetType === 'graphic-plane' && targetId === plane.id) {
          return plane;
        }
        return undefined;
      },
    });

    manager.add({
      id: 'clouds-auto-scroll',
      kind: 'auto-scroll',
      targetType: 'graphic-plane',
      targetId: plane.id,
      enabled: true,
      params: {
        velocityX: 12,
        velocityY: -3,
        units: 'pixels-per-second',
      },
    });

    manager.tick({
      deltaMs: 500,
      deltaSeconds: 0.5,
      elapsedMs: 500,
      elapsedSeconds: 0.5,
    });

    expect(plane.scroll.x).toBe(6);
    expect(plane.scroll.y).toBe(-1.5);
  });

  it('fails safely when target is missing', () => {
    const registry = new RoccoDefaultEffectRegistry();
    registry.register(roccoAutoScrollRuntime);
    const manager = new RoccoDefaultEffectManager({
      registry,
      resolveTarget: () => undefined,
    });

    manager.add({
      id: 'missing-target-effect',
      kind: 'auto-scroll',
      targetType: 'graphic-plane',
      targetId: 'unknown',
      enabled: true,
      params: {
        velocityX: 20,
        velocityY: 0,
      },
    });

    expect(() =>
      manager.tick({
        deltaMs: 16,
        deltaSeconds: 0.016,
        elapsedMs: 16,
        elapsedSeconds: 0.016,
      }),
    ).not.toThrow();
  });

  it('normalizes wrapped auto-scroll with positive modulo', () => {
    const plane = makePlane({
      source: {
        kind: 'image',
        uri: '/stars.png',
        width: 100,
        height: 50,
      },
      scroll: { x: 95, y: 10 },
      wrap: { x: true, y: true },
    });
    const registry = new RoccoDefaultEffectRegistry();
    registry.register(roccoAutoScrollRuntime);

    const manager = new RoccoDefaultEffectManager({
      registry,
      resolveTarget: (targetType, targetId) => {
        if (targetType === 'graphic-plane' && targetId === plane.id) {
          return plane;
        }
        return undefined;
      },
    });

    manager.add({
      id: 'stars-auto-scroll',
      kind: 'auto-scroll',
      targetType: 'graphic-plane',
      targetId: plane.id,
      enabled: true,
      params: {
        velocityX: 130,
        velocityY: -20,
        units: 'pixels-per-second',
      },
    });

    manager.tick({
      deltaMs: 1000,
      deltaSeconds: 1,
      elapsedMs: 1000,
      elapsedSeconds: 1,
    });

    expect(plane.scroll.x).toBe(25);
    expect(plane.scroll.y).toBe(40);
  });
});
