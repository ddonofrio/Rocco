import type { InteractionRule } from './interaction-types';
import {
  isCarryUseAction,
  isGridMenuAction,
  isSceneClickAction,
  normalizeDisposition,
} from './interaction-types';
import { isLevelInventorySceneClick } from './register-level-interactions';

const CARRIED_ITEM_SCENE_CLICK_PRIORITY = 100;
const INVENTORY_GRID_MENU_PRIORITY = 500;

/**
 * Inventory-owned interaction rules: the carried-item scene click (which first
 * offers the active level a chance via `handleInventorySceneClick`, then runs
 * the inventory runtime's default carried-item handling) and the inventory
 * grid menu (player inventory + storage transfer sessions).
 */
export function createInventoryInteractionRules(): readonly InteractionRule[] {
  return [
    {
      id: 'inventory-carried-scene-click',
      ownerId: 'inventory.carried-scene-click',
      priority: CARRIED_ITEM_SCENE_CLICK_PRIORITY,
      kind: 'scene-click',
      matches: (context) => {
        const engine = context.engine;
        if (!engine || !isSceneClickAction(context.action)) {
          return false;
        }
        return context.inventoryRuntime.shouldHandleSceneCarriedItem(engine.video.gridMenus.getCarriedItem());
      },
      execute: (context) => {
        const engine = context.engine;
        if (!engine || !isSceneClickAction(context.action)) {
          return normalizeDisposition(undefined);
        }
        const activation = context.action;
        const carriedItem = engine.video.gridMenus.getCarriedItem();
        if (!context.inventoryRuntime.shouldHandleSceneCarriedItem(carriedItem)) {
          return normalizeDisposition(undefined);
        }
        if (isLevelInventorySceneClick(context, activation, carriedItem)) {
          return normalizeDisposition(undefined);
        }
        return normalizeDisposition(
          context.inventoryRuntime.handleCarriedItemSceneClick(engine, activation, carriedItem),
        );
      },
    },
    {
      id: 'inventory-carry-use',
      ownerId: 'inventory.carry-use',
      priority: CARRIED_ITEM_SCENE_CLICK_PRIORITY,
      kind: 'carry-use',
      matches: (context) =>
        isCarryUseAction(context.action) &&
        context.inventoryRuntime.shouldHandleSceneCarriedItem(context.action.carriedItem),
      execute: (context) => {
        const engine = context.engine;
        if (!engine || !isCarryUseAction(context.action)) {
          return normalizeDisposition(undefined);
        }
        const activation = context.action.sceneClick;
        const carriedItem = context.action.carriedItem;
        if (isLevelInventorySceneClick(context, activation, carriedItem)) {
          return normalizeDisposition(undefined);
        }
        return normalizeDisposition(
          context.inventoryRuntime.handleCarriedItemSceneClick(engine, activation, carriedItem),
        );
      },
    },
    {
      id: 'inventory-grid-menu',
      ownerId: 'inventory.grid-menu',
      priority: INVENTORY_GRID_MENU_PRIORITY,
      kind: 'grid-menu',
      matches: (context) =>
        context.engine && isGridMenuAction(context.action)
          ? context.inventoryRuntime.canHandleGridMenuAction(context.action)
          : false,
      execute: (context) => {
        if (context.engine && isGridMenuAction(context.action)) {
          context.inventoryRuntime.handleGridMenuAction(context.engine, context.action);
        }
        return normalizeDisposition(undefined);
      },
    },
  ];
}
