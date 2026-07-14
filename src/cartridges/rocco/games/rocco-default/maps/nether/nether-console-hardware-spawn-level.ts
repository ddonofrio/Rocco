import type { RoccoCartridgeActionResult, RoccoSceneClickAction } from '../../../../../../console/cartridges';
import type { RoccoEngine } from '../../../../../../console/engine-sdk';
import type {
  RoccoActionMenuActivation,
  RoccoActionMenuDefinition,
} from '../../../../../../console/video/action-menu';
import type { RoccoGridMenuActivation } from '../../../../../../console/video/grid-menu';
import type { RoccoPlaneScene } from '../../../../../../console/video/planes';
import type {
  RoccoFacingDirection,
  RoccoPoint,
  RoccoSpriteDefinition,
} from '../../../../../../console/video/sprites';
import type { RoccoLocalization } from '../../localization';
import {
  RoccoDialogueSession,
  createRoccoDialogueChoiceMenu,
  roccoCartridgeMessageRuntime,
  resolveRoccoDialogueChoice,
  type RoccoDialogueLine,
} from '../../../../rpce/dialogue';
import {
  roccoDefaultActionMenuAssetUrls,
  roccoDefaultYouLoseSoundUrl,
} from '../../sprites';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
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
} from '../../constants';
import {
  installDefaultSprite,
  uninstallDefaultSprite,
  type RoccoDefaultSpriteController,
} from '../../sprites';
import { RoccoScriptedSceneInteractionController } from '../../../../scripted-scene-interaction-controller';
import {
  ROCCO_LAB_COAT_PLAYER_APPEARANCE,
  type RoccoPlayerAppearance,
} from '../../../../rocco-player-appearance';
import {
  findRoccoLevelConnector,
  type RoccoLevel,
  type RoccoLevelConnector,
  type RoccoLevelMountOptions,
  type RoccoLevelRestartRequest,
} from '../../../../levels/rocco-level-types';
import { type RoccoAppearanceCapability } from '../../../../levels/runtime/rocco-level-capabilities';
import {
  createRoccoBataInventoryItem,
} from '../../inventory';
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
const NETHER_ARRIVAL_ZOOM_HOLD_MS = 2000;
const NETHER_ARRIVAL_ZOOM_OUT_MS = 1000;
const NETHER_ARRIVAL_ZOOM_FACTOR = 3;
const NETHER_ARRIVAL_ZOOM_EASE: 'linear' | 'ease-in-out' = 'ease-in-out';
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
const NETHER_SECURITY_CAMERA_TARGET_INSTANCE_ID =
  'rocco-nether-console-hardware-spawn-security-camera-target';
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
const NETHER_INTERCOMUNICADOR_TARGET_INSTANCE_ID =
  'rocco-nether-console-hardware-spawn-intercomunicador-target';
const NETHER_INTERCOMUNICADOR_ACTION_MENU_ID =
  'rocco-nether-console-hardware-spawn-intercomunicador-action-menu';
const NETHER_INTERCOMUNICADOR_SHAPE = {
  kind: 'rect' as const,
  x: 620,
  y: 226,
  width: 17,
  height: 33,
};
const NETHER_INTERCOMUNICADOR_INTERACTION_POINT = {
  x: 665,
  y: 348,
} as const;
const NETHER_INTERCOMUNICADOR_INTERACTION_FACING: RoccoFacingDirection = 'down-left';
const NETHER_INTERCOMUNICADOR_ACTION_MENU_ITEM_SIZE = 92;
const NETHER_INTERCOMUNICADOR_ACTION_MENU_ORBIT_RADIUS = 88;
const NETHER_INTERCOMUNICADOR_ACTION_MENU_ORBIT_SPEED = 0.08;
const NETHER_INTERCOMUNICADOR_MESSAGE_TTL_MS = 5200;
const NETHER_INTERCOMUNICADOR_DIALOGUE_MENU_ID =
  'rocco-nether-console-hardware-spawn-intercom-dialogue-menu';
const NETHER_INTERCOMUNICADOR_DIALOGUE_MENU_Y = 286;
const NETHER_INTERCOMUNICADOR_PLAYER_TTL_MS = 4800;
const NETHER_INTERCOMUNICADOR_REPLY_TTL_MS = 5200;
const NETHER_INTERCOMUNICADOR_THOUGHT_TTL_MS = 4800;
const NETHER_INTERCOMUNICADOR_MESSAGE_MAX_WIDTH = 320;
const NETHER_INTERCOMUNICADOR_MESSAGE_OFFSET = {
  x: -38,
  y: -6,
} as const;
const NETHER_INTERCOMUNICADOR_LOOK_HISTORY_KEY = 'nether-intercomunicador-look';
const NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_DEFINITION_ID =
  'rocco-nether-console-hardware-spawn-intercom-message-anchor';
const NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_INSTANCE_ID =
  'rocco-nether-console-hardware-spawn-intercom-message-anchor-instance';
const NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_IMAGE_ID =
  'rocco-nether-console-hardware-spawn-intercom-message-anchor-image';
const NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_FRAME_ID =
  'rocco-nether-console-hardware-spawn-intercom-message-anchor-frame';
const NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_ANIMATION_ID = 'nether-intercom-message-anchor-idle';
const NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Crect width='8' height='8' fill='transparent'/%3E%3C/svg%3E";
const NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_POSITION = {
  x: 625,
  y: 236,
} as const;
const NETHER_NOISY_MACHINE_TARGET_INSTANCE_ID =
  'rocco-nether-console-hardware-spawn-noisy-machine-target';
const NETHER_NOISY_MACHINE_ACTION_MENU_ID =
  'rocco-nether-console-hardware-spawn-noisy-machine-action-menu';
const NETHER_NOISY_MACHINE_SHAPE = {
  kind: 'rect' as const,
  x: 104,
  y: 203,
  width: 135,
  height: 135,
};
const NETHER_NOISY_MACHINE_ACTION_MENU_ITEM_SIZE = 92;
const NETHER_NOISY_MACHINE_ACTION_MENU_ORBIT_RADIUS = 88;
const NETHER_NOISY_MACHINE_ACTION_MENU_ORBIT_SPEED = 0.08;
const NETHER_NOISY_MACHINE_MESSAGE_TTL_MS = 5200;
const NETHER_NOISY_MACHINE_GRAB_HISTORY_KEY = 'nether-noisy-machine-grab';
const NETHER_NOISY_MACHINE_LOOK_HISTORY_KEY = 'nether-noisy-machine-look';
const NETHER_SHELF_TARGET_INSTANCE_ID =
  'rocco-nether-console-hardware-spawn-shelf-target';
const NETHER_SHELF_ACTION_MENU_ID =
  'rocco-nether-console-hardware-spawn-shelf-action-menu';
const NETHER_SHELF_SHAPE = {
  kind: 'rect' as const,
  x: 643,
  y: 198,
  width: 14,
  height: 135,
};
const NETHER_SHELF_ACTION_MENU_ITEM_SIZE = 92;
const NETHER_SHELF_ACTION_MENU_ORBIT_RADIUS = 88;
const NETHER_SHELF_ACTION_MENU_ORBIT_SPEED = 0.08;
const NETHER_SHELF_MESSAGE_TTL_MS = 5200;
const NETHER_SHELF_LOOK_HISTORY_KEY = 'nether-shelf-look';
const NETHER_SHELF_GRAB_HISTORY_KEY = 'nether-shelf-grab';
const NETHER_SECURITY_CAMERA_POSITION = {
  x: 839,
  y: 81,
} as const;
const NETHER_SECURITY_CAMERA_ROTATION = (-3 * Math.PI) / 180;
const NETHER_SECURITY_CAMERA_TINT = '#cccccc';
const NETHER_SECURITY_CAMERA_SHAPE = {
  kind: 'rect' as const,
  x: NETHER_SECURITY_CAMERA_POSITION.x,
  y: NETHER_SECURITY_CAMERA_POSITION.y,
  width: NETHER_SECURITY_CAMERA_TARGET_WIDTH,
  height: NETHER_SECURITY_CAMERA_TARGET_HEIGHT,
};
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
const NETHER_SECURITY_SPEECH_STYLE = {
  fill: NETHER_SECURITY_ALERT_TEXT_COLOR,
  bubbleFill: NETHER_SECURITY_ALERT_BUBBLE_FILL,
  bubbleStroke: NETHER_SECURITY_ALERT_TEXT_COLOR,
  bubbleStrokeWidth: 2,
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
  new URL('assets/camera/1.png', import.meta.url).href,
  new URL('assets/camera/2.png', import.meta.url).href,
  new URL('assets/camera/3.png', import.meta.url).href,
  new URL('assets/camera/4.png', import.meta.url).href,
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
    description: 'C\u{E1}mara de seguridad',
    lookLines: [
      'Es una c\u{E1}mara de seguridad.',
      'Parece parte de un sistema de vigilancia.',
      'Seguro que hay alguien mirando detr\u{E1}s.',
      'Me pregunto cu\u{E1}ntas de estas habr\u{E1} por aqu\u{ED}.',
      'Parece cara. \u{BF}Qu\u{E9} tendr\u{E1} adentro?',
    ],
    grabLines: [
      'No llego, est\u{E1} muy alta.',
      'Ni de puntillas la alcanzo.',
      'Tendr\u{ED}a que medir medio metro m\u{E1}s.',
      'Como no salte... y no pienso saltar.',
    ],
    kickLines: [
      'Apenas puedo levantar mi pierna para caminar.',
      'No estoy para patear c\u{E1}maras ahora mismo.',
      'Si levanto m\u{E1}s la rodilla me desmonto.',
      'Necesitar\u{ED}a calentar antes de intentar eso.',
    ],
  },
};

interface NetherNoisyMachineText {
  description: string;
  grabLine: string;
  lookLines: string[];
}

const NETHER_NOISY_MACHINE_TEXT_BY_LOCALE: Record<string, NetherNoisyMachineText> = {
  en: {
    description: 'Noisy machine',
    grabLine: "I'm not touching that.",
    lookLines: [
      'It looks like an important machine.',
      'I thought it was a boiler, but it looks more like an engine.',
      'It is leaking steam everywhere.',
      'It looks like it is about to explode.',
    ],
  },
  es: {
    description: 'M\u{E1}quina tremendamente ruidosa',
    grabLine: 'No voy a tocar eso.',
    lookLines: [
      'Es una m\u{E1}quina que parece importante.',
      'Pensaba que era una caldera, pero parece m\u{E1}s bien un motor.',
      'Suelta vapor por todos lados.',
      'Tiene pinta de estar a punto de explotar.',
    ],
  },
};

function resolveNetherNoisyMachineText(
  localization: RoccoLocalization,
): NetherNoisyMachineText {
  return (
    NETHER_NOISY_MACHINE_TEXT_BY_LOCALE[localization.locale] ??
    NETHER_NOISY_MACHINE_TEXT_BY_LOCALE.en
  );
}

interface NetherShelfText {
  description: string;
  lookLine: string;
  grabBeforeLookLine: string;
  grabAfterLookLine: string;
  grabAfterTakeLine: string;
  emptyLookLines: string[];
}

const NETHER_SHELF_TEXT_BY_LOCALE: Record<string, NetherShelfText> = {
  en: {
    description: 'A cabinet with a lab coat.',
    lookLine: 'There is a lab coat in the back, you can barely see it.',
    grabBeforeLookLine: 'It is an empty shelf.',
    grabAfterLookLine: 'I take this lab coat.',
    grabAfterTakeLine: 'It is empty.',
    emptyLookLines: [
      'It is empty.',
      'A built-in shelf.',
      'There used to be a lab coat here.',
    ],
  },
  es: {
    description: 'Un armario con una bata.',
    lookLine: 'Hay una bata en el fondo, casi ni se ve.',
    grabBeforeLookLine: 'Es una estanter\u{ED}a vac\u{ED}a.',
    grabAfterLookLine: 'Cojo esta bata.',
    grabAfterTakeLine: 'Est\u{E1} vac\u{ED}a.',
    emptyLookLines: [
      'Est\u{E1} vac\u{ED}a.',
      'Una estanter\u{ED}a empotrada.',
      'Aqu\u{ED} hab\u{ED}a una bata.',
    ],
  },
};

function resolveNetherShelfText(
  localization: RoccoLocalization,
): NetherShelfText {
  return (
    NETHER_SHELF_TEXT_BY_LOCALE[localization.locale] ??
    NETHER_SHELF_TEXT_BY_LOCALE.en
  );
}

function resolveNetherSecurityCameraText(
  localization: RoccoLocalization,
): NetherSecurityCameraText {
  return (
    NETHER_SECURITY_CAMERA_TEXT_BY_LOCALE[localization.locale] ??
    NETHER_SECURITY_CAMERA_TEXT_BY_LOCALE.en
  );
}

function createNetherSecurityCameraActionMenuDefinition(
  localization: RoccoLocalization,
): RoccoActionMenuDefinition {
  return {
    id: NETHER_SECURITY_CAMERA_ACTION_MENU_ID,
    targetInstanceIds: [
      NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID,
      NETHER_SECURITY_CAMERA_TARGET_INSTANCE_ID,
    ],
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
      },
      {
        id: 'grab',
        actionId: 'grab',
        label: localization.text.actions.grab,
        imageUri: roccoDefaultActionMenuAssetUrls.grab,
      },
      {
        id: 'kick',
        actionId: 'kick',
        label: localization.text.actions.kick,
        imageUri: roccoDefaultActionMenuAssetUrls.kick,
      },
    ],
  };
}

function createNetherIntercomunicadorActionMenuDefinition(
  localization: RoccoLocalization,
): RoccoActionMenuDefinition {
  return {
    id: NETHER_INTERCOMUNICADOR_ACTION_MENU_ID,
    targetInstanceIds: [NETHER_INTERCOMUNICADOR_TARGET_INSTANCE_ID],
    renderLayer: 'ui.action-menu',
    itemSize: NETHER_INTERCOMUNICADOR_ACTION_MENU_ITEM_SIZE,
    orbitRadius: NETHER_INTERCOMUNICADOR_ACTION_MENU_ORBIT_RADIUS,
    orbitSpeedRadiansPerSecond: NETHER_INTERCOMUNICADOR_ACTION_MENU_ORBIT_SPEED,
    hoverScale: 1.16,
    circleFill: '#0f1610',
    circleStroke: '#d7e6c5',
    circleStrokeWidth: 2,
    items: [
      {
        id: 'talk',
        actionId: 'talk',
        label: localization.text.actions.talk,
        imageUri: roccoDefaultActionMenuAssetUrls.talk,
      },
      {
        id: 'look',
        actionId: 'look',
        label: localization.text.actions.look,
        imageUri: roccoDefaultActionMenuAssetUrls.look,
      },
    ],
  };
}

function createNetherNoisyMachineActionMenuDefinition(
  localization: RoccoLocalization,
): RoccoActionMenuDefinition {
  return {
    id: NETHER_NOISY_MACHINE_ACTION_MENU_ID,
    targetInstanceIds: [NETHER_NOISY_MACHINE_TARGET_INSTANCE_ID],
    renderLayer: 'ui.action-menu',
    itemSize: NETHER_NOISY_MACHINE_ACTION_MENU_ITEM_SIZE,
    orbitRadius: NETHER_NOISY_MACHINE_ACTION_MENU_ORBIT_RADIUS,
    orbitSpeedRadiansPerSecond: NETHER_NOISY_MACHINE_ACTION_MENU_ORBIT_SPEED,
    hoverScale: 1.16,
    circleFill: '#0f1610',
    circleStroke: '#d7e6c5',
    circleStrokeWidth: 2,
    items: [
      {
        id: 'grab',
        actionId: 'grab',
        label: localization.text.actions.grab,
        imageUri: roccoDefaultActionMenuAssetUrls.grab,
      },
      {
        id: 'look',
        actionId: 'look',
        label: localization.text.actions.look,
        imageUri: roccoDefaultActionMenuAssetUrls.look,
      },
    ],
  };
}

function createNetherIntercomMessageAnchorDefinition(): RoccoSpriteDefinition {
  return {
    id: NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_DEFINITION_ID,
    name: 'Nether Intercom Message Anchor',
    images: [
      {
        id: NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_IMAGE_ID,
        uri: NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_URI,
        width: 8,
        height: 8,
      },
    ],
    frames: [
      {
        id: NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_FRAME_ID,
        imageId: NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_IMAGE_ID,
        durationMs: 1000,
        pivot: {
          x: 0,
          y: 0,
        },
      },
    ],
    animations: {
      [NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_ANIMATION_ID]: {
        id: NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_ANIMATION_ID,
        loop: false,
        playbackRate: 1,
        frames: [
          {
            frameId: NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_FRAME_ID,
            durationMs: 1000,
          },
        ],
      },
    },
    defaultAnimation: NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_ANIMATION_ID,
    render: {
      renderLayer: 'world.behind',
      zIndex: 11,
      depthMode: 'fixed',
      opacity: 0,
    },
    metadata: {
      purpose: 'nether-intercom-message-anchor',
    },
  };
}

function createNetherShelfActionMenuDefinition(
  localization: RoccoLocalization,
): RoccoActionMenuDefinition {
  return {
    id: NETHER_SHELF_ACTION_MENU_ID,
    targetInstanceIds: [NETHER_SHELF_TARGET_INSTANCE_ID],
    renderLayer: 'ui.action-menu',
    itemSize: NETHER_SHELF_ACTION_MENU_ITEM_SIZE,
    orbitRadius: NETHER_SHELF_ACTION_MENU_ORBIT_RADIUS,
    orbitSpeedRadiansPerSecond: NETHER_SHELF_ACTION_MENU_ORBIT_SPEED,
    hoverScale: 1.16,
    circleFill: '#0f1610',
    circleStroke: '#d7e6c5',
    circleStrokeWidth: 2,
    items: [
      {
        id: 'grab',
        actionId: 'grab',
        label: localization.text.actions.grab,
        imageUri: roccoDefaultActionMenuAssetUrls.grab,
      },
      {
        id: 'look',
        actionId: 'look',
        label: localization.text.actions.look,
        imageUri: roccoDefaultActionMenuAssetUrls.look,
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
type NetherIntercomStage =
  | 'first-contact'
  | 'after-emergency'
  | 'after-reveal'
  | 'final-warning';
type NetherIntercomPhase =
  | 'idle'
  | 'awaiting-choice'
  | 'waiting-player'
  | 'waiting-npc'
  | 'waiting-thought';

interface NetherArrivalSequence {
  phase: NetherArrivalSequencePhase;
  elapsedMs: number;
  smokeFrameIndex: number;
}

interface NetherSecurityDefeatSequence {
  phase: NetherSecurityDefeatPhase;
  elapsedMs: number;
}

interface NetherIntercomChoice {
  id: string;
  playerLine: RoccoDialogueLine;
  npcLine?: RoccoDialogueLine;
  thoughtLine?: RoccoDialogueLine;
  nextStage?: NetherIntercomStage;
  triggersDefeat?: boolean;
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

export class RoccoNetherConsoleHardwareSpawnLevel implements RoccoLevel, RoccoAppearanceCapability {
  readonly id = ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID;
  readonly title: string;
  readonly connectors = NETHER_CONNECTORS;

  private readonly localization: RoccoLocalization;
  private engine: RoccoEngine | null = null;
  private options: RoccoLevelMountOptions = {};
  private spriteController: RoccoDefaultSpriteController | null = null;
  private scriptedInteractionController: RoccoScriptedSceneInteractionController | null = null;
  private intercomDialogue: RoccoDialogueSession | null = null;
  private onRestartRequested: ((request?: RoccoLevelRestartRequest) => void) | null = null;
  private arrivalSequence: NetherArrivalSequence | null = null;
  private securityDefeatSequence: NetherSecurityDefeatSequence | null = null;
  private intercomStage: NetherIntercomStage = 'first-contact';
  private intercomPhase: NetherIntercomPhase = 'idle';
  private intercomCurrentChoices: readonly NetherIntercomChoice[] = [];
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
  private shelfLookedAt = false;
  private shelfTaken = false;
  private zoomIntroPhase: 'hold' | 'zoom-out' | null = null;
  private zoomIntroElapsedMs = 0;

  constructor(localization: RoccoLocalization) {
    this.localization = localization;
    this.title = 'Nether';
  }

  async mount(
    engine: RoccoEngine,
    options: RoccoLevelMountOptions = {},
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoPlaneScene> {
    this.engine = engine;
    this.options = options;
    this.spriteController = null;
    this.scriptedInteractionController = null;
    this.onRestartRequested = options.onRestartRequested ?? null;
    this.arrivalSequence = null;
    this.securityDefeatSequence = null;
    this.intercomStage = 'first-contact';
    this.intercomPhase = 'idle';
    this.intercomCurrentChoices = [];
    this.intercomDialogue = new RoccoDialogueSession({
      id: NETHER_INTERCOMUNICADOR_DIALOGUE_MENU_ID,
      engine,
      playerSpriteInstanceId: DEFAULT_SPRITE_INSTANCE_ID,
      npcSpriteInstanceId: NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_INSTANCE_ID,
      playerLineTtlMs: NETHER_INTERCOMUNICADOR_PLAYER_TTL_MS,
      npcLineTtlMs: NETHER_INTERCOMUNICADOR_REPLY_TTL_MS,
    });
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
    this.shelfLookedAt = false;
    this.shelfTaken = false;
    this.zoomIntroPhase = null;
    this.zoomIntroElapsedMs = 0;

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
    const intercomMessageAnchorDefinition = createNetherIntercomMessageAnchorDefinition();
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

    await (preloader?.preloadPlaneScene(engine, scene) ?? engine.video.preloadPlaneScene(scene));
    await Promise.all([
      (preloader?.preloadSpriteDefinition(engine, securityCameraDefinition) ?? engine.video.preloadSpriteDefinition(securityCameraDefinition)),
      (preloader?.preloadSpriteDefinition(engine, intercomMessageAnchorDefinition) ?? engine.video.preloadSpriteDefinition(intercomMessageAnchorDefinition)),
      (preloader?.preloadSpriteDefinition(engine, pipeSmokeDefinition) ?? engine.video.preloadSpriteDefinition(pipeSmokeDefinition)),
      shouldPlayArrivalSequence
        ? (preloader?.preloadSpriteDefinition(engine, smokeSprite.definition) ?? engine.video.preloadSpriteDefinition(smokeSprite.definition))
        : Promise.resolve(),
      portalSprite
        ? (preloader?.preloadSpriteDefinition(engine, portalSprite.definition) ?? engine.video.preloadSpriteDefinition(portalSprite.definition))
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
    engine.video.sprites.loadSpriteDefinition(intercomMessageAnchorDefinition);
    engine.video.sprites.loadSpriteDefinition(pipeSmokeDefinition);
    if (shouldPlayArrivalSequence) {
      engine.video.sprites.loadSpriteDefinition(smokeSprite.definition);
    }
    if (portalSprite) {
      engine.video.sprites.loadSpriteDefinition(portalSprite.definition);
    }
    this.installSecurityCamera(engine);
    this.installIntercomMessageAnchor(engine);
    this.installIntercomunicador(engine);
    this.installNoisyMachine(engine);
    this.installShelf(engine);
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
    this.scriptedInteractionController = new RoccoScriptedSceneInteractionController(engine, []);

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
      this.startArrivalZoomIntro(engine);
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
    this.scriptedInteractionController?.cancel();
    this.resetIntercomConversationState();
    this.clearSecurityDefeatPresentation();
    engine.video.messages.clearMessages();
    engine.audio.stopSound(NETHER_AMBIENT_SOUND_ID);
    engine.audio.unregisterSound(NETHER_AMBIENT_SOUND_ID);
    engine.audio.stopSound(NETHER_SECURITY_ALERT_SOUND_ID);
    engine.audio.unregisterSound(NETHER_SECURITY_ALERT_SOUND_ID);
    engine.audio.stopSound(NETHER_ARRIVAL_PORTAL_LOOP_SOUND_ID);
    engine.audio.unregisterSound(NETHER_ARRIVAL_PORTAL_LOOP_SOUND_ID);
    engine.audio.stopSound(NETHER_ARRIVAL_SPELL_SOUND_ID);
    engine.audio.unregisterSound(NETHER_ARRIVAL_SPELL_SOUND_ID);
    engine.video.actionMenus.unregisterMenu(NETHER_SECURITY_CAMERA_ACTION_MENU_ID);
    engine.video.actionMenus.unregisterMenu(NETHER_INTERCOMUNICADOR_ACTION_MENU_ID);
    engine.video.actionMenus.unregisterMenu(NETHER_NOISY_MACHINE_ACTION_MENU_ID);
    engine.video.actionMenus.unregisterMenu(NETHER_SHELF_ACTION_MENU_ID);
    this.intercomDialogue?.cancel();
    engine.video.sprites.removeSprite(NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID);
    engine.video.sprites.removeSprite(NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_INSTANCE_ID);
    engine.video.sprites.removeSprite(NETHER_PIPE_SMOKE_SPRITE_INSTANCE_ID);
    engine.video.sprites.removeSprite(NETHER_PIPE_SMOKE_SECOND_SPRITE_INSTANCE_ID);
    engine.video.sprites.removeSprite(NETHER_ARRIVAL_PORTAL_INSTANCE_ID);
    engine.video.sprites.removeSprite(NETHER_ARRIVAL_SMOKE_INSTANCE_ID);
    engine.video.sceneTargets?.unregisterTarget(NETHER_SECURITY_CAMERA_TARGET_INSTANCE_ID);
    engine.video.sceneTargets?.unregisterTarget(NETHER_INTERCOMUNICADOR_TARGET_INSTANCE_ID);
    engine.video.sceneTargets?.unregisterTarget(NETHER_NOISY_MACHINE_TARGET_INSTANCE_ID);
    engine.video.sceneTargets?.unregisterTarget(NETHER_SHELF_TARGET_INSTANCE_ID);
    uninstallDefaultSprite(engine);
    engine.video.sprites.unregisterWalkMap(DEFAULT_WALK_MAP_ID);
    this.engine = null;
    this.spriteController = null;
    this.scriptedInteractionController = null;
    this.onRestartRequested = null;
    this.arrivalSequence = null;
    this.securityDefeatSequence = null;
    this.intercomStage = 'first-contact';
    this.intercomPhase = 'idle';
    this.intercomCurrentChoices = [];
    this.intercomDialogue = null;
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
    this.zoomIntroPhase = null;
    this.zoomIntroElapsedMs = 0;
    engine.video.zoom.clear();
    engine.video.render(0);
  }

  applyRoccoAppearance(appearance: RoccoPlayerAppearance): void {
    this.options.roccoAppearance = appearance;
  }

  update(deltaMs: number): void {
    this.updateLightsOverlay(deltaMs);
    this.updateAmbientSoundVolume();

    if (this.zoomIntroPhase) {
      this.updateArrivalZoomIntro(deltaMs);
      return;
    }

    if (this.securityDefeatSequence) {
      this.updateSecurityDefeatSequence(deltaMs);
      return;
    }

    if (this.arrivalSequence) {
      this.updateArrivalSequence(deltaMs);
      return;
    }

    this.spriteController?.update(deltaMs);
    this.scriptedInteractionController?.update();
    this.intercomDialogue?.update(deltaMs);
    this.updateLeftSideSecurityWatch(deltaMs);
  }

  handleAction(activation: RoccoActionMenuActivation): void {
    if (
      !this.engine ||
      (
        activation.targetInstanceId !== NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID &&
        activation.targetInstanceId !== NETHER_SECURITY_CAMERA_TARGET_INSTANCE_ID
      )
    ) {
      if (
        this.engine &&
        activation.targetInstanceId === NETHER_INTERCOMUNICADOR_TARGET_INSTANCE_ID
      ) {
        this.handleIntercomunicadorAction(activation);
      }
      if (
        this.engine &&
        activation.targetInstanceId === NETHER_NOISY_MACHINE_TARGET_INSTANCE_ID
      ) {
        this.handleNoisyMachineAction(activation);
      }
      if (
        this.engine &&
        activation.targetInstanceId === NETHER_SHELF_TARGET_INSTANCE_ID
      ) {
        this.handleShelfAction(activation);
      }
      return;
    }

    const cameraText = resolveNetherSecurityCameraText(this.localization);
    if (activation.actionId === 'look') {
      this.showSecurityCameraThought(cameraText.lookLines, 'nether-security-camera-look');
      return;
    }

    if (activation.actionId === 'grab') {
      this.showSecurityCameraThought(cameraText.grabLines, 'nether-security-camera-grab');
      return;
    }

    if (activation.actionId === 'kick') {
      this.showSecurityCameraThought(cameraText.kickLines, 'nether-security-camera-kick');
    }
  }

  handleGridMenu(activation: RoccoGridMenuActivation): void {
    if (
      activation.definitionId !== NETHER_INTERCOMUNICADOR_DIALOGUE_MENU_ID ||
      this.intercomPhase !== 'awaiting-choice'
    ) {
      return;
    }

    if (activation.interaction === 'close') {
      return;
    }

    const menu = this.createIntercomChoiceMenu(this.intercomCurrentChoices);
    const selected = resolveRoccoDialogueChoice(menu, activation);
    if (!selected) {
      return;
    }

    const choice = this.intercomCurrentChoices.find((candidate) => candidate.id === selected.id);
    if (!choice) {
      return;
    }

    this.intercomDialogue?.cancel();
    this.startIntercomChoice(choice);
  }

  handleSceneClick(activation: RoccoSceneClickAction): RoccoCartridgeActionResult | void {
    if (this.securityDefeatSequence) {
      return { suppressDefaultPlayerMove: true };
    }

    if (this.advanceIntercomConversation()) {
      return { suppressDefaultPlayerMove: true };
    }

    if (
      activation.targetInstanceId === NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID ||
      activation.targetInstanceId === NETHER_SECURITY_CAMERA_TARGET_INSTANCE_ID
    ) {
      return;
    }

    if (activation.targetInstanceId === NETHER_INTERCOMUNICADOR_TARGET_INSTANCE_ID) {
      return;
    }

    if (activation.targetInstanceId === NETHER_NOISY_MACHINE_TARGET_INSTANCE_ID) {
      return;
    }

    if (activation.targetInstanceId === NETHER_SHELF_TARGET_INSTANCE_ID) {
      if (this.shelfTaken) {
        const shelfText = resolveNetherShelfText(this.localization);
        this.showShelfThought(
          shelfText.emptyLookLines,
          NETHER_SHELF_LOOK_HISTORY_KEY,
        );
        return { suppressDefaultPlayerMove: true };
      }
      return;
    }
  }

  private installSecurityCamera(engine: RoccoEngine): void {
    engine.video.actionMenus.unregisterMenu(NETHER_SECURITY_CAMERA_ACTION_MENU_ID);
    engine.video.sceneTargets?.unregisterTarget(NETHER_SECURITY_CAMERA_TARGET_INSTANCE_ID);
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
    engine.video.sceneTargets?.registerTarget({
      instanceId: NETHER_SECURITY_CAMERA_TARGET_INSTANCE_ID,
      definitionId: 'rocco-nether-console-hardware-spawn-security-camera',
      shape: NETHER_SECURITY_CAMERA_SHAPE,
      priority: 22,
      suppressDefaultPlayerMove: true,
      visibleDescription: {
        enabled: true,
        text: resolveNetherSecurityCameraText(this.localization).description,
      },
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

  private installIntercomMessageAnchor(engine: RoccoEngine): void {
    engine.video.sprites.removeSprite(NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_INSTANCE_ID);
    engine.video.sprites.createSpriteFromDefinition(
      NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_DEFINITION_ID,
      {
        id: NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_INSTANCE_ID,
        transform: {
          x: NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_POSITION.x,
          y: NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_POSITION.y,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        },
        renderLayer: 'world.behind',
        zIndex: 11,
        depthMode: 'fixed',
        interactive: false,
        collisionEnabled: false,
        opacity: 0,
      },
    );
  }

  private installIntercomunicador(engine: RoccoEngine): void {
    engine.video.actionMenus.unregisterMenu(NETHER_INTERCOMUNICADOR_ACTION_MENU_ID);
    engine.video.sceneTargets?.unregisterTarget(NETHER_INTERCOMUNICADOR_TARGET_INSTANCE_ID);
    engine.video.sceneTargets?.registerTarget({
      instanceId: NETHER_INTERCOMUNICADOR_TARGET_INSTANCE_ID,
      definitionId: 'rocco-nether-console-hardware-spawn-intercomunicador',
      shape: NETHER_INTERCOMUNICADOR_SHAPE,
      priority: 22,
      suppressDefaultPlayerMove: true,
      visibleDescription: {
        enabled: true,
        text: this.localization.text.descriptions.intercomunicador,
      },
    });
    engine.video.actionMenus.registerMenu(
      createNetherIntercomunicadorActionMenuDefinition(this.localization),
    );
  }

  private handleIntercomunicadorAction(activation: RoccoActionMenuActivation): void {
    if (activation.actionId === 'look') {
      this.runIntercomInteraction(() => {
        this.showIntercomunicadorThought(
          this.localization.text.nether.intercom.lookLines,
          NETHER_INTERCOMUNICADOR_LOOK_HISTORY_KEY,
        );
      });
      return;
    }

    if (activation.actionId !== 'talk') {
      return;
    }

    this.runIntercomInteraction(() => {
      this.beginOrReopenIntercomConversation();
    });
  }

  private showIntercomunicadorThought(lines: readonly string[], historyKey: string): void {
    if (!this.engine) {
      return;
    }

    roccoCartridgeMessageRuntime.think(
      this.engine,
      DEFAULT_SPRITE_INSTANCE_ID,
      [...lines],
      {
        ttlMs: NETHER_INTERCOMUNICADOR_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey,
        avoidImmediateRepeat: true,
      },
    );
    this.engine.video.render(0);
  }

  private runIntercomInteraction(onReached: () => void): void {
    this.scriptedInteractionController?.run({
      targetInstanceId: NETHER_INTERCOMUNICADOR_TARGET_INSTANCE_ID,
      moveTo: { ...NETHER_INTERCOMUNICADOR_INTERACTION_POINT },
      facing: NETHER_INTERCOMUNICADOR_INTERACTION_FACING,
      onReached,
    });
  }

  private beginOrReopenIntercomConversation(): void {
    if (!this.engine) {
      return;
    }

    if (this.intercomPhase === 'awaiting-choice') {
      if (!this.engine.video.gridMenus.isOpen(NETHER_INTERCOMUNICADOR_DIALOGUE_MENU_ID)) {
        this.openIntercomChoices(this.intercomCurrentChoices);
      }
      return;
    }

    if (this.intercomPhase !== 'idle') {
      return;
    }

    this.openIntercomChoices(this.resolveIntercomChoices());
  }

  private openIntercomChoices(choices: readonly NetherIntercomChoice[]): void {
    if (!this.engine) {
      return;
    }

    this.intercomCurrentChoices = choices;
    this.intercomPhase = 'awaiting-choice';
    this.engine.video.gridMenus.openMenu(this.createIntercomChoiceMenu(choices).gridMenu);
    this.engine.setInputEnabled(true);
    this.engine.video.render(0);
  }

  private createIntercomChoiceMenu(choices: readonly NetherIntercomChoice[]) {
    return createRoccoDialogueChoiceMenu({
      id: NETHER_INTERCOMUNICADOR_DIALOGUE_MENU_ID,
      y: NETHER_INTERCOMUNICADOR_DIALOGUE_MENU_Y,
      choices: choices.map((choice) => ({
        id: choice.id,
        text: this.resolveIntercomMenuLabel(choice.playerLine),
      })),
    });
  }

  private resolveIntercomChoices(): readonly NetherIntercomChoice[] {
    const intercomText = this.localization.text.nether.intercom;

    if (this.intercomStage === 'first-contact') {
      return [
        {
          id: 'hello-anyone-there',
          playerLine: intercomText.firstChoices.helloAnyoneThere,
          npcLine: intercomText.firstReplyLine,
          nextStage: 'after-emergency',
        },
        {
          id: 'hello-im-rocco',
          playerLine: intercomText.firstChoices.helloImRocco,
          triggersDefeat: true,
        },
        {
          id: 'turn-off-camera',
          playerLine: intercomText.firstChoices.turnOffCamera,
          triggersDefeat: true,
        },
        {
          id: 'where-am-i',
          playerLine: intercomText.firstChoices.whereAmI,
          triggersDefeat: true,
        },
      ];
    }

    if (this.intercomStage === 'after-emergency') {
      return [
        {
          id: 'what-happened',
          playerLine: intercomText.secondChoices.whatHappened,
          npcLine: intercomText.secondReplyLines,
          thoughtLine: intercomText.secondReplyThoughtLines,
          nextStage: 'after-reveal',
        },
        {
          id: 'i-do-not-know-how-i-got-here',
          playerLine: intercomText.secondChoices.iDoNotKnowHowIGotHere,
          triggersDefeat: true,
        },
        {
          id: 'what-emergency',
          playerLine: intercomText.secondChoices.whatEmergency,
          npcLine: intercomText.secondReplyLines,
          thoughtLine: intercomText.secondReplyThoughtLines,
          nextStage: 'after-reveal',
        },
        {
          id: 'help-me-get-out',
          playerLine: intercomText.secondChoices.helpMeGetOut,
          triggersDefeat: true,
        },
      ];
    }

    if (this.intercomStage === 'after-reveal') {
      return [
        {
          id: 'what-if-not-found',
          playerLine: intercomText.thirdChoices.whatIfNotFound,
          npcLine: intercomText.thirdReplyLines,
          nextStage: 'final-warning',
        },
        {
          id: 'how-to-reset-console',
          playerLine: intercomText.thirdChoices.howToResetConsole,
          triggersDefeat: true,
        },
        {
          id: 'where-is-an-exit',
          playerLine: intercomText.thirdChoices.whereIsAnExit,
          triggersDefeat: true,
        },
        {
          id: this.shelfTaken ? 'lab-coat-question' : 'nice-voice',
          playerLine: this.shelfTaken
            ? intercomText.thirdChoices.labCoatQuestion
            : intercomText.thirdChoices.niceVoice,
          triggersDefeat: true,
        },
      ];
    }

    return [
      {
        id: 'hello',
        playerLine: intercomText.finalChoice,
        triggersDefeat: true,
      },
    ];
  }

  private startIntercomChoice(choice: NetherIntercomChoice): void {
    if (!this.engine || !this.intercomDialogue) {
      return;
    }

    this.intercomPhase = 'waiting-player';
    this.intercomDialogue.beginLinearSequence({
      speaker: 'player',
      lines: [choice.playerLine],
      lineTtlMs: NETHER_INTERCOMUNICADOR_PLAYER_TTL_MS,
      onComplete: () => {
        if (choice.triggersDefeat) {
          this.resetIntercomConversationState();
          this.startSecurityDefeatSequence({
            messageSpriteInstanceId: this.resolveIntercomSpeakerInstanceId(),
            messageText: this.localization.text.nether.intercom.securityAlertLine,
            messageSide: 'left',
            messageOffset: NETHER_INTERCOMUNICADOR_MESSAGE_OFFSET,
          });
          return;
        }

        if (choice.npcLine !== undefined) {
          this.showIntercomNpcLine(choice);
          return;
        }

        this.finishIntercomChoice(choice);
      },
    });
    this.engine.video.render(0);
  }

  private showIntercomNpcLine(choice: NetherIntercomChoice): void {
    if (!this.engine || !this.intercomDialogue || choice.npcLine === undefined) {
      return;
    }

    this.intercomPhase = 'waiting-npc';
    this.intercomDialogue.beginLinearSequence({
      speaker: 'npc',
      lines: [choice.npcLine],
      lineTtlMs: NETHER_INTERCOMUNICADOR_REPLY_TTL_MS,
      messageOptions: {
        side: 'left',
        offset: NETHER_INTERCOMUNICADOR_MESSAGE_OFFSET,
        maxWidth: NETHER_INTERCOMUNICADOR_MESSAGE_MAX_WIDTH,
        style: NETHER_SECURITY_SPEECH_STYLE,
      },
      onComplete: () => {
        if (choice.thoughtLine !== undefined) {
          this.showIntercomThought(choice);
          return;
        }
        this.finishIntercomChoice(choice);
      },
    });
    this.engine.video.render(0);
  }

  private showIntercomThought(choice: NetherIntercomChoice): void {
    if (!this.engine || !this.intercomDialogue || choice.thoughtLine === undefined) {
      return;
    }

    this.intercomPhase = 'waiting-thought';
    this.intercomDialogue.beginLinearSequence({
      speaker: 'player',
      lines: [choice.thoughtLine],
      lineTtlMs: NETHER_INTERCOMUNICADOR_THOUGHT_TTL_MS,
      messageKind: 'think',
      onComplete: () => {
        this.finishIntercomChoice(choice);
      },
    });
    this.engine.video.render(0);
  }

  private finishIntercomChoice(choice: NetherIntercomChoice): void {
    this.intercomStage = choice.nextStage ?? this.intercomStage;
    this.finishIntercomConversation();
  }

  private finishIntercomConversation(): void {
    if (!this.engine) {
      this.resetIntercomConversationState();
      return;
    }

    this.resetIntercomConversationState();
    this.engine.video.render(0);
  }

  private advanceIntercomConversation(): boolean {
    if (
      !this.intercomDialogue ||
      this.intercomPhase === 'idle' ||
      this.intercomPhase === 'awaiting-choice'
    ) {
      return false;
    }

    return this.intercomDialogue.advance();
  }

  private resetIntercomConversationState(): void {
    this.intercomDialogue?.cancel();
    this.intercomPhase = 'idle';
    this.intercomCurrentChoices = [];
  }

  private resolveIntercomMenuLabel(line: RoccoDialogueLine): string {
    if (typeof line === 'string') {
      return line;
    }

    return line.join(' ');
  }

  private resolveIntercomSpeakerInstanceId(): string {
    if (
      this.engine?.video.sprites.getSprite(NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_INSTANCE_ID)
    ) {
      return NETHER_INTERCOMUNICADOR_MESSAGE_ANCHOR_INSTANCE_ID;
    }

    return NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID;
  }

  private installNoisyMachine(engine: RoccoEngine): void {
    engine.video.actionMenus.unregisterMenu(NETHER_NOISY_MACHINE_ACTION_MENU_ID);
    engine.video.sceneTargets?.unregisterTarget(NETHER_NOISY_MACHINE_TARGET_INSTANCE_ID);
    engine.video.sceneTargets?.registerTarget({
      instanceId: NETHER_NOISY_MACHINE_TARGET_INSTANCE_ID,
      definitionId: 'rocco-nether-console-hardware-spawn-noisy-machine',
      shape: NETHER_NOISY_MACHINE_SHAPE,
      priority: 22,
      suppressDefaultPlayerMove: true,
      visibleDescription: {
        enabled: true,
        text: this.localization.text.descriptions.noisyMachine,
      },
    });
    engine.video.actionMenus.registerMenu(
      createNetherNoisyMachineActionMenuDefinition(this.localization),
    );
  }

  private handleNoisyMachineAction(activation: RoccoActionMenuActivation): void {
    if (activation.actionId === 'grab') {
      this.showNoisyMachineThought(
        ['No voy a tocar eso.'],
        NETHER_NOISY_MACHINE_GRAB_HISTORY_KEY,
      );
      return;
    }

    if (activation.actionId !== 'look') {
      return;
    }

    const machineText = resolveNetherNoisyMachineText(this.localization);
    this.showNoisyMachineThought(
      machineText.lookLines,
      NETHER_NOISY_MACHINE_LOOK_HISTORY_KEY,
    );
  }

  private showNoisyMachineThought(lines: readonly string[], historyKey: string): void {
    if (!this.engine) {
      return;
    }

    roccoCartridgeMessageRuntime.think(
      this.engine,
      DEFAULT_SPRITE_INSTANCE_ID,
      [...lines],
      {
        ttlMs: NETHER_NOISY_MACHINE_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey,
        avoidImmediateRepeat: true,
      },
    );
    this.engine.video.render(0);
  }

  private installShelf(engine: RoccoEngine): void {
    engine.video.actionMenus.unregisterMenu(NETHER_SHELF_ACTION_MENU_ID);
    engine.video.sceneTargets?.unregisterTarget(NETHER_SHELF_TARGET_INSTANCE_ID);
    engine.video.sceneTargets?.registerTarget({
      instanceId: NETHER_SHELF_TARGET_INSTANCE_ID,
      definitionId: 'rocco-nether-console-hardware-spawn-shelf',
      shape: NETHER_SHELF_SHAPE,
      priority: 22,
      suppressDefaultPlayerMove: true,
      visibleDescription: {
        enabled: true,
        text: this.localization.text.descriptions.shelf,
      },
    });
    engine.video.actionMenus.registerMenu(
      createNetherShelfActionMenuDefinition(this.localization),
    );
  }

  private updateShelfTargetDescription(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.sceneTargets?.unregisterTarget(NETHER_SHELF_TARGET_INSTANCE_ID);
    const shelfText = resolveNetherShelfText(this.localization);
    const description = this.shelfTaken
      ? this.localization.text.descriptions.shelf
      : shelfText.description;
    this.engine.video.sceneTargets?.registerTarget({
      instanceId: NETHER_SHELF_TARGET_INSTANCE_ID,
      definitionId: 'rocco-nether-console-hardware-spawn-shelf',
      shape: NETHER_SHELF_SHAPE,
      priority: 22,
      suppressDefaultPlayerMove: true,
      visibleDescription: {
        enabled: true,
        text: description,
      },
    });
    this.engine.video.render(0);
  }

  private handleShelfAction(activation: RoccoActionMenuActivation): void {
    if (activation.actionId === 'look') {
      this.shelfLookedAt = true;
      this.updateShelfTargetDescription();
      if (this.shelfTaken) {
        const shelfText = resolveNetherShelfText(this.localization);
        this.showShelfThought(
          shelfText.emptyLookLines,
          NETHER_SHELF_LOOK_HISTORY_KEY,
        );
        return;
      }
      this.showShelfThought(
        [resolveNetherShelfText(this.localization).lookLine],
        NETHER_SHELF_LOOK_HISTORY_KEY,
      );
      return;
    }

    if (activation.actionId !== 'grab') {
      return;
    }

    if (this.shelfTaken) {
      this.showShelfThought(
        [resolveNetherShelfText(this.localization).grabAfterTakeLine],
        NETHER_SHELF_GRAB_HISTORY_KEY,
      );
      return;
    }

    if (!this.shelfLookedAt) {
      this.showShelfThought(
        [resolveNetherShelfText(this.localization).grabBeforeLookLine],
        NETHER_SHELF_GRAB_HISTORY_KEY,
      );
      return;
    }

    const batItem = createRoccoBataInventoryItem(this.localization);
    const isPickupAllowed = this.options.onPickupRequested?.(batItem) ?? true;
    if (!isPickupAllowed) {
      return;
    }

    this.shelfTaken = true;
    this.updateShelfTargetDescription();
    if (this.engine) {
      this.engine.video.actionMenus.unregisterMenu(NETHER_SHELF_ACTION_MENU_ID);
    }
    this.showShelfThought(
      [resolveNetherShelfText(this.localization).grabAfterLookLine],
      NETHER_SHELF_GRAB_HISTORY_KEY,
    );
    this.options.onPickupCollected?.(batItem);
  }

  private showShelfThought(lines: readonly string[], historyKey: string): void {
    if (!this.engine) {
      return;
    }

    roccoCartridgeMessageRuntime.think(
      this.engine,
      DEFAULT_SPRITE_INSTANCE_ID,
      [...lines],
      {
        ttlMs: NETHER_SHELF_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey,
        avoidImmediateRepeat: true,
      },
    );
    this.engine.video.render(0);
  }

  private showSecurityCameraThought(lines: readonly string[], historyKey: string): void {
    if (!this.engine) {
      return;
    }

    roccoCartridgeMessageRuntime.think(
      this.engine,
      DEFAULT_SPRITE_INSTANCE_ID,
      [...lines],
      {
        ttlMs: NETHER_SECURITY_CAMERA_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey,
        avoidImmediateRepeat: true,
      },
    );
    this.engine.video.render(0);
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

    if (this.options.roccoAppearance === ROCCO_LAB_COAT_PLAYER_APPEARANCE) {
      this.leftSideExposureElapsedMs = 0;
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

  private startSecurityDefeatSequence(options?: {
    messageSpriteInstanceId?: string;
    messageText?: string;
    messageSide?: 'auto' | 'left' | 'right' | 'above';
    messageOffset?: RoccoPoint;
  }): void {
    if (!this.engine || this.securityDefeatSequence) {
      return;
    }

    this.leftSideExposureElapsedMs = NETHER_SECURITY_LEFT_SIDE_TRIGGER_DELAY_MS;
    this.resetIntercomConversationState();
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
    this.showSecurityAlertMessage(
      options?.messageSpriteInstanceId ?? NETHER_SECURITY_CAMERA_SPRITE_INSTANCE_ID,
      options?.messageText ?? this.resolveSecurityAlertLine(),
      options?.messageSide ?? 'left',
      options?.messageOffset ?? NETHER_SECURITY_ALERT_MESSAGE_OFFSET,
    );
    this.engine.video.render(0);
  }

  private showSecurityAlertMessage(
    spriteInstanceId: string,
    text: string,
    side: 'auto' | 'left' | 'right' | 'above',
    offset: RoccoPoint,
  ): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.messages.say(
      spriteInstanceId,
      text,
      {
        id: NETHER_SECURITY_ALERT_MESSAGE_ID,
        background: true,
        ttlMs: NETHER_SECURITY_ALERT_MESSAGE_TTL_MS,
        side,
        offset,
        maxWidth: NETHER_SECURITY_ALERT_MESSAGE_MAX_WIDTH,
        zIndex: 5000,
        style: NETHER_SECURITY_SPEECH_STYLE,
      },
    );
  }

  private resolveSecurityAlertLine(): string {
    return this.localization.text.nether.intercom.securityAlertLine;
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
      appearance: this.options.roccoAppearance,
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

  private startArrivalZoomIntro(engine: RoccoEngine): void {
    engine.setInputEnabled(false);
    engine.video.sprites.removeSprite(DEFAULT_SPRITE_INSTANCE_ID);
    engine.setPlayerSprite(null);
    engine.video.zoom.setTransform({
      factor: NETHER_ARRIVAL_ZOOM_FACTOR,
      focusX: DEFAULT_DESIGN_WIDTH,
      focusY: 0,
      anchorX: DEFAULT_DESIGN_WIDTH,
      anchorY: 0,
    });
    this.zoomIntroPhase = 'hold';
    this.zoomIntroElapsedMs = 0;
    engine.video.render(0);
  }

  private updateArrivalZoomIntro(deltaMs: number): void {
    if (!this.engine || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    if (this.zoomIntroPhase !== 'hold') {
      return;
    }

    this.zoomIntroElapsedMs += deltaMs;
    if (this.zoomIntroElapsedMs < NETHER_ARRIVAL_ZOOM_HOLD_MS) {
      return;
    }

    this.zoomIntroPhase = 'zoom-out';
    this.engine.video.zoom.animateTo(
      {
        factor: 1,
        focusX: DEFAULT_DESIGN_WIDTH / 2,
        focusY: DEFAULT_DESIGN_HEIGHT / 2,
        anchorX: DEFAULT_DESIGN_WIDTH / 2,
        anchorY: DEFAULT_DESIGN_HEIGHT / 2,
      },
      NETHER_ARRIVAL_ZOOM_OUT_MS,
      {
        easing: NETHER_ARRIVAL_ZOOM_EASE,
        onComplete: () => {
          this.zoomIntroPhase = null;
          this.zoomIntroElapsedMs = 0;
          this.engine?.video.zoom.clear();
          this.startArrivalSequence();
        },
      },
    );
  }

  private startArrivalSequence(): void {
    if (!this.engine) {
      return;
    }

    this.zoomIntroPhase = null;
    this.zoomIntroElapsedMs = 0;
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
    return this.localization.text.nether.arrivalThoughtLine;
  }
}
