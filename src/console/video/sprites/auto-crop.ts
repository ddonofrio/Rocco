import type {
  RoccoCollisionShape,
  RoccoPoint,
  RoccoRect,
  RoccoSpriteFrame,
  RoccoSpriteImage,
} from './types';

export type RoccoSpriteAutoCropMode = 'image-list' | 'sheet-components';
export type RoccoSpriteAutoCropSortMode = 'input' | 'row-major';
export type RoccoSpriteAutoCropHitboxMode = 'rect' | 'none';

export type RoccoSpriteAutoCropPivot =
  | { mode: 'center' }
  | { mode: 'bottom-center' }
  | { mode: 'relative'; x: number; y: number }
  | { mode: 'absolute'; x: number; y: number };

export interface RoccoSpriteAutoCropImageSource {
  id: string;
  uri: string;
  width?: number;
  height?: number;
}

export interface RoccoSpriteAutoCropOptions {
  mode: RoccoSpriteAutoCropMode;
  sources: readonly RoccoSpriteAutoCropImageSource[];
  frameIdPrefix: string;
  durationMs: number;
  alphaThreshold?: number;
  padding?: number;
  minOpaquePixels?: number;
  pivot?: RoccoSpriteAutoCropPivot;
  hitbox?: RoccoSpriteAutoCropHitboxMode;
  sort?: RoccoSpriteAutoCropSortMode;
  rowToleranceFactor?: number;
}

export interface RoccoSpriteAutoCropResult {
  images: RoccoSpriteImage[];
  frames: RoccoSpriteFrame[];
  frameIds: string[];
}

interface LoadedAutoCropImage {
  source: RoccoSpriteAutoCropImageSource;
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

interface ComponentRect extends RoccoRect {
  opaquePixels: number;
}

interface RowGroup {
  centerY: number;
  rects: ComponentRect[];
}

const DEFAULT_ALPHA_THRESHOLD = 1;
const DEFAULT_PADDING = 0;
const DEFAULT_MIN_OPAQUE_PIXELS = 1;
const DEFAULT_ROW_TOLERANCE_FACTOR = 0.6;

export async function createRoccoSpriteAutoCroppedFrames(
  options: RoccoSpriteAutoCropOptions,
): Promise<RoccoSpriteAutoCropResult> {
  const images: RoccoSpriteImage[] = [];
  const frames: RoccoSpriteFrame[] = [];
  const frameIds: string[] = [];
  let frameIndex = 0;

  for (const source of options.sources) {
    const loaded = await loadAutoCropImage(source);
    images.push({
      id: source.id,
      uri: source.uri,
      width: loaded.width,
      height: loaded.height,
    });

    const rects =
      options.mode === 'sheet-components'
        ? findComponentRects(loaded, options)
        : [findVisibleRect(loaded, options) ?? fullImageRect(loaded)];
    const sortedRects = sortRects(rects, options);

    for (const rect of sortedRects) {
      const frameId = `${options.frameIdPrefix}-${frameIndex + 1}`;
      frameIds.push(frameId);
      frames.push({
        id: frameId,
        imageId: source.id,
        rect,
        durationMs: options.durationMs,
        pivot: resolvePivot(rect, options.pivot),
        hitbox: resolveHitbox(rect, options.hitbox),
      });
      frameIndex += 1;
    }
  }

  return { images, frames, frameIds };
}

async function loadAutoCropImage(source: RoccoSpriteAutoCropImageSource): Promise<LoadedAutoCropImage> {
  if (typeof document === 'undefined') {
    throw new Error('Sprite auto-crop requires a DOM canvas environment.');
  }

  const image = await loadImage(source.uri);
  const width = Math.max(1, Math.floor(source.width ?? image.naturalWidth ?? image.width));
  const height = Math.max(1, Math.floor(source.height ?? image.naturalHeight ?? image.height));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Sprite auto-crop could not create a 2D canvas context.');
  }

  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  return {
    source,
    width,
    height,
    data: imageData.data,
  };
}

async function loadImage(uri: string): Promise<HTMLImageElement> {
  const image = new Image();
  const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error(`Could not load sprite auto-crop image '${uri}'.`)));
  });

  image.src = uri;
  if (typeof image.decode === 'function') {
    try {
      await image.decode();
      return image;
    } catch {
      return loaded;
    }
  }

  return loaded;
}

function findVisibleRect(
  image: LoadedAutoCropImage,
  options: RoccoSpriteAutoCropOptions,
): ComponentRect | undefined {
  const threshold = resolveAlphaThreshold(options);
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  let opaquePixels = 0;

  const total = image.width * image.height;
  for (let index = 0; index < total; index += 1) {
    const x = index % image.width;
    const y = Math.floor(index / image.width);
    if (!isOpaque(image, x, y, threshold)) {
      continue;
    }

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    opaquePixels += 1;
  }

  if (maxX < minX || maxY < minY) {
    return undefined;
  }

  return padRect(
    {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      opaquePixels,
    },
    image,
    options,
  );
}

function findComponentRects(
  image: LoadedAutoCropImage,
  options: RoccoSpriteAutoCropOptions,
): ComponentRect[] {
  const threshold = resolveAlphaThreshold(options);
  const minOpaquePixels = Math.max(1, Math.floor(options.minOpaquePixels ?? DEFAULT_MIN_OPAQUE_PIXELS));
  const visited = new Uint8Array(image.width * image.height);
  const rects: ComponentRect[] = [];

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const index = y * image.width + x;
      if (visited[index] !== 0 || !isOpaque(image, x, y, threshold)) {
        visited[index] = 1;
      } else {
        const component = floodFillComponent(image, x, y, visited, threshold);
        if (component.opaquePixels >= minOpaquePixels) {
          rects.push(padRect(component, image, options));
        }
      }
    }
  }

  return rects.length > 0 ? rects : [fullImageRect(image)];
}

function floodFillComponent(
  image: LoadedAutoCropImage,
  startX: number,
  startY: number,
  visited: Uint8Array,
  threshold: number,
): ComponentRect {
  const stack = [startY * image.width + startX];
  visited[startY * image.width + startX] = 1;
  let minX = startX;
  let minY = startY;
  let maxX = startX;
  let maxY = startY;
  let opaquePixels = 0;

  while (stack.length > 0) {
    const index = stack.pop() as number;
    const x = index % image.width;
    const y = Math.floor(index / image.width);
    opaquePixels += 1;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);

    visitNeighbor(image, x - 1, y, visited, threshold, stack);
    visitNeighbor(image, x + 1, y, visited, threshold, stack);
    visitNeighbor(image, x, y - 1, visited, threshold, stack);
    visitNeighbor(image, x, y + 1, visited, threshold, stack);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    opaquePixels,
  };
}

function visitNeighbor(
  image: LoadedAutoCropImage,
  x: number,
  y: number,
  visited: Uint8Array,
  threshold: number,
  stack: number[],
): void {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
    return;
  }

  const index = y * image.width + x;
  if (visited[index] !== 0) {
    return;
  }

  visited[index] = 1;
  if (isOpaque(image, x, y, threshold)) {
    stack.push(index);
  }
}

function sortRects(rects: ComponentRect[], options: RoccoSpriteAutoCropOptions): ComponentRect[] {
  const sortMode = options.sort ?? (options.mode === 'sheet-components' ? 'row-major' : 'input');
  if (sortMode !== 'row-major') {
    return rects;
  }

  const rowTolerance = resolveRowTolerance(rects, options);
  const sortedRects = [...rects].toSorted((left, right) => centerY(left) - centerY(right));
  const rows: RowGroup[] = [];
  for (const rect of sortedRects) {
    const row = rows.find((candidate) => Math.abs(candidate.centerY - centerY(rect)) <= rowTolerance);
    if (!row) {
      rows.push({
        centerY: centerY(rect),
        rects: [rect],
      });
      continue;
    }

    row.rects.push(rect);
    row.centerY = row.rects.reduce((sum, item) => sum + centerY(item), 0) / row.rects.length;
  }

  return rows
    .toSorted((left, right) => left.centerY - right.centerY)
    .flatMap((row) => row.rects.toSorted((left, right) => left.x - right.x));
}

function resolveRowTolerance(rects: ComponentRect[], options: RoccoSpriteAutoCropOptions): number {
  if (rects.length === 0) {
    return 0;
  }

  const heights = rects.map((rect) => rect.height).toSorted((left, right) => left - right);
  const medianHeight = heights[Math.floor(heights.length / 2)] ?? 0;
  return medianHeight * (options.rowToleranceFactor ?? DEFAULT_ROW_TOLERANCE_FACTOR);
}

function padRect(
  rect: ComponentRect,
  image: LoadedAutoCropImage,
  options: RoccoSpriteAutoCropOptions,
): ComponentRect {
  const padding = Math.max(0, Math.floor(options.padding ?? DEFAULT_PADDING));
  const x = Math.max(0, rect.x - padding);
  const y = Math.max(0, rect.y - padding);
  const right = Math.min(image.width, rect.x + rect.width + padding);
  const bottom = Math.min(image.height, rect.y + rect.height + padding);
  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
    opaquePixels: rect.opaquePixels,
  };
}

function fullImageRect(image: LoadedAutoCropImage): ComponentRect {
  return {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
    opaquePixels: image.width * image.height,
  };
}

function resolvePivot(rect: RoccoRect, pivot: RoccoSpriteAutoCropPivot | undefined): RoccoPoint {
  const resolved = pivot ?? { mode: 'center' };
  if (resolved.mode === 'bottom-center') {
    return {
      x: rect.width / 2,
      y: rect.height,
    };
  }

  if (resolved.mode === 'relative') {
    return {
      x: rect.width * resolved.x,
      y: rect.height * resolved.y,
    };
  }

  if (resolved.mode === 'absolute') {
    return {
      x: resolved.x,
      y: resolved.y,
    };
  }

  return {
    x: rect.width / 2,
    y: rect.height / 2,
  };
}

function resolveHitbox(
  rect: RoccoRect,
  hitbox: RoccoSpriteAutoCropHitboxMode | undefined,
): RoccoCollisionShape | undefined {
  if (hitbox === 'none') {
    return undefined;
  }

  return {
    kind: 'rect',
    x: 0,
    y: 0,
    width: rect.width,
    height: rect.height,
  };
}

function isOpaque(
  image: LoadedAutoCropImage,
  x: number,
  y: number,
  threshold: number,
): boolean {
  return (image.data[(y * image.width + x) * 4 + 3] ?? 0) >= threshold;
}

function resolveAlphaThreshold(options: RoccoSpriteAutoCropOptions): number {
  return Math.min(255, Math.max(0, Math.floor(options.alphaThreshold ?? DEFAULT_ALPHA_THRESHOLD)));
}

function centerY(rect: RoccoRect): number {
  return rect.y + rect.height / 2;
}
