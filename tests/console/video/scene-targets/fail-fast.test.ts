import { describe, expect, it } from 'vitest';

import { RoccoSceneTargetSystemSDK } from '../../../../src/console/video/scene-targets/system';

describe('RoccoSceneTargetSystemSDK', () => {
  it('registers a target', () => {
    const system = new RoccoSceneTargetSystemSDK();
    system.registerTarget({
      instanceId: 'target-1',
      definitionId: 'def-1',
      shape: { kind: 'rect', x: 0, y: 0, width: 10, height: 10 },
    });

    expect(system.getTarget('target-1')).toBeDefined();
  });

  it('throws on duplicate target instance id', () => {
    const system = new RoccoSceneTargetSystemSDK();
    system.registerTarget({
      instanceId: 'target-1',
      definitionId: 'def-1',
      shape: { kind: 'rect', x: 0, y: 0, width: 10, height: 10 },
    });

    expect(() =>
      system.registerTarget({
        instanceId: 'target-1',
        definitionId: 'def-2',
        shape: { kind: 'rect', x: 0, y: 0, width: 10, height: 10 },
      }),
    ).toThrow("Duplicate scene target registration 'target-1'.");
  });
});
