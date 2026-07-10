import type {
  RoccoCartridgeAction,
  RoccoCartridgeActionResult,
  RoccoSceneClickAction,
} from '../../../../console/cartridges';
import type { RoccoEngine } from '../../../../console/engine-sdk';
import type { RoccoActionMenuActivation } from '../../../../console/video/action-menu';
import type { RoccoGridMenuCarriedItem } from '../../../../console/video/grid-menu';
import { applyDefaultSpriteAppearance } from '../../rocco-default-sprites';
import {
  RoccoInventory,
  ROCCO_INVENTORY_BATA_ITEM_ID,
  ROCCO_INVENTORY_KEYS_ITEM_ID,
  ROCCO_INVENTORY_MENU_ID,
  ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
} from '../../inventory';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import {
  DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_STAN_SPRITE_INSTANCE_ID,
  ROCCO_PIER_START_LEVEL_ID,
} from '../../rocco-default-constants';
import { roccoCartridgeMessageRuntime } from '../../rpce/dialogue';
import { resolveKeyLockedDoorLines } from '../key-locked-door-lines';
import { isRoccoPlayerInventoryAction, ROCCO_PLAYER_TALK_ACTION_ID } from '../../rocco-player-action-menu';
import {
  ROCCO_LAB_COAT_PLAYER_APPEARANCE,
  type RoccoPlayerAppearance,
} from '../../rocco-player-appearance';
import type { RoccoLevel } from '../rocco-level-types';
import { RoccoDeveloperRuntimeController } from './rocco-developer-runtime-controller';
import { RoccoDroppedInventoryController } from './rocco-dropped-inventory-controller';
import {
  RoccoInventoryRuntimeController,
  type RoccoInventoryRuntimeSceneClickResolution,
} from './rocco-inventory-runtime-controller';
import { RoccoLevelTransitionController } from './rocco-level-transition-controller';
import { RoccoScriptedSequenceController } from './rocco-scripted-sequence-controller';

interface RoccoLevelInventorySceneClickHandler {
  handleInventorySceneClick(
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ): boolean;
}

export interface RoccoSceneActionRouterOptions {
  localization?: RoccoLocalization;
  inventory: RoccoInventory;
  transitions: RoccoLevelTransitionController;
  inventoryRuntime: RoccoInventoryRuntimeController;
  droppedInventory: RoccoDroppedInventoryController;
  scriptedSequences: RoccoScriptedSequenceController;
  developerRuntime: RoccoDeveloperRuntimeController;
  getEngine: () => RoccoEngine | null;
  getActiveLevel: () => RoccoLevel | null;
  getRoccoAppearance: () => RoccoPlayerAppearance;
  setRoccoAppearance: (appearance: RoccoPlayerAppearance) => void;
  isStanIdentified: () => boolean;
  isStanAwake: () => boolean;
}

type RoccoGridMenuCartridgeAction = Extract<RoccoCartridgeAction, { kind: 'grid-menu' }>;

const PIER_DOOR_VARIANT_MESSAGE_TTL_MS = 5200;

export class RoccoSceneActionRouter {
  private readonly localization: RoccoLocalization;
  private readonly inventory: RoccoInventory;
  private readonly transitions: RoccoLevelTransitionController;
  private readonly inventoryRuntime: RoccoInventoryRuntimeController;
  private readonly droppedInventory: RoccoDroppedInventoryController;
  private readonly scriptedSequences: RoccoScriptedSequenceController;
  private readonly developerRuntime: RoccoDeveloperRuntimeController;
  private readonly options: RoccoSceneActionRouterOptions;

  constructor(options: RoccoSceneActionRouterOptions) {
    this.options = options;
    this.localization = options.localization ?? createRoccoLocalization();
    this.inventory = options.inventory;
    this.transitions = options.transitions;
    this.inventoryRuntime = options.inventoryRuntime;
    this.droppedInventory = options.droppedInventory;
    this.scriptedSequences = options.scriptedSequences;
    this.developerRuntime = options.developerRuntime;
  }

  handleAction(activation: RoccoCartridgeAction): RoccoCartridgeActionResult | void {
    if (this.scriptedSequences.hasBlockingSequence()) {
      return;
    }

    const engine = this.options.getEngine();
    const activeLevel = this.options.getActiveLevel();
    if (this.scriptedSequences.hasPendingBaitShopDoorUse()) {
      this.scriptedSequences.cancelPendingBaitShopDoorUse(engine);
    }

    if (isSceneClickCartridgeAction(activation)) {
      return this.handleSceneClick(activation, engine, activeLevel);
    }

    if (isGridMenuCartridgeAction(activation)) {
      this.handleGridMenuAction(activation, engine, activeLevel);
      return;
    }

    if (engine && this.developerRuntime.handlePlayerAction(engine, activation)) {
      return;
    }

    if (isRoccoPlayerInventoryAction(activation)) {
      this.toggleInventoryMenu(engine);
      return;
    }

    if (
      activation.targetInstanceId === DEFAULT_SPRITE_INSTANCE_ID &&
      activation.actionId === ROCCO_PLAYER_TALK_ACTION_ID
    ) {
      this.showRoccoSelfTalk(engine);
      return;
    }

    if (this.handlePierBaitShopDoorAction(activation)) {
      return;
    }

    if (engine && activeLevel && this.droppedInventory.handleActionMenu(engine, activeLevel, activation)) {
      return;
    }

    activeLevel?.handleAction(activation);
  }

  handleSpecialInventorySceneClick(
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ): RoccoInventoryRuntimeSceneClickResolution {
    if (this.shouldTriggerBaitShopDoorUse(activation, carriedItem)) {
      this.startBaitShopDoorUse();
      return {
        handled: true,
        actionResult: { suppressDefaultPlayerMove: true },
      };
    }

    if (this.shouldTriggerStanPoliceDefeat(activation, carriedItem)) {
      this.startStanPoliceDefeat();
      return {
        handled: true,
      };
    }

    if (this.shouldGiveStanMoney(activation, carriedItem)) {
      this.giveStanMoney();
      return {
        handled: true,
      };
    }

    if (this.shouldEquipLabCoat(activation, carriedItem)) {
      this.equipLabCoat();
      return {
        handled: true,
        actionResult: { suppressDefaultPlayerMove: true },
      };
    }

    return {
      handled: false,
    };
  }

  private handleSceneClick(
    activation: RoccoSceneClickAction,
    engine: RoccoEngine | null,
    activeLevel: RoccoLevel | null,
  ): RoccoCartridgeActionResult | void {
    if (engine) {
      const developerActionResult = this.developerRuntime.handleSceneClick(engine, activation);
      if (developerActionResult) {
        return developerActionResult;
      }
    }

    if (engine && activeLevel) {
      const droppedInventoryActionResult = this.droppedInventory.handleSceneClick(
        engine,
        activeLevel,
        activation,
      );
      if (droppedInventoryActionResult) {
        return droppedInventoryActionResult;
      }
    }

    this.transitions.updatePendingExitIntent(activeLevel, activation);
    const carriedItem = engine?.video.gridMenus.getCarriedItem();
    if (engine && this.inventoryRuntime.shouldHandleSceneCarriedItem(carriedItem)) {
      if (this.handleLevelInventorySceneClick(activeLevel, activation, carriedItem)) {
        return;
      }
      return this.inventoryRuntime.handleCarriedItemSceneClick(engine, activation);
    }

    return activeLevel?.handleSceneClick?.(activation);
  }

  private handleGridMenuAction(
    activation: RoccoGridMenuCartridgeAction,
    engine: RoccoEngine | null,
    activeLevel: RoccoLevel | null,
  ): void {
    if (engine && this.developerRuntime.handleGridMenuAction(engine, activation)) {
      return;
    }

    if (engine && this.inventoryRuntime.handleGridMenuAction(engine, activation)) {
      return;
    }

    activeLevel?.handleGridMenu?.(activation);
  }

  private toggleInventoryMenu(engine: RoccoEngine | null): void {
    if (!engine) {
      return;
    }

    this.developerRuntime.clearTransientState(engine);
    engine.setInputEnabled(true);
    engine.video.actionMenus.closeMenu();
    this.inventoryRuntime.togglePlayerInventory(engine);
  }

  private handleLevelInventorySceneClick(
    activeLevel: RoccoLevel | null,
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ): boolean {
    if (!activeLevel || !hasInventorySceneClickHandler(activeLevel)) {
      return false;
    }

    return activeLevel.handleInventorySceneClick(activation, carriedItem);
  }

  private shouldEquipLabCoat(
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ): boolean {
    return (
      carriedItem.item.id === ROCCO_INVENTORY_BATA_ITEM_ID &&
      activation.targetInstanceId === DEFAULT_SPRITE_INSTANCE_ID
    );
  }

  private equipLabCoat(): void {
    const engine = this.options.getEngine();
    if (!engine) {
      return;
    }

    let shouldClearCarriedItem = false;
    engine.setInputEnabled(false);

    try {
      if (this.options.getRoccoAppearance() === ROCCO_LAB_COAT_PLAYER_APPEARANCE) {
        roccoCartridgeMessageRuntime.think(
          engine,
          DEFAULT_SPRITE_INSTANCE_ID,
          [this.localization.text.inventory.bataAlreadyOnSelfLine],
          {
            ttlMs: 3200,
          },
          {
            count: 1,
            historyKey: 'inventory-bata-self-already-wearing',
            avoidImmediateRepeat: true,
          },
        );
        shouldClearCarriedItem = true;
        return;
      }

      applyDefaultSpriteAppearance(
        engine,
        ROCCO_LAB_COAT_PLAYER_APPEARANCE,
        this.localization,
      );
      this.options.setRoccoAppearance(ROCCO_LAB_COAT_PLAYER_APPEARANCE);
      this.inventory.removeItem(ROCCO_INVENTORY_BATA_ITEM_ID);
      if (engine.video.gridMenus.isOpen(ROCCO_INVENTORY_MENU_ID)) {
        engine.video.gridMenus.openMenu(
          this.inventory.createGridMenuDefinition(this.localization),
        );
      }
      roccoCartridgeMessageRuntime.think(
        engine,
        DEFAULT_SPRITE_INSTANCE_ID,
        [this.localization.text.inventory.bataOnSelfLine],
        {
          ttlMs: 3200,
        },
        {
          count: 1,
          historyKey: 'inventory-bata-self-equip',
          avoidImmediateRepeat: true,
        },
      );
      shouldClearCarriedItem = true;
    } catch (error) {
      engine.log('System', `Rocco lab coat equip failed: ${String(error)}`);
    } finally {
      if (shouldClearCarriedItem) {
        engine.video.gridMenus.clearCarriedItem();
      }
      engine.setInputEnabled(true);
      engine.video.render(0);
    }
  }

  private handlePierBaitShopDoorAction(activation: RoccoActionMenuActivation): boolean {
    const activeLevel = this.options.getActiveLevel();
    if (
      activeLevel?.id !== ROCCO_PIER_START_LEVEL_ID ||
      activation.targetInstanceId !== DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID
    ) {
      return false;
    }

    if (activation.actionId === 'look') {
      this.showRoccoThoughtVariant(
        resolveKeyLockedDoorLines({
          hasMatchingKey: this.inventory.hasItem(ROCCO_INVENTORY_KEYS_ITEM_ID),
          withKeyLines: this.localization.text.pierDoor.lookWithKeyLines,
          withoutKeyLines: this.localization.text.pierDoor.lookWithoutKeyLines,
        }),
        `pier-bait-shop-door-look:${this.inventory.hasItem(ROCCO_INVENTORY_KEYS_ITEM_ID) ? 'has-key' : 'no-key'}`,
      );
      return true;
    }

    if (activation.actionId === 'open') {
      this.showRoccoThoughtVariant(
        resolveKeyLockedDoorLines({
          hasMatchingKey: this.inventory.hasItem(ROCCO_INVENTORY_KEYS_ITEM_ID),
          withKeyLines: this.localization.text.pierDoor.openWithKeyLines,
          withoutKeyLines: this.localization.text.pierDoor.openWithoutKeyLines,
        }),
        `pier-bait-shop-door-open:${this.inventory.hasItem(ROCCO_INVENTORY_KEYS_ITEM_ID) ? 'has-key' : 'no-key'}`,
      );
      return true;
    }

    if (activation.actionId === 'kick') {
      this.showRoccoThoughtVariant(
        this.resolvePierDoorKickLines(),
        `pier-bait-shop-door-kick:${this.options.isStanAwake() ? 'awake' : this.options.isStanIdentified() ? 'known' : 'unknown'}`,
      );
      return true;
    }

    return false;
  }

  private shouldTriggerStanPoliceDefeat(
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ): boolean {
    return (
      this.options.getActiveLevel()?.id === ROCCO_PIER_START_LEVEL_ID &&
      carriedItem.item.id === ROCCO_INVENTORY_KEYS_ITEM_ID &&
      activation.targetInstanceId === DEFAULT_STAN_SPRITE_INSTANCE_ID
    );
  }

  private shouldTriggerBaitShopDoorUse(
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ): boolean {
    return (
      this.options.getActiveLevel()?.id === ROCCO_PIER_START_LEVEL_ID &&
      carriedItem.item.id === ROCCO_INVENTORY_KEYS_ITEM_ID &&
      activation.targetInstanceId === DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID
    );
  }

  private shouldGiveStanMoney(
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ): boolean {
    return (
      this.options.getActiveLevel()?.id === ROCCO_PIER_START_LEVEL_ID &&
      carriedItem.item.id === ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID &&
      activation.targetInstanceId === DEFAULT_STAN_SPRITE_INSTANCE_ID
    );
  }

  private startStanPoliceDefeat(): void {
    const engine = this.options.getEngine();
    if (!engine) {
      return;
    }

    this.scriptedSequences.startStanPoliceDefeat(engine);
  }

  private giveStanMoney(): void {
    const engine = this.options.getEngine();
    if (!engine) {
      return;
    }

    this.inventory.removeItem(ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID);
    this.scriptedSequences.startStanMoneyExchange(engine);
  }

  private startBaitShopDoorUse(): void {
    const engine = this.options.getEngine();
    const activeLevel = this.options.getActiveLevel();
    if (!engine || activeLevel?.id !== ROCCO_PIER_START_LEVEL_ID) {
      return;
    }

    this.scriptedSequences.startBaitShopDoorUse(engine, activeLevel.id);
  }

  private showRoccoThoughtVariant(lines: readonly string[], historyKey: string): void {
    const engine = this.options.getEngine();
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
        avoidImmediateRepeat: true,
      },
    );
    engine.video.render(0);
  }

  private showRoccoSelfTalk(engine: RoccoEngine | null): void {
    if (!engine) {
      return;
    }

    roccoCartridgeMessageRuntime.think(
      engine,
      DEFAULT_SPRITE_INSTANCE_ID,
      this.localization.text.rocco.selfTalkLines,
      {
        ttlMs: 5200,
      },
      {
        count: 1,
        historyKey: 'rocco-self-talk',
        avoidImmediateRepeat: true,
      },
    );
    engine.video.render(0);
  }

  private resolvePierDoorKickLines(): readonly string[] {
    if (this.options.isStanAwake()) {
      return this.localization.text.pierDoor.kickAwakeLines;
    }

    return this.options.isStanIdentified()
      ? this.localization.text.pierDoor.kickSleepingKnownStanLines
      : this.localization.text.pierDoor.kickSleepingUnknownStanLines;
  }
}

function isGridMenuCartridgeAction(
  activation: RoccoCartridgeAction,
): activation is RoccoGridMenuCartridgeAction {
  return 'kind' in activation && activation.kind === 'grid-menu';
}

function isSceneClickCartridgeAction(
  activation: RoccoCartridgeAction,
): activation is RoccoSceneClickAction {
  return 'kind' in activation && activation.kind === 'scene-click';
}

function hasInventorySceneClickHandler(
  level: RoccoLevel,
): level is RoccoLevel & RoccoLevelInventorySceneClickHandler {
  return (
    'handleInventorySceneClick' in level &&
    typeof (level as Partial<RoccoLevelInventorySceneClickHandler>).handleInventorySceneClick ===
      'function'
  );
}
