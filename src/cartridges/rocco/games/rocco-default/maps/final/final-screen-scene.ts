import type { RoccoGraphicPlane, RoccoPlaneScene } from '../../../../../../console/video/planes';
import { ROCCO_BACKGROUND_COLOR, ROCCO_DESIGN_HEIGHT, ROCCO_DESIGN_WIDTH } from '../../game-design';
import { roccoFinalScreenImageAssets } from './final-screen-assets';

export const ROCCO_FINAL_SCREEN_SCENE_ID = 'rocco-final-screen-scene';
export const ROCCO_FINAL_SCREEN_BACKGROUND_PLANE_ID = 'rocco-final-screen-background';
export const ROCCO_FINAL_SCREEN_IMAGE_PLANE_PREFIX = 'rocco-final-screen-image-';
export const ROCCO_FINAL_SCREEN_IMAGE_SAFE_INSET = 12;
const ROCCO_FINAL_SCREEN_IMAGE_TARGET_SCALE = 0.65;
const ROCCO_FINAL_SCREEN_IMAGE_MAX_HEIGHT = ROCCO_DESIGN_HEIGHT * 0.78;
const ROCCO_FINAL_SCREEN_IMAGE_PLACEMENTS = [
  { x: 0, y: 0.5 },
  { x: 1, y: 0.5 },
  { x: 0.5, y: 0 },
  { x: 0.5, y: 1 },
] as const;

function hashFilename(filename: string, index: number): number {
  let hash = 2_166_136_261 ^ index;
  for (const character of filename) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) / 4_294_967_296;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function resolveRoccoFinalScreenImageLayout(
  filename: string,
  index: number,
  width: number,
  height: number,
): { x: number; y: number; scale: number; displayedWidth: number; displayedHeight: number } {
  const inset = ROCCO_FINAL_SCREEN_IMAGE_SAFE_INSET;
  const isLastImage = index === roccoFinalScreenImageAssets.length - 1;
  const scale = Math.min(
    ROCCO_FINAL_SCREEN_IMAGE_TARGET_SCALE,
    (ROCCO_DESIGN_WIDTH - inset * 2) / width,
    (isLastImage ? ROCCO_DESIGN_HEIGHT - inset * 2 : ROCCO_FINAL_SCREEN_IMAGE_MAX_HEIGHT) / height,
  );
  const displayedWidth = width * scale;
  const displayedHeight = height * scale;
  const xRange = Math.max(0, ROCCO_DESIGN_WIDTH - inset - displayedWidth - inset);
  const yRange = Math.max(0, ROCCO_DESIGN_HEIGHT - inset - displayedHeight - inset);
  if (isLastImage) {
    return {
      x: inset + xRange / 2,
      y: inset + yRange / 2,
      scale,
      displayedWidth,
      displayedHeight,
    };
  }
  const placement =
    ROCCO_FINAL_SCREEN_IMAGE_PLACEMENTS[index % ROCCO_FINAL_SCREEN_IMAGE_PLACEMENTS.length];
  const horizontalJitter = (hashFilename(filename, index) - 0.5) * 0.06;
  const verticalJitter = (hashFilename(filename, index + 97) - 0.5) * 0.06;
  return {
    x: inset + xRange * clamp(placement.x + horizontalJitter, 0, 1),
    y: inset + yRange * clamp(placement.y + verticalJitter, 0, 1),
    scale,
    displayedWidth,
    displayedHeight,
  };
}

function createImagePlane(
  asset: (typeof roccoFinalScreenImageAssets)[number],
  index: number,
): RoccoGraphicPlane {
  const layout = resolveRoccoFinalScreenImageLayout(
    asset.filename,
    index,
    asset.width,
    asset.height,
  );
  return {
    id: `${ROCCO_FINAL_SCREEN_IMAGE_PLANE_PREFIX}${asset.id}`,
    name: `ROCCO Final Screen ${asset.filename}`,
    enabled: true,
    visible: false,
    source: { kind: 'image', uri: asset.uri, width: asset.width, height: asset.height },
    colorModel: { kind: 'native' },
    transform: {
      x: layout.x,
      y: layout.y,
      scaleX: layout.scale,
      scaleY: layout.scale,
      rotation: 0,
    },
    scroll: { x: 0, y: 0 },
    wrap: { x: false, y: false },
    opacity: 1,
    priority: 10 + index,
    renderLayer: 'foreground',
    occludesInput: false,
  };
}

export function createRoccoFinalScreenScene(): RoccoPlaneScene {
  return {
    id: ROCCO_FINAL_SCREEN_SCENE_ID,
    clearColor: ROCCO_BACKGROUND_COLOR,
    palettes: [],
    colorRegisterSets: [],
    attributeMaps: [],
    planes: [
      {
        id: ROCCO_FINAL_SCREEN_BACKGROUND_PLANE_ID,
        name: 'ROCCO Final Screen Background',
        enabled: true,
        visible: true,
        source: { kind: 'solid', color: ROCCO_BACKGROUND_COLOR },
        colorModel: { kind: 'native' },
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
        scroll: { x: 0, y: 0 },
        wrap: { x: false, y: false },
        viewport: { x: 0, y: 0, width: ROCCO_DESIGN_WIDTH, height: ROCCO_DESIGN_HEIGHT },
        opacity: 1,
        priority: 0,
        renderLayer: 'background.back',
      },
      ...roccoFinalScreenImageAssets.map((asset, index) => createImagePlane(asset, index)),
    ],
  };
}
