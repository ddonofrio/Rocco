import type { Container } from 'pixi.js';

import { PixiRoccoActionMenuRenderer, RoccoActionMenuSystemSDK } from './action-menu';
import {
  defaultDisplayProfile,
  resolveRoccoDisplayProfile,
  type RoccoDisplayProfile,
} from './display';
import { PixiRoccoGridMenuRenderer, RoccoGridMenuSystemSDK } from './grid-menu';
import { PixiRoccoSpriteMessageRenderer, RoccoSpriteMessageSystemSDK } from './messages';
import {
  PixiRoccoPlaneRenderer,
  RoccoGraphicPlaneSDK,
  type RoccoGraphicPlane,
  type RoccoImageSource,
  type RoccoPlaneDepthMode,
  type RoccoPlaneScene,
  type RoccoProceduralGenerator,
} from './planes';
import { PixiRoccoPrimitiveRenderer, RoccoPrimitiveSystemSDK } from './primitives';
import { defaultRoccoRenderLayers, sortRoccoRenderLayers, type RoccoRenderLayer } from './render-layers';
import { RoccoSceneTargetSystemSDK } from './scene-targets';
import {
  PixiRoccoSpriteRenderer,
  RoccoSpriteSystemSDK,
  type RoccoRenderableSprite,
  type RoccoSpriteDefinition,
} from './sprites';
import { PixiRoccoTitleRenderer, RoccoTitleSystemSDK } from './titles';
import type { RoccoVideoDisplayModule, RoccoVideoPlaneModule, RoccoVideoSystem, RoccoVideoViewportModule } from './types';
import type { RoccoViewportHost } from './viewport';

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

const DEFAULT_DESIGN_WIDTH = 960;
const DEFAULT_DESIGN_HEIGHT = 540;
const EPSILON = 0.0001;
const DEFAULT_SCENE_TARGET_RENDER_LAYER = 'background.main';

interface PlaneAlphaMask {
  width: number;
  height: number;
  alpha: Uint8ClampedArray;
}

interface RuntimePlaneOccluder {
  plane: RoccoGraphicPlane;
  renderLayerZIndex: number;
  sceneOrder: number;
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

export interface RoccoRuntimeVideoSystemOptions {
  proceduralGenerators?: Record<string, RoccoProceduralGenerator>;
  renderLayers?: RoccoRenderLayer[];
  viewportHost?: RoccoViewportHost;
  onDisplayProfileChange?: (profile: Partial<RoccoDisplayProfile>) => void;
}

export class RoccoRuntimeVideoSystem implements RoccoVideoSystem {
  private readonly planeSDK = new RoccoGraphicPlaneSDK();
  private readonly planeRenderer: PixiRoccoPlaneRenderer;
  private readonly planeAlphaMasks = new Map<string, PlaneAlphaMask>();
  private readonly pendingPlaneAlphaMaskLoads = new Map<string, Promise<void>>();
  private readonly spriteSystem = new RoccoSpriteSystemSDK();
  private readonly sceneTargetSystem = new RoccoSceneTargetSystemSDK();
  private readonly spriteRenderer: PixiRoccoSpriteRenderer;
  private readonly actionMenuSystem = new RoccoActionMenuSystemSDK();
  private readonly actionMenuRenderer: PixiRoccoActionMenuRenderer;
  private readonly gridMenuSystem = new RoccoGridMenuSystemSDK();
  private readonly gridMenuRenderer: PixiRoccoGridMenuRenderer;
  private readonly messageSystem = new RoccoSpriteMessageSystemSDK();
  private readonly messageRenderer: PixiRoccoSpriteMessageRenderer;
  private readonly primitiveSystem = new RoccoPrimitiveSystemSDK();
  private readonly primitiveRenderer: PixiRoccoPrimitiveRenderer;
  private readonly titleSystem = new RoccoTitleSystemSDK();
  private readonly titleRenderer: PixiRoccoTitleRenderer;
  private renderLayers: RoccoRenderLayer[];
  private displayProfile: RoccoDisplayProfile = { ...defaultDisplayProfile };
  private viewportHost: RoccoViewportHost | undefined;

  private stage: Container | null = null;
  private activePlaneSceneId: string | null = null;
  private activePlayerSpriteId: string | null = null;

  readonly planes: RoccoVideoPlaneModule = {
    loadScene: (scene) => {
      this.loadPlaneScene(scene);
    },
    serializeScene: (sceneId) => this.serializePlaneScene(sceneId),
    updatePlane: (sceneId, planeId, patch) => {
      this.updatePlane(sceneId, planeId, patch);
    },
    resolvePlane: (sceneId, planeId) => this.resolvePlane(sceneId, planeId),
  };

  readonly sprites = this.spriteSystem;
  readonly sceneTargets = this.sceneTargetSystem;
  readonly actionMenus = this.actionMenuSystem;
  readonly gridMenus = this.gridMenuSystem;
  readonly messages = this.messageSystem;
  readonly primitives = this.primitiveSystem;
  readonly titles = this.titleSystem;
  readonly display: RoccoVideoDisplayModule = {
    setProfile: (profile) => {
      this.displayProfile = resolveRoccoDisplayProfile({
        ...this.displayProfile,
        ...profile,
      });
      this.onDisplayProfileChange?.(this.displayProfile);
    },
    getProfile: () => clone(this.displayProfile),
  };
  readonly viewport: RoccoVideoViewportModule = {
    setHost: (host) => {
      this.viewportHost = host;
    },
    getHost: () => this.viewportHost,
  };

  private readonly onDisplayProfileChange: ((profile: Partial<RoccoDisplayProfile>) => void) | undefined;

  constructor(options?: RoccoRuntimeVideoSystemOptions) {
    this.renderLayers = sortRoccoRenderLayers(options?.renderLayers ?? defaultRoccoRenderLayers);
    this.viewportHost = options?.viewportHost;
    this.onDisplayProfileChange = options?.onDisplayProfileChange;
    this.planeRenderer = new PixiRoccoPlaneRenderer({
      proceduralGenerators: options?.proceduralGenerators,
      resolveRenderLayerZIndex: (renderLayer) => this.resolveRenderLayerZIndex(renderLayer),
    });
    this.spriteRenderer = new PixiRoccoSpriteRenderer({
      resolveRenderLayerZIndex: (renderLayer) => this.resolveRenderLayerZIndex(renderLayer),
    });
    this.actionMenuRenderer = new PixiRoccoActionMenuRenderer({
      resolveRenderLayerZIndex: (renderLayer) => this.resolveRenderLayerZIndex(renderLayer),
    });
    this.gridMenuRenderer = new PixiRoccoGridMenuRenderer({
      resolveRenderLayerZIndex: (renderLayer) => this.resolveRenderLayerZIndex(renderLayer),
    });
    this.messageRenderer = new PixiRoccoSpriteMessageRenderer({
      resolveRenderLayerZIndex: (renderLayer) => this.resolveRenderLayerZIndex(renderLayer),
    });
    this.primitiveRenderer = new PixiRoccoPrimitiveRenderer({
      resolveRenderLayerZIndex: (renderLayer) => this.resolveRenderLayerZIndex(renderLayer),
    });
    this.titleRenderer = new PixiRoccoTitleRenderer({
      resolveRenderLayerZIndex: (renderLayer) => this.resolveRenderLayerZIndex(renderLayer),
    });
  }

  mount(stage: Container): void {
    if (this.stage === stage) {
      return;
    }

    this.unmount();
    this.stage = stage;
    this.spriteRenderer.mount(stage);
    this.actionMenuRenderer.mount(stage);
    this.gridMenuRenderer.mount(stage);
    this.messageRenderer.mount(stage);
    this.primitiveRenderer.mount(stage);
    this.titleRenderer.mount(stage);
    if (this.activePlaneSceneId) {
      this.planeRenderer.mount(this.activePlaneSceneId, stage);
      this.syncActivePlaneScene();
    }
    this.syncSprites();
    this.syncActionMenu();
    this.syncGridMenu();
    this.syncMessages();
    this.syncPrimitives();
    this.syncTitles();
  }

  unmount(): void {
    if (!this.stage) {
      return;
    }

    if (this.activePlaneSceneId) {
      this.planeRenderer.unmount(this.activePlaneSceneId);
    }
    this.spriteRenderer.unmount();
    this.actionMenuRenderer.unmount();
    this.gridMenuRenderer.unmount();
    this.messageRenderer.unmount();
    this.primitiveRenderer.unmount();
    this.titleRenderer.unmount();
    this.stage = null;
  }

  destroy(): void {
    this.unmount();
    this.planeRenderer.destroy();
    this.spriteRenderer.destroy();
    this.actionMenuRenderer.destroy();
    this.gridMenuRenderer.destroy();
    this.messageRenderer.destroy();
    this.primitiveRenderer.destroy();
    this.titleRenderer.destroy();
    this.sceneTargetSystem.clearTargets();
    this.planeAlphaMasks.clear();
    this.pendingPlaneAlphaMaskLoads.clear();
    this.activePlaneSceneId = null;
  }

  setRenderLayerOrder(layers: RoccoRenderLayer[]): void {
    this.renderLayers = sortRoccoRenderLayers(layers);
    this.syncActivePlaneScene();
    this.syncSprites();
    this.syncActionMenu();
    this.syncGridMenu();
    this.syncMessages();
    this.syncPrimitives();
    this.syncTitles();
  }

  getRenderLayerOrder(): RoccoRenderLayer[] {
    return clone(this.renderLayers);
  }

  loadPlaneScene(scene: RoccoPlaneScene): void {
    this.planeSDK.loadScene(scene);
    this.ensurePlaneSceneMounted(scene.id);
    this.planeRenderer.sync(scene);
    void this.preloadPlaneAlphaMasks(scene);
  }

  async preloadPlaneScene(scene: RoccoPlaneScene): Promise<void> {
    await Promise.all([this.planeRenderer.preloadScene(scene), this.preloadPlaneAlphaMasks(scene)]);
  }

  async preloadSpriteDefinition(definition: RoccoSpriteDefinition): Promise<void> {
    await Promise.all([
      this.spriteSystem.preloadDefinitionAssets(definition),
      this.spriteRenderer.preloadDefinition(definition),
    ]);
  }

  async preloadSpriteDefinitions(definitions: RoccoSpriteDefinition[]): Promise<void> {
    await Promise.all(definitions.map((definition) => this.preloadSpriteDefinition(definition)));
  }

  serializePlaneScene(sceneId: string): RoccoPlaneScene {
    return this.planeSDK.serializeScene(sceneId);
  }

  updatePlane(sceneId: string, planeId: string, patch: Partial<RoccoGraphicPlane>): void {
    this.planeSDK.updatePlane(sceneId, planeId, patch);
    if (this.activePlaneSceneId === sceneId) {
      this.syncActivePlaneScene();
    }
  }

  resolvePlane(sceneId: string, planeId: string): RoccoGraphicPlane | undefined {
    return this.planeSDK.resolvePlane(sceneId, planeId);
  }

  setActivePlayerSprite(instanceId: string | null): void {
    this.activePlayerSpriteId = instanceId;
  }

  resolveSceneTargets(sceneX: number, sceneY: number): RoccoRuntimeResolvedSceneTargets {
    const renderables = this.spriteSystem.listRenderableSprites();
    const spriteSortIndexes = new Map(
      renderables.map((renderable, index) => [renderable.instance.id, index] as const),
    );
    const renderableById = new Map(
      renderables.map((renderable) => [renderable.instance.id, renderable] as const),
    );
    const sceneTargetDefinitions = new Map(
      this.sceneTargetSystem.listTargets().map((target) => [target.instanceId, target] as const),
    );
    const runtimeScene = this.getResolvedActivePlaneScene();
    const runtimePlanesById = new Map(
      runtimeScene?.planes.map((plane) => [plane.id, plane] as const) ?? [],
    );
    const planeOccluders = runtimeScene ? this.listRuntimePlaneOccluders(runtimeScene) : [];

    const visibleCandidates = [
      ...this.spriteSystem.hitTestVisiblePixel(sceneX, sceneY).flatMap((hit) => {
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
      ...this.sceneTargetSystem.hitTestVisible(sceneX, sceneY).map((hit) => {
        const definition = sceneTargetDefinitions.get(hit.instanceId);
        return {
          kind: 'scene-target' as const,
          instanceId: hit.instanceId,
          definitionId: hit.definitionId,
          renderLayer: this.resolveSceneTargetRenderLayer(definition, runtimePlanesById),
          priority: hit.priority,
          text: hit.text,
          textKey: hit.textKey,
        };
      }),
    ];

    visibleCandidates.sort((left, right) => this.compareSceneCandidatesFrontToBack(left, right));
    const visibleTarget = visibleCandidates.find(
      (candidate) =>
        !this.isSceneCandidateOccluded(
          candidate,
          sceneX,
          sceneY,
          planeOccluders,
          renderables,
          spriteSortIndexes,
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
      ...this.spriteSystem.hitTest(sceneX, sceneY).flatMap((hit) => {
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
      ...this.sceneTargetSystem.hitTest(sceneX, sceneY).map((hit) => {
        const definition = sceneTargetDefinitions.get(hit.instanceId);
        return {
          kind: 'scene-target' as const,
          instanceId: hit.instanceId,
          definitionId: hit.definitionId,
          renderLayer: this.resolveSceneTargetRenderLayer(definition, runtimePlanesById),
          priority: hit.priority,
        };
      }),
    ];

    targetCandidates.sort((left, right) => this.compareSceneCandidatesFrontToBack(left, right));
    const target = targetCandidates.find(
      (candidate) =>
        !this.isSceneCandidateOccluded(
          candidate,
          sceneX,
          sceneY,
          planeOccluders,
          renderables,
          spriteSortIndexes,
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

  update(deltaMs: number): void {
    this.spriteSystem.update(deltaMs);
    this.actionMenuSystem.update(deltaMs);
    this.messageSystem.update(deltaMs);
    this.titleSystem.update(deltaMs);
  }

  render(delta: number): void {
    this.syncActivePlaneScene();
    const spriteRenderables = this.spriteSystem.listRenderableSprites();
    this.syncSprites(spriteRenderables);
    this.syncActionMenu();
    this.syncGridMenu();
    this.syncMessages(spriteRenderables);
    this.syncPrimitives();
    this.syncTitles();
    this.planeRenderer.render(delta);
  }

  private ensurePlaneSceneMounted(sceneId: string): void {
    if (!this.stage) {
      this.activePlaneSceneId = sceneId;
      return;
    }

    if (this.activePlaneSceneId === sceneId) {
      return;
    }

    if (this.activePlaneSceneId) {
      this.planeRenderer.unmount(this.activePlaneSceneId);
    }

    this.planeRenderer.mount(sceneId, this.stage);
    this.activePlaneSceneId = sceneId;
  }

  private syncActivePlaneScene(): void {
    const scene = this.getResolvedActivePlaneScene();
    if (!scene) {
      return;
    }

    this.planeRenderer.sync(scene);
  }

  private resolveRuntimePlaneScene(scene: RoccoPlaneScene): RoccoPlaneScene {
    let changed = false;
    const planes = scene.planes.map((plane) => {
      const resolvedRenderLayer = this.resolvePlaneRenderLayer(plane);
      if (resolvedRenderLayer === (plane.renderLayer ?? 'background.main')) {
        return plane;
      }

      changed = true;
      return {
        ...plane,
        renderLayer: resolvedRenderLayer,
      };
    });

    if (!changed) {
      return scene;
    }

    return {
      ...scene,
      planes,
    };
  }

  private resolvePlaneRenderLayer(plane: RoccoGraphicPlane): string {
    const baseRenderLayer = plane.renderLayer ?? 'background.main';
    const depthMode = plane.depthMode;
    if (!depthMode || depthMode === 'fixed') {
      return baseRenderLayer;
    }

    if (depthMode.kind !== 'sprite-y-threshold') {
      return baseRenderLayer;
    }

    const sampleY = this.resolveDepthModeSampleY(depthMode);
    if (sampleY === undefined) {
      return depthMode.backLayer;
    }

    const isFront =
      depthMode.frontWhen === 'less-than-or-equal'
        ? sampleY <= depthMode.thresholdY
        : sampleY >= depthMode.thresholdY;
    return isFront ? depthMode.frontLayer : depthMode.backLayer;
  }

  private resolveDepthModeSampleY(depthMode: RoccoPlaneDepthMode): number | undefined {
    if (!depthMode || depthMode === 'fixed' || depthMode.kind !== 'sprite-y-threshold') {
      return undefined;
    }

    const instanceId =
      depthMode.subject === 'active-player' ? this.activePlayerSpriteId : depthMode.spriteInstanceId;
    if (!instanceId) {
      return undefined;
    }

    const sprite = this.spriteSystem.getSprite(instanceId);
    if (!sprite) {
      return undefined;
    }

    if (depthMode.samplePoint === 'origin-y') {
      return sprite.transform.y;
    }

    const definition = this.spriteSystem.getSpriteDefinition(sprite.definitionId);
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

  private getResolvedActivePlaneScene(): RoccoPlaneScene | undefined {
    if (!this.activePlaneSceneId) {
      return undefined;
    }

    return this.resolveRuntimePlaneScene(this.planeSDK.serializeScene(this.activePlaneSceneId));
  }

  private listRuntimePlaneOccluders(scene: RoccoPlaneScene): RuntimePlaneOccluder[] {
    return scene.planes
      .filter((plane) => plane.enabled && plane.visible && plane.opacity > 0)
      .map((plane, sceneOrder) => ({
        plane,
        renderLayerZIndex: this.resolveRenderLayerZIndex(plane.renderLayer ?? 'background.main'),
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

  private resolveSceneTargetRenderLayer(
    target:
      | {
          renderLayer?: string;
          renderPlaneId?: string;
          metadata?: Record<string, unknown>;
        }
      | undefined,
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

  private compareSceneCandidatesFrontToBack(
    left: RuntimeSceneTargetCandidate,
    right: RuntimeSceneTargetCandidate,
  ): number {
    const leftLayerZIndex = this.resolveRenderLayerZIndex(left.renderLayer);
    const rightLayerZIndex = this.resolveRenderLayerZIndex(right.renderLayer);
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

  private isSceneCandidateOccluded(
    candidate: RuntimeSceneTargetCandidate,
    sceneX: number,
    sceneY: number,
    planeOccluders: RuntimePlaneOccluder[],
    renderables: RoccoRenderableSprite[],
    spriteSortIndexes: ReadonlyMap<string, number>,
  ): boolean {
    return (
      this.hasFrontPlaneOccluder(candidate, sceneX, sceneY, planeOccluders) ||
      this.hasFrontSpriteOccluder(
        candidate,
        sceneX,
        sceneY,
        renderables,
        spriteSortIndexes,
      )
    );
  }

  private hasFrontPlaneOccluder(
    candidate: RuntimeSceneTargetCandidate,
    sceneX: number,
    sceneY: number,
    planeOccluders: RuntimePlaneOccluder[],
  ): boolean {
    for (const occluder of planeOccluders) {
      if (!this.isPlaneInFrontOfCandidate(occluder, candidate)) {
        continue;
      }
      if (this.isPointOnOpaquePlanePixel(occluder.plane, sceneX, sceneY)) {
        return true;
      }
    }

    return false;
  }

  private isPlaneInFrontOfCandidate(
    occluder: RuntimePlaneOccluder,
    candidate: RuntimeSceneTargetCandidate,
  ): boolean {
    const candidateLayerZIndex = this.resolveRenderLayerZIndex(candidate.renderLayer);
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

  private hasFrontSpriteOccluder(
    candidate: RuntimeSceneTargetCandidate,
    sceneX: number,
    sceneY: number,
    renderables: RoccoRenderableSprite[],
    spriteSortIndexes: ReadonlyMap<string, number>,
  ): boolean {
    if (candidate.kind === 'sprite') {
      const candidateIndex = spriteSortIndexes.get(candidate.instanceId);
      if (candidateIndex === undefined) {
        return false;
      }

      for (let index = renderables.length - 1; index > candidateIndex; index -= 1) {
        if (this.spriteSystem.isPointOnVisiblePixel(renderables[index].instance.id, sceneX, sceneY)) {
          return true;
        }
      }
      return false;
    }

    for (let index = renderables.length - 1; index >= 0; index -= 1) {
      const renderable = renderables[index];
      if (!this.isSpriteInFrontOfSceneTargetCandidate(renderable, candidate)) {
        continue;
      }
      if (this.spriteSystem.isPointOnVisiblePixel(renderable.instance.id, sceneX, sceneY)) {
        return true;
      }
    }

    return false;
  }

  private isSpriteInFrontOfSceneTargetCandidate(
    renderable: RoccoRenderableSprite,
    candidate: RuntimeSceneTargetCandidate,
  ): boolean {
    const spriteLayerZIndex = this.resolveRenderLayerZIndex(renderable.instance.renderLayer);
    const candidateLayerZIndex = this.resolveRenderLayerZIndex(candidate.renderLayer);
    return spriteLayerZIndex >= candidateLayerZIndex;
  }

  private isPointOnOpaquePlanePixel(
    plane: RoccoGraphicPlane,
    sceneX: number,
    sceneY: number,
  ): boolean {
    if (!plane.enabled || !plane.visible || plane.opacity <= 0) {
      return false;
    }

    const localPoint = this.resolvePlaneLocalPoint(plane, sceneX, sceneY);
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
        const { width, height } = this.resolvePlaneRenderableSize(plane);
        const samplePoint = this.resolvePlaneSourcePoint(plane, localPoint.x, localPoint.y, width, height);
        return (
          samplePoint.x >= 0 &&
          samplePoint.y >= 0 &&
          samplePoint.x < width &&
          samplePoint.y < height
        );
      }
      case 'image':
        return this.isPointOnOpaqueImagePlanePixel(plane, plane.source, localPoint.x, localPoint.y);
      case 'bitmap':
      case 'tileset':
      default:
        return false;
    }
  }

  private isPointOnOpaqueImagePlanePixel(
    plane: RoccoGraphicPlane,
    source: RoccoImageSource,
    localX: number,
    localY: number,
  ): boolean {
    const mask = this.planeAlphaMasks.get(source.uri);
    const renderWidth = source.width ?? mask?.width ?? DEFAULT_DESIGN_WIDTH;
    const renderHeight = source.height ?? mask?.height ?? DEFAULT_DESIGN_HEIGHT;
    const samplePoint = this.resolvePlaneSourcePoint(plane, localX, localY, renderWidth, renderHeight);
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

  private resolvePlaneLocalPoint(
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

  private resolvePlaneSourcePoint(
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
      ? this.wrapCoordinate(localX + this.wrapCoordinate(rawScrollX, width), width)
      : localX + rawScrollX;
    const sampleY = plane.wrap.y
      ? this.wrapCoordinate(localY + this.wrapCoordinate(rawScrollY, height), height)
      : localY + rawScrollY;

    return { x: sampleX, y: sampleY };
  }

  private resolvePlaneRenderableSize(plane: RoccoGraphicPlane): { width: number; height: number } {
    if (plane.source.kind === 'image') {
      const mask = this.planeAlphaMasks.get(plane.source.uri);
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

  private wrapCoordinate(value: number, size: number): number {
    if (!Number.isFinite(size) || size <= 0) {
      return value;
    }

    return ((value % size) + size) % size;
  }

  private async preloadPlaneAlphaMasks(scene: RoccoPlaneScene): Promise<void> {
    const imageSources = new Map<string, RoccoImageSource>();
    for (const plane of scene.planes) {
      if (plane.source.kind === 'image') {
        imageSources.set(plane.source.uri, plane.source);
      }
    }

    await Promise.all([...imageSources.values()].map((source) => this.queuePlaneAlphaMaskLoad(source)));
  }

  private queuePlaneAlphaMaskLoad(source: RoccoImageSource): Promise<void> {
    const key = source.uri;
    if (this.planeAlphaMasks.has(key)) {
      return Promise.resolve();
    }

    const pending = this.pendingPlaneAlphaMaskLoads.get(key);
    if (pending) {
      return pending;
    }

    const load = this.createPlaneAlphaMask(source)
      .then((mask) => {
        this.planeAlphaMasks.set(key, mask);
      })
      .finally(() => {
        this.pendingPlaneAlphaMaskLoads.delete(key);
      });
    this.pendingPlaneAlphaMaskLoads.set(key, load);
    return load;
  }

  private async createPlaneAlphaMask(source: RoccoImageSource): Promise<PlaneAlphaMask> {
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      return this.createOpaquePlaneAlphaMask(
        source.width ?? DEFAULT_DESIGN_WIDTH,
        source.height ?? DEFAULT_DESIGN_HEIGHT,
      );
    }

    const image = await this.loadPlaneMaskImage(source.uri);
    const width = image.naturalWidth || image.width || source.width || DEFAULT_DESIGN_WIDTH;
    const height = image.naturalHeight || image.height || source.height || DEFAULT_DESIGN_HEIGHT;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
    const context = canvas.getContext('2d');
    if (!context) {
      return this.createOpaquePlaneAlphaMask(width, height);
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

  private createOpaquePlaneAlphaMask(width: number, height: number): PlaneAlphaMask {
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));
    return {
      width: safeWidth,
      height: safeHeight,
      alpha: new Uint8ClampedArray(safeWidth * safeHeight).fill(255),
    };
  }

  private loadPlaneMaskImage(uri: string): Promise<HTMLImageElement> {
    const image = new Image();
    image.src = uri;

    if (typeof image.decode === 'function') {
      return image.decode().then(() => image);
    }

    return new Promise((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load plane image '${uri}'.`));
    });
  }

  private syncSprites(renderables = this.spriteSystem.listRenderableSprites()): void {
    this.spriteRenderer.sync(renderables);
  }

  private syncActionMenu(): void {
    this.actionMenuRenderer.sync(this.actionMenuSystem.getRenderableMenu());
  }

  private syncGridMenu(): void {
    this.gridMenuRenderer.sync(this.gridMenuSystem.getRenderableMenu());
  }

  private syncMessages(renderables = this.spriteSystem.listRenderableSprites()): void {
    this.messageRenderer.sync(
      this.messageSystem.listRenderableMessages(
        renderables,
        this.resolveDesignSize(),
      ),
      renderables,
    );
  }

  private syncPrimitives(): void {
    this.primitiveRenderer.sync(this.primitiveSystem.listPrimitives());
  }

  private syncTitles(): void {
    this.titleRenderer.sync(this.titleSystem.listTitles());
  }

  private resolveRenderLayerZIndex(renderLayer: string): number {
    const layer = this.renderLayers.find((item) => item.id === renderLayer);
    return layer?.zIndex ?? 0;
  }

  private resolveDesignSize(): { width: number; height: number } {
    const metrics = this.viewportHost?.getMetrics();
    return {
      width: metrics?.designWidth ?? 960,
      height: metrics?.designHeight ?? 540,
    };
  }
}
