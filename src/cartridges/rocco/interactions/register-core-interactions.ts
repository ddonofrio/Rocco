import type { InteractionRule } from './interaction-types';
import {
  isActionMenuAction,
  isGridMenuAction,
  isSceneClickAction,
  normalizeDisposition,
} from './interaction-types';
import { DEFAULT_SPRITE_INSTANCE_ID } from '../rocco-default-constants';
import { isRoccoPlayerInventoryAction, ROCCO_PLAYER_TALK_ACTION_ID } from '../rocco-player-action-menu';
import { roccoCartridgeMessageRuntime } from '../rpce/dialogue';

const DEVELOPER_PRIORITY = 600;
const INVENTORY_TOGGLE_PRIORITY = 500;
const SELF_TALK_PRIORITY = 400;

/**
 * Core interaction rules that are not owned by a specific map: developer mode
 * actions, the player self-inventory toggle, and self-talk. These used to live
 * inline in the central router; they are now distributed rules (audit DOM-002).
 */
export function createCoreInteractionRules(): readonly InteractionRule[] {
  return [
    {
      id: 'core-developer-player-action',
      priority: DEVELOPER_PRIORITY,
      kind: 'action-menu',
      matches: (context) =>
        context.engine && isActionMenuAction(context.action)
          ? context.developerRuntime.canHandlePlayerAction(context.engine, context.action)
          : false,
      execute: (context) => {
        const engine = context.engine;
        if (!engine || !isActionMenuAction(context.action)) {
          return undefined;
        }
        return normalizeDisposition(context.developerRuntime.handlePlayerAction(engine, context.action));
      },
    },
    {
      id: 'core-developer-scene-click',
      priority: DEVELOPER_PRIORITY,
      kind: 'scene-click',
      stage: 'before-exit-intent',
      matches: (context) =>
        context.engine && isSceneClickAction(context.action)
          ? context.developerRuntime.canHandleSceneClick(context.engine, context.action)
          : false,
      execute: (context) => {
        const engine = context.engine;
        if (!engine || !isSceneClickAction(context.action)) {
          return undefined;
        }
        return normalizeDisposition(context.developerRuntime.handleSceneClick(engine, context.action));
      },
    },
    {
      id: 'core-developer-grid-menu',
      priority: DEVELOPER_PRIORITY,
      kind: 'grid-menu',
      matches: (context) =>
        context.engine && isGridMenuAction(context.action)
          ? context.developerRuntime.canHandleGridMenuAction(context.engine, context.action)
          : false,
      execute: (context) => {
        if (context.engine && isGridMenuAction(context.action)) {
          context.developerRuntime.handleGridMenuAction(context.engine, context.action);
        }
        return undefined;
      },
    },
    {
      id: 'core-inventory-toggle',
      priority: INVENTORY_TOGGLE_PRIORITY,
      kind: 'action-menu',
      matches: (context) => isActionMenuAction(context.action) && isRoccoPlayerInventoryAction(context.action),
      execute: (context) => {
        const engine = context.engine;
        if (!engine) {
          return undefined;
        }
        context.developerRuntime.clearTransientState(engine);
        engine.setInputEnabled(true);
        engine.video.actionMenus.closeMenu();
        context.inventoryRuntime.togglePlayerInventory(engine);
        return undefined;
      },
    },
    {
      id: 'core-self-talk',
      priority: SELF_TALK_PRIORITY,
      kind: 'action-menu',
      matches: (context) => {
        if (!isActionMenuAction(context.action)) {
          return false;
        }

        const activation = context.action;
        return (
          activation.targetInstanceId === DEFAULT_SPRITE_INSTANCE_ID &&
          activation.actionId === ROCCO_PLAYER_TALK_ACTION_ID
        );
      },
      execute: (context) => {
        const engine = context.engine;
        if (!engine) {
          return undefined;
        }
        roccoCartridgeMessageRuntime.think(
          engine,
          DEFAULT_SPRITE_INSTANCE_ID,
          context.localization.text.rocco.selfTalkLines,
          { ttlMs: 5200 },
          {
            count: 1,
            historyKey: 'rocco-self-talk',
            avoidImmediateRepeat: true,
          },
        );
        engine.video.render(0);
        return undefined;
      },
    },
  ];
}
