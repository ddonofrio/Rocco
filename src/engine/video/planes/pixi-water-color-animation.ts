import { Sprite, Texture } from 'pixi.js';

import {
  loadRoccoImageElement,
  matchesRoccoColorKey,
  resolveRoccoWaterColorEffect,
  type RoccoResolvedWaterColorEffect,
  type RoccoWaterColorRgb,
} from '../post-processing';
import type { RoccoGraphicPlane, RoccoImageSource } from './types';

const WATER_ROW_SLICE_HEIGHT = 2;

export interface WaterColorPlaneAnimation {
  ready: boolean;
  elapsedMs: number;
  effect: RoccoResolvedWaterColorEffect;
  width: number;
  height: number;
  sourceCanvas?: HTMLCanvasElement;
  frameContext?: CanvasRenderingContext2D;
  texture?: Texture;
}

export interface PreparedWaterColorImageNode {
  width: number;
  height: number;
  baseSprite: Sprite;
  waterSprite: Sprite;
  waterSourceCanvas: HTMLCanvasElement;
  waterFrameContext: CanvasRenderingContext2D;
  waterTexture: Texture;
}

export function resolvePlaneWaterColorEffect(
  plane: RoccoGraphicPlane,
): RoccoResolvedWaterColorEffect | null {
  const rawEffect = plane.metadata?.waterColorEffect;
  if (!rawEffect || typeof rawEffect !== 'object') {
    return null;
  }

  const resolved = resolveRoccoWaterColorEffect(rawEffect);
  return resolved.enabled ? resolved : null;
}

export async function prepareWaterColorImageNode(
  source: RoccoImageSource,
  effect: RoccoResolvedWaterColorEffect,
): Promise<PreparedWaterColorImageNode> {
  const image = await loadRoccoImageElement(source.uri);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const baseCanvas = document.createElement('canvas');
  const waterSourceCanvas = document.createElement('canvas');
  const waterFrameCanvas = document.createElement('canvas');
  baseCanvas.width = width;
  baseCanvas.height = height;
  waterSourceCanvas.width = width;
  waterSourceCanvas.height = height;
  waterFrameCanvas.width = width;
  waterFrameCanvas.height = height;

  const baseContext = baseCanvas.getContext('2d', { willReadFrequently: true });
  const waterSourceContext = waterSourceCanvas.getContext('2d', { willReadFrequently: true });
  const waterFrameContext = waterFrameCanvas.getContext('2d');
  if (!baseContext || !waterSourceContext || !waterFrameContext) {
    const fallbackSprite = Sprite.from(source.uri);
    applyImageSourceSize(fallbackSprite, source);
    return {
      width,
      height,
      baseSprite: fallbackSprite,
      waterSprite: new Sprite(Texture.EMPTY),
      waterSourceCanvas,
      waterFrameContext: waterFrameContext ?? document.createElement('canvas').getContext('2d')!,
      waterTexture: Texture.EMPTY,
    };
  }

  baseContext.drawImage(image, 0, 0);
  waterSourceContext.drawImage(image, 0, 0);

  const baseImageData = baseContext.getImageData(0, 0, width, height);
  const waterImageData = waterSourceContext.getImageData(0, 0, width, height);
  splitWaterColorImageData(baseImageData, waterImageData, effect.colors, effect.tolerance);
  baseContext.putImageData(baseImageData, 0, 0);
  waterSourceContext.putImageData(waterImageData, 0, 0);
  waterFrameContext.clearRect(0, 0, width, height);
  waterFrameContext.drawImage(waterSourceCanvas, 0, 0);

  const baseTexture = Texture.from(baseCanvas);
  const waterTexture = Texture.from(waterFrameCanvas);
  const baseSprite = new Sprite(baseTexture);
  const waterSprite = new Sprite(waterTexture);
  applyImageSourceSize(baseSprite, source);
  applyImageSourceSize(waterSprite, source);
  baseSprite.label = 'image-water-color-base';
  waterSprite.label = 'image-water-color-water';

  return {
    width,
    height,
    baseSprite,
    waterSprite,
    waterSourceCanvas,
    waterFrameContext,
    waterTexture,
  };
}

export function updateWaterColorPlaneAnimation(
  animation: WaterColorPlaneAnimation | undefined,
  deltaMs: number,
): void {
  if (!animation?.ready || !animation.sourceCanvas || !animation.frameContext || !animation.texture) {
    return;
  }

  animation.elapsedMs += deltaMs;
  const elapsedSeconds = animation.elapsedMs / 1000;
  const { width, height, sourceCanvas, frameContext, effect } = animation;
  frameContext.clearRect(0, 0, width, height);
  for (let y = 0; y < height; y += WATER_ROW_SLICE_HEIGHT) {
    const sliceHeight = Math.min(WATER_ROW_SLICE_HEIGHT, height - y);
    const wave =
      Math.sin((y / Math.max(1, effect.wavelength)) * Math.PI * 2 + elapsedSeconds * effect.speed) *
      effect.amplitude *
      effect.strength;
    const offsetX = Math.round(wave);
    frameContext.drawImage(sourceCanvas, 0, y, width, sliceHeight, offsetX, y, width, sliceHeight);
    if (offsetX > 0) {
      frameContext.drawImage(sourceCanvas, 0, y, width, sliceHeight, offsetX - width, y, width, sliceHeight);
    } else if (offsetX < 0) {
      frameContext.drawImage(sourceCanvas, 0, y, width, sliceHeight, offsetX + width, y, width, sliceHeight);
    }
  }

  const previousCompositeOperation = frameContext.globalCompositeOperation;
  frameContext.globalCompositeOperation = 'destination-in';
  frameContext.drawImage(sourceCanvas, 0, 0);
  frameContext.globalCompositeOperation = previousCompositeOperation;

  animation.texture.source.update();
}

function splitWaterColorImageData(
  baseImageData: ImageData,
  waterImageData: ImageData,
  colors: RoccoWaterColorRgb[],
  tolerance: number,
): void {
  const base = baseImageData.data;
  const water = waterImageData.data;
  for (let index = 0; index < base.length; index += 4) {
    const alpha = base[index + 3] ?? 0;
    if (alpha <= 0) {
      continue;
    }

    const sample: RoccoWaterColorRgb = [
      (base[index] ?? 0) / 255,
      (base[index + 1] ?? 0) / 255,
      (base[index + 2] ?? 0) / 255,
    ];
    if (matchesRoccoColorKey(sample, colors, tolerance)) {
      base[index + 3] = 0;
    } else {
      water[index + 3] = 0;
    }
  }
}

function applyImageSourceSize(sprite: Sprite, source: RoccoImageSource): void {
  if (source.width) {
    sprite.width = source.width;
  }
  if (source.height) {
    sprite.height = source.height;
  }
}
