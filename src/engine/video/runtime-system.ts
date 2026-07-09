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
  type RoccoPlaneScene,
  type RoccoProceduralGenerator,
} from './planes';
import { PixiRoccoPrimitiveRenderer, RoccoPrimitiveSystemSDK } from './primitives';
import { defaultRoccoRenderLayers, sortRoccoRenderLayers, type RoccoRenderLayer } from './render-layers';
import { preloadPlaneAlphaMasks } from './runtime-plane-alpha-mask-loading';
import { resolveRuntimePlaneScene as resolveRuntimePlaneSceneFromSprites } from './runtime-plane-scene-resolution';
import { RoccoSceneTargetSystemSDK } from './scene-targets';
import {
  resolveRuntimeSceneTargets,
  type PlaneAlphaMask,
  type RoccoRuntimeResolvedSceneTargets,
} from './scene-target-resolution';
import {
  PixiRoccoSpriteRenderer,
  RoccoSpriteSystemSDK,
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

export type {
  RoccoRuntimeResolvedSceneTarget,
  RoccoRuntimeResolvedSceneTargets,
  RoccoRuntimeResolvedSceneVisibleTarget,
} from './scene-target-resolution';

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
    void preloadPlaneAlphaMasks({
      scene,
      planeAlphaMasks: this.planeAlphaMasks,
      pendingPlaneAlphaMaskLoads: this.pendingPlaneAlphaMaskLoads,
    });
  }

  async preloadPlaneScene(scene: RoccoPlaneScene): Promise<void> {
    await Promise.all([
      this.planeRenderer.preloadScene(scene),
      preloadPlaneAlphaMasks({
        scene,
        planeAlphaMasks: this.planeAlphaMasks,
        pendingPlaneAlphaMaskLoads: this.pendingPlaneAlphaMaskLoads,
      }),
    ]);
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
    const runtimeScene = this.getResolvedActivePlaneScene();
    const renderables = this.spriteSystem.listRenderableSprites();

    return resolveRuntimeSceneTargets({
      sceneX,
      sceneY,
      renderables,
      spriteHits: this.spriteSystem.hitTest(sceneX, sceneY),
      spriteVisibleHits: this.spriteSystem.hitTestVisiblePixel(sceneX, sceneY),
      sceneTargetHits: this.sceneTargetSystem.hitTest(sceneX, sceneY),
      sceneTargetVisibleHits: this.sceneTargetSystem.hitTestVisible(sceneX, sceneY),
      sceneTargetDefinitions: new Map(
        this.sceneTargetSystem.listTargets().map((target) => [target.instanceId, target] as const),
      ),
      runtimeScene,
      planeAlphaMasks: this.planeAlphaMasks,
      resolveRenderLayerZIndex: (renderLayer) => this.resolveRenderLayerZIndex(renderLayer),
      isPointOnVisibleSpritePixel: (instanceId, x, y) =>
        this.spriteSystem.isPointOnVisiblePixel(instanceId, x, y),
    });
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
    const messageAnchorRenderables = this.spriteSystem.listRenderableSprites({
      includeTransparent: true,
    });
    this.syncSprites(spriteRenderables);
    this.syncActionMenu();
    this.syncGridMenu();
    this.syncMessages(spriteRenderables, messageAnchorRenderables);
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
    return resolveRuntimePlaneSceneFromSprites({
      scene,
      activePlayerSpriteId: this.activePlayerSpriteId,
      getSprite: (instanceId) => this.spriteSystem.getSprite(instanceId),
      getSpriteDefinition: (definitionId) => this.spriteSystem.getSpriteDefinition(definitionId),
    });
  }

  private getResolvedActivePlaneScene(): RoccoPlaneScene | undefined {
    if (!this.activePlaneSceneId) {
      return undefined;
    }

    return this.resolveRuntimePlaneScene(this.planeSDK.serializeScene(this.activePlaneSceneId));
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

  private syncMessages(
    spriteRenderables = this.spriteSystem.listRenderableSprites(),
    messageAnchorRenderables = this.spriteSystem.listRenderableSprites({
      includeTransparent: true,
    }),
  ): void {
    this.messageRenderer.sync(
      this.messageSystem.listRenderableMessages(
        messageAnchorRenderables,
        this.resolveDesignSize(),
      ),
      spriteRenderables,
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
      width: metrics?.designWidth ?? DEFAULT_DESIGN_WIDTH,
      height: metrics?.designHeight ?? DEFAULT_DESIGN_HEIGHT,
    };
  }
}
