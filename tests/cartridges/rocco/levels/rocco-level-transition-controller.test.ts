import { describe, expect, it } from 'vitest';

import { RoccoLevelTransitionController } from '../../../../src/cartridges/rocco/levels/runtime/rocco-level-transition-controller';
import type { RoccoLevel, RoccoLevelConnector } from '../../../../src/cartridges/rocco/levels/rocco-level-types';
import type { RoccoPoint } from '../../../../src/console/video/sprites';

function createLevel(levelId: string, connectors: readonly RoccoLevelConnector[]): RoccoLevel {
  return {
    id: levelId,
    title: levelId,
    connectors,
    mount() {
      return Promise.reject(
        new Error('mount() is not used in transition-controller unit tests.'),
      );
    },
    unmount() {},
    update() {},
    handleAction() {},
  };
}

describe('RoccoLevelTransitionController', () => {
  it('requires a matching exit intent before crossing a touched connector', () => {
    const playerGround: RoccoPoint = { x: 8, y: 20 };
    const controller = new RoccoLevelTransitionController({
      canTraverseConnector: () => true,
      resolvePlayerGroundPoint: () => playerGround,
    });
    const level = createLevel('pier-middle', [
      {
        id: 'east',
        exitArea: { x: 0, y: 0, width: 24, height: 40 },
        entryPoint: { x: 100, y: 200 },
        entryFacing: 'left',
      },
    ]);

    expect(controller.update(level, 16)).toBeNull();

    controller.updatePendingExitIntent(level, {
      kind: 'scene-click',
      sceneX: 12,
      sceneY: 10,
    });

    expect(controller.update(level, 16)).toMatchObject({
      fromLevelId: 'pier-middle',
      connector: { id: 'east' },
      targetEndpoint: {
        levelId: 'pier-start',
        connectorId: 'west',
      },
    });
  });

  it('blocks repeated transitions while the cooldown is still active', () => {
    const playerGround: RoccoPoint = { x: 8, y: 20 };
    const controller = new RoccoLevelTransitionController({
      canTraverseConnector: () => true,
      resolvePlayerGroundPoint: () => playerGround,
    });
    const level = createLevel('pier-middle', [
      {
        id: 'west',
        exitArea: { x: 0, y: 0, width: 24, height: 40 },
        entryPoint: { x: 100, y: 200 },
        entryFacing: 'right',
      },
    ]);

    controller.setCooldown(500);
    controller.updatePendingExitIntent(level, {
      kind: 'scene-click',
      sceneX: 12,
      sceneY: 10,
    });

    expect(controller.update(level, 499)).toBeNull();
    expect(controller.update(level, 1)).toMatchObject({
      fromLevelId: 'pier-middle',
      connector: { id: 'west' },
      targetEndpoint: {
        levelId: 'pier-end',
        connectorId: 'east',
      },
    });
  });

  it('refuses gated connectors when traversal rules deny them', () => {
    const controller = new RoccoLevelTransitionController({
      canTraverseConnector: (connector) => !connector.requiresKeys,
      resolvePlayerGroundPoint: () => ({ x: 8, y: 20 }),
    });
    const level = createLevel('pier-middle', [
      {
        id: 'east',
        exitArea: { x: 0, y: 0, width: 24, height: 40 },
        entryPoint: { x: 100, y: 200 },
        entryFacing: 'left',
        requiresKeys: true,
      },
    ]);

    controller.updatePendingExitIntent(level, {
      kind: 'scene-click',
      sceneX: 12,
      sceneY: 10,
    });

    expect(controller.update(level, 16)).toBeNull();
  });

  it('resolves scripted connector transitions through the shared graph', () => {
    const controller = new RoccoLevelTransitionController({
      canTraverseConnector: () => true,
      resolvePlayerGroundPoint: () => undefined,
    });
    const level = createLevel('bait-shop-second', [
      {
        id: 'toilet-door',
        entryPoint: { x: 630, y: 334 },
        entryFacing: 'down',
      },
    ]);

    expect(controller.resolveScriptedTransition(level, 'toilet-door')).toMatchObject({
      fromLevelId: 'bait-shop-second',
      connector: { id: 'toilet-door' },
      targetEndpoint: {
        levelId: 'bait-shop-toilet',
        connectorId: 'south',
      },
    });
  });

  it('resolves the bait-shop toilet portal into the Nether entry connector', () => {
    const controller = new RoccoLevelTransitionController({
      canTraverseConnector: () => true,
      resolvePlayerGroundPoint: () => undefined,
    });
    const level = createLevel('bait-shop-toilet', [
      {
        id: 'portal',
        entryPoint: { x: 480, y: 240 },
        entryFacing: 'down',
      },
    ]);

    expect(controller.resolveScriptedTransition(level, 'portal')).toMatchObject({
      fromLevelId: 'bait-shop-toilet',
      connector: { id: 'portal' },
      targetEndpoint: {
        levelId: 'nether-console-hardware-spawn',
        connectorId: 'entry',
      },
    });
  });

  it('clears a pending exit intent when the scene click targets an object instead of the floor', () => {
    const controller = new RoccoLevelTransitionController({
      canTraverseConnector: () => true,
      resolvePlayerGroundPoint: () => ({ x: 8, y: 20 }),
    });
    const level = createLevel('pier-middle', [
      {
        id: 'east',
        exitArea: { x: 0, y: 0, width: 24, height: 40 },
        entryPoint: { x: 100, y: 200 },
        entryFacing: 'left',
      },
    ]);

    controller.updatePendingExitIntent(level, {
      kind: 'scene-click',
      sceneX: 12,
      sceneY: 10,
    });
    controller.updatePendingExitIntent(level, {
      kind: 'scene-click',
      sceneX: 12,
      sceneY: 10,
      targetInstanceId: 'some-prop',
    });

    expect(controller.update(level, 16)).toBeNull();
  });
});
