import { defaultRoccoRenderLayers } from '../render-layers';
import type { RoccoSpriteDefinition, RoccoSpriteFrame, RoccoSpriteInstance } from './types';

const EPSILON = 0.0001;
const DEFAULT_RENDER_LAYER_ORDER = new Map(
  defaultRoccoRenderLayers.map((layer, index) => [layer.id, index]),
);

export interface RoccoRenderableDepthTarget {
  instance: RoccoSpriteInstance;
  definition: RoccoSpriteDefinition;
  frame: RoccoSpriteFrame;
}

function compareRenderLayers(left: string, right: string): number {
  const leftOrder = DEFAULT_RENDER_LAYER_ORDER.get(left);
  const rightOrder = DEFAULT_RENDER_LAYER_ORDER.get(right);

  if (leftOrder !== undefined && rightOrder !== undefined && leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }
  if (leftOrder !== undefined && rightOrder === undefined) {
    return -1;
  }
  if (leftOrder === undefined && rightOrder !== undefined) {
    return 1;
  }

  return left.localeCompare(right);
}

function resolveBaselineDepth(
  instance: RoccoSpriteInstance,
  definition: RoccoSpriteDefinition,
  frame: RoccoSpriteFrame,
): number {
  const pivot = frame.pivot ?? definition.pivot ?? { x: 0, y: 0 };
  const anchor = instance.navigation?.groundAnchor ?? definition.groundAnchor;
  const scaleY = instance.transform.scaleY || 1;

  if (anchor) {
    return instance.transform.y + (anchor.y - pivot.y) * scaleY;
  }

  if (Number.isFinite(definition.baseline)) {
    return instance.transform.y + ((definition.baseline ?? 0) - pivot.y) * scaleY;
  }

  return instance.transform.y;
}

function resolveDepth(
  instance: RoccoSpriteInstance,
  definition: RoccoSpriteDefinition,
  frame: RoccoSpriteFrame,
): number {
  const mode = instance.depthMode ?? 'fixed';
  if (mode === 'manual') {
    return instance.depth ?? instance.zIndex;
  }
  if (mode === 'y-sort') {
    return instance.transform.y;
  }
  if (mode === 'baseline-sort') {
    return resolveBaselineDepth(instance, definition, frame);
  }
  return instance.zIndex;
}

export function compareRenderableSpritesBackToFront(
  left: RoccoRenderableDepthTarget,
  right: RoccoRenderableDepthTarget,
): number {
  const layerCompare = compareRenderLayers(left.instance.renderLayer, right.instance.renderLayer);
  if (layerCompare !== 0) {
    return layerCompare;
  }

  const depthLeft = resolveDepth(left.instance, left.definition, left.frame);
  const depthRight = resolveDepth(right.instance, right.definition, right.frame);
  if (depthLeft !== depthRight) {
    return depthLeft - depthRight;
  }

  if (left.instance.zIndex !== right.instance.zIndex) {
    return left.instance.zIndex - right.instance.zIndex;
  }

  return left.instance.id.localeCompare(right.instance.id);
}

export function isRenderableSpriteAbove(
  target: RoccoRenderableDepthTarget,
  subject: RoccoRenderableDepthTarget,
): boolean {
  const targetLayerOrder = DEFAULT_RENDER_LAYER_ORDER.get(target.instance.renderLayer);
  const subjectLayerOrder = DEFAULT_RENDER_LAYER_ORDER.get(subject.instance.renderLayer);
  if (
    targetLayerOrder !== undefined &&
    subjectLayerOrder !== undefined &&
    targetLayerOrder !== subjectLayerOrder
  ) {
    return targetLayerOrder > subjectLayerOrder;
  }

  const targetDepth = resolveDepth(target.instance, target.definition, target.frame);
  const subjectDepth = resolveDepth(subject.instance, subject.definition, subject.frame);
  if (Math.abs(targetDepth - subjectDepth) > EPSILON) {
    return targetDepth > subjectDepth;
  }

  return target.instance.zIndex > subject.instance.zIndex;
}
