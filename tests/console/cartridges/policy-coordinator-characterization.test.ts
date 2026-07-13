import { describe, expect, it } from 'vitest';

import { RoccoRuntimeDefaultPlayerMovePolicyCoordinator } from '../../../src/console/runtime-default-player-move-policy-coordinator';
import type { RoccoSceneTargetDefinition } from '../../../src/console/video/scene-targets';

describe('RoccoRuntimeDefaultPlayerMovePolicyCoordinator characterization', () => {
  const coordinator = new RoccoRuntimeDefaultPlayerMovePolicyCoordinator({
    getSceneTarget: () => undefined,
  });

  it('COR-002: async handleAction result returning suppressDefaultPlayerMove:true does NOT suppress movement', () => {
    const asyncResult = Promise.resolve();

    const result = coordinator.shouldSuppressDefaultPlayerMove({
      target: undefined,
      cartridgeActionResult: asyncResult,
    });

    expect(result).toBe(false);
  });

  it('COR-002: synchronous handleAction result returning suppressDefaultPlayerMove:true DOES suppress movement', () => {
    const syncResult = { suppressDefaultPlayerMove: true };

    const result = coordinator.shouldSuppressDefaultPlayerMove({
      target: undefined,
      cartridgeActionResult: syncResult,
    });

    expect(result).toBe(true);
  });

  it('COR-002: scene target suppressDefaultPlayerMove:true suppresses movement even with async cartridge result', () => {
    const sceneTarget: RoccoSceneTargetDefinition = {
      instanceId: 'bait-shop-door',
      definitionId: 'bait-shop-door',
      shape: { kind: 'rect', x: 0, y: 0, width: 10, height: 10 },
      suppressDefaultPlayerMove: true,
    };

    const asyncResult = Promise.resolve();

    const coordinatorWithTarget = new RoccoRuntimeDefaultPlayerMovePolicyCoordinator({
      getSceneTarget: () => sceneTarget,
    });

    const result = coordinatorWithTarget.shouldSuppressDefaultPlayerMove({
      target: { kind: 'scene-target', instanceId: 'bait-shop-door', definitionId: 'bait-shop-door' },
      cartridgeActionResult: asyncResult,
    });

    expect(result).toBe(true);
  });
});
