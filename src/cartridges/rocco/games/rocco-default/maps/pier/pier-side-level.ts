import type { RoccoEngine } from '../../../../../../console/engine-sdk';
import type { RoccoSceneClickAction } from '../../../../../../console/cartridges';
import type { RoccoActionMenuActivation } from '../../../../../../console/video/action-menu';
import type { RoccoGridMenuActivation } from '../../../../../../console/video/grid-menu';
import type { RoccoPlaneScene } from '../../../../../../console/video/planes';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import {
  installDefaultCloud,
  uninstallDefaultCloud,
  type RoccoDefaultCloudController,
} from './pier-clouds';
import { loadOrCreatePierScene } from './pier-scene';
import type {
  RoccoLevel,
  RoccoLevelConnector,
  RoccoLevelMountOptions,
} from '../../../../levels/rocco-level-types';
import { findRoccoLevelConnector } from '../../../../levels/rocco-level-types';
import type { RoccoPierBeginningAmbientPersistentState } from './pier-beginning-ambient';
import type { RoccoLocalization } from '../../localization';
import { installDefaultWalkMap, uninstallDefaultWalkMap } from './pier-walkmap';
import {
  installDefaultSprite,
  uninstallDefaultSprite,
  type RoccoDefaultSpriteController,
} from '../../sprites';
import { pierDoorClosingSoundUrl } from './pier-assets';
import { ROCCO_PIER_START_LEVEL_ID } from '../../constants';

export interface RoccoPierSideAmbientController {
  update(deltaMs: number): void;
  handleAction?(activation: RoccoActionMenuActivation): void;
  handleGridMenu?(activation: RoccoGridMenuActivation): void;
  handleSceneClick?(activation: RoccoSceneClickAction): void;
  unmount(engine: RoccoEngine): void;
}

export interface RoccoPierSideLevelDefinition {
  readonly id: string;
  readonly title: string;
  readonly sceneId: string;
  readonly backgroundScrollX: number;
  readonly connectors: readonly RoccoLevelConnector[];
  readonly localization: RoccoLocalization;
  readonly mountAmbient?: (
    engine: RoccoEngine,
    localization: RoccoLocalization,
    persistentState: RoccoPierBeginningAmbientPersistentState,
    preloader?: RoccoAssetPreloader,
    entryConnectorId?: string,
  ) => Promise<RoccoPierSideAmbientController | null> | RoccoPierSideAmbientController | null;
}

export class RoccoPierSideLevel implements RoccoLevel {
  readonly id: string;
  readonly title: string;
  readonly connectors: readonly RoccoLevelConnector[];

  private readonly sceneId: string;
  private readonly backgroundScrollX: number;
  private readonly localization: RoccoLocalization;
  private readonly mountAmbient?: RoccoPierSideLevelDefinition['mountAmbient'];
  private spriteController: RoccoDefaultSpriteController | null = null;
  private cloudController: RoccoDefaultCloudController | null = null;
  private ambientController: RoccoPierSideAmbientController | null = null;

  constructor(definition: RoccoPierSideLevelDefinition) {
    this.id = definition.id;
    this.title = definition.title;
    this.sceneId = definition.sceneId;
    this.backgroundScrollX = definition.backgroundScrollX;
    this.connectors = definition.connectors;
    this.localization = definition.localization;
    this.mountAmbient = definition.mountAmbient;
  }

  async mount(
    engine: RoccoEngine,
    options: RoccoLevelMountOptions = {},
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoPlaneScene> {
    this.spriteController = null;
    this.cloudController = null;
    this.ambientController = null;

    const scene = await loadOrCreatePierScene(engine, {
      sceneId: this.sceneId,
      backgroundScrollX: this.backgroundScrollX,
    });
    await (preloader?.preloadPlaneScene(engine, scene) ?? engine.video.preloadPlaneScene(scene));
    engine.loadPlaneScene(scene);
    await installDefaultWalkMap(engine, {
      backgroundScrollX: this.backgroundScrollX,
    }, preloader);

    const entryConnector =
      findRoccoLevelConnector(this.connectors, options.entryConnectorId) ?? this.connectors[0];
    const [cloudController, spriteController, ambientController] = await Promise.all([
      installDefaultCloud(engine, preloader),
      installDefaultSprite(engine, {
        appearance: options.roccoAppearance,
        initialFacing: entryConnector?.entryFacing ?? 'down',
        initialPosition: entryConnector?.entryPoint,
        playIntro: false,
      }, preloader),
      this.mountAmbient?.(engine, this.localization, { stan: { isIdentified: false }, door: { revealed: true } }, preloader, options.entryConnectorId) ??
        Promise.resolve(null),
    ]);

    this.cloudController = cloudController;
    this.spriteController = spriteController;
    this.ambientController = ambientController;
    if (this.id === ROCCO_PIER_START_LEVEL_ID) {
      engine.audio.registerSound({
        id: 'rocco-bait-shop-door-closing-sound',
        uri: pierDoorClosingSoundUrl,
        volume: 0.42,
        loop: false,
      });
      await engine.audio.preloadSound('rocco-bait-shop-door-closing-sound').catch(() => {
        engine.log('Audio', 'Pier start door closing sound could not be preloaded.');
      });
    }
    return scene;
  }

  unmount(engine: RoccoEngine): void {
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    this.ambientController?.unmount(engine);
    uninstallDefaultCloud(engine);
    uninstallDefaultSprite(engine);
    uninstallDefaultWalkMap(engine);
    if (this.id === ROCCO_PIER_START_LEVEL_ID) {
      engine.audio.stopSound('rocco-bait-shop-door-closing-sound');
      engine.audio.unregisterSound('rocco-bait-shop-door-closing-sound');
    }
    this.cloudController = null;
    this.spriteController = null;
    this.ambientController = null;
    engine.video.render(0);
  }

  update(deltaMs: number): void {
    this.cloudController?.update(deltaMs);
    this.spriteController?.update(deltaMs);
    this.ambientController?.update(deltaMs);
  }

  handleAction(activation: RoccoActionMenuActivation): void {
    this.ambientController?.handleAction?.(activation);
  }

  handleGridMenu(activation: RoccoGridMenuActivation): void {
    this.ambientController?.handleGridMenu?.(activation);
  }

  handleSceneClick(activation: RoccoSceneClickAction): void {
    this.ambientController?.handleSceneClick?.(activation);
  }
}
