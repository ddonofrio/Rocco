import type {
  RoccoPoint,
  RoccoSpriteWalkMap,
  RoccoSpriteWalkMapColumn,
  RoccoSpriteWalkMapSpan,
} from './types';

export interface RoccoSpriteWalkMapFromImageDataOptions {
  id: string;
  width: number;
  height: number;
  data: Uint8ClampedArray;
  origin?: RoccoPoint;
  alphaThreshold?: number;
}

export interface RoccoSpriteWalkMapFromImageOptions {
  id: string;
  uri: string;
  origin?: RoccoPoint;
  alphaThreshold?: number;
}

export function createRoccoSpriteWalkMapFromImageData(
  options: RoccoSpriteWalkMapFromImageDataOptions,
): RoccoSpriteWalkMap {
  const alphaThreshold = options.alphaThreshold ?? 1;
  const columns: RoccoSpriteWalkMapColumn[] = [];

  for (let x = 0; x < options.width; x += 1) {
    const spans = collectWalkableSpansForColumn(options.data, options.width, options.height, x, alphaThreshold);
    if (spans.length > 0) {
      columns.push({ x, spans });
    }
  }

  return {
    id: options.id,
    width: options.width,
    height: options.height,
    origin: options.origin ?? { x: 0, y: 0 },
    alphaThreshold,
    columns,
  };
}

export async function loadRoccoSpriteWalkMapFromImage(
  options: RoccoSpriteWalkMapFromImageOptions,
): Promise<RoccoSpriteWalkMap> {
  const image = await loadImage(options.uri);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error(`Could not read walk map image '${options.id}'.`);
  }

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  return createRoccoSpriteWalkMapFromImageData({
    id: options.id,
    width: imageData.width,
    height: imageData.height,
    data: imageData.data,
    origin: options.origin,
    alphaThreshold: options.alphaThreshold,
  });
}

function collectWalkableSpansForColumn(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  alphaThreshold: number,
): RoccoSpriteWalkMapSpan[] {
  const spans: RoccoSpriteWalkMapSpan[] = [];
  let openY: number | undefined;

  for (let y = 0; y < height; y += 1) {
    const alpha = data[(y * width + x) * 4 + 3] ?? 0;
    const isWalkable = alpha >= alphaThreshold;
    if (isWalkable && openY === undefined) {
      openY = y;
    }
    if ((!isWalkable || y === height - 1) && openY !== undefined) {
      const closeY = isWalkable && y === height - 1 ? y : y - 1;
      spans.push({ yMin: openY, yMax: closeY });
      openY = undefined;
    }
  }

  return spans;
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
    image.addEventListener('error', () => reject(new Error(`Could not load image '${uri}'.`)));
  });
}
