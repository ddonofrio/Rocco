import type { RoccoGraphicPlane, RoccoPlaneScene } from './planes';
import type { RoccoPrimitiveSystem } from './primitives';
import type { RoccoRenderLayer } from './render-layers';
import type { RoccoSpriteDefinition, RoccoSpriteSystem } from './sprites';
import type { RoccoActionMenuSystem } from './action-menu';
import type { RoccoGridMenuSystem } from './grid-menu';
import type { RoccoSpriteMessageSystem } from './messages';
import type { RoccoTitleSystem } from './titles';
import type { RoccoDisplayProfile } from './display';
import type { RoccoSceneTargetSystem } from './scene-targets';
import type { RoccoViewportHost } from './viewport';
import type { RoccoVideoZoomModule } from './zoom';

export interface RoccoVideoPlaneModule {
  loadScene(scene: RoccoPlaneScene): void;
  serializeScene(sceneId: string): RoccoPlaneScene;
  updatePlane(sceneId: string, planeId: string, patch: Partial<RoccoGraphicPlane>): void;
  resolvePlane(sceneId: string, planeId: string): RoccoGraphicPlane | undefined;
}

export interface RoccoVideoDisplayModule {
  setProfile(profile: Partial<RoccoDisplayProfile>): void;
  getProfile(): Partial<RoccoDisplayProfile>;
}

export interface RoccoVideoViewportModule {
  setHost(host: RoccoViewportHost | undefined): void;
  getHost(): RoccoViewportHost | undefined;
}

export interface RoccoVideoSystem {
  planes: RoccoVideoPlaneModule;
  sprites: RoccoSpriteSystem;
  sceneTargets?: RoccoSceneTargetSystem;
  actionMenus: RoccoActionMenuSystem;
  gridMenus: RoccoGridMenuSystem;
  messages: RoccoSpriteMessageSystem;
  primitives: RoccoPrimitiveSystem;
  titles: RoccoTitleSystem;
  display: RoccoVideoDisplayModule;
  viewport: RoccoVideoViewportModule;
  zoom: RoccoVideoZoomModule;

  setRenderLayerOrder(layers: RoccoRenderLayer[]): void;
  getRenderLayerOrder(): RoccoRenderLayer[];

  preloadAssetUrls(assetUrls: readonly string[]): Promise<void>;
  preloadPlaneScene(scene: RoccoPlaneScene): Promise<void>;
  preloadSpriteDefinition(definition: RoccoSpriteDefinition): Promise<void>;
  preloadSpriteDefinitions(definitions: RoccoSpriteDefinition[]): Promise<void>;
  update(deltaMs: number): void;
  render(delta: number): void;
}
