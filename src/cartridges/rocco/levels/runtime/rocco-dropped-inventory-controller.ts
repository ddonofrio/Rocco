
/* eslint-disable max-lines */

import type {
  CartridgeActionDisposition,
  RoccoSceneClickAction,
} from '../../../../console/cartridges';
import type { RoccoEngine } from '../../../../console/engine-sdk';
import type { RoccoActionMenuActivation } from '../../../../console/video/action-menu';
import type { RoccoPoint } from '../../../../console/video/sprites';
import {
  ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID,
  type RoccoInventoryItem,
} from '../../inventory';
import type { RoccoLocalization } from '../../localization';
import { roccoDefaultActionMenuAssetUrls } from '../../rocco-default-assets';
import {
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_RUN_ACTION_ID,
  DEFAULT_SPRITE_SCALE,
} from '../../rocco-default-constants';
import type { RoccoLevel } from '../rocco-level-types';
import { isRoccoToiletLevelCapability } from './rocco-level-capabilities';

interface RoccoDroppedInventoryItemState {
  item: RoccoInventoryItem;
  groundPoint: RoccoPoint;
}

interface RoccoPendingDroppedInventoryPickup {
  levelId: string;
  itemId: string;
}

export interface RoccoDroppedInventoryControllerSnapshot {
  droppedInventoryItemsByLevel: ReadonlyArray<
    readonly [string, readonly RoccoDroppedInventoryItemState[]]
  >;
  pendingDroppedInventoryPickup: RoccoPendingDroppedInventoryPickup | undefined;
  coralRelicRefuseIndex: number;
}

export interface RoccoDroppedInventoryControllerOptions {
  localization: RoccoLocalization;
  resolvePlayerGroundPoint: () => RoccoPoint | undefined;
  resolvePlayerBaseScale: () => number;
  tryAddItemToInventory: (item: RoccoInventoryItem) => boolean;
}

const DROPPED_INVENTORY_ITEM_SPRITE_DEFINITION_PREFIX = 'rocco-dropped-inventory-definition';
const DROPPED_INVENTORY_ITEM_SPRITE_INSTANCE_PREFIX = 'rocco-dropped-inventory-sprite';
const DROPPED_INVENTORY_ITEM_TARGET_PREFIX = 'rocco-dropped-inventory-target';
const DROPPED_INVENTORY_ITEM_STOP_DISTANCE = 10;
const DROPPED_CORAL_RELIC_ACTION_MENU_ID = 'rocco-dropped-coral-relic-action-menu';
const DROPPED_CORAL_RELIC_LOOK_ACTION_ID = 'look';
const DROPPED_CORAL_RELIC_STEP_ACTION_ID = 'step';
const DROPPED_INVENTORY_TARGET_PRIORITY = 32;
const DROPPED_INVENTORY_PICKUP_INPUT_OWNER_ID = 'dropped-inventory-pickup';

export class RoccoDroppedInventoryController {
  private readonly localization: RoccoLocalization;
  private readonly options: RoccoDroppedInventoryControllerOptions;
  private readonly droppedInventoryItemsByLevel = new Map<
    string,
    RoccoDroppedInventoryItemState[]
  >();
  private readonly activeDroppedInventoryRuntimeIds = new Set<string>();
  private pendingDroppedInventoryPickup: RoccoPendingDroppedInventoryPickup | undefined = undefined;
  private coralRelicRefuseIndex = 0;
  private pickupInputLease: ReturnType<RoccoEngine['acquireInputLease']> | undefined = undefined;

  constructor(options: RoccoDroppedInventoryControllerOptions) {
    this.options = options;
    this.localization = options.localization;
  }

  private createSuppressDefaultMovementDisposition(
    isConsumed: boolean,
  ): CartridgeActionDisposition {
    return {
      consumed: isConsumed,
      defaultPlayerMovement: 'suppress',
    };
  }

  private acquirePickupInputLease(engine: RoccoEngine): void {
    this.pickupInputLease ??= engine.acquireInputLease(
      DROPPED_INVENTORY_PICKUP_INPUT_OWNER_ID,
      'blocked',
    );
  }

  private releasePickupInputLease(): void {
    this.pickupInputLease?.dispose();
    this.pickupInputLease = undefined;
  }

  private resolvePlayerBaseScale(): number {
    const scale = this.options.resolvePlayerBaseScale();
    return Number.isFinite(scale) && scale > 0 ? scale : DEFAULT_SPRITE_SCALE;
  }

  private startDroppedInventoryPickup(
    engine: RoccoEngine,
    activeLevel: RoccoLevel,
    droppedItem: RoccoDroppedInventoryItemState,
  ): void {
    const levelId = activeLevel.id;
    const currentGroundPoint = this.options.resolvePlayerGroundPoint();
    if (
      currentGroundPoint &&
      Math.hypot(
        droppedItem.groundPoint.x - currentGroundPoint.x,
        droppedItem.groundPoint.y - currentGroundPoint.y,
      ) <= DROPPED_INVENTORY_ITEM_STOP_DISTANCE
    ) {
      this.finishDroppedInventoryPickup(
        engine,
        activeLevel,
        levelId,
        droppedItem.item.id,
      );
      return;
    }

    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    this.acquirePickupInputLease(engine);
    const isStarted = engine.video.sprites.goTo(
      DEFAULT_SPRITE_INSTANCE_ID,
      droppedItem.groundPoint.x,
      droppedItem.groundPoint.y,
      {
        action: DEFAULT_SPRITE_RUN_ACTION_ID,
        idleAction: DEFAULT_SPRITE_IDLE_ACTION_ID,
        stopDistance: DROPPED_INVENTORY_ITEM_STOP_DISTANCE,
        idleSettleDelayMs: 0,
        idleSettleFacing: 'diagonal-from-facing',
      },
    );
    if (!isStarted) {
      this.releasePickupInputLease();
      return;
    }

    this.pendingDroppedInventoryPickup = {
      levelId,
      itemId: droppedItem.item.id,
    };
    engine.video.render(0);
  }

  private finishDroppedInventoryPickup(
    engine: RoccoEngine,
    activeLevel: RoccoLevel,
    levelId: string,
    itemId: string,
  ): void {
    const droppedItems = this.droppedInventoryItemsByLevel.get(levelId) ?? [];
    const droppedItem = droppedItems.find((item) => item.item.id === itemId);
    if (!droppedItem) {
      this.pendingDroppedInventoryPickup = undefined;
      this.releasePickupInputLease();
      return;
    }

    if (!this.options.tryAddItemToInventory(droppedItem.item)) {
      this.pendingDroppedInventoryPickup = undefined;
      this.releasePickupInputLease();
      engine.video.render(0);
      return;
    }

    this.removeDroppedInventoryItem(levelId, itemId);
    this.pendingDroppedInventoryPickup = undefined;
    if (activeLevel.id === levelId) {
      this.syncActiveLevelPresentation(engine, activeLevel);
    }
    this.releasePickupInputLease();
    engine.video.messages.think(
      DEFAULT_SPRITE_INSTANCE_ID,
      this.localization.text.inventory.pickupLine,
      {
        ttlMs: 2400,
      },
    );
    engine.video.render(0);
  }

  private removeDroppedInventoryItem(levelId: string, itemId: string): void {
    const nextItems = (this.droppedInventoryItemsByLevel.get(levelId) ?? []).filter(
      (item) => item.item.id !== itemId,
    );
    if (nextItems.length === 0) {
      this.droppedInventoryItemsByLevel.delete(levelId);
      return;
    }

    this.droppedInventoryItemsByLevel.set(levelId, nextItems);
  }

  private installDroppedInventoryPresentation(
    engine: RoccoEngine,
    levelId: string,
    droppedItem: RoccoDroppedInventoryItemState,
    playerBaseScale: number,
  ): void {
    if (!droppedItem.item.groundSprite) {
      return;
    }

    const runtimeId = `${levelId}:${droppedItem.item.id}`;
    const definitionId = `${DROPPED_INVENTORY_ITEM_SPRITE_DEFINITION_PREFIX}:${droppedItem.item.id}`;
    const spriteInstanceId = `${DROPPED_INVENTORY_ITEM_SPRITE_INSTANCE_PREFIX}:${runtimeId}`;
    const targetInstanceId = `${DROPPED_INVENTORY_ITEM_TARGET_PREFIX}:${runtimeId}`;
    const groundSprite = droppedItem.item.groundSprite;
    const scale = Math.max(0.01, groundSprite.scaleRelativeToRoccoBase * playerBaseScale);

    this.registerDroppedInventorySpriteDefinition(engine, definitionId, droppedItem.item, groundSprite);
    engine.video.sprites.removeSprite(spriteInstanceId);
    engine.video.sprites.createSpriteFromDefinition(definitionId, {
      id: spriteInstanceId,
      transform: {
        x: droppedItem.groundPoint.x,
        y: droppedItem.groundPoint.y,
        scaleX: scale,
        scaleY: scale,
        rotation: 0,
      },
      renderLayer: groundSprite.renderLayer ?? 'world.behind',
      zIndex: groundSprite.zIndex ?? 12,
      depthMode: 'fixed',
      interactive: groundSprite.pickable,
      collisionEnabled: false,
      visibleDescription: {
        enabled: true,
        text: droppedItem.item.label,
      },
      state: {
        pickable: groundSprite.pickable,
      },
    });
    this.registerDroppedInventoryTarget(engine, targetInstanceId, definitionId, droppedItem, groundSprite, scale);
    this.activeDroppedInventoryRuntimeIds.add(runtimeId);
  }

  private registerDroppedInventorySpriteDefinition(
    engine: RoccoEngine,
    definitionId: string,
    item: RoccoInventoryItem,
    groundSprite: NonNullable<RoccoInventoryItem['groundSprite']>,
  ): void {
    engine.video.sprites.loadSpriteDefinition({
      id: definitionId,
      name: `Dropped ${item.label}`,
      images: [{ id: `${definitionId}:image`, uri: groundSprite.imageUri, width: groundSprite.width, height: groundSprite.height }],
      frames: [{
        id: `${definitionId}:frame`,
        imageId: `${definitionId}:image`,
        durationMs: 1000,
        pivot: { x: groundSprite.width / 2, y: groundSprite.height },
      }],
      animations: {
        idle: {
          id: 'idle',
          loop: false,
          playbackRate: 1,
          frames: [{ frameId: `${definitionId}:frame`, durationMs: 1000 }],
        },
      },
      defaultAnimation: 'idle',
      render: {
        renderLayer: groundSprite.renderLayer ?? 'world.behind',
        zIndex: groundSprite.zIndex ?? 12,
        depthMode: 'fixed',
        opacity: 1,
      },
      metadata: { pickable: groundSprite.pickable, purpose: 'dropped-inventory-item' },
    });
  }

  private registerDroppedInventoryTarget(
    engine: RoccoEngine,
    targetInstanceId: string,
    definitionId: string,
    droppedItem: RoccoDroppedInventoryItemState,
    groundSprite: NonNullable<RoccoInventoryItem['groundSprite']>,
    scale: number,
  ): void {
    engine.video.sceneTargets?.unregisterTarget(targetInstanceId);
    if (!groundSprite.pickable) {
      return;
    }
    const paddingX = groundSprite.clickTargetPadding?.x ?? 0;
    const paddingY = groundSprite.clickTargetPadding?.y ?? 0;
    const width = Math.max(1, groundSprite.width * scale);
    const height = Math.max(1, groundSprite.height * scale);
    engine.video.sceneTargets?.registerTarget({
      instanceId: targetInstanceId,
      definitionId: `${definitionId}:target`,
      shape: {
        kind: 'rect',
        x: droppedItem.groundPoint.x - width / 2 - paddingX,
        y: droppedItem.groundPoint.y - height - paddingY,
        width: width + paddingX * 2,
        height: height + paddingY * 2,
      },
      priority: DROPPED_INVENTORY_TARGET_PRIORITY,
      renderLayer: groundSprite.renderLayer ?? 'world.behind',
      visibleDescription: { enabled: true, text: droppedItem.item.label },
    });
  }

  private findDroppedInventoryItemByTargetInstanceId(
    levelId: string,
    targetInstanceId: string,
  ): RoccoDroppedInventoryItemState | undefined {
    return (this.droppedInventoryItemsByLevel.get(levelId) ?? []).find((item) => {
      const runtimeId = `${levelId}:${item.item.id}`;
      return (
        `${DROPPED_INVENTORY_ITEM_SPRITE_INSTANCE_PREFIX}:${runtimeId}` === targetInstanceId ||
        `${DROPPED_INVENTORY_ITEM_TARGET_PREFIX}:${runtimeId}` === targetInstanceId
      );
    });
  }

  private shouldOpenDroppedCoralRelicMenu(activeLevel: RoccoLevel, itemId: string): boolean {
    return (
      itemId === ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID &&
      isRoccoToiletLevelCapability(activeLevel) &&
      activeLevel.isEscapeUrgencyActive()
    );
  }

  private showCoralRelicRefusal(engine: RoccoEngine, targetInstanceId: string): void {
    const refusalLines = this.localization.text.baitShop.coralRelicRefuseLines;
    if (refusalLines.length === 0) {
      return;
    }

    const line = refusalLines[this.coralRelicRefuseIndex % refusalLines.length];
    this.coralRelicRefuseIndex += 1;
    engine.video.messages.think(targetInstanceId, line, {
      ttlMs: 3200,
    });
    engine.video.render(0);
  }

  private syncDroppedCoralRelicActionMenu(
    engine: RoccoEngine,
    activeLevel: RoccoLevel,
  ): void {
    engine.video.actionMenus.unregisterMenu(DROPPED_CORAL_RELIC_ACTION_MENU_ID);
    if (
      !isRoccoToiletLevelCapability(activeLevel) ||
      !activeLevel.isEscapeUrgencyActive()
    ) {
      return;
    }

    const hasDroppedCoralRelic = (this.droppedInventoryItemsByLevel.get(activeLevel.id) ?? []).some(
      (item) => item.item.id === ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID,
    );
    if (!hasDroppedCoralRelic) {
      return;
    }

    engine.video.actionMenus.registerMenu({
      id: DROPPED_CORAL_RELIC_ACTION_MENU_ID,
      targetInstanceIds: [
        `${DROPPED_INVENTORY_ITEM_SPRITE_INSTANCE_PREFIX}:${activeLevel.id}:${ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID}`,
        `${DROPPED_INVENTORY_ITEM_TARGET_PREFIX}:${activeLevel.id}:${ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID}`,
      ],
      renderLayer: 'ui.action-menu',
      itemSize: 92,
      orbitRadius: 88,
      orbitSpeedRadiansPerSecond: 0.08,
      hoverScale: 1.16,
      circleFill: '#0f1610',
      circleStroke: '#d7e6c5',
      circleStrokeWidth: 2,
      items: [
        {
          id: DROPPED_CORAL_RELIC_LOOK_ACTION_ID,
          actionId: DROPPED_CORAL_RELIC_LOOK_ACTION_ID,
          label: this.localization.text.actions.look,
          imageUri: roccoDefaultActionMenuAssetUrls.look,
        },
        {
          id: DROPPED_CORAL_RELIC_STEP_ACTION_ID,
          actionId: DROPPED_CORAL_RELIC_STEP_ACTION_ID,
          label: this.localization.text.baitShop.coralRelicStepLabel,
          imageUri: roccoDefaultActionMenuAssetUrls.kick,
        },
        {
          id: 'grab',
          actionId: 'grab',
          label: this.localization.text.actions.grab,
          imageUri: roccoDefaultActionMenuAssetUrls.grab,
        },
      ],
    });
  }

  hasPendingPickup(): boolean {
    return this.pendingDroppedInventoryPickup !== undefined;
  }

  resetRuntimeState(): void {
    this.pendingDroppedInventoryPickup = undefined;
    this.releasePickupInputLease();
  }

  createSnapshot(): RoccoDroppedInventoryControllerSnapshot {
    return {
      droppedInventoryItemsByLevel: [...this.droppedInventoryItemsByLevel].map(
        ([levelId, items]) => [
          levelId,
          items.map((item) => ({
            item: structuredClone(item.item),
            groundPoint: { ...item.groundPoint },
          })),
        ] as const,
      ),
      pendingDroppedInventoryPickup: this.pendingDroppedInventoryPickup
        ? { ...this.pendingDroppedInventoryPickup }
        : undefined,
      coralRelicRefuseIndex: this.coralRelicRefuseIndex,
    };
  }

  restoreSnapshot(snapshot: RoccoDroppedInventoryControllerSnapshot): void {
    this.droppedInventoryItemsByLevel.clear();
    for (const [levelId, items] of snapshot.droppedInventoryItemsByLevel) {
      this.droppedInventoryItemsByLevel.set(
        levelId,
        items.map((item) => ({
          item: structuredClone(item.item),
          groundPoint: { ...item.groundPoint },
        })),
      );
    }

    this.pendingDroppedInventoryPickup = snapshot.pendingDroppedInventoryPickup
      ? { ...snapshot.pendingDroppedInventoryPickup }
      : undefined;
    this.coralRelicRefuseIndex = Math.max(0, Math.floor(snapshot.coralRelicRefuseIndex));
    this.releasePickupInputLease();
  }

  clearLevelItemsWhere(shouldClearLevel: (levelId: string) => boolean): void {
    for (const levelId of this.droppedInventoryItemsByLevel.keys()) {
      if (shouldClearLevel(levelId)) {
        this.droppedInventoryItemsByLevel.delete(levelId);
      }
    }

    if (
      this.pendingDroppedInventoryPickup &&
      shouldClearLevel(this.pendingDroppedInventoryPickup.levelId)
    ) {
      this.pendingDroppedInventoryPickup = undefined;
      this.releasePickupInputLease();
    }
  }

  hasAccessibleItem(
    levelId: string,
    inventoryItems: readonly RoccoInventoryItem[],
    itemId: string,
  ): boolean {
    if (inventoryItems.some((item) => item.id === itemId)) {
      return true;
    }

    return (this.droppedInventoryItemsByLevel.get(levelId) ?? []).some(
      (droppedItem) => droppedItem.item.id === itemId,
    );
  }

  listAccessibleItemIds(levelId: string, inventoryItems: readonly RoccoInventoryItem[]): string[] {
    const itemIds = new Set(inventoryItems.map((item) => item.id));
    const droppedItems = this.droppedInventoryItemsByLevel.get(levelId) ?? [];
    for (const droppedItem of droppedItems) {
      itemIds.add(droppedItem.item.id);
    }

    return [...itemIds];
  }

  dropItem(levelId: string, item: RoccoInventoryItem, groundPoint: RoccoPoint): void {
    const nextItems = (this.droppedInventoryItemsByLevel.get(levelId) ?? []).filter(
      (entry) => entry.item.id !== item.id,
    );
    nextItems.push({
      item: structuredClone(item),
      groundPoint: { ...groundPoint },
    });
    this.droppedInventoryItemsByLevel.set(levelId, nextItems);
  }

  canHandleSceneClick(
    engine: RoccoEngine,
    activeLevel: RoccoLevel,
    activation: RoccoSceneClickAction,
  ): boolean {
    if (!activation.targetInstanceId) {
      return false;
    }

    if (engine.video.gridMenus.getCarriedItem()) {
      return false;
    }

    const droppedItem = this.findDroppedInventoryItemByTargetInstanceId(
      activeLevel.id,
      activation.targetInstanceId,
    );
    return Boolean(droppedItem?.item.groundSprite?.pickable);
  }

  handleSceneClick(
    engine: RoccoEngine,
    activeLevel: RoccoLevel,
    activation: RoccoSceneClickAction,
  ): CartridgeActionDisposition | undefined {
    if (!activation.targetInstanceId) {
      return undefined;
    }

    if (engine.video.gridMenus.getCarriedItem()) {
      return undefined;
    }

    const droppedItem = this.findDroppedInventoryItemByTargetInstanceId(
      activeLevel.id,
      activation.targetInstanceId,
    );
    if (!droppedItem?.item.groundSprite?.pickable) {
      return undefined;
    }

    if (this.shouldOpenDroppedCoralRelicMenu(activeLevel, droppedItem.item.id)) {
      return this.createSuppressDefaultMovementDisposition(false);
    }

    this.startDroppedInventoryPickup(engine, activeLevel, droppedItem);
    return this.createSuppressDefaultMovementDisposition(true);
  }

  canHandleActionMenu(
    _engine: RoccoEngine,
    activeLevel: RoccoLevel,
    activation: RoccoActionMenuActivation,
  ): boolean {
    if (activation.definitionId !== DROPPED_CORAL_RELIC_ACTION_MENU_ID) {
      return false;
    }

    if (!isRoccoToiletLevelCapability(activeLevel) || !activeLevel.isEscapeUrgencyActive()) {
      return false;
    }

    const droppedItem = this.findDroppedInventoryItemByTargetInstanceId(
      activeLevel.id,
      activation.targetInstanceId,
    );
    return droppedItem?.item.id === ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID;
  }

  handleActionMenu(
    engine: RoccoEngine,
    activeLevel: RoccoLevel,
    activation: RoccoActionMenuActivation,
  ): boolean {
    if (
      activation.definitionId !== DROPPED_CORAL_RELIC_ACTION_MENU_ID ||
      !isRoccoToiletLevelCapability(activeLevel) ||
      !activeLevel.isEscapeUrgencyActive()
    ) {
      return false;
    }

    const droppedItem = this.findDroppedInventoryItemByTargetInstanceId(
      activeLevel.id,
      activation.targetInstanceId,
    );
    if (!droppedItem || droppedItem.item.id !== ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID) {
      return false;
    }

    if (activation.actionId === DROPPED_CORAL_RELIC_LOOK_ACTION_ID) {
      engine.video.messages.think(
        activation.targetInstanceId,
        this.localization.text.baitShop.coralRelicLookLine,
        {
          ttlMs: 3200,
        },
      );
      engine.video.render(0);
      return true;
    }

    if (activation.actionId === 'grab') {
      this.showCoralRelicRefusal(engine, activation.targetInstanceId);
      return true;
    }

    if (activation.actionId === DROPPED_CORAL_RELIC_STEP_ACTION_ID) {
      const activeLevelId = activeLevel.id;
      activeLevel.openCoralRelicWishMenu(droppedItem.groundPoint, () => {
        this.removeDroppedInventoryItem(activeLevelId, ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID);
        this.syncActiveLevelPresentation(engine, activeLevel);
      });
      return true;
    }

    return false;
  }

  updatePendingPickup(engine: RoccoEngine, activeLevel: RoccoLevel | null): void {
    if (!activeLevel || !this.pendingDroppedInventoryPickup) {
      return;
    }

    if (!engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID)) {
      this.pendingDroppedInventoryPickup = undefined;
      this.releasePickupInputLease();
      return;
    }

    if (engine.video.sprites.isMoving(DEFAULT_SPRITE_INSTANCE_ID)) {
      return;
    }

    this.finishDroppedInventoryPickup(
      engine,
      activeLevel,
      this.pendingDroppedInventoryPickup.levelId,
      this.pendingDroppedInventoryPickup.itemId,
    );
  }

  syncActiveLevelPresentation(engine: RoccoEngine, activeLevel: RoccoLevel): void {
    this.clearActiveLevelPresentation(engine);
    const droppedItems = this.droppedInventoryItemsByLevel.get(activeLevel.id) ?? [];
    for (const droppedItem of droppedItems) {
      this.installDroppedInventoryPresentation(
        engine,
        activeLevel.id,
        droppedItem,
        this.resolvePlayerBaseScale(),
      );
    }
    this.syncDroppedCoralRelicActionMenu(engine, activeLevel);
  }

  clearActiveLevelPresentation(engine?: RoccoEngine): void {
    if (!engine) {
      this.activeDroppedInventoryRuntimeIds.clear();
      return;
    }

    engine.video.actionMenus.unregisterMenu(DROPPED_CORAL_RELIC_ACTION_MENU_ID);
    for (const runtimeId of this.activeDroppedInventoryRuntimeIds) {
      engine.video.sprites.removeSprite(
        `${DROPPED_INVENTORY_ITEM_SPRITE_INSTANCE_PREFIX}:${runtimeId}`,
      );
      engine.video.sceneTargets?.unregisterTarget(
        `${DROPPED_INVENTORY_ITEM_TARGET_PREFIX}:${runtimeId}`,
      );
    }
    this.activeDroppedInventoryRuntimeIds.clear();
  }
}
