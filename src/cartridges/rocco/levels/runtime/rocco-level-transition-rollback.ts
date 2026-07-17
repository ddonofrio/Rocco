import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';
import type { RoccoPlaneScene } from '../../../../console/video/planes';
import { RoccoAssetPreloader } from '../rocco-asset-preloader';
import type { RoccoLevel } from '../rocco-level-types';
import type { RoccoLevelTransitionAbortReason } from './rocco-level-transition-run';
import type { RoccoPreparedLevelTransition } from './rocco-level-transition-service';

export interface RoccoTransitionRollbackOptions {
  engine: CartridgeSdkV1Runtime;
  planId: string;
  originalError: unknown;
  prepared: RoccoPreparedLevelTransition;
  currentLevel: RoccoLevel;
  cleanupTarget: boolean;
  currentLevelNeedsRestore: boolean;
  currentLevelNeedsCleanupBeforeRestore: boolean;
  abortReason: RoccoLevelTransitionAbortReason | undefined;
}

export interface RoccoTransitionRollbackResult {
  restoredScene: RoccoPlaneScene | undefined;
  fatalError: Error | undefined;
}

interface RoccoRollbackAndRestoreResult {
  rollbackError: unknown;
  restoredScene: RoccoPlaneScene | undefined;
  restoreError: unknown;
}

export interface RoccoTransitionRollbackCoordinatorOptions {
  setActiveLevel: (level: RoccoLevel | null) => void;
  createMountOptions: () => Parameters<RoccoLevel['mount']>[1];
}

function describeUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export class RoccoTransitionRollbackCoordinator {
  private readonly options: RoccoTransitionRollbackCoordinatorOptions;

  constructor(options: RoccoTransitionRollbackCoordinatorOptions) {
    this.options = options;
  }

  private async rollbackAndRestorePreviousLevel(
    options: RoccoTransitionRollbackOptions,
  ): Promise<RoccoRollbackAndRestoreResult> {
    let rollbackError: unknown;
    try {
      await options.prepared.rollback(options.engine);
    } catch (error) {
      rollbackError = error;
      options.engine.log(
        'System',
        `Rollback for level transition '${options.planId}' failed: ${describeUnknownError(error)}`,
      );
    }

    if (rollbackError || !options.currentLevelNeedsRestore) {
      return { rollbackError, restoredScene: undefined, restoreError: undefined };
    }
    if (options.currentLevelNeedsCleanupBeforeRestore) {
      this.safeUnmount(
        options.engine,
        options.currentLevel,
        'previous level while stabilizing a failed unmount',
      );
    }

    let restoredScene: RoccoPlaneScene | undefined;
    let restoreError: unknown;
    try {
      restoredScene =
        (await options.prepared.remountCurrentLevel?.(options.engine, options.currentLevel)) ??
        (await this.remountCurrentLevel(options.engine, options.currentLevel));
      if (!restoredScene) {
        restoreError = new Error('Previous level could not be remounted.');
      }
    } catch (error) {
      restoreError = error;
    }
    return { rollbackError, restoredScene, restoreError };
  }

  private async remountCurrentLevel(
    engine: CartridgeSdkV1Runtime,
    currentLevel: RoccoLevel,
  ): Promise<RoccoPlaneScene | undefined> {
    try {
      return await currentLevel.mount(
        engine,
        this.options.createMountOptions(),
        new RoccoAssetPreloader(),
      );
    } catch (restoreError) {
      engine.log(
        'System',
        `Failed to restore previous level after transition failure: ${describeUnknownError(restoreError)}`,
      );
      return undefined;
    }
  }

  private safeUnmount(engine: CartridgeSdkV1Runtime, level: RoccoLevel, reason: string): void {
    try {
      level.unmount(engine);
    } catch (unmountError) {
      engine.log(
        'System',
        `Error while cleaning up ${reason}: ${describeUnknownError(unmountError)}`,
      );
    }
  }

  private createFatalTransitionError(
    planId: string,
    originalError: unknown,
    rollbackError: unknown,
    restoreError: unknown,
  ): Error {
    const reasons = [
      `transition failure: ${describeUnknownError(originalError)}`,
      rollbackError ? `rollback failure: ${describeUnknownError(rollbackError)}` : undefined,
      restoreError ? `restore failure: ${describeUnknownError(restoreError)}` : undefined,
    ].filter((reason): reason is string => reason !== undefined);
    return new Error(`Level transition '${planId}' entered a fatal state; ${reasons.join(' | ')}`);
  }

  async rollback(options: RoccoTransitionRollbackOptions): Promise<RoccoTransitionRollbackResult> {
    if (options.cleanupTarget) {
      this.safeUnmount(options.engine, options.prepared.targetLevel, 'failed transition target');
    }

    if (options.abortReason?.mode === 'abandon') {
      return { restoredScene: undefined, fatalError: undefined };
    }

    this.options.setActiveLevel(options.currentLevel);
    const rollbackResult = await this.rollbackAndRestorePreviousLevel(options);
    const { rollbackError, restoredScene, restoreError } = rollbackResult;

    if (rollbackError || restoreError) {
      return {
        restoredScene: undefined,
        fatalError: this.createFatalTransitionError(
          options.planId,
          options.originalError,
          rollbackError,
          restoreError,
        ),
      };
    }

    if (restoredScene) {
      try {
        options.prepared.onRolledBack?.(options.engine, options.currentLevel, restoredScene);
      } catch (error) {
        options.engine.log(
          'System',
          `Transition rollback follow-up for '${options.planId}' failed: ${describeUnknownError(error)}`,
        );
      }
    }

    return { restoredScene, fatalError: undefined };
  }
}
