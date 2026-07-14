import type { RoccoEngine } from '../../../../../../console/engine-sdk';
import type { RoccoPlaneScene } from '../../../../../../console/video/planes';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import {
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_SPRITE_SCALE,
  DEFAULT_WALK_MAP_ID,
} from '../../constants';
import {
  installDefaultSprite,
  uninstallDefaultSprite,
  type RoccoDefaultSpriteController,
} from '../../sprites';
import type { RoccoLocalization } from '../../localization';
import {
  findRoccoLevelConnector,
  type RoccoLevel,
  type RoccoLevelConnector,
  type RoccoLevelMountOptions,
} from '../../../../levels/rocco-level-types';
import { netherResetOfficeAssetUrls } from './nether-assets';
import {
  createNetherWalkMapProfile,
  loadOrCreateNetherScene,
  toOriginFromGroundPoint,
  type RoccoNetherSceneDefinition,
} from './nether-level-support';

export const ROCCO_NETHER_RESET_OFFICE_LEVEL_ID = 'nether-reset-office';
export const ROCCO_NETHER_RESET_OFFICE_SCENE_ID = 'rocco-nether-reset-office-scene';

const NETHER_RESET_OFFICE_ENTRY_CONNECTOR_ID = 'entry';
const NETHER_RESET_OFFICE_ROOM_CONNECTOR_ID = 'south';
const NETHER_RESET_OFFICE_EXIT_TRIGGER_HEIGHT = 30;
const NETHER_RESET_OFFICE_ENTRY_POSITION = {
  x: 371,
  y: 138,
} as const;
const NETHER_RESET_OFFICE_ROCCO_SCALE = DEFAULT_SPRITE_SCALE * 1.8;
const NETHER_RESET_OFFICE_ROCCO_TINT = '#cccccc';
const NETHER_RESET_OFFICE_FAR_SCALE = 0.8;
const NETHER_RESET_OFFICE_CONNECTED_ENTRY_GROUND_POINT = {
  x: 371,
  y: DEFAULT_DESIGN_HEIGHT - 22,
} as const;
const NETHER_RESET_OFFICE_CONNECTED_ENTRY_POSITION = toOriginFromGroundPoint(
  NETHER_RESET_OFFICE_CONNECTED_ENTRY_GROUND_POINT,
  NETHER_RESET_OFFICE_ROCCO_SCALE,
);

const NETHER_RESET_OFFICE_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: NETHER_RESET_OFFICE_ENTRY_CONNECTOR_ID,
    entryPoint: {
      ...NETHER_RESET_OFFICE_ENTRY_POSITION,
    },
    entryFacing: 'down',
  },
  {
    id: NETHER_RESET_OFFICE_ROOM_CONNECTOR_ID,
    exitArea: {
      x: 0,
      y: DEFAULT_DESIGN_HEIGHT - NETHER_RESET_OFFICE_EXIT_TRIGGER_HEIGHT,
      width: DEFAULT_DESIGN_WIDTH,
      height: NETHER_RESET_OFFICE_EXIT_TRIGGER_HEIGHT,
    },
    entryPoint: {
      ...NETHER_RESET_OFFICE_CONNECTED_ENTRY_POSITION,
    },
    entryFacing: 'up',
    preservePlayerPosition: true,
  },
] as const;

const NETHER_RESET_OFFICE_SCENE_DEFINITION: RoccoNetherSceneDefinition = {
  sceneId: ROCCO_NETHER_RESET_OFFICE_SCENE_ID,
  planeIds: {
    backplate: 'rocco-nether-reset-office-backplate',
    background: 'rocco-nether-reset-office-background',
  },
  backgroundUri: netherResetOfficeAssetUrls.background,
  backgroundName: 'Nether Reset Office Background',
};

export class RoccoNetherResetOfficeLevel implements RoccoLevel {
  private readonly localization: RoccoLocalization;
  private spriteController: RoccoDefaultSpriteController | null = null;
  readonly id = ROCCO_NETHER_RESET_OFFICE_LEVEL_ID;
  readonly title: string;
  readonly connectors = NETHER_RESET_OFFICE_CONNECTORS;

  constructor(localization: RoccoLocalization) {
    this.localization = localization;
    this.title = localization.text.levels.resetOfficeTitle;
  }

  async mount(
    engine: RoccoEngine,
    options: RoccoLevelMountOptions = {},
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoPlaneScene> {
    this.spriteController = null;

    const entryConnector = findRoccoLevelConnector(this.connectors, options.entryConnectorId);
    const initialPosition = entryConnector
      ? {
          x: options.entryPosition?.x ?? entryConnector.entryPoint.x,
          y: entryConnector.entryPoint.y,
        }
      : { ...NETHER_RESET_OFFICE_ENTRY_POSITION };
    const initialFacing = entryConnector?.entryFacing ?? 'down';
    const scene = await loadOrCreateNetherScene(engine, NETHER_RESET_OFFICE_SCENE_DEFINITION);
    const walkMapProfile = await createNetherWalkMapProfile(netherResetOfficeAssetUrls.walkPath);

    await (preloader?.preloadPlaneScene(engine, scene) ?? engine.video.preloadPlaneScene(scene));
    engine.loadPlaneScene(scene);
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    engine.video.sprites.registerWalkMap(walkMapProfile.walkMap);
    this.spriteController = await installDefaultSprite(engine, {
      appearance: options.roccoAppearance,
      initialFacing,
      initialPosition: { ...initialPosition },
      scale: NETHER_RESET_OFFICE_ROCCO_SCALE,
      tint: NETHER_RESET_OFFICE_ROCCO_TINT,
      localization: this.localization,
      playIntro: false,
      perspectiveAutoAdjust: {
        farY: walkMapProfile.farY,
        nearY: walkMapProfile.nearY,
        farScale: NETHER_RESET_OFFICE_FAR_SCALE,
        nearScale: 1,
        scaleCurve: 'linear',
      },
    }, preloader);
    engine.video.render(0);

    return scene;
  }

  unmount(engine: RoccoEngine): void {
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    uninstallDefaultSprite(engine);
    engine.video.sprites.unregisterWalkMap(DEFAULT_WALK_MAP_ID);
    this.spriteController = null;
    engine.video.render(0);
  }

  update(deltaMs: number): void {
    this.spriteController?.update(deltaMs);
  }

  handleAction(): void {}
}
