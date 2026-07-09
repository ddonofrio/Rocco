import type {
  RoccoCartridgeActionResult,
  RoccoSceneClickAction,
} from '../../../../engine/cartridges';
import type { RoccoEngine } from '../../../../engine/engine-sdk';
import type {
  RoccoGridMenuActivation,
  RoccoGridMenuCarriedItem,
  RoccoGridMenuItem,
} from '../../../../engine/video/grid-menu';
import type { RoccoPoint } from '../../../../engine/video/sprites';
import { roccoCartridgeMessageRuntime } from '../../dialogue';
import {
  BAIT_SHOP_SOUVENIR_TABLE_STORAGE_ID,
  createBaitShopSouvenirTableStorage,
  createRoccoTwentyEurosInventoryItem,
  resolveRoccoInventoryUseLines,
  RoccoInventory,
  ROCCO_INVENTORY_DROP_BUTTON_ID,
  ROCCO_INVENTORY_MENU_ID,
  ROCCO_PLAYER_INVENTORY_STORAGE_ID,
  RoccoInventoryStorage,
  RoccoInventoryTransferSession,
  type RoccoInventoryItem,
} from '../../inventory';
import type { RoccoLocalization } from '../../localization';
import { DEFAULT_SPRITE_INSTANCE_ID } from '../../rocco-default-constants';

export interface RoccoInventoryRuntimeSceneClickResolution {
  handled: boolean;
  actionResult?: RoccoCartridgeActionResult;
}

interface RoccoStoredDroppedInventoryItem {
  item: RoccoInventoryItem;
  groundPoint: RoccoPoint;
}

export interface RoccoInventoryRuntimeControllerOptions {
  localization: RoccoLocalization;
  inventory?: RoccoInventory;
  getActiveLevelId?: () => string | null;
  handleSpecialSceneClick?: (
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ) => RoccoInventoryRuntimeSceneClickResolution;
  resolveDroppedInventoryGroundPoint?: () => RoccoPoint | undefined;
  storeDroppedInventoryItem?: (
    levelId: string,
    droppedItem: RoccoStoredDroppedInventoryItem,
  ) => void;
  syncWorldPresentation?: () => void;
  refreshStatus?: () => void;
}

const ROCCO_STORAGE_TRANSFER_MENU_ID_PREFIX = 'rocco-storage-transfer-menu:';

export class RoccoInventoryRuntimeController {
  private readonly localization: RoccoLocalization;
  private readonly inventory: RoccoInventory;
  private readonly inventoryStorages = new Map<string, RoccoInventoryStorage>();
  private readonly options: RoccoInventoryRuntimeControllerOptions;
  private activeInventoryTransferSession: RoccoInventoryTransferSession | null = null;
  private activeInventoryTransferCloseHandler: (() => void) | null = null;

  constructor(options: RoccoInventoryRuntimeControllerOptions) {
    this.options = options;
    this.localization = options.localization;
    this.inventory = options.inventory ?? new RoccoInventory();
    this.inventory.addItem(createRoccoTwentyEurosInventoryItem(this.localization));
    this.inventoryStorages.set(ROCCO_PLAYER_INVENTORY_STORAGE_ID, this.inventory);
    this.inventoryStorages.set(
      BAIT_SHOP_SOUVENIR_TABLE_STORAGE_ID,
      createBaitShopSouvenirTableStorage(this.localization),
    );
  }

  getPlayerInventory(): RoccoInventory {
    return this.inventory;
  }

  getStorage(storageId: string): RoccoInventoryStorage | undefined {
    return this.inventoryStorages.get(storageId);
  }

  shouldHandleSceneCarriedItem(
    carriedItem: RoccoGridMenuCarriedItem | undefined,
  ): carriedItem is RoccoGridMenuCarriedItem {
    if (!carriedItem) {
      return false;
    }

    return (
      carriedItem.definitionId === ROCCO_INVENTORY_MENU_ID ||
      carriedItem.definitionId.startsWith(ROCCO_STORAGE_TRANSFER_MENU_ID_PREFIX)
    );
  }

  hasActiveTransferSession(): boolean {
    return this.activeInventoryTransferSession !== null;
  }

  resetRuntimeState(): void {
    this.activeInventoryTransferSession = null;
    this.activeInventoryTransferCloseHandler = null;
  }

  canCollectItem(
    engine: RoccoEngine | null | undefined,
    itemId: string,
    showFullMessage = true,
  ): boolean {
    if (this.inventory.hasItem(itemId)) {
      return true;
    }

    if (!this.inventory.hasOpenSlot()) {
      if (showFullMessage) {
        this.showInventoryFullLines(engine);
      }
      return false;
    }

    return true;
  }

  tryAddItem(
    engine: RoccoEngine | null | undefined,
    item: RoccoInventoryItem,
    showFullMessage = true,
  ): boolean {
    if (!this.canCollectItem(engine, item.id, showFullMessage)) {
      return false;
    }

    this.inventory.addItem(item);
    return true;
  }

  togglePlayerInventory(engine: RoccoEngine): void {
    if (this.activeInventoryTransferSession) {
      this.closeActiveTransferSession(engine, undefined, true);
      return;
    }

    engine.video.gridMenus.toggleMenu(this.inventory.createGridMenuDefinition(this.localization));
    this.refreshStatus(engine);
  }

  openPlayerInventory(engine: RoccoEngine): void {
    this.activeInventoryTransferSession = null;
    this.activeInventoryTransferCloseHandler = null;
    engine.video.gridMenus.openMenu(this.inventory.createGridMenuDefinition(this.localization));
    this.refreshStatus(engine);
  }

  openStorageInventory(
    engine: RoccoEngine,
    storageId: string,
    onInventoryClosed?: () => void,
  ): void {
    const storage = this.inventoryStorages.get(storageId);
    if (!storage || storage.id === this.inventory.id) {
      this.openPlayerInventory(engine);
      return;
    }

    engine.video.gridMenus.clearCarriedItem();
    this.activeInventoryTransferSession = new RoccoInventoryTransferSession({
      menuId: `rocco-storage-transfer-menu:${storageId}`,
      leftStorage: storage,
      rightStorage: this.inventory,
      leftTitle:
        storageId === BAIT_SHOP_SOUVENIR_TABLE_STORAGE_ID
          ? this.localization.text.descriptions.souvenirTable
          : storageId,
      rightTitle: this.localization.text.descriptions.rocco,
      backdropAlpha: 0.32,
      panelFillAlpha: 0,
      panelStrokeAlpha: 0,
    });
    this.activeInventoryTransferCloseHandler = onInventoryClosed ?? null;
    engine.video.gridMenus.openMenu(
      this.activeInventoryTransferSession.createGridMenuDefinition(),
    );
    this.refreshStatus(engine);
  }

  closeActiveTransferSession(
    engine: RoccoEngine,
    storageId?: string,
    notifyLevel = false,
  ): void {
    if (!this.activeInventoryTransferSession) {
      return;
    }

    if (storageId && this.activeInventoryTransferSession.leftStorageId !== storageId) {
      return;
    }

    engine.video.gridMenus.clearCarriedItem();
    if (engine.video.gridMenus.isOpen(this.activeInventoryTransferSession.menuId)) {
      engine.video.gridMenus.closeMenu();
    }
    this.finishInventoryTransferClose(engine, notifyLevel);
  }

  handleGridMenuAction(engine: RoccoEngine, activation: RoccoGridMenuActivation): boolean {
    if (this.activeInventoryTransferSession?.matchesDefinition(activation.definitionId)) {
      this.handleInventoryTransferGridAction(engine, activation);
      return true;
    }

    if (activation.definitionId !== ROCCO_INVENTORY_MENU_ID) {
      return false;
    }

    if (activation.interaction === 'close') {
      this.refreshStatus(engine);
      return true;
    }

    if (activation.interaction === 'button') {
      this.inventory.applyGridMenuItems(activation.items);
      if (activation.buttonId === ROCCO_INVENTORY_DROP_BUTTON_ID) {
        this.dropCarriedInventoryItem(engine, activation.carriedItem);
      }
      return true;
    }

    if (
      activation.interaction === 'swap' &&
      this.inventory.tryFuseItems(
        activation.itemId ?? '',
        activation.replacedItem?.id ?? '',
        this.localization,
        activation.toSlotIndex,
      )
    ) {
      engine.video.gridMenus.clearCarriedItem();
      engine.video.gridMenus.openMenu(this.inventory.createGridMenuDefinition(this.localization));
      this.refreshStatus(engine);
      return true;
    }

    if (activation.interaction === 'place' || activation.interaction === 'carry') {
      this.inventory.applyGridMenuItems(activation.items);
    }

    return true;
  }

  handleCarriedItemSceneClick(
    engine: RoccoEngine,
    activation: RoccoSceneClickAction,
  ): RoccoCartridgeActionResult | void {
    const carriedItem = engine.video.gridMenus.getCarriedItem();
    if (!this.shouldHandleSceneCarriedItem(carriedItem)) {
      return;
    }

    if (!activation.targetInstanceId) {
      engine.video.gridMenus.clearCarriedItem();
      engine.video.render(0);
      return;
    }

    const specialResolution = this.options.handleSpecialSceneClick?.(activation, carriedItem);
    if (specialResolution?.handled) {
      return specialResolution.actionResult;
    }

    roccoCartridgeMessageRuntime.think(
      engine,
      DEFAULT_SPRITE_INSTANCE_ID,
      resolveRoccoInventoryUseLines({
        itemId: carriedItem.item.id,
        targetInstanceId: activation.targetInstanceId,
        localization: this.localization,
      }),
      {
        ttlMs: 5200,
      },
      {
        count: 1,
        historyKey: `inventory-use:${carriedItem.item.id}:${activation.targetInstanceId}`,
        avoidImmediateRepeat: true,
      },
    );
    engine.video.gridMenus.clearCarriedItem();
    engine.video.render(0);
  }

  private handleInventoryTransferGridAction(
    engine: RoccoEngine,
    activation: RoccoGridMenuActivation,
  ): void {
    if (!this.activeInventoryTransferSession) {
      return;
    }

    if (activation.interaction === 'pick') {
      return;
    }

    if (activation.interaction === 'close') {
      this.finishInventoryTransferClose(engine, true);
      return;
    }

    if (
      (activation.interaction === 'place' || activation.interaction === 'swap') &&
      !this.activeInventoryTransferSession.isActivationValid(activation)
    ) {
      engine.video.gridMenus.clearCarriedItem();
      engine.video.gridMenus.openMenu(
        this.activeInventoryTransferSession.createGridMenuDefinition(),
      );
      this.refreshStatus(engine);
      return;
    }

    if (activation.interaction === 'swap') {
      return;
    }

    if (activation.interaction === 'carry') {
      const committed = this.activeInventoryTransferSession.commitMenuItems(activation.items);
      engine.video.gridMenus.clearCarriedItem();
      if (!committed) {
        engine.video.gridMenus.openMenu(
          this.activeInventoryTransferSession.createGridMenuDefinition(),
        );
        this.refreshStatus(engine);
        return;
      }

      this.finishInventoryTransferClose(engine, true);
      return;
    }

    if (activation.interaction === 'place') {
      const committed = this.activeInventoryTransferSession.commitMenuItems(activation.items);
      if (!committed) {
        engine.video.gridMenus.openMenu(
          this.activeInventoryTransferSession.createGridMenuDefinition(),
        );
      }
      this.refreshStatus(engine);
    }
  }

  private dropCarriedInventoryItem(
    engine: RoccoEngine,
    carriedItem: RoccoGridMenuItem | undefined,
  ): void {
    if (!carriedItem) {
      return;
    }

    const inventoryItem = this.inventory.getItem(carriedItem.id);
    const activeLevelId = this.options.getActiveLevelId?.() ?? null;
    const groundPoint = this.options.resolveDroppedInventoryGroundPoint?.();
    if (!inventoryItem?.groundSprite || !activeLevelId || !groundPoint) {
      return;
    }

    this.inventory.removeItem(inventoryItem.id);
    this.options.storeDroppedInventoryItem?.(activeLevelId, {
      item: {
        ...inventoryItem,
        slotIndex: carriedItem.slotIndex ?? inventoryItem.slotIndex,
      },
      groundPoint,
    });
    engine.video.gridMenus.clearCarriedItem();
    engine.video.gridMenus.openMenu(this.inventory.createGridMenuDefinition(this.localization));
    this.options.syncWorldPresentation?.();
    this.refreshStatus(engine);
  }

  private finishInventoryTransferClose(engine: RoccoEngine, notifyLevel: boolean): void {
    const closeHandler = notifyLevel ? this.activeInventoryTransferCloseHandler : null;
    this.activeInventoryTransferSession = null;
    this.activeInventoryTransferCloseHandler = null;
    closeHandler?.();
    this.refreshStatus(engine);
  }

  private refreshStatus(engine: RoccoEngine): void {
    this.options.refreshStatus?.();
    engine.video.render(0);
  }

  private showInventoryFullLines(engine: RoccoEngine | null | undefined): void {
    if (!engine) {
      return;
    }

    roccoCartridgeMessageRuntime.think(
      engine,
      DEFAULT_SPRITE_INSTANCE_ID,
      this.localization.text.inventory.fullLines,
      {
        ttlMs: 3200,
      },
      {
        count: 1,
        historyKey: 'inventory-full',
        avoidImmediateRepeat: true,
      },
    );
    engine.video.render(0);
  }
}
