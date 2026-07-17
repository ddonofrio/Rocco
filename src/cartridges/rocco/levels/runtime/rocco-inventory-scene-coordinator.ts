import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';
import type { RoccoPoint } from '../../../../console/video/sprites';
import {
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_SPRITE_INSTANCE_ID,
} from '../../games/rocco-default/constants';
import {
  ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID,
  type RoccoInventoryItem,
} from '../../games/rocco-default/inventory';
import type { RoccoLevel } from '../rocco-level-types';
import { RoccoDeveloperRuntimeController } from './rocco-developer-runtime-controller';
import { RoccoDroppedInventoryController } from './rocco-dropped-inventory-controller';
import { RoccoInventoryRuntimeController } from './rocco-inventory-runtime-controller';
import { isRoccoToiletLevelCapability } from './rocco-level-capabilities';

export interface RoccoInventorySceneCoordinatorOptions {
  getEngine: () => CartridgeSdkV1Runtime | null;
  getActiveLevel: () => RoccoLevel | null;
  resolvePlayerGroundPoint: () => RoccoPoint | undefined;
  developerRuntime: RoccoDeveloperRuntimeController;
  inventoryRuntime: RoccoInventoryRuntimeController;
  droppedInventory: RoccoDroppedInventoryController;
  syncActiveLevelDroppedInventoryPresentation: () => void;
}

export class RoccoInventorySceneCoordinator {
  private readonly options: RoccoInventorySceneCoordinatorOptions;

  constructor(options: RoccoInventorySceneCoordinatorOptions) {
    this.options = options;
  }

  openInventoryTransferMenu(storageId: string, onInventoryClosed?: () => void): void {
    const engine = this.options.getEngine();
    if (!engine) {
      return;
    }
    this.options.developerRuntime.clearTransientState(engine);
    engine.video.actionMenus.closeMenu();
    this.options.inventoryRuntime.openStorageInventory(engine, storageId, onInventoryClosed);
  }

  closeInventoryTransferMenu(storageId?: string, shouldNotifyLevel = false): void {
    const engine = this.options.getEngine();
    if (!engine) {
      return;
    }
    this.options.inventoryRuntime.closeActiveTransferSession(engine, storageId, shouldNotifyLevel);
  }

  resolveDroppedInventoryGroundPoint(): RoccoPoint | undefined {
    const player = this.options.getEngine()?.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    const baseGroundPoint = this.options.resolvePlayerGroundPoint();
    if (!player || !baseGroundPoint) {
      return undefined;
    }
    const direction = player.facing ?? player.action?.direction ?? 'down';
    const offsetByDirection: Record<string, RoccoPoint> = {
      down: { x: 0, y: 10 },
      'down-left': { x: -18, y: 10 },
      'down-right': { x: 18, y: 10 },
      left: { x: -24, y: 6 },
      right: { x: 24, y: 6 },
      up: { x: 0, y: -4 },
      'up-left': { x: -16, y: -2 },
      'up-right': { x: 16, y: -2 },
    };
    const offset = offsetByDirection[direction] ?? offsetByDirection.down;
    return {
      x: Math.max(
        18,
        Math.min(DEFAULT_DESIGN_WIDTH - 18, Math.round(baseGroundPoint.x + offset.x)),
      ),
      y: Math.max(
        18,
        Math.min(DEFAULT_DESIGN_HEIGHT - 18, Math.round(baseGroundPoint.y + offset.y)),
      ),
    };
  }

  storeDroppedInventoryItem(
    levelId: string,
    droppedItem: { item: RoccoInventoryItem; groundPoint: RoccoPoint },
  ): boolean {
    const activeLevel = this.options.getActiveLevel();
    if (
      activeLevel &&
      isRoccoToiletLevelCapability(activeLevel) &&
      droppedItem.item.id === ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID &&
      activeLevel.isEscapeUrgencyActive()
    ) {
      activeLevel.startThrowCoralRelicSequence(droppedItem.item, (groundPoint) => {
        this.options.droppedInventory.dropItem(levelId, droppedItem.item, groundPoint);
        this.options.syncActiveLevelDroppedInventoryPresentation();
      });
      return true;
    }
    this.options.droppedInventory.dropItem(levelId, droppedItem.item, droppedItem.groundPoint);
    return false;
  }

  updateDroppedInventoryPickup(): void {
    const engine = this.options.getEngine();
    if (engine) {
      this.options.droppedInventory.updatePendingPickup(engine, this.options.getActiveLevel());
    }
  }

  syncActiveLevelDroppedInventoryPresentation(): void {
    const engine = this.options.getEngine();
    const activeLevel = this.options.getActiveLevel();
    if (engine && activeLevel) {
      this.options.droppedInventory.syncActiveLevelPresentation(engine, activeLevel);
    }
  }

  clearActiveLevelDroppedInventoryPresentation(): void {
    const engine = this.options.getEngine();
    if (engine) {
      this.options.droppedInventory.clearActiveLevelPresentation(engine);
    }
  }

  canCollectIntoInventory(itemId: string, shouldShowFullMessage = true): boolean {
    return this.options.inventoryRuntime.canCollectItem(
      this.options.getEngine(),
      itemId,
      shouldShowFullMessage,
    );
  }

  tryAddItemToInventory(item: RoccoInventoryItem): boolean {
    return this.options.inventoryRuntime.tryAddItem(this.options.getEngine(), item);
  }
}
