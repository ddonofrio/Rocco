import type {
  CartridgeActionContext,
  CartridgeActionDisposition,
  RoccoCartridgeAction,
} from '../../../../console/cartridges';
import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';
import type { RoccoPlaneScene } from '../../../../console/video/planes';
import type { RoccoLevel } from '../rocco-level-types';
import type { RoccoAssetPreloader } from '../rocco-asset-preloader';
import type { RoccoInventoryRuntimeController } from './rocco-inventory-runtime-controller';
import type { RoccoDroppedInventoryController } from './rocco-dropped-inventory-controller';
import type { RoccoScriptedSequenceController } from './rocco-scripted-sequence-controller';
import type { RoccoDeveloperRuntimeController } from './rocco-developer-runtime-controller';
import type { RoccoLevelTransitionController } from './rocco-level-transition-controller';
import type { RoccoResolvedLevelTransition } from './rocco-level-transition-controller';
import type { RoccoLevelTransitionService } from './rocco-level-transition-service';
import type { RoccoSceneActionRouter } from './rocco-scene-action-router';
import type { RoccoLevelRegistry } from './rocco-level-registry';
import type { RoccoWorldState } from './rocco-world-state';

import type { RoccoSharedAssetManifest } from './rocco-shared-asset-manifest';

export interface RoccoRuntimeLifecycleCoordinatorOptions {
  getEngine: () => CartridgeSdkV1Runtime | null;
  setEngine: (engine: CartridgeSdkV1Runtime | null) => void;
  getActiveLevel: () => RoccoLevel | null;
  setActiveLevel: (level: RoccoLevel | null) => void;
  levelRegistry: RoccoLevelRegistry;
  compiledInitialLevelId: string | undefined;
  transitions: RoccoLevelTransitionController;
  levelTransitionService: RoccoLevelTransitionService;
  inventoryRuntime: RoccoInventoryRuntimeController;
  droppedInventory: RoccoDroppedInventoryController;
  scriptedSequences: RoccoScriptedSequenceController;
  developerRuntime: RoccoDeveloperRuntimeController;
  actionRouter: RoccoSceneActionRouter;
  worldState: RoccoWorldState;
  sharedAssets: RoccoSharedAssetManifest;
  syncActiveLevelDroppedInventoryPresentation: () => void;
  clearActiveLevelDroppedInventoryPresentation: () => void;
  updateStatus: (scene: RoccoPlaneScene) => void;
  transitionThrough: (transition: RoccoResolvedLevelTransition) => void | Promise<void>;
  onToiletExitDefeat: (transition: { connector: { id: string } }) => boolean;
  installPlayerActionMenu: (engine: CartridgeSdkV1Runtime) => void;
  uninstallPlayerActionMenu: (engine: CartridgeSdkV1Runtime) => void;
}

export class RoccoRuntimeLifecycleCoordinator {
  private readonly options: RoccoRuntimeLifecycleCoordinatorOptions;

  constructor(options: RoccoRuntimeLifecycleCoordinatorOptions) {
    this.options = options;
  }

  private async preloadSharedAssets(
    engine: CartridgeSdkV1Runtime,
    preloader?: RoccoAssetPreloader,
  ): Promise<void> {
    if (!preloader) {
      return;
    }
    try {
      await preloader.preloadAssetUrls(engine, this.options.sharedAssets.imageUrls);
    } catch {
      engine.log('Assets', 'Some shared Rocco UI assets could not be preloaded.');
    }
  }

  private async registerSharedSounds(
    engine: CartridgeSdkV1Runtime,
    preloader?: RoccoAssetPreloader,
  ): Promise<void> {
    for (const sound of this.options.sharedAssets.sounds) {
      engine.audio.registerSound({
        id: sound.id,
        uri: sound.uri,
        volume: sound.volume,
        loop: sound.loop,
      });
      if (preloader) {
        try {
          await preloader.preloadSound(engine, sound.id);
        } catch {
          engine.log('Audio', sound.preloadFailureMessage);
        }
      }
      engine.audio.stopSound(sound.id);
    }
  }

  private resetRuntimeState(engine: CartridgeSdkV1Runtime): void {
    this.options.worldState.setSceneId(null);
    this.options.developerRuntime.resetRuntimeState(engine);
    this.options.transitions.reset();
    this.options.droppedInventory.resetRuntimeState();
    this.options.scriptedSequences.resetRuntimeState(engine);
    this.options.inventoryRuntime.resetRuntimeState();
    this.options.worldState.clearSavedNetherEntrySnapshot();
  }

  async mount(
    engine: CartridgeSdkV1Runtime,
    preloader?: RoccoAssetPreloader,
  ): Promise<{ level: RoccoLevel; scene: RoccoPlaneScene }> {
    this.options.setEngine(engine);
    await this.preloadSharedAssets(engine, preloader);
    await this.registerSharedSounds(engine, preloader);
    this.resetRuntimeState(engine);
    const level = this.options.levelRegistry.requireLevel(
      this.options.compiledInitialLevelId ?? 'pier',
    );
    const mountState = this.options.worldState.createMountStateSnapshot();
    this.options.setActiveLevel(level);
    const scene = await level.mount(
      engine,
      this.options.worldState.buildRuntimeMountOptions(mountState),
      preloader,
    );
    this.options.worldState.setActiveMountState(mountState);
    this.options.installPlayerActionMenu(engine);
    this.options.syncActiveLevelDroppedInventoryPresentation();
    this.options.updateStatus(scene);
    return { level, scene };
  }

  unmount(): void {
    const engine = this.options.getEngine();
    const activeLevel = this.options.getActiveLevel();
    if (!engine || !activeLevel) {
      return;
    }
    this.options.developerRuntime.resetRuntimeState(engine);
    activeLevel.unmount(engine);
    this.options.uninstallPlayerActionMenu(engine);
    this.options.worldState.setSceneId(null);
    this.options.transitions.reset();
    this.options.levelTransitionService.invalidateActiveTransition();
    this.options.droppedInventory.resetRuntimeState();
    this.options.scriptedSequences.resetRuntimeState(engine);
    this.options.inventoryRuntime.resetRuntimeState();
    this.options.clearActiveLevelDroppedInventoryPresentation();
    this.options.worldState.clearSavedNetherEntrySnapshot();
    for (const sound of this.options.sharedAssets.sounds) {
      engine.audio.unregisterSound(sound.id);
    }
    engine.video.gridMenus.closeMenu();
    engine.video.gridMenus.clearCarriedItem();
    this.options.setActiveLevel(null);
    this.options.worldState.setActiveMountState(null);
    this.options.setEngine(null);
  }

  update(deltaMs: number): void {
    const engine = this.options.getEngine();
    if (this.options.scriptedSequences.hasBlockingSequence()) {
      if (engine) {
        this.options.scriptedSequences.updateBlockingSequence(engine, deltaMs);
      }
      return;
    }
    this.options.getActiveLevel()?.update(deltaMs);
    if (this.options.droppedInventory.hasPendingPickup()) {
      if (engine) {
        this.options.droppedInventory.updatePendingPickup(engine, this.options.getActiveLevel());
      }
      return;
    }
    if (this.options.scriptedSequences.hasPendingBaitShopDoorUse()) {
      if (engine) {
        this.options.scriptedSequences.updatePendingBaitShopDoorUse(
          engine,
          this.options.getActiveLevel()?.id ?? null,
        );
      }
      return;
    }
    const activeLevel = this.options.getActiveLevel();
    if (!engine || !activeLevel || this.options.levelTransitionService.isTransitioning) {
      return;
    }
    const transition = this.options.transitions.update(activeLevel, deltaMs);
    if (!transition) {
      return;
    }
    if (this.options.onToiletExitDefeat(transition)) {
      return;
    }
    void this.options.transitionThrough(transition);
  }

  handleAction(
    activation: RoccoCartridgeAction,
    context?: CartridgeActionContext,
  ): CartridgeActionDisposition | void {
    return this.options.actionRouter.handleAction(activation, context);
  }
}
