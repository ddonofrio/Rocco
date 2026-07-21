import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';
import type { RoccoPlaneScene } from '../../../../console/video/planes';
import { PIER_LEVEL_TRANSITION_COOLDOWN_MS } from '../../games/rocco-default/maps/pier/pier-layout';
import { ROCCO_PIER_START_LEVEL_ID } from '../../games/rocco-default/maps/pier/pier-level-ids';
import { ROCCO_BAIT_SHOP_LEVEL_ID } from '../../games/rocco-default/maps/shop';
import type { RoccoLevel } from '../rocco-level-types';
import { RoccoDeveloperRuntimeController } from './rocco-developer-runtime-controller';
import { RoccoLevelRegistry } from './rocco-level-registry';
import {
  RoccoLevelTransitionController,
  type RoccoResolvedLevelTransition,
} from './rocco-level-transition-controller';
import { RoccoLevelTransitionService } from './rocco-level-transition-service';
import { RoccoWorldState, type RoccoLevelTransitionPreparation } from './rocco-world-state';

export interface RoccoTransitionPlanFactoryOptions {
  getEngine: () => CartridgeSdkV1Runtime | null;
  getActiveLevel: () => RoccoLevel | null;
  levelRegistry: RoccoLevelRegistry;
  transitions: RoccoLevelTransitionController;
  levelTransitionService: RoccoLevelTransitionService;
  developerRuntime: RoccoDeveloperRuntimeController;
  worldState: RoccoWorldState;
  clearActiveLevelDroppedInventoryPresentation: () => void;
  syncActiveLevelDroppedInventoryPresentation: () => void;
  updateStatus: (scene: RoccoPlaneScene) => void;
}

interface TransitionPlanOptions {
  id: string;
  targetLevelId: string;
  preparation: RoccoLevelTransitionPreparation;
  createMountState: () => Parameters<RoccoWorldState['createMountStateSnapshot']>[0];
  shouldSetCooldown: boolean;
  shopExitConnectorId?: string;
}

export class RoccoTransitionPlanFactory {
  private readonly options: RoccoTransitionPlanFactoryOptions;

  constructor(options: RoccoTransitionPlanFactoryOptions) {
    this.options = options;
  }

  private createPlan(options: TransitionPlanOptions) {
    return {
      id: options.id,
      prepare: () => this.createPreparedTransition(options),
    };
  }

  private createPreparedTransition(options: TransitionPlanOptions) {
    const { rollbackSnapshot, playerSnapshot, mountStateSnapshot, enteringNetherSnapshot } =
      options.preparation;
    const targetLevel = this.options.levelRegistry.requireLevel(options.targetLevelId);
    const targetMountState = this.options.worldState.createMountStateSnapshot(
      options.createMountState(),
    );
    return {
      targetLevel,
      mountOptions: this.options.worldState.buildRuntimeMountOptions(targetMountState),
      commit: (engine: CartridgeSdkV1Runtime) => {
        this.options.developerRuntime.clearTransientState(engine);
        this.options.transitions.clearPendingExitIntent();
        this.options.clearActiveLevelDroppedInventoryPresentation();
        this.options.worldState.setPendingNetherSnapshot(enteringNetherSnapshot);
      },
      publish: () => {
        this.options.worldState.applySuccessfulTransitionTarget(targetLevel, targetMountState);
      },
      rollback: (engine: CartridgeSdkV1Runtime) => {
        this.options.worldState.restoreTransitionSnapshot(rollbackSnapshot, engine);
      },
      remountCurrentLevel: (engine: CartridgeSdkV1Runtime, currentLevel: RoccoLevel) =>
        this.options.worldState.remountCurrentLevelWithSnapshot(
          engine,
          currentLevel,
          mountStateSnapshot,
          playerSnapshot,
        ),
      onCommitted: this.createCommitHandler(options, enteringNetherSnapshot),
      onRolledBack: (
        engine: CartridgeSdkV1Runtime,
        currentLevel: RoccoLevel,
        restoredScene: RoccoPlaneScene,
      ) => this.handleRolledBack(engine, currentLevel, restoredScene),
    };
  }

  private createCommitHandler(
    options: TransitionPlanOptions,
    enteringNetherSnapshot: ReturnType<RoccoWorldState['cloneNetherEntrySnapshot']>,
  ): (engine: CartridgeSdkV1Runtime, scene: RoccoPlaneScene) => void {
    return (engine, scene) => {
      if (enteringNetherSnapshot) {
        this.options.worldState.captureNetherEntrySnapshot(enteringNetherSnapshot);
      }
      this.options.worldState.setPendingNetherSnapshot(null);
      this.options.syncActiveLevelDroppedInventoryPresentation();
      if (options.shouldSetCooldown) {
        this.options.transitions.setCooldown(PIER_LEVEL_TRANSITION_COOLDOWN_MS);
      }
      this.options.updateStatus(scene);
      if (
        options.shopExitConnectorId === 'shop-exit' &&
        options.targetLevelId === ROCCO_PIER_START_LEVEL_ID
      ) {
        engine.audio.playSound('rocco-bait-shop-door-closing-sound', {
          restart: true,
          volume: 0.21,
        });
      }
    };
  }

  private handleRolledBack(
    _engine: CartridgeSdkV1Runtime,
    _currentLevel: RoccoLevel,
    restoredScene: RoccoPlaneScene,
  ): void {
    this.options.syncActiveLevelDroppedInventoryPresentation();
    this.options.updateStatus(restoredScene);
  }

  async switchToLevel(levelId: string, entryConnectorId?: string): Promise<boolean> {
    const activeLevel = this.options.getActiveLevel();
    if (!this.options.getEngine() || !activeLevel) {
      return false;
    }
    if (activeLevel.id === levelId) {
      return true;
    }
    const preparation = this.options.worldState.prepareLevelTransition(levelId);
    return this.options.levelTransitionService.run(
      this.createPlan({
        id: `switch-to-${levelId}`,
        targetLevelId: levelId,
        preparation,
        createMountState: () => ({ entryConnectorId }),
        shouldSetCooldown: false,
        shopExitConnectorId: entryConnectorId === 'shop-exit' ? 'shop-exit' : undefined,
      }),
    );
  }

  async transitionThrough(transition: RoccoResolvedLevelTransition): Promise<void> {
    if (!this.options.getEngine() || !this.options.getActiveLevel()) {
      return;
    }
    const targetLevelId = transition.targetEndpoint.levelId;
    const preparation = this.options.worldState.prepareLevelTransition(targetLevelId);
    await this.options.levelTransitionService.run(
      this.createPlan({
        id: `transition-through-${targetLevelId}`,
        targetLevelId,
        preparation,
        createMountState: () => ({
          entryConnectorId: transition.targetEndpoint.connectorId,
          entryPosition: transition.connector.preservePlayerPosition
            ? this.options.worldState.resolveMirroredPlayerPosition()
            : undefined,
        }),
        shouldSetCooldown: true,
        shopExitConnectorId:
          transition.targetEndpoint.connectorId === 'shop-exit' ? 'shop-exit' : undefined,
      }),
    );
  }

  async enterBaitShop(): Promise<void> {
    if (!this.options.getEngine() || !this.options.getActiveLevel()) {
      return;
    }
    const preparation = this.options.worldState.prepareLevelTransition(ROCCO_BAIT_SHOP_LEVEL_ID);
    const { rollbackSnapshot, playerSnapshot, mountStateSnapshot } = preparation;
    await this.options.levelTransitionService.run({
      id: 'enter-bait-shop',
      prepare: () => {
        const targetLevel = this.options.levelRegistry.requireLevel(ROCCO_BAIT_SHOP_LEVEL_ID);
        const targetMountState = this.options.worldState.createMountStateSnapshot();
        return {
          targetLevel,
          mountOptions: this.options.worldState.buildRuntimeMountOptions(targetMountState),
          commit: (engine: CartridgeSdkV1Runtime) => {
            this.options.developerRuntime.clearTransientState(engine);
            this.options.transitions.clearPendingExitIntent();
            this.options.clearActiveLevelDroppedInventoryPresentation();
          },
          publish: () => {
            this.options.worldState.applySuccessfulTransitionTarget(targetLevel, targetMountState);
          },
          rollback: (engine: CartridgeSdkV1Runtime) => {
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
      },
    });
  }
}
