import { describe, expect, it, vi } from 'vitest';

import { createRoccoLocalization } from '../../../../src/cartridges/rocco/localization';
import {
  RoccoInventory,
  ROCCO_INVENTORY_MENU_ID,
} from '../../../../src/cartridges/rocco/inventory';
import { RoccoSceneActionRouter } from '../../../../src/cartridges/rocco/levels/runtime/rocco-scene-action-router';
import type { RoccoLevel } from '../../../../src/cartridges/rocco/levels/rocco-level-types';
import { DEFAULT_ROCCO_PLAYER_APPEARANCE } from '../../../../src/cartridges/rocco/rocco-player-appearance';
import type { RoccoEngine } from '../../../../src/console/engine-sdk';

function createLevel(overrides: Partial<RoccoLevel> = {}): RoccoLevel {
  return {
    id: 'pier-middle',
    title: 'Pier Middle',
    connectors: [],
    mount() {
      return Promise.reject(new Error('mount() is not used in scene-action-router tests.'));
    },
    unmount() {},
    update() {},
    handleAction() {},
    ...overrides,
  };
}

describe('RoccoSceneActionRouter', () => {
  it('updates exit intent before resolving a carried inventory scene click', () => {
    const localization = createRoccoLocalization('en');
    const callOrder: string[] = [];
    const actionResult = { suppressDefaultPlayerMove: true };
    const levelSceneClick = vi.fn();
    const activeLevel = createLevel({
      handleSceneClick: levelSceneClick,
    });
    const carriedItem = {
      definitionId: ROCCO_INVENTORY_MENU_ID,
      item: {
        id: 'keys',
        label: localization.text.inventory.keysLabel,
      },
    };
    const engine = {
      video: {
        gridMenus: {
          getCarriedItem: () => carriedItem,
        },
      },
    } as unknown as RoccoEngine;
    const transitions = {
      updatePendingExitIntent: vi.fn(() => {
        callOrder.push('exit-intent');
      }),
    };
    const inventoryRuntime = {
      shouldHandleSceneCarriedItem: vi.fn(() => {
        callOrder.push('inventory-check');
        return true;
      }),
      handleCarriedItemSceneClick: vi.fn(() => {
        callOrder.push('inventory');
        return actionResult;
      }),
      handleGridMenuAction: vi.fn(() => false),
      togglePlayerInventory: vi.fn(),
    };
    const droppedInventory = {
      canHandleSceneClick: vi.fn(() => {
        callOrder.push('dropped');
        return false;
      }),
      handleSceneClick: vi.fn(() => {
        return false;
      }),
      canHandleActionMenu: vi.fn(() => false),
      handleActionMenu: vi.fn(() => false),
    };
    const developerRuntime = {
      canHandleSceneClick: vi.fn(() => {
        callOrder.push('developer');
        return false;
      }),
      handleSceneClick: vi.fn(() => {
        return false;
      }),
      canHandleGridMenuAction: vi.fn(() => false),
      handleGridMenuAction: vi.fn(() => false),
      canHandlePlayerAction: vi.fn(() => false),
      handlePlayerAction: vi.fn(() => false),
      clearTransientState: vi.fn(),
    };
    const scriptedSequences = {
      hasBlockingSequence: vi.fn(() => false),
      hasPendingBaitShopDoorUse: vi.fn(() => false),
      cancelPendingBaitShopDoorUse: vi.fn(),
      startStanPoliceDefeat: vi.fn(),
      startStanMoneyExchange: vi.fn(),
      startBaitShopDoorUse: vi.fn(),
    };
    const router = new RoccoSceneActionRouter({
      localization,
      inventory: new RoccoInventory(),
      transitions: transitions as never,
      inventoryRuntime: inventoryRuntime as never,
      droppedInventory: droppedInventory as never,
      scriptedSequences: scriptedSequences as never,
      developerRuntime: developerRuntime as never,
      getEngine: () => engine,
      getActiveLevel: () => activeLevel,
      getRoccoAppearance: () => DEFAULT_ROCCO_PLAYER_APPEARANCE,
      setRoccoAppearance: vi.fn(),
      isStanIdentified: () => false,
      isStanAwake: () => false,
    });

    const result = router.handleAction({
      kind: 'scene-click',
      sceneX: 160,
      sceneY: 220,
    });

    expect(result).toEqual({ consumed: true, defaultPlayerMovement: 'suppress' });
    expect(callOrder).toEqual([
      'developer',
      'dropped',
      'exit-intent',
      'inventory-check',
      'inventory-check',
      'inventory',
    ]);
    expect(levelSceneClick).not.toHaveBeenCalled();
  });

  it('ignores normal routing while a blocking scripted sequence is active', () => {
    const localization = createRoccoLocalization('en');
    const levelAction = vi.fn();
    const activeLevel = createLevel({
      handleAction: levelAction,
    });
    const transitions = {
      updatePendingExitIntent: vi.fn(),
    };
    const inventoryRuntime = {
      shouldHandleSceneCarriedItem: vi.fn(() => false),
      handleCarriedItemSceneClick: vi.fn(),
      handleGridMenuAction: vi.fn(() => false),
      togglePlayerInventory: vi.fn(),
    };
    const droppedInventory = {
      canHandleSceneClick: vi.fn(() => false),
      handleSceneClick: vi.fn(() => false),
      canHandleActionMenu: vi.fn(() => false),
      handleActionMenu: vi.fn(() => false),
    };
    const developerRuntime = {
      canHandleSceneClick: vi.fn(() => false),
      handleSceneClick: vi.fn(() => false),
      canHandleGridMenuAction: vi.fn(() => false),
      handleGridMenuAction: vi.fn(() => false),
      canHandlePlayerAction: vi.fn(() => false),
      handlePlayerAction: vi.fn(() => false),
      clearTransientState: vi.fn(),
    };
    const scriptedSequences = {
      hasBlockingSequence: vi.fn(() => true),
      hasPendingBaitShopDoorUse: vi.fn(() => false),
      cancelPendingBaitShopDoorUse: vi.fn(),
      startStanPoliceDefeat: vi.fn(),
      startStanMoneyExchange: vi.fn(),
      startBaitShopDoorUse: vi.fn(),
    };
    const router = new RoccoSceneActionRouter({
      localization,
      inventory: new RoccoInventory(),
      transitions: transitions as never,
      inventoryRuntime: inventoryRuntime as never,
      droppedInventory: droppedInventory as never,
      scriptedSequences: scriptedSequences as never,
      developerRuntime: developerRuntime as never,
      getEngine: () => null,
      getActiveLevel: () => activeLevel,
      getRoccoAppearance: () => DEFAULT_ROCCO_PLAYER_APPEARANCE,
      setRoccoAppearance: vi.fn(),
      isStanIdentified: () => false,
      isStanAwake: () => false,
    });

    const result = router.handleAction({
      targetInstanceId: 'prop',
      targetDefinitionId: 'prop-definition',
      definitionId: 'menu',
      actionId: 'look',
      itemId: 'look',
    });

    expect(result).toEqual({ consumed: true, defaultPlayerMovement: 'suppress' });
    expect(scriptedSequences.hasPendingBaitShopDoorUse).not.toHaveBeenCalled();
    expect(transitions.updatePendingExitIntent).not.toHaveBeenCalled();
    expect(droppedInventory.handleSceneClick).not.toHaveBeenCalled();
    expect(developerRuntime.handlePlayerAction).not.toHaveBeenCalled();
    expect(levelAction).not.toHaveBeenCalled();
  });

  it('routes advance-sequence through the active level even while a blocking scripted sequence is active', () => {
    const levelSceneClick = vi.fn(() => ({
      suppressDefaultPlayerMove: true,
    }));
    const activeLevel = createLevel({
      handleSceneClick: levelSceneClick,
    });
    const router = new RoccoSceneActionRouter({
      localization: createRoccoLocalization('en'),
      inventory: new RoccoInventory(),
      transitions: {
        updatePendingExitIntent: vi.fn(),
      } as never,
      inventoryRuntime: {
        shouldHandleSceneCarriedItem: vi.fn(() => false),
        handleCarriedItemSceneClick: vi.fn(),
        handleGridMenuAction: vi.fn(() => false),
        togglePlayerInventory: vi.fn(),
      } as never,
      droppedInventory: {
        canHandleSceneClick: vi.fn(() => false),
        handleSceneClick: vi.fn(() => false),
        canHandleActionMenu: vi.fn(() => false),
        handleActionMenu: vi.fn(() => false),
      } as never,
      scriptedSequences: {
        hasBlockingSequence: vi.fn(() => true),
        hasPendingBaitShopDoorUse: vi.fn(() => false),
        cancelPendingBaitShopDoorUse: vi.fn(),
        startStanPoliceDefeat: vi.fn(),
        startStanMoneyExchange: vi.fn(),
        startBaitShopDoorUse: vi.fn(),
      } as never,
      developerRuntime: {
        canHandleSceneClick: vi.fn(() => false),
        handleSceneClick: vi.fn(() => false),
        canHandleGridMenuAction: vi.fn(() => false),
        handleGridMenuAction: vi.fn(() => false),
        canHandlePlayerAction: vi.fn(() => false),
        handlePlayerAction: vi.fn(() => false),
        clearTransientState: vi.fn(),
      } as never,
      getEngine: () => null,
      getActiveLevel: () => activeLevel,
      getRoccoAppearance: () => DEFAULT_ROCCO_PLAYER_APPEARANCE,
      setRoccoAppearance: vi.fn(),
      isStanIdentified: () => false,
      isStanAwake: () => false,
    });

    const result = router.handleAction({
      kind: 'advance-sequence',
    });

    expect(result).toEqual({ consumed: true, defaultPlayerMovement: 'suppress' });
    expect(levelSceneClick).toHaveBeenCalledWith({
      kind: 'scene-click',
      sceneX: 0,
      sceneY: 0,
    });
  });

  it('routes carry-use with the carried-item payload instead of re-reading grid menu state', () => {
    const carriedItem = {
      definitionId: ROCCO_INVENTORY_MENU_ID,
      item: {
        id: 'rocco-bata',
        label: 'Lab coat',
      },
    };
    const inventoryRuntime = {
      shouldHandleSceneCarriedItem: vi.fn((item) => item === carriedItem),
      handleCarriedItemSceneClick: vi.fn(() => ({ suppressDefaultPlayerMove: true })),
      handleGridMenuAction: vi.fn(() => false),
      togglePlayerInventory: vi.fn(),
    };
    const router = new RoccoSceneActionRouter({
      localization: createRoccoLocalization('en'),
      inventory: new RoccoInventory(),
      transitions: {
        updatePendingExitIntent: vi.fn(),
      } as never,
      inventoryRuntime: inventoryRuntime as never,
      droppedInventory: {
        canHandleSceneClick: vi.fn(() => false),
        handleSceneClick: vi.fn(() => false),
        canHandleActionMenu: vi.fn(() => false),
        handleActionMenu: vi.fn(() => false),
      } as never,
      scriptedSequences: {
        hasBlockingSequence: vi.fn(() => false),
        hasPendingBaitShopDoorUse: vi.fn(() => false),
        cancelPendingBaitShopDoorUse: vi.fn(),
        startStanPoliceDefeat: vi.fn(),
        startStanMoneyExchange: vi.fn(),
        startBaitShopDoorUse: vi.fn(),
      } as never,
      developerRuntime: {
        canHandleSceneClick: vi.fn(() => false),
        handleSceneClick: vi.fn(() => false),
        canHandleGridMenuAction: vi.fn(() => false),
        handleGridMenuAction: vi.fn(() => false),
        canHandlePlayerAction: vi.fn(() => false),
        handlePlayerAction: vi.fn(() => false),
        clearTransientState: vi.fn(),
      } as never,
      getEngine: () =>
        ({
          video: {
            gridMenus: {
              getCarriedItem: () => {},
            },
          },
        }) as unknown as RoccoEngine,
      getActiveLevel: () => null,
      getRoccoAppearance: () => DEFAULT_ROCCO_PLAYER_APPEARANCE,
      setRoccoAppearance: vi.fn(),
      isStanIdentified: () => false,
      isStanAwake: () => false,
    });

    const result = router.handleAction({
      kind: 'carry-use',
      gridMenuActivation: {
        kind: 'grid-menu',
        definitionId: ROCCO_INVENTORY_MENU_ID,
        interaction: 'carry',
        items: [],
      },
      sceneClick: {
        kind: 'scene-click',
        sceneX: 160,
        sceneY: 220,
        targetInstanceId: 'stan',
        targetDefinitionId: 'stan-definition',
      },
      carriedItem,
    });

    expect(result).toEqual({ consumed: true, defaultPlayerMovement: 'suppress' });
    expect(inventoryRuntime.shouldHandleSceneCarriedItem).toHaveBeenCalledWith(carriedItem);
    expect(inventoryRuntime.handleCarriedItemSceneClick).toHaveBeenCalledWith(
      expect.anything(),
      {
        kind: 'scene-click',
        sceneX: 160,
        sceneY: 220,
        targetInstanceId: 'stan',
        targetDefinitionId: 'stan-definition',
      },
      carriedItem,
    );
  });
});
