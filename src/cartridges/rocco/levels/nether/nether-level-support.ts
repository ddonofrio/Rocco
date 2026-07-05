import type { RoccoEngine } from '../../../../engine/engine-sdk';
import type { RoccoGraphicPlane, RoccoPlaneScene } from '../../../../engine/video/planes';
import {
  createRoccoSpriteWalkMapFromImageData,
  type RoccoPoint,
  type RoccoSpriteWalkMap,
} from '../../../../engine/video/sprites';
import {
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_ROCCO_GREEN_BLACK,
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_WALK_MAP_ALPHA_THRESHOLD,
  DEFAULT_WALK_MAP_ID,
} from '../../rocco-default-constants';

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
    clearColor: DEFAULT_ROCCO_GREEN_BLACK,
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
          color: DEFAULT_ROCCO_GREEN_BLACK,
        },
        colorModel: { kind: 'native' },
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
        scroll: { x: 0, y: 0 },
        wrap: { x: false, y: false },
        viewport: {
          x: 0,
          y: 0,
          width: DEFAULT_DESIGN_WIDTH,
          height: DEFAULT_DESIGN_HEIGHT,
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
          width: DEFAULT_DESIGN_WIDTH,
          height: DEFAULT_DESIGN_HEIGHT,
        },
        colorModel: { kind: 'native' },
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
        scroll: { x: 0, y: 0 },
        wrap: { x: false, y: false },
        viewport: {
          x: 0,
          y: 0,
          width: DEFAULT_DESIGN_WIDTH,
          height: DEFAULT_DESIGN_HEIGHT,
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
    clearColor: DEFAULT_ROCCO_GREEN_BLACK,
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
  engine: RoccoEngine,
  definition: RoccoNetherSceneDefinition,
): Promise<RoccoPlaneScene> {
  const defaultScene = buildNetherScene(definition);
  const restoredRecord = await engine.persistence.loadPlaneSceneRecord(definition.sceneId);
  if (!restoredRecord) {
    await engine.persistence.savePlaneScene(defaultScene);
    engine.log('System', `Nether scene '${definition.sceneId}' initialized.`);
    return defaultScene;
  }

  const normalized = normalizeNetherScene(definition, restoredRecord.scene);
  if (normalized.changed) {
    await engine.persistence.savePlaneScene(normalized.scene);
    engine.log('System', `Nether scene '${definition.sceneId}' refreshed.`);
  }

  return normalized.scene;
}

function loadImage(uri: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = uri;

  if (typeof image.decode === 'function') {
    return image.decode().then(() => image);
  }

  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image '${uri}'.`));
  });
}

export function resolveNetherWalkMapDepthRange(walkMap: RoccoSpriteWalkMap): {
  farY: number;
  nearY: number;
} {
  let farY = Number.POSITIVE_INFINITY;
  let nearY = Number.NEGATIVE_INFINITY;

  for (const column of walkMap.columns) {
    for (const span of column.spans) {
      farY = Math.min(farY, span.yMin);
      nearY = Math.max(nearY, span.yMax);
    }
  }

  if (!Number.isFinite(farY) || !Number.isFinite(nearY)) {
    return {
      farY: 0,
      nearY: DEFAULT_DESIGN_HEIGHT,
    };
  }

  return { farY, nearY };
}

export async function createNetherWalkMapProfile(
  walkPathUri: string,
): Promise<RoccoNetherWalkMapProfile> {
  const image = await loadImage(walkPathUri);
  const canvas = document.createElement('canvas');
  canvas.width = DEFAULT_DESIGN_WIDTH;
  canvas.height = DEFAULT_DESIGN_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not read Nether walk path image.');
  }

  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const walkMap = createRoccoSpriteWalkMapFromImageData({
    id: DEFAULT_WALK_MAP_ID,
    width: imageData.width,
    height: imageData.height,
    data: imageData.data,
    alphaThreshold: DEFAULT_WALK_MAP_ALPHA_THRESHOLD,
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
  let nearestDistance = Number.POSITIVE_INFINITY;
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
  let nearestDistance = Number.POSITIVE_INFINITY;

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
    x: groundPoint.x - DEFAULT_SPRITE_GROUND_ANCHOR_X * scale,
    y: groundPoint.y - DEFAULT_SPRITE_GROUND_ANCHOR_Y * scale,
  };
}

export function projectOriginToWalkMap(
  walkMap: RoccoSpriteWalkMap,
  origin: RoccoPoint,
  scale: number,
): RoccoPoint {
  const groundPoint = {
    x: origin.x + DEFAULT_SPRITE_GROUND_ANCHOR_X * scale,
    y: origin.y + DEFAULT_SPRITE_GROUND_ANCHOR_Y * scale,
  };

  return toOriginFromGroundPoint(projectGroundPointToWalkMap(walkMap, groundPoint), scale);
}
