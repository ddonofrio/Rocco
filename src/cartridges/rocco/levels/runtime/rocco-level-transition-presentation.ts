import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';
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

  report(percent: number): void {
    this.composition.report({
      completed: percent,
      total: 100,
      message: `LOADING ${percent}%`,
    });
  }

  complete(): void {
    this.composition.report({ completed: 100, total: 100, message: 'LOADING 100%' });
  }

  fail(error: Error): void {
    this.composition.fail(error);
  }

  dispose(): void {
    this.composition.dispose();
    this.inputLease.dispose();
  }
}
