import { describe, expect, it } from 'vitest';

import { RoccoPrimitiveSystemSDK } from '../../../../src/console/video/primitives/system';

describe('RoccoPrimitiveSystemSDK', () => {
  it('can add/list/get/remove and clear primitives', () => {
    const system = new RoccoPrimitiveSystemSDK();
    const primitive = {
      id: 'line-1',
      kind: 'line' as const,
      renderLayer: 'overlay.primitives',
      zIndex: 1,
      color: '#ffffff',
      alpha: 1,
      visible: true,
      x1: 0,
      y1: 0,
      x2: 20,
      y2: 20,
      strokeWidth: 2,
    };

    system.addPrimitive(primitive);
    expect(system.listPrimitives()).toHaveLength(1);
    expect(system.getPrimitive('line-1')?.kind).toBe('line');

    system.removePrimitive('line-1');
    expect(system.listPrimitives()).toHaveLength(0);

    system.addPrimitive(primitive);
    system.addPrimitive({
      id: 'point-1',
      kind: 'point',
      renderLayer: 'overlay.primitives',
      zIndex: 2,
      color: '#00ff00',
      alpha: 0.8,
      visible: true,
      x: 10,
      y: 12,
      size: 3,
    });
    expect(system.listPrimitives()).toHaveLength(2);

    system.clearPrimitives();
    expect(system.listPrimitives()).toHaveLength(0);
  });
});

