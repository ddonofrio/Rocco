import type { RoccoGraphicPlane, RoccoImageSource, RoccoPlaneScene } from './planes';
import type { RoccoSceneTargetDefinition, RoccoSceneTargetHit, RoccoSceneTargetVisibleHit } from './scene-targets';
import type { RoccoRenderableSprite, RoccoSpriteHit, RoccoSpriteVisiblePixelHit } from './sprites';

const DEFAULT_DESIGN_WIDTH = 960;
const DEFAULT_DESIGN_HEIGHT = 540;
const EPSILON = 0.0001;
const DEFAULT_SCENE_TARGET_RENDER_LAYER = 'background.main';

export interface PlaneAlphaMask {
  width: number;
  height: number;
  alpha: Uint8ClampedArray;
}

type RuntimeSceneTargetKind = 'sprite' | 'scene-target';

export interface RoccoRuntimeResolvedSceneTarget {
  kind: RuntimeSceneTargetKind;
  instanceId: string;
  definitionId: string;
}

export interface RoccoRuntimeResolvedSceneVisibleTarget extends RoccoRuntimeResolvedSceneTarget {
  text: string;
  textKey?: string;
}

export interface RoccoRuntimeResolvedSceneTargets {
  visibleTarget: RoccoRuntimeResolvedSceneVisibleTarget | undefined;
  target: RoccoRuntimeResolvedSceneTarget | undefined;
}

interface RuntimeSceneTargetCandidate extends RoccoRuntimeResolvedSceneTarget {
  renderLayer: string;
  priority: number;
  spriteSortIndex?: number;
  text?: string;
  textKey?: string;
}

interface RuntimePlaneOccluder {
  plane: RoccoGraphicPlane;
  renderLayerZIndex: number;
  sceneOrder: number;
}

export interface ResolveRuntimeSceneTargetsOptions {
  sceneX: number;
  sceneY: number;
  renderables: readonly RoccoRenderableSprite[];
  spriteHits: readonly RoccoSpriteHit[];
  spriteVisibleHits: readonly RoccoSpriteVisiblePixelHit[];
  sceneTargetHits: readonly RoccoSceneTargetHit[];
  sceneTargetVisibleHits: readonly RoccoSceneTargetVisibleHit[];
  sceneTargetDefinitions: ReadonlyMap<string, RoccoSceneTargetDefinition>;
  runtimeScene?: RoccoPlaneScene;
  planeAlphaMasks: ReadonlyMap<string, PlaneAlphaMask>;
  resolveRenderLayerZIndex: (renderLayer: string) => number;
  isPointOnVisibleSpritePixel: (instanceId: string, sceneX: number, sceneY: number) => boolean;
}

export function resolveRuntimeSceneTargets(
  options: ResolveRuntimeSceneTargetsOptions,
): RoccoRuntimeResolvedSceneTargets {
  const renderableById = new Map(
    options.renderables.map((renderable) => [renderable.instance.id, renderable] as const),
  );
  const spriteSortIndexes = new Map(
    options.renderables.map((renderable, index) => [renderable.instance.id, index] as const),
  );
  const runtimePlanesById = new Map(
    options.runtimeScene?.planes.map((plane) => [plane.id, plane] as const),
  );
  const planeOccluders = options.runtimeScene
    ? listRuntimePlaneOccluders(options.runtimeScene, options.resolveRenderLayerZIndex)
    : [];

  const visibleCandidates = [
    ...options.spriteVisibleHits.flatMap((hit) => {
      const renderable = renderableById.get(hit.instanceId);
      const spriteSortIndex = spriteSortIndexes.get(hit.instanceId);
      if (!renderable || spriteSortIndex === undefined) {
        return [];
      }

      return [
        {
          kind: 'sprite' as const,
          instanceId: hit.instanceId,
          definitionId: hit.definitionId,
          renderLayer: renderable.instance.renderLayer,
          priority: renderable.instance.zIndex,
          spriteSortIndex,
          text: hit.text,
          textKey: hit.textKey,
        },
      ];
    }),
    ...options.sceneTargetVisibleHits.map((hit) => {
      const definition = options.sceneTargetDefinitions.get(hit.instanceId);
      return {
        kind: 'scene-target' as const,
        instanceId: hit.instanceId,
        definitionId: hit.definitionId,
        renderLayer: resolveSceneTargetRenderLayer(definition, runtimePlanesById),
        priority: hit.priority,
        text: hit.text,
        textKey: hit.textKey,
      };
    }),
  ];

  visibleCandidates.sort((left, right) =>
    compareSceneCandidatesFrontToBack(left, right, options.resolveRenderLayerZIndex),
  );
  const visibleTarget = visibleCandidates.find(
    (candidate) =>
      !isSceneCandidateOccluded(
        candidate,
        options.sceneX,
        options.sceneY,
        planeOccluders,
        options.renderables,
        spriteSortIndexes,
        options.resolveRenderLayerZIndex,
        options.isPointOnVisibleSpritePixel,
        options.planeAlphaMasks,
      ),
  );
  if (visibleTarget?.text) {
    return {
      visibleTarget: {
        kind: visibleTarget.kind,
        instanceId: visibleTarget.instanceId,
        definitionId: visibleTarget.definitionId,
        text: visibleTarget.text,
        textKey: visibleTarget.textKey,
      },
      target: undefined,
    };
  }

  const targetCandidates = [
    ...options.spriteHits.flatMap((hit) => {
      const renderable = renderableById.get(hit.instanceId);
      const spriteSortIndex = spriteSortIndexes.get(hit.instanceId);
      if (!renderable || spriteSortIndex === undefined) {
        return [];
      }

      return [
        {
          kind: 'sprite' as const,
          instanceId: hit.instanceId,
          definitionId: hit.definitionId,
          renderLayer: renderable.instance.renderLayer,
          priority: renderable.instance.zIndex,
          spriteSortIndex,
        },
      ];
    }),
    ...options.sceneTargetHits.map((hit) => {
      const definition = options.sceneTargetDefinitions.get(hit.instanceId);
      return {
        kind: 'scene-target' as const,
        instanceId: hit.instanceId,
        definitionId: hit.definitionId,
        renderLayer: resolveSceneTargetRenderLayer(definition, runtimePlanesById),
        priority: hit.priority,
      };
    }),
  ];

  targetCandidates.sort((left, right) =>
    compareSceneCandidatesFrontToBack(left, right, options.resolveRenderLayerZIndex),
  );
  const target = targetCandidates.find(
    (candidate) =>
      !isSceneCandidateOccluded(
        candidate,
        options.sceneX,
        options.sceneY,
        planeOccluders,
        options.renderables,
        spriteSortIndexes,
        options.resolveRenderLayerZIndex,
        options.isPointOnVisibleSpritePixel,
        options.planeAlphaMasks,
      ),
  );

  return {
    visibleTarget: undefined,
    target: target
      ? {
          kind: target.kind,
          instanceId: target.instanceId,
          definitionId: target.definitionId,
        }
      : undefined,
  };
}

function listRuntimePlaneOccluders(
  scene: RoccoPlaneScene,
  resolveRenderLayerZIndex: (renderLayer: string) => number,
): RuntimePlaneOccluder[] {
  return scene.planes
    .filter(
      (plane) =>
        plane.enabled &&
        plane.visible &&
        plane.opacity > 0 &&
        plane.occludesInput !== false,
    )
    .map((plane, sceneOrder) => ({
      plane,
      renderLayerZIndex: resolveRenderLayerZIndex(plane.renderLayer ?? 'background.main'),
      sceneOrder,
    }))
    .sort((left, right) => {
      if (left.renderLayerZIndex !== right.renderLayerZIndex) {
        return right.renderLayerZIndex - left.renderLayerZIndex;
      }
      if (left.plane.priority !== right.plane.priority) {
        return right.plane.priority - left.plane.priority;
      }
      return right.sceneOrder - left.sceneOrder;
    });
}

function resolveSceneTargetRenderLayer(
  target: RoccoSceneTargetDefinition | undefined,
  runtimePlanesById: ReadonlyMap<string, RoccoGraphicPlane>,
): string {
  const explicitRenderLayer = target?.renderLayer;
  if (typeof explicitRenderLayer === 'string' && explicitRenderLayer.trim().length > 0) {
    return explicitRenderLayer;
  }

  const renderPlaneId = target?.renderPlaneId;
  if (typeof renderPlaneId === 'string' && renderPlaneId.trim().length > 0) {
    const sourcePlane = runtimePlanesById.get(renderPlaneId);
    const planeRenderLayer = sourcePlane?.renderLayer;
    if (typeof planeRenderLayer === 'string' && planeRenderLayer.trim().length > 0) {
      return planeRenderLayer;
    }
  }

  const metadataRenderLayer = target?.metadata?.renderLayer;
  if (typeof metadataRenderLayer === 'string' && metadataRenderLayer.trim().length > 0) {
    return metadataRenderLayer;
  }

  return DEFAULT_SCENE_TARGET_RENDER_LAYER;
}

function compareSceneCandidatesFrontToBack(
  left: RuntimeSceneTargetCandidate,
  right: RuntimeSceneTargetCandidate,
  resolveRenderLayerZIndex: (renderLayer: string) => number,
): number {
  const leftLayerZIndex = resolveRenderLayerZIndex(left.renderLayer);
  const rightLayerZIndex = resolveRenderLayerZIndex(right.renderLayer);
  if (leftLayerZIndex !== rightLayerZIndex) {
    return rightLayerZIndex - leftLayerZIndex;
  }

  if (left.kind === 'sprite' && right.kind === 'sprite') {
    return (right.spriteSortIndex ?? -1) - (left.spriteSortIndex ?? -1);
  }
  if (left.kind === 'sprite') {
    return -1;
  }
  if (right.kind === 'sprite') {
    return 1;
  }

  if (left.priority !== right.priority) {
    return right.priority - left.priority;
  }

  return left.instanceId.localeCompare(right.instanceId);
}

function isSceneCandidateOccluded(
  candidate: RuntimeSceneTargetCandidate,
  sceneX: number,
  sceneY: number,
  planeOccluders: readonly RuntimePlaneOccluder[],
  renderables: readonly RoccoRenderableSprite[],
  spriteSortIndexes: ReadonlyMap<string, number>,
  resolveRenderLayerZIndex: (renderLayer: string) => number,
  isPointOnVisibleSpritePixel: (instanceId: string, sceneX: number, sceneY: number) => boolean,
  planeAlphaMasks: ReadonlyMap<string, PlaneAlphaMask>,
): boolean {
  return (
    hasFrontPlaneOccluder(
      candidate,
      sceneX,
      sceneY,
      planeOccluders,
      resolveRenderLayerZIndex,
      planeAlphaMasks,
    ) ||
    hasFrontSpriteOccluder(
      candidate,
      sceneX,
      sceneY,
      renderables,
      spriteSortIndexes,
      resolveRenderLayerZIndex,
      isPointOnVisibleSpritePixel,
    )
  );
}

function hasFrontPlaneOccluder(
  candidate: RuntimeSceneTargetCandidate,
  sceneX: number,
  sceneY: number,
  planeOccluders: readonly RuntimePlaneOccluder[],
  resolveRenderLayerZIndex: (renderLayer: string) => number,
  planeAlphaMasks: ReadonlyMap<string, PlaneAlphaMask>,
): boolean {
  for (const occluder of planeOccluders) {
    if (!isPlaneInFrontOfCandidate(occluder, candidate, resolveRenderLayerZIndex)) {
      continue;
    }
    if (isPointOnOpaquePlanePixel(occluder.plane, sceneX, sceneY, planeAlphaMasks)) {
      return true;
    }
  }

  return false;
}

function isPlaneInFrontOfCandidate(
  occluder: RuntimePlaneOccluder,
  candidate: RuntimeSceneTargetCandidate,
  resolveRenderLayerZIndex: (renderLayer: string) => number,
): boolean {
  const candidateLayerZIndex = resolveRenderLayerZIndex(candidate.renderLayer);
  if (occluder.renderLayerZIndex > candidateLayerZIndex) {
    return true;
  }
  if (occluder.renderLayerZIndex < candidateLayerZIndex) {
    return false;
  }

  if (candidate.kind === 'sprite') {
    return true;
  }

  return occluder.plane.priority > candidate.priority;
}

function hasFrontSpriteOccluder(
  candidate: RuntimeSceneTargetCandidate,
  sceneX: number,
  sceneY: number,
  renderables: readonly RoccoRenderableSprite[],
  spriteSortIndexes: ReadonlyMap<string, number>,
  resolveRenderLayerZIndex: (renderLayer: string) => number,
  isPointOnVisibleSpritePixel: (instanceId: string, sceneX: number, sceneY: number) => boolean,
): boolean {
  if (candidate.kind === 'sprite') {
    const candidateIndex = spriteSortIndexes.get(candidate.instanceId);
    if (candidateIndex === undefined) {
      return false;
    }

    for (let index = renderables.length - 1; index > candidateIndex; index -= 1) {
      if (isPointOnVisibleSpritePixel(renderables[index].instance.id, sceneX, sceneY)) {
        return true;
      }
    }
    return false;
  }

  for (let index = renderables.length - 1; index >= 0; index -= 1) {
    const renderable = renderables[index];
    if (!isSpriteInFrontOfSceneTargetCandidate(renderable, candidate, resolveRenderLayerZIndex)) {
      continue;
    }
    if (isPointOnVisibleSpritePixel(renderable.instance.id, sceneX, sceneY)) {
      return true;
    }
  }

  return false;
}

function isSpriteInFrontOfSceneTargetCandidate(
  renderable: RoccoRenderableSprite,
  candidate: RuntimeSceneTargetCandidate,
  resolveRenderLayerZIndex: (renderLayer: string) => number,
): boolean {
  const spriteLayerZIndex = resolveRenderLayerZIndex(renderable.instance.renderLayer);
  const candidateLayerZIndex = resolveRenderLayerZIndex(candidate.renderLayer);
  return spriteLayerZIndex >= candidateLayerZIndex;
}

function isPointOnOpaquePlanePixel(
  plane: RoccoGraphicPlane,
  sceneX: number,
  sceneY: number,
  planeAlphaMasks: ReadonlyMap<string, PlaneAlphaMask>,
): boolean {
  if (!plane.enabled || !plane.visible || plane.opacity <= 0) {
    return false;
  }

  const localPoint = resolvePlaneLocalPoint(plane, sceneX, sceneY);
  if (!localPoint) {
    return false;
  }

  if (
    plane.viewport &&
    (localPoint.x < plane.viewport.x ||
      localPoint.y < plane.viewport.y ||
      localPoint.x >= plane.viewport.x + plane.viewport.width ||
      localPoint.y >= plane.viewport.y + plane.viewport.height)
  ) {
    return false;
  }

  switch (plane.source.kind) {
    case 'solid':
    case 'tilemap':
    case 'procedural': {
      const { width, height } = resolvePlaneRenderableSize(plane, planeAlphaMasks);
      const samplePoint = resolvePlaneSourcePoint(plane, localPoint.x, localPoint.y, width, height);
      return (
        samplePoint.x >= 0 &&
        samplePoint.y >= 0 &&
        samplePoint.x < width &&
        samplePoint.y < height
      );
    }
    case 'image': {
      return isPointOnOpaqueImagePlanePixel(
        plane,
        plane.source,
        localPoint.x,
        localPoint.y,
        planeAlphaMasks,
      );
    }
    case 'bitmap':
    case 'tileset':
    default: {
      return false;
    }
  }
}

function isPointOnOpaqueImagePlanePixel(
  plane: RoccoGraphicPlane,
  source: RoccoImageSource,
  localX: number,
  localY: number,
  planeAlphaMasks: ReadonlyMap<string, PlaneAlphaMask>,
): boolean {
  const mask = planeAlphaMasks.get(source.uri);
  const renderWidth = source.width ?? mask?.width ?? DEFAULT_DESIGN_WIDTH;
  const renderHeight = source.height ?? mask?.height ?? DEFAULT_DESIGN_HEIGHT;
  const samplePoint = resolvePlaneSourcePoint(plane, localX, localY, renderWidth, renderHeight);
  if (
    samplePoint.x < 0 ||
    samplePoint.y < 0 ||
    samplePoint.x >= renderWidth ||
    samplePoint.y >= renderHeight
  ) {
    return false;
  }

  if (!mask) {
    return true;
  }

  const sourceX = Math.min(
    mask.width - 1,
    Math.max(0, Math.floor((samplePoint.x / Math.max(renderWidth, 1)) * mask.width)),
  );
  const sourceY = Math.min(
    mask.height - 1,
    Math.max(0, Math.floor((samplePoint.y / Math.max(renderHeight, 1)) * mask.height)),
  );
  return (mask.alpha[sourceY * mask.width + sourceX] ?? 0) > 0;
}

function resolvePlaneLocalPoint(
  plane: RoccoGraphicPlane,
  sceneX: number,
  sceneY: number,
): { x: number; y: number } | undefined {
  const scaleX = plane.transform.scaleX || 1;
  const scaleY = plane.transform.scaleY || 1;
  if (Math.abs(scaleX) < EPSILON || Math.abs(scaleY) < EPSILON) {
    return undefined;
  }

  const rotation = -(plane.transform.rotation ?? 0);
  const dx = sceneX - plane.transform.x;
  const dy = sceneY - plane.transform.y;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  return {
    x: (dx * cos - dy * sin) / scaleX,
    y: (dx * sin + dy * cos) / scaleY,
  };
}

function resolvePlaneSourcePoint(
  plane: RoccoGraphicPlane,
  localX: number,
  localY: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const parallaxX = plane.parallax?.x ?? 1;
  const parallaxY = plane.parallax?.y ?? 1;
  const rawScrollX = plane.scroll.x * parallaxX;
  const rawScrollY = plane.scroll.y * parallaxY;

  const sampleX = plane.wrap.x
    ? wrapCoordinate(localX + wrapCoordinate(rawScrollX, width), width)
    : localX + rawScrollX;
  const sampleY = plane.wrap.y
    ? wrapCoordinate(localY + wrapCoordinate(rawScrollY, height), height)
    : localY + rawScrollY;

  return { x: sampleX, y: sampleY };
}

function resolvePlaneRenderableSize(
  plane: RoccoGraphicPlane,
  planeAlphaMasks: ReadonlyMap<string, PlaneAlphaMask>,
): { width: number; height: number } {
  if (plane.source.kind === 'image') {
    const mask = planeAlphaMasks.get(plane.source.uri);
    return {
      width: plane.source.width ?? mask?.width ?? DEFAULT_DESIGN_WIDTH,
      height: plane.source.height ?? mask?.height ?? DEFAULT_DESIGN_HEIGHT,
    };
  }

  if (plane.source.kind === 'tilemap') {
    return {
      width: plane.source.width * plane.source.tileWidth,
      height: plane.source.height * plane.source.tileHeight,
    };
  }

  if (plane.source.kind === 'procedural') {
    const width = Number(plane.source.params?.width ?? DEFAULT_DESIGN_WIDTH);
    const height = Number(plane.source.params?.height ?? DEFAULT_DESIGN_HEIGHT);
    return {
      width: Number.isFinite(width) && width > 0 ? width : DEFAULT_DESIGN_WIDTH,
      height: Number.isFinite(height) && height > 0 ? height : DEFAULT_DESIGN_HEIGHT,
    };
  }

  return {
    width: plane.viewport?.width ?? DEFAULT_DESIGN_WIDTH,
    height: plane.viewport?.height ?? DEFAULT_DESIGN_HEIGHT,
  };
}

function wrapCoordinate(value: number, size: number): number {
  if (!Number.isFinite(size) || size <= 0) {
    return value;
  }

  return ((value % size) + size) % size;
}
