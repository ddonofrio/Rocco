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
  | 'active-current';

export interface RoccoLevelTransitionPlan {
  readonly id: string;

  resolveTarget(): RoccoLevel;

  buildMountOptions(): RoccoLevelMountOptions;

  preCommit(engine: RoccoEngine): void;

  onCommitted(engine: RoccoEngine, scene: RoccoPlaneScene): void;

  onRolledBack?(
    engine: RoccoEngine,
    currentLevel: RoccoLevel,
    restoredScene: RoccoPlaneScene | null,
  ): void;
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

    try {
      const mountOptions = plan.buildMountOptions();

      const preloader = new RoccoAssetPreloader((progress) => {
        composition.report({
          completed: progress.percent,
          total: 100,
          message: `LOADING ${progress.percent}%`,
        });
      });

      plan.preCommit(engine);
      const targetLevel = plan.resolveTarget();

      this.phase = 'committing';
      const currentLevel = activeLevel;
      currentLevel.unmount(engine);
      this.options.setActiveLevel(targetLevel);

      try {
        const scene = await targetLevel.mount(engine, mountOptions, preloader);
        if (generation !== this.generation) {
          this.safeUnmount(engine, targetLevel, 'superseded transition');
          this.options.setActiveLevel(currentLevel);
          await this.remountCurrentLevel(engine, currentLevel);
          this.phase = 'active-current';
          return false;
        }

        plan.onCommitted(engine, scene);
        this.phase = 'active';
        composition.report({ completed: 100, total: 100, message: 'LOADING 100%' });
        return true;
      } catch (mountError) {
        engine.log('System', `Level transition '${plan.id}' failed: ${String(mountError)}`);
        this.phase = 'rolling-back';
        this.safeUnmount(engine, targetLevel, 'failed transition target');
        this.options.setActiveLevel(currentLevel);
        const restoredScene = await this.remountCurrentLevel(engine, currentLevel);
        plan.onRolledBack?.(engine, currentLevel, restoredScene);
        this.phase = 'active-current';
        return false;
      }
    } catch (planError) {
      engine.log('System', `Level transition '${plan.id}' validation failed: ${String(planError)}`);
      this.phase = 'idle';
      return false;
    } finally {
      composition.dispose();
      inputLease.dispose();
      this.busy = false;
    }
  }

  invalidateGenerations(): void {
    this.generation += 1;
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
        `Failed to restore previous level after transition failure: ${String(restoreError)}`,
      );
      return null;
    }
  }

  private safeUnmount(engine: RoccoEngine, level: RoccoLevel, reason: string): void {
    try {
      level.unmount(engine);
    } catch (unmountError) {
      engine.log('System', `Error while cleaning up ${reason}: ${String(unmountError)}`);
    }
  }
}
