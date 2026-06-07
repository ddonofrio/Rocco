import { parseRoccoWaterColor, type RoccoWaterColorRgb } from './rocco-water-color-effect';

export type RoccoColorKeyReplacement =
  | { kind: 'transparent' }
  | { kind: 'color'; color: string };

export interface RoccoColorKeyReplaceImageOptions {
  sourceUri: string;
  colors: string[];
  tolerance?: number;
  replacement: RoccoColorKeyReplacement;
}

export async function makeRoccoColorKeyReplacedImageUri(
  options: RoccoColorKeyReplaceImageOptions,
): Promise<string> {
  if (typeof document === 'undefined' || options.colors.length === 0) {
    return options.sourceUri;
  }

  const colors = parseRoccoColorKeyColors(options.colors);
  if (colors.length === 0) {
    return options.sourceUri;
  }

  const image = await loadRoccoImageElement(options.sourceUri);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return options.sourceUri;
  }

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  replaceRoccoImageDataColors(imageData, {
    colors,
    tolerance: options.tolerance ?? 0.08,
    replacement: options.replacement,
  });
  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

export function parseRoccoColorKeyColors(colors: string[]): RoccoWaterColorRgb[] {
  return colors
    .map(parseRoccoWaterColor)
    .filter((color): color is RoccoWaterColorRgb => Boolean(color));
}

export function matchesRoccoColorKey(
  sample: RoccoWaterColorRgb,
  colors: RoccoWaterColorRgb[],
  tolerance: number,
): boolean {
  return colors.some((color) => roccoColorDistance(sample, color) <= tolerance);
}

export async function loadRoccoImageElement(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error(`Failed to load image '${uri}'.`));
    };
    image.src = uri;
  });
}

function replaceRoccoImageDataColors(
  imageData: ImageData,
  options: {
    colors: RoccoWaterColorRgb[];
    tolerance: number;
    replacement: RoccoColorKeyReplacement;
  },
): void {
  const replacementColor =
    options.replacement.kind === 'color' ? parseRoccoWaterColor(options.replacement.color) : null;
  const data = imageData.data;
  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] ?? 0;
    if (alpha <= 0) {
      continue;
    }

    const sample: RoccoWaterColorRgb = [
      (data[index] ?? 0) / 255,
      (data[index + 1] ?? 0) / 255,
      (data[index + 2] ?? 0) / 255,
    ];
    if (!matchesRoccoColorKey(sample, options.colors, options.tolerance)) {
      continue;
    }

    if (options.replacement.kind === 'transparent') {
      data[index + 3] = 0;
      continue;
    }

    if (replacementColor) {
      data[index] = Math.round(replacementColor[0] * 255);
      data[index + 1] = Math.round(replacementColor[1] * 255);
      data[index + 2] = Math.round(replacementColor[2] * 255);
    }
  }
}

function roccoColorDistance(left: RoccoWaterColorRgb, right: RoccoWaterColorRgb): number {
  const deltaRed = left[0] - right[0];
  const deltaGreen = left[1] - right[1];
  const deltaBlue = left[2] - right[2];
  return Math.sqrt(deltaRed * deltaRed + deltaGreen * deltaGreen + deltaBlue * deltaBlue);
}
