import { describe, expect, it, vi } from 'vitest';

import { createRoccoLocalization } from '../../../../src/cartridges/rocco/localization';
import {
  createRoccoKeysInventoryItem,
  RoccoInventory,
  ROCCO_INVENTORY_DROP_BUTTON_ID,
  ROCCO_INVENTORY_MENU_ID,
} from '../../../../src/cartridges/rocco/inventory';
import {
  RoccoInventoryRuntimeController,
} from '../../../../src/cartridges/rocco/levels/runtime/rocco-inventory-runtime-controller';
import type { RoccoEngine } from '../../../../src/engine/engine-sdk';

interface InventoryEngineState {
  carriedItem:
    | {
        definitionId: string;
        item: {
          id: string;
          label?: string;
          slotIndex?: number;
        };
      }
    | undefined;
  openedMenuIds: string[];
  clearedCarriedCount: number;
  renderCalls: number;
}

interface StoredDroppedInventoryItem {
  item: {
    id: string;
  };
  groundPoint: {
    x: number;
    y: number;
  };
}

function createInventoryEngine(initialCarriedItem?: InventoryEngineState['carriedItem']): {
  engine: RoccoEngine;
  state: InventoryEngineState;
} {
  const state: InventoryEngineState = {
    carriedItem: initialCarriedItem,
    openedMenuIds: [],
    clearedCarriedCount: 0,
    renderCalls: 0,
  };

  const engine = {
    video: {
      gridMenus: {
        getCarriedItem: () => state.carriedItem,
        clearCarriedItem: () => {
          state.carriedItem = undefined;
          state.clearedCarriedCount += 1;
        },
        openMenu: (definition: { id: string }) => {
          state.openedMenuIds.push(definition.id);
        },
        isOpen: () => true,
        closeMenu: () => {},
      },
      render: () => {
        state.renderCalls += 1;
      },
    },
  } as unknown as RoccoEngine;

  return { engine, state };
}

describe('RoccoInventoryRuntimeController', () => {
  it('returns the special scene-click action result without clearing the carried item', () => {
    const localization = createRoccoLocalization('en');
    const { engine, state } = createInventoryEngine({
      definitionId: ROCCO_INVENTORY_MENU_ID,
      item: {
        id: 'keys',
        label: localization.text.inventory.keysLabel,
      },
    });
    const actionResult = { suppressDefaultPlayerMove: true };
    const controller = new RoccoInventoryRuntimeController({
      localization,
      handleSpecialSceneClick: () => ({
        handled: true,
        actionResult,
      }),
    });

    const result = controller.handleCarriedItemSceneClick(engine, {
      kind: 'scene-click',
      sceneX: 120,
      sceneY: 180,
      targetInstanceId: 'bait-shop-door',
    });

    expect(result).toEqual(actionResult);
    expect(state.clearedCarriedCount).toBe(0);
  });

  it('clears the carried item when the player clicks empty scene space', () => {
    const localization = createRoccoLocalization('en');
    const { engine, state } = createInventoryEngine({
      definitionId: ROCCO_INVENTORY_MENU_ID,
      item: {
        id: 'keys',
        label: localization.text.inventory.keysLabel,
      },
    });
    const controller = new RoccoInventoryRuntimeController({
      localization,
    });

    controller.handleCarriedItemSceneClick(engine, {
      kind: 'scene-click',
      sceneX: 40,
      sceneY: 50,
    });

    expect(state.clearedCarriedCount).toBe(1);
    expect(state.renderCalls).toBe(1);
  });

  it('drops the carried inventory item into the active level and refreshes the world state', () => {
    const localization = createRoccoLocalization('en');
    const inventory = new RoccoInventory();
    const keys = createRoccoKeysInventoryItem(localization);
    inventory.addItem(keys);
    const menuDefinition = inventory.createGridMenuDefinition(localization);
    const carriedItem = menuDefinition.items.find((item) => item.id === keys.id);
    if (!carriedItem) {
      throw new Error('Expected the keys item to appear in the inventory grid menu.');
    }

    const { engine, state } = createInventoryEngine();
    const storeDroppedInventoryItem = vi.fn<
      (levelId: string, droppedItem: StoredDroppedInventoryItem) => boolean
    >();
    const syncWorldPresentation = vi.fn();
    const refreshStatus = vi.fn();
    const controller = new RoccoInventoryRuntimeController({
      localization,
      inventory,
      getActiveLevelId: () => 'pier-middle',
      resolveDroppedInventoryGroundPoint: () => ({ x: 320, y: 280 }),
      storeDroppedInventoryItem,
      syncWorldPresentation,
      refreshStatus,
    });

    const handled = controller.handleGridMenuAction(engine, {
      kind: 'grid-menu',
      definitionId: ROCCO_INVENTORY_MENU_ID,
      interaction: 'button',
      buttonId: ROCCO_INVENTORY_DROP_BUTTON_ID,
      carriedItem,
      items: menuDefinition.items,
    });

    expect(handled).toBe(true);
    expect(storeDroppedInventoryItem).toHaveBeenCalledOnce();
    const [[levelId, droppedItem]] = storeDroppedInventoryItem.mock.calls;
    expect(levelId).toBe('pier-middle');
    expect(droppedItem.item.id).toBe(keys.id);
    expect(droppedItem.groundPoint).toEqual({
      x: 320,
      y: 280,
    });
    expect(inventory.hasItem(keys.id)).toBe(false);
    expect(syncWorldPresentation).toHaveBeenCalledOnce();
    expect(refreshStatus).toHaveBeenCalled();
    expect(state.clearedCarriedCount).toBe(1);
    expect(state.openedMenuIds.at(-1)).toBe(ROCCO_INVENTORY_MENU_ID);
  });
});
