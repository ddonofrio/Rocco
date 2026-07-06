import type { RoccoCartridgeActionResult, RoccoSceneClickAction } from '../../../../engine/cartridges';
import type { RoccoEngine } from '../../../../engine/engine-sdk';
import type {
  RoccoActionMenuActivation,
  RoccoActionMenuDefinition,
} from '../../../../engine/video/action-menu';
import type { RoccoPlaneScene } from '../../../../engine/video/planes';
import type {
  RoccoFacingDirection,
  RoccoPoint,
  RoccoSpriteDefinition,
} from '../../../../engine/video/sprites';
import type { RoccoLocalization } from '../../localization';
import {
  roccoDefaultActionMenuAssetUrls,
  roccoDefaultYouLoseSoundUrl,
} from '../../rocco-default-assets';
import {
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_ROCCO_GREEN_BLACK,
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
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
  type RoccoLevelRestartRequest,
} from '../rocco-level-types';
import { netherAmbientSteamMachineAssetUrl, netherConsoleHardwareSpawnAssetUrls } from './nether-assets';
import {
  createNetherArrivalPortalSpriteDefinition,
  createNetherArrivalSmokeSpriteDefinition,
  NETHER_ARRIVAL_PORTAL_DEFINITION_ID,
  NETHER_ARRIVAL_PORTAL_FRAME_DURATION_MS,
  NETHER_ARRIVAL_PORTAL_INSTANCE_ID,
  NETHER_ARRIVAL_PORTAL_LOOP_SOUND_ID,
  NETHER_ARRIVAL_PORTAL_LOOP_SOUND_URL,
  NETHER_ARRIVAL_PORTAL_OPEN_ANIMATION_ID,
  NETHER_ARRIVAL_SMOKE_ANIMATION_ID,
  NETHER_ARRIVAL_SMOKE_DEFINITION_ID,
  NETHER_ARRIVAL_SMOKE_FRAME_DURATION_MS,
  NETHER_ARRIVAL_SMOKE_INSTANCE_ID,
  NETHER_ARRIVAL_SPELL_SOUND_ID,
  NETHER_ARRIVAL_SPELL_SOUND_URL,
} from './nether-arrival-effects';
import {
  createNetherWalkMapProfile,
  loadOrCreateNetherScene,
  projectOriginToWalkMap,
  toOriginFromGroundPoint,
  type RoccoNetherSceneDefinition,
} from './nether-level-support';

export const ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID = 'nether-console-hardware-spawn';
export const ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_SCENE_ID =
  'rocco-nether-console-hardware-spawn-scene';

const NETHER_ENTRY_CONNECTOR_ID = 'entry';
const NETHER_FORWARD_CONNECTOR_ID = 'north';
const NETHER_AMBIENT_SOUND_ID = 'rocco-nether-steam-machine-ambient-sound';
const NETHER_AMBIENT_SOUND_VOLUME = 0.2;
const NETHER_AMBIENT_SOUND_LEFT_BONUS = 0.05;
const NETHER_AMBIENT_SOUND_VOLUME_UPDATE_EPSILON = 0.001;
const NETHER_LIGHTS_PLANE_ID = 'rocco-nether-console-hardware-spawn-lights';
const NETHER_ROCCO_SCALE = ((DEFAULT_SPRITE_SCALE * 1.2 * 1.8) / 2) * 1.2 * 1.1;
const NETHER_ROCCO_TINT = '#b3b3b3';
const NETHER_ROCCO_CONTRAST = 1.2;
const NETHER_ROCCO_CONTRAST_RESPONSE = 0.25;
const NETHER_RIGHT_FAR_SCALE = 0.1375;
const NETHER_LEFT_FAR_SCALE = 0.275;
const NETHER_SCALE_START_HEIGHT_FROM_BOTTOM = 100;
const NETHER_SCALE_START_Y = DEFAULT_DESIGN_HEIGHT - NETHER_SCALE_START_HEIGHT_FROM_BOTTOM;
const NETHER_FORWARD_TRIGGER_Y = Math.round(DEFAULT_DESIGN_HEIGHT / 2) + 50;
const NETHER_SCALE_LEFT_REGION = {
  x: 0,
  y: 0,
  width: DEFAULT_DESIGN_WIDTH / 2,
  height: DEFAULT_DESIGN_HEIGHT,
} as const;
const NETHER_SCALE_RIGHT_REGION = {
  x: DEFAULT_DESIGN_WIDTH / 2,
  y: 0,
  width: DEFAULT_DESIGN_WIDTH / 2,
  height: DEFAULT_DESIGN_HEIGHT,
} as const;
const NETHER_ENTRY_GROUND_POINT = {
  x: Math.round(DEFAULT_DESIGN_WIDTH * 0.5),
  y: Math.round(DEFAULT_DESIGN_HEIGHT * 0.72),
} as const;
const NETHER_ARRIVAL_ROCCO_GROUND_POINT = {
  x: 851,
  y: 452,
} as const;
const NETHER_ENTRY_POSITION = {
  x: Math.round(NETHER_ENTRY_GROUND_POINT.x - DEFAULT_SPRITE_GROUND_ANCHOR_X * NETHER_ROCCO_SCALE),
  y: Math.round(NETHER_ENTRY_GROUND_POINT.y - DEFAULT_SPRITE_GROUND_ANCHOR_Y * NETHER_ROCCO_SCALE),
} as const;
const NETHER_ARRIVAL_ROCCO_POSITION = toOriginFromGroundPoint(
  NETHER_ARRIVAL_ROCCO_GROUND_POINT,
  NETHER_ROCCO_SCALE,
);
const NETHER_FORWARD_RETURN_GROUND_POINT = {
  x: 738,
  y: NETHER_FORWARD_TRIGGER_Y,
} as const;
const NETHER_FORWARD_RETURN_POSITION = toOriginFromGroundPoint(
  NETHER_FORWARD_RETURN_GROUND_POINT,
  NETHER_ROCCO_SCALE,
);
const NETHER_ARRIVAL_PORTAL_TARGET_HEIGHT = 64.8;
const NETHER_ARRIVAL_SMOKE_TARGET_HEIGHT = 125;
const NETHER_ARRIVAL_THOUGHT_TTL_MS = 3600;
const NETHER_ARRIVAL_PORTAL_LOOP_SOUND_VOLUME = 0.5;
const NETHER_ARRIVAL_SPELL_SOUND_VOLUME = 0.42;
const NETHER_ARRIVAL_PORTAL_OPEN_FRAME_COUNT = 8;
const NETHER_LIGHTS_MIN_OPACITY = 0;
const NETHER_LIGHTS_NOISE_MAX_OPACITY = 0.15;
const NETHER_LIGHTS_NOISE_STEP_MIN_MS = 70;
const NETHER_LIGHTS_NOISE_STEP_MAX_MS = 220;
const NETHER_LIGHTS_NOISE_SMOOTHING_MS = 120;
const NETHER_LIGHTS_PULSE_UPDATE_EPSILON = 0.001;
const NETHER_BACKGROUND_BASE_CONTRAST = 1;
const NETHER_BACKGROUND_CONTRAST_RESPONSE = 0.25;
const NETHER_SECURITY_CAMERA_SPRITE_DEFINITION_ID =
  'rocco-nether-console-hardware-spawn-security-camera';
const NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID =
  'rocco-nether-console-hardware-spawn-security-camera-instance';
const NETHER_SECURITY_CAMERA_IMAGE_ID_PREFIX =
  'rocco-nether-console-hardware-spawn-security-camera-image';
const NETHER_SECURITY_CAMERA_FRAME_ID_PREFIX =
  'rocco-nether-console-hardware-spawn-security-camera-frame';
const NETHER_SECURITY_CAMERA_SWEEP_ANIMATION_ID = 'nether-security-camera-sweep';
const NETHER_SECURITY_CAMERA_DISABLED_ANIMATION_ID = 'nether-security-camera-disabled';
const NETHER_SECURITY_CAMERA_ACTION_MENU_ID =
  'rocco-nether-console-hardware-spawn-security-camera-action-menu';
const NETHER_SECURITY_CAMERA_SOURCE_WIDTH = 330;
const NETHER_SECURITY_CAMERA_SOURCE_HEIGHT = 220;
const NETHER_SECURITY_CAMERA_TARGET_WIDTH = 125;
const NETHER_SECURITY_CAMERA_TARGET_HEIGHT = 83;
const NETHER_SECURITY_CAMERA_FRAME_DURATION_MS = 1200;
const NETHER_SECURITY_CAMERA_MESSAGE_TTL_MS = 5200;
const NETHER_SECURITY_CAMERA_ACTION_MENU_ITEM_SIZE = 92;
const NETHER_SECURITY_CAMERA_ACTION_MENU_ORBIT_RADIUS = 88;
const NETHER_SECURITY_CAMERA_ACTION_MENU_ORBIT_SPEED = 0.08;
const NETHER_SECURITY_CAMERA_POSITION = {
  x: 839,
  y: 81,
} as const;
const NETHER_SECURITY_CAMERA_ROTATION = (-3 * Math.PI) / 180;
const NETHER_SECURITY_CAMERA_TINT = '#cccccc';
const NETHER_SECURITY_LEFT_SIDE_TRIGGER_MAX_X = Math.floor(DEFAULT_DESIGN_WIDTH / 2);
const NETHER_SECURITY_LEFT_SIDE_TRIGGER_DELAY_MS = 3000;
const NETHER_SECURITY_ALERT_MESSAGE_ID = 'rocco-nether-security-alert-message';
const NETHER_SECURITY_ALERT_SOUND_ID = 'rocco-nether-security-alert-sound';
const NETHER_SECURITY_ALERT_SOUND_VOLUME = 0.25;
const NETHER_SECURITY_ALERT_MESSAGE_TTL_MS = 1800;
const NETHER_SECURITY_ALERT_MESSAGE_MAX_WIDTH = 220;
const NETHER_SECURITY_ALERT_TEXT_COLOR = '#1b4ea1';
const NETHER_SECURITY_ALERT_BUBBLE_FILL = '#e6eefb';
const NETHER_SECURITY_ALERT_MESSAGE_OFFSET = {
  x: -20,
  y: 0,
} as const;
const NETHER_SECURITY_DEFEAT_FADE_PRIMITIVE_ID = 'rocco-nether-security-defeat-fade';
const NETHER_SECURITY_DEFEAT_TITLE_ID = 'rocco-nether-security-defeat-title';
const NETHER_SECURITY_DEFEAT_FADE_DURATION_MS = 1300;
const NETHER_SECURITY_DEFEAT_TITLE_DURATION_MS = 3600;
const NETHER_SECURITY_CAMERA_SCALE_X =
  NETHER_SECURITY_CAMERA_TARGET_WIDTH / NETHER_SECURITY_CAMERA_SOURCE_WIDTH;
const NETHER_SECURITY_CAMERA_SCALE_Y =
  NETHER_SECURITY_CAMERA_TARGET_HEIGHT / NETHER_SECURITY_CAMERA_SOURCE_HEIGHT;
const NETHER_PIPE_SMOKE_SPRITE_DEFINITION_ID =
  'rocco-nether-console-hardware-spawn-pipe-smoke';
const NETHER_PIPE_SMOKE_SPRITE_INSTANCE_ID =
  'rocco-nether-console-hardware-spawn-pipe-smoke-instance';
const NETHER_PIPE_SMOKE_SECOND_SPRITE_INSTANCE_ID =
  'rocco-nether-console-hardware-spawn-pipe-smoke-second-instance';
const NETHER_PIPE_SMOKE_ANIMATION_ID = 'nether-pipe-smoke-loop';
const NETHER_PIPE_SMOKE_TARGET_HEIGHT = 25;
const NETHER_PIPE_SMOKE_SECOND_TARGET_HEIGHT = NETHER_PIPE_SMOKE_TARGET_HEIGHT / 2;
const NETHER_PIPE_SMOKE_POSITION = {
  x: 146,
  y: 178,
} as const;
const NETHER_PIPE_SMOKE_SECOND_POSITION = {
  x: 209,
  y: 239,
} as const;
const NETHER_PIPE_SMOKE_ROTATION = -Math.PI / 2;
const NETHER_PIPE_SMOKE_SECOND_ROTATION = 0;
const NETHER_PIPE_SMOKE_TINT = '#808080';
const NETHER_PIPE_SMOKE_SECOND_TINT = '#c89a6a';
const NETHER_PIPE_SMOKE_RENDER_LAYER = 'world.behind';
const NETHER_PIPE_SMOKE_Z_INDEX = 18;

const netherSecurityCameraAssetUrls = [
  new URL('./assets/camera/1.png', import.meta.url).href,
  new URL('./assets/camera/2.png', import.meta.url).href,
  new URL('./assets/camera/3.png', import.meta.url).href,
  new URL('./assets/camera/4.png', import.meta.url).href,
] as const;

interface NetherSecurityCameraText {
  description: string;
  lookLines: string[];
  grabLines: string[];
  kickLines: string[];
}

const NETHER_SECURITY_CAMERA_TEXT_BY_LOCALE: Record<string, NetherSecurityCameraText> = {
  en: {
    description: 'Security camera',
    lookLines: [
      'It is a security camera.',
      'It looks like part of a surveillance system.',
      'Someone is probably watching behind it.',
      'I wonder how many of these there are around here.',
      'It looks expensive. What is inside it?',
    ],
    grabLines: [
      "I can't reach it. It's too high.",
      "Not even on tiptoe.",
      'I would need to be half a meter taller.',
      "I would have to jump, and I'm not jumping.",
    ],
    kickLines: [
      'I can barely lift my leg enough to walk.',
      "I'm not exactly in shape for kicking cameras right now.",
      'If I raise my knee any higher, I might fall apart.',
      'I would need to warm up before trying that.',
    ],
  },
  es: {
    description: 'C\u00e1mara de seguridad',
    lookLines: [
      'Es una c\u00e1mara de seguridad.',
      'Parece parte de un sistema de vigilancia.',
      'Seguro que hay alguien mirando detr\u00e1s.',
      'Me pregunto cu\u00e1ntas de estas habr\u00e1 por aqu\u00ed.',
      'Parece cara. \u00bfQu\u00e9 tendr\u00e1 adentro?',
    ],
    grabLines: [
      'No llego, est\u00e1 muy alta.',
      'Ni de puntillas la alcanzo.',
      'Tendr\u00eda que medir medio metro m\u00e1s.',
      'Como no salte... y no pienso saltar.',
    ],
    kickLines: [
      'Apenas puedo levantar mi pierna para caminar.',
      'No estoy para patear c\u00e1maras ahora mismo.',
      'Si levanto m\u00e1s la rodilla me desmonto.',
      'Necesitar\u00eda calentar antes de intentar eso.',
    ],
  },
};

function resolveNetherSecurityCameraText(
  localization: RoccoLocalization,
): NetherSecurityCameraText {
  return (
    NETHER_SECURITY_CAMERA_TEXT_BY_LOCALE[localization.locale] ??
    NETHER_SECURITY_CAMERA_TEXT_BY_LOCALE.en
  );
}

function makeNetherSecurityCameraMessageResult(text: string[], historyKey: string) {
  return {
    kind: 'sprite-message' as const,
    message: {
      spriteInstanceId: DEFAULT_SPRITE_INSTANCE_ID,
      mode: 'think' as const,
      text,
      lineSelection: {
        mode: 'random' as const,
        count: 1,
        historyKey,
        avoidImmediateRepeat: true,
      },
      ttlMs: NETHER_SECURITY_CAMERA_MESSAGE_TTL_MS,
    },
  };
}

function createNetherSecurityCameraActionMenuDefinition(
  localization: RoccoLocalization,
): RoccoActionMenuDefinition {
  const cameraText = resolveNetherSecurityCameraText(localization);

  return {
    id: NETHER_SECURITY_CAMERA_ACTION_MENU_ID,
    targetInstanceIds: [NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID],
    renderLayer: 'ui.action-menu',
    itemSize: NETHER_SECURITY_CAMERA_ACTION_MENU_ITEM_SIZE,
    orbitRadius: NETHER_SECURITY_CAMERA_ACTION_MENU_ORBIT_RADIUS,
    orbitSpeedRadiansPerSecond: NETHER_SECURITY_CAMERA_ACTION_MENU_ORBIT_SPEED,
    hoverScale: 1.16,
    circleFill: '#0f1610',
    circleStroke: '#d7e6c5',
    circleStrokeWidth: 2,
    items: [
      {
        id: 'look',
        actionId: 'look',
        label: localization.text.actions.look,
        imageUri: roccoDefaultActionMenuAssetUrls.look,
        result: makeNetherSecurityCameraMessageResult(
          cameraText.lookLines,
          'nether-security-camera-look',
        ),
      },
      {
        id: 'grab',
        actionId: 'grab',
        label: localization.text.actions.grab,
        imageUri: roccoDefaultActionMenuAssetUrls.grab,
        result: makeNetherSecurityCameraMessageResult(
          cameraText.grabLines,
          'nether-security-camera-grab',
        ),
      },
      {
        id: 'kick',
        actionId: 'kick',
        label: localization.text.actions.kick,
        imageUri: roccoDefaultActionMenuAssetUrls.kick,
        result: makeNetherSecurityCameraMessageResult(
          cameraText.kickLines,
          'nether-security-camera-kick',
        ),
      },
    ],
  };
}

function createNetherSecurityCameraSpriteDefinition(
  localization: RoccoLocalization,
): RoccoSpriteDefinition {
  const images = netherSecurityCameraAssetUrls.map((uri, index) => ({
    id: `${NETHER_SECURITY_CAMERA_IMAGE_ID_PREFIX}-${index + 1}`,
    uri,
    width: NETHER_SECURITY_CAMERA_SOURCE_WIDTH,
    height: NETHER_SECURITY_CAMERA_SOURCE_HEIGHT,
  }));
  const cameraText = resolveNetherSecurityCameraText(localization);
  const frameIds = images.map(
    (_, index) => `${NETHER_SECURITY_CAMERA_FRAME_ID_PREFIX}-${index + 1}`,
  );
  const disabledFrameId =
    frameIds[3] ?? `${NETHER_SECURITY_CAMERA_FRAME_ID_PREFIX}-${images.length}`;

  return {
    id: NETHER_SECURITY_CAMERA_SPRITE_DEFINITION_ID,
    name: 'Nether Security Camera',
    images,
    frames: images.map((image, index) => ({
      id: frameIds[index] ?? `${NETHER_SECURITY_CAMERA_FRAME_ID_PREFIX}-${index + 1}`,
      imageId: image.id,
      durationMs: NETHER_SECURITY_CAMERA_FRAME_DURATION_MS,
      pivot: {
        x: 0,
        y: 0,
      },
    })),
    animations: {
      [NETHER_SECURITY_CAMERA_SWEEP_ANIMATION_ID]: {
        id: NETHER_SECURITY_CAMERA_SWEEP_ANIMATION_ID,
        loop: true,
        playbackRate: 1,
        frames: [0, 1, 2, 1].map((index) => ({
          frameId: frameIds[index] ?? frameIds[0] ?? NETHER_SECURITY_CAMERA_FRAME_ID_PREFIX,
          durationMs: NETHER_SECURITY_CAMERA_FRAME_DURATION_MS,
        })),
      },
      [NETHER_SECURITY_CAMERA_DISABLED_ANIMATION_ID]: {
        id: NETHER_SECURITY_CAMERA_DISABLED_ANIMATION_ID,
        loop: false,
        playbackRate: 1,
        frames: [
          {
            frameId: disabledFrameId,
            durationMs: 1000,
          },
        ],
      },
    },
    defaultAnimation: NETHER_SECURITY_CAMERA_SWEEP_ANIMATION_ID,
    render: {
      renderLayer: 'world.behind',
      zIndex: 12,
      depthMode: 'fixed',
      opacity: 1,
    },
    visibleDescription: {
      enabled: true,
      text: cameraText.description,
    },
    ignoreMessages: true,
    metadata: {
      purpose: 'nether-security-camera',
    },
  };
}

function createNetherPipeSmokeSpriteDefinition(
  smokeDefinition: RoccoSpriteDefinition,
): RoccoSpriteDefinition {
  const animationFrames =
    smokeDefinition.animations[NETHER_ARRIVAL_SMOKE_ANIMATION_ID]?.frames.map((frame) => ({
      frameId: frame.frameId,
      durationMs: frame.durationMs,
    })) ??
    [];
  const fallbackFrame = smokeDefinition.frames[0];
  const resolvedFrames =
    animationFrames.length > 0
      ? animationFrames
      : fallbackFrame
        ? [{ frameId: fallbackFrame.id, durationMs: NETHER_ARRIVAL_SMOKE_FRAME_DURATION_MS }]
        : [];

  return {
    id: NETHER_PIPE_SMOKE_SPRITE_DEFINITION_ID,
    name: 'Nether Pipe Smoke',
    images: smokeDefinition.images.map((image) => ({ ...image })),
    frames: smokeDefinition.frames.map((frame) => ({
      ...frame,
      pivot: frame.pivot ? { ...frame.pivot } : undefined,
      rect: frame.rect ? { ...frame.rect } : undefined,
    })),
    animations: {
      [NETHER_PIPE_SMOKE_ANIMATION_ID]: {
        id: NETHER_PIPE_SMOKE_ANIMATION_ID,
        loop: true,
        playbackRate: 1,
        frames: resolvedFrames,
      },
    },
    defaultAnimation: NETHER_PIPE_SMOKE_ANIMATION_ID,
    render: {
      renderLayer: NETHER_PIPE_SMOKE_RENDER_LAYER,
      zIndex: NETHER_PIPE_SMOKE_Z_INDEX,
      depthMode: 'fixed',
      opacity: 1,
    },
    ignoreMessages: true,
    metadata: {
      purpose: 'nether-pipe-smoke',
    },
  };
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * Math.max(0, max - min);
}

type NetherArrivalSequencePhase = 'opening-portal' | 'smoke' | 'spawning-rocco';
type NetherSecurityDefeatPhase = 'warning' | 'fading' | 'title' | 'restarting';

interface NetherArrivalSequence {
  phase: NetherArrivalSequencePhase;
  elapsedMs: number;
  smokeFrameIndex: number;
}

interface NetherSecurityDefeatSequence {
  phase: NetherSecurityDefeatPhase;
  elapsedMs: number;
}

const NETHER_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: NETHER_ENTRY_CONNECTOR_ID,
    entryPoint: { ...NETHER_ENTRY_POSITION },
    entryFacing: 'down',
  },
  {
    id: NETHER_FORWARD_CONNECTOR_ID,
    exitArea: {
      x: 0,
      y: 0,
      width: DEFAULT_DESIGN_WIDTH,
      height: NETHER_FORWARD_TRIGGER_Y,
    },
    entryPoint: { ...NETHER_FORWARD_RETURN_POSITION },
    entryFacing: 'down',
  },
] as const;

const NETHER_SCENE_DEFINITION: RoccoNetherSceneDefinition = {
  sceneId: ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_SCENE_ID,
  planeIds: {
    backplate: 'rocco-nether-console-hardware-spawn-backplate',
    background: 'rocco-nether-console-hardware-spawn-background',
  },
  backgroundUri: netherConsoleHardwareSpawnAssetUrls.background,
  backgroundName: 'Nether Console Hardware Spawn Background',
  extraPlanes: [
    {
      id: NETHER_LIGHTS_PLANE_ID,
      name: 'Nether Console Hardware Spawn Lights',
      enabled: true,
      visible: true,
      source: {
        kind: 'image',
        uri: netherConsoleHardwareSpawnAssetUrls.lights,
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

export class RoccoNetherConsoleHardwareSpawnLevel implements RoccoLevel {
  readonly id = ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID;
  readonly title: string;
  readonly connectors = NETHER_CONNECTORS;

  private readonly localization: RoccoLocalization;
  private engine: RoccoEngine | null = null;
  private spriteController: RoccoDefaultSpriteController | null = null;
  private onRestartRequested: ((request?: RoccoLevelRestartRequest) => void) | null = null;
  private arrivalSequence: NetherArrivalSequence | null = null;
  private securityDefeatSequence: NetherSecurityDefeatSequence | null = null;
  private arrivalSequencePlayed = false;
  private leftSideExposureElapsedMs = 0;
  private perspectiveFarY = 0;
  private smokeScale = 1;
  private pipeSmokeScale = 1;
  private pipeSmokeSecondScale = 1;
  private pipeSmokeSecondStartFrameIndex = 0;
  private portalScale = 1;
  private smokeFrameCount = 0;
  private ambientSoundVolume = NETHER_AMBIENT_SOUND_VOLUME;
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
    this.onRestartRequested = options.onRestartRequested ?? null;
    this.arrivalSequence = null;
    this.securityDefeatSequence = null;
    this.leftSideExposureElapsedMs = 0;
    this.perspectiveFarY = 0;
    this.smokeScale = 1;
    this.pipeSmokeScale = 1;
    this.pipeSmokeSecondScale = 1;
    this.pipeSmokeSecondStartFrameIndex = 0;
    this.portalScale = 1;
    this.smokeFrameCount = 0;
    this.ambientSoundVolume = NETHER_AMBIENT_SOUND_VOLUME;
    this.lightsOverlayOpacity = NETHER_LIGHTS_MIN_OPACITY;
    this.lightsNoiseOpacity = randomBetween(NETHER_LIGHTS_MIN_OPACITY, NETHER_LIGHTS_NOISE_MAX_OPACITY);
    this.lightsNoiseTargetOpacity = this.lightsNoiseOpacity;
    this.lightsNoiseTargetRemainingMs = randomBetween(
      NETHER_LIGHTS_NOISE_STEP_MIN_MS,
      NETHER_LIGHTS_NOISE_STEP_MAX_MS,
    );
    this.sceneReady = false;

    const entryConnector = findRoccoLevelConnector(this.connectors, options.entryConnectorId);
    const isReturningFromNetherTwo = entryConnector?.id === NETHER_FORWARD_CONNECTOR_ID;
    const shouldPlayArrivalSequence =
      entryConnector?.id === NETHER_ENTRY_CONNECTOR_ID &&
      (options.forceArrivalSequence === true || !this.arrivalSequencePlayed);
    const initialPosition = isReturningFromNetherTwo
      ? { ...NETHER_FORWARD_RETURN_POSITION }
      : entryConnector
        ? {
            x: options.entryPosition?.x ?? entryConnector.entryPoint.x,
            y: entryConnector.entryPoint.y,
          }
        : { ...NETHER_ENTRY_POSITION };
    const initialFacing = entryConnector?.entryFacing ?? 'down';
    const scene = await loadOrCreateNetherScene(engine, NETHER_SCENE_DEFINITION);
    const walkMapProfile = await createNetherWalkMapProfile(netherConsoleHardwareSpawnAssetUrls.walkPath);
    this.perspectiveFarY = walkMapProfile.farY;
    const securityCameraDefinition = createNetherSecurityCameraSpriteDefinition(this.localization);
    const [smokeSprite, portalSprite] = await Promise.all([
      createNetherArrivalSmokeSpriteDefinition(),
      shouldPlayArrivalSequence
        ? createNetherArrivalPortalSpriteDefinition()
        : Promise.resolve(null),
    ]);
    const pipeSmokeDefinition = createNetherPipeSmokeSpriteDefinition(smokeSprite.definition);
    this.pipeSmokeScale = Math.max(
      0.01,
      NETHER_PIPE_SMOKE_TARGET_HEIGHT / Math.max(1, smokeSprite.initialFrameHeight),
    );
    this.pipeSmokeSecondScale = Math.max(
      0.01,
      NETHER_PIPE_SMOKE_SECOND_TARGET_HEIGHT / Math.max(1, smokeSprite.initialFrameHeight),
    );
    this.pipeSmokeSecondStartFrameIndex = Math.max(0, Math.floor(smokeSprite.frameCount / 2));

    await engine.video.preloadPlaneScene(scene);
    await Promise.all([
      engine.video.preloadSpriteDefinition(securityCameraDefinition),
      engine.video.preloadSpriteDefinition(pipeSmokeDefinition),
      shouldPlayArrivalSequence
        ? engine.video.preloadSpriteDefinition(smokeSprite.definition)
        : Promise.resolve(),
      portalSprite
        ? engine.video.preloadSpriteDefinition(portalSprite.definition)
        : Promise.resolve(),
    ]);
    engine.audio.registerSound({
      id: NETHER_AMBIENT_SOUND_ID,
      uri: netherAmbientSteamMachineAssetUrl,
      volume: NETHER_AMBIENT_SOUND_VOLUME,
      loop: true,
    });
    engine.audio.registerSound({
      id: NETHER_SECURITY_ALERT_SOUND_ID,
      uri: roccoDefaultYouLoseSoundUrl,
      volume: NETHER_SECURITY_ALERT_SOUND_VOLUME,
      loop: false,
    });
    engine.loadPlaneScene(scene);
    engine.video.sprites.loadSpriteDefinition(securityCameraDefinition);
    engine.video.sprites.loadSpriteDefinition(pipeSmokeDefinition);
    if (shouldPlayArrivalSequence) {
      engine.video.sprites.loadSpriteDefinition(smokeSprite.definition);
    }
    if (portalSprite) {
      engine.video.sprites.loadSpriteDefinition(portalSprite.definition);
    }
    this.installSecurityCamera(engine);
    this.installPipeSmoke(engine);
    this.lightsOverlayOpacity = this.lightsNoiseOpacity;
    engine.video.planes.updatePlane(
      ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_SCENE_ID,
      NETHER_LIGHTS_PLANE_ID,
      {
        opacity: this.lightsOverlayOpacity,
      },
    );
    engine.video.planes.updatePlane(
      ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_SCENE_ID,
      NETHER_SCENE_DEFINITION.planeIds.background,
      {
        contrast:
          NETHER_BACKGROUND_BASE_CONTRAST +
          this.lightsOverlayOpacity * NETHER_BACKGROUND_CONTRAST_RESPONSE,
      },
    );
    this.updateRoccoLightContrast(this.lightsOverlayOpacity);
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    engine.video.sprites.registerWalkMap(walkMapProfile.walkMap);
    await Promise.all([
      engine.audio.preloadSound(NETHER_AMBIENT_SOUND_ID).catch(() => {
        engine.log('Audio', 'Nether ambient steam machine sound could not be preloaded.');
      }),
      engine.audio.preloadSound(NETHER_SECURITY_ALERT_SOUND_ID).catch(() => {
        engine.log('Audio', 'Nether security alert sound could not be preloaded.');
      }),
    ]);
    engine.audio.playSound(NETHER_AMBIENT_SOUND_ID, {
      restart: true,
      volume: this.ambientSoundVolume,
      loop: true,
    });

    if (shouldPlayArrivalSequence && portalSprite) {
      engine.audio.registerSound({
        id: NETHER_ARRIVAL_PORTAL_LOOP_SOUND_ID,
        uri: NETHER_ARRIVAL_PORTAL_LOOP_SOUND_URL,
        volume: NETHER_ARRIVAL_PORTAL_LOOP_SOUND_VOLUME,
        loop: true,
      });
      engine.audio.registerSound({
        id: NETHER_ARRIVAL_SPELL_SOUND_ID,
        uri: NETHER_ARRIVAL_SPELL_SOUND_URL,
        volume: NETHER_ARRIVAL_SPELL_SOUND_VOLUME,
        loop: false,
      });
      await Promise.all([
        engine.audio.preloadSound(NETHER_ARRIVAL_PORTAL_LOOP_SOUND_ID).catch(() => {
          engine.log('Audio', 'Nether arrival portal loop sound could not be preloaded.');
        }),
        engine.audio.preloadSound(NETHER_ARRIVAL_SPELL_SOUND_ID).catch(() => {
          engine.log('Audio', 'Nether arrival spell sound could not be preloaded.');
        }),
      ]);
      engine.video.sprites.removeSprite(NETHER_ARRIVAL_PORTAL_INSTANCE_ID);
      engine.video.sprites.removeSprite(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);
      this.smokeScale = Math.max(
        0.01,
        NETHER_ARRIVAL_SMOKE_TARGET_HEIGHT / Math.max(1, smokeSprite.initialFrameHeight),
      );
      this.portalScale = Math.max(
        0.01,
        NETHER_ARRIVAL_PORTAL_TARGET_HEIGHT / Math.max(1, portalSprite.initialFrameHeight),
      );
      this.smokeFrameCount = smokeSprite.frameCount;
      engine.setInputEnabled(false);
      this.startArrivalSequence();
    } else {
      this.spriteController = await this.installNetherSprite(
        engine,
        initialFacing,
        isReturningFromNetherTwo
          ? { ...initialPosition }
          : projectOriginToWalkMap(walkMapProfile.walkMap, initialPosition, NETHER_ROCCO_SCALE),
      );
    }
    engine.video.render(0);
    this.sceneReady = true;

    return scene;
  }

  unmount(engine: RoccoEngine): void {
    engine.video.actionMenus.closeMenu();
    this.clearSecurityDefeatPresentation();
    engine.video.messages.clearMessages();
    engine.audio.stopSound(NETHER_AMBIENT_SOUND_ID);
    engine.audio.unregisterSound(NETHER_AMBIENT_SOUND_ID);
    engine.audio.stopSound(NETHER_SECURITY_ALERT_SOUND_ID);
    engine.audio.unregisterSound(NETHER_SECURITY_ALERT_SOUND_ID);
    engine.audio.stopSound(NETHER_ARRIVAL_PORTAL_LOOP_SOUND_ID);
    engine.audio.stopSound(NETHER_ARRIVAL_SPELL_SOUND_ID);
    engine.video.actionMenus.unregisterMenu(NETHER_SECURITY_CAMERA_ACTION_MENU_ID);
    engine.video.sprites.removeSprite(NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID);
    engine.video.sprites.removeSprite(NETHER_PIPE_SMOKE_SPRITE_INSTANCE_ID);
    engine.video.sprites.removeSprite(NETHER_PIPE_SMOKE_SECOND_SPRITE_INSTANCE_ID);
    engine.video.sprites.removeSprite(NETHER_ARRIVAL_PORTAL_INSTANCE_ID);
    engine.video.sprites.removeSprite(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);
    uninstallDefaultSprite(engine);
    engine.video.sprites.unregisterWalkMap(DEFAULT_WALK_MAP_ID);
    this.engine = null;
    this.spriteController = null;
    this.onRestartRequested = null;
    this.arrivalSequence = null;
    this.securityDefeatSequence = null;
    this.leftSideExposureElapsedMs = 0;
    this.perspectiveFarY = 0;
    this.smokeScale = 1;
    this.pipeSmokeScale = 1;
    this.pipeSmokeSecondScale = 1;
    this.pipeSmokeSecondStartFrameIndex = 0;
    this.portalScale = 1;
    this.smokeFrameCount = 0;
    this.ambientSoundVolume = NETHER_AMBIENT_SOUND_VOLUME;
    this.lightsOverlayOpacity = NETHER_LIGHTS_MIN_OPACITY;
    this.lightsNoiseOpacity = NETHER_LIGHTS_MIN_OPACITY;
    this.lightsNoiseTargetOpacity = NETHER_LIGHTS_MIN_OPACITY;
    this.lightsNoiseTargetRemainingMs = 0;
    this.sceneReady = false;
    engine.video.render(0);
  }

  update(deltaMs: number): void {
    this.updateLightsOverlay(deltaMs);
    this.updateAmbientSoundVolume();

    if (this.securityDefeatSequence) {
      this.updateSecurityDefeatSequence(deltaMs);
      return;
    }

    if (this.arrivalSequence) {
      this.updateArrivalSequence(deltaMs);
      return;
    }

    this.spriteController?.update(deltaMs);
    this.updateLeftSideSecurityWatch(deltaMs);
  }

  handleAction(_activation: RoccoActionMenuActivation): void {}

  handleSceneClick(activation: RoccoSceneClickAction): RoccoCartridgeActionResult | void {
    if (this.securityDefeatSequence) {
      return { suppressDefaultPlayerMove: true };
    }

    if (activation.targetInstanceId === NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID) {
      return { suppressDefaultPlayerMove: true };
    }
  }

  private installSecurityCamera(engine: RoccoEngine): void {
    engine.video.actionMenus.unregisterMenu(NETHER_SECURITY_CAMERA_ACTION_MENU_ID);
    engine.video.sprites.removeSprite(NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID);
    engine.video.sprites.createSpriteFromDefinition(NETHER_SECURITY_CAMERA_SPRITE_DEFINITION_ID, {
      id: NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID,
      transform: {
        x: NETHER_SECURITY_CAMERA_POSITION.x,
        y: NETHER_SECURITY_CAMERA_POSITION.y,
        scaleX: NETHER_SECURITY_CAMERA_SCALE_X,
        scaleY: NETHER_SECURITY_CAMERA_SCALE_Y,
        rotation: NETHER_SECURITY_CAMERA_ROTATION,
      },
      renderLayer: 'world.behind',
      zIndex: 12,
      depthMode: 'fixed',
      interactive: true,
      collisionEnabled: false,
      tint: NETHER_SECURITY_CAMERA_TINT,
      ignoreMessages: true,
    });
    engine.video.actionMenus.registerMenu(
      createNetherSecurityCameraActionMenuDefinition(this.localization),
    );
    engine.video.sprites.playAnimation(
      NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID,
      NETHER_SECURITY_CAMERA_SWEEP_ANIMATION_ID,
      {
        restart: true,
      },
    );
  }

  private installPipeSmoke(engine: RoccoEngine): void {
    engine.video.sprites.removeSprite(NETHER_PIPE_SMOKE_SPRITE_INSTANCE_ID);
    engine.video.sprites.removeSprite(NETHER_PIPE_SMOKE_SECOND_SPRITE_INSTANCE_ID);
    engine.video.sprites.createSpriteFromDefinition(NETHER_PIPE_SMOKE_SPRITE_DEFINITION_ID, {
      id: NETHER_PIPE_SMOKE_SPRITE_INSTANCE_ID,
      transform: {
        x: NETHER_PIPE_SMOKE_POSITION.x,
        y: NETHER_PIPE_SMOKE_POSITION.y,
        scaleX: this.pipeSmokeScale,
        scaleY: this.pipeSmokeScale,
        rotation: NETHER_PIPE_SMOKE_ROTATION,
      },
      renderLayer: NETHER_PIPE_SMOKE_RENDER_LAYER,
      zIndex: NETHER_PIPE_SMOKE_Z_INDEX,
      depthMode: 'fixed',
      interactive: false,
      collisionEnabled: false,
      tint: NETHER_PIPE_SMOKE_TINT,
      ignoreMessages: true,
    });
    engine.video.sprites.playAnimation(
      NETHER_PIPE_SMOKE_SPRITE_INSTANCE_ID,
      NETHER_PIPE_SMOKE_ANIMATION_ID,
      {
        restart: true,
      },
    );
    engine.video.sprites.createSpriteFromDefinition(NETHER_PIPE_SMOKE_SPRITE_DEFINITION_ID, {
      id: NETHER_PIPE_SMOKE_SECOND_SPRITE_INSTANCE_ID,
      transform: {
        x: NETHER_PIPE_SMOKE_SECOND_POSITION.x,
        y: NETHER_PIPE_SMOKE_SECOND_POSITION.y,
        scaleX: this.pipeSmokeSecondScale,
        scaleY: this.pipeSmokeSecondScale,
        rotation: NETHER_PIPE_SMOKE_SECOND_ROTATION,
      },
      renderLayer: NETHER_PIPE_SMOKE_RENDER_LAYER,
      zIndex: NETHER_PIPE_SMOKE_Z_INDEX,
      depthMode: 'fixed',
      interactive: false,
      collisionEnabled: false,
      tint: NETHER_PIPE_SMOKE_SECOND_TINT,
      ignoreMessages: true,
    });
    engine.video.sprites.playAnimation(
      NETHER_PIPE_SMOKE_SECOND_SPRITE_INSTANCE_ID,
      NETHER_PIPE_SMOKE_ANIMATION_ID,
      {
        restart: true,
      },
    );
    engine.video.sprites.setAnimationFrame(
      NETHER_PIPE_SMOKE_SECOND_SPRITE_INSTANCE_ID,
      this.pipeSmokeSecondStartFrameIndex,
    );
  }

  private updateLeftSideSecurityWatch(deltaMs: number): void {
    if (
      !this.engine ||
      !Number.isFinite(deltaMs) ||
      deltaMs <= 0 ||
      this.arrivalSequence ||
      this.securityDefeatSequence
    ) {
      return;
    }

    const currentGroundPoint = this.resolvePlayerGroundPoint();
    if (!currentGroundPoint || currentGroundPoint.x > NETHER_SECURITY_LEFT_SIDE_TRIGGER_MAX_X) {
      this.leftSideExposureElapsedMs = 0;
      return;
    }

    this.leftSideExposureElapsedMs += deltaMs;
    if (this.leftSideExposureElapsedMs < NETHER_SECURITY_LEFT_SIDE_TRIGGER_DELAY_MS) {
      return;
    }

    this.startSecurityDefeatSequence();
  }

  private startSecurityDefeatSequence(): void {
    if (!this.engine || this.securityDefeatSequence) {
      return;
    }

    this.leftSideExposureElapsedMs = NETHER_SECURITY_LEFT_SIDE_TRIGGER_DELAY_MS;
    this.engine.video.actionMenus.closeMenu();
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.gridMenus.clearCarriedItem();
    this.engine.video.messages.clearMessages();
    this.engine.video.sprites.stopMovement(DEFAULT_SPRITE_INSTANCE_ID);
    this.engine.setInputEnabled(false);
    this.securityDefeatSequence = {
      phase: 'warning',
      elapsedMs: 0,
    };
    this.showSecurityAlertMessage();
    this.engine.video.render(0);
  }

  private showSecurityAlertMessage(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.messages.say(
      NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID,
      this.resolveSecurityAlertLine(),
      {
        id: NETHER_SECURITY_ALERT_MESSAGE_ID,
        background: true,
        ttlMs: NETHER_SECURITY_ALERT_MESSAGE_TTL_MS,
        side: 'left',
        offset: NETHER_SECURITY_ALERT_MESSAGE_OFFSET,
        maxWidth: NETHER_SECURITY_ALERT_MESSAGE_MAX_WIDTH,
        zIndex: 5000,
        style: {
          fill: NETHER_SECURITY_ALERT_TEXT_COLOR,
          bubbleFill: NETHER_SECURITY_ALERT_BUBBLE_FILL,
          bubbleStroke: NETHER_SECURITY_ALERT_TEXT_COLOR,
          bubbleStrokeWidth: 2,
        },
      },
    );
  }

  private resolveSecurityAlertLine(): string {
    return this.localization.locale === 'es' ? 'Seguridad' : 'Security';
  }

  private updateSecurityDefeatSequence(deltaMs: number): void {
    if (
      !this.engine ||
      !this.securityDefeatSequence ||
      !Number.isFinite(deltaMs) ||
      deltaMs <= 0
    ) {
      return;
    }

    if (this.securityDefeatSequence.phase === 'restarting') {
      return;
    }

    if (this.securityDefeatSequence.phase === 'warning') {
      const elapsedMs = this.securityDefeatSequence.elapsedMs + deltaMs;
      this.securityDefeatSequence = {
        ...this.securityDefeatSequence,
        elapsedMs,
      };
      if (elapsedMs < NETHER_SECURITY_ALERT_MESSAGE_TTL_MS) {
        return;
      }

      this.beginSecurityDefeatFade();
      return;
    }

    if (this.securityDefeatSequence.phase === 'fading') {
      const elapsedMs = Math.min(
        NETHER_SECURITY_DEFEAT_FADE_DURATION_MS,
        this.securityDefeatSequence.elapsedMs + deltaMs,
      );
      this.securityDefeatSequence = {
        ...this.securityDefeatSequence,
        elapsedMs,
      };
      this.addSecurityDefeatFadePrimitive(
        elapsedMs / NETHER_SECURITY_DEFEAT_FADE_DURATION_MS,
      );

      if (elapsedMs >= NETHER_SECURITY_DEFEAT_FADE_DURATION_MS) {
        this.showSecurityDefeatTitle();
      }
      return;
    }

    const elapsedMs = this.securityDefeatSequence.elapsedMs + deltaMs;
    if (elapsedMs < NETHER_SECURITY_DEFEAT_TITLE_DURATION_MS) {
      this.securityDefeatSequence = {
        ...this.securityDefeatSequence,
        elapsedMs,
      };
      return;
    }

    this.finishSecurityDefeat();
  }

  private beginSecurityDefeatFade(): void {
    if (!this.engine || !this.securityDefeatSequence) {
      return;
    }

    this.securityDefeatSequence = {
      phase: 'fading',
      elapsedMs: 0,
    };
    this.engine.video.messages.removeMessage(NETHER_SECURITY_ALERT_MESSAGE_ID);
    this.engine.audio.playSound(NETHER_SECURITY_ALERT_SOUND_ID, {
      restart: true,
      volume: NETHER_SECURITY_ALERT_SOUND_VOLUME,
    });
    this.addSecurityDefeatFadePrimitive(0);
    this.engine.video.render(0);
  }

  private showSecurityDefeatTitle(): void {
    if (!this.engine || !this.securityDefeatSequence) {
      return;
    }

    this.securityDefeatSequence = {
      ...this.securityDefeatSequence,
      phase: 'title',
      elapsedMs: 0,
    };
    this.engine.video.titles.addTitle({
      id: NETHER_SECURITY_DEFEAT_TITLE_ID,
      text: this.localization.text.keys.defeatTitle,
      renderLayer: 'overlay.titles',
      zIndex: 5000,
      x: DEFAULT_DESIGN_WIDTH / 2,
      y: DEFAULT_DESIGN_HEIGHT / 2,
      anchor: { x: 0.5, y: 0.5 },
      style: {
        fill: '#cbd6c0',
        fontFamily: 'Cascadia Mono, Lucida Console, monospace',
        fontSize: 42,
        fontWeight: '700',
        align: 'center',
        stroke: {
          color: '#1f2a20',
          width: 6,
          alpha: 0.95,
        },
      },
      visible: true,
    });
    this.engine.video.render(0);
  }

  private finishSecurityDefeat(): void {
    if (!this.engine) {
      return;
    }

    const onRestartRequested = this.onRestartRequested;
    this.securityDefeatSequence = {
      phase: 'restarting',
      elapsedMs: 0,
    };
    this.clearSecurityDefeatPresentation();
    this.engine.setInputEnabled(true);
    onRestartRequested?.({
      levelId: ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID,
      entryConnectorId: NETHER_ENTRY_CONNECTOR_ID,
      forceArrivalSequence: true,
    });
  }

  private addSecurityDefeatFadePrimitive(alpha: number): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.primitives.addPrimitive({
      id: NETHER_SECURITY_DEFEAT_FADE_PRIMITIVE_ID,
      kind: 'rect',
      renderLayer: 'overlay.primitives',
      zIndex: 5000,
      color: DEFAULT_ROCCO_GREEN_BLACK,
      alpha: clampUnit(alpha),
      visible: true,
      x: 0,
      y: 0,
      width: DEFAULT_DESIGN_WIDTH,
      height: DEFAULT_DESIGN_HEIGHT,
      fill: true,
    });
    this.engine.video.render(0);
  }

  private clearSecurityDefeatPresentation(): void {
    if (!this.engine) {
      return;
    }

    this.securityDefeatSequence = null;
    this.leftSideExposureElapsedMs = 0;
    this.engine.audio.stopSound(NETHER_SECURITY_ALERT_SOUND_ID);
    this.engine.video.messages.removeMessage(NETHER_SECURITY_ALERT_MESSAGE_ID);
    this.engine.video.titles.removeTitle(NETHER_SECURITY_DEFEAT_TITLE_ID);
    this.engine.video.primitives.removePrimitive(NETHER_SECURITY_DEFEAT_FADE_PRIMITIVE_ID);
    this.engine.video.render(0);
  }

  private updateAmbientSoundVolume(): void {
    if (!this.engine) {
      return;
    }

    const sprite = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    const x = sprite?.transform.x ?? DEFAULT_DESIGN_WIDTH;
    const clampedX = Math.min(DEFAULT_DESIGN_WIDTH, Math.max(0, x));
    const leftness = 1 - clampedX / DEFAULT_DESIGN_WIDTH;
    const nextVolume = NETHER_AMBIENT_SOUND_VOLUME + leftness * NETHER_AMBIENT_SOUND_LEFT_BONUS;

    if (Math.abs(nextVolume - this.ambientSoundVolume) < NETHER_AMBIENT_SOUND_VOLUME_UPDATE_EPSILON) {
      return;
    }

    this.ambientSoundVolume = nextVolume;
    this.engine.audio.setSoundVolume(NETHER_AMBIENT_SOUND_ID, nextVolume);
  }

  private updateRoccoLightContrast(lightOpacity: number): void {
    if (!this.engine) {
      return;
    }

    const sprite = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!sprite) {
      return;
    }

    const nextContrast = NETHER_ROCCO_CONTRAST + lightOpacity * NETHER_ROCCO_CONTRAST_RESPONSE;
    if (Math.abs((sprite.contrast ?? 1) - nextContrast) < NETHER_LIGHTS_PULSE_UPDATE_EPSILON) {
      return;
    }

    this.engine.video.sprites.setContrast(DEFAULT_SPRITE_INSTANCE_ID, nextContrast);
  }

  private updateLightsOverlay(deltaMs: number): void {
    if (!this.engine || !this.sceneReady || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    if (
      !this.engine.video.planes.resolvePlane(
        ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_SCENE_ID,
        NETHER_LIGHTS_PLANE_ID,
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
      ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_SCENE_ID,
      NETHER_LIGHTS_PLANE_ID,
      {
        opacity: nextOpacity,
      },
    );
    this.engine.video.planes.updatePlane(
      ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_SCENE_ID,
      NETHER_SCENE_DEFINITION.planeIds.background,
      {
        contrast:
          NETHER_BACKGROUND_BASE_CONTRAST + nextOpacity * NETHER_BACKGROUND_CONTRAST_RESPONSE,
      },
    );
    this.updateRoccoLightContrast(nextOpacity);
  }

  private async installNetherSprite(
    engine: RoccoEngine,
    initialFacing: RoccoFacingDirection,
    initialPosition: RoccoPoint,
  ): Promise<RoccoDefaultSpriteController> {
    return installDefaultSprite(engine, {
      initialFacing,
      initialPosition,
      scale: NETHER_ROCCO_SCALE,
      tint: NETHER_ROCCO_TINT,
      contrast: NETHER_ROCCO_CONTRAST,
      localization: this.localization,
      playIntro: false,
      perspectiveAutoAdjust: {
        farY: this.perspectiveFarY,
        nearY: NETHER_SCALE_START_Y,
        farScale: NETHER_RIGHT_FAR_SCALE,
        nearScale: 1,
        scaleCurve: 'linear',
        speedScale: true,
        speedScaleMode: 'vertical-only',
        regions: [
          {
            region: NETHER_SCALE_LEFT_REGION,
            farScale: NETHER_LEFT_FAR_SCALE,
          },
          {
            region: NETHER_SCALE_RIGHT_REGION,
            farScale: NETHER_RIGHT_FAR_SCALE,
          },
        ],
      },
    });
  }

  private startArrivalSequence(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.sprites.removeSprite(DEFAULT_SPRITE_INSTANCE_ID);
    this.engine.setPlayerSprite(null);
    this.engine.video.sprites.removeSprite(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);
    this.engine.video.sprites.removeSprite(NETHER_ARRIVAL_PORTAL_INSTANCE_ID);
    this.engine.video.sprites.createSpriteFromDefinition(NETHER_ARRIVAL_PORTAL_DEFINITION_ID, {
      id: NETHER_ARRIVAL_PORTAL_INSTANCE_ID,
      transform: {
        x: NETHER_ARRIVAL_ROCCO_GROUND_POINT.x,
        y: NETHER_ARRIVAL_ROCCO_GROUND_POINT.y,
        scaleX: this.portalScale,
        scaleY: this.portalScale,
        rotation: 0,
      },
      renderLayer: 'world.front',
      zIndex: 21,
      depthMode: 'fixed',
      interactive: false,
      collisionEnabled: false,
      ignoreMessages: true,
    });
    this.engine.video.sprites.playAnimation(
      NETHER_ARRIVAL_PORTAL_INSTANCE_ID,
      NETHER_ARRIVAL_PORTAL_OPEN_ANIMATION_ID,
      {
        restart: true,
      },
    );
    this.engine.audio.stopSound(NETHER_ARRIVAL_PORTAL_LOOP_SOUND_ID);
    this.engine.audio.playSound(NETHER_ARRIVAL_PORTAL_LOOP_SOUND_ID);
    this.arrivalSequence = {
      phase: 'opening-portal',
      elapsedMs: 0,
      smokeFrameIndex: 0,
    };
    this.engine.video.render(0);
  }

  private updateArrivalSequence(deltaMs: number): void {
    if (!this.engine || !this.arrivalSequence || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    if (this.arrivalSequence.phase === 'spawning-rocco') {
      return;
    }

    if (this.arrivalSequence.phase === 'opening-portal') {
      const nextElapsedMs = this.arrivalSequence.elapsedMs + deltaMs;
      this.arrivalSequence = {
        ...this.arrivalSequence,
        elapsedMs: nextElapsedMs,
      };
      if (
        nextElapsedMs <
        NETHER_ARRIVAL_PORTAL_OPEN_FRAME_COUNT * NETHER_ARRIVAL_PORTAL_FRAME_DURATION_MS
      ) {
        return;
      }

      this.spawnArrivalSmokeSprite();
      this.engine.audio.playSound(NETHER_ARRIVAL_SPELL_SOUND_ID);
      this.arrivalSequence = {
        phase: 'smoke',
        elapsedMs: 0,
        smokeFrameIndex: 0,
      };
      return;
    }

    const nextElapsedMs = this.arrivalSequence.elapsedMs + deltaMs;
    const nextFrameIndex = Math.min(
      Math.max(0, this.smokeFrameCount - 1),
      Math.floor(nextElapsedMs / NETHER_ARRIVAL_SMOKE_FRAME_DURATION_MS),
    );
    if (nextFrameIndex !== this.arrivalSequence.smokeFrameIndex) {
      this.engine.video.sprites.setAnimationFrame(NETHER_ARRIVAL_SMOKE_INSTANCE_ID, nextFrameIndex);
    }
    this.arrivalSequence = {
      ...this.arrivalSequence,
      elapsedMs: nextElapsedMs,
      smokeFrameIndex: nextFrameIndex,
    };

    if (nextElapsedMs < this.smokeFrameCount * NETHER_ARRIVAL_SMOKE_FRAME_DURATION_MS) {
      return;
    }

    this.arrivalSequence = {
      phase: 'spawning-rocco',
      elapsedMs: nextElapsedMs,
      smokeFrameIndex: nextFrameIndex,
    };
    void this.finishArrivalSequence();
  }

  private spawnArrivalSmokeSprite(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.sprites.removeSprite(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);
    this.engine.video.sprites.createSpriteFromDefinition(NETHER_ARRIVAL_SMOKE_DEFINITION_ID, {
      id: NETHER_ARRIVAL_SMOKE_INSTANCE_ID,
      transform: {
        x: NETHER_ARRIVAL_ROCCO_GROUND_POINT.x,
        y: NETHER_ARRIVAL_ROCCO_GROUND_POINT.y,
        scaleX: this.smokeScale,
        scaleY: this.smokeScale,
        rotation: 0,
      },
      renderLayer: 'world.front',
      zIndex: 22,
      depthMode: 'fixed',
      interactive: false,
      collisionEnabled: false,
      ignoreMessages: true,
    });
    this.engine.video.sprites.stopAnimation(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);
    this.engine.video.sprites.setAnimationFrame(NETHER_ARRIVAL_SMOKE_INSTANCE_ID, 0);
    this.engine.video.render(0);
  }

  private async finishArrivalSequence(): Promise<void> {
    if (!this.engine) {
      return;
    }

    const engine = this.engine;
    engine.audio.stopSound(NETHER_ARRIVAL_PORTAL_LOOP_SOUND_ID);
    engine.video.sprites.removeSprite(NETHER_ARRIVAL_PORTAL_INSTANCE_ID);
    engine.video.sprites.removeSprite(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);

    try {
      this.spriteController = await this.installNetherSprite(engine, 'down-left', {
        ...NETHER_ARRIVAL_ROCCO_POSITION,
      });
      engine.video.sprites.setPosition(
        DEFAULT_SPRITE_INSTANCE_ID,
        NETHER_ARRIVAL_ROCCO_POSITION.x,
        NETHER_ARRIVAL_ROCCO_POSITION.y,
        {
          constrainToWalkMap: false,
        },
      );
      engine.video.sprites.playAction(DEFAULT_SPRITE_INSTANCE_ID, DEFAULT_SPRITE_IDLE_ACTION_ID, {
        direction: 'down-left',
        restart: true,
      });
      engine.video.messages.think(DEFAULT_SPRITE_INSTANCE_ID, this.resolveArrivalThoughtLine(), {
        ttlMs: NETHER_ARRIVAL_THOUGHT_TTL_MS,
      });
      this.arrivalSequencePlayed = true;
    } catch (error) {
      engine.log('System', `Nether arrival sequence failed: ${String(error)}`);
    } finally {
      engine.setInputEnabled(true);
      this.arrivalSequence = null;
      engine.video.render(0);
    }
  }

  private resolvePlayerGroundPoint(): RoccoPoint | undefined {
    const player = this.engine?.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!player) {
      return undefined;
    }

    return {
      x: player.transform.x + DEFAULT_SPRITE_GROUND_ANCHOR_X * (player.transform.scaleX || 1),
      y: player.transform.y + DEFAULT_SPRITE_GROUND_ANCHOR_Y * (player.transform.scaleY || 1),
    };
  }

  private resolveArrivalThoughtLine(): string {
    if (this.localization.locale === 'es') {
      return '\u00bfqu\u00e9 es este lugar?';
    }

    return 'What is this place?';
  }
}
