import type { RoccoCartridgeActionResult } from '../../../../engine/cartridges';
import type { RoccoEngine } from '../../../../engine/engine-sdk';
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
import { netherAmbientSteamMachineAssetUrl, netherEndOfHallwayDoorAssetUrls } from './nether-assets';
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
const NETHER_END_OF_HALLWAY_AMBIENT_SOUND_ID = 'rocco-nether-steam-machine-ambient-sound';
const NETHER_END_OF_HALLWAY_AMBIENT_SOUND_VOLUME = 0.1;
const NETHER_END_OF_HALLWAY_LIGHTS_PLANE_ID = 'rocco-nether-end-of-hallway-door-lights';
const NETHER_END_OF_HALLWAY_RETURN_EXIT_TRIGGER_HEIGHT = 30;
const NETHER_END_OF_HALLWAY_DOOR_ROCCO_SCALE = DEFAULT_SPRITE_SCALE * 1.2 * 1.8 * 0.8 * 1.2;
const NETHER_END_OF_HALLWAY_DOOR_ROCCO_TINT = '#e6e6e6';
const NETHER_END_OF_HALLWAY_DOOR_FAR_SCALE = 0.8;
const NETHER_LIGHTS_MIN_OPACITY = 0;
const NETHER_LIGHTS_NOISE_MAX_OPACITY = 0.15;
const NETHER_LIGHTS_NOISE_STEP_MIN_MS = 70;
const NETHER_LIGHTS_NOISE_STEP_MAX_MS = 220;
const NETHER_LIGHTS_NOISE_SMOOTHING_MS = 120;
const NETHER_LIGHTS_PULSE_UPDATE_EPSILON = 0.001;
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
  extraPlanes: [
    {
      id: NETHER_END_OF_HALLWAY_LIGHTS_PLANE_ID,
      name: 'Nether End Of Hallway Door Lights',
      enabled: true,
      visible: true,
      source: {
        kind: 'image',
        uri: netherEndOfHallwayDoorAssetUrls.lights,
        width: DEFAULT_DESIGN_WIDTH,
        height: DEFAULT_DESIGN_HEIGHT,
      },
      colorModel: { kind: 'native' },
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      scroll: { x: 0, y: 0 },
      wrap: { x: false, y: false },
      viewport: {
        x: 0,
        y: 0,
        width: DEFAULT_DESIGN_WIDTH,
        height: DEFAULT_DESIGN_HEIGHT,
      },
      opacity: NETHER_LIGHTS_MIN_OPACITY,
      blendMode: 'multiply',
      occludesInput: false,
      priority: 0,
      renderLayer: 'foreground',
    },
  ],
};

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * Math.max(0, max - min);
}

export class RoccoNetherEndOfHallwayDoorLevel implements RoccoLevel {
  readonly id = ROCCO_NETHER_END_OF_HALLWAY_DOOR_LEVEL_ID;
  readonly title: string;
  readonly connectors = NETHER_END_OF_HALLWAY_CONNECTORS;

  private readonly localization: RoccoLocalization;
  private engine: RoccoEngine | null = null;
  private spriteController: RoccoDefaultSpriteController | null = null;
  private lightsOverlayOpacity = NETHER_LIGHTS_MIN_OPACITY;
  private lightsNoiseOpacity = NETHER_LIGHTS_MIN_OPACITY;
  private lightsNoiseTargetOpacity = NETHER_LIGHTS_MIN_OPACITY;
  private lightsNoiseTargetRemainingMs = 0;
  private sceneReady = false;

  constructor(localization: RoccoLocalization) {
    this.localization = localization;
    this.title = 'Nether';
  }

  async mount(
    engine: RoccoEngine,
    options: RoccoLevelMountOptions = {},
  ): Promise<RoccoPlaneScene> {
    this.engine = engine;
    this.spriteController = null;
    this.lightsOverlayOpacity = NETHER_LIGHTS_MIN_OPACITY;
    this.lightsNoiseOpacity = randomBetween(NETHER_LIGHTS_MIN_OPACITY, NETHER_LIGHTS_NOISE_MAX_OPACITY);
    this.lightsNoiseTargetOpacity = this.lightsNoiseOpacity;
    this.lightsNoiseTargetRemainingMs = randomBetween(
      NETHER_LIGHTS_NOISE_STEP_MIN_MS,
      NETHER_LIGHTS_NOISE_STEP_MAX_MS,
    );
    this.sceneReady = false;

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
    engine.audio.registerSound({
      id: NETHER_END_OF_HALLWAY_AMBIENT_SOUND_ID,
      uri: netherAmbientSteamMachineAssetUrl,
      volume: NETHER_END_OF_HALLWAY_AMBIENT_SOUND_VOLUME,
      loop: true,
    });
    await engine.audio.preloadSound(NETHER_END_OF_HALLWAY_AMBIENT_SOUND_ID).catch(() => {
      engine.log('Audio', 'Nether ambient steam machine sound could not be preloaded.');
    });
    engine.loadPlaneScene(scene);
    this.lightsOverlayOpacity = this.lightsNoiseOpacity;
    engine.video.planes.updatePlane(
      ROCCO_NETHER_END_OF_HALLWAY_DOOR_SCENE_ID,
      NETHER_END_OF_HALLWAY_LIGHTS_PLANE_ID,
      {
        opacity: this.lightsOverlayOpacity,
      },
    );
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    engine.video.sprites.registerWalkMap(walkMapProfile.walkMap);
    engine.audio.playSound(NETHER_END_OF_HALLWAY_AMBIENT_SOUND_ID, {
      restart: true,
      volume: NETHER_END_OF_HALLWAY_AMBIENT_SOUND_VOLUME,
      loop: true,
    });
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
      perspectiveAutoAdjust: {
        farY: walkMapProfile.farY,
        nearY: walkMapProfile.nearY,
        farScale: NETHER_END_OF_HALLWAY_DOOR_FAR_SCALE,
        nearScale: 1,
        scaleCurve: 'linear',
      },
    });
    engine.video.render(0);
    this.sceneReady = true;

    return scene;
  }

  unmount(engine: RoccoEngine): void {
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    engine.audio.stopSound(NETHER_END_OF_HALLWAY_AMBIENT_SOUND_ID);
    engine.audio.unregisterSound(NETHER_END_OF_HALLWAY_AMBIENT_SOUND_ID);
    uninstallDefaultSprite(engine);
    engine.video.sprites.unregisterWalkMap(DEFAULT_WALK_MAP_ID);
    this.engine = null;
    this.spriteController = null;
    this.lightsOverlayOpacity = NETHER_LIGHTS_MIN_OPACITY;
    this.lightsNoiseOpacity = NETHER_LIGHTS_MIN_OPACITY;
    this.lightsNoiseTargetOpacity = NETHER_LIGHTS_MIN_OPACITY;
    this.lightsNoiseTargetRemainingMs = 0;
    this.sceneReady = false;
    engine.video.render(0);
  }

  update(deltaMs: number): void {
    this.updateLightsOverlay(deltaMs);
    this.spriteController?.update(deltaMs);
  }

  handleAction(): void {}

  handleSceneClick(): RoccoCartridgeActionResult | void {}

  private updateLightsOverlay(deltaMs: number): void {
    if (!this.engine || !this.sceneReady || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    if (
      !this.engine.video.planes.resolvePlane(
        ROCCO_NETHER_END_OF_HALLWAY_DOOR_SCENE_ID,
        NETHER_END_OF_HALLWAY_LIGHTS_PLANE_ID,
      )
    ) {
      return;
    }

    this.lightsNoiseTargetRemainingMs -= deltaMs;
    if (this.lightsNoiseTargetRemainingMs <= 0) {
      this.lightsNoiseTargetOpacity = randomBetween(
        NETHER_LIGHTS_MIN_OPACITY,
        NETHER_LIGHTS_NOISE_MAX_OPACITY,
      );
      this.lightsNoiseTargetRemainingMs = randomBetween(
        NETHER_LIGHTS_NOISE_STEP_MIN_MS,
        NETHER_LIGHTS_NOISE_STEP_MAX_MS,
      );
    }

    const noiseBlend = clampUnit(deltaMs / NETHER_LIGHTS_NOISE_SMOOTHING_MS);
    this.lightsNoiseOpacity +=
      (this.lightsNoiseTargetOpacity - this.lightsNoiseOpacity) * noiseBlend;

    const nextOpacity = this.lightsNoiseOpacity;
    if (Math.abs(nextOpacity - this.lightsOverlayOpacity) < NETHER_LIGHTS_PULSE_UPDATE_EPSILON) {
      return;
    }

    this.lightsOverlayOpacity = nextOpacity;
    this.engine.video.planes.updatePlane(
      ROCCO_NETHER_END_OF_HALLWAY_DOOR_SCENE_ID,
      NETHER_END_OF_HALLWAY_LIGHTS_PLANE_ID,
      {
        opacity: nextOpacity,
      },
    );
  }
}
