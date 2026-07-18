import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';
import type { RoccoAssetPreloaderProgress } from '../rocco-asset-preloader';
import type { TransitionComposition, TransitionInputLease } from './rocco-level-transition-run';

export class RoccoLevelTransitionPresentation {
  readonly inputLease: TransitionInputLease;
  readonly composition: TransitionComposition;

  constructor(engine: CartridgeSdkV1Runtime) {
    this.inputLease = engine.acquireInputLease('level-transition', 'blocked');
    this.composition = engine.beginCompositionSession('level-transition', {
      message: 'LOADING 0%',
    });
  }

  report(progress: RoccoAssetPreloaderProgress): void {
    this.composition.report({
      completed: progress.loaded,
      total: progress.total,
      message: `LOADING ${progress.percent}%`,
    });
  }

  complete(finalProgress?: RoccoAssetPreloaderProgress): void {
    const total = finalProgress?.total ?? 0;
    this.composition.report({
      completed: total,
      total,
      message: 'LOADING 100%',
    });
  }

  fail(error: Error): void {
    this.composition.fail(error);
  }

  dispose(): void {
    this.composition.dispose();
    this.inputLease.dispose();
  }
}
