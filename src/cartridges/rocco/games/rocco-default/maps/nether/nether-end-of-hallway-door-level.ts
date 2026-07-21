import type { RoccoSceneClickAction } from '../../../../../../console/cartridges';
import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type {
  RoccoActionMenuActivation,
  RoccoActionMenuDefinition,
} from '../../../../../../console/video/action-menu';
import type { RoccoPlaneScene } from '../../../../../../console/video/planes';
import type { RoccoLocalization } from '../../localization';
import { roccoCartridgeMessageRuntime } from '../../../../rpce/dialogue';
import { ROCCO_ACTION_MENU_ASSETS } from '../../ui';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import { ROCCO_PLAYER_CONFIG } from '../../player';
import { ROCCO_DESIGN_WIDTH, ROCCO_DESIGN_HEIGHT } from '../../game-design';
import { ROCCO_ACTIVE_WALK_MAP_ID } from '../../../../levels/rocco-level-runtime-ids';
import {
  installRoccoPlayerSprite,
  uninstallRoccoPlayerSprite,
  type RoccoPlayerSpriteController,
} from '../../player';
import {
  findRoccoLevelConnector,
  type RoccoLevel,
  type RoccoLevelConnector,
  type RoccoLevelMountOptions,
} from '../../../../levels/rocco-level-types';
import {
  netherAmbientSteamMachineAssetUrl,
  netherEndOfHallwayDoorAssetUrls,
} from './nether-assets';
import {
  createNetherWalkMapProfile,
  loadOrCreateNetherScene,
  projectOriginToWalkMap,
  toOriginFromGroundPoint,
  type RoccoNetherSceneDefinition,
} from './nether-level-support';

export const ROCCO_NETHER_END_OF_HALLWAY_DOOR_LEVEL_ID = 'nether-end-of-hallway-door';
export const ROCCO_NETHER_END_OF_HALLWAY_DOOR_SCENE_ID = 'rocco-nether-end-of-hallway-door-scene';

const NETHER_END_OF_HALLWAY_RETURN_CONNECTOR_ID = 'south';
const NETHER_END_OF_HALLWAY_AMBIENT_SOUND_ID = 'rocco-nether-steam-machine-ambient-sound';
const NETHER_END_OF_HALLWAY_AMBIENT_SOUND_VOLUME = 0.1;
const NETHER_END_OF_HALLWAY_LIGHTS_PLANE_ID = 'rocco-nether-end-of-hallway-door-lights';
const NETHER_END_OF_HALLWAY_RETURN_EXIT_TRIGGER_HEIGHT = 30;
const NETHER_END_OF_HALLWAY_DOOR_ROCCO_SCALE =
  ROCCO_PLAYER_CONFIG.motion.scale * 1.2 * 1.8 * 0.8 * 1.2;
const NETHER_END_OF_HALLWAY_DOOR_ROCCO_TINT = '#e6e6e6';
const NETHER_END_OF_HALLWAY_DOOR_FAR_SCALE = 0.8;
const NETHER_LIGHTS_MIN_OPACITY = 0;
const NETHER_LIGHTS_NOISE_MAX_OPACITY = 0.15;
const NETHER_LIGHTS_NOISE_STEP_MIN_MS = 70;
const NETHER_LIGHTS_NOISE_STEP_MAX_MS = 220;
const NETHER_LIGHTS_NOISE_SMOOTHING_MS = 120;
const NETHER_LIGHTS_PULSE_UPDATE_EPSILON = 0.001;
const NETHER_END_OF_HALLWAY_TIMBRE_TARGET_INSTANCE_ID =
  'rocco-nether-end-of-hallway-door-timbre-target';
const NETHER_END_OF_HALLWAY_TIMBRE_DEFINITION_ID = 'rocco-nether-end-of-hallway-door-timbre';
const NETHER_END_OF_HALLWAY_TIMBRE_ACTION_MENU_ID =
  'rocco-nether-end-of-hallway-door-timbre-action-menu';
const NETHER_END_OF_HALLWAY_TIMBRE_SHAPE = {
  kind: 'rect' as const,
  x: 624,
  y: 228,
  width: 38,
  height: 35,
};
const NETHER_END_OF_HALLWAY_TIMBRE_ACTION_MENU_ITEM_SIZE = 92;
const NETHER_END_OF_HALLWAY_TIMBRE_ACTION_MENU_ORBIT_RADIUS = 88;
const NETHER_END_OF_HALLWAY_TIMBRE_ACTION_MENU_ORBIT_SPEED = 0.08;
const NETHER_END_OF_HALLWAY_TIMBRE_MESSAGE_TTL_MS = 5200;
const NETHER_END_OF_HALLWAY_TIMBRE_LOOK_HISTORY_KEY = 'nether-end-of-hallway-door-timbre-look';
const NETHER_END_OF_HALLWAY_DOOR_HANDLE_TARGET_INSTANCE_ID =
  'rocco-nether-end-of-hallway-door-door-handle-target';
const NETHER_END_OF_HALLWAY_DOOR_HANDLE_DEFINITION_ID =
  'rocco-nether-end-of-hallway-door-door-handle';
const NETHER_END_OF_HALLWAY_DOOR_HANDLE_ACTION_MENU_ID =
  'rocco-nether-end-of-hallway-door-door-handle-action-menu';
const NETHER_END_OF_HALLWAY_DOOR_HANDLE_SHAPE = {
  kind: 'rect' as const,
  x: 516,
  y: 254,
  width: 53,
  height: 46,
};
const NETHER_END_OF_HALLWAY_DOOR_HANDLE_ACTION_MENU_ITEM_SIZE = 92;
const NETHER_END_OF_HALLWAY_DOOR_HANDLE_ACTION_MENU_ORBIT_RADIUS = 88;
const NETHER_END_OF_HALLWAY_DOOR_HANDLE_ACTION_MENU_ORBIT_SPEED = 0.08;
const NETHER_END_OF_HALLWAY_DOOR_HANDLE_MESSAGE_TTL_MS = 5200;
const NETHER_END_OF_HALLWAY_DOOR_HANDLE_LOOK_HISTORY_KEY =
  'nether-end-of-hallway-door-door-handle-look';
const NETHER_END_OF_HALLWAY_ASCENDING_PIPES_TARGET_INSTANCE_ID =
  'rocco-nether-end-of-hallway-door-ascending-pipes-target';
const NETHER_END_OF_HALLWAY_ASCENDING_PIPES_DEFINITION_ID =
  'rocco-nether-end-of-hallway-door-ascending-pipes';
const NETHER_END_OF_HALLWAY_ASCENDING_PIPES_SHAPE = {
  kind: 'rect' as const,
  x: 48,
  y: 0,
  width: 135,
  height: 540,
};
const NETHER_END_OF_HALLWAY_ASCENDING_PIPES_MESSAGE_TTL_MS = 5200;
const NETHER_END_OF_HALLWAY_ASCENDING_PIPES_HISTORY_KEY =
  'nether-end-of-hallway-door-ascending-pipes';
const NETHER_END_OF_HALLWAY_WHEEL_VALVE_TARGET_INSTANCE_ID =
  'rocco-nether-end-of-hallway-door-wheel-valve-target';
const NETHER_END_OF_HALLWAY_WHEEL_VALVE_DEFINITION_ID =
  'rocco-nether-end-of-hallway-door-wheel-valve';
const NETHER_END_OF_HALLWAY_WHEEL_VALVE_ACTION_MENU_ID =
  'rocco-nether-end-of-hallway-door-wheel-valve-action-menu';
const NETHER_END_OF_HALLWAY_WHEEL_VALVE_SHAPE = {
  kind: 'rect' as const,
  x: 113,
  y: 264,
  width: 88,
  height: 92,
};
const NETHER_END_OF_HALLWAY_WHEEL_VALVE_ACTION_MENU_ITEM_SIZE = 92;
const NETHER_END_OF_HALLWAY_WHEEL_VALVE_ACTION_MENU_ORBIT_RADIUS = 88;
const NETHER_END_OF_HALLWAY_WHEEL_VALVE_ACTION_MENU_ORBIT_SPEED = 0.08;
const NETHER_END_OF_HALLWAY_WHEEL_VALVE_MESSAGE_TTL_MS = 5200;
const NETHER_END_OF_HALLWAY_WHEEL_VALVE_LOOK_HISTORY_KEY =
  'nether-end-of-hallway-door-wheel-valve-look';
const NETHER_END_OF_HALLWAY_WHEEL_VALVE_GRAB_HISTORY_KEY =
  'nether-end-of-hallway-door-wheel-valve-grab';
const NETHER_END_OF_HALLWAY_ENTRY_GROUND_POINT = {
  x: Math.round(ROCCO_DESIGN_WIDTH * 0.5),
  y: ROCCO_DESIGN_HEIGHT - 22,
} as const;
const NETHER_END_OF_HALLWAY_ENTRY_POSITION = toOriginFromGroundPoint(
  NETHER_END_OF_HALLWAY_ENTRY_GROUND_POINT,
  NETHER_END_OF_HALLWAY_DOOR_ROCCO_SCALE,
);

type NetherEndOfHallwaySceneClickResult = { suppressDefaultPlayerMove: true } | undefined;

const NETHER_END_OF_HALLWAY_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: NETHER_END_OF_HALLWAY_RETURN_CONNECTOR_ID,
    exitArea: {
      x: 0,
      y: ROCCO_DESIGN_HEIGHT - NETHER_END_OF_HALLWAY_RETURN_EXIT_TRIGGER_HEIGHT,
      width: ROCCO_DESIGN_WIDTH,
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
        width: ROCCO_DESIGN_WIDTH,
        height: ROCCO_DESIGN_HEIGHT,
      },
      colorModel: { kind: 'native' },
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      scroll: { x: 0, y: 0 },
      wrap: { x: false, y: false },
      viewport: {
        x: 0,
        y: 0,
        width: ROCCO_DESIGN_WIDTH,
        height: ROCCO_DESIGN_HEIGHT,
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
  const randomUnit = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
  return min + randomUnit * Math.max(0, max - min);
}

export class RoccoNetherEndOfHallwayDoorLevel implements RoccoLevel {
  private readonly localization: RoccoLocalization;
  private engine: CartridgeSdkV1Runtime | undefined = undefined;
  private spriteController: RoccoPlayerSpriteController | undefined = undefined;
  private lightsOverlayOpacity = NETHER_LIGHTS_MIN_OPACITY;
  private lightsNoiseOpacity = NETHER_LIGHTS_MIN_OPACITY;
  private lightsNoiseTargetOpacity = NETHER_LIGHTS_MIN_OPACITY;
  private lightsNoiseTargetRemainingMs = 0;
  private sceneReady = false;

  readonly id = ROCCO_NETHER_END_OF_HALLWAY_DOOR_LEVEL_ID;
  readonly title: string;
  readonly connectors = NETHER_END_OF_HALLWAY_CONNECTORS;

  constructor(localization: RoccoLocalization) {
    this.localization = localization;
    this.title = 'Nether';
  }

  private installTimbre(engine: CartridgeSdkV1Runtime): void {
    engine.video.actionMenus.unregisterMenu(NETHER_END_OF_HALLWAY_TIMBRE_ACTION_MENU_ID);
    engine.video.sceneTargets?.unregisterTarget(NETHER_END_OF_HALLWAY_TIMBRE_TARGET_INSTANCE_ID);
    engine.video.sceneTargets?.registerTarget({
      instanceId: NETHER_END_OF_HALLWAY_TIMBRE_TARGET_INSTANCE_ID,
      definitionId: NETHER_END_OF_HALLWAY_TIMBRE_DEFINITION_ID,
      shape: NETHER_END_OF_HALLWAY_TIMBRE_SHAPE,
      priority: 22,
      suppressDefaultPlayerMove: true,
      visibleDescription: {
        enabled: true,
        text: this.localization.text.descriptions.timbre,
      },
    });
    engine.video.actionMenus.registerMenu(
      createNetherEndOfHallwayTimbreActionMenuDefinition(this.localization),
    );
  }

  private handleTimbreAction(activation: RoccoActionMenuActivation): void {
    if (activation.actionId !== 'look') {
      return;
    }

    this.showTimbreThought(
      this.localization.text.nether.timbre.lookLines,
      NETHER_END_OF_HALLWAY_TIMBRE_LOOK_HISTORY_KEY,
    );
  }

  private showTimbreThought(lines: readonly string[], historyKey: string): void {
    if (!this.engine) {
      return;
    }

    roccoCartridgeMessageRuntime.think(
      this.engine,
      ROCCO_PLAYER_CONFIG.ids.instance,
      [...lines],
      {
        ttlMs: NETHER_END_OF_HALLWAY_TIMBRE_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey,
        isAvoidImmediateRepeat: true,
      },
    );
  }

  private installDoorHandle(engine: CartridgeSdkV1Runtime): void {
    engine.video.actionMenus.unregisterMenu(NETHER_END_OF_HALLWAY_DOOR_HANDLE_ACTION_MENU_ID);
    engine.video.sceneTargets?.unregisterTarget(
      NETHER_END_OF_HALLWAY_DOOR_HANDLE_TARGET_INSTANCE_ID,
    );
    engine.video.sceneTargets?.registerTarget({
      instanceId: NETHER_END_OF_HALLWAY_DOOR_HANDLE_TARGET_INSTANCE_ID,
      definitionId: NETHER_END_OF_HALLWAY_DOOR_HANDLE_DEFINITION_ID,
      shape: NETHER_END_OF_HALLWAY_DOOR_HANDLE_SHAPE,
      priority: 22,
      suppressDefaultPlayerMove: true,
      visibleDescription: {
        enabled: true,
        text: this.localization.text.descriptions.doorHandle,
      },
    });
    engine.video.actionMenus.registerMenu(
      createNetherEndOfHallwayDoorHandleActionMenuDefinition(this.localization),
    );
  }

  private handleDoorHandleAction(activation: RoccoActionMenuActivation): void {
    if (activation.actionId === 'grab') {
      return;
    }

    if (activation.actionId !== 'look') {
      return;
    }

    this.showDoorHandleThought(
      this.localization.text.nether.doorHandle.lookLines,
      NETHER_END_OF_HALLWAY_DOOR_HANDLE_LOOK_HISTORY_KEY,
    );
  }

  private showDoorHandleThought(lines: readonly string[], historyKey: string): void {
    if (!this.engine) {
      return;
    }

    roccoCartridgeMessageRuntime.think(
      this.engine,
      ROCCO_PLAYER_CONFIG.ids.instance,
      [...lines],
      {
        ttlMs: NETHER_END_OF_HALLWAY_DOOR_HANDLE_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey,
        isAvoidImmediateRepeat: true,
      },
    );
  }

  private installAscendingPipes(engine: CartridgeSdkV1Runtime): void {
    engine.video.sceneTargets?.unregisterTarget(
      NETHER_END_OF_HALLWAY_ASCENDING_PIPES_TARGET_INSTANCE_ID,
    );
    engine.video.sceneTargets?.registerTarget({
      instanceId: NETHER_END_OF_HALLWAY_ASCENDING_PIPES_TARGET_INSTANCE_ID,
      definitionId: NETHER_END_OF_HALLWAY_ASCENDING_PIPES_DEFINITION_ID,
      shape: NETHER_END_OF_HALLWAY_ASCENDING_PIPES_SHAPE,
      priority: 22,
      suppressDefaultPlayerMove: true,
      visibleDescription: {
        enabled: true,
        text: this.localization.text.descriptions.ascendingPipes,
      },
    });
  }

  private showAscendingPipesThought(): void {
    if (!this.engine) {
      return;
    }

    roccoCartridgeMessageRuntime.think(
      this.engine,
      ROCCO_PLAYER_CONFIG.ids.instance,
      [...this.localization.text.nether.ascendingPipes.lookLines],
      {
        ttlMs: NETHER_END_OF_HALLWAY_ASCENDING_PIPES_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey: NETHER_END_OF_HALLWAY_ASCENDING_PIPES_HISTORY_KEY,
        isAvoidImmediateRepeat: true,
      },
    );
  }

  private installWheelValve(engine: CartridgeSdkV1Runtime): void {
    engine.video.actionMenus.unregisterMenu(NETHER_END_OF_HALLWAY_WHEEL_VALVE_ACTION_MENU_ID);
    engine.video.sceneTargets?.unregisterTarget(
      NETHER_END_OF_HALLWAY_WHEEL_VALVE_TARGET_INSTANCE_ID,
    );
    engine.video.sceneTargets?.registerTarget({
      instanceId: NETHER_END_OF_HALLWAY_WHEEL_VALVE_TARGET_INSTANCE_ID,
      definitionId: NETHER_END_OF_HALLWAY_WHEEL_VALVE_DEFINITION_ID,
      shape: NETHER_END_OF_HALLWAY_WHEEL_VALVE_SHAPE,
      renderLayer: 'ui.action-menu',
      priority: 23,
      suppressDefaultPlayerMove: true,
      visibleDescription: {
        enabled: true,
        text: this.localization.text.descriptions.wheelValve,
      },
    });
    engine.video.actionMenus.registerMenu(
      createNetherEndOfHallwayWheelValveActionMenuDefinition(this.localization),
    );
  }

  private handleWheelValveAction(activation: RoccoActionMenuActivation): void {
    if (activation.actionId === 'grab') {
      this.showWheelValveThought(
        this.localization.text.nether.wheelValve.grabLines,
        NETHER_END_OF_HALLWAY_WHEEL_VALVE_GRAB_HISTORY_KEY,
      );
      return;
    }

    if (activation.actionId !== 'look') {
      return;
    }

    this.showWheelValveThought(
      this.localization.text.nether.wheelValve.lookLines,
      NETHER_END_OF_HALLWAY_WHEEL_VALVE_LOOK_HISTORY_KEY,
    );
  }

  private showWheelValveThought(lines: readonly string[], historyKey: string): void {
    if (!this.engine) {
      return;
    }

    roccoCartridgeMessageRuntime.think(
      this.engine,
      ROCCO_PLAYER_CONFIG.ids.instance,
      [...lines],
      {
        ttlMs: NETHER_END_OF_HALLWAY_WHEEL_VALVE_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey,
        isAvoidImmediateRepeat: true,
      },
    );
  }

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

  private resetMountState(engine: CartridgeSdkV1Runtime): void {
    this.engine = engine;
    this.spriteController = undefined;
    this.lightsOverlayOpacity = NETHER_LIGHTS_MIN_OPACITY;
    this.lightsNoiseOpacity = randomBetween(
      NETHER_LIGHTS_MIN_OPACITY,
      NETHER_LIGHTS_NOISE_MAX_OPACITY,
    );
    this.lightsNoiseTargetOpacity = this.lightsNoiseOpacity;
    this.lightsNoiseTargetRemainingMs = randomBetween(
      NETHER_LIGHTS_NOISE_STEP_MIN_MS,
      NETHER_LIGHTS_NOISE_STEP_MAX_MS,
    );
    this.sceneReady = false;
  }

  private registerAmbientSound(engine: CartridgeSdkV1Runtime): void {
    engine.audio.registerSound({
      id: NETHER_END_OF_HALLWAY_AMBIENT_SOUND_ID,
      uri: netherAmbientSteamMachineAssetUrl,
      volume: NETHER_END_OF_HALLWAY_AMBIENT_SOUND_VOLUME,
      loop: true,
    });
  }

  private async preloadAmbientSound(
    engine: CartridgeSdkV1Runtime,
    preloader?: RoccoAssetPreloader,
  ): Promise<void> {
    try {
      await preloader?.preloadSound(engine, NETHER_END_OF_HALLWAY_AMBIENT_SOUND_ID);
    } catch {
      engine.log('Audio', 'Nether ambient steam machine sound could not be preloaded.');
    }
  }

  private async prepareNetherEndScene(
    engine: CartridgeSdkV1Runtime,
    preloader?: RoccoAssetPreloader,
  ): Promise<{
    scene: RoccoPlaneScene;
    walkMapProfile: Awaited<ReturnType<typeof createNetherWalkMapProfile>>;
  }> {
    const scene = await loadOrCreateNetherScene(engine, NETHER_END_OF_HALLWAY_SCENE_DEFINITION);
    const walkMapProfile = await createNetherWalkMapProfile(
      netherEndOfHallwayDoorAssetUrls.walkPath,
    );
    await (preloader?.preloadPlaneScene(engine, scene) ?? engine.video.preloadPlaneScene(scene));
    this.registerAmbientSound(engine);
    await this.preloadAmbientSound(engine, preloader);
    engine.loadPlaneScene(scene);
    this.lightsOverlayOpacity = this.lightsNoiseOpacity;
    engine.video.planes.updatePlane(
      ROCCO_NETHER_END_OF_HALLWAY_DOOR_SCENE_ID,
      NETHER_END_OF_HALLWAY_LIGHTS_PLANE_ID,
      { opacity: this.lightsOverlayOpacity },
    );
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    engine.video.sprites.registerWalkMap(walkMapProfile.walkMap);
    engine.audio.playSound(NETHER_END_OF_HALLWAY_AMBIENT_SOUND_ID, {
      restart: true,
      volume: NETHER_END_OF_HALLWAY_AMBIENT_SOUND_VOLUME,
      loop: true,
    });
    return { scene, walkMapProfile };
  }

  async mount(
    engine: CartridgeSdkV1Runtime,
    options: RoccoLevelMountOptions = {},
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoPlaneScene> {
    this.resetMountState(engine);

    const entryConnector = findRoccoLevelConnector(this.connectors, options.entryConnectorId);
    const initialPosition = entryConnector
      ? {
          x: options.entryPosition?.x ?? entryConnector.entryPoint.x,
          y: entryConnector.entryPoint.y,
        }
      : { ...NETHER_END_OF_HALLWAY_ENTRY_POSITION };
    const initialFacing = entryConnector?.entryFacing ?? 'up';
    const { scene, walkMapProfile } = await this.prepareNetherEndScene(engine, preloader);
    this.spriteController = await installRoccoPlayerSprite(
      engine,
      {
        appearance: options.roccoAppearance,
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
      },
      preloader,
    );
    this.sceneReady = true;

    this.installTimbre(engine);
    this.installDoorHandle(engine);
    this.installAscendingPipes(engine);
    this.installWheelValve(engine);

    return scene;
  }

  unmount(engine: CartridgeSdkV1Runtime): void {
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    engine.video.actionMenus.unregisterMenu(NETHER_END_OF_HALLWAY_TIMBRE_ACTION_MENU_ID);
    engine.video.sceneTargets?.unregisterTarget(NETHER_END_OF_HALLWAY_TIMBRE_TARGET_INSTANCE_ID);
    engine.video.actionMenus.unregisterMenu(NETHER_END_OF_HALLWAY_DOOR_HANDLE_ACTION_MENU_ID);
    engine.video.sceneTargets?.unregisterTarget(
      NETHER_END_OF_HALLWAY_DOOR_HANDLE_TARGET_INSTANCE_ID,
    );
    engine.video.sceneTargets?.unregisterTarget(
      NETHER_END_OF_HALLWAY_ASCENDING_PIPES_TARGET_INSTANCE_ID,
    );
    engine.video.actionMenus.unregisterMenu(NETHER_END_OF_HALLWAY_WHEEL_VALVE_ACTION_MENU_ID);
    engine.video.sceneTargets?.unregisterTarget(
      NETHER_END_OF_HALLWAY_WHEEL_VALVE_TARGET_INSTANCE_ID,
    );
    engine.audio.stopSound(NETHER_END_OF_HALLWAY_AMBIENT_SOUND_ID);
    engine.audio.unregisterSound(NETHER_END_OF_HALLWAY_AMBIENT_SOUND_ID);
    uninstallRoccoPlayerSprite(engine);
    engine.video.sprites.unregisterWalkMap(ROCCO_ACTIVE_WALK_MAP_ID);
    this.engine = undefined;
    this.spriteController = undefined;
    this.lightsOverlayOpacity = NETHER_LIGHTS_MIN_OPACITY;
    this.lightsNoiseOpacity = NETHER_LIGHTS_MIN_OPACITY;
    this.lightsNoiseTargetOpacity = NETHER_LIGHTS_MIN_OPACITY;
    this.lightsNoiseTargetRemainingMs = 0;
    this.sceneReady = false;
  }

  update(deltaMs: number): void {
    this.updateLightsOverlay(deltaMs);
    this.spriteController?.update(deltaMs);
  }

  handleAction(activation: RoccoActionMenuActivation): void {
    if (
      this.engine &&
      activation.targetInstanceId === NETHER_END_OF_HALLWAY_TIMBRE_TARGET_INSTANCE_ID
    ) {
      this.handleTimbreAction(activation);
      return;
    }

    if (
      this.engine &&
      activation.targetInstanceId === NETHER_END_OF_HALLWAY_DOOR_HANDLE_TARGET_INSTANCE_ID
    ) {
      this.handleDoorHandleAction(activation);
    }

    if (
      this.engine &&
      activation.targetInstanceId === NETHER_END_OF_HALLWAY_WHEEL_VALVE_TARGET_INSTANCE_ID
    ) {
      this.handleWheelValveAction(activation);
    }
  }

  handleSceneClick(activation: RoccoSceneClickAction): NetherEndOfHallwaySceneClickResult {
    if (activation.targetInstanceId === NETHER_END_OF_HALLWAY_TIMBRE_TARGET_INSTANCE_ID) {
      return { suppressDefaultPlayerMove: true };
    }

    if (activation.targetInstanceId === NETHER_END_OF_HALLWAY_DOOR_HANDLE_TARGET_INSTANCE_ID) {
      return { suppressDefaultPlayerMove: true };
    }

    if (activation.targetInstanceId === NETHER_END_OF_HALLWAY_ASCENDING_PIPES_TARGET_INSTANCE_ID) {
      this.showAscendingPipesThought();
      return { suppressDefaultPlayerMove: true };
    }

    if (activation.targetInstanceId === NETHER_END_OF_HALLWAY_WHEEL_VALVE_TARGET_INSTANCE_ID) {
      return { suppressDefaultPlayerMove: true };
    }

    return undefined;
  }
}

function createNetherEndOfHallwayTimbreActionMenuDefinition(
  localization: RoccoLocalization,
): RoccoActionMenuDefinition {
  return {
    id: NETHER_END_OF_HALLWAY_TIMBRE_ACTION_MENU_ID,
    targetInstanceIds: [NETHER_END_OF_HALLWAY_TIMBRE_TARGET_INSTANCE_ID],
    renderLayer: 'ui.action-menu',
    itemSize: NETHER_END_OF_HALLWAY_TIMBRE_ACTION_MENU_ITEM_SIZE,
    orbitRadius: NETHER_END_OF_HALLWAY_TIMBRE_ACTION_MENU_ORBIT_RADIUS,
    orbitSpeedRadiansPerSecond: NETHER_END_OF_HALLWAY_TIMBRE_ACTION_MENU_ORBIT_SPEED,
    hoverScale: 1.16,
    circleFill: '#0f1610',
    circleStroke: '#d7e6c5',
    circleStrokeWidth: 2,
    items: [
      {
        id: 'see',
        actionId: 'look',
        label: localization.text.actions.see,
        imageUri: ROCCO_ACTION_MENU_ASSETS.look,
      },
      {
        id: 'press',
        actionId: 'press',
        label: localization.text.actions.press,
        imageUri: ROCCO_ACTION_MENU_ASSETS.grab,
      },
    ],
  };
}

function createNetherEndOfHallwayDoorHandleActionMenuDefinition(
  localization: RoccoLocalization,
): RoccoActionMenuDefinition {
  return {
    id: NETHER_END_OF_HALLWAY_DOOR_HANDLE_ACTION_MENU_ID,
    targetInstanceIds: [NETHER_END_OF_HALLWAY_DOOR_HANDLE_TARGET_INSTANCE_ID],
    renderLayer: 'ui.action-menu',
    itemSize: NETHER_END_OF_HALLWAY_DOOR_HANDLE_ACTION_MENU_ITEM_SIZE,
    orbitRadius: NETHER_END_OF_HALLWAY_DOOR_HANDLE_ACTION_MENU_ORBIT_RADIUS,
    orbitSpeedRadiansPerSecond: NETHER_END_OF_HALLWAY_DOOR_HANDLE_ACTION_MENU_ORBIT_SPEED,
    hoverScale: 1.16,
    circleFill: '#0f1610',
    circleStroke: '#d7e6c5',
    circleStrokeWidth: 2,
    items: [
      {
        id: 'see',
        actionId: 'look',
        label: localization.text.actions.see,
        imageUri: ROCCO_ACTION_MENU_ASSETS.look,
      },
      {
        id: 'grab',
        actionId: 'grab',
        label: localization.text.actions.grab,
        imageUri: ROCCO_ACTION_MENU_ASSETS.grab,
      },
    ],
  };
}

function createNetherEndOfHallwayWheelValveActionMenuDefinition(
  localization: RoccoLocalization,
): RoccoActionMenuDefinition {
  return {
    id: NETHER_END_OF_HALLWAY_WHEEL_VALVE_ACTION_MENU_ID,
    targetInstanceIds: [NETHER_END_OF_HALLWAY_WHEEL_VALVE_TARGET_INSTANCE_ID],
    renderLayer: 'ui.action-menu',
    itemSize: NETHER_END_OF_HALLWAY_WHEEL_VALVE_ACTION_MENU_ITEM_SIZE,
    orbitRadius: NETHER_END_OF_HALLWAY_WHEEL_VALVE_ACTION_MENU_ORBIT_RADIUS,
    orbitSpeedRadiansPerSecond: NETHER_END_OF_HALLWAY_WHEEL_VALVE_ACTION_MENU_ORBIT_SPEED,
    hoverScale: 1.16,
    circleFill: '#0f1610',
    circleStroke: '#d7e6c5',
    circleStrokeWidth: 2,
    items: [
      {
        id: 'look',
        actionId: 'look',
        label: localization.text.actions.look,
        imageUri: ROCCO_ACTION_MENU_ASSETS.look,
      },
      {
        id: 'grab',
        actionId: 'grab',
        label: localization.text.actions.grab,
        imageUri: ROCCO_ACTION_MENU_ASSETS.grab,
      },
    ],
  };
}
