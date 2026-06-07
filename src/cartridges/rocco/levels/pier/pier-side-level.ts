import type { RoccoEngine } from '../../../../engine/engine-api';
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

export interface RoccoPierSideLevelDefinition {
  id: string;
  title: string;
  sceneId: string;
  backgroundScrollX: number;
  connectors: readonly RoccoPierLevelConnector[];
}

export class RoccoPierSideLevel implements RoccoPierLevel {
  readonly id: string;
  readonly title: string;
  readonly connectors: readonly RoccoPierLevelConnector[];

  private readonly sceneId: string;
  private readonly backgroundScrollX: number;
  private spriteController: RoccoDefaultSpriteController | null = null;
  private cloudController: RoccoDefaultCloudController | null = null;

  constructor(definition: RoccoPierSideLevelDefinition) {
    this.id = definition.id;
    this.title = definition.title;
    this.sceneId = definition.sceneId;
    this.backgroundScrollX = definition.backgroundScrollX;
    this.connectors = definition.connectors;
  }

  async mount(
    engine: RoccoEngine,
    options: RoccoPierLevelMountOptions = {},
  ): Promise<RoccoPlaneScene> {
    this.spriteController = null;
    this.cloudController = null;

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
    const [cloudController, spriteController] = await Promise.all([
      installDefaultCloud(engine),
      installDefaultSprite(engine, {
        initialFacing: entryConnector?.entryFacing ?? 'down',
        initialPosition: entryConnector?.entryPoint,
        playIntro: false,
      }),
    ]);

    this.cloudController = cloudController;
    this.spriteController = spriteController;
    return scene;
  }

  unmount(engine: RoccoEngine): void {
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    uninstallDefaultCloud(engine);
    uninstallDefaultSprite(engine);
    uninstallDefaultWalkMap(engine);
    this.cloudController = null;
    this.spriteController = null;
    engine.video.render(0);
  }

  update(deltaMs: number): void {
    this.cloudController?.update(deltaMs);
    this.spriteController?.update(deltaMs);
  }

  handleAction(): void {}
}
