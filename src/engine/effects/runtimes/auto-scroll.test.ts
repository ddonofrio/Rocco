import { describe, expect, it } from 'vitest';

import { makeGraphicPlaneAutoScrollEffect } from './auto-scroll';

describe('makeGraphicPlaneAutoScrollEffect', () => {
  it('creates an auto-scroll effect for graphic-plane targets', () => {
    const effect = makeGraphicPlaneAutoScrollEffect({
      id: 'scroll-clouds',
      targetId: 'clouds',
      velocityX: 20,
      velocityY: -3,
    });

    expect(effect.id).toBe('scroll-clouds');
    expect(effect.kind).toBe('auto-scroll');
    expect(effect.targetType).toBe('graphic-plane');
    expect(effect.targetId).toBe('clouds');
    expect(effect.enabled).toBe(true);
    expect(effect.params.units).toBe('pixels-per-second');
    expect(effect.params.velocityX).toBe(20);
    expect(effect.params.velocityY).toBe(-3);
  });

  it('accepts explicit units and enabled flag', () => {
    const effect = makeGraphicPlaneAutoScrollEffect({
      id: 'scroll-stars',
      targetId: 'stars',
      velocityX: 1,
      velocityY: 0,
      units: 'pixels-per-frame',
      enabled: false,
    });

    expect(effect.params.units).toBe('pixels-per-frame');
    expect(effect.enabled).toBe(false);
  });
});

