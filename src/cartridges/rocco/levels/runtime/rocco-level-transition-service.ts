import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';
import type { RoccoPlaneScene } from '../../../../console/video/planes';
import type { RoccoLevel, RoccoLevelMountOptions } from '../rocco-level-types';
import {
  assertTransitionNotAborted,
  cancelActiveTransition,
  createActiveTransitionRun,
  normalizeAbortReason,
  RoccoLevelTransitionCancelledError,
  type ActiveTransitionRun,
  type RoccoLevelTransitionAbortReason,
} from './rocco-level-transition-run';
import { RoccoLevelTransitionPreloader } from './rocco-level-transition-preloader';
import { RoccoLevelTransitionPresentation } from './rocco-level-transition-presentation';
import {
  RoccoTransitionRollbackCoordinator,
  type RoccoTransitionRollbackOptions,
} from './rocco-level-transition-rollback';

export type RoccoLevelTransitionPhase =
  | 'idle'
  | 'preparing-target'
  | 'committing'
  | 'active'
  | 'rolling-back'
  | 'active-current'
  | 'fatal';

interface StartedTransitionRun {
  readonly presentation: RoccoLevelTransitionPresentation;
  readonly run: ActiveTransitionRun;
}

interface TransitionProgressState {
  currentLevelNeedsRestore: boolean;
  currentLevelNeedsCleanupBeforeRestore: boolean;
  isTargetMountAttempted: boolean;
}

interface FatalTransitionState {
  presentation: RoccoLevelTransitionPresentation;
}

interface PreparedTransitionFailureOptions {
  engine: CartridgeSdkV1Runtime;
  planId: string;
  originalError: unknown;
  prepared: RoccoPreparedLevelTransition;
  currentLevel: RoccoLevel;
  startedRun: StartedTransitionRun;
  progressState: TransitionProgressState;
}

export interface RoccoLevelTransitionPrepareContext {
  readonly engine: CartridgeSdkV1Runtime;
  readonly currentLevel: RoccoLevel;
  readonly signal: AbortSignal;
}

export interface RoccoPreparedLevelTransition {
  readonly targetLevel: RoccoLevel;
  readonly mountOptions: RoccoLevelMountOptions;

  commit(engine: CartridgeSdkV1Runtime): void | Promise<void>;

  publish?(engine: CartridgeSdkV1Runtime, scene: RoccoPlaneScene): void | Promise<void>;

  rollback(engine: CartridgeSdkV1Runtime): void | Promise<void>;

  onCommitted?(engine: CartridgeSdkV1Runtime, scene: RoccoPlaneScene): void | Promise<void>;

  onRolledBack?(
    engine: CartridgeSdkV1Runtime,
    currentLevel: RoccoLevel,
    restoredScene: RoccoPlaneScene,
  ): void;

  remountCurrentLevel?(
    engine: CartridgeSdkV1Runtime,
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
  getEngine: () => CartridgeSdkV1Runtime | null;
  getActiveLevel: () => RoccoLevel | null;
  setActiveLevel: (level: RoccoLevel | null) => void;
  cancelActiveActions: (reason: string) => void;
  createMountOptions: () => RoccoLevelMountOptions;
}

export class RoccoLevelTransitionService {
  private readonly options: RoccoLevelTransitionServiceOptions;
  private phase: RoccoLevelTransitionPhase = 'idle';
  private busy = false;
  private activeRun: ActiveTransitionRun | undefined = undefined;
  private fatalTransitionState: FatalTransitionState | undefined = undefined;
  private readonly rollbackCoordinator: RoccoTransitionRollbackCoordinator;

  constructor(options: RoccoLevelTransitionServiceOptions) {
    this.options = options;
    this.rollbackCoordinator = new RoccoTransitionRollbackCoordinator({
      setActiveLevel: options.setActiveLevel,
      createMountOptions: options.createMountOptions,
    });
  }

  private resolveRunContext(
    planId: string,
  ): { engine: CartridgeSdkV1Runtime; activeLevel: RoccoLevel } | undefined {
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

  private startRun(planId: string, engine: CartridgeSdkV1Runtime): StartedTransitionRun {
    this.busy = true;
    this.phase = 'preparing-target';

    const presentation = new RoccoLevelTransitionPresentation(engine);
    const run = createActiveTransitionRun(planId);
    this.activeRun = run;

    return { presentation, run };
  }

  private abortActiveRun(reason: RoccoLevelTransitionAbortReason): void {
    cancelActiveTransition(this.activeRun, reason);
  }

  private assertRunNotAborted(signal: AbortSignal, message: string): void {
    assertTransitionNotAborted(signal, message);
  }

  private async prepareTransition(
    plan: RoccoLevelTransitionPlan,
    engine: CartridgeSdkV1Runtime,
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

  private async commitPreparedTransition(options: {
    engine: CartridgeSdkV1Runtime;
    activeLevel: RoccoLevel;
    planId: string;
    prepared: RoccoPreparedLevelTransition;
    run: ActiveTransitionRun;
    presentation: RoccoLevelTransitionPresentation;
    progressState: TransitionProgressState;
  }): Promise<void> {
    const preloader = new RoccoLevelTransitionPreloader(options.run.controller.signal, (progress) =>
      options.presentation.report(progress.percent),
    );

    this.phase = 'committing';
    await options.prepared.commit(options.engine);
    this.assertRunNotAborted(
      options.run.controller.signal,
      `Level transition '${options.planId}' was cancelled during pre-commit.`,
    );

    this.options.cancelActiveActions(`level-transition:${options.planId}`);

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

  private completeSuccessfulRun(presentation: RoccoLevelTransitionPresentation): void {
    this.phase = 'active';
    presentation.complete();
  }

  private async disposePreparedTransition(
    engine: CartridgeSdkV1Runtime,
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

    startedRun.presentation.dispose();
    this.busy = false;
  }

  private resolvePostRollbackPhase(signal: AbortSignal): RoccoLevelTransitionPhase {
    return normalizeAbortReason(signal.reason)?.mode === 'abandon' ? 'idle' : 'active-current';
  }

  private async rollbackPreparedTransition(
    options: RoccoTransitionRollbackOptions,
  ): Promise<Awaited<ReturnType<RoccoTransitionRollbackCoordinator['rollback']>>> {
    this.phase = 'rolling-back';
    return this.rollbackCoordinator.rollback(options);
  }

  private createClearedActiveLevel(): Parameters<
    RoccoLevelTransitionServiceOptions['setActiveLevel']
  >[0] {
    return null;
  }

  private enterFatalState(
    engine: CartridgeSdkV1Runtime,
    presentation: RoccoLevelTransitionPresentation,
    error: Error,
  ): true {
    this.options.setActiveLevel(this.createClearedActiveLevel());
    this.phase = 'fatal';
    this.busy = true;
    this.fatalTransitionState = {
      presentation,
    };
    presentation.fail(error);
    engine.log('System', `Fatal level transition error: ${error.message}`);
    return true;
  }

  private clearFatalTransitionState(): void {
    this.fatalTransitionState?.presentation.dispose();
    this.fatalTransitionState = undefined;
    if (this.phase === 'fatal') {
      this.phase = 'idle';
    }
    if (!this.activeRun) {
      this.busy = false;
    }
  }

  private logTransitionFailure(
    engine: CartridgeSdkV1Runtime,
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
          options.startedRun.presentation,
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
        presentation: startedRun.presentation,
        progressState,
      });
      this.completeSuccessfulRun(startedRun.presentation);
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

  invalidateActiveTransition(): void {
    this.abortActiveRun({
      kind: 'invalidated',
      mode: 'abandon',
    });
    this.clearFatalTransitionState();
  }
}
