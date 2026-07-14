import type { RoccoEngine } from '../../../../console/engine-sdk';
import type { RoccoPlaneScene } from '../../../../console/video/planes';
import type { RoccoLevel, RoccoLevelMountOptions } from '../rocco-level-types';
import { RoccoAssetPreloader } from '../rocco-asset-preloader';

export type RoccoLevelTransitionPhase =
  | 'idle'
  | 'preparing-target'
  | 'committing'
  | 'active'
  | 'rolling-back'
  | 'active-current'
  | 'fatal';

export interface RoccoPreparedLevelTransition {
  readonly targetLevel: RoccoLevel;
  readonly mountOptions: RoccoLevelMountOptions;

  commit(engine: RoccoEngine): void | Promise<void>;

  rollback(engine: RoccoEngine): void | Promise<void>;

  onCommitted(engine: RoccoEngine, scene: RoccoPlaneScene): void;

  onRolledBack?(
    engine: RoccoEngine,
    currentLevel: RoccoLevel,
    restoredScene: RoccoPlaneScene,
  ): void;

  remountCurrentLevel?(
    engine: RoccoEngine,
    currentLevel: RoccoLevel,
  ): Promise<RoccoPlaneScene | null>;

  dispose?(): void | Promise<void>;
}

export interface RoccoLevelTransitionPlan {
  readonly id: string;

  prepare(engine: RoccoEngine, currentLevel: RoccoLevel): RoccoPreparedLevelTransition;
}

export interface RoccoLevelTransitionServiceOptions {
  getEngine: () => RoccoEngine | null;
  getActiveLevel: () => RoccoLevel | null;
  setActiveLevel: (level: RoccoLevel | null) => void;
  createMountOptions: () => RoccoLevelMountOptions;
}

export class RoccoLevelTransitionService {
  private readonly options: RoccoLevelTransitionServiceOptions;
  private phase: RoccoLevelTransitionPhase = 'idle';
  private busy = false;
  private generation = 0;
  private fatalTransitionState:
    | {
        inputLease: ReturnType<RoccoEngine['acquireInputLease']>;
        composition: ReturnType<RoccoEngine['beginCompositionSession']>;
      }
    | null = null;

  constructor(options: RoccoLevelTransitionServiceOptions) {
    this.options = options;
  }

  get currentPhase(): RoccoLevelTransitionPhase {
    return this.phase;
  }

  get isTransitioning(): boolean {
    return this.busy;
  }

  async run(plan: RoccoLevelTransitionPlan): Promise<boolean> {
    const engine = this.options.getEngine();
    const activeLevel = this.options.getActiveLevel();
    if (!engine || !activeLevel) {
      return false;
    }

    if (this.fatalTransitionState) {
      engine.log(
        'System',
        `Level transition '${plan.id}' rejected: transition service is in a fatal state.`,
      );
      return false;
    }

    if (this.busy) {
      engine.log('System', `Level transition '${plan.id}' rejected: another transition is already running.`);
      return false;
    }

    const generation = this.generation + 1;
    this.generation = generation;
    this.busy = true;
    this.phase = 'preparing-target';

    const inputLease = engine.acquireInputLease('level-transition', 'blocked');
    const composition = engine.beginCompositionSession('level-transition', {
      message: 'LOADING 0%',
    });
    let prepared: RoccoPreparedLevelTransition | null = null;
    let keepResourcesLocked = false;
    let currentLevelNeedsRestore = false;
    let targetPublished = false;

    try {
      prepared = plan.prepare(engine, activeLevel);

      const preloader = new RoccoAssetPreloader((progress) => {
        composition.report({
          completed: progress.percent,
          total: 100,
          message: `LOADING ${progress.percent}%`,
        });
      });

      this.phase = 'committing';
      await prepared.commit(engine);
      currentLevelNeedsRestore = true;
      activeLevel.unmount(engine);
      this.options.setActiveLevel(prepared.targetLevel);
      targetPublished = true;

      try {
        const scene = await prepared.targetLevel.mount(engine, prepared.mountOptions, preloader);
        if (generation !== this.generation) {
          const rollbackResult = await this.rollbackPreparedTransition({
            engine,
            planId: plan.id,
            originalError: new Error('Transition was superseded before publication.'),
            prepared,
            currentLevel: activeLevel,
            cleanupTarget: true,
            currentLevelNeedsRestore,
            targetPublished,
          });
          if (rollbackResult.fatalError) {
            keepResourcesLocked = this.enterFatalState(
              engine,
              composition,
              inputLease,
              rollbackResult.fatalError,
            );
            return false;
          }

          this.phase = 'active-current';
          return false;
        }

        prepared.onCommitted(engine, scene);
        this.phase = 'active';
        composition.report({ completed: 100, total: 100, message: 'LOADING 100%' });
        return true;
      } catch (mountError) {
        engine.log(
          'System',
          `Level transition '${plan.id}' failed: ${this.describeUnknownError(mountError)}`,
        );
        const rollbackResult = await this.rollbackPreparedTransition({
          engine,
          planId: plan.id,
          originalError: mountError,
          prepared,
          currentLevel: activeLevel,
          cleanupTarget: true,
          currentLevelNeedsRestore,
          targetPublished,
        });
        if (rollbackResult.fatalError) {
          keepResourcesLocked = this.enterFatalState(
            engine,
            composition,
            inputLease,
            rollbackResult.fatalError,
          );
          return false;
        }

        this.phase = 'active-current';
        return false;
      }
    } catch (planError) {
      engine.log(
        'System',
        `Level transition '${plan.id}' validation failed: ${this.describeUnknownError(planError)}`,
      );
      if (!prepared) {
        this.phase = 'idle';
        return false;
      }

      const rollbackResult = await this.rollbackPreparedTransition({
        engine,
        planId: plan.id,
        originalError: planError,
        prepared,
        currentLevel: activeLevel,
        cleanupTarget: false,
        currentLevelNeedsRestore,
        targetPublished,
      });
      if (rollbackResult.fatalError) {
        keepResourcesLocked = this.enterFatalState(
          engine,
          composition,
          inputLease,
          rollbackResult.fatalError,
        );
        return false;
      }

      this.phase = 'active-current';
      return false;
    } finally {
      await prepared?.dispose?.();
      if (!keepResourcesLocked) {
        composition.dispose();
        inputLease.dispose();
        this.busy = false;
      }
    }
  }

  invalidateGenerations(): void {
    this.generation += 1;
    this.clearFatalTransitionState();
  }

  private async remountCurrentLevel(
    engine: RoccoEngine,
    currentLevel: RoccoLevel,
  ): Promise<RoccoPlaneScene | null> {
    try {
      return await currentLevel.mount(
        engine,
        this.options.createMountOptions(),
        new RoccoAssetPreloader(),
      );
    } catch (restoreError) {
      engine.log(
        'System',
        `Failed to restore previous level after transition failure: ${this.describeUnknownError(restoreError)}`,
      );
      return null;
    }
  }

  private async rollbackPreparedTransition(options: {
    engine: RoccoEngine;
    planId: string;
    originalError: unknown;
    prepared: RoccoPreparedLevelTransition;
    currentLevel: RoccoLevel;
    cleanupTarget: boolean;
    currentLevelNeedsRestore: boolean;
    targetPublished: boolean;
  }): Promise<{ restoredScene: RoccoPlaneScene | null; fatalError: Error | null }> {
    this.phase = 'rolling-back';
    if (options.cleanupTarget) {
      this.safeUnmount(
        options.engine,
        options.prepared.targetLevel,
        'failed transition target',
      );
    }

    if (options.targetPublished) {
      this.options.setActiveLevel(options.currentLevel);
    }

    let rollbackError: unknown = null;
    try {
      await options.prepared.rollback(options.engine);
    } catch (error) {
      rollbackError = error;
      options.engine.log(
        'System',
        `Rollback for level transition '${options.planId}' failed: ${this.describeUnknownError(error)}`,
      );
    }

    let restoredScene: RoccoPlaneScene | null = null;
    let restoreError: unknown = null;
    if (!rollbackError && options.currentLevelNeedsRestore) {
      try {
        restoredScene =
          (await options.prepared.remountCurrentLevel?.(
            options.engine,
            options.currentLevel,
          )) ??
          (await this.remountCurrentLevel(options.engine, options.currentLevel));
        if (!restoredScene) {
          restoreError = new Error('Previous level could not be remounted.');
        }
      } catch (error) {
        restoreError = error;
      }
    }

    if (rollbackError || restoreError) {
      return {
        restoredScene: null,
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
        options.prepared.onRolledBack?.(
          options.engine,
          options.currentLevel,
          restoredScene,
        );
      } catch (error) {
        options.engine.log(
          'System',
          `Transition rollback follow-up for '${options.planId}' failed: ${this.describeUnknownError(error)}`,
        );
      }
    }

    return {
      restoredScene,
      fatalError: null,
    };
  }

  private enterFatalState(
    engine: RoccoEngine,
    composition: ReturnType<RoccoEngine['beginCompositionSession']>,
    inputLease: ReturnType<RoccoEngine['acquireInputLease']>,
    error: Error,
  ): true {
    this.options.setActiveLevel(null);
    this.phase = 'fatal';
    this.busy = true;
    this.fatalTransitionState = {
      composition,
      inputLease,
    };
    composition.fail(error);
    engine.log('System', `Fatal level transition error: ${error.message}`);
    return true;
  }

  private clearFatalTransitionState(): void {
    this.fatalTransitionState?.composition.dispose();
    this.fatalTransitionState?.inputLease.dispose();
    this.fatalTransitionState = null;
    if (this.phase === 'fatal') {
      this.phase = 'idle';
    }
    this.busy = false;
  }

  private createFatalTransitionError(
    planId: string,
    originalError: unknown,
    rollbackError: unknown,
    restoreError: unknown,
  ): Error {
    const reasons = [
      `transition failure: ${this.describeUnknownError(originalError)}`,
      rollbackError ? `rollback failure: ${this.describeUnknownError(rollbackError)}` : null,
      restoreError ? `restore failure: ${this.describeUnknownError(restoreError)}` : null,
    ].filter((reason): reason is string => reason !== null);
    return new Error(
      `Level transition '${planId}' entered a fatal state; ${reasons.join(' | ')}`,
    );
  }

  private safeUnmount(engine: RoccoEngine, level: RoccoLevel, reason: string): void {
    try {
      level.unmount(engine);
    } catch (unmountError) {
      engine.log(
        'System',
        `Error while cleaning up ${reason}: ${this.describeUnknownError(unmountError)}`,
      );
    }
  }

  private describeUnknownError(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (
      error === null ||
      error === undefined ||
      typeof error === 'number' ||
      typeof error === 'boolean' ||
      typeof error === 'bigint' ||
      typeof error === 'symbol'
    ) {
      return String(error);
    }

    try {
      return JSON.stringify(error);
    } catch {
      return Object.prototype.toString.call(error);
    }
  }
}
