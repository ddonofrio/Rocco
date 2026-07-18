import type {
  RoccoPoint,
  RoccoRect,
  RoccoSpriteDefinition,
  RoccoSpriteFrame,
  RoccoSpriteImage,
  RoccoSpriteInstance,
  RoccoSpritePresentationTransform,
  RoccoSpriteVisualAdjustment,
} from './types';

const EPSILON = 0.0001;

export interface SpriteAlphaMask {
  width: number;
  height: number;
  alpha: Uint8ClampedArray;
}

export interface SpriteVisibleBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoccoSpriteVisualHelperState {
  alphaMasks: Map<string, SpriteAlphaMask>;
  pendingAlphaMaskLoads: Map<string, Promise<void>>;
  visibleBoundsCache: Map<string, SpriteVisibleBounds | undefined>;
  autoAdjustReferenceHeightCache: Map<string, number | undefined>;
}

export interface RoccoSpriteVisualHelper {
  queueAlphaMaskLoad(image: RoccoSpriteImage, definitionId: string): Promise<void>;
  clearVisualCachesForDefinition(definitionId: string): void;
  resolveAutoAdjustReferenceHeight(definition: RoccoSpriteDefinition): number | undefined;
  resolveFrameVisibleBounds(
    definition: RoccoSpriteDefinition,
    frame: RoccoSpriteFrame,
  ): SpriteVisibleBounds | undefined;
  isPointOnVisibleSpritePixel(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    frame: RoccoSpriteFrame,
    point: RoccoPoint,
    visualAdjustment?: RoccoSpriteVisualAdjustment,
  ): boolean;
}

function resolveFrameVisibleBounds(
  state: RoccoSpriteVisualHelperState,
  definition: RoccoSpriteDefinition,
  frame: RoccoSpriteFrame,
): SpriteVisibleBounds | undefined {
  const image = definition.images.find((item) => item.id === frame.imageId);
  if (!image) {
    return undefined;
  }
  const imageKey = resolveImageSourceKey(image, definition.id);
  const mask = state.alphaMasks.get(imageKey);
  if (!mask) {
    return undefined;
  }
  const frameRect = resolveFrameRect(frame, image, mask);
  const cacheKey = `${definition.id}:${frame.id}:${imageKey}:${frameRect.x}:${frameRect.y}:${frameRect.width}:${frameRect.height}`;
  if (state.visibleBoundsCache.has(cacheKey)) {
    return state.visibleBoundsCache.get(cacheKey) ?? undefined;
  }
  const bounds = calculateVisibleBounds(mask, frameRect);
  state.visibleBoundsCache.set(cacheKey, bounds ?? undefined);
  return bounds;
}

async function queueAlphaMaskLoad(
  state: RoccoSpriteVisualHelperState,
  image: RoccoSpriteImage,
  definitionId: string,
): Promise<void> {
  const key = resolveImageSourceKey(image, definitionId);
  if (state.alphaMasks.has(key)) {
    return;
  }
  const pending = state.pendingAlphaMaskLoads.get(key);
  if (pending) {
    return pending;
  }
  const load = (async () => {
    try {
      state.alphaMasks.set(key, await createAlphaMask(image));
    } finally {
      state.pendingAlphaMaskLoads.delete(key);
    }
  })();
  state.pendingAlphaMaskLoads.set(key, load);
  return load;
}

function clearVisualCachesForDefinition(
  state: RoccoSpriteVisualHelperState,
  definitionId: string,
): void {
  state.autoAdjustReferenceHeightCache.delete(definitionId);
  const prefix = `${definitionId}:`;
  for (const key of state.visibleBoundsCache.keys()) {
    if (key.startsWith(prefix)) {
      state.visibleBoundsCache.delete(key);
    }
  }
}

function resolveAutoAdjustReferenceHeight(
  state: RoccoSpriteVisualHelperState,
  definition: RoccoSpriteDefinition,
): number | undefined {
  if (state.autoAdjustReferenceHeightCache.has(definition.id)) {
    return state.autoAdjustReferenceHeightCache.get(definition.id) ?? undefined;
  }
  let referenceHeight = 0;
  for (const frame of definition.frames) {
    const bounds = resolveFrameVisibleBounds(state, definition, frame);
    if (bounds) {
      referenceHeight = Math.max(referenceHeight, bounds.height);
    }
  }
  const resolved = referenceHeight > 0 ? referenceHeight : undefined;
  state.autoAdjustReferenceHeightCache.set(definition.id, resolved);
  return resolved;
}

function isPointOnVisibleSpritePixel(
  state: RoccoSpriteVisualHelperState,
  instance: RoccoSpriteInstance,
  definition: RoccoSpriteDefinition,
  frame: RoccoSpriteFrame,
  point: RoccoPoint,
  visualAdjustment?: RoccoSpriteVisualAdjustment,
): boolean {
  const image = definition.images.find((item) => item.id === frame.imageId);
  if (!image) {
    return false;
  }
  const mask = state.alphaMasks.get(resolveImageSourceKey(image, definition.id));
  if (!mask) {
    return false;
  }
  const frameRect = resolveFrameRect(frame, image, mask);
  const localPoint = toSpriteLocalPoint(
    instance,
    definition,
    frame,
    frameRect,
    point,
    visualAdjustment,
  );
  if (!localPoint) {
    return false;
  }
  const sourceX = Math.floor(frameRect.x + localPoint.x);
  const sourceY = Math.floor(frameRect.y + localPoint.y);
  if (sourceX < 0 || sourceY < 0 || sourceX >= mask.width || sourceY >= mask.height) {
    return false;
  }
  return (mask.alpha[sourceY * mask.width + sourceX] ?? 0) > 0;
}

export function createRoccoSpriteVisualHelper(
  state: RoccoSpriteVisualHelperState,
): RoccoSpriteVisualHelper {
  return {
    queueAlphaMaskLoad: (image, definitionId) => queueAlphaMaskLoad(state, image, definitionId),
    clearVisualCachesForDefinition: (definitionId) =>
      clearVisualCachesForDefinition(state, definitionId),
    resolveAutoAdjustReferenceHeight: (definition) =>
      resolveAutoAdjustReferenceHeight(state, definition),
    resolveFrameVisibleBounds: (definition, frame) =>
      resolveFrameVisibleBounds(state, definition, frame),
    isPointOnVisibleSpritePixel: (instance, definition, frame, point, visualAdjustment) =>
      isPointOnVisibleSpritePixel(state, instance, definition, frame, point, visualAdjustment),
  };
}

async function createAlphaMask(image: RoccoSpriteImage): Promise<SpriteAlphaMask> {
  if (image.alphaMask) {
    return {
      width: image.alphaMask.width,
      height: image.alphaMask.height,
      alpha: new Uint8ClampedArray(image.alphaMask.alpha),
    };
  }

  if (!image.uri || typeof document === 'undefined' || typeof Image === 'undefined') {
    return createOpaqueAlphaMask(image.width ?? 1, image.height ?? 1);
  }

  const loaded = await loadImage(image.uri);
  const width = loaded.naturalWidth || loaded.width || image.width || 1;
  const height = loaded.naturalHeight || loaded.height || image.height || 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const context = canvas.getContext('2d');
  if (!context) {
    return createOpaqueAlphaMask(width, height);
  }

  context.drawImage(loaded, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const alpha = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let index = 0; index < alpha.length; index += 1) {
    alpha[index] = imageData.data[index * 4 + 3] ?? 0;
  }
  return {
    width: canvas.width,
    height: canvas.height,
    alpha,
  };
}

function createOpaqueAlphaMask(width: number, height: number): SpriteAlphaMask {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  return {
    width: safeWidth,
    height: safeHeight,
    alpha: new Uint8ClampedArray(safeWidth * safeHeight).fill(255),
  };
}

async function loadImage(uri: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = uri;

  if (typeof image.decode === 'function') {
    await image.decode();
    return image;
  }

  return new Promise((resolve, reject) => {
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () =>
      reject(new Error(`Could not load sprite image '${uri}'.`)),
    );
  });
}

function resolveImageSourceKey(image: RoccoSpriteImage, definitionId: string): string {
  if (image.uri) {
    return `uri:${image.uri}`;
  }
  if (image.assetId) {
    return `asset:${image.assetId}`;
  }
  if (image.dataRef) {
    return `data:${image.dataRef}`;
  }
  return `placeholder:${definitionId}:${image.id}`;
}

function calculateVisibleBounds(
  mask: SpriteAlphaMask,
  frameRect: RoccoRect,
): SpriteVisibleBounds | undefined {
  const startX = clamp(Math.floor(frameRect.x), 0, mask.width - 1);
  const startY = clamp(Math.floor(frameRect.y), 0, mask.height - 1);
  const endX = clamp(Math.ceil(frameRect.x + frameRect.width), 0, mask.width);
  const endY = clamp(Math.ceil(frameRect.y + frameRect.height), 0, mask.height);
  const extent = collectVisibleBoundsExtent(mask, startX, startY, endX, endY);
  if (extent.maxX < extent.minX || extent.maxY < extent.minY) {
    return undefined;
  }

  return {
    x: extent.minX - frameRect.x,
    y: extent.minY - frameRect.y,
    width: extent.maxX - extent.minX + 1,
    height: extent.maxY - extent.minY + 1,
  };
}

function collectVisibleBoundsExtent(
  mask: SpriteAlphaMask,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = endX;
  let minY = endY;
  let maxX = startX - 1;
  let maxY = startY - 1;
  for (let y = startY; y < endY; y += 1) {
    const row = scanRowAlphaExtent(mask, startX, endX, y);
    if (row.maxX >= row.minX) {
      minX = Math.min(minX, row.minX);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, row.maxX);
      maxY = Math.max(maxY, y);
    }
  }

  return { minX, minY, maxX, maxY };
}

function scanRowAlphaExtent(
  mask: SpriteAlphaMask,
  startX: number,
  endX: number,
  y: number,
): { minX: number; maxX: number } {
  let minX = endX;
  let maxX = startX - 1;
  for (let x = startX; x < endX; x += 1) {
    if ((mask.alpha[y * mask.width + x] ?? 0) <= 0) {
      continue;
    }

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  }

  return { minX, maxX };
}

function resolveFrameRect(
  frame: RoccoSpriteFrame,
  image: RoccoSpriteImage,
  mask: SpriteAlphaMask,
): RoccoRect {
  return (
    frame.rect ?? {
      x: 0,
      y: 0,
      width: image.width ?? mask.width,
      height: image.height ?? mask.height,
    }
  );
}

function toSpriteLocalPoint(
  instance: RoccoSpriteInstance,
  definition: RoccoSpriteDefinition,
  frame: RoccoSpriteFrame,
  frameRect: RoccoRect,
  point: RoccoPoint,
  visualAdjustment?: RoccoSpriteVisualAdjustment,
): RoccoPoint | undefined {
  const presentationScale = resolvePresentationScale(instance.transform.presentation);
  const scaleX =
    (instance.transform.scaleX || 1) * presentationScale.x * (instance.transform.flipX ? -1 : 1);
  const scaleY =
    (instance.transform.scaleY || 1) * presentationScale.y * (instance.transform.flipY ? -1 : 1);
  if (Math.abs(scaleX) < EPSILON || Math.abs(scaleY) < EPSILON) {
    return undefined;
  }

  const rotation = -(instance.transform.rotation ?? 0);
  const dx = point.x - instance.transform.x;
  const dy = point.y - instance.transform.y;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const localX =
    (dx * cos - dy * sin) / scaleX + (frame.pivot ?? definition.pivot ?? { x: 0, y: 0 }).x;
  const localY =
    (dx * sin + dy * cos) / scaleY + (frame.pivot ?? definition.pivot ?? { x: 0, y: 0 }).y;
  const adjustedScaleX = visualAdjustment?.scaleX ?? 1;
  const adjustedScaleY = visualAdjustment?.scaleY ?? 1;
  if (Math.abs(adjustedScaleX) < EPSILON || Math.abs(adjustedScaleY) < EPSILON) {
    return undefined;
  }

  const adjustedLocalX = (localX - (visualAdjustment?.offsetX ?? 0)) / adjustedScaleX;
  const adjustedLocalY = (localY - (visualAdjustment?.offsetY ?? 0)) / adjustedScaleY;
  const anchor = definition.anchor ?? { x: 0, y: 0 };
  const imageX = adjustedLocalX + anchor.x * frameRect.width;
  const imageY = adjustedLocalY + anchor.y * frameRect.height;

  if (imageX < 0 || imageY < 0 || imageX >= frameRect.width || imageY >= frameRect.height) {
    return undefined;
  }

  return { x: imageX, y: imageY };
}

function resolvePresentationScale(transform?: RoccoSpritePresentationTransform): {
  x: number;
  y: number;
} {
  const yawDegrees = clamp(transform?.yawDegrees ?? 0, -89.9, 89.9);
  const pitchDegrees = clamp(transform?.pitchDegrees ?? 0, -89.9, 89.9);
  return {
    x: Math.max(EPSILON, Math.cos(degreesToRadians(yawDegrees))),
    y: Math.max(EPSILON, Math.cos(degreesToRadians(pitchDegrees))),
  };
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
