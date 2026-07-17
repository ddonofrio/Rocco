import { Container, Sprite, Texture, TilingSprite } from 'pixi.js';

import {
  prepareWaterColorImageNode,
  resolvePlaneWaterColorEffect,
  type WaterColorPlaneAnimation,
} from './pixi-water-color-animation';
import type { RoccoGraphicPlane, RoccoImageSource } from './types';

type PlaneRenderMode = 'static' | 'tiling' | 'wrapped-grid';

export interface PlaneImageBuild {
  content: Container;
  mode: PlaneRenderMode;
  wrapSpanX: number;
  wrapSpanY: number;
  waterAnimation?: WaterColorPlaneAnimation;
}

interface ImageNodeOptions {
  resolvePlaneSize: (plane: RoccoGraphicPlane) => { width: number; height: number };
  applyImageSourceSize: (sprite: Sprite, source: RoccoImageSource) => void;
}

function createWaterImageNode(
  source: RoccoImageSource,
  container: Container,
  waterEffect: NonNullable<ReturnType<typeof resolvePlaneWaterColorEffect>>,
  applyImageSourceSize: ImageNodeOptions['applyImageSourceSize'],
): PlaneImageBuild {
  container.label = 'image-water-color';
  const original = Sprite.from(source.uri);
  applyImageSourceSize(original, source);
  container.addChild(original);
  const waterAnimation: WaterColorPlaneAnimation = {
    ready: false,
    elapsedMs: 0,
    effect: waterEffect,
    width: source.width ?? 0,
    height: source.height ?? 0,
  };

  void prepareWaterColorImageNode(source, waterEffect).then((prepared) => {
    if (container.destroyed) {
      return;
    }

    waterAnimation.ready = true;
    waterAnimation.width = prepared.width;
    waterAnimation.height = prepared.height;
    waterAnimation.sourceCanvas = prepared.waterSourceCanvas;
    waterAnimation.frameContext = prepared.waterFrameContext;
    waterAnimation.texture = prepared.waterTexture;
    original.removeFromParent();
    container.addChild(prepared.baseSprite);
    container.addChild(prepared.waterSprite);
  });

  return { content: container, mode: 'static', wrapSpanX: 0, wrapSpanY: 0, waterAnimation };
}

function createWrappedImageNode(
  source: RoccoImageSource,
  container: Container,
  size: { width: number; height: number },
): PlaneImageBuild {
  container.label = 'image-wrap';
  const tiling = new TilingSprite({
    texture: Texture.from(source.uri),
    width: size.width,
    height: size.height,
  });
  tiling.label = 'image-wrap';
  container.addChild(tiling);
  return {
    content: container,
    mode: 'tiling',
    wrapSpanX: source.width ?? size.width,
    wrapSpanY: source.height ?? size.height,
  };
}

export function createPixiImageNode(
  plane: RoccoGraphicPlane,
  source: RoccoImageSource,
  options: ImageNodeOptions,
): PlaneImageBuild {
  const size = options.resolvePlaneSize(plane);
  const waterEffect = resolvePlaneWaterColorEffect(plane);
  const container = new Container();

  if (waterEffect && !plane.wrap.x && !plane.wrap.y) {
    return createWaterImageNode(source, container, waterEffect, options.applyImageSourceSize);
  }
  if (plane.wrap.x || plane.wrap.y) {
    return createWrappedImageNode(source, container, size);
  }

  container.label = 'image';
  const sprite = Sprite.from(source.uri);
  options.applyImageSourceSize(sprite, source);
  sprite.label = 'image';
  container.addChild(sprite);
  return { content: container, mode: 'static', wrapSpanX: 0, wrapSpanY: 0 };
}
