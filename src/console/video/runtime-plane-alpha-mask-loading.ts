import type { RoccoImageSource, RoccoPlaneScene } from './planes';
import type { PlaneAlphaMask } from './scene-target-resolution';

const DEFAULT_DESIGN_WIDTH = 960;
const DEFAULT_DESIGN_HEIGHT = 540;

interface PlaneAlphaMaskLoadState {
  planeAlphaMasks: Map<string, PlaneAlphaMask>;
  pendingPlaneAlphaMaskLoads: Map<string, Promise<void>>;
}

export interface PreloadPlaneAlphaMasksOptions extends PlaneAlphaMaskLoadState {
  scene: RoccoPlaneScene;
}

export interface QueuePlaneAlphaMaskLoadOptions extends PlaneAlphaMaskLoadState {
  source: RoccoImageSource;
}

export async function preloadPlaneAlphaMasks(options: PreloadPlaneAlphaMasksOptions): Promise<void> {
  const imageSources = new Map<string, RoccoImageSource>();
  for (const plane of options.scene.planes) {
    if (plane.source.kind === 'image') {
      imageSources.set(plane.source.uri, plane.source);
    }
  }

  const sources = imageSources.values().toArray();
  await Promise.all(
    sources.map((source) =>
      queuePlaneAlphaMaskLoad({
        source,
        planeAlphaMasks: options.planeAlphaMasks,
        pendingPlaneAlphaMaskLoads: options.pendingPlaneAlphaMaskLoads,
      }),
    ),
  );
}

export async function queuePlaneAlphaMaskLoad(options: QueuePlaneAlphaMaskLoadOptions): Promise<void> {
  const key = options.source.uri;
  if (options.planeAlphaMasks.has(key)) {
    return;
  }

  const pending = options.pendingPlaneAlphaMaskLoads.get(key);
  if (pending) {
    return pending;
  }

  const load = (async () => {
    try {
      const mask = await createPlaneAlphaMask(options.source);
      options.planeAlphaMasks.set(key, mask);
    } finally {
      options.pendingPlaneAlphaMaskLoads.delete(key);
    }
  })();
  options.pendingPlaneAlphaMaskLoads.set(key, load);
  return load;
}

export async function createPlaneAlphaMask(source: RoccoImageSource): Promise<PlaneAlphaMask> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return createOpaquePlaneAlphaMask(
      source.width ?? DEFAULT_DESIGN_WIDTH,
      source.height ?? DEFAULT_DESIGN_HEIGHT,
    );
  }

  const image = await loadPlaneMaskImage(source.uri);
  const width = image.naturalWidth || image.width || source.width || DEFAULT_DESIGN_WIDTH;
  const height = image.naturalHeight || image.height || source.height || DEFAULT_DESIGN_HEIGHT;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const context = canvas.getContext('2d');
  if (!context) {
    return createOpaquePlaneAlphaMask(width, height);
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
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

export function createOpaquePlaneAlphaMask(width: number, height: number): PlaneAlphaMask {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  return {
    width: safeWidth,
    height: safeHeight,
    alpha: new Uint8ClampedArray(safeWidth * safeHeight).fill(255),
  };
}

export async function loadPlaneMaskImage(uri: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = uri;

  if (typeof image.decode === 'function') {
    await image.decode();
    return image;
  }

  return new Promise((resolve, reject) => {
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error(`Could not load plane image '${uri}'.`)));
  });
}
