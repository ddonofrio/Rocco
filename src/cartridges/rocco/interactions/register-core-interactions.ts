import type { InteractionRule } from './interaction-types';
import {
  isActionMenuAction,
  isGridMenuAction,
  isSceneClickAction,
  normalizeDisposition,
} from './interaction-types';
import { DEFAULT_SPRITE_INSTANCE_ID } from '../rocco-default-constants';
import {
  isRoccoPlayerInventoryAction,
  ROCCO_PLAYER_TALK_ACTION_ID,
} from '../rocco-player-action-menu';
import { roccoCartridgeMessageRuntime } from '../rpce/dialogue';

const DEVELOPER_PRIORITY = 600;
const INVENTORY_TOGGLE_PRIORITY = 500;
const SELF_TALK_PRIORITY = 400;

function createDeveloperPlayerActionRule(): InteractionRule {
  return {
    id: 'core-developer-player-action',
    ownerId: 'core.developer.player-action',
    priority: DEVELOPER_PRIORITY,
    kind: 'action-menu',
    matches: (context) =>
      context.sdk && isActionMenuAction(context.action)
        ? context.developerRuntime.canHandlePlayerAction(context.sdk, context.action)
        : false,
    execute: (context) => {
      const engine = context.sdk;
      if (!engine || !isActionMenuAction(context.action)) {
        return normalizeDisposition(undefined);
      }
      return normalizeDisposition(
        context.developerRuntime.handlePlayerAction(engine, context.action),
      );
    },
  };
}

function createDeveloperSceneClickRule(): InteractionRule {
  return {
    id: 'core-developer-scene-click',
    ownerId: 'core.developer.scene-click',
    priority: DEVELOPER_PRIORITY,
    kind: 'scene-click',
    stage: 'before-exit-intent',
    matches: (context) =>
      context.sdk && isSceneClickAction(context.action)
        ? context.developerRuntime.canHandleSceneClick(context.sdk, context.action)
        : false,
    execute: (context) => {
      const engine = context.sdk;
      if (!engine || !isSceneClickAction(context.action)) {
        return normalizeDisposition(undefined);
      }
      return normalizeDisposition(
        context.developerRuntime.handleSceneClick(engine, context.action),
      );
    },
  };
}

function createDeveloperGridMenuRule(): InteractionRule {
  return {
    id: 'core-developer-grid-menu',
    ownerId: 'core.developer.grid-menu',
    priority: DEVELOPER_PRIORITY,
    kind: 'grid-menu',
    matches: (context) =>
      context.sdk && isGridMenuAction(context.action)
        ? context.developerRuntime.canHandleGridMenuAction(context.sdk, context.action)
        : false,
    execute: (context) => {
      if (context.sdk && isGridMenuAction(context.action)) {
        context.developerRuntime.handleGridMenuAction(context.sdk, context.action);
      }
      return normalizeDisposition(undefined);
    },
  };
}

function createInventoryToggleRule(): InteractionRule {
  return {
    id: 'core-inventory-toggle',
    ownerId: 'core.inventory-toggle',
    priority: INVENTORY_TOGGLE_PRIORITY,
    kind: 'action-menu',
    matches: (context) =>
      isActionMenuAction(context.action) && isRoccoPlayerInventoryAction(context.action),
    execute: (context) => {
      const engine = context.sdk;
      if (!engine) {
        return normalizeDisposition(undefined);
      }
      context.developerRuntime.clearTransientState(engine);
      engine.video.actionMenus.closeMenu();
      context.inventoryRuntime.togglePlayerInventory(engine);
      return normalizeDisposition(undefined);
    },
  };
}

function createSelfTalkRule(): InteractionRule {
  return {
    id: 'core-self-talk',
    ownerId: 'core.self-talk',
    priority: SELF_TALK_PRIORITY,
    kind: 'action-menu',
    matches: (context) => {
      if (!isActionMenuAction(context.action)) {
        return false;
      }
      return (
        context.action.targetInstanceId === DEFAULT_SPRITE_INSTANCE_ID &&
        context.action.actionId === ROCCO_PLAYER_TALK_ACTION_ID
      );
    },
    execute: (context) => {
      const engine = context.sdk;
      if (!engine) {
        return normalizeDisposition(undefined);
      }
      roccoCartridgeMessageRuntime.think(
        engine,
        DEFAULT_SPRITE_INSTANCE_ID,
        context.localization.text.rocco.selfTalkLines,
        { ttlMs: 5200 },
        { count: 1, historyKey: 'rocco-self-talk', isAvoidImmediateRepeat: true },
      );
      return normalizeDisposition(undefined);
    },
  };
}

/**
 * Core interaction rules that are not owned by a specific map: developer mode
 * actions, the player self-inventory toggle, and self-talk. These used to live
 * inline in the central router; they are now distributed rules (audit DOM-002).
 */
export function createCoreInteractionRules(): readonly InteractionRule[] {
  return [
    createDeveloperPlayerActionRule(),
    createDeveloperSceneClickRule(),
    createDeveloperGridMenuRule(),
    createInventoryToggleRule(),
    createSelfTalkRule(),
  ];
}
