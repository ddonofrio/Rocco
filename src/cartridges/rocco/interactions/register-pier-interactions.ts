import type {
  InteractionContext,
  InteractionRule,
  SpecialInventorySceneClickRule,
} from './interaction-types';
import { isActionMenuAction, isSceneClickAction, normalizeDisposition } from './interaction-types';
import {
  DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_STAN_SPRITE_INSTANCE_ID,
  ROCCO_PIER_START_LEVEL_ID,
} from '../rocco-default-constants';
import {
  ROCCO_INVENTORY_BATA_ITEM_ID,
  ROCCO_INVENTORY_KEYS_ITEM_ID,
  ROCCO_INVENTORY_MENU_ID,
  ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
} from '../inventory';
import { applyDefaultSpriteAppearance } from '../rocco-default-sprites';
import { ROCCO_LAB_COAT_PLAYER_APPEARANCE } from '../rocco-player-appearance';
import { resolveKeyLockedDoorLines } from '../levels/key-locked-door-lines';
import { roccoCartridgeMessageRuntime } from '../rpce/dialogue';

const PIER_DOOR_VARIANT_MESSAGE_TTL_MS = 5200;
const PIER_DOOR_ACTION_PRIORITY = 300;
const PIER_SPECIAL_SCENE_CLICK_PRIORITY = 300;
const PIER_DOOR_ACTION_IDS = new Set(['look', 'open', 'kick']);

function isPierStart(context: InteractionContext): boolean {
  return context.activeLevel?.id === ROCCO_PIER_START_LEVEL_ID;
}

function showRoccoThoughtVariant(
  engine: InteractionContext['sdk'],
  lines: readonly string[],
  historyKey: string,
): void {
  if (!engine) {
    return;
  }

  roccoCartridgeMessageRuntime.think(
    engine,
    DEFAULT_SPRITE_INSTANCE_ID,
    [...lines],
    {
      ttlMs: PIER_DOOR_VARIANT_MESSAGE_TTL_MS,
    },
    {
      count: 1,
      historyKey,
      isAvoidImmediateRepeat: true,
    },
  );
}

function resolvePierDoorKickLines(context: InteractionContext): readonly string[] {
  if (context.isStanAwake()) {
    return context.localization.text.pierDoor.kickAwakeLines;
  }

  return context.isStanIdentified()
    ? context.localization.text.pierDoor.kickSleepingKnownStanLines
    : context.localization.text.pierDoor.kickSleepingUnknownStanLines;
}

function resolvePierDoorKickHistoryVariant(
  context: InteractionContext,
): 'awake' | 'known' | 'unknown' {
  if (context.isStanAwake()) {
    return 'awake';
  }

  if (context.isStanIdentified()) {
    return 'known';
  }

  return 'unknown';
}

/**
 * Pier bait shop door action-menu rule (look / open / kick). Encapsulates the
 * pier-specific door IDs so the central router no longer imports them
 * (audit DOM-002). Registered as an action-menu rule so it shares the same
 * pipeline order as the other action-menu rules.
 */
export function createPierActionMenuRules(): readonly InteractionRule[] {
  return [
    {
      id: 'pier-bait-shop-door-action',
      ownerId: 'pier.bait-shop-door-action',
      priority: PIER_DOOR_ACTION_PRIORITY,
      kind: 'action-menu',
      matches: (context) => {
        if (!isActionMenuAction(context.action)) {
          return false;
        }

        const activation = context.action;
        return (
          isPierStart(context) &&
          activation.targetInstanceId === DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID &&
          PIER_DOOR_ACTION_IDS.has(activation.actionId)
        );
      },
      execute: (context) => {
        const engine = context.sdk;
        if (!engine || !isPierStart(context) || !isActionMenuAction(context.action)) {
          return normalizeDisposition(undefined);
        }

        const activation = context.action;
        if (activation.actionId === 'look') {
          showRoccoThoughtVariant(
            engine,
            resolveKeyLockedDoorLines({
              hasMatchingKey: context.inventory.hasItem(ROCCO_INVENTORY_KEYS_ITEM_ID),
              withKeyLines: context.localization.text.pierDoor.lookWithKeyLines,
              withoutKeyLines: context.localization.text.pierDoor.lookWithoutKeyLines,
            }),
            `pier-bait-shop-door-look:${context.inventory.hasItem(ROCCO_INVENTORY_KEYS_ITEM_ID) ? 'has-key' : 'no-key'}`,
          );
          return normalizeDisposition(true);
        }

        if (activation.actionId === 'open') {
          showRoccoThoughtVariant(
            engine,
            resolveKeyLockedDoorLines({
              hasMatchingKey: context.inventory.hasItem(ROCCO_INVENTORY_KEYS_ITEM_ID),
              withKeyLines: context.localization.text.pierDoor.openWithKeyLines,
              withoutKeyLines: context.localization.text.pierDoor.openWithoutKeyLines,
            }),
            `pier-bait-shop-door-open:${context.inventory.hasItem(ROCCO_INVENTORY_KEYS_ITEM_ID) ? 'has-key' : 'no-key'}`,
          );
          return normalizeDisposition(true);
        }

        showRoccoThoughtVariant(
          engine,
          resolvePierDoorKickLines(context),
          `pier-bait-shop-door-kick:${resolvePierDoorKickHistoryVariant(context)}`,
        );
        return normalizeDisposition(true);
      },
    },
  ];
}

function createBaitShopDoorUseRule(): SpecialInventorySceneClickRule {
  return {
    id: 'pier-bait-shop-door-use',
    ownerId: 'pier.bait-shop-door-use',
    priority: PIER_SPECIAL_SCENE_CLICK_PRIORITY,
    matches: (context, carriedItem) =>
      isPierStart(context) &&
      isSceneClickAction(context.action) &&
      carriedItem.item.id === ROCCO_INVENTORY_KEYS_ITEM_ID &&
      context.action.targetInstanceId === DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID,
    execute: (context) => {
      const engine = context.sdk;
      const activeLevel = context.activeLevel;
      if (!engine || !activeLevel || !isPierStart(context)) {
        return { handled: false };
      }
      context.scriptedSequences.startBaitShopDoorUse(engine, activeLevel.id);
      return { handled: true, actionResult: { suppressDefaultPlayerMove: true } };
    },
  };
}

function createStanPoliceDefeatRule(): SpecialInventorySceneClickRule {
  return {
    id: 'pier-stan-police-defeat',
    ownerId: 'pier.stan-police-defeat',
    priority: PIER_SPECIAL_SCENE_CLICK_PRIORITY,
    matches: (context, carriedItem) =>
      isPierStart(context) &&
      isSceneClickAction(context.action) &&
      carriedItem.item.id === ROCCO_INVENTORY_KEYS_ITEM_ID &&
      context.action.targetInstanceId === DEFAULT_STAN_SPRITE_INSTANCE_ID,
    execute: (context) => {
      const engine = context.sdk;
      if (!engine) {
        return { handled: false };
      }
      if (!context.isStanAwake()) {
        showRoccoThoughtVariant(
          engine,
          context.localization.text.inventory.keysOnStanSleepingLines,
          'pier-stan-keys-sleeping',
        );
        engine.video.gridMenus.clearCarriedItem();
        return { handled: true, actionResult: { suppressDefaultPlayerMove: true } };
      }
      context.scriptedSequences.startStanPoliceDefeat(engine);
      return { handled: true };
    },
  };
}

function createStanMoneyRule(): SpecialInventorySceneClickRule {
  return {
    id: 'pier-stan-money',
    ownerId: 'pier.stan-money',
    priority: PIER_SPECIAL_SCENE_CLICK_PRIORITY,
    matches: (context, carriedItem) =>
      isPierStart(context) &&
      isSceneClickAction(context.action) &&
      carriedItem.item.id === ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID &&
      context.action.targetInstanceId === DEFAULT_STAN_SPRITE_INSTANCE_ID,
    execute: (context) => {
      const engine = context.sdk;
      if (!engine) {
        return { handled: false };
      }
      if (!context.isStanAwake()) {
        showRoccoThoughtVariant(
          engine,
          context.localization.text.inventory.moneyOnStanSleepingLines,
          'pier-stan-money-sleeping',
        );
        engine.video.gridMenus.clearCarriedItem();
        return { handled: true, actionResult: { suppressDefaultPlayerMove: true } };
      }
      context.inventory.removeItem(ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID);
      context.scriptedSequences.startStanMoneyExchange(engine);
      return { handled: true };
    },
  };
}

function createLabCoatEquipRule(): SpecialInventorySceneClickRule {
  return {
    id: 'pier-lab-coat-equip',
    ownerId: 'pier.lab-coat-equip',
    priority: PIER_SPECIAL_SCENE_CLICK_PRIORITY,
    matches: (context, carriedItem) =>
      isSceneClickAction(context.action) &&
      carriedItem.item.id === ROCCO_INVENTORY_BATA_ITEM_ID &&
      context.action.targetInstanceId === DEFAULT_SPRITE_INSTANCE_ID,
    execute: (context) => {
      const engine = context.sdk;
      if (!engine) {
        return { handled: false };
      }
      const inputLease = engine.acquireInputLease('pier-lab-coat-equip', 'blocked');
      let shouldClearCarriedItem = false;
      try {
        if (context.getRoccoAppearance() === ROCCO_LAB_COAT_PLAYER_APPEARANCE) {
          roccoCartridgeMessageRuntime.think(
            engine,
            DEFAULT_SPRITE_INSTANCE_ID,
            [context.localization.text.inventory.bataAlreadyOnSelfLine],
            { ttlMs: 3200 },
            {
              count: 1,
              historyKey: 'inventory-bata-self-already-wearing',
              isAvoidImmediateRepeat: true,
            },
          );
          shouldClearCarriedItem = true;
          return { handled: true, actionResult: { suppressDefaultPlayerMove: true } };
        }

        applyDefaultSpriteAppearance(
          engine,
          ROCCO_LAB_COAT_PLAYER_APPEARANCE,
          context.localization,
        );
        context.setRoccoAppearance(ROCCO_LAB_COAT_PLAYER_APPEARANCE);
        context.inventory.removeItem(ROCCO_INVENTORY_BATA_ITEM_ID);
        if (engine.video.gridMenus.isOpen(ROCCO_INVENTORY_MENU_ID)) {
          engine.video.gridMenus.openMenu(
            context.inventory.createGridMenuDefinition(context.localization),
          );
        }
        roccoCartridgeMessageRuntime.think(
          engine,
          DEFAULT_SPRITE_INSTANCE_ID,
          [context.localization.text.inventory.bataOnSelfLine],
          { ttlMs: 3200 },
          { count: 1, historyKey: 'inventory-bata-self-equip', isAvoidImmediateRepeat: true },
        );
        shouldClearCarriedItem = true;
        return { handled: true, actionResult: { suppressDefaultPlayerMove: true } };
      } catch (error) {
        engine.log('System', `Rocco lab coat equip failed: ${String(error)}`);
        return { handled: true };
      } finally {
        if (shouldClearCarriedItem) {
          engine.video.gridMenus.clearCarriedItem();
        }
        inputLease.dispose();
      }
    },
  };
}

/**
 * Pier-specific carried-item scene-click rules, evaluated by the inventory
 * runtime's `handleSpecialSceneClick` sub-dispatch. Each rule owns its own
 * item + target combination so the router stops importing pier/Stan/lab-coat
 * IDs (audit DOM-002).
 */
export function createPierSpecialSceneClickRules(): readonly SpecialInventorySceneClickRule[] {
  return [
    createBaitShopDoorUseRule(),
    createStanPoliceDefeatRule(),
    createStanMoneyRule(),
    createLabCoatEquipRule(),
  ];
}
