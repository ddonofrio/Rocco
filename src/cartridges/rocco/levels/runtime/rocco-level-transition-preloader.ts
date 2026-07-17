import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';
import type { RoccoPlaneScene } from '../../../../console/video/planes';
import type { RoccoSpriteDefinition } from '../../../../console/video/sprites';
import { RoccoAssetPreloader } from '../rocco-asset-preloader';
import {
  assertTransitionNotAborted,
  normalizeAbortReason,
  RoccoLevelTransitionCancelledError,
} from './rocco-level-transition-run';

export class RoccoLevelTransitionPreloader extends RoccoAssetPreloader {
  private readonly signal: AbortSignal;

  constructor(
    signal: AbortSignal,
    onProgress: (progress: ReturnType<RoccoAssetPreloader['getProgress']>) => void,
  ) {
    super(onProgress);
    this.signal = signal;
  }

  private async runPreload(stage: string, operation: () => Promise<void>): Promise<void> {
    try {
      await operation();
    } catch (error) {
      if (this.signal.aborted) {
        throw new RoccoLevelTransitionCancelledError(
          `Level transition ${stage} was cancelled.`,
          normalizeAbortReason(this.signal.reason),
        );
      }
      throw error;
    }
  }

  override async preloadAssetUrls(
    engine: CartridgeSdkV1Runtime,
    urls: readonly string[],
  ): Promise<void> {
    assertTransitionNotAborted(this.signal, 'Level transition asset url preload was cancelled.');
    await super.preloadAssetUrls(engine, urls);
    assertTransitionNotAborted(this.signal, 'Level transition asset url preload was cancelled.');
  }

  override async preloadPlaneScene(
    engine: CartridgeSdkV1Runtime,
    scene: RoccoPlaneScene,
  ): Promise<void> {
    assertTransitionNotAborted(this.signal, 'Level transition plane scene preload was cancelled.');
    await super.preloadPlaneScene(engine, scene);
    assertTransitionNotAborted(this.signal, 'Level transition plane scene preload was cancelled.');
  }

  override async preloadSpriteDefinition(
    engine: CartridgeSdkV1Runtime,
    definition: RoccoSpriteDefinition,
  ): Promise<void> {
    assertTransitionNotAborted(this.signal, `Sprite preload '${definition.id}' was cancelled.`);
    await super.preloadSpriteDefinition(engine, definition);
    assertTransitionNotAborted(this.signal, `Sprite preload '${definition.id}' was cancelled.`);
  }

  override async preloadSound(engine: CartridgeSdkV1Runtime, id: string): Promise<void> {
    assertTransitionNotAborted(this.signal, `Sound preload '${id}' was cancelled.`);
    await this.runPreload(`sound preload '${id}'`, () =>
      super.preloadSound(engine, id, { signal: this.signal }),
    );
    assertTransitionNotAborted(this.signal, `Sound preload '${id}' was cancelled.`);
  }

  override addWalkMap(): void {
    assertTransitionNotAborted(this.signal, 'Level transition walk map preload was cancelled.');
    super.addWalkMap();
    assertTransitionNotAborted(this.signal, 'Level transition walk map preload was cancelled.');
  }
}
