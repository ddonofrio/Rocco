import type { InteractionRule } from './interaction-types';
import {
  isGridMenuAction,
  isSceneClickAction,
  normalizeDisposition,
} from './interaction-types';
import { tryLevelInventorySceneClick } from './register-level-interactions';

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
          return undefined;
        }
        const activation = context.action;
        const carriedItem = engine.video.gridMenus.getCarriedItem();
        if (!context.inventoryRuntime.shouldHandleSceneCarriedItem(carriedItem)) {
          return undefined;
        }
        if (tryLevelInventorySceneClick(context, carriedItem)) {
          return undefined;
        }
        return normalizeDisposition(context.inventoryRuntime.handleCarriedItemSceneClick(engine, activation));
      },
    },
    {
      id: 'inventory-grid-menu',
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
        return undefined;
      },
    },
  ];
}
