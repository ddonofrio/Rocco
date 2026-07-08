import { describe, expect, it } from 'vitest';

import { RoccoSceneTargetSystemSDK } from '../../../../src/engine/video/scene-targets/system';

describe('RoccoSceneTargetSystemSDK', () => {
  it('hit tests overlapping targets in descending priority order', () => {
    const system = new RoccoSceneTargetSystemSDK();

    system.registerTarget({
      instanceId: 'crate-target',
      definitionId: 'crate',
      shape: {
        kind: 'rect',
        x: 10,
        y: 10,
        width: 30,
        height: 30,
      },
      priority: 2,
      visibleDescription: {
        enabled: true,
        text: 'Crate',
      },
    });
    system.registerTarget({
      instanceId: 'shell-city-sign-target',
      definitionId: 'shell-city-sign',
      shape: {
        kind: 'polygon',
        points: [
          { x: 12, y: 12 },
          { x: 36, y: 12 },
          { x: 36, y: 36 },
          { x: 12, y: 36 },
        ],
      },
      priority: 24,
      visibleDescription: {
        enabled: true,
        text: 'Shell City sign',
        textKey: 'shellCitySign',
      },
    });

    expect(system.hitTest(20, 20).map((hit) => `${hit.instanceId}:${hit.priority}`)).toEqual([
      'shell-city-sign-target:24',
      'crate-target:2',
    ]);
    expect(
      system.hitTestVisible(20, 20).map((hit) => `${hit.instanceId}:${hit.text}:${hit.priority}`),
    ).toEqual([
      'shell-city-sign-target:Shell City sign:24',
      'crate-target:Crate:2',
    ]);
  });

  it('supports look-only hotspots that hover but do not interact', () => {
    const system = new RoccoSceneTargetSystemSDK();

    system.registerTarget({
      instanceId: 'look-only-sign',
      definitionId: 'look-only-sign',
      interactive: false,
      shape: {
        kind: 'rect',
        x: 100,
        y: 80,
        width: 40,
        height: 24,
      },
      visibleDescription: {
        enabled: true,
        text: 'Harbor notice',
      },
    });

    expect(system.hitTest(110, 90)).toEqual([]);
    expect(system.hitTestVisible(110, 90).map((hit) => hit.text)).toEqual(['Harbor notice']);

    system.setEnabled('look-only-sign', false);

    expect(system.hitTestVisible(110, 90)).toEqual([]);
  });
});
