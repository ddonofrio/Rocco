import type { RoccoGraphicPlane, RoccoPlaneDepthMode, RoccoPlaneScene } from './planes';
import type { RoccoSpriteDefinition, RoccoSpriteInstance } from './sprites';

const DEFAULT_PLANE_RENDER_LAYER = 'background.main';

interface RuntimePlaneDepthResolutionContext {
  activePlayerSpriteId: string | undefined;
  getSprite: (instanceId: string) => RoccoSpriteInstance | undefined;
  getSpriteDefinition: (definitionId: string) => RoccoSpriteDefinition | undefined;
}

export interface ResolveRuntimePlaneSceneOptions extends RuntimePlaneDepthResolutionContext {
  scene: RoccoPlaneScene;
}

export interface ResolvePlaneRenderLayerOptions extends RuntimePlaneDepthResolutionContext {
  plane: RoccoGraphicPlane;
}

export interface ResolveDepthModeSampleYOptions extends RuntimePlaneDepthResolutionContext {
  depthMode: RoccoPlaneDepthMode;
}

export function resolveRuntimePlaneScene(options: ResolveRuntimePlaneSceneOptions): RoccoPlaneScene {
  let isChanged = false;
  const planes = options.scene.planes.map((plane) => {
    const resolvedRenderLayer = resolvePlaneRenderLayer({
      plane,
      activePlayerSpriteId: options.activePlayerSpriteId,
      getSprite: options.getSprite,
      getSpriteDefinition: options.getSpriteDefinition,
    });
    if (resolvedRenderLayer === (plane.renderLayer ?? DEFAULT_PLANE_RENDER_LAYER)) {
      return plane;
    }

    isChanged = true;
    return {
      ...plane,
      renderLayer: resolvedRenderLayer,
    };
  });

  if (!isChanged) {
    return options.scene;
  }

  return {
    ...options.scene,
    planes,
  };
}

export function resolvePlaneRenderLayer(options: ResolvePlaneRenderLayerOptions): string {
  const baseRenderLayer = options.plane.renderLayer ?? DEFAULT_PLANE_RENDER_LAYER;
  const depthMode = options.plane.depthMode;
  if (!depthMode || depthMode === 'fixed') {
    return baseRenderLayer;
  }

  if (depthMode.kind !== 'sprite-y-threshold') {
    return baseRenderLayer;
  }

  const sampleY = resolveDepthModeSampleY({
    depthMode,
    activePlayerSpriteId: options.activePlayerSpriteId,
    getSprite: options.getSprite,
    getSpriteDefinition: options.getSpriteDefinition,
  });
  if (sampleY === undefined) {
    return depthMode.backLayer;
  }

  const isFront =
    depthMode.frontWhen === 'less-than-or-equal'
      ? sampleY <= depthMode.thresholdY
      : sampleY >= depthMode.thresholdY;
  return isFront ? depthMode.frontLayer : depthMode.backLayer;
}

export function resolveDepthModeSampleY(options: ResolveDepthModeSampleYOptions): number | undefined {
  const depthMode = options.depthMode;
  if (!depthMode || depthMode === 'fixed' || depthMode.kind !== 'sprite-y-threshold') {
    return undefined;
  }

  const instanceId =
    depthMode.subject === 'active-player' ? options.activePlayerSpriteId : depthMode.spriteInstanceId;
  if (!instanceId) {
    return undefined;
  }

  const sprite = options.getSprite(instanceId);
  if (!sprite) {
    return undefined;
  }

  if (depthMode.samplePoint === 'origin-y') {
    return sprite.transform.y;
  }

  const definition = options.getSpriteDefinition(sprite.definitionId);
  if (!definition) {
    return sprite.transform.y;
  }

  const groundAnchor = sprite.navigation?.groundAnchor ?? definition.groundAnchor ?? {
    x: 0,
    y: definition.baseline ?? 0,
  };
  const scaleY = sprite.transform.scaleY || 1;
  return sprite.transform.y + groundAnchor.y * scaleY;
}
