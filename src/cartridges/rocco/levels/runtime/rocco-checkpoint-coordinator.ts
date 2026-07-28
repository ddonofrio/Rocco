import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';
import type { RoccoPlaneScene } from '../../../../console/video/planes';
import type { RoccoLevelRestartRequest, RoccoLevel } from '../rocco-level-types';
import { DEFAULT_ROCCO_PLAYER_APPEARANCE } from '../../games/rocco-default/player';
import { RoccoDeveloperRuntimeController } from './rocco-developer-runtime-controller';
import { RoccoDroppedInventoryController } from './rocco-dropped-inventory-controller';
import { RoccoInventoryRuntimeController } from './rocco-inventory-runtime-controller';
import { RoccoLevelRegistry } from './rocco-level-registry';
import { RoccoLevelTransitionController } from './rocco-level-transition-controller';
import { RoccoLevelTransitionService } from './rocco-level-transition-service';
import { RoccoScriptedSequenceController } from './rocco-scripted-sequence-controller';
import { RoccoWorldState } from './rocco-world-state';

export interface RoccoCheckpointCoordinatorOptions {
  getEngine: () => CartridgeSdkV1Runtime | null;
  getActiveLevel: () => RoccoLevel | null;
  onRestartRequested?: () => void;
  levelRegistry: RoccoLevelRegistry;
  transitions: RoccoLevelTransitionController;
  levelTransitionService: RoccoLevelTransitionService;
  developerRuntime: RoccoDeveloperRuntimeController;
  droppedInventory: RoccoDroppedInventoryController;
  scriptedSequences: RoccoScriptedSequenceController;
  inventoryRuntime: RoccoInventoryRuntimeController;
  worldState: RoccoWorldState;
  clearActiveLevelDroppedInventoryPresentation: () => void;
  syncActiveLevelDroppedInventoryPresentation: () => void;
  updateStatus: (scene: RoccoPlaneScene) => void;
}

interface RoccoRestartPlanData {
  request: RoccoLevelRestartRequest;
  rollbackSnapshot: ReturnType<RoccoWorldState['createTransitionSnapshot']>;
  playerSnapshot: ReturnType<RoccoWorldState['capturePlayerSnapshot']>;
  mountStateSnapshot: RoccoWorldState['currentMountState'];
  netherReset: ReturnType<RoccoLevelRegistry['prepareMapReset']> | null;
}

export class RoccoCheckpointCoordinator {
  private readonly options: RoccoCheckpointCoordinatorOptions;

  constructor(options: RoccoCheckpointCoordinatorOptions) {
    this.options = options;
  }

  private createRestartPlan(data: RoccoRestartPlanData) {
    return {
      id: `restart-${data.request.levelId}`,
      prepare: () => this.createPreparedRestart(data),
    };
  }

  private createRestartMountOptions(
    request: RoccoLevelRestartRequest,
    mountState: ReturnType<RoccoWorldState['createMountStateSnapshot']>,
  ) {
    const mountOptions = this.options.worldState.buildRuntimeMountOptions(mountState);
    if (this.options.worldState.isNetherLevelId(request.levelId)) {
      mountOptions.roccoAppearance = DEFAULT_ROCCO_PLAYER_APPEARANCE;
    }
    return mountOptions;
  }

  private applyRestartInventoryOverride(request: RoccoLevelRestartRequest): void {
    if (!request.inventoryItems) {
      return;
    }

    this.options.inventoryRuntime.getPlayerInventory().replaceItems(request.inventoryItems);
  }

  private createPreparedRestart(data: RoccoRestartPlanData) {
    const { request, rollbackSnapshot, playerSnapshot, mountStateSnapshot, netherReset } = data;
    const targetLevel =
      netherReset?.requireLevel(request.levelId) ??
      this.options.levelRegistry.requireLevel(request.levelId);
    const targetMountState = this.options.worldState.createMountStateSnapshot({
      entryConnectorId: request.entryConnectorId,
      entryPosition: request.entryPosition,
      forceArrivalSequence: request.forceArrivalSequence,
    });
    return {
      targetLevel,
      mountOptions: this.createRestartMountOptions(request, targetMountState),
      commit: (engine: CartridgeSdkV1Runtime) => {
        this.options.developerRuntime.clearTransientState(engine);
        this.options.transitions.reset();
        this.options.clearActiveLevelDroppedInventoryPresentation();
        this.options.droppedInventory.resetRuntimeState();
        this.options.scriptedSequences.resetRuntimeState(engine);
        this.options.inventoryRuntime.resetRuntimeState();
        if (this.options.worldState.isNetherLevelId(request.levelId)) {
          this.options.worldState.applyNetherEntrySnapshot(rollbackSnapshot.netherEntrySnapshot);
          this.applyRestartInventoryOverride(request);
        }
      },
      publish: (engine: CartridgeSdkV1Runtime) => {
        netherReset?.commit();
        this.options.worldState.applySuccessfulTransitionTarget(targetLevel, targetMountState);
        engine.video.gridMenus.clearCarriedItem();
        engine.video.gridMenus.closeMenu();
        engine.video.actionMenus.closeMenu();
        engine.video.messages.clearMessages();
      },
      rollback: (engine: CartridgeSdkV1Runtime) => {
        netherReset?.rollback();
        this.options.worldState.restoreTransitionSnapshot(rollbackSnapshot, engine);
      },
      remountCurrentLevel: (engine: CartridgeSdkV1Runtime, currentLevel: RoccoLevel) =>
        this.options.worldState.remountCurrentLevelWithSnapshot(
          engine,
          currentLevel,
          mountStateSnapshot,
          playerSnapshot,
        ),
      onCommitted: (_engine: CartridgeSdkV1Runtime, scene: RoccoPlaneScene) => {
        this.options.syncActiveLevelDroppedInventoryPresentation();
        this.options.updateStatus(scene);
      },
      onRolledBack: (
        _engine: CartridgeSdkV1Runtime,
        _currentLevel: RoccoLevel,
        restoredScene: RoccoPlaneScene,
      ) => {
        this.options.syncActiveLevelDroppedInventoryPresentation();
        this.options.updateStatus(restoredScene);
      },
    };
  }

  async restartFromCheckpoint(request: RoccoLevelRestartRequest): Promise<void> {
    const engine = this.options.getEngine();
    const activeLevel = this.options.getActiveLevel();
    if (!engine || !activeLevel || this.options.levelTransitionService.isTransitioning) {
      this.options.onRestartRequested?.();
      return;
    }
    const rollbackSnapshot = this.options.worldState.createTransitionSnapshot();
    const playerSnapshot = this.options.worldState.capturePlayerSnapshot();
    const mountStateSnapshot = this.options.worldState.currentMountState;
    const netherReset = this.options.worldState.isNetherLevelId(request.levelId)
      ? this.options.levelRegistry.prepareMapReset('nether')
      : null;
    await this.options.levelTransitionService.run(
      this.createRestartPlan({
        request,
        rollbackSnapshot,
        playerSnapshot,
        mountStateSnapshot,
        netherReset,
      }),
    );
  }
}
