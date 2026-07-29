import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import { roccoFinalScreenImageAssets } from './final-screen-assets';
import {
  ROCCO_FINAL_SCREEN_IMAGE_PLANE_PREFIX,
  ROCCO_FINAL_SCREEN_SCENE_ID,
} from './final-screen-scene';

const FINAL_SCREEN_IMAGE_INITIAL_DELAY_MS = 10_000;
const FINAL_SCREEN_IMAGE_WINDOW_MS = 20_000;
const FINAL_SCREEN_IMAGE_FADE_MS = 1000;

export class RoccoFinalScreenImageSequence {
  private engine: CartridgeSdkV1Runtime | undefined;
  private imageElapsedMs = 0;
  private imageSequenceStarted = false;
  private activeImageIndex: number | undefined;
  private finalFadeElapsedMs = 0;
  private finalFadeImageIndex: number | undefined;

  private hideImage(index: number): void {
    if (!this.engine) return;
    const asset = roccoFinalScreenImageAssets[index];
    if (!asset) return;
    this.engine.video.planes.updatePlane(
      ROCCO_FINAL_SCREEN_SCENE_ID,
      `${ROCCO_FINAL_SCREEN_IMAGE_PLANE_PREFIX}${asset.id}`,
      { visible: false, opacity: 0 },
    );
  }

  private syncImageOpacity(): void {
    if (!this.engine || this.activeImageIndex === undefined) return;
    const asset = roccoFinalScreenImageAssets[this.activeImageIndex];
    if (!asset) return;
    const fadeInProgress = Math.min(1, this.imageElapsedMs / FINAL_SCREEN_IMAGE_FADE_MS);
    const fadeOutStart = FINAL_SCREEN_IMAGE_FADE_MS + FINAL_SCREEN_IMAGE_WINDOW_MS;
    const fadeOutProgress =
      this.imageElapsedMs <= fadeOutStart
        ? 0
        : Math.min(1, (this.imageElapsedMs - fadeOutStart) / FINAL_SCREEN_IMAGE_FADE_MS);
    const opacity = Math.max(0, fadeInProgress * (1 - fadeOutProgress));
    this.engine.video.planes.updatePlane(
      ROCCO_FINAL_SCREEN_SCENE_ID,
      `${ROCCO_FINAL_SCREEN_IMAGE_PLANE_PREFIX}${asset.id}`,
      { visible: opacity > 0, opacity },
    );
  }

  private showImage(index: number): void {
    if (
      !this.engine ||
      !Number.isSafeInteger(index) ||
      index < 0 ||
      index >= roccoFinalScreenImageAssets.length
    ) {
      return;
    }
    this.activeImageIndex = index;
    this.imageElapsedMs = 0;
    for (const [assetIndex, asset] of roccoFinalScreenImageAssets.entries()) {
      this.engine.video.planes.updatePlane(
        ROCCO_FINAL_SCREEN_SCENE_ID,
        `${ROCCO_FINAL_SCREEN_IMAGE_PLANE_PREFIX}${asset.id}`,
        { visible: assetIndex === index, opacity: 0 },
      );
    }
    this.syncImageOpacity();
  }

  update(deltaMs: number): void {
    if (!this.engine) return;
    let remainingMs = deltaMs;
    if (!this.imageSequenceStarted) {
      const remainingDelayMs = FINAL_SCREEN_IMAGE_INITIAL_DELAY_MS - this.imageElapsedMs;
      if (remainingMs < remainingDelayMs) {
        this.imageElapsedMs += remainingMs;
        return;
      }
      remainingMs -= remainingDelayMs;
      this.imageSequenceStarted = true;
      this.showImage(0);
    }

    while (remainingMs > 0) {
      const activeImageIndex = this.activeImageIndex;
      if (activeImageIndex === undefined) return;
      const imageDuration =
        FINAL_SCREEN_IMAGE_FADE_MS + FINAL_SCREEN_IMAGE_WINDOW_MS + FINAL_SCREEN_IMAGE_FADE_MS;
      const remainingImageMs = imageDuration - this.imageElapsedMs;
      if (remainingMs < remainingImageMs) {
        this.imageElapsedMs += remainingMs;
        this.syncImageOpacity();
        return;
      }

      remainingMs -= remainingImageMs;
      this.hideImage(activeImageIndex);
      const nextImageIndex = activeImageIndex + 1;
      if (nextImageIndex >= roccoFinalScreenImageAssets.length) {
        this.activeImageIndex = undefined;
        this.imageElapsedMs = 0;
        return;
      }
      this.showImage(nextImageIndex);
    }
  }

  beginFinalFade(): void {
    this.finalFadeElapsedMs = 0;
    this.finalFadeImageIndex = this.activeImageIndex;
    if (this.finalFadeImageIndex === undefined) return;
    const asset = roccoFinalScreenImageAssets[this.finalFadeImageIndex];
    this.engine?.video.planes.updatePlane(
      ROCCO_FINAL_SCREEN_SCENE_ID,
      `${ROCCO_FINAL_SCREEN_IMAGE_PLANE_PREFIX}${asset.id}`,
      { visible: true, opacity: 1 },
    );
  }

  updateFinalFade(deltaMs: number): boolean {
    this.finalFadeElapsedMs += deltaMs;
    const opacity = Math.max(0, 1 - this.finalFadeElapsedMs / FINAL_SCREEN_IMAGE_FADE_MS);
    if (this.finalFadeImageIndex !== undefined) {
      const asset = roccoFinalScreenImageAssets[this.finalFadeImageIndex];
      this.engine?.video.planes.updatePlane(
        ROCCO_FINAL_SCREEN_SCENE_ID,
        `${ROCCO_FINAL_SCREEN_IMAGE_PLANE_PREFIX}${asset.id}`,
        { visible: opacity > 0, opacity },
      );
    }
    return this.finalFadeElapsedMs >= FINAL_SCREEN_IMAGE_FADE_MS;
  }

  mount(engine: CartridgeSdkV1Runtime): void {
    this.engine = engine;
    this.imageElapsedMs = 0;
    this.imageSequenceStarted = false;
    this.activeImageIndex = undefined;
    this.finalFadeElapsedMs = 0;
    this.finalFadeImageIndex = undefined;
  }

  unmount(engine: CartridgeSdkV1Runtime): void {
    for (const asset of roccoFinalScreenImageAssets) {
      if (
        engine.video.planes.resolvePlane(
          ROCCO_FINAL_SCREEN_SCENE_ID,
          `${ROCCO_FINAL_SCREEN_IMAGE_PLANE_PREFIX}${asset.id}`,
        )
      ) {
        engine.video.planes.updatePlane(
          ROCCO_FINAL_SCREEN_SCENE_ID,
          `${ROCCO_FINAL_SCREEN_IMAGE_PLANE_PREFIX}${asset.id}`,
          { visible: false, opacity: 0 },
        );
      }
    }
    this.engine = undefined;
    this.imageElapsedMs = 0;
    this.imageSequenceStarted = false;
    this.activeImageIndex = undefined;
    this.finalFadeElapsedMs = 0;
    this.finalFadeImageIndex = undefined;
  }
}
