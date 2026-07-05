import type { RoccoCartridgeActionResult, RoccoSceneClickAction } from '../../../../engine/cartridges';
import type { RoccoEngine } from '../../../../engine/engine-sdk';
import type { RoccoActionMenuActivation } from '../../../../engine/video/action-menu';
import type { RoccoPlaneScene } from '../../../../engine/video/planes';
import type { RoccoLocalization } from '../../localization';
import {
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_SPRITE_SCALE,
  DEFAULT_WALK_MAP_ID,
} from '../../rocco-default-constants';
import {
  installDefaultSprite,
  uninstallDefaultSprite,
  type RoccoDefaultSpriteController,
} from '../../rocco-default-sprites';
import {
  findRoccoLevelConnector,
  type RoccoLevel,
  type RoccoLevelConnector,
  type RoccoLevelMountOptions,
} from '../rocco-level-types';
import { netherEndOfHallwayDoorAssetUrls } from './nether-assets';
import {
  createNetherWalkMapProfile,
  loadOrCreateNetherScene,
  projectOriginToWalkMap,
  toOriginFromGroundPoint,
  type RoccoNetherSceneDefinition,
} from './nether-level-support';

export const ROCCO_NETHER_END_OF_HALLWAY_DOOR_LEVEL_ID = 'nether-end-of-hallway-door';
export const ROCCO_NETHER_END_OF_HALLWAY_DOOR_SCENE_ID =
  'rocco-nether-end-of-hallway-door-scene';

const NETHER_END_OF_HALLWAY_RETURN_CONNECTOR_ID = 'south';
const NETHER_END_OF_HALLWAY_RETURN_EXIT_TRIGGER_HEIGHT = 30;
const NETHER_END_OF_HALLWAY_DOOR_ROCCO_SCALE = DEFAULT_SPRITE_SCALE * 1.2 * 1.8 * 0.8;
const NETHER_END_OF_HALLWAY_DOOR_ROCCO_TINT = '#e6e6e6';
const NETHER_END_OF_HALLWAY_ENTRY_GROUND_POINT = {
  x: Math.round(DEFAULT_DESIGN_WIDTH * 0.5),
  y: DEFAULT_DESIGN_HEIGHT - 22,
} as const;
const NETHER_END_OF_HALLWAY_ENTRY_POSITION = toOriginFromGroundPoint(
  NETHER_END_OF_HALLWAY_ENTRY_GROUND_POINT,
  NETHER_END_OF_HALLWAY_DOOR_ROCCO_SCALE,
);

const NETHER_END_OF_HALLWAY_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: NETHER_END_OF_HALLWAY_RETURN_CONNECTOR_ID,
    exitArea: {
      x: 0,
      y: DEFAULT_DESIGN_HEIGHT - NETHER_END_OF_HALLWAY_RETURN_EXIT_TRIGGER_HEIGHT,
      width: DEFAULT_DESIGN_WIDTH,
      height: NETHER_END_OF_HALLWAY_RETURN_EXIT_TRIGGER_HEIGHT,
    },
    entryPoint: {
      ...NETHER_END_OF_HALLWAY_ENTRY_POSITION,
    },
    entryFacing: 'up',
  },
] as const;

const NETHER_END_OF_HALLWAY_SCENE_DEFINITION: RoccoNetherSceneDefinition = {
  sceneId: ROCCO_NETHER_END_OF_HALLWAY_DOOR_SCENE_ID,
  planeIds: {
    backplate: 'rocco-nether-end-of-hallway-door-backplate',
    background: 'rocco-nether-end-of-hallway-door-background',
  },
  backgroundUri: netherEndOfHallwayDoorAssetUrls.background,
  backgroundName: 'Nether End Of Hallway Door Background',
};

export class RoccoNetherEndOfHallwayDoorLevel implements RoccoLevel {
  readonly id = ROCCO_NETHER_END_OF_HALLWAY_DOOR_LEVEL_ID;
  readonly title: string;
  readonly connectors = NETHER_END_OF_HALLWAY_CONNECTORS;

  private readonly localization: RoccoLocalization;
  private spriteController: RoccoDefaultSpriteController | null = null;

  constructor(localization: RoccoLocalization) {
    this.localization = localization;
    this.title = 'Nether';
  }

  async mount(
    engine: RoccoEngine,
    options: RoccoLevelMountOptions = {},
  ): Promise<RoccoPlaneScene> {
    this.spriteController = null;

    const entryConnector = findRoccoLevelConnector(this.connectors, options.entryConnectorId);
    const initialPosition = entryConnector
      ? {
          x: options.entryPosition?.x ?? entryConnector.entryPoint.x,
          y: entryConnector.entryPoint.y,
        }
      : { ...NETHER_END_OF_HALLWAY_ENTRY_POSITION };
    const initialFacing = entryConnector?.entryFacing ?? 'up';
    const scene = await loadOrCreateNetherScene(engine, NETHER_END_OF_HALLWAY_SCENE_DEFINITION);
    const walkMapProfile = await createNetherWalkMapProfile(netherEndOfHallwayDoorAssetUrls.walkPath);

    await engine.video.preloadPlaneScene(scene);
    engine.loadPlaneScene(scene);
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    engine.video.sprites.registerWalkMap(walkMapProfile.walkMap);
    this.spriteController = await installDefaultSprite(engine, {
      initialFacing,
      initialPosition: projectOriginToWalkMap(
        walkMapProfile.walkMap,
        initialPosition,
        NETHER_END_OF_HALLWAY_DOOR_ROCCO_SCALE,
      ),
      scale: NETHER_END_OF_HALLWAY_DOOR_ROCCO_SCALE,
      tint: NETHER_END_OF_HALLWAY_DOOR_ROCCO_TINT,
      localization: this.localization,
      playIntro: false,
    });
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

  handleAction(_activation: RoccoActionMenuActivation): void {}

  handleSceneClick(_activation: RoccoSceneClickAction): RoccoCartridgeActionResult | void {}
}
