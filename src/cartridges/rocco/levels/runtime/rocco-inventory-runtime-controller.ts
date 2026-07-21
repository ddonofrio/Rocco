/// <reference lib="esnext.iterator" />

import type { RoccoSceneClickAction } from '../../../../console/cartridges';
import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';
import type {
  RoccoGridMenuActivation,
  RoccoGridMenuCarriedItem,
  RoccoGridMenuItem,
} from '../../../../console/video/grid-menu';
import type { RoccoPoint } from '../../../../console/video/sprites';
import { roccoCartridgeMessageRuntime } from '../../rpce/dialogue';
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
import { ROCCO_PLAYER_CONFIG } from '../../games/rocco-default/player/rocco-player-config';

export interface RoccoInventoryRuntimeActionResult {
  suppressDefaultPlayerMove?: boolean;
}

export interface RoccoInventoryRuntimeSceneClickResolution {
  handled: boolean;
  actionResult?: RoccoInventoryRuntimeActionResult;
}

export interface RoccoInventoryRuntimeControllerSnapshot {
  storages: ReadonlyArray<{
    storageId: string;
    items: readonly RoccoInventoryItem[];
  }>;
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
  ) => boolean;
  syncWorldPresentation?: () => void;
  refreshStatus?: () => void;
}

const ROCCO_STORAGE_TRANSFER_MENU_ID_PREFIX = 'rocco-storage-transfer-menu:';

export class RoccoInventoryRuntimeController {
  private readonly localization: RoccoLocalization;
  private readonly inventory: RoccoInventory;
  private readonly inventoryStorages = new Map<string, RoccoInventoryStorage>();
  private readonly options: RoccoInventoryRuntimeControllerOptions;
  private activeInventoryTransferSession: RoccoInventoryTransferSession | undefined = undefined;
  private activeInventoryTransferCloseHandler: (() => void) | undefined = undefined;

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

  private handleInventoryTransferGridAction(
    engine: CartridgeSdkV1Runtime,
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
      const isCommitted = this.activeInventoryTransferSession.commitMenuItems(activation.items);
      engine.video.gridMenus.clearCarriedItem();
      if (!isCommitted) {
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
      const isCommitted = this.activeInventoryTransferSession.commitMenuItems(activation.items);
      if (!isCommitted) {
        engine.video.gridMenus.openMenu(
          this.activeInventoryTransferSession.createGridMenuDefinition(),
        );
      }
      this.refreshStatus(engine);
    }
  }

  private dropCarriedInventoryItem(
    engine: CartridgeSdkV1Runtime,
    carriedItem: RoccoGridMenuItem | undefined,
  ): void {
    if (!carriedItem) {
      return;
    }

    const inventoryItem = this.inventory.getItem(carriedItem.id);
    const activeLevelId = this.options.getActiveLevelId?.();
    const groundPoint = this.options.resolveDroppedInventoryGroundPoint?.();
    if (!inventoryItem?.groundSprite || !activeLevelId || !groundPoint) {
      return;
    }

    this.inventory.removeItem(inventoryItem.id);
    const handled = this.options.storeDroppedInventoryItem?.(activeLevelId, {
      item: {
        ...inventoryItem,
        slotIndex: carriedItem.slotIndex ?? inventoryItem.slotIndex,
      },
      groundPoint,
    });
    if (handled) {
      return;
    }

    engine.video.gridMenus.clearCarriedItem();
    engine.video.gridMenus.openMenu(this.inventory.createGridMenuDefinition(this.localization));
    this.options.syncWorldPresentation?.();
    this.refreshStatus(engine);
  }

  private finishInventoryTransferClose(
    engine: CartridgeSdkV1Runtime,
    shouldNotifyLevel: boolean,
  ): void {
    const closeHandler = shouldNotifyLevel ? this.activeInventoryTransferCloseHandler : undefined;
    this.activeInventoryTransferSession = undefined;
    this.activeInventoryTransferCloseHandler = undefined;
    closeHandler?.();
    this.refreshStatus(engine);
  }

  private refreshStatus(_engine: CartridgeSdkV1Runtime): void {
    this.options.refreshStatus?.();
  }

  private showInventoryFullLines(engine: CartridgeSdkV1Runtime | null | undefined): void {
    if (!engine) {
      return;
    }
    roccoCartridgeMessageRuntime.think(
      engine,
      ROCCO_PLAYER_CONFIG.ids.instance,
      this.localization.text.inventory.fullLines,
      {
        ttlMs: 3200,
      },
      {
        count: 1,
        historyKey: 'inventory-full',
        isAvoidImmediateRepeat: true,
      },
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
    return this.activeInventoryTransferSession !== undefined;
  }

  resetRuntimeState(): void {
    this.activeInventoryTransferSession = undefined;
    this.activeInventoryTransferCloseHandler = undefined;
  }

  createSnapshot(): RoccoInventoryRuntimeControllerSnapshot {
    return {
      storages: this.inventoryStorages
        .values()
        .map((storage) => ({
          storageId: storage.id,
          items: storage.listItems(),
        }))
        .toArray(),
    };
  }

  restoreSnapshot(snapshot: RoccoInventoryRuntimeControllerSnapshot): void {
    const snapshotStorageIds = new Set(snapshot.storages.map((storage) => storage.storageId));
    for (const storage of this.inventoryStorages.values()) {
      if (!snapshotStorageIds.has(storage.id)) {
        storage.clear();
      }
    }

    for (const storageSnapshot of snapshot.storages) {
      const storage = this.inventoryStorages.get(storageSnapshot.storageId);
      if (!storage) {
        continue;
      }

      storage.replaceItems(storageSnapshot.items);
    }

    this.activeInventoryTransferSession = undefined;
    this.activeInventoryTransferCloseHandler = undefined;
  }

  canCollectItem(
    engine: CartridgeSdkV1Runtime | null | undefined,
    itemId: string,
    shouldShowFullMessage = true,
  ): boolean {
    if (this.inventory.hasItem(itemId)) {
      return true;
    }

    if (!this.inventory.hasOpenSlot()) {
      if (shouldShowFullMessage) {
        this.showInventoryFullLines(engine);
      }
      return false;
    }

    return true;
  }

  tryAddItem(
    engine: CartridgeSdkV1Runtime | null | undefined,
    item: RoccoInventoryItem,
    shouldShowFullMessage = true,
  ): boolean {
    if (!this.canCollectItem(engine, item.id, shouldShowFullMessage)) {
      return false;
    }

    this.inventory.addItem(item);
    return true;
  }

  togglePlayerInventory(engine: CartridgeSdkV1Runtime): void {
    if (this.activeInventoryTransferSession) {
      this.closeActiveTransferSession(engine, undefined, true);
      return;
    }

    engine.video.gridMenus.toggleMenu(this.inventory.createGridMenuDefinition(this.localization));
    this.refreshStatus(engine);
  }

  openPlayerInventory(engine: CartridgeSdkV1Runtime): void {
    this.activeInventoryTransferSession = undefined;
    this.activeInventoryTransferCloseHandler = undefined;
    engine.video.gridMenus.openMenu(this.inventory.createGridMenuDefinition(this.localization));
    this.refreshStatus(engine);
  }

  openStorageInventory(
    engine: CartridgeSdkV1Runtime,
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
    this.activeInventoryTransferCloseHandler = onInventoryClosed ?? undefined;
    engine.video.gridMenus.openMenu(this.activeInventoryTransferSession.createGridMenuDefinition());
    this.refreshStatus(engine);
  }

  closeActiveTransferSession(
    engine: CartridgeSdkV1Runtime,
    storageId?: string,
    shouldNotifyLevel = false,
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
    this.finishInventoryTransferClose(engine, shouldNotifyLevel);
  }

  canHandleGridMenuAction(activation: RoccoGridMenuActivation): boolean {
    if (this.activeInventoryTransferSession?.matchesDefinition(activation.definitionId)) {
      return true;
    }

    return activation.definitionId === ROCCO_INVENTORY_MENU_ID;
  }

  handleGridMenuAction(
    engine: CartridgeSdkV1Runtime,
    activation: RoccoGridMenuActivation,
  ): boolean {
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
    engine: CartridgeSdkV1Runtime,
    activation: RoccoSceneClickAction,
    carriedItem = engine.video.gridMenus.getCarriedItem(),
  ): RoccoInventoryRuntimeActionResult | void {
    if (!this.shouldHandleSceneCarriedItem(carriedItem)) {
      return;
    }

    if (!activation.targetInstanceId) {
      engine.video.gridMenus.clearCarriedItem();
      return;
    }

    const specialResolution = this.options.handleSpecialSceneClick?.(activation, carriedItem);
    if (specialResolution?.handled) {
      return specialResolution.actionResult;
    }

    roccoCartridgeMessageRuntime.think(
      engine,
      ROCCO_PLAYER_CONFIG.ids.instance,
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
        isAvoidImmediateRepeat: true,
      },
    );
    engine.video.gridMenus.clearCarriedItem();
  }
}
