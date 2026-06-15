import type { RoccoEngine } from '../../../../engine/engine-sdk';
import type { RoccoPlaneScene } from '../../../../engine/video/planes';
import {
  installDefaultCloud,
  uninstallDefaultCloud,
  type RoccoDefaultCloudController,
} from './pier-clouds';
import { loadOrCreatePierScene } from './pier-scene';
import type {
  RoccoPierLevel,
  RoccoPierLevelConnector,
  RoccoPierLevelMountOptions,
} from './pier-level-types';
import { findPierConnector } from './pier-level-types';
import { installDefaultWalkMap, uninstallDefaultWalkMap } from './pier-walkmap';
import {
  installDefaultSprite,
  uninstallDefaultSprite,
  type RoccoDefaultSpriteController,
} from '../../rocco-default-sprites';

export interface RoccoPierSideAmbientController {
  update(deltaMs: number): void;
  unmount(engine: RoccoEngine): void;
}

export interface RoccoPierSideLevelDefinition {
  id: string;
  title: string;
  sceneId: string;
  backgroundScrollX: number;
  connectors: readonly RoccoPierLevelConnector[];
  mountAmbient?: (
    engine: RoccoEngine,
  ) => Promise<RoccoPierSideAmbientController | null> | RoccoPierSideAmbientController | null;
}

export class RoccoPierSideLevel implements RoccoPierLevel {
  readonly id: string;
  readonly title: string;
  readonly connectors: readonly RoccoPierLevelConnector[];

  private readonly sceneId: string;
  private readonly backgroundScrollX: number;
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
    this.mountAmbient = definition.mountAmbient;
  }

  async mount(
    engine: RoccoEngine,
    options: RoccoPierLevelMountOptions = {},
  ): Promise<RoccoPlaneScene> {
    this.spriteController = null;
    this.cloudController = null;
    this.ambientController = null;

    const scene = await loadOrCreatePierScene(engine, {
      sceneId: this.sceneId,
      backgroundScrollX: this.backgroundScrollX,
    });
    await engine.video.preloadPlaneScene(scene);
    engine.loadPlaneScene(scene);
    await installDefaultWalkMap(engine, {
      backgroundScrollX: this.backgroundScrollX,
    });

    const entryConnector =
      findPierConnector(this.connectors, options.entryConnectorId) ?? this.connectors[0];
    const [cloudController, spriteController, ambientController] = await Promise.all([
      installDefaultCloud(engine),
      installDefaultSprite(engine, {
        initialFacing: entryConnector?.entryFacing ?? 'down',
        initialPosition: entryConnector?.entryPoint,
        playIntro: false,
      }),
      this.mountAmbient?.(engine) ?? Promise.resolve(null),
    ]);

    this.cloudController = cloudController;
    this.spriteController = spriteController;
    this.ambientController = ambientController;
    return scene;
  }

  unmount(engine: RoccoEngine): void {
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    this.ambientController?.unmount(engine);
    uninstallDefaultCloud(engine);
    uninstallDefaultSprite(engine);
    uninstallDefaultWalkMap(engine);
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

  handleAction(): void {}
}
