import { describe, expect, it, vi } from 'vitest';

import { createRoccoLocalization } from '../../../../src/cartridges/rocco/localization';
import {
  createRoccoKeysInventoryItem,
  createRoccoMagazineInventoryItem,
} from '../../../../src/cartridges/rocco/inventory';
import { RoccoDroppedInventoryController } from '../../../../src/cartridges/rocco/levels/runtime/rocco-dropped-inventory-controller';
import type { RoccoLevel } from '../../../../src/cartridges/rocco/levels/rocco-level-types';
import type { RoccoEngine } from '../../../../src/engine/engine-sdk';
import { DEFAULT_SPRITE_INSTANCE_ID } from '../../../../src/cartridges/rocco/rocco-default-constants';

interface DroppedEngineState {
  thoughtMessages: string[];
  removedSpriteIds: string[];
  unregisteredTargetIds: string[];
  renderCalls: number;
}

function createLevel(levelId: string): RoccoLevel {
  return {
    id: levelId,
    title: levelId,
    connectors: [],
    mount() {
      return Promise.reject(
        new Error('mount() is not used in dropped-inventory controller unit tests.'),
      );
    },
    unmount() {},
    update() {},
    handleAction() {},
  };
}

function createDroppedInventoryEngine(): { engine: RoccoEngine; state: DroppedEngineState } {
  const state: DroppedEngineState = {
    thoughtMessages: [],
    removedSpriteIds: [],
    unregisteredTargetIds: [],
    renderCalls: 0,
  };

  const engine = {
    video: {
      gridMenus: {
        getCarriedItem: () => undefined,
      },
      actionMenus: {
        unregisterMenu: () => {},
      },
      sprites: {
        loadSpriteDefinition: () => {},
        removeSprite: (instanceId: string) => {
          state.removedSpriteIds.push(instanceId);
        },
        createSpriteFromDefinition: () => ({}),
      },
      sceneTargets: {
        unregisterTarget: (instanceId: string) => {
          state.unregisteredTargetIds.push(instanceId);
        },
      },
      messages: {
        think: (instanceId: string, text: string | string[]) => {
          state.thoughtMessages.push(
            `${instanceId}:${Array.isArray(text) ? text.join('|') : text}`,
          );
        },
      },
      render: () => {
        state.renderCalls += 1;
      },
    },
    setInputEnabled: () => {},
  } as unknown as RoccoEngine;

  return { engine, state };
}

describe('RoccoDroppedInventoryController', () => {
  it('keeps dropped items scoped to their owning level', () => {
    const localization = createRoccoLocalization('en');
    const controller = new RoccoDroppedInventoryController({
      localization,
      resolvePlayerGroundPoint: () => undefined,
      resolvePlayerBaseScale: () => 1,
      tryAddItemToInventory: () => true,
    });
    const keys = createRoccoKeysInventoryItem(localization);
    const magazine = createRoccoMagazineInventoryItem(localization, false);

    controller.dropItem('pier-middle', keys, { x: 100, y: 200 });
    controller.dropItem('bait-shop', magazine, { x: 240, y: 300 });

    expect(controller.hasAccessibleItem('pier-middle', [], keys.id)).toBe(true);
    expect(controller.hasAccessibleItem('pier-middle', [], magazine.id)).toBe(false);
    expect(controller.listAccessibleItemIds('bait-shop', [])).toEqual([magazine.id]);
  });

  it('picks up a nearby dropped item immediately and clears its runtime presentation', () => {
    const localization = createRoccoLocalization('en');
    const tryAddItemToInventory = vi.fn(() => true);
    const controller = new RoccoDroppedInventoryController({
      localization,
      resolvePlayerGroundPoint: () => ({ x: 150, y: 260 }),
      resolvePlayerBaseScale: () => 1,
      tryAddItemToInventory,
    });
    const keys = createRoccoKeysInventoryItem(localization);
    const level = createLevel('pier-middle');
    const { engine, state } = createDroppedInventoryEngine();
    const spriteInstanceId = `rocco-dropped-inventory-sprite:${level.id}:${keys.id}`;

    controller.dropItem(level.id, keys, { x: 150, y: 260 });
    controller.syncActiveLevelPresentation(engine, level);

    const result = controller.handleSceneClick(engine, level, {
      kind: 'scene-click',
      sceneX: 150,
      sceneY: 260,
      targetInstanceId: spriteInstanceId,
    });

    expect(result).toEqual({ suppressDefaultPlayerMove: true });
    expect(tryAddItemToInventory).toHaveBeenCalledWith(expect.objectContaining({ id: keys.id }));
    expect(controller.hasAccessibleItem(level.id, [], keys.id)).toBe(false);
    expect(state.removedSpriteIds).toContain(spriteInstanceId);
    expect(state.unregisteredTargetIds).toContain(
      `rocco-dropped-inventory-target:${level.id}:${keys.id}`,
    );
    expect(state.thoughtMessages).toContain(
      `${DEFAULT_SPRITE_INSTANCE_ID}:${localization.text.inventory.pickupLine}`,
    );
  });
});
