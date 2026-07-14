import { describe, expect, it } from 'vitest';

import { RoccoRuntimeDefaultPlayerMovePolicyCoordinator } from '../../../src/console/runtime-default-player-move-policy-coordinator';
import type { CartridgeActionDisposition } from '../../../src/console/cartridges';
import type { RoccoSceneTargetDefinition } from '../../../src/console/video/scene-targets';

describe('RoccoRuntimeDefaultPlayerMovePolicyCoordinator', () => {
  const coordinator = new RoccoRuntimeDefaultPlayerMovePolicyCoordinator({
    getSceneTarget: () => {},
  });

  it('COR-002: a synchronous disposition with defaultPlayerMovement:suppress suppresses movement', () => {
    const disposition: CartridgeActionDisposition = {
      consumed: true,
      defaultPlayerMovement: 'suppress',
    };

    expect(
      coordinator.shouldSuppressDefaultPlayerMove({
        target: undefined,
        cartridgeDisposition: disposition,
      }),
    ).toBe(true);
  });

  it('COR-002: a disposition with defaultPlayerMovement:allow does not suppress movement', () => {
    const disposition: CartridgeActionDisposition = {
      consumed: true,
      defaultPlayerMovement: 'allow',
    };

    expect(
      coordinator.shouldSuppressDefaultPlayerMove({
        target: undefined,
        cartridgeDisposition: disposition,
      }),
    ).toBe(false);
  });

  it('COR-002: a null cartridge disposition does not suppress movement', () => {
    expect(
      coordinator.shouldSuppressDefaultPlayerMove({
        target: undefined,
        cartridgeDisposition: null,
      }),
    ).toBe(false);
  });

  it('COR-002: scene-target suppressDefaultPlayerMove:true suppresses movement without a cartridge disposition', () => {
    const sceneTarget: RoccoSceneTargetDefinition = {
      instanceId: 'bait-shop-door',
      definitionId: 'bait-shop-door',
      shape: { kind: 'rect', x: 0, y: 0, width: 10, height: 10 },
      suppressDefaultPlayerMove: true,
    };

    const coordinatorWithTarget = new RoccoRuntimeDefaultPlayerMovePolicyCoordinator({
      getSceneTarget: () => sceneTarget,
    });

    const isResult = coordinatorWithTarget.shouldSuppressDefaultPlayerMove({
      target: { kind: 'scene-target', instanceId: 'bait-shop-door', definitionId: 'bait-shop-door' },
      cartridgeDisposition: null,
    });

    expect(isResult).toBe(true);
  });
});
