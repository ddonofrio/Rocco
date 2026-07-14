import type { RoccoEngine } from '../../../../console/engine-sdk';
import type { RoccoPlaneScene } from '../../../../console/video/planes';
import type { RoccoSpriteDefinition } from '../../../../console/video/sprites';
import { RoccoAssetPreloader } from '../rocco-asset-preloader';
import type { RoccoLevel, RoccoLevelMountOptions } from '../rocco-level-types';

export type RoccoLevelTransitionPhase =
  | 'idle'
  | 'preparing-target'
  | 'committing'
  | 'active'
  | 'rolling-back'
  | 'active-current'
  | 'fatal';

interface RoccoLevelTransitionAbortReason {
  readonly kind: 'superseded' | 'invalidated';
  readonly mode: 'rollback' | 'abandon';
  readonly requestedBy?: string;
}

class RoccoLevelTransitionCancelledError extends Error {
  readonly abortReason: RoccoLevelTransitionAbortReason | null;

  constructor(message: string, abortReason: RoccoLevelTransitionAbortReason | null) {
    super(message);
    this.name = 'RoccoLevelTransitionCancelledError';
    this.abortReason = abortReason;
  }
}

class AbortableTransitionPreloader extends RoccoAssetPreloader {
  private readonly signal: AbortSignal;

  constructor(
    signal: AbortSignal,
    onProgress: (progress: ReturnType<RoccoAssetPreloader['getProgress']>) => void,
  ) {
    super(onProgress);
    this.signal = signal;
  }

  override async preloadAssetUrls(engine: RoccoEngine, urls: readonly string[]): Promise<void> {
    this.assertNotAborted('asset url preload');
    await super.preloadAssetUrls(engine, urls);
    this.assertNotAborted('asset url preload');
  }

  override async preloadPlaneScene(engine: RoccoEngine, scene: RoccoPlaneScene): Promise<void> {
    this.assertNotAborted('plane scene preload');
    await super.preloadPlaneScene(engine, scene);
    this.assertNotAborted('plane scene preload');
  }

  override async preloadSpriteDefinition(
    engine: RoccoEngine,
    definition: RoccoSpriteDefinition,
  ): Promise<void> {
    this.assertNotAborted(`sprite preload '${definition.id}'`);
    await super.preloadSpriteDefinition(engine, definition);
    this.assertNotAborted(`sprite preload '${definition.id}'`);
  }

  override async preloadSound(engine: RoccoEngine, id: string): Promise<void> {
    this.assertNotAborted(`sound preload '${id}'`);
    await super.preloadSound(engine, id);
    this.assertNotAborted(`sound preload '${id}'`);
  }

  override addWalkMap(): void {
    this.assertNotAborted('walk map preload');
    super.addWalkMap();
    this.assertNotAborted('walk map preload');
  }

  private assertNotAborted(stage: string): void {
    if (!this.signal.aborted) {
      return;
    }

    throw new RoccoLevelTransitionCancelledError(
      `Level transition ${stage} was cancelled.`,
      normalizeAbortReason(this.signal.reason),
    );
  }
}

export interface RoccoLevelTransitionPrepareContext {
  readonly engine: RoccoEngine;
  readonly currentLevel: RoccoLevel;
  readonly signal: AbortSignal;
}

export interface RoccoPreparedLevelTransition {
  readonly targetLevel: RoccoLevel;
  readonly mountOptions: RoccoLevelMountOptions;

  commit(engine: RoccoEngine): void | Promise<void>;

  publish?(engine: RoccoEngine, scene: RoccoPlaneScene): void | Promise<void>;

  rollback(engine: RoccoEngine): void | Promise<void>;

  onCommitted?(engine: RoccoEngine, scene: RoccoPlaneScene): void | Promise<void>;

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

  prepare(
    context: RoccoLevelTransitionPrepareContext,
  ): Promise<RoccoPreparedLevelTransition> | RoccoPreparedLevelTransition;
}

export interface RoccoLevelTransitionServiceOptions {
  getEngine: () => RoccoEngine | null;
  getActiveLevel: () => RoccoLevel | null;
  setActiveLevel: (level: RoccoLevel | null) => void;
  createMountOptions: () => RoccoLevelMountOptions;
}

interface ActiveTransitionRun {
  readonly id: string;
  readonly generation: number;
  readonly controller: AbortController;
  readonly settled: Promise<void>;
  readonly resolveSettled: () => void;
  published: boolean;
}

export class RoccoLevelTransitionService {
  private readonly options: RoccoLevelTransitionServiceOptions;
  private phase: RoccoLevelTransitionPhase = 'idle';
  private busy = false;
  private generation = 0;
  private activeRun: ActiveTransitionRun | null = null;
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
    let engine = this.options.getEngine();
    let activeLevel = this.options.getActiveLevel();
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

    if (this.activeRun) {
      engine.log(
        'System',
        `Level transition '${plan.id}' rejected: another transition '${this.activeRun.id}' is already in progress.`,
      );
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
    const run = this.createActiveRun(plan.id, generation);
    this.activeRun = run;

    let prepared: RoccoPreparedLevelTransition | null = null;
    let isKeepResourcesLocked = false;
    let isCurrentLevelNeedsRestore = false;
    let isCurrentLevelNeedsCleanupBeforeRestore = false;
    let isTargetMountAttempted = false;

    try {
      const preparedCandidate = plan.prepare({
        engine,
        currentLevel: activeLevel,
        signal: run.controller.signal,
      });
      prepared = isPromiseLike(preparedCandidate)
        ? await preparedCandidate
        : preparedCandidate;
      this.assertRunNotAborted(
        run.controller.signal,
        `Level transition '${plan.id}' was cancelled during prepare.`,
      );

      const preloader = new AbortableTransitionPreloader(run.controller.signal, (progress) => {
        composition.report({
          completed: progress.percent,
          total: 100,
          message: `LOADING ${progress.percent}%`,
        });
      });

      this.phase = 'committing';
      await prepared.commit(engine);
      this.assertRunNotAborted(
        run.controller.signal,
        `Level transition '${plan.id}' was cancelled during pre-commit.`,
      );

      try {
        activeLevel.unmount(engine);
        isCurrentLevelNeedsRestore = true;
      } catch (unmountError) {
        isCurrentLevelNeedsRestore = true;
        isCurrentLevelNeedsCleanupBeforeRestore = true;
        throw unmountError;
      }

      this.assertRunNotAborted(
        run.controller.signal,
        `Level transition '${plan.id}' was cancelled after the current level unmounted.`,
      );

      isTargetMountAttempted = true;
      const scene = await prepared.targetLevel.mount(engine, prepared.mountOptions, preloader);
      this.assertRunNotAborted(
        run.controller.signal,
        `Level transition '${plan.id}' was cancelled before publication.`,
      );

      run.published = true;
      if (prepared.publish) {
        await prepared.publish(engine, scene);
      } else {
        this.options.setActiveLevel(prepared.targetLevel);
      }

      this.assertRunNotAborted(
        run.controller.signal,
        `Level transition '${plan.id}' was cancelled after publication.`,
      );

      await prepared.onCommitted?.(engine, scene);
      this.assertRunNotAborted(
        run.controller.signal,
        `Level transition '${plan.id}' was cancelled after commit follow-up.`,
      );

      this.phase = 'active';
      composition.report({ completed: 100, total: 100, message: 'LOADING 100%' });
      return true;
    } catch (error) {
      this.logTransitionFailure(engine, plan.id, error, prepared !== null);

      if (!prepared) {
        this.phase = 'idle';
        return false;
      }

      const rollbackResult = await this.rollbackPreparedTransition({
        engine,
        planId: plan.id,
        originalError: error,
        prepared,
        currentLevel: activeLevel,
        cleanupTarget: isTargetMountAttempted,
        currentLevelNeedsRestore: isCurrentLevelNeedsRestore,
        currentLevelNeedsCleanupBeforeRestore: isCurrentLevelNeedsCleanupBeforeRestore,
        abortReason: normalizeAbortReason(run.controller.signal.reason),
      });
      if (rollbackResult.fatalError) {
        isKeepResourcesLocked = this.enterFatalState(
          engine,
          composition,
          inputLease,
          rollbackResult.fatalError,
        );
        return false;
      }

      this.phase =
        normalizeAbortReason(run.controller.signal.reason)?.mode === 'abandon'
          ? 'idle'
          : 'active-current';
      return false;
    } finally {
      if (prepared?.dispose) {
        try {
          await prepared.dispose();
        } catch (disposeError) {
          engine.log(
            'System',
            `Level transition '${plan.id}' cleanup failed: ${this.describeUnknownError(disposeError)}`,
          );
        }
      }

      if (this.activeRun === run) {
        this.activeRun = null;
      }
      run.resolveSettled();

      if (!isKeepResourcesLocked) {
        composition.dispose();
        inputLease.dispose();
        this.busy = false;
      }
    }
  }

  invalidateGenerations(): void {
    this.generation += 1;
    this.abortActiveRun({
      kind: 'invalidated',
      mode: 'abandon',
    });
    this.clearFatalTransitionState();
  }

  private createActiveRun(id: string, generation: number): ActiveTransitionRun {
    let resolveSettled = () => {};
    const settled = new Promise<void>((resolve) => {
      resolveSettled = resolve;
    });

    return {
      id,
      generation,
      controller: new AbortController(),
      published: false,
      settled,
      resolveSettled,
    };
  }

  private abortActiveRun(reason: RoccoLevelTransitionAbortReason): void {
    if (!this.activeRun || this.activeRun.controller.signal.aborted) {
      return;
    }

    this.activeRun.controller.abort(reason);
  }

  private assertRunNotAborted(signal: AbortSignal, message: string): void {
    if (!signal.aborted) {
      return;
    }

    throw new RoccoLevelTransitionCancelledError(message, normalizeAbortReason(signal.reason));
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
    currentLevelNeedsCleanupBeforeRestore: boolean;
    abortReason: RoccoLevelTransitionAbortReason | null;
  }): Promise<{ restoredScene: RoccoPlaneScene | null; fatalError: Error | null }> {
    this.phase = 'rolling-back';

    if (options.cleanupTarget) {
      this.safeUnmount(
        options.engine,
        options.prepared.targetLevel,
        'failed transition target',
      );
    }

    if (options.abortReason?.mode === 'abandon') {
      return {
        restoredScene: null,
        fatalError: null,
      };
    }

    this.options.setActiveLevel(options.currentLevel);

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
      if (options.currentLevelNeedsCleanupBeforeRestore) {
        this.safeUnmount(
          options.engine,
          options.currentLevel,
          'previous level while stabilizing a failed unmount',
        );
      }

      try {
        restoredScene =
          (await options.prepared.remountCurrentLevel?.(
            options.engine,
            options.currentLevel,
          )) ?? (await this.remountCurrentLevel(options.engine, options.currentLevel));
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
    if (!this.activeRun) {
      this.busy = false;
    }
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

  private logTransitionFailure(
    engine: RoccoEngine,
    planId: string,
    error: unknown,
    prepared: boolean,
  ): void {
    if (error instanceof RoccoLevelTransitionCancelledError) {
      engine.log('System', `Level transition '${planId}' cancelled: ${error.message}`);
      return;
    }

    if (!prepared) {
      engine.log(
        'System',
        `Level transition '${planId}' validation failed: ${this.describeUnknownError(error)}`,
      );
      return;
    }

    engine.log(
      'System',
      `Level transition '${planId}' failed: ${this.describeUnknownError(error)}`,
    );
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

function normalizeAbortReason(reason: unknown): RoccoLevelTransitionAbortReason | null {
  if (!reason || typeof reason !== 'object') {
    return null;
  }

  const candidate = reason as Partial<RoccoLevelTransitionAbortReason>;
  if (
    (candidate.kind === 'superseded' || candidate.kind === 'invalidated') &&
    (candidate.mode === 'rollback' || candidate.mode === 'abandon')
  ) {
    return {
      kind: candidate.kind,
      mode: candidate.mode,
      requestedBy: candidate.requestedBy,
    };
  }

  return null;
}

function isPromiseLike<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof value.then === 'function'
  );
}
