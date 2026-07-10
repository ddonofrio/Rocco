import { describe, expect, it, vi } from 'vitest';

import { createRoccoLocalization } from '../../../../src/cartridges/rocco/localization';
import {
  createRoccoCoralRelicInventoryItem,
  createRoccoKeysInventoryItem,
  createRoccoMagazineInventoryItem,
} from '../../../../src/cartridges/rocco/inventory';
import { RoccoDroppedInventoryController } from '../../../../src/cartridges/rocco/levels/runtime/rocco-dropped-inventory-controller';
import type { RoccoLevel } from '../../../../src/cartridges/rocco/levels/rocco-level-types';
import type { RoccoEngine } from '../../../../src/console/engine-sdk';
import { DEFAULT_SPRITE_INSTANCE_ID } from '../../../../src/cartridges/rocco/rocco-default-constants';

interface DroppedEngineState {
  thoughtMessages: string[];
  removedSpriteIds: string[];
  unregisteredTargetIds: string[];
  renderCalls: number;
  registeredActionMenuIds: string[];
  carriedItem: { itemId: string } | undefined;
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
    registeredActionMenuIds: [],
    carriedItem: undefined,
  };

  const engine = {
    video: {
      gridMenus: {
        getCarriedItem: () => state.carriedItem,
        clearCarriedItem: () => {
          state.carriedItem = undefined;
        },
      },
      actionMenus: {
        registerMenu: (definition: { id: string }) => {
          state.registeredActionMenuIds.push(definition.id);
        },
        unregisterMenu: (menuId: string) => {
          state.registeredActionMenuIds = state.registeredActionMenuIds.filter((id) => id !== menuId);
        },
        closeMenu: () => {},
      },
      sprites: {
        loadSpriteDefinition: () => {},
        removeSprite: (instanceId: string) => {
          state.removedSpriteIds.push(instanceId);
        },
        createSpriteFromDefinition: () => ({}),
        setPosition: () => {},
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

  it('shows the coral relic action menu with look, step, and grab during toilet urgency', () => {
    const localization = createRoccoLocalization('es');
    const controller = new RoccoDroppedInventoryController({
      localization,
      resolvePlayerGroundPoint: () => ({ x: 150, y: 260 }),
      resolvePlayerBaseScale: () => 1,
      tryAddItemToInventory: () => true,
    });
    const relic = createRoccoCoralRelicInventoryItem(localization);
    const level: RoccoLevel = {
      id: 'bait-shop-toilet',
      title: 'bait-shop-toilet',
      connectors: [],
      mount() {
        return Promise.reject(
          new Error('mount() is not used in dropped-inventory controller unit tests.'),
        );
      },
      unmount() {},
      update() {},
      handleAction() {},
      isEscapeUrgencyActive: () => true,
      openCoralRelicWishMenu: () => {},
    };
    const { engine, state } = createDroppedInventoryEngine();

    controller.dropItem(level.id, relic, { x: 150, y: 260 });
    expect(level.id).toBe('bait-shop-toilet');
    controller.syncActiveLevelPresentation(engine, level);

    expect(state.registeredActionMenuIds).toContain('rocco-dropped-coral-relic-action-menu');
  });

  it('shows the coral relic look line on look action during toilet urgency', () => {
    const localization = createRoccoLocalization('es');
    const controller = new RoccoDroppedInventoryController({
      localization,
      resolvePlayerGroundPoint: () => ({ x: 150, y: 260 }),
      resolvePlayerBaseScale: () => 1,
      tryAddItemToInventory: () => true,
    });
    const relic = createRoccoCoralRelicInventoryItem(localization);
    const level: RoccoLevel = {
      id: 'bait-shop-toilet',
      title: 'bait-shop-toilet',
      connectors: [],
      mount() {
        return Promise.reject(
          new Error('mount() is not used in dropped-inventory controller unit tests.'),
        );
      },
      unmount() {},
      update() {},
      handleAction() {},
      isEscapeUrgencyActive: () => true,
      openCoralRelicWishMenu: () => {},
    };
    const { engine, state } = createDroppedInventoryEngine();

    controller.dropItem(level.id, relic, { x: 150, y: 260 });
    controller.syncActiveLevelPresentation(engine, level);

    const handled = controller.handleActionMenu(engine, level, {
      definitionId: 'rocco-dropped-coral-relic-action-menu',
      targetInstanceId: 'rocco-dropped-inventory-sprite:bait-shop-toilet:rocco-coral-relic',
      targetDefinitionId: 'rocco-dropped-inventory-definition:rocco-coral-relic',
      actionId: 'look',
      itemId: 'look',
    });

    expect(handled).toBe(true);
    expect(state.thoughtMessages).toContain(
      `rocco-dropped-inventory-sprite:bait-shop-toilet:rocco-coral-relic:${localization.text.baitShop.coralRelicLookLine}`,
    );
  });

  it('refuses to grab the coral relic and rotates refusal lines during toilet urgency', () => {
    const localization = createRoccoLocalization('es');
    const controller = new RoccoDroppedInventoryController({
      localization,
      resolvePlayerGroundPoint: () => ({ x: 150, y: 260 }),
      resolvePlayerBaseScale: () => 1,
      tryAddItemToInventory: () => true,
    });
    const relic = createRoccoCoralRelicInventoryItem(localization);
    const level: RoccoLevel = {
      id: 'bait-shop-toilet',
      title: 'bait-shop-toilet',
      connectors: [],
      mount() {
        return Promise.reject(
          new Error('mount() is not used in dropped-inventory controller unit tests.'),
        );
      },
      unmount() {},
      update() {},
      handleAction() {},
      isEscapeUrgencyActive: () => true,
      openCoralRelicWishMenu: () => {},
    };
    const { engine, state } = createDroppedInventoryEngine();

    controller.dropItem(level.id, relic, { x: 150, y: 260 });
    controller.syncActiveLevelPresentation(engine, level);

    const handled = controller.handleActionMenu(engine, level, {
      definitionId: 'rocco-dropped-coral-relic-action-menu',
      targetInstanceId: 'rocco-dropped-inventory-sprite:bait-shop-toilet:rocco-coral-relic',
      targetDefinitionId: 'rocco-dropped-inventory-definition:rocco-coral-relic',
      actionId: 'grab',
      itemId: 'grab',
    });

    expect(handled).toBe(true);
    expect(state.thoughtMessages).toContain(
      `rocco-dropped-inventory-sprite:bait-shop-toilet:rocco-coral-relic:${localization.text.baitShop.coralRelicRefuseLines[0]}`,
    );

    const handledSecond = controller.handleActionMenu(engine, level, {
      definitionId: 'rocco-dropped-coral-relic-action-menu',
      targetInstanceId: 'rocco-dropped-inventory-sprite:bait-shop-toilet:rocco-coral-relic',
      targetDefinitionId: 'rocco-dropped-inventory-definition:rocco-coral-relic',
      actionId: 'grab',
      itemId: 'grab',
    });

    expect(handledSecond).toBe(true);
    expect(state.thoughtMessages).toContain(
      `rocco-dropped-inventory-sprite:bait-shop-toilet:rocco-coral-relic:${localization.text.baitShop.coralRelicRefuseLines[1]}`,
    );
  });

  it('opens the coral relic wish menu on step action during toilet urgency', () => {
    const localization = createRoccoLocalization('es');
    const controller = new RoccoDroppedInventoryController({
      localization,
      resolvePlayerGroundPoint: () => ({ x: 150, y: 260 }),
      resolvePlayerBaseScale: () => 1,
      tryAddItemToInventory: () => true,
    });
    const relic = createRoccoCoralRelicInventoryItem(localization);
    const level: RoccoLevel = {
      id: 'bait-shop-toilet',
      title: 'bait-shop-toilet',
      connectors: [],
      mount() {
        return Promise.reject(
          new Error('mount() is not used in dropped-inventory controller unit tests.'),
        );
      },
      unmount() {},
      update() {},
      handleAction() {},
      isEscapeUrgencyActive: () => true,
      openCoralRelicWishMenu: () => {},
    };
    const { engine } = createDroppedInventoryEngine();

    controller.dropItem(level.id, relic, { x: 150, y: 260 });
    controller.syncActiveLevelPresentation(engine, level);

    const handled = controller.handleActionMenu(engine, level, {
      definitionId: 'rocco-dropped-coral-relic-action-menu',
      targetInstanceId: 'rocco-dropped-inventory-sprite:bait-shop-toilet:rocco-coral-relic',
      targetDefinitionId: 'rocco-dropped-inventory-definition:rocco-coral-relic',
      actionId: 'step',
      itemId: 'step',
    });

    expect(handled).toBe(true);
  });
});
