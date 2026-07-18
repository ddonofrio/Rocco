import type { InteractionRule } from './interaction-types';
import { isActionMenuAction, isSceneClickAction, normalizeDisposition } from './interaction-types';

const DROPPED_SCENE_CLICK_PRIORITY = 500;
const DROPPED_CORAL_RELIC_ACTION_MENU_PRIORITY = 200;

/**
 * Dropped-inventory interaction rules: picking up a dropped item on scene
 * click, and the coral-relic action menu on the toilet level. The toilet-level
 * guard is encapsulated in `canHandle*` predicates that use the level capability
 * instead of an `instanceof` cast.
 */
export function createDroppedInventoryInteractionRules(): readonly InteractionRule[] {
  return [
    {
      id: 'dropped-scene-click',
      ownerId: 'dropped.scene-click',
      priority: DROPPED_SCENE_CLICK_PRIORITY,
      kind: 'scene-click',
      stage: 'before-exit-intent',
      matches: (context) => {
        const engine = context.sdk;
        const activeLevel = context.activeLevel;
        if (!engine || !activeLevel || !isSceneClickAction(context.action)) {
          return false;
        }
        return context.droppedInventory.canHandleSceneClick(engine, activeLevel, context.action);
      },
      execute: (context) => {
        const engine = context.sdk;
        const activeLevel = context.activeLevel;
        if (!engine || !activeLevel || !isSceneClickAction(context.action)) {
          return normalizeDisposition(undefined);
        }
        return normalizeDisposition(
          context.droppedInventory.handleSceneClick(engine, activeLevel, context.action),
        );
      },
    },
    {
      id: 'dropped-coral-relic-action-menu',
      ownerId: 'dropped.coral-relic-action-menu',
      priority: DROPPED_CORAL_RELIC_ACTION_MENU_PRIORITY,
      kind: 'action-menu',
      matches: (context) => {
        const engine = context.sdk;
        const activeLevel = context.activeLevel;
        if (!engine || !activeLevel || !isActionMenuAction(context.action)) {
          return false;
        }
        return context.droppedInventory.canHandleActionMenu(engine, activeLevel, context.action);
      },
      execute: (context) => {
        const engine = context.sdk;
        const activeLevel = context.activeLevel;
        if (!engine || !activeLevel || !isActionMenuAction(context.action)) {
          return normalizeDisposition(undefined);
        }

        return normalizeDisposition(
          context.droppedInventory.handleActionMenu(engine, activeLevel, context.action),
        );
      },
    },
  ];
}
