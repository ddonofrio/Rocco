import type { CartridgeSdkV1Runtime } from '../../../console/cartridges/sdk-v1';
import type {
  CartridgeActionContext,
  CartridgeActionDisposition,
  RoccoCartridgeAction,
} from '../../../console/cartridges';
import type { RoccoPlaneScene } from '../../../console/video/planes';
import type { RoccoPoint } from '../../../console/video/sprites';
import {
  roccoDefaultDeveloperSpriteCycleCursorAssetUrl,
  roccoDefaultActionMenuAssetUrls,
  roccoDefaultPoliceWhistleSoundUrl,
} from '../games/rocco-default/sprites';
import {
  createRoccoLocalization,
  type RoccoLocalization,
} from '../games/rocco-default/localization';
import {
  ROCCO_INVENTORY_ITEM_IMAGE_URLS,
  ROCCO_SOUVENIR_TABLE_ITEM_IMAGE_URLS,
  type RoccoInventory,
  type RoccoInventoryItem,
} from '../games/rocco-default/inventory';
import {
  installRoccoPlayerActionMenu,
  uninstallRoccoPlayerActionMenu,
} from '../games/rocco-default/player';
import {
  DEFAULT_ROCCO_PLAYER_APPEARANCE,
  type RoccoPlayerAppearance,
} from '../games/rocco-default/player';
import {
  type RoccoLevel,
  type RoccoLevelMountOptions,
  type RoccoLevelRestartRequest,
} from './rocco-level-types';
import type { RoccoPierBeginningAmbientPersistentState } from '../games/rocco-default/maps/pier';
import type { RoccoResolvedLevelTransition } from './runtime/rocco-level-transition-controller';
import type { RoccoLevelTransitionController } from './runtime/rocco-level-transition-controller';
import type { RoccoScriptedSequenceController } from './runtime/rocco-scripted-sequence-controller';
import { RoccoLevelRegistry } from './runtime/rocco-level-registry';
import { RoccoInventoryRuntimeController } from './runtime/rocco-inventory-runtime-controller';
import { RoccoDroppedInventoryController } from './runtime/rocco-dropped-inventory-controller';
import { isRoccoToiletLevelCapability } from './runtime/rocco-level-capabilities';
import { RoccoSceneActionRouter } from './runtime/rocco-scene-action-router';
import { RoccoAssetPreloader } from './rocco-asset-preloader';
import { ROCCO_STAN_POLICE_DEFEAT_SOUND_ID } from './runtime/rocco-scripted-sequence-controller';
import { RoccoDeveloperRuntimeController } from './runtime/rocco-developer-runtime-controller';
import { RoccoLevelTransitionService } from './runtime/rocco-level-transition-service';
import { createRoccoGameCompositionRoot } from './runtime/rocco-game-composition-root';
import { RoccoStatusPresenter } from './runtime/rocco-status-presenter';
import { RoccoTransitionPlanFactory } from './runtime/rocco-transition-plan-factory';
import { RoccoCheckpointCoordinator } from './runtime/rocco-checkpoint-coordinator';
import { RoccoInventorySceneCoordinator } from './runtime/rocco-inventory-scene-coordinator';
import { RoccoRuntimeLifecycleCoordinator } from './runtime/rocco-runtime-lifecycle-coordinator';
import { RoccoGameInteractionCoordinator } from './runtime/rocco-game-interaction-coordinator';
import { RoccoWorldState } from './runtime/rocco-world-state';
import type { RpceCompiledGame } from '../rpce/core';

export interface RoccoLevelManagerMountResult {
  level: RoccoLevel;
  scene: RoccoPlaneScene;
}

export interface RoccoLevelManagerOptions {
  cartridgeTitle?: string;
  localization?: RoccoLocalization;
  inventory?: RoccoInventory;
  onRestartRequested?: () => void;
  cancelActiveActions?: (reason: string) => void;
}

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

export class RoccoLevelManager {
  private readonly levelRegistry: RoccoLevelRegistry;
  private readonly transitions: RoccoLevelTransitionController;
  private readonly inventoryRuntime: RoccoInventoryRuntimeController;
  private readonly droppedInventory: RoccoDroppedInventoryController;
  private readonly scriptedSequences: RoccoScriptedSequenceController;
  private readonly developerRuntime: RoccoDeveloperRuntimeController;
  private readonly actionRouter: RoccoSceneActionRouter;
  private readonly worldState: RoccoWorldState;
  private readonly statusPresenter: RoccoStatusPresenter;
  private readonly transitionPlanFactory: RoccoTransitionPlanFactory;
  private readonly checkpointCoordinator: RoccoCheckpointCoordinator;
  private readonly inventorySceneCoordinator: RoccoInventorySceneCoordinator;
  private readonly lifecycleCoordinator: RoccoRuntimeLifecycleCoordinator;
  private readonly interactionCoordinator: RoccoGameInteractionCoordinator;
  private readonly options: RoccoLevelManagerOptions;
  private readonly beginningAmbientState: RoccoPierBeginningAmbientPersistentState = {
    stan: {
      isIdentified: false,
    },
    door: {
      revealed: true,
    },
  };
  private engine: CartridgeSdkV1Runtime | null = null;
  private activeLevel: RoccoLevel | null = null;
  private readonly levelTransitionService: RoccoLevelTransitionService;
  private readonly compiledGame: RpceCompiledGame<RoccoLevel>;
  private readonly localization: RoccoLocalization;
  private roccoAppearance: RoccoPlayerAppearance = DEFAULT_ROCCO_PLAYER_APPEARANCE;
  private transitionTask: Promise<void> | null = null;

  constructor(options: RoccoLevelManagerOptions = {}) {
    this.options = {
      cartridgeTitle: 'ROCCO',
      ...options,
    };
    this.localization = options.localization ?? createRoccoLocalization();
    const composition = createRoccoGameCompositionRoot({
      localization: this.localization,
      inventory: options.inventory,
      beginningAmbientState: this.beginningAmbientState,
      callbacks: {
        getEngine: () => this.engine,
        getActiveLevel: () => this.activeLevel,
        setActiveLevel: (level) => {
          this.activeLevel = level;
        },
        cancelActiveActions: (reason) => this.options.cancelActiveActions?.(reason),
        createMountOptions: () => this.createLevelMountOptions(),
        resolvePlayerGroundPoint: () => this.resolvePlayerGroundPoint(),
        resolvePlayerBaseScale: () => this.resolvePlayerBaseScale(),
        resolveDroppedInventoryGroundPoint: () => this.resolveDroppedInventoryGroundPoint(),
        storeDroppedInventoryItem: (levelId, droppedItem) =>
          this.storeDroppedInventoryItem(levelId, droppedItem),
        syncActiveLevelDroppedInventoryPresentation: () =>
          this.syncActiveLevelDroppedInventoryPresentation(),
        refreshStatus: () => this.refreshStatus(),
        hasAccessibleInventoryItem: (levelId, itemId) =>
          this.hasAccessibleInventoryItem(levelId, itemId),
        listAccessibleInventoryItemIds: (levelId) => this.listAccessibleInventoryItemIds(levelId),
        openInventoryTransferMenu: (storageId, onInventoryClosed) =>
          this.openInventoryTransferMenu(storageId, onInventoryClosed),
        closeInventoryTransferMenu: (storageId) => this.closeInventoryTransferMenu(storageId),
        switchToLevel: (levelId, entryConnectorId) => this.switchToLevel(levelId, entryConnectorId),
        enterBaitShop: () => this.enterBaitShop(),
        canCollectIntoInventory: (itemId, shouldShowFullMessage) =>
          this.canCollectIntoInventory(itemId, shouldShowFullMessage),
        resolveLevelTitle: (levelId) => this.levelRegistry.requireLevel(levelId).title,
        tryAddItemToInventory: (item) => this.tryAddItemToInventory(item),
        onRestartRequested: this.options.onRestartRequested,
        getRoccoAppearance: () => this.roccoAppearance,
        setRoccoAppearance: (appearance) => {
          this.roccoAppearance = appearance;
        },
        isStanIdentified: () => this.isStanIdentified(),
        isStanAwake: () => this.isStanAwake(),
        doesPlayerOverlapBaitShopDoor: () => this.doesPlayerOverlapBaitShopDoor(),
        onToiletReuseEventChanged: () => {
          if (this.activeLevel && isRoccoToiletLevelCapability(this.activeLevel)) {
            this.activeLevel.refreshDeveloperEventPresentation();
          }
        },
      },
    });
    this.levelRegistry = composition.levelRegistry;
    this.transitions = composition.transitions;
    this.inventoryRuntime = composition.inventoryRuntime;
    this.droppedInventory = composition.droppedInventory;
    this.scriptedSequences = composition.scriptedSequences;
    this.developerRuntime = composition.developerRuntime;
    this.actionRouter = composition.actionRouter;
    this.levelTransitionService = composition.levelTransitionService;
    this.compiledGame = composition.compiledGame;
    this.worldState = new RoccoWorldState({
      getEngine: () => this.engine,
      getActiveLevel: () => this.activeLevel,
      setActiveLevel: (level) => {
        this.activeLevel = level;
      },
      getRoccoAppearance: () => this.roccoAppearance,
      setRoccoAppearance: (appearance) => {
        this.roccoAppearance = appearance;
      },
      getLevelMountOptions: () => this.createLevelMountOptions(),
      transitions: this.transitions,
      droppedInventory: this.droppedInventory,
      inventoryRuntime: this.inventoryRuntime,
      scriptedSequences: this.scriptedSequences,
      developerRuntime: this.developerRuntime,
    });
    this.statusPresenter = new RoccoStatusPresenter({
      localization: this.localization,
      cartridgeTitle: this.options.cartridgeTitle ?? 'ROCCO',
      getEngine: () => this.engine,
      getActiveLevel: () => this.activeLevel,
      getActiveSceneId: () => this.activeSceneId,
      setActiveSceneId: (sceneId) => {
        this.activeSceneId = sceneId;
      },
      getRoccoAppearance: () => this.roccoAppearance,
      developerRuntime: this.developerRuntime,
      canCollectIntoInventory: (itemId) => this.canCollectIntoInventory(itemId),
      onKeysCollected: () => this.handleKeysCollected(),
      onConnectorTransitionRequested: (connectorId) =>
        this.requestScriptedConnectorTransition(connectorId),
      onRestartRequested: (request) => this.handleRestartRequested(request),
      onPickupRequested: (item) => this.canCollectIntoInventory(item.id),
      onPickupCollected: (item) => this.handlePickupCollected(item),
    });
    this.transitionPlanFactory = new RoccoTransitionPlanFactory({
      getEngine: () => this.engine,
      getActiveLevel: () => this.activeLevel,
      levelRegistry: this.levelRegistry,
      transitions: this.transitions,
      levelTransitionService: this.levelTransitionService,
      developerRuntime: this.developerRuntime,
      worldState: this.worldState,
      clearActiveLevelDroppedInventoryPresentation: () =>
        this.clearActiveLevelDroppedInventoryPresentation(),
      syncActiveLevelDroppedInventoryPresentation: () =>
        this.syncActiveLevelDroppedInventoryPresentation(),
      updateStatus: (scene) => this.updateStatus(scene),
    });
    this.checkpointCoordinator = new RoccoCheckpointCoordinator({
      getEngine: () => this.engine,
      getActiveLevel: () => this.activeLevel,
      onRestartRequested: this.options.onRestartRequested,
      levelRegistry: this.levelRegistry,
      transitions: this.transitions,
      levelTransitionService: this.levelTransitionService,
      developerRuntime: this.developerRuntime,
      droppedInventory: this.droppedInventory,
      scriptedSequences: this.scriptedSequences,
      inventoryRuntime: this.inventoryRuntime,
      worldState: this.worldState,
      clearActiveLevelDroppedInventoryPresentation: () =>
        this.clearActiveLevelDroppedInventoryPresentation(),
      syncActiveLevelDroppedInventoryPresentation: () =>
        this.syncActiveLevelDroppedInventoryPresentation(),
      updateStatus: (scene) => this.updateStatus(scene),
    });
    this.inventorySceneCoordinator = new RoccoInventorySceneCoordinator({
      getEngine: () => this.engine,
      getActiveLevel: () => this.activeLevel,
      resolvePlayerGroundPoint: () => this.resolvePlayerGroundPoint(),
      developerRuntime: this.developerRuntime,
      inventoryRuntime: this.inventoryRuntime,
      droppedInventory: this.droppedInventory,
      syncActiveLevelDroppedInventoryPresentation: () =>
        this.syncActiveLevelDroppedInventoryPresentation(),
    });
    this.lifecycleCoordinator = new RoccoRuntimeLifecycleCoordinator({
      getEngine: () => this.engine,
      setEngine: (engine) => {
        this.engine = engine;
      },
      getActiveLevel: () => this.activeLevel,
      setActiveLevel: (level) => {
        this.activeLevel = level;
      },
      levelRegistry: this.levelRegistry,
      compiledInitialLevelId: this.compiledGame.initialLevelId,
      transitions: this.transitions,
      levelTransitionService: this.levelTransitionService,
      inventoryRuntime: this.inventoryRuntime,
      droppedInventory: this.droppedInventory,
      scriptedSequences: this.scriptedSequences,
      developerRuntime: this.developerRuntime,
      actionRouter: this.actionRouter,
      worldState: this.worldState,
      sharedAssetUrls: ROCCO_SHARED_UI_ASSET_URLS,
      inventoryItemImageUrls: ROCCO_INVENTORY_ITEM_IMAGE_URLS,
      souvenirItemImageUrls: ROCCO_SOUVENIR_TABLE_ITEM_IMAGE_URLS,
      policeDefeatSoundId: ROCCO_STAN_POLICE_DEFEAT_SOUND_ID,
      policeDefeatSoundUrl: roccoDefaultPoliceWhistleSoundUrl,
      syncActiveLevelDroppedInventoryPresentation: () =>
        this.syncActiveLevelDroppedInventoryPresentation(),
      clearActiveLevelDroppedInventoryPresentation: () =>
        this.clearActiveLevelDroppedInventoryPresentation(),
      updateStatus: (scene) => this.updateStatus(scene),
      transitionThrough: (transition) => {
        this.startTransitionThrough(transition);
      },
      onToiletExitDefeat: (transition) => {
        if (
          this.activeLevel &&
          isRoccoToiletLevelCapability(this.activeLevel) &&
          this.activeLevel.shouldLoseOnExit(transition.connector.id)
        ) {
          this.transitions.clearPendingExitIntent();
          this.activeLevel.beginExitDefeat();
          return true;
        }
        return false;
      },
      installPlayerActionMenu: (engine) => installRoccoPlayerActionMenu(engine, this.localization),
      uninstallPlayerActionMenu: (engine) => uninstallRoccoPlayerActionMenu(engine),
    });
    this.interactionCoordinator = new RoccoGameInteractionCoordinator({
      localization: this.localization,
      beginningAmbientState: this.beginningAmbientState,
      getEngine: () => this.engine,
      getActiveLevel: () => this.activeLevel,
      tryAddItemToInventory: (item) => this.tryAddItemToInventory(item),
      onRestartRequested: this.options.onRestartRequested,
      restartFromCheckpoint: (request) => this.restartFromCheckpoint(request),
      transitions: this.transitions,
      levelTransitionService: this.levelTransitionService,
      transitionPlanFactory: this.transitionPlanFactory,
      transitionThrough: (transition) => {
        this.startTransitionThrough(transition);
      },
    });
  }

  private hasAccessibleInventoryItem(levelId: string, itemId: string): boolean {
    return this.worldState.hasAccessibleInventoryItem(levelId, itemId);
  }

  private listAccessibleInventoryItemIds(levelId: string): string[] {
    return this.worldState.listAccessibleInventoryItemIds(levelId);
  }

  private resolvePlayerGroundPoint(): RoccoPoint | undefined {
    return this.worldState.resolvePlayerGroundPoint();
  }

  private resolvePlayerBaseScale(): number {
    return this.worldState.resolvePlayerBaseScale();
  }

  private get activeSceneId(): string | null {
    return this.worldState.currentSceneId;
  }

  private set activeSceneId(sceneId: string | null) {
    this.worldState.setSceneId(sceneId);
  }

  private async switchToLevel(levelId: string, entryConnectorId?: string): Promise<boolean> {
    return this.transitionPlanFactory.switchToLevel(levelId, entryConnectorId);
  }

  private async transitionThrough(transition: RoccoResolvedLevelTransition): Promise<void> {
    await this.transitionPlanFactory.transitionThrough(transition);
  }

  private startTransitionThrough(transition: RoccoResolvedLevelTransition): void {
    this.transitionTask = this.runTransitionTask(transition);
  }

  private async runTransitionTask(transition: RoccoResolvedLevelTransition): Promise<void> {
    try {
      await this.transitionThrough(transition);
    } finally {
      if (this.transitionTask !== null) {
        this.transitionTask = null;
      }
    }
  }

  private updateStatus(scene: RoccoPlaneScene): void {
    this.statusPresenter.updateStatus(scene);
  }

  private refreshStatus(): void {
    this.statusPresenter.refreshStatus();
  }

  private createLevelMountOptions(): RoccoLevelMountOptions {
    return this.statusPresenter.createLevelMountOptions();
  }

  private handleKeysCollected(): void {
    this.interactionCoordinator.handleKeysCollected();
  }

  private handleRestartRequested(request?: RoccoLevelRestartRequest): void {
    this.interactionCoordinator.handleRestartRequested(request);
  }

  private restartFromCheckpoint(request: RoccoLevelRestartRequest): void {
    const task = this.checkpointCoordinator.restartFromCheckpoint(request);
    this.transitionTask = task;
  }

  private handlePickupCollected(item: RoccoInventoryItem): void {
    this.interactionCoordinator.handlePickupCollected(item);
  }

  private openInventoryTransferMenu(storageId: string, onInventoryClosed?: () => void): void {
    this.inventorySceneCoordinator.openInventoryTransferMenu(storageId, onInventoryClosed);
  }

  private closeInventoryTransferMenu(storageId?: string, shouldNotifyLevel = false): void {
    this.inventorySceneCoordinator.closeInventoryTransferMenu(storageId, shouldNotifyLevel);
  }

  private requestScriptedConnectorTransition(connectorId: string): boolean {
    return this.interactionCoordinator.requestScriptedConnectorTransition(connectorId);
  }

  private resolveDroppedInventoryGroundPoint(): RoccoPoint | undefined {
    return this.inventorySceneCoordinator.resolveDroppedInventoryGroundPoint();
  }

  private storeDroppedInventoryItem(
    levelId: string,
    droppedItem: { item: RoccoInventoryItem; groundPoint: RoccoPoint },
  ): boolean {
    return this.inventorySceneCoordinator.storeDroppedInventoryItem(levelId, droppedItem);
  }

  private syncActiveLevelDroppedInventoryPresentation(): void {
    this.inventorySceneCoordinator.syncActiveLevelDroppedInventoryPresentation();
  }

  private clearActiveLevelDroppedInventoryPresentation(): void {
    this.inventorySceneCoordinator.clearActiveLevelDroppedInventoryPresentation();
  }

  private canCollectIntoInventory(itemId: string, shouldShowFullMessage = true): boolean {
    return this.inventorySceneCoordinator.canCollectIntoInventory(itemId, shouldShowFullMessage);
  }

  private tryAddItemToInventory(item: RoccoInventoryItem): boolean {
    return this.inventorySceneCoordinator.tryAddItemToInventory(item);
  }

  private isStanIdentified(): boolean {
    return this.interactionCoordinator.isStanIdentified();
  }

  private isStanAwake(): boolean {
    return this.interactionCoordinator.isStanAwake();
  }

  private doesPlayerOverlapBaitShopDoor(): boolean {
    return this.interactionCoordinator.doesPlayerOverlapBaitShopDoor();
  }

  private async enterBaitShop(): Promise<void> {
    await this.interactionCoordinator.enterBaitShop();
  }

  mount(
    engine: CartridgeSdkV1Runtime,
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoLevelManagerMountResult> {
    return this.lifecycleCoordinator.mount(engine, preloader);
  }

  unmount(): void {
    this.lifecycleCoordinator.unmount();
  }

  update(deltaMs: number): void {
    this.lifecycleCoordinator.update(deltaMs);
  }

  handleAction(
    activation: RoccoCartridgeAction,
    context?: CartridgeActionContext,
  ): CartridgeActionDisposition | void {
    return this.lifecycleCoordinator.handleAction(activation, context);
  }

  getActiveLevelId(): string | undefined {
    return this.activeLevel?.id;
  }

  getActiveLevel(): RoccoLevel | null {
    return this.activeLevel;
  }
}
