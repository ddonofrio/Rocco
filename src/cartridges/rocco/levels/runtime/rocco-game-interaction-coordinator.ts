import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';
import { ROCCO_PLAYER_CONFIG } from '../../games/rocco-default/player/rocco-player-config';
import { PIER_BAIT_SHOP_DOOR_CONFIG } from '../../games/rocco-default/maps/pier/pier-bait-shop-door-config';
import { PIER_STAN_CONFIG } from '../../games/rocco-default/maps/pier/pier-stan-config';
const DEFAULT_STAN_SPRITE_INSTANCE_ID = PIER_STAN_CONFIG.spriteInstanceId;
const DEFAULT_STAN_SLEEPING_ANIMATION_ID = PIER_STAN_CONFIG.sleepingAnimationId;
import { createRoccoAppearanceSpriteDefinition } from '../../games/rocco-default/player';
import {
  createRoccoKeysInventoryItem,
  ROCCO_INVENTORY_BATA_ITEM_ID,
  type RoccoInventoryItem,
} from '../../games/rocco-default/inventory';
import { ROCCO_LAB_COAT_PLAYER_APPEARANCE } from '../../games/rocco-default/player';
import type { RoccoLocalization } from '../../games/rocco-default/localization';
import type { RoccoLevel, RoccoLevelRestartRequest } from '../rocco-level-types';
import type {
  RoccoLevelTransitionController,
  RoccoResolvedLevelTransition,
} from './rocco-level-transition-controller';
import type { RoccoLevelTransitionService } from './rocco-level-transition-service';
import type { RoccoTransitionPlanFactory } from './rocco-transition-plan-factory';
import type { RoccoPierBeginningAmbientPersistentState } from '../../games/rocco-default/maps/pier';
import { roccoCartridgeMessageRuntime } from '../../rpce/dialogue';

export interface RoccoGameInteractionCoordinatorOptions {
  localization: RoccoLocalization;
  beginningAmbientState: RoccoPierBeginningAmbientPersistentState;
  getEngine: () => CartridgeSdkV1Runtime | null;
  getActiveLevel: () => RoccoLevel | null;
  tryAddItemToInventory: (item: RoccoInventoryItem) => boolean;
  onRestartRequested?: () => void;
  restartFromCheckpoint: (request: RoccoLevelRestartRequest) => void;
  transitions: RoccoLevelTransitionController;
  levelTransitionService: RoccoLevelTransitionService;
  transitionPlanFactory: RoccoTransitionPlanFactory;
  transitionThrough: (transition: RoccoResolvedLevelTransition) => void;
}

export class RoccoGameInteractionCoordinator {
  private readonly options: RoccoGameInteractionCoordinatorOptions;

  constructor(options: RoccoGameInteractionCoordinatorOptions) {
    this.options = options;
  }

  private async preloadLabCoatSprite(engine: CartridgeSdkV1Runtime): Promise<void> {
    const spriteDefinition = createRoccoAppearanceSpriteDefinition(
      engine,
      ROCCO_LAB_COAT_PLAYER_APPEARANCE,
      this.options.localization,
    );
    try {
      await engine.video.preloadSpriteDefinition(spriteDefinition);
    } catch {
      engine.log('Assets', 'Rocco lab coat assets could not be preloaded.');
    }
  }

  handleKeysCollected(): void {
    const engine = this.options.getEngine();
    if (
      !this.options.tryAddItemToInventory(
        createRoccoKeysInventoryItem(this.options.localization),
      ) ||
      !engine
    ) {
      return;
    }
    roccoCartridgeMessageRuntime.think(
      engine,
      ROCCO_PLAYER_CONFIG.ids.instance,
      this.options.localization.text.keys.collectedLines,
      { ttlMs: 5600 },
      { count: 1, historyKey: 'keys-collected', isAvoidImmediateRepeat: true },
    );
  }

  handleRestartRequested(request?: RoccoLevelRestartRequest): void {
    if (request) {
      this.options.restartFromCheckpoint(request);
      return;
    }
    this.options.onRestartRequested?.();
  }

  handlePickupCollected(item: RoccoInventoryItem): void {
    const engine = this.options.getEngine();
    if (!this.options.tryAddItemToInventory(item) || !engine) {
      return;
    }
    if (item.id === ROCCO_INVENTORY_BATA_ITEM_ID) {
      void this.preloadLabCoatSprite(engine);
    }
    roccoCartridgeMessageRuntime.think(
      engine,
      ROCCO_PLAYER_CONFIG.ids.instance,
      this.options.localization.text.inventory.pickupLine,
      { ttlMs: 3200 },
      { count: 1, historyKey: `pickup-${item.id}`, isAvoidImmediateRepeat: true },
    );
  }

  requestScriptedConnectorTransition(connectorId: string): boolean {
    const activeLevel = this.options.getActiveLevel();
    if (!activeLevel || this.options.levelTransitionService.isTransitioning) {
      return false;
    }
    const transition = this.options.transitions.resolveScriptedTransition(activeLevel, connectorId);
    if (!transition) {
      return false;
    }
    this.options.transitionThrough(transition);
    return true;
  }

  isStanIdentified(): boolean {
    return this.options.beginningAmbientState.stan.isIdentified;
  }

  isStanAwake(): boolean {
    const engine = this.options.getEngine();
    if (!engine) {
      return false;
    }
    const stan = engine.video.sprites.getSprite(DEFAULT_STAN_SPRITE_INSTANCE_ID);
    return Boolean(stan && stan.animation.animationId !== DEFAULT_STAN_SLEEPING_ANIMATION_ID);
  }

  doesPlayerOverlapBaitShopDoor(): boolean {
    const engine = this.options.getEngine();
    const player = engine?.video.sprites.getSprite(ROCCO_PLAYER_CONFIG.ids.instance);
    const door = engine?.video.sprites.getSprite(PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId);
    if (!player || !door) {
      return false;
    }
    const playerScaleX = player.transform.scaleX || 1;
    const playerScaleY = player.transform.scaleY || 1;
    const doorScaleX = door.transform.scaleX || 1;
    const doorScaleY = door.transform.scaleY || 1;
    const playerLeft = player.transform.x;
    const playerTop = player.transform.y;
    const playerRight = playerLeft + ROCCO_PLAYER_CONFIG.frame.width * playerScaleX;
    const playerBottom = playerTop + ROCCO_PLAYER_CONFIG.frame.height * playerScaleY;
    const doorLeft = door.transform.x - PIER_BAIT_SHOP_DOOR_CONFIG.pivotX * doorScaleX;
    const doorTop = door.transform.y - PIER_BAIT_SHOP_DOOR_CONFIG.pivotY * doorScaleY;
    const doorRight = doorLeft + PIER_BAIT_SHOP_DOOR_CONFIG.width * doorScaleX;
    const doorBottom = doorTop + PIER_BAIT_SHOP_DOOR_CONFIG.height * doorScaleY;
    const overlapWidth = Math.min(playerRight, doorRight) - Math.max(playerLeft, doorLeft);
    const overlapHeight = Math.min(playerBottom, doorBottom) - Math.max(playerTop, doorTop);
    return overlapWidth >= 1 && overlapHeight >= 1;
  }

  enterBaitShop(): Promise<void> {
    return this.options.transitionPlanFactory.enterBaitShop();
  }
}
