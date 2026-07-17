import type { RoccoEngine } from '../../../../console/engine-sdk';
import type { RoccoPlaneScene } from '../../../../console/video/planes';
import type { RoccoSpriteDefinition } from '../../../../console/video/sprites';
import { RoccoAssetPreloader } from '../rocco-asset-preloader';
import type { RoccoLevel, RoccoLevelMountOptions } from '../rocco-level-types';

interface PromiseWithResolversResult<T> {
  promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
  reject(reason?: unknown): void;
}

const promiseConstructor = Promise as PromiseConstructor & {
  withResolvers<T>(): PromiseWithResolversResult<T>;
};

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

interface ActiveTransitionRun {
  readonly id: string;
  readonly generation: number;
  readonly controller: AbortController;
  readonly settled: Promise<void>;
  readonly resolveSettled: () => void;
  published: boolean;
}

interface StartedTransitionRun {
  readonly inputLease: ReturnType<RoccoEngine['acquireInputLease']>;
  readonly composition: ReturnType<RoccoEngine['beginCompositionSession']>;
  readonly run: ActiveTransitionRun;
}

interface TransitionProgressState {
  currentLevelNeedsRestore: boolean;
  currentLevelNeedsCleanupBeforeRestore: boolean;
  isTargetMountAttempted: boolean;
}

interface FatalTransitionState {
  inputLease: ReturnType<RoccoEngine['acquireInputLease']>;
  composition: ReturnType<RoccoEngine['beginCompositionSession']>;
}

interface RollbackPreparedTransitionOptions {
  engine: RoccoEngine;
  planId: string;
  originalError: unknown;
  prepared: RoccoPreparedLevelTransition;
  currentLevel: RoccoLevel;
  cleanupTarget: boolean;
  currentLevelNeedsRestore: boolean;
  currentLevelNeedsCleanupBeforeRestore: boolean;
  abortReason: RoccoLevelTransitionAbortReason | undefined;
}

interface RollbackPreparedTransitionResult {
  restoredScene: RoccoPlaneScene | undefined;
  fatalError: Error | undefined;
}

interface PreparedTransitionFailureOptions {
  engine: RoccoEngine;
  planId: string;
  originalError: unknown;
  prepared: RoccoPreparedLevelTransition;
  currentLevel: RoccoLevel;
  startedRun: StartedTransitionRun;
  progressState: TransitionProgressState;
}

class RoccoLevelTransitionCancelledError extends Error {
  readonly abortReason: RoccoLevelTransitionAbortReason | undefined;

  constructor(message: string, abortReason: RoccoLevelTransitionAbortReason | undefined) {
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

  private assertNotAborted(stage: string): void {
    if (!this.signal.aborted) {
      return;
    }

    throw new RoccoLevelTransitionCancelledError(
      `Level transition ${stage} was cancelled.`,
      normalizeAbortReason(this.signal.reason),
    );
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

export class RoccoLevelTransitionService {
  private readonly options: RoccoLevelTransitionServiceOptions;
  private phase: RoccoLevelTransitionPhase = 'idle';
  private busy = false;
  private generation = 0;
  private activeRun: ActiveTransitionRun | undefined = undefined;
  private fatalTransitionState: FatalTransitionState | undefined = undefined;

  constructor(options: RoccoLevelTransitionServiceOptions) {
    this.options = options;
  }

  private resolveRunContext(
    planId: string,
  ): { engine: RoccoEngine; activeLevel: RoccoLevel } | undefined {
    const engine = this.options.getEngine();
    const activeLevel = this.options.getActiveLevel();
    if (!engine || !activeLevel) {
      return undefined;
    }

    if (this.fatalTransitionState) {
      engine.log(
        'System',
        `Level transition '${planId}' rejected: transition service is in a fatal state.`,
      );
      return undefined;
    }

    if (this.activeRun) {
      engine.log(
        'System',
        `Level transition '${planId}' rejected: another transition '${this.activeRun.id}' is already in progress.`,
      );
      return undefined;
    }

    return { engine, activeLevel };
  }

  private startRun(planId: string, engine: RoccoEngine): StartedTransitionRun {
    this.generation += 1;
    this.busy = true;
    this.phase = 'preparing-target';

    const inputLease = engine.acquireInputLease('level-transition', 'blocked');
    const composition = engine.beginCompositionSession('level-transition', {
      message: 'LOADING 0%',
    });
    const run = this.createActiveRun(planId, this.generation);
    this.activeRun = run;

    return {
      inputLease,
      composition,
      run,
    };
  }

  private createActiveRun(id: string, generation: number): ActiveTransitionRun {
    const deferred = promiseConstructor.withResolvers<void>();

    return {
      id,
      generation,
      controller: new AbortController(),
      published: false,
      settled: deferred.promise,
      resolveSettled: () => {
        deferred.resolve();
      },
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

  private async prepareTransition(
    plan: RoccoLevelTransitionPlan,
    engine: RoccoEngine,
    activeLevel: RoccoLevel,
    run: ActiveTransitionRun,
  ): Promise<RoccoPreparedLevelTransition> {
    const prepared = await plan.prepare({
      engine,
      currentLevel: activeLevel,
      signal: run.controller.signal,
    });
    this.assertRunNotAborted(
      run.controller.signal,
      `Level transition '${plan.id}' was cancelled during prepare.`,
    );
    return prepared;
  }

  private createTransitionPreloader(
    signal: AbortSignal,
    composition: ReturnType<RoccoEngine['beginCompositionSession']>,
  ): AbortableTransitionPreloader {
    return new AbortableTransitionPreloader(signal, (progress) => {
      composition.report({
        completed: progress.percent,
        total: 100,
        message: `LOADING ${progress.percent}%`,
      });
    });
  }

  private async commitPreparedTransition(options: {
    engine: RoccoEngine;
    activeLevel: RoccoLevel;
    planId: string;
    prepared: RoccoPreparedLevelTransition;
    run: ActiveTransitionRun;
    composition: ReturnType<RoccoEngine['beginCompositionSession']>;
    progressState: TransitionProgressState;
  }): Promise<void> {
    const preloader = this.createTransitionPreloader(
      options.run.controller.signal,
      options.composition,
    );

    this.phase = 'committing';
    await options.prepared.commit(options.engine);
    this.assertRunNotAborted(
      options.run.controller.signal,
      `Level transition '${options.planId}' was cancelled during pre-commit.`,
    );

    try {
      options.activeLevel.unmount(options.engine);
      options.progressState.currentLevelNeedsRestore = true;
    } catch (unmountError) {
      options.progressState.currentLevelNeedsRestore = true;
      options.progressState.currentLevelNeedsCleanupBeforeRestore = true;
      throw unmountError;
    }

    this.assertRunNotAborted(
      options.run.controller.signal,
      `Level transition '${options.planId}' was cancelled after the current level unmounted.`,
    );

    options.progressState.isTargetMountAttempted = true;
    const scene = await options.prepared.targetLevel.mount(
      options.engine,
      options.prepared.mountOptions,
      preloader,
    );
    this.assertRunNotAborted(
      options.run.controller.signal,
      `Level transition '${options.planId}' was cancelled before publication.`,
    );

    options.run.published = true;
    if (options.prepared.publish) {
      await options.prepared.publish(options.engine, scene);
    } else {
      this.options.setActiveLevel(options.prepared.targetLevel);
    }

    this.assertRunNotAborted(
      options.run.controller.signal,
      `Level transition '${options.planId}' was cancelled after publication.`,
    );

    await options.prepared.onCommitted?.(options.engine, scene);
    this.assertRunNotAborted(
      options.run.controller.signal,
      `Level transition '${options.planId}' was cancelled after commit follow-up.`,
    );
  }

  private completeSuccessfulRun(
    composition: ReturnType<RoccoEngine['beginCompositionSession']>,
  ): void {
    this.phase = 'active';
    composition.report({ completed: 100, total: 100, message: 'LOADING 100%' });
  }

  private async disposePreparedTransition(
    engine: RoccoEngine,
    planId: string,
    prepared: RoccoPreparedLevelTransition | undefined,
  ): Promise<void> {
    if (!prepared?.dispose) {
      return;
    }

    try {
      await prepared.dispose();
    } catch (disposeError) {
      engine.log(
        'System',
        `Level transition '${planId}' cleanup failed: ${this.describeUnknownError(disposeError)}`,
      );
    }
  }

  private finishRun(startedRun: StartedTransitionRun, shouldKeepResourcesLocked: boolean): void {
    if (this.activeRun === startedRun.run) {
      this.activeRun = undefined;
    }
    startedRun.run.resolveSettled();

    if (shouldKeepResourcesLocked) {
      return;
    }

    startedRun.composition.dispose();
    startedRun.inputLease.dispose();
    this.busy = false;
  }

  private resolvePostRollbackPhase(signal: AbortSignal): RoccoLevelTransitionPhase {
    return normalizeAbortReason(signal.reason)?.mode === 'abandon'
      ? 'idle'
      : 'active-current';
  }

  private async remountCurrentLevel(
    engine: RoccoEngine,
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
        `Failed to restore previous level after transition failure: ${this.describeUnknownError(restoreError)}`,
      );
      return undefined;
    }
  }

  private async rollbackPreparedTransition(
    options: RollbackPreparedTransitionOptions,
  ): Promise<RollbackPreparedTransitionResult> {
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
        restoredScene: undefined,
        fatalError: undefined,
      };
    }

    this.options.setActiveLevel(options.currentLevel);

    let rollbackError: unknown;
    try {
      await options.prepared.rollback(options.engine);
    } catch (error) {
      rollbackError = error;
      options.engine.log(
        'System',
        `Rollback for level transition '${options.planId}' failed: ${this.describeUnknownError(error)}`,
      );
    }

    let restoredScene: RoccoPlaneScene | undefined;
    let restoreError: unknown;
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
      fatalError: undefined,
    };
  }

  private createClearedActiveLevel(): Parameters<
    RoccoLevelTransitionServiceOptions['setActiveLevel']
  >[0] {
    return JSON.parse('null') as Parameters<
      RoccoLevelTransitionServiceOptions['setActiveLevel']
    >[0];
  }

  private enterFatalState(
    engine: RoccoEngine,
    composition: ReturnType<RoccoEngine['beginCompositionSession']>,
    inputLease: ReturnType<RoccoEngine['acquireInputLease']>,
    error: Error,
  ): true {
    this.options.setActiveLevel(this.createClearedActiveLevel());
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
    this.fatalTransitionState = undefined;
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
      rollbackError ? `rollback failure: ${this.describeUnknownError(rollbackError)}` : undefined,
      restoreError ? `restore failure: ${this.describeUnknownError(restoreError)}` : undefined,
    ].filter((reason): reason is string => reason !== undefined);
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
    isPrepared: boolean,
  ): void {
    if (error instanceof RoccoLevelTransitionCancelledError) {
      engine.log('System', `Level transition '${planId}' cancelled: ${error.message}`);
      return;
    }

    if (!isPrepared) {
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

  private async handlePreparedTransitionFailure(
    options: PreparedTransitionFailureOptions,
  ): Promise<{ shouldKeepResourcesLocked: boolean }> {
    this.logTransitionFailure(options.engine, options.planId, options.originalError, true);

    const rollbackResult = await this.rollbackPreparedTransition({
      engine: options.engine,
      planId: options.planId,
      originalError: options.originalError,
      prepared: options.prepared,
      currentLevel: options.currentLevel,
      cleanupTarget: options.progressState.isTargetMountAttempted,
      currentLevelNeedsRestore: options.progressState.currentLevelNeedsRestore,
      currentLevelNeedsCleanupBeforeRestore:
        options.progressState.currentLevelNeedsCleanupBeforeRestore,
      abortReason: normalizeAbortReason(options.startedRun.run.controller.signal.reason),
    });
    if (rollbackResult.fatalError) {
      return {
        shouldKeepResourcesLocked: this.enterFatalState(
          options.engine,
          options.startedRun.composition,
          options.startedRun.inputLease,
          rollbackResult.fatalError,
        ),
      };
    }

    this.phase = this.resolvePostRollbackPhase(options.startedRun.run.controller.signal);
    return {
      shouldKeepResourcesLocked: false,
    };
  }

  get currentPhase(): RoccoLevelTransitionPhase {
    return this.phase;
  }

  get isTransitioning(): boolean {
    return this.busy;
  }

  async run(plan: RoccoLevelTransitionPlan): Promise<boolean> {
    const runContext = this.resolveRunContext(plan.id);
    if (!runContext) {
      return false;
    }

    const startedRun = this.startRun(plan.id, runContext.engine);
    let prepared: RoccoPreparedLevelTransition | undefined;
    let shouldKeepResourcesLocked = false;
    const progressState: TransitionProgressState = {
      currentLevelNeedsRestore: false,
      currentLevelNeedsCleanupBeforeRestore: false,
      isTargetMountAttempted: false,
    };

    try {
      prepared = await this.prepareTransition(
        plan,
        runContext.engine,
        runContext.activeLevel,
        startedRun.run,
      );
      await this.commitPreparedTransition({
        engine: runContext.engine,
        activeLevel: runContext.activeLevel,
        planId: plan.id,
        prepared,
        run: startedRun.run,
        composition: startedRun.composition,
        progressState,
      });
      this.completeSuccessfulRun(startedRun.composition);
      return true;
    } catch (error) {
      if (!prepared) {
        this.logTransitionFailure(runContext.engine, plan.id, error, false);
        this.phase = 'idle';
        return false;
      }

      const failureResult = await this.handlePreparedTransitionFailure({
        engine: runContext.engine,
        planId: plan.id,
        originalError: error,
        prepared,
        currentLevel: runContext.activeLevel,
        startedRun,
        progressState,
      });
      shouldKeepResourcesLocked = failureResult.shouldKeepResourcesLocked;
      return false;
    } finally {
      await this.disposePreparedTransition(runContext.engine, plan.id, prepared);
      this.finishRun(startedRun, shouldKeepResourcesLocked);
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
}

function normalizeAbortReason(reason: unknown): RoccoLevelTransitionAbortReason | undefined {
  if (!reason || typeof reason !== 'object') {
    return undefined;
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

  return undefined;
}
