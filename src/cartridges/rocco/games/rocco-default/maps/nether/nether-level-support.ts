import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoGraphicPlane, RoccoPlaneScene } from '../../../../../../console/video/planes';
import {
  createRoccoSpriteWalkMapFromImageData,
  type RoccoPoint,
  type RoccoSpriteWalkMap,
} from '../../../../../../console/video/sprites';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import { ROCCO_PLAYER_CONFIG } from '../../player';
import { ROCCO_DESIGN_WIDTH, ROCCO_DESIGN_HEIGHT, ROCCO_BACKGROUND_COLOR } from '../../game-design';
import { ROCCO_ACTIVE_WALK_MAP_ID } from '../../../../levels/rocco-level-runtime-ids';
const NETHER_WALK_MAP_ALPHA_THRESHOLD = 16;

export interface RoccoNetherSceneDefinition {
  sceneId: string;
  planeIds: {
    backplate: string;
    background: string;
  };
  backgroundUri: string;
  backgroundName: string;
  extraPlanes?: readonly RoccoGraphicPlane[];
}

export interface RoccoNetherWalkMapProfile {
  walkMap: RoccoSpriteWalkMap;
  farY: number;
  nearY: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hasSameJsonShape(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function buildNetherScene(definition: RoccoNetherSceneDefinition): RoccoPlaneScene {
  return {
    id: definition.sceneId,
    clearColor: ROCCO_BACKGROUND_COLOR,
    palettes: [],
    colorRegisterSets: [],
    attributeMaps: [],
    planes: [
      {
        id: definition.planeIds.backplate,
        name: `${definition.backgroundName} Backplate`,
        enabled: true,
        visible: true,
        source: {
          kind: 'solid',
          color: ROCCO_BACKGROUND_COLOR,
        },
        colorModel: { kind: 'native' },
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
        scroll: { x: 0, y: 0 },
        wrap: { x: false, y: false },
        viewport: {
          x: 0,
          y: 0,
          width: ROCCO_DESIGN_WIDTH,
          height: ROCCO_DESIGN_HEIGHT,
        },
        opacity: 1,
        priority: 0,
        renderLayer: 'background.back',
      },
      {
        id: definition.planeIds.background,
        name: definition.backgroundName,
        enabled: true,
        visible: true,
        source: {
          kind: 'image',
          uri: definition.backgroundUri,
          width: ROCCO_DESIGN_WIDTH,
          height: ROCCO_DESIGN_HEIGHT,
        },
        colorModel: { kind: 'native' },
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
        scroll: { x: 0, y: 0 },
        wrap: { x: false, y: false },
        viewport: {
          x: 0,
          y: 0,
          width: ROCCO_DESIGN_WIDTH,
          height: ROCCO_DESIGN_HEIGHT,
        },
        opacity: 1,
        priority: 0,
        renderLayer: 'background.main',
      },
      ...(definition.extraPlanes?.map((plane) => structuredClone(plane)) ?? []),
    ],
  };
}

function normalizeNetherScene(
  definition: RoccoNetherSceneDefinition,
  scene: RoccoPlaneScene,
): { scene: RoccoPlaneScene; changed: boolean } {
  const defaultScene = buildNetherScene(definition);
  const nextScene: RoccoPlaneScene = {
    ...scene,
    id: definition.sceneId,
    clearColor: ROCCO_BACKGROUND_COLOR,
    palettes: scene.palettes ?? [],
    colorRegisterSets: scene.colorRegisterSets ?? [],
    attributeMaps: scene.attributeMaps ?? [],
    planes: defaultScene.planes.map((plane) => structuredClone(plane)),
  };

  if (hasSameJsonShape(scene, nextScene)) {
    return { scene, changed: false };
  }

  return { scene: nextScene, changed: true };
}

export async function loadOrCreateNetherScene(
  engine: CartridgeSdkV1Runtime,
  definition: RoccoNetherSceneDefinition,
): Promise<RoccoPlaneScene> {
  const defaultScene = buildNetherScene(definition);
  const restoredRecord = await engine.storage.loadPlaneSceneRecord(definition.sceneId);
  if (!restoredRecord) {
    await engine.storage.savePlaneScene(defaultScene);
    engine.log('System', `Nether scene '${definition.sceneId}' initialized.`);
    return defaultScene;
  }

  const normalized = normalizeNetherScene(definition, restoredRecord.scene);
  if (normalized.changed) {
    await engine.storage.savePlaneScene(normalized.scene);
    engine.log('System', `Nether scene '${definition.sceneId}' refreshed.`);
  }

  return normalized.scene;
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

export function resolveNetherWalkMapDepthRange(walkMap: RoccoSpriteWalkMap): {
  farY: number;
  nearY: number;
} {
  let farY = Infinity;
  let nearY = -Infinity;

  for (const column of walkMap.columns) {
    for (const span of column.spans) {
      farY = Math.min(farY, span.yMin);
      nearY = Math.max(nearY, span.yMax);
    }
  }

  if (!Number.isFinite(farY) || !Number.isFinite(nearY)) {
    return {
      farY: 0,
      nearY: ROCCO_DESIGN_HEIGHT,
    };
  }

  return { farY, nearY };
}

export async function createNetherWalkMapProfile(
  walkPathUri: string,
  preloader?: RoccoAssetPreloader,
): Promise<RoccoNetherWalkMapProfile> {
  preloader?.addWalkMap();
  const image = await loadImage(walkPathUri);
  const canvas = document.createElement('canvas');
  canvas.width = ROCCO_DESIGN_WIDTH;
  canvas.height = ROCCO_DESIGN_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not read Nether walk path image.');
  }

  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const walkMap = createRoccoSpriteWalkMapFromImageData({
    id: ROCCO_ACTIVE_WALK_MAP_ID,
    width: imageData.width,
    height: imageData.height,
    data: imageData.data,
    alphaThreshold: NETHER_WALK_MAP_ALPHA_THRESHOLD,
  });
  const depthRange = resolveNetherWalkMapDepthRange(walkMap);

  return {
    walkMap,
    farY: depthRange.farY,
    nearY: depthRange.nearY,
  };
}

function resolveNearestWalkMapColumn(
  walkMap: RoccoSpriteWalkMap,
  preferredX: number,
): RoccoSpriteWalkMap['columns'][number] {
  let nearest = walkMap.columns[0];
  let nearestDistance = Infinity;
  const clampedX = clamp(Math.round(preferredX - walkMap.origin.x), 0, walkMap.width - 1);

  for (const column of walkMap.columns) {
    const distance = Math.abs(column.x - clampedX);
    if (distance < nearestDistance) {
      nearest = column;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function resolveNearestWalkMapSpan(
  spans: RoccoSpriteWalkMap['columns'][number]['spans'],
  preferredY: number,
): RoccoSpriteWalkMap['columns'][number]['spans'][number] {
  let nearest = spans[0];
  let nearestDistance = Infinity;

  for (const span of spans) {
    if (preferredY >= span.yMin && preferredY <= span.yMax) {
      return span;
    }

    const distance = Math.min(Math.abs(preferredY - span.yMin), Math.abs(preferredY - span.yMax));
    if (distance < nearestDistance) {
      nearest = span;
      nearestDistance = distance;
    }
  }

  return nearest;
}

export function projectGroundPointToWalkMap(
  walkMap: RoccoSpriteWalkMap,
  point: RoccoPoint,
): RoccoPoint {
  const column = resolveNearestWalkMapColumn(walkMap, point.x);
  const preferredLocalY = point.y - walkMap.origin.y;
  const span = resolveNearestWalkMapSpan(column.spans, preferredLocalY);
  const clampedY = clamp(preferredLocalY, span.yMin, span.yMax);

  return {
    x: walkMap.origin.x + column.x,
    y: walkMap.origin.y + clampedY,
  };
}

export function toOriginFromGroundPoint(groundPoint: RoccoPoint, scale: number): RoccoPoint {
  return {
    x: groundPoint.x - ROCCO_PLAYER_CONFIG.frame.groundAnchor.x * scale,
    y: groundPoint.y - ROCCO_PLAYER_CONFIG.frame.groundAnchor.y * scale,
  };
}

export function projectOriginToWalkMap(
  walkMap: RoccoSpriteWalkMap,
  origin: RoccoPoint,
  scale: number,
): RoccoPoint {
  const groundPoint = {
    x: origin.x + ROCCO_PLAYER_CONFIG.frame.groundAnchor.x * scale,
    y: origin.y + ROCCO_PLAYER_CONFIG.frame.groundAnchor.y * scale,
  };

  return toOriginFromGroundPoint(projectGroundPointToWalkMap(walkMap, groundPoint), scale);
}
