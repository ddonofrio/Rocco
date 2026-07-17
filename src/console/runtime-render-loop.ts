import type { Ticker } from 'pixi.js';

import type { RoccoCartridge } from './cartridges';
import type { RoccoDefaultEffectManager } from './effects';
import type { RoccoRuntimeVideoSystem } from './video';

export interface RuntimeRenderLoopOptions {
  isReady: () => boolean;
  effects: Pick<RoccoDefaultEffectManager, 'tick'>;
  video: Pick<RoccoRuntimeVideoSystem, 'update' | 'render'>;
  getActiveCartridge: () => RoccoCartridge | null | undefined;
}

export class RuntimeRenderLoop {
  private effectElapsedMs = 0;
  private readonly options: RuntimeRenderLoopOptions;

  readonly tick = (ticker: Ticker): void => {
    if (!this.options.isReady()) {
      return;
    }

    this.effectElapsedMs += ticker.deltaMS;
    this.options.effects.tick({
      deltaMs: ticker.deltaMS,
      deltaSeconds: ticker.deltaMS / 1000,
      elapsedMs: this.effectElapsedMs,
      elapsedSeconds: this.effectElapsedMs / 1000,
    });

    this.options.video.update(ticker.deltaMS);
    this.options.getActiveCartridge()?.update?.(ticker.deltaMS);
    this.options.video.render(ticker.deltaTime);
  };

  constructor(options: RuntimeRenderLoopOptions) {
    this.options = options;
  }
}
