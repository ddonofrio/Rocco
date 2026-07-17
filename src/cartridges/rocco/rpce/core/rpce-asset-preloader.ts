import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';
import type { RoccoPlaneScene } from '../../../../console/video/planes';
import type { RoccoSpriteDefinition } from '../../../../console/video/sprites';
import type { RoccoAudioPreloadOptions } from '../../../../console/audio/types';

export interface RpceAssetPreloaderProgress {
  loaded: number;
  total: number;
  percent: number;
}

export type RpceAssetPreloaderProgressCallback = (progress: RpceAssetPreloaderProgress) => void;

export class RpceAssetPreloader {
  private loaded = 0;
  private total = 0;
  private readonly onProgress: RpceAssetPreloaderProgressCallback;

  constructor(onProgress: RpceAssetPreloaderProgressCallback = () => {}) {
    this.onProgress = onProgress;
  }

  private increment(count: number): void {
    this.loaded += count;
    this.report();
  }

  private report(): void {
    this.onProgress(this.getProgress());
  }

  add(count: number): void {
    this.total += count;
    this.report();
  }

  async preloadAssetUrls(engine: CartridgeSdkV1Runtime, urls: readonly string[]): Promise<void> {
    this.add(urls.length);
    await engine.video.preloadAssetUrls(urls);
    this.increment(urls.length);
  }

  async preloadPlaneScene(engine: CartridgeSdkV1Runtime, scene: RoccoPlaneScene): Promise<void> {
    const imageCount = scene.planes.filter((plane) => plane.source.kind === 'image').length;
    this.add(Math.max(1, imageCount));
    await engine.video.preloadPlaneScene(scene);
    this.increment(Math.max(1, imageCount));
  }

  async preloadSpriteDefinition(
    engine: CartridgeSdkV1Runtime,
    definition: RoccoSpriteDefinition,
  ): Promise<void> {
    const imageCount = definition.images?.length ?? 1;
    this.add(Math.max(1, imageCount));
    await engine.video.preloadSpriteDefinition(definition);
    this.increment(Math.max(1, imageCount));
  }

  async preloadSound(
    engine: CartridgeSdkV1Runtime,
    id: string,
    options?: RoccoAudioPreloadOptions,
  ): Promise<void> {
    this.add(1);
    await engine.audio.preloadSound(id, options);
    this.increment(1);
  }

  addWalkMap(): void {
    this.add(1);
    this.increment(1);
  }

  getProgress(): RpceAssetPreloaderProgress {
    const percent = this.total === 0 ? 100 : Math.round((this.loaded / this.total) * 100);
    return {
      loaded: this.loaded,
      total: this.total,
      percent: Math.min(100, percent),
    };
  }
}
