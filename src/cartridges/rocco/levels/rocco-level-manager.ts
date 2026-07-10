import type { RoccoEngine } from '../../../console/engine-sdk';
import type {
  RoccoCartridgeAction,
  RoccoCartridgeActionResult,
} from '../../../console/cartridges';
import type { RoccoPlaneScene } from '../../../console/video/planes';
import type { RoccoPoint } from '../../../console/video/sprites';
import {
  DEFAULT_BAIT_SHOP_DOOR_HEIGHT,
  DEFAULT_BAIT_SHOP_DOOR_PIVOT_X,
  DEFAULT_BAIT_SHOP_DOOR_PIVOT_Y,
  DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID,
  DEFAULT_BAIT_SHOP_DOOR_WIDTH,
  DEFAULT_BAIT_SHOP_DOOR_X,
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_SPRITE_FRAME_HEIGHT,
  DEFAULT_SPRITE_FRAME_WIDTH,
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_SCALE,
  DEFAULT_STAN_SLEEPING_ANIMATION_ID,
  DEFAULT_STAN_SPRITE_INSTANCE_ID,
  PIER_LEVEL_TRANSITION_COOLDOWN_MS,
  ROCCO_PIER_MIDDLE_LEVEL_ID,
  ROCCO_PIER_START_LEVEL_ID,
} from '../games/rocco-default/constants';
import {
  roccoDefaultDeveloperSpriteCycleCursorAssetUrl,
  roccoDefaultActionMenuAssetUrls,
  roccoDefaultPoliceWhistleSoundUrl,
} from '../games/rocco-default/sprites';
import { createRoccoLocalization, type RoccoLocalization } from '../games/rocco-default/localization';
import {
  createRoccoKeysInventoryItem,
  createRoccoMagazineInventoryItem,
  createRoccoMysteriousKeyInventoryItem,
  planRoccoCoralRelicAssembly,
  RoccoInventory,
  ROCCO_INVENTORY_BATA_ITEM_ID,
  ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID,
  ROCCO_INVENTORY_KEYS_ITEM_ID,
  ROCCO_INVENTORY_MAGAZINE_ITEM_ID,
  ROCCO_INVENTORY_MYSTERIOUS_KEY_ITEM_ID,
  type RoccoInventoryItem,
} from '../games/rocco-default/inventory';
import { createRoccoAppearanceSpriteDefinition } from '../games/rocco-default/sprites';
import {
  installRoccoPlayerActionMenu,
  uninstallRoccoPlayerActionMenu,
} from '../games/rocco-default/player';
import {
  DEFAULT_ROCCO_PLAYER_APPEARANCE,
  ROCCO_LAB_COAT_PLAYER_APPEARANCE,
  type RoccoPlayerAppearance,
} from '../games/rocco-default/player';
import { roccoCartridgeMessageRuntime } from '../rpce/dialogue';
import {
  type RoccoLevel,
  type RoccoLevelRestartRequest,
} from './rocco-level-types';
import {
  installPierBeginningAmbient,
  type RoccoPierBeginningAmbientPersistentState,
} from '../games/rocco-default/maps/pier';
import {
  RoccoBaitShopToiletLevel,
  ROCCO_BAIT_SHOP_LEVEL_ID,
  ROCCO_BAIT_SHOP_TOILET_LEVEL_ID,
} from '../games/rocco-default/maps/shop';
import { RoccoDeveloperRuntimeController } from './runtime/rocco-developer-runtime-controller';
import { RoccoLevelRegistry } from './runtime/rocco-level-registry';
import {
  RoccoLevelTransitionController,
  type RoccoResolvedLevelTransition,
} from './runtime/rocco-level-transition-controller';
import {
  RoccoInventoryRuntimeController,
} from './runtime/rocco-inventory-runtime-controller';
import { RoccoDroppedInventoryController } from './runtime/rocco-dropped-inventory-controller';
import {
  ROCCO_STAN_POLICE_DEFEAT_SOUND_ID,
  RoccoScriptedSequenceController,
} from './runtime/rocco-scripted-sequence-controller';
import { RoccoSceneActionRouter } from './runtime/rocco-scene-action-router';
import { RoccoAssetPreloader } from './rocco-asset-preloader';
import { createRoccoDefaultGameMaps } from '../games/rocco-default';

export interface RoccoLevelManagerMountResult {
  level: RoccoLevel;
  scene: RoccoPlaneScene;
}

export interface RoccoLevelManagerOptions {
  cartridgeTitle?: string;
  localization?: RoccoLocalization;
  inventory?: RoccoInventory;
  onRestartRequested?: () => void;
}

const BAIT_SHOP_DOOR_PLAYER_RIGHT_EDGE_OFFSET = Math.round(
  (DEFAULT_SPRITE_FRAME_WIDTH - DEFAULT_SPRITE_GROUND_ANCHOR_X) * DEFAULT_SPRITE_SCALE,
);
const BAIT_SHOP_DOOR_END_GROUND_X =
  DEFAULT_BAIT_SHOP_DOOR_X +
  DEFAULT_BAIT_SHOP_DOOR_WIDTH -
  BAIT_SHOP_DOOR_PLAYER_RIGHT_EDGE_OFFSET;
const DEFAULT_START_LEVEL_ID = ROCCO_PIER_MIDDLE_LEVEL_ID;
const ROCCO_SHARED_UI_ASSET_URLS = [
  roccoDefaultActionMenuAssetUrls.developerMode,
  roccoDefaultActionMenuAssetUrls.grab,
  roccoDefaultActionMenuAssetUrls.inventory,
  roccoDefaultActionMenuAssetUrls.kick,
  roccoDefaultActionMenuAssetUrls.look,
  roccoDefaultActionMenuAssetUrls.talk,
  roccoDefaultActionMenuAssetUrls.useWc,
  roccoDefaultDeveloperSpriteCycleCursorAssetUrl,
] as const;

interface RoccoNetherEntrySnapshot {
  inventoryItems: RoccoInventoryItem[];
  roccoAppearance: RoccoPlayerAppearance;
}

export class RoccoLevelManager {
  private readonly levelRegistry: RoccoLevelRegistry;
  private readonly transitions: RoccoLevelTransitionController;
  private readonly inventoryRuntime: RoccoInventoryRuntimeController;
  private readonly droppedInventory: RoccoDroppedInventoryController;
  private readonly scriptedSequences: RoccoScriptedSequenceController;
  private readonly developerRuntime: RoccoDeveloperRuntimeController;
  private readonly actionRouter: RoccoSceneActionRouter;
  private readonly options: RoccoLevelManagerOptions;
  private readonly beginningAmbientState: RoccoPierBeginningAmbientPersistentState = {
    stan: {
      isIdentified: false,
    },
    door: {
      revealed: true,
    },
  };
  private engine: RoccoEngine | null = null;
  private activeLevel: RoccoLevel | null = null;
  private activeSceneId: string | null = null;
  private transitioning = false;
  private readonly localization: RoccoLocalization;
  private roccoAppearance: RoccoPlayerAppearance = DEFAULT_ROCCO_PLAYER_APPEARANCE;
  private netherEntrySnapshot: RoccoNetherEntrySnapshot | null = null;

  private get inventory(): RoccoInventory {
    return this.inventoryRuntime.getPlayerInventory();
  }

  constructor(options: RoccoLevelManagerOptions = {}) {
    this.options = {
      cartridgeTitle: 'ROCCO',
      ...options,
    };
    this.localization = options.localization ?? createRoccoLocalization();
    this.droppedInventory = new RoccoDroppedInventoryController({
      localization: this.localization,
      resolvePlayerGroundPoint: () => this.resolvePlayerGroundPoint(),
      resolvePlayerBaseScale: () => this.resolvePlayerBaseScale(),
      tryAddItemToInventory: (item) => this.tryAddItemToInventory(item),
    });
    this.scriptedSequences = new RoccoScriptedSequenceController({
      localization: this.localization,
      onRestartRequested: this.options.onRestartRequested,
      onEnterBaitShopRequested: () => this.enterBaitShop(),
      clearPendingExitIntent: () => this.transitions.clearPendingExitIntent(),
      resolvePlayerGroundPoint: () => this.resolvePlayerGroundPoint(),
      doesPlayerOverlapBaitShopDoor: () => this.doesPlayerOverlapBaitShopDoor(),
      isStanAwake: () => this.isStanAwake(),
      baitShopDoorEndGroundX: BAIT_SHOP_DOOR_END_GROUND_X,
    });
    this.inventoryRuntime = new RoccoInventoryRuntimeController({
      localization: this.localization,
      inventory: options.inventory,
      getActiveLevelId: () => this.activeLevel?.id ?? null,
      handleSpecialSceneClick: (activation, carriedItem) =>
        this.actionRouter.handleSpecialInventorySceneClick(activation, carriedItem),
      resolveDroppedInventoryGroundPoint: () => this.resolveDroppedInventoryGroundPoint(),
      storeDroppedInventoryItem: (levelId, droppedItem) =>
        this.storeDroppedInventoryItem(levelId, droppedItem),
      syncWorldPresentation: () => this.syncActiveLevelDroppedInventoryPresentation(),
      refreshStatus: () => this.refreshStatus(),
    });
    this.transitions = new RoccoLevelTransitionController({
      canTraverseConnector: (connector) =>
        !connector.requiresKeys || this.inventory.hasItem(ROCCO_INVENTORY_KEYS_ITEM_ID),
      resolvePlayerGroundPoint: () => this.resolvePlayerGroundPoint(),
    });
    this.developerRuntime = new RoccoDeveloperRuntimeController({
      localization: this.localization,
      inventory: this.inventory,
      resolveLevelTitle: (levelId) => this.levelRegistry.requireLevel(levelId).title,
      switchToLevel: (levelId) => this.switchToLevel(levelId),
      canCollectInventoryItem: (itemId, showFullMessage) =>
        this.canCollectIntoInventory(itemId, showFullMessage),
      refreshStatus: () => this.refreshStatus(),
      onToiletReuseEventChanged: () => {
        if (this.activeLevel instanceof RoccoBaitShopToiletLevel) {
          this.activeLevel.refreshDeveloperEventPresentation();
        }
      },
    });
    this.actionRouter = new RoccoSceneActionRouter({
      localization: this.localization,
      inventory: this.inventory,
      transitions: this.transitions,
      inventoryRuntime: this.inventoryRuntime,
      droppedInventory: this.droppedInventory,
      scriptedSequences: this.scriptedSequences,
      developerRuntime: this.developerRuntime,
      getEngine: () => this.engine,
      getActiveLevel: () => this.activeLevel,
      getRoccoAppearance: () => this.roccoAppearance,
      setRoccoAppearance: (appearance) => {
        this.roccoAppearance = appearance;
      },
      isStanIdentified: () => this.isStanIdentified(),
      isStanAwake: () => this.isStanAwake(),
    });
    this.levelRegistry = new RoccoLevelRegistry({
      maps: createRoccoDefaultGameMaps({
        localization: this.localization,
        mountPierBeginningAmbient: (engine, _localization, _persistentState, _preloader, entryConnectorId) =>
          installPierBeginningAmbient(
            engine,
            this.localization,
            this.beginningAmbientState,
            undefined,
            entryConnectorId,
          ),
        isStanIdentified: () => this.beginningAmbientState.stan.isIdentified,
        hasMysteriousKey: () => this.inventory.hasItem(ROCCO_INVENTORY_MYSTERIOUS_KEY_ITEM_ID),
        onMysteriousKeyCollected: () =>
          this.tryAddItemToInventory(createRoccoMysteriousKeyInventoryItem(this.localization)),
        hasMagazine: () => this.inventory.hasItem(ROCCO_INVENTORY_MAGAZINE_ITEM_ID),
        onMagazineCollected: (known) =>
          this.tryAddItemToInventory(createRoccoMagazineInventoryItem(this.localization, known)),
        hasCoralRelic: () =>
          this.hasAccessibleInventoryItem(
            ROCCO_BAIT_SHOP_TOILET_LEVEL_ID,
            ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID,
          ),
        getCoralRelicAssemblyPlan: () =>
          planRoccoCoralRelicAssembly(
            this.listAccessibleInventoryItemIds(ROCCO_BAIT_SHOP_TOILET_LEVEL_ID),
          ),
        allowToiletReuseDuringUrgency: () =>
          this.developerRuntime.isToiletReuseAllowedDuringUrgency(),
        openStorageInventory: (storageId, onInventoryClosed) => {
          this.openInventoryTransferMenu(storageId, onInventoryClosed);
        },
        closeStorageInventory: (storageId) => {
          this.closeInventoryTransferMenu(storageId);
        },
        onExitShopRequested: () => {
          void this.switchToLevel(ROCCO_PIER_START_LEVEL_ID, 'shop-exit');
        },
      }),
    });
  }

  async mount(engine: RoccoEngine, preloader?: RoccoAssetPreloader): Promise<RoccoLevelManagerMountResult> {
    this.engine = engine;
    await preloader?.preloadAssetUrls(engine, ROCCO_SHARED_UI_ASSET_URLS).catch(() => {
      this.engine?.log('Assets', 'Some shared Rocco UI assets could not be preloaded.');
    });
    this.engine.audio.registerSound({
      id: ROCCO_STAN_POLICE_DEFEAT_SOUND_ID,
      uri: roccoDefaultPoliceWhistleSoundUrl,
      volume: 0.45,
      loop: false,
    });
    await preloader?.preloadSound(engine, ROCCO_STAN_POLICE_DEFEAT_SOUND_ID).catch(() => {
      this.engine?.log('Audio', 'Stan police whistle sound could not be preloaded.');
    });
    this.engine.audio.stopSound(ROCCO_STAN_POLICE_DEFEAT_SOUND_ID);
    this.activeSceneId = null;
    this.developerRuntime.resetRuntimeState(this.engine);
    this.transitions.reset();
    this.droppedInventory.resetRuntimeState();
    this.scriptedSequences.resetRuntimeState(this.engine);
    this.inventoryRuntime.resetRuntimeState();
    this.netherEntrySnapshot = null;
    const level = this.levelRegistry.requireLevel(DEFAULT_START_LEVEL_ID);
    this.activeLevel = level;
    const scene = await level.mount(engine, this.createLevelMountOptions(), preloader);
    installRoccoPlayerActionMenu(engine, this.localization);
    this.syncActiveLevelDroppedInventoryPresentation();
    this.updateStatus(scene);
    return { level, scene };
  }

  unmount(): void {
    if (!this.engine || !this.activeLevel) {
      return;
    }

    this.developerRuntime.resetRuntimeState(this.engine);
    this.activeLevel.unmount(this.engine);
    uninstallRoccoPlayerActionMenu(this.engine);
    this.activeSceneId = null;
    this.transitions.reset();
    this.droppedInventory.resetRuntimeState();
    this.scriptedSequences.resetRuntimeState(this.engine);
    this.inventoryRuntime.resetRuntimeState();
    this.clearActiveLevelDroppedInventoryPresentation();
    this.netherEntrySnapshot = null;
    this.engine.audio.unregisterSound(ROCCO_STAN_POLICE_DEFEAT_SOUND_ID);
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.gridMenus.clearCarriedItem();
    this.activeLevel = null;
    this.engine = null;
  }

  update(deltaMs: number): void {
    const engine = this.engine;
    if (this.scriptedSequences.hasBlockingSequence()) {
      if (!engine) {
        return;
      }

      this.scriptedSequences.updateBlockingSequence(engine, deltaMs);
      return;
    }

    this.activeLevel?.update(deltaMs);
    if (this.droppedInventory.hasPendingPickup()) {
      this.updateDroppedInventoryPickup();
      return;
    }

    if (this.scriptedSequences.hasPendingBaitShopDoorUse()) {
      if (!engine) {
        return;
      }

      this.scriptedSequences.updatePendingBaitShopDoorUse(engine, this.activeLevel?.id ?? null);
      return;
    }

    if (!engine || !this.activeLevel || this.transitioning) {
      return;
    }

    const transition = this.transitions.update(this.activeLevel, deltaMs);
    if (!transition) {
      return;
    }

    if (
      this.activeLevel instanceof RoccoBaitShopToiletLevel &&
      this.activeLevel.shouldLoseOnExit(transition.connector.id)
    ) {
      this.transitions.clearPendingExitIntent();
      this.activeLevel.beginExitDefeat();
      return;
    }

    void this.transitionThrough(transition);
  }

  handleAction(activation: RoccoCartridgeAction): RoccoCartridgeActionResult | void {
    return this.actionRouter.handleAction(activation);
  }

  getActiveLevel(): RoccoLevel | null {
    return this.activeLevel;
  }

  private isNetherLevelId(levelId: string): boolean {
    return levelId.startsWith('nether-');
  }

  private isEnteringNether(fromLevelId: string, toLevelId: string): boolean {
    return !this.isNetherLevelId(fromLevelId) && this.isNetherLevelId(toLevelId);
  }

  private createNetherEntrySnapshot(): RoccoNetherEntrySnapshot {
    return {
      inventoryItems: this.inventory.listItems(),
      roccoAppearance: this.roccoAppearance,
    };
  }

  private captureNetherEntrySnapshot(snapshot = this.createNetherEntrySnapshot()): void {
    this.netherEntrySnapshot = snapshot;
  }

  private restoreNetherEntrySnapshot(): void {
    const snapshot = this.netherEntrySnapshot;
    this.clearNetherDroppedInventoryItems();
    this.levelRegistry.resetNetherLevels();
    if (!snapshot) {
      return;
    }

    this.inventory.replaceItems(snapshot.inventoryItems);
    this.roccoAppearance = snapshot.roccoAppearance;
  }

  private clearNetherDroppedInventoryItems(): void {
    this.droppedInventory.clearLevelItemsWhere((levelId) => this.isNetherLevelId(levelId));
  }

  private hasAccessibleInventoryItem(levelId: string, itemId: string): boolean {
    return this.droppedInventory.hasAccessibleItem(
      levelId,
      this.inventory.listItems(),
      itemId,
    );
  }

  private listAccessibleInventoryItemIds(levelId: string): string[] {
    return this.droppedInventory.listAccessibleItemIds(levelId, this.inventory.listItems());
  }

  private resolvePlayerGroundPoint(): RoccoPoint | undefined {
    if (!this.engine) {
      return undefined;
    }

    const player = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!player) {
      return undefined;
    }

    return {
      x: player.transform.x + DEFAULT_SPRITE_GROUND_ANCHOR_X * (player.transform.scaleX || 1),
      y: player.transform.y + DEFAULT_SPRITE_GROUND_ANCHOR_Y * (player.transform.scaleY || 1),
    };
  }

  private resolvePlayerBaseScale(): number {
    if (!this.engine) {
      return DEFAULT_SPRITE_SCALE;
    }

    const player = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    const scale = player?.transform.scaleY ?? player?.transform.scaleX ?? DEFAULT_SPRITE_SCALE;
    return Number.isFinite(scale) && scale > 0 ? scale : DEFAULT_SPRITE_SCALE;
  }

  private resolvePlayerPosition(): RoccoPoint | undefined {
    if (!this.engine) {
      return undefined;
    }

    const player = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!player) {
      return undefined;
    }

    return {
      x: player.transform.x,
      y: player.transform.y,
    };
  }

  private resolveMirroredPlayerPosition(): RoccoPoint | undefined {
    const playerPosition = this.resolvePlayerPosition();
    if (!playerPosition || !this.engine) {
      return undefined;
    }

    const player = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!player) {
      return undefined;
    }

    const scaleX = player.transform.scaleX || 1;
    const groundOffsetX = DEFAULT_SPRITE_GROUND_ANCHOR_X * scaleX;
    const mirroredGroundX = DEFAULT_DESIGN_WIDTH - (playerPosition.x + groundOffsetX);

    return {
      x: mirroredGroundX - groundOffsetX,
      y: playerPosition.y,
    };
  }

  private async switchToLevel(levelId: string, entryConnectorId?: string): Promise<boolean> {
    if (!this.engine || !this.activeLevel) {
      return false;
    }

    if (this.activeLevel.id === levelId) {
      return true;
    }

    this.developerRuntime.clearTransientState(this.engine);
    const currentLevel = this.activeLevel;
    const targetLevel = this.levelRegistry.requireLevel(levelId);
    const nextNetherEntrySnapshot = this.isEnteringNether(currentLevel.id, targetLevel.id)
      ? this.createNetherEntrySnapshot()
      : null;
    const engine = this.engine;
    this.transitioning = true;
    this.transitions.clearPendingExitIntent();
    engine.setInputEnabled(false);
    engine.beginComposition();
    const transitionPreloader = new RoccoAssetPreloader((progress) => {
      engine.setCompositionText?.(`LOADING ${progress.percent}%`);
    });

    try {
      this.clearActiveLevelDroppedInventoryPresentation();
      currentLevel.unmount(engine);
      this.activeLevel = targetLevel;
      const scene = await targetLevel.mount(
        engine,
        {
          ...this.createLevelMountOptions(),
          entryConnectorId,
        },
        transitionPreloader,
      );
      if (nextNetherEntrySnapshot) {
        this.captureNetherEntrySnapshot(nextNetherEntrySnapshot);
      }
      this.syncActiveLevelDroppedInventoryPresentation();
      this.updateStatus(scene);
      return true;
    } catch (error) {
      engine.log('System', `Developer level jump failed: ${String(error)}`);
      this.activeLevel = currentLevel;
      return false;
    } finally {
      engine.setCompositionText?.('LOADING 100%');
      engine.endComposition();
      engine.setInputEnabled(true);
      this.transitioning = false;
      engine.video.render(0);
    }
  }

  private async transitionThrough(transition: RoccoResolvedLevelTransition): Promise<void> {
    if (!this.engine || !this.activeLevel) {
      return;
    }

    this.developerRuntime.clearTransientState(this.engine);
    const currentLevel = this.activeLevel;
    const targetLevel = this.levelRegistry.requireLevel(transition.targetEndpoint.levelId);
    const nextNetherEntrySnapshot = this.isEnteringNether(currentLevel.id, targetLevel.id)
      ? this.createNetherEntrySnapshot()
      : null;
    const engine = this.engine;
    const entryPosition = transition.connector.preservePlayerPosition
      ? this.resolveMirroredPlayerPosition()
      : undefined;
    this.transitioning = true;
    this.transitions.clearPendingExitIntent();
    engine.setInputEnabled(false);
    engine.beginComposition();
    const transitionPreloader = new RoccoAssetPreloader((progress) => {
      engine.setCompositionText?.(`LOADING ${progress.percent}%`);
    });

    try {
      this.clearActiveLevelDroppedInventoryPresentation();
      currentLevel.unmount(engine);
      this.activeLevel = targetLevel;
      const scene = await targetLevel.mount(
        engine,
        {
          entryConnectorId: transition.targetEndpoint.connectorId,
          entryPosition,
          ...this.createLevelMountOptions(),
        },
        transitionPreloader,
      );
      if (nextNetherEntrySnapshot) {
        this.captureNetherEntrySnapshot(nextNetherEntrySnapshot);
      }
      this.syncActiveLevelDroppedInventoryPresentation();
      this.transitions.setCooldown(PIER_LEVEL_TRANSITION_COOLDOWN_MS);
      this.updateStatus(scene);
    } catch (error) {
      engine.log('System', `Level transition failed: ${String(error)}`);
      this.activeLevel = currentLevel;
    } finally {
      engine.setCompositionText?.('LOADING 100%');
      engine.endComposition();
      engine.setInputEnabled(true);
      this.transitioning = false;
      engine.video.render(0);
    }
  }

  private updateStatus(scene: RoccoPlaneScene): void {
    if (!this.engine || !this.activeLevel) {
      return;
    }

    this.activeSceneId = scene.id;
    this.engine.setStatus(this.buildStatusMessage(scene.id));
  }

  private refreshStatus(): void {
    if (!this.engine || !this.activeLevel || !this.activeSceneId) {
      return;
    }

    this.engine.setStatus(this.buildStatusMessage(this.activeSceneId));
  }

  private buildStatusMessage(sceneId: string): string {
    const baseStatus =
      `${this.localization.text.levels.statusCartridge}: ${this.options.cartridgeTitle ?? 'ROCCO'} | ${this.localization.text.levels.statusLevel}: ${this.activeLevel?.title ?? ''} | ${this.localization.text.levels.statusScene}: ${sceneId}`;
    return this.developerRuntime.buildStatusMessage(baseStatus);
  }

  private createLevelMountOptions(): {
    roccoAppearance: RoccoPlayerAppearance;
    forceArrivalSequence?: boolean;
    onKeysCollectRequested: () => boolean;
    onKeysCollected: () => void;
    onConnectorTransitionRequested: (connectorId: string) => boolean;
    onRestartRequested?: (request?: RoccoLevelRestartRequest) => void;
    onPickupRequested: (item: RoccoInventoryItem) => boolean;
    onPickupCollected: (item: RoccoInventoryItem) => void;
  } {
    return {
      roccoAppearance: this.roccoAppearance,
      onKeysCollectRequested: () => this.canCollectIntoInventory(ROCCO_INVENTORY_KEYS_ITEM_ID),
      onKeysCollected: () => {
        if (!this.tryAddItemToInventory(createRoccoKeysInventoryItem(this.localization))) {
          return;
        }

        if (!this.engine) {
          return;
        }

        roccoCartridgeMessageRuntime.think(
          this.engine,
          DEFAULT_SPRITE_INSTANCE_ID,
          this.localization.text.keys.collectedLines,
          {
            ttlMs: 5600,
          },
          {
            count: 1,
            historyKey: 'keys-collected',
            avoidImmediateRepeat: true,
          },
        );
        this.engine.video.render(0);
      },
      onConnectorTransitionRequested: (connectorId: string) =>
        this.requestScriptedConnectorTransition(connectorId),
      onRestartRequested: (request) => {
        if (request) {
          void this.restartFromCheckpoint(request);
          return;
        }

        this.options.onRestartRequested?.();
      },
      onPickupRequested: (item) => this.canCollectIntoInventory(item.id),
      onPickupCollected: (item) => {
        if (!this.tryAddItemToInventory(item)) {
          return;
        }

        if (!this.engine) {
          return;
        }

        if (item.id === ROCCO_INVENTORY_BATA_ITEM_ID) {
          void this.engine.video
            .preloadSpriteDefinition(
              createRoccoAppearanceSpriteDefinition(
                this.engine,
                ROCCO_LAB_COAT_PLAYER_APPEARANCE,
                this.localization,
              ),
            )
            .catch(() => {
              this.engine?.log('Assets', 'Rocco lab coat assets could not be preloaded.');
            });
        }

        roccoCartridgeMessageRuntime.think(
          this.engine,
          DEFAULT_SPRITE_INSTANCE_ID,
          this.localization.text.inventory.pickupLine,
          {
            ttlMs: 3200,
          },
          {
            count: 1,
            historyKey: `pickup-${item.id}`,
            avoidImmediateRepeat: true,
          },
        );
        this.engine.video.render(0);
      },
    };
  }

  private async restartFromCheckpoint(request: RoccoLevelRestartRequest): Promise<void> {
    if (!this.engine || !this.activeLevel || this.transitioning) {
      this.options.onRestartRequested?.();
      return;
    }

    this.developerRuntime.clearTransientState(this.engine);
    const currentLevel = this.activeLevel;
    const engine = this.engine;
    const shouldRestoreNetherEntrySnapshot = this.isNetherLevelId(request.levelId);
    this.transitioning = true;
    this.transitions.reset();
    this.droppedInventory.resetRuntimeState();
    this.scriptedSequences.resetRuntimeState(engine);
    this.inventoryRuntime.resetRuntimeState();
    engine.setInputEnabled(false);
    engine.video.gridMenus.clearCarriedItem();
    engine.video.gridMenus.closeMenu();
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    engine.beginComposition();
    const transitionPreloader = new RoccoAssetPreloader((progress) => {
      engine.setCompositionText?.(`LOADING ${progress.percent}%`);
    });

    try {
      this.clearActiveLevelDroppedInventoryPresentation();
      currentLevel.unmount(engine);
      if (shouldRestoreNetherEntrySnapshot) {
        this.restoreNetherEntrySnapshot();
      }
      const targetLevel = this.levelRegistry.requireLevel(request.levelId);
      this.activeLevel = targetLevel;
      const scene = await targetLevel.mount(
        engine,
        {
          entryConnectorId: request.entryConnectorId,
          entryPosition: request.entryPosition,
          forceArrivalSequence: request.forceArrivalSequence,
          ...this.createLevelMountOptions(),
        },
        transitionPreloader,
      );
      this.syncActiveLevelDroppedInventoryPresentation();
      this.updateStatus(scene);
    } catch (error) {
      engine.log('System', `Checkpoint restart failed: ${String(error)}`);
      this.activeLevel = currentLevel;
    } finally {
      engine.setCompositionText?.('LOADING 100%');
      engine.endComposition();
      engine.setInputEnabled(true);
      this.transitioning = false;
      engine.video.render(0);
    }
  }

  private openInventoryTransferMenu(storageId: string, onInventoryClosed?: () => void): void {
    if (!this.engine) {
      return;
    }

    this.developerRuntime.clearTransientState(this.engine);
    this.engine.setInputEnabled(true);
    this.engine.video.actionMenus.closeMenu();
    this.inventoryRuntime.openStorageInventory(this.engine, storageId, onInventoryClosed);
  }

  private closeInventoryTransferMenu(storageId?: string, notifyLevel = false): void {
    if (!this.engine) {
      return;
    }

    this.inventoryRuntime.closeActiveTransferSession(this.engine, storageId, notifyLevel);
  }

  private requestScriptedConnectorTransition(connectorId: string): boolean {
    if (!this.activeLevel || this.transitioning) {
      return false;
    }

    const transition = this.transitions.resolveScriptedTransition(this.activeLevel, connectorId);
    if (!transition) {
      return false;
    }

    void this.transitionThrough(transition);
    return true;
  }

  private resolveDroppedInventoryGroundPoint(): RoccoPoint | undefined {
    const player = this.engine?.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!player) {
      return undefined;
    }

    const baseGroundPoint = this.resolvePlayerGroundPoint();
    if (!baseGroundPoint) {
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
      x: Math.max(18, Math.min(DEFAULT_DESIGN_WIDTH - 18, Math.round(baseGroundPoint.x + offset.x))),
      y: Math.max(18, Math.min(DEFAULT_DESIGN_HEIGHT - 18, Math.round(baseGroundPoint.y + offset.y))),
    };
  }

  private storeDroppedInventoryItem(
    levelId: string,
    droppedItem: { item: RoccoInventoryItem; groundPoint: RoccoPoint },
  ): boolean {
    const activeLevel = this.activeLevel;
    if (
      activeLevel?.id === ROCCO_BAIT_SHOP_TOILET_LEVEL_ID &&
      droppedItem.item.id === ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID &&
      (activeLevel as RoccoBaitShopToiletLevel).isEscapeUrgencyActive()
    ) {
      (activeLevel as RoccoBaitShopToiletLevel).startThrowCoralRelicSequence(droppedItem.item, (groundPoint) => {
        this.droppedInventory.dropItem(levelId, droppedItem.item, groundPoint);
        this.syncActiveLevelDroppedInventoryPresentation();
      });
      return true;
    }

    this.droppedInventory.dropItem(levelId, droppedItem.item, droppedItem.groundPoint);
    return false;
  }

  private updateDroppedInventoryPickup(): void {
    if (!this.engine) {
      return;
    }

    this.droppedInventory.updatePendingPickup(this.engine, this.activeLevel);
  }

  private syncActiveLevelDroppedInventoryPresentation(): void {
    if (!this.engine || !this.activeLevel) {
      return;
    }

    this.droppedInventory.syncActiveLevelPresentation(this.engine, this.activeLevel);
  }

  private clearActiveLevelDroppedInventoryPresentation(): void {
    this.droppedInventory.clearActiveLevelPresentation(this.engine);
  }

  private canCollectIntoInventory(itemId: string, showFullMessage = true): boolean {
    return this.inventoryRuntime.canCollectItem(this.engine, itemId, showFullMessage);
  }

  private tryAddItemToInventory(item: RoccoInventoryItem): boolean {
    return this.inventoryRuntime.tryAddItem(this.engine, item);
  }

  private isStanIdentified(): boolean {
    return this.beginningAmbientState.stan.isIdentified;
  }

  private isStanAwake(): boolean {
    if (!this.engine) {
      return false;
    }

    const stan = this.engine.video.sprites.getSprite(DEFAULT_STAN_SPRITE_INSTANCE_ID);
    return Boolean(stan && stan.animation.animationId !== DEFAULT_STAN_SLEEPING_ANIMATION_ID);
  }

  private doesPlayerOverlapBaitShopDoor(): boolean {
    if (!this.engine) {
      return false;
    }

    const player = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    const door = this.engine.video.sprites.getSprite(DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID);
    if (!player || !door) {
      return false;
    }

    const playerScaleX = player.transform.scaleX || 1;
    const playerScaleY = player.transform.scaleY || 1;
    const doorScaleX = door.transform.scaleX || 1;
    const doorScaleY = door.transform.scaleY || 1;

    const playerLeft = player.transform.x;
    const playerTop = player.transform.y;
    const playerRight = playerLeft + DEFAULT_SPRITE_FRAME_WIDTH * playerScaleX;
    const playerBottom = playerTop + DEFAULT_SPRITE_FRAME_HEIGHT * playerScaleY;

    const doorLeft = door.transform.x - DEFAULT_BAIT_SHOP_DOOR_PIVOT_X * doorScaleX;
    const doorTop = door.transform.y - DEFAULT_BAIT_SHOP_DOOR_PIVOT_Y * doorScaleY;
    const doorRight = doorLeft + DEFAULT_BAIT_SHOP_DOOR_WIDTH * doorScaleX;
    const doorBottom = doorTop + DEFAULT_BAIT_SHOP_DOOR_HEIGHT * doorScaleY;

    const overlapWidth = Math.min(playerRight, doorRight) - Math.max(playerLeft, doorLeft);
    const overlapHeight = Math.min(playerBottom, doorBottom) - Math.max(playerTop, doorTop);
    return overlapWidth >= 1 && overlapHeight >= 1;
  }

  private async enterBaitShop(): Promise<void> {
    if (!this.engine || !this.activeLevel) {
      return;
    }

    this.developerRuntime.clearTransientState(this.engine);
    const currentLevel = this.activeLevel;
    const targetLevel = this.levelRegistry.requireLevel(ROCCO_BAIT_SHOP_LEVEL_ID);
    const engine = this.engine;
    this.transitioning = true;
    this.transitions.clearPendingExitIntent();
    engine.beginComposition();
    const transitionPreloader = new RoccoAssetPreloader((progress) => {
      engine.setCompositionText?.(`LOADING ${progress.percent}%`);
    });

    try {
      this.clearActiveLevelDroppedInventoryPresentation();
      currentLevel.unmount(engine);
      this.activeLevel = targetLevel;
      const scene = await targetLevel.mount(engine, this.createLevelMountOptions(), transitionPreloader);
      this.syncActiveLevelDroppedInventoryPresentation();
      this.updateStatus(scene);
    } catch (error) {
      engine.log('System', `Bait shop level transition failed: ${String(error)}`);
      this.activeLevel = currentLevel;
    } finally {
      engine.setCompositionText?.('LOADING 100%');
      engine.endComposition();
      engine.setInputEnabled(true);
      this.transitioning = false;
      engine.video.render(0);
    }
  }
}
