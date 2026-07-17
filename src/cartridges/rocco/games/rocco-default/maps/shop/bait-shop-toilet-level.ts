/* eslint-disable unicorn/consistent-class-member-order */

import type {
  CartridgeActionDisposition,
  RoccoSceneClickAction,
} from '../../../../../../console/cartridges';
import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type {
  RoccoActionMenuActivation,
  RoccoActionMenuDefinition,
} from '../../../../../../console/video/action-menu';
import type {
  RoccoGridMenuCarriedItem,
  RoccoGridMenuActivation,
} from '../../../../../../console/video/grid-menu';
import type { RoccoGraphicPlane, RoccoPlaneScene } from '../../../../../../console/video/planes';
import {
  createRoccoSpriteAutoCroppedFrames,
  type RoccoFacingDirection,
  type RoccoPoint,
  type RoccoSpriteDefinition,
  type RoccoSpriteInstance,
} from '../../../../../../console/video/sprites';
import {
  createRoccoDialogueChoiceMenu,
  RoccoDialogueSession,
  roccoCartridgeMessageRuntime,
} from '../../../../rpce/dialogue';
import {
  DEFAULT_CORAL_RELIC_GROUND_SPRITE,
  ROCCO_INVENTORY_MAGAZINE_ITEM_ID,
  resolveRoccoInventoryItemLabel,
  roccoCoralRelicAssetUrl,
  type RoccoCoralRelicAssemblyPlan,
  type RoccoInventoryFusionStep,
  type RoccoInventoryItem,
} from '../../inventory';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import { roccoDefaultActionMenuAssetUrls, roccoDefaultYouLoseSoundUrl } from '../../sprites';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import {
  createRoccoPlayerActionMenuDefinition,
  ROCCO_PLAYER_ACTION_MENU_ID,
  ROCCO_PLAYER_DEVELOPER_ACTION_ID,
  ROCCO_PLAYER_INVENTORY_ACTION_ID,
  ROCCO_PLAYER_TALK_ACTION_ID,
} from '../../player';
import { isRoccoDeveloperModeEnabled } from '../../../../rocco-developer-mode';
import {
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_ROCCO_GREEN_BLACK,
  DEFAULT_SPRITE_FRAME_HEIGHT,
  DEFAULT_SPRITE_FRAME_WIDTH,
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_PICK_UP_ACTION_ID,
  DEFAULT_SPRITE_RUN_ACTION_ID,
  DEFAULT_SPRITE_SCALE,
} from '../../constants';
import {
  installDefaultSprite,
  uninstallDefaultSprite,
  type RoccoDefaultSpriteController,
} from '../../sprites';
import { DEFAULT_STAN_DIALOGUE_TEXT_COLOR } from '../../../../levels/pier/pier-stan';
import {
  findRoccoLevelConnector,
  type RoccoLevel,
  type RoccoLevelConnector,
  type RoccoLevelMountOptions,
} from '../../../../levels/rocco-level-types';
import { type RoccoToiletLevelCapability } from '../../../../levels/runtime/rocco-level-capabilities';
import { baitShopToiletAssetUrls } from './bait-shop-assets';
import {
  installBaitShopWalkMap,
  loadOrCreateBaitShopScene,
  uninstallBaitShopWalkMap,
  type RoccoBaitShopSceneDefinition,
} from './bait-shop-level';
import {
  BaitShopToiletSeatController,
  type BaitShopToiletSeatControllerHost,
  type BaitShopToiletSeatControllerOptions,
} from './bait-shop-toilet-seat-controller';

export const ROCCO_BAIT_SHOP_TOILET_LEVEL_ID = 'bait-shop-toilet';
export const BAIT_SHOP_TOILET_SCENE_ID = 'rocco-bait-shop-toilet-scene';

export interface RoccoBaitShopToiletLevelOptions {
  hasMagazine?: () => boolean;
  hasCoralRelic?: () => boolean;
  getCoralRelicAssemblyPlan?: () => RoccoCoralRelicAssemblyPlan;
  allowReuseDuringUrgency?: () => boolean;
  isStanIdentified?: () => boolean;
}

type BaitShopToiletReadingPhase = 'lines' | 'stan-alert' | 'fading' | 'title' | 'restarting';

interface BaitShopToiletReadingSequence {
  phase: BaitShopToiletReadingPhase;
  lineIndex: number;
  lines: readonly string[];
  elapsedMs: number;
}

type BaitShopToiletWishSequencePhase =
  | 'walking-to-relic'
  | 'smoke'
  | 'post-toilet-police-warning'
  | 'awaiting-police-response'
  | 'police-response'
  | 'direct-defeat';

type BaitShopToiletWishOutcome = 'toilet-disappears' | 'rocco-disappears' | 'direct-defeat';

interface BaitShopToiletWishSequence {
  phase: BaitShopToiletWishSequencePhase;
  outcome: BaitShopToiletWishOutcome;
  groundPoint: RoccoPoint;
  consumeRelic: () => void;
  elapsedMs: number;
  smokeFrameIndex: number;
  effectApplied: boolean;
  policeReplyShown: boolean;
}

type BaitShopToiletThrowPhase = 'walking-to-center' | 'walking-to-back' | 'pickup-hold' | 'falling';

interface BaitShopToiletThrowSequence {
  phase: BaitShopToiletThrowPhase;
  elapsedMs: number;
  relicItem: RoccoInventoryItem;
  relicScale: number;
  startPoint: RoccoPoint;
  endPoint: RoccoPoint;
  groundPoint: RoccoPoint;
  onComplete: (groundPoint: RoccoPoint) => void;
}

interface BaitShopToiletThrowRelicPlacement {
  relicScale: number;
  startPoint: RoccoPoint;
  endPoint: RoccoPoint;
}

interface BaitShopToiletMountAssets {
  scene: RoccoPlaneScene;
  initialPosition: RoccoPoint;
  initialFacing: RoccoFacingDirection;
  toiletSprite: Awaited<ReturnType<typeof createBaitShopToiletSpriteDefinition>>;
  smokeSprite: Awaited<ReturnType<typeof createBaitShopToiletSmokeSpriteDefinition>>;
  portalSprite: Awaited<ReturnType<typeof createBaitShopToiletPortalSpriteDefinition>>;
  throwRelicSprite: RoccoSpriteDefinition;
}

const BAIT_SHOP_TOILET_RETURN_CONNECTOR_ID = 'south';
const BAIT_SHOP_TOILET_PORTAL_CONNECTOR_ID = 'portal';
const BAIT_SHOP_TOILET_RETURN_EXIT_TRIGGER_HEIGHT = 30;
const BAIT_SHOP_TOILET_SPRITE_DEFINITION_ID = 'rocco-bait-shop-toilet-sprite';
const BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID = 'rocco-bait-shop-toilet-main';
const BAIT_SHOP_TOILET_ACTION_MENU_ID = 'rocco-bait-shop-toilet-action-menu';
const BAIT_SHOP_TOILET_LOOK_HISTORY_KEY = 'bait-shop-toilet-look';
const BAIT_SHOP_TOILET_SELF_TALK_HISTORY_KEY = 'bait-shop-toilet-self-talk';
const BAIT_SHOP_TOILET_STAY_SEATED_HISTORY_KEY = 'bait-shop-toilet-stay-seated';
const BAIT_SHOP_TOILET_READ_ACTION_ID = 'read';
const BAIT_SHOP_TOILET_SHEET_IMAGE_ID = 'rocco-bait-shop-toilet-sheet';
const BAIT_SHOP_TOILET_IDLE_ANIMATION_ID = 'bait-shop-toilet-idle';
const BAIT_SHOP_TOILET_FRAME_DURATION_MS = 1000;
const BAIT_SHOP_TOILET_SHEET_ALPHA_THRESHOLD = 8;
const BAIT_SHOP_TOILET_SHEET_PADDING = 8;
const BAIT_SHOP_TOILET_SHEET_MIN_OPAQUE_PIXELS = 4000;
const BAIT_SHOP_TOILET_TARGET_X = 284;
const BAIT_SHOP_TOILET_TARGET_Y = 208;
const BAIT_SHOP_TOILET_TARGET_HEIGHT = 259.2;
const BAIT_SHOP_INTERIOR_ROCCO_SCALE = DEFAULT_SPRITE_SCALE * 1.2;
const BAIT_SHOP_TOILET_ROCCO_SCALE = BAIT_SHOP_INTERIOR_ROCCO_SCALE * 1.8;
const BAIT_SHOP_TOILET_BASE_ENTRY_POSITION = {
  x: 412,
  y: 228,
} as const;
const BAIT_SHOP_TOILET_ENTRY_GROUND_POINT = {
  x: Math.round(
    BAIT_SHOP_TOILET_BASE_ENTRY_POSITION.x +
      DEFAULT_SPRITE_GROUND_ANCHOR_X * BAIT_SHOP_INTERIOR_ROCCO_SCALE,
  ),
  y: Math.round(
    BAIT_SHOP_TOILET_BASE_ENTRY_POSITION.y +
      DEFAULT_SPRITE_GROUND_ANCHOR_Y * BAIT_SHOP_INTERIOR_ROCCO_SCALE,
  ),
} as const;
const BAIT_SHOP_TOILET_ENTRY_POSITION = {
  x: Math.round(
    BAIT_SHOP_TOILET_ENTRY_GROUND_POINT.x -
      DEFAULT_SPRITE_GROUND_ANCHOR_X * BAIT_SHOP_TOILET_ROCCO_SCALE,
  ),
  y: Math.round(
    BAIT_SHOP_TOILET_ENTRY_GROUND_POINT.y -
      DEFAULT_SPRITE_GROUND_ANCHOR_Y * BAIT_SHOP_TOILET_ROCCO_SCALE,
  ),
} as const;
const BAIT_SHOP_TOILET_SIT_APPROACH_POINT = {
  x: 336,
  y: 472,
} as const;
const BAIT_SHOP_TOILET_SIT_SEAT_POINT = {
  x: 309,
  y: 473,
} as const;
const BAIT_SHOP_TOILET_SIT_WAIT_MS = 500;
const BAIT_SHOP_ROCCO_TINT = '#cccccc';
const BAIT_SHOP_LOOK_MESSAGE_TTL_MS = 10_400;
const BAIT_SHOP_TOILET_READING_BACKDROP_PLANE_ID = 'rocco-bait-shop-toilet-reading-backdrop';
const BAIT_SHOP_TOILET_READING_IMAGE_PLANE_ID = 'rocco-bait-shop-toilet-reading-magazine';
const BAIT_SHOP_TOILET_READING_DIALOGUE_ID = 'rocco-bait-shop-toilet-reading-dialogue';
const BAIT_SHOP_TOILET_POLICE_DIALOGUE_ID = 'rocco-bait-shop-toilet-police-dialogue';
const BAIT_SHOP_TOILET_READING_IMAGE_HEIGHT = DEFAULT_DESIGN_HEIGHT;
const BAIT_SHOP_TOILET_READING_IMAGE_WIDTH = DEFAULT_DESIGN_WIDTH;
const BAIT_SHOP_TOILET_READING_IMAGE_X = 0;
const BAIT_SHOP_TOILET_READING_MESSAGE_ID = 'rocco-bait-shop-toilet-reading-message';
const BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_ID = 'rocco-bait-shop-toilet-stan-alert-message';
const BAIT_SHOP_TOILET_POST_WISH_PLAYER_REPLY_MESSAGE_ID =
  'rocco-bait-shop-toilet-post-wish-player-reply-message';
const BAIT_SHOP_TOILET_STAN_ALERT_SPRITE_INSTANCE_ID = 'rocco-bait-shop-toilet-stan-alert-anchor';
const BAIT_SHOP_TOILET_READING_MESSAGE_ANCHOR_SPRITE_INSTANCE_ID =
  'rocco-bait-shop-toilet-reading-anchor';
const BAIT_SHOP_TOILET_READING_LINE_DURATION_MS = 12_800;
const BAIT_SHOP_TOILET_READING_MESSAGE_SCALE = 0.8;
const BAIT_SHOP_TOILET_READING_MESSAGE_MAX_WIDTH = Math.round(
  Math.min(DEFAULT_DESIGN_WIDTH - 44, 330 * BAIT_SHOP_TOILET_READING_MESSAGE_SCALE * 4),
);
const BAIT_SHOP_TOILET_READING_MESSAGE_FONT_SIZE = 18 * BAIT_SHOP_TOILET_READING_MESSAGE_SCALE * 2;
const BAIT_SHOP_TOILET_READING_MESSAGE_ANCHOR_X = DEFAULT_DESIGN_WIDTH / 2;
const BAIT_SHOP_TOILET_READING_MESSAGE_ANCHOR_Y = DEFAULT_DESIGN_HEIGHT / 2 + 60;
const BAIT_SHOP_TOILET_READING_MESSAGE_ANCHOR_SCALE = 0.08;
const BAIT_SHOP_TOILET_READING_DEFEAT_SOUND_ID = 'rocco-bait-shop-toilet-reading-defeat-sound';
const BAIT_SHOP_TOILET_READING_DEFEAT_SOUND_VOLUME = 0.25;
const BAIT_SHOP_TOILET_STAN_ALERT_DURATION_MS = 4800;
const BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_TTL_MS = BAIT_SHOP_TOILET_STAN_ALERT_DURATION_MS + 600;
const BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_MAX_WIDTH = 260;
const BAIT_SHOP_TOILET_STAN_ALERT_SCALE = 0.08;
const BAIT_SHOP_TOILET_STAN_ALERT_START_X = DEFAULT_DESIGN_WIDTH + 146;
const BAIT_SHOP_TOILET_STAN_ALERT_END_X = DEFAULT_DESIGN_WIDTH + 58;
const BAIT_SHOP_TOILET_STAN_ALERT_BASE_Y = 124;
const BAIT_SHOP_TOILET_READING_DEFEAT_FADE_PRIMITIVE_ID =
  'rocco-bait-shop-toilet-reading-defeat-fade';
const BAIT_SHOP_TOILET_READING_DEFEAT_TITLE_ID = 'rocco-bait-shop-toilet-reading-defeat-title';
const BAIT_SHOP_TOILET_READING_DEFEAT_FADE_DURATION_MS = 1300;
const BAIT_SHOP_TOILET_READING_DEFEAT_TITLE_DURATION_MS = 3600;
const IS_BAIT_SHOP_TOILET_ALLOW_STAND_WALK_CANCEL = false;
const BAIT_SHOP_TOILET_URGENT_TARGET_INSTANCE_ID = 'rocco-bait-shop-toilet-urgent-target';
const BAIT_SHOP_TOILET_WISH_MENU_ID = 'rocco-bait-shop-toilet-wish-menu';
const BAIT_SHOP_TOILET_WISH_NEVER_EXISTED_CHOICE_ID = 'wish-never-existed';
const BAIT_SHOP_TOILET_WISH_ROOT_CHOICE_ID = 'wish-root';
const BAIT_SHOP_TOILET_WISH_STAN_DISAPPEAR_CHOICE_ID = 'wish-stan-disappear';
const BAIT_SHOP_TOILET_WISH_ESCAPE_CHOICE_ID = 'wish-escape';
const BAIT_SHOP_TOILET_POST_WISH_RESPONSE_MENU_ID =
  'rocco-bait-shop-toilet-post-wish-response-menu';
const BAIT_SHOP_TOILET_POST_WISH_REPLY_MOMENT_PLEASE_CHOICE_ID = 'post-wish-reply-moment-please';
const BAIT_SHOP_TOILET_POST_WISH_REPLY_NO_HIT_CHOICE_ID = 'post-wish-reply-no-hit';
const BAIT_SHOP_TOILET_POST_WISH_REPLY_WHAT_IF_NOT_CHOICE_ID = 'post-wish-reply-what-if-not';
const BAIT_SHOP_TOILET_POST_WISH_REPLY_COME_IN_CHOICE_ID = 'post-wish-reply-come-in';
const BAIT_SHOP_TOILET_SMOKE_SPRITE_DEFINITION_ID = 'rocco-bait-shop-toilet-smoke';
const BAIT_SHOP_TOILET_SMOKE_SPRITE_INSTANCE_ID = 'rocco-bait-shop-toilet-smoke-instance';
const BAIT_SHOP_TOILET_SMOKE_ANIMATION_ID = 'bait-shop-toilet-smoke';
const BAIT_SHOP_TOILET_SMOKE_FRAME_DURATION_MS = 120;
const BAIT_SHOP_TOILET_SMOKE_IMAGE_ID_PREFIX = 'rocco-bait-shop-toilet-smoke-image';
const BAIT_SHOP_TOILET_SMOKE_FRAME_ID_PREFIX = 'rocco-bait-shop-toilet-smoke-frame';
const BAIT_SHOP_TOILET_SMOKE_TARGET_HEIGHT = 125;
const BAIT_SHOP_TOILET_SMOKE_REMOVE_TOILET_FRAME_INDEX = 4;
const BAIT_SHOP_TOILET_PORTAL_SPRITE_DEFINITION_ID = 'rocco-bait-shop-toilet-portal';
const BAIT_SHOP_TOILET_PORTAL_SPRITE_INSTANCE_ID = 'rocco-bait-shop-toilet-portal-instance';
const BAIT_SHOP_TOILET_PORTAL_OPEN_ANIMATION_ID = 'bait-shop-toilet-portal-open';
const BAIT_SHOP_TOILET_PORTAL_LOOP_ANIMATION_ID = 'bait-shop-toilet-portal-loop';
const BAIT_SHOP_TOILET_PORTAL_FRAME_DURATION_MS = 120;
const BAIT_SHOP_TOILET_PORTAL_IMAGE_ID_PREFIX = 'rocco-bait-shop-toilet-portal-image';
const BAIT_SHOP_TOILET_PORTAL_FRAME_ID_PREFIX = 'rocco-bait-shop-toilet-portal-frame';
const BAIT_SHOP_TOILET_PORTAL_TARGET_HEIGHT = BAIT_SHOP_TOILET_TARGET_HEIGHT * 0.25;
const BAIT_SHOP_TOILET_PORTAL_OFFSET_Y = -100;
const BAIT_SHOP_TOILET_MEDALLION_STEP_SOUND_ID = 'rocco-bait-shop-toilet-medallion-step-sound';
const BAIT_SHOP_TOILET_MEDALLION_STEP_SOUND_VOLUME = 0.45;
const BAIT_SHOP_TOILET_PORTAL_LOOP_SOUND_ID = 'rocco-bait-shop-toilet-portal-loop-sound';
const BAIT_SHOP_TOILET_PORTAL_LOOP_SOUND_VOLUME = 0.5;
const BAIT_SHOP_TOILET_SPELL_SOUND_ID = 'rocco-bait-shop-toilet-spell-sound';
const BAIT_SHOP_TOILET_SPELL_SOUND_VOLUME = 0.42;
const DOOR_CLOSING_SOUND_ID = 'rocco-bait-shop-door-closing-sound';
const DOOR_CLOSING_SOUND_VOLUME = 0.21;
const BAIT_SHOP_TOILET_WISH_LINE_TTL_MS = 2800;
const BAIT_SHOP_TOILET_DIRECT_DEFEAT_DELAY_MS = BAIT_SHOP_TOILET_WISH_LINE_TTL_MS;
const BAIT_SHOP_TOILET_POST_WISH_POLICE_WARNING_DELAY_MS = 1000;
const BAIT_SHOP_TOILET_POST_WISH_POLICE_WARNING_TTL_MS = 10 * 60 * 1000;
const BAIT_SHOP_TOILET_POST_WISH_PLAYER_REPLY_TTL_MS = 2600;
const BAIT_SHOP_TOILET_POST_WISH_POLICE_REPLY_TTL_MS = 3200;
const BAIT_SHOP_TOILET_POLICE_DIALOGUE_TEXT_COLOR = '#1b4ea1';
const BAIT_SHOP_TOILET_POLICE_DIALOGUE_BUBBLE_FILL = '#e6eefb';
const BAIT_SHOP_PERSPECTIVE_AUTO_ADJUST = {
  farY: 280,
  nearY: 530,
  farScale: 0.8,
  nearScale: 1,
} as const;

const BAIT_SHOP_TOILET_THROW_RELIC_SPRITE_DEFINITION_ID = 'rocco-bait-shop-toilet-throw-relic';
const BAIT_SHOP_TOILET_THROW_RELIC_SPRITE_INSTANCE_ID =
  'rocco-bait-shop-toilet-throw-relic-instance';
const BAIT_SHOP_TOILET_THROW_RELIC_IMAGE_ID = 'rocco-bait-shop-toilet-throw-relic-image';
const BAIT_SHOP_TOILET_THROW_RELIC_FRAME_ID = 'rocco-bait-shop-toilet-throw-relic-frame';
const BAIT_SHOP_TOILET_THROW_CENTER_GROUND_X = DEFAULT_DESIGN_WIDTH / 2;
const BAIT_SHOP_TOILET_THROW_BACK_GROUND_Y = 0;
const BAIT_SHOP_TOILET_THROW_FACE_FRONT_WAIT_MS = 250;
const BAIT_SHOP_TOILET_THROW_RELIC_START_OFFSET_X = 50;
const BAIT_SHOP_TOILET_THROW_RELIC_FALL_OFFSET_Y = 50;
const BAIT_SHOP_TOILET_THROW_RELIC_FALL_DURATION_MS = 300;

const BAIT_SHOP_TOILET_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: BAIT_SHOP_TOILET_RETURN_CONNECTOR_ID,
    exitArea: {
      x: 0,
      y: DEFAULT_DESIGN_HEIGHT - BAIT_SHOP_TOILET_RETURN_EXIT_TRIGGER_HEIGHT,
      width: DEFAULT_DESIGN_WIDTH,
      height: BAIT_SHOP_TOILET_RETURN_EXIT_TRIGGER_HEIGHT,
    },
    entryPoint: {
      ...BAIT_SHOP_TOILET_ENTRY_POSITION,
    },
    entryFacing: 'up',
  },
  {
    id: BAIT_SHOP_TOILET_PORTAL_CONNECTOR_ID,
    entryPoint: {
      x: DEFAULT_DESIGN_WIDTH / 2,
      y: DEFAULT_DESIGN_HEIGHT / 2,
    },
    entryFacing: 'up',
  },
];

const BAIT_SHOP_TOILET_READING_BACKDROP_PLANE: RoccoGraphicPlane = {
  id: BAIT_SHOP_TOILET_READING_BACKDROP_PLANE_ID,
  name: 'Bait Shop Toilet Reading Backdrop',
  enabled: true,
  source: {
    kind: 'solid',
    color: DEFAULT_ROCCO_GREEN_BLACK,
  },
  colorModel: { kind: 'native' },
  transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
  scroll: { x: 0, y: 0 },
  wrap: { x: false, y: false },
  opacity: 0.98,
  priority: 100,
  renderLayer: 'foreground',
  visible: false,
};

const BAIT_SHOP_TOILET_READING_IMAGE_PLANE: RoccoGraphicPlane = {
  id: BAIT_SHOP_TOILET_READING_IMAGE_PLANE_ID,
  name: 'Bait Shop Toilet Rocco Reading Magazine',
  enabled: true,
  source: {
    kind: 'image',
    uri: baitShopToiletAssetUrls.readingMagazine,
    width: BAIT_SHOP_TOILET_READING_IMAGE_WIDTH,
    height: BAIT_SHOP_TOILET_READING_IMAGE_HEIGHT,
  },
  colorModel: { kind: 'native' },
  transform: {
    x: BAIT_SHOP_TOILET_READING_IMAGE_X,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
  },
  scroll: { x: 0, y: 0 },
  wrap: { x: false, y: false },
  opacity: 1,
  priority: 101,
  renderLayer: 'foreground',
  visible: false,
};

const BAIT_SHOP_TOILET_SCENE_DEFINITION: RoccoBaitShopSceneDefinition = {
  sceneId: BAIT_SHOP_TOILET_SCENE_ID,
  planeIds: {
    backplate: 'rocco-bait-shop-toilet-backplate',
    background: 'rocco-bait-shop-toilet-background',
  },
  backgroundUri: baitShopToiletAssetUrls.background,
  backgroundName: 'Bait Shop Toilet Background',
  extraPlanes: [BAIT_SHOP_TOILET_READING_BACKDROP_PLANE, BAIT_SHOP_TOILET_READING_IMAGE_PLANE],
};

function makeBaitShopToiletActionMenuBase(): Omit<RoccoActionMenuDefinition, 'id' | 'items'> {
  return {
    targetInstanceIds: [BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID],
    renderLayer: 'ui.action-menu',
    itemSize: 92,
    orbitRadius: 88,
    orbitSpeedRadiansPerSecond: 0.08,
    hoverScale: 1.16,
    circleFill: '#0f1610',
    circleStroke: '#d7e6c5',
    circleStrokeWidth: 2,
  };
}

function toOriginFromGroundPoint(
  groundPoint: RoccoPoint,
  scaleX: number,
  scaleY: number,
): RoccoPoint {
  return {
    x: groundPoint.x - DEFAULT_SPRITE_GROUND_ANCHOR_X * scaleX,
    y: groundPoint.y - DEFAULT_SPRITE_GROUND_ANCHOR_Y * scaleY,
  };
}

function suppressDefaultPlayerMovement(): CartridgeActionDisposition {
  return {
    consumed: true,
    defaultPlayerMovement: 'suppress',
  };
}

async function preloadBaitShopToiletSound(
  engine: CartridgeSdkV1Runtime,
  preloader: RoccoAssetPreloader | undefined,
  soundId: string,
  failureMessage: string,
): Promise<void> {
  try {
    if (preloader) {
      await preloader.preloadSound(engine, soundId);
    } else {
      await engine.audio.preloadSound(soundId);
    }
  } catch {
    engine.log('Audio', failureMessage);
  }
}

type BaitShopToiletCrop = Awaited<ReturnType<typeof createRoccoSpriteAutoCroppedFrames>>;

function createBaitShopToiletDefinition(
  crop: BaitShopToiletCrop,
  frameIds: readonly string[],
): RoccoSpriteDefinition {
  return {
    id: BAIT_SHOP_TOILET_SPRITE_DEFINITION_ID,
    name: 'Bait Shop Toilet',
    images: crop.images,
    frames: crop.frames,
    animations: {
      [BAIT_SHOP_TOILET_IDLE_ANIMATION_ID]: {
        id: BAIT_SHOP_TOILET_IDLE_ANIMATION_ID,
        loop: false,
        playbackRate: 1,
        frames: frameIds.map((frameId) => ({
          frameId,
          durationMs: BAIT_SHOP_TOILET_FRAME_DURATION_MS,
        })),
      },
    },
    defaultAnimation: BAIT_SHOP_TOILET_IDLE_ANIMATION_ID,
    render: { renderLayer: 'world.behind', zIndex: 10, depthMode: 'fixed', opacity: 1 },
    metadata: { purpose: 'bait-shop-toilet' },
  };
}

function createBaitShopToiletPortalDefinition(
  crop: BaitShopToiletCrop,
  frameIds: readonly string[],
): RoccoSpriteDefinition {
  const openingFrameIds = frameIds.slice(0, 8);
  const loopFrameIds = frameIds.slice(4, 8);
  return {
    id: BAIT_SHOP_TOILET_PORTAL_SPRITE_DEFINITION_ID,
    name: 'Bait Shop Toilet Portal',
    images: crop.images,
    frames: crop.frames,
    animations: {
      [BAIT_SHOP_TOILET_PORTAL_OPEN_ANIMATION_ID]: {
        id: BAIT_SHOP_TOILET_PORTAL_OPEN_ANIMATION_ID,
        loop: false,
        next: BAIT_SHOP_TOILET_PORTAL_LOOP_ANIMATION_ID,
        playbackRate: 1,
        frames: openingFrameIds.map((frameId) => ({
          frameId,
          durationMs: BAIT_SHOP_TOILET_PORTAL_FRAME_DURATION_MS,
        })),
      },
      [BAIT_SHOP_TOILET_PORTAL_LOOP_ANIMATION_ID]: {
        id: BAIT_SHOP_TOILET_PORTAL_LOOP_ANIMATION_ID,
        loop: true,
        playbackRate: 1,
        frames: loopFrameIds.map((frameId) => ({
          frameId,
          durationMs: BAIT_SHOP_TOILET_PORTAL_FRAME_DURATION_MS,
        })),
      },
    },
    defaultAnimation: BAIT_SHOP_TOILET_PORTAL_OPEN_ANIMATION_ID,
    render: { renderLayer: 'world.front', zIndex: 21, depthMode: 'fixed', opacity: 1 },
    metadata: { purpose: 'bait-shop-toilet-portal' },
    ignoreMessages: true,
  };
}

async function createBaitShopToiletSpriteDefinition(): Promise<{
  definition: RoccoSpriteDefinition;
  frameCount: number;
  initialFrameWidth: number;
  initialFrameHeight: number;
}> {
  const crop = await createRoccoSpriteAutoCroppedFrames({
    mode: 'sheet-components',
    sources: [
      {
        id: BAIT_SHOP_TOILET_SHEET_IMAGE_ID,
        uri: baitShopToiletAssetUrls.sheet,
      },
    ],
    frameIdPrefix: 'bait-shop-toilet-pose',
    durationMs: BAIT_SHOP_TOILET_FRAME_DURATION_MS,
    alphaThreshold: BAIT_SHOP_TOILET_SHEET_ALPHA_THRESHOLD,
    padding: BAIT_SHOP_TOILET_SHEET_PADDING,
    minOpaquePixels: BAIT_SHOP_TOILET_SHEET_MIN_OPAQUE_PIXELS,
    pivot: { mode: 'bottom-center' },
  });

  const frameIds = crop.frameIds.length > 0 ? crop.frameIds : ['bait-shop-toilet-pose-1'];
  const initialFrame = crop.frames.find((frame) => frame.id === frameIds[0]) ??
    crop.frames[0] ?? {
      id: 'fallback',
      imageId: BAIT_SHOP_TOILET_SHEET_IMAGE_ID,
      rect: {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      },
      durationMs: BAIT_SHOP_TOILET_FRAME_DURATION_MS,
      pivot: {
        x: 0,
        y: 0,
      },
    };
  const initialFrameRect = initialFrame.rect ?? {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  };

  return {
    frameCount: frameIds.length,
    initialFrameWidth: initialFrameRect.width,
    initialFrameHeight: initialFrameRect.height,
    definition: createBaitShopToiletDefinition(crop, frameIds),
  };
}

async function createBaitShopToiletSmokeSpriteDefinition(): Promise<{
  definition: RoccoSpriteDefinition;
  frameCount: number;
  initialFrameHeight: number;
}> {
  const crop = await createRoccoSpriteAutoCroppedFrames({
    mode: 'image-list',
    sources: baitShopToiletAssetUrls.smokeFrames.map((uri, index) => ({
      id: `${BAIT_SHOP_TOILET_SMOKE_IMAGE_ID_PREFIX}-${index + 1}`,
      uri,
    })),
    frameIdPrefix: BAIT_SHOP_TOILET_SMOKE_FRAME_ID_PREFIX,
    durationMs: BAIT_SHOP_TOILET_SMOKE_FRAME_DURATION_MS,
    alphaThreshold: 1,
    padding: 0,
    pivot: { mode: 'bottom-center' },
    hitbox: 'none',
  });

  const frameIds =
    crop.frameIds.length > 0 ? crop.frameIds : [`${BAIT_SHOP_TOILET_SMOKE_FRAME_ID_PREFIX}-1`];
  const initialFrame = crop.frames.find((frame) => frame.id === frameIds[0]) ?? crop.frames[0];
  const initialFrameHeight = initialFrame?.rect?.height ?? 1;

  return {
    frameCount: frameIds.length,
    initialFrameHeight,
    definition: {
      id: BAIT_SHOP_TOILET_SMOKE_SPRITE_DEFINITION_ID,
      name: 'Bait Shop Toilet Smoke',
      images: crop.images,
      frames: crop.frames,
      animations: {
        [BAIT_SHOP_TOILET_SMOKE_ANIMATION_ID]: {
          id: BAIT_SHOP_TOILET_SMOKE_ANIMATION_ID,
          loop: false,
          playbackRate: 1,
          frames: frameIds.map((frameId) => ({
            frameId,
            durationMs: BAIT_SHOP_TOILET_SMOKE_FRAME_DURATION_MS,
          })),
        },
      },
      defaultAnimation: BAIT_SHOP_TOILET_SMOKE_ANIMATION_ID,
      render: {
        renderLayer: 'world.front',
        zIndex: 22,
        depthMode: 'fixed',
        opacity: 1,
      },
      metadata: {
        purpose: 'bait-shop-toilet-smoke',
      },
      ignoreMessages: true,
    },
  };
}

async function createBaitShopToiletPortalSpriteDefinition(): Promise<{
  definition: RoccoSpriteDefinition;
  initialFrameWidth: number;
  initialFrameHeight: number;
}> {
  const crop = await createRoccoSpriteAutoCroppedFrames({
    mode: 'image-list',
    sources: baitShopToiletAssetUrls.portalFrames.map((uri, index) => ({
      id: `${BAIT_SHOP_TOILET_PORTAL_IMAGE_ID_PREFIX}-${index + 1}`,
      uri,
    })),
    frameIdPrefix: BAIT_SHOP_TOILET_PORTAL_FRAME_ID_PREFIX,
    durationMs: BAIT_SHOP_TOILET_PORTAL_FRAME_DURATION_MS,
    alphaThreshold: 1,
    padding: 0,
    pivot: { mode: 'bottom-center' },
    hitbox: 'none',
  });

  const frameIds =
    crop.frameIds.length > 0 ? crop.frameIds : [`${BAIT_SHOP_TOILET_PORTAL_FRAME_ID_PREFIX}-1`];
  const initialFrame = crop.frames.find((frame) => frame.id === frameIds[0]) ?? crop.frames[0];
  const initialFrameWidth = initialFrame?.rect?.width ?? 1;
  const initialFrameHeight = initialFrame?.rect?.height ?? 1;
  return {
    initialFrameWidth,
    initialFrameHeight,
    definition: createBaitShopToiletPortalDefinition(crop, frameIds),
  };
}

function createSeatedRoccoActionMenuDefinition(
  localization: RoccoLocalization,
  isDeveloperModeEnabled: boolean,
): RoccoActionMenuDefinition {
  const base = createRoccoPlayerActionMenuDefinition(localization, isDeveloperModeEnabled);
  const items: RoccoActionMenuDefinition['items'] = [
    {
      id: 'talk',
      actionId: ROCCO_PLAYER_TALK_ACTION_ID,
      label: localization.text.actions.talk,
      imageUri: roccoDefaultActionMenuAssetUrls.talk,
    },
    {
      id: 'inventory',
      actionId: ROCCO_PLAYER_INVENTORY_ACTION_ID,
      label: localization.text.actions.inventory,
      imageUri: roccoDefaultActionMenuAssetUrls.inventory,
    },
  ];

  if (isDeveloperModeEnabled) {
    items.push({
      id: 'developer-mode',
      actionId: ROCCO_PLAYER_DEVELOPER_ACTION_ID,
      label: localization.text.developer.actionLabel,
      imageUri: roccoDefaultActionMenuAssetUrls.developerMode,
    });
  }

  items.push({
    id: 'read',
    actionId: BAIT_SHOP_TOILET_READ_ACTION_ID,
    label: localization.text.baitShop.toiletReadLabel,
    imageUri: roccoDefaultActionMenuAssetUrls.look,
  });

  return {
    ...base,
    id: ROCCO_PLAYER_ACTION_MENU_ID,
    targetInstanceIds: [BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID],
    items,
  };
}

class RoccoBaitShopToiletController
  implements RoccoLevel, RoccoToiletLevelCapability, BaitShopToiletSeatControllerHost
{
  private readonly localization: RoccoLocalization;
  private readonly options: RoccoBaitShopToiletLevelOptions;
  private readonly seatController: BaitShopToiletSeatController;
  private engine: CartridgeSdkV1Runtime | undefined;
  private inputLease: ReturnType<CartridgeSdkV1Runtime['acquireInputLease']> | undefined;
  private spriteController: RoccoDefaultSpriteController | undefined;
  private readingDialogue: RoccoDialogueSession | undefined;
  private policeDialogue: RoccoDialogueSession | undefined;
  private onConnectorTransitionRequested: ((connectorId: string) => boolean) | undefined;
  private toiletFrameCount = 0;
  private readingSequence: BaitShopToiletReadingSequence | undefined;
  private onRestartRequested: (() => void) | undefined;
  private pendingPostStandStanAlert = false;
  private passiveStanPoliceAlertElapsedMs: number | undefined;
  private activePoliceVoiceTtlMs = BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_TTL_MS;
  private escapeUrgencyActive = false;
  private portalPendingActivation = false;
  private toiletRemoved = false;
  private portalActive = false;
  private portalTransitionRequested = false;
  private toiletTargetRect: { x: number; y: number; width: number; height: number } | undefined;
  private portalTargetRect: { x: number; y: number; width: number; height: number } | undefined;
  private smokeScale = 1;
  private portalScale = 1;
  private smokeFrameCount = 0;
  private pendingCoralRelicWish:
    | {
        groundPoint: RoccoPoint;
        consumeRelic: () => void;
      }
    | undefined;
  private wishSequence: BaitShopToiletWishSequence | undefined;
  private throwSequence: BaitShopToiletThrowSequence | undefined;
  private shouldPlayDoorClosingSound = false;

  readonly id = ROCCO_BAIT_SHOP_TOILET_LEVEL_ID;
  readonly title: string;
  readonly connectors = BAIT_SHOP_TOILET_CONNECTORS;

  constructor(
    localization: RoccoLocalization = createRoccoLocalization(),
    options: RoccoBaitShopToiletLevelOptions = {},
  ) {
    this.localization = localization;
    this.options = options;
    this.title = localization.text.levels.baitShopToiletTitle;
    this.seatController = new BaitShopToiletSeatController(
      this,
      this.createSeatControllerOptions(),
    );
  }

  private createSeatControllerOptions(): BaitShopToiletSeatControllerOptions {
    return {
      sitApproachPoint: { ...BAIT_SHOP_TOILET_SIT_APPROACH_POINT },
      sitSeatPoint: { ...BAIT_SHOP_TOILET_SIT_SEAT_POINT },
      sitWaitMs: BAIT_SHOP_TOILET_SIT_WAIT_MS,
    };
  }

  hasPlayerSprite(): boolean {
    return Boolean(this.engine?.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID));
  }

  closeInteractionUi(): void {
    this.engine?.video.actionMenus.closeMenu();
    this.engine?.video.messages.clearMessages();
  }

  stopPlayerMovement(): void {
    this.engine?.video.sprites.stopMovement(DEFAULT_SPRITE_INSTANCE_ID);
  }

  isPlayerMoving(): boolean {
    return this.engine?.video.sprites.isMoving(DEFAULT_SPRITE_INSTANCE_ID) ?? false;
  }

  playIdleAction(direction: RoccoFacingDirection): void {
    this.engine?.video.sprites.playAction(
      DEFAULT_SPRITE_INSTANCE_ID,
      DEFAULT_SPRITE_IDLE_ACTION_ID,
      {
        direction,
        restart: true,
      },
    );
  }

  startWalkTo(point: RoccoPoint, options: { constrainToWalkMap?: boolean } = {}): boolean {
    return (
      this.engine?.video.sprites.goTo(DEFAULT_SPRITE_INSTANCE_ID, point.x, point.y, {
        action: DEFAULT_SPRITE_RUN_ACTION_ID,
        idleAction: DEFAULT_SPRITE_IDLE_ACTION_ID,
        constrainToWalkMap: options.constrainToWalkMap,
        stopDistance: 1,
        idleSettleDelayMs: 0,
        idleSettleFacing: 'diagonal-from-facing',
      }) ?? false
    );
  }

  render(): void {}

  finishSitPresentation(): void {
    if (!this.engine) {
      return;
    }
    this.setToiletVisibleDescription(this.localization.text.descriptions.seatedRocco);
    this.installSeatedRoccoActionMenu();
    this.setInputEnabled(true);
  }

  finishStandPresentation(destination: RoccoPoint | undefined): void {
    if (!this.engine) {
      return;
    }
    this.setToiletVisibleDescription(this.localization.text.descriptions.toilet);
    this.restoreDefaultActionMenus();
    this.syncToiletUrgencyPresentation();
    this.setInputEnabled(true);
    if (destination) {
      this.engine.video.sprites.goTo(DEFAULT_SPRITE_INSTANCE_ID, destination.x, destination.y, {
        idleSettleDelayMs: 0,
        idleSettleFacing: 'diagonal-from-facing',
      });
    }
    if (this.pendingPostStandStanAlert) {
      this.pendingPostStandStanAlert = false;
      this.startPassiveStanPoliceAlert();
    }
  }

  get roccoSeated(): boolean {
    return this.seatController.isSeated();
  }

  get roccoSatOnToilet(): boolean {
    return this.seatController.hasSatOnToilet();
  }

  setInputEnabled(isEnabled: boolean): void {
    if (isEnabled) {
      this.inputLease?.dispose();
      this.inputLease = undefined;
      return;
    }

    if (!this.inputLease && this.engine) {
      this.inputLease = this.engine.acquireInputLease('rocco-bait-shop-toilet-level', 'blocked');
    }
  }

  handlePortalSceneClick(activation: RoccoSceneClickAction): boolean {
    if (
      !this.engine ||
      !this.portalActive ||
      activation.targetInstanceId !== BAIT_SHOP_TOILET_PORTAL_SPRITE_INSTANCE_ID
    ) {
      return false;
    }

    if (this.isPlayerOverPortalZone()) {
      this.updatePortalTransition();
      return true;
    }

    const portalBasePoint = this.resolvePortalBasePoint();
    const isStarted = this.engine.video.sprites.goTo(
      DEFAULT_SPRITE_INSTANCE_ID,
      portalBasePoint.x,
      portalBasePoint.y,
      {
        action: DEFAULT_SPRITE_RUN_ACTION_ID,
        idleAction: DEFAULT_SPRITE_IDLE_ACTION_ID,
        stopDistance: 1,
        idleSettleDelayMs: 0,
        idleSettleFacing: 'diagonal-from-facing',
      },
    );

    if (isStarted) {
      // The render loop owns presentation updates.
    }

    return isStarted;
  }

  private hasMagazine(): boolean {
    return this.options.hasMagazine?.() ?? false;
  }

  private hasCoralRelic(): boolean {
    return this.options.hasCoralRelic?.() ?? false;
  }

  private isToiletReuseDuringUrgencyEnabled(): boolean {
    return this.options.allowReuseDuringUrgency?.() ?? false;
  }

  private resolveCoralRelicAssemblyPlan(): RoccoCoralRelicAssemblyPlan {
    const plannedAssembly = this.options.getCoralRelicAssemblyPlan?.();
    if (plannedAssembly) {
      return plannedAssembly;
    }

    if (this.hasCoralRelic()) {
      return {
        status: 'ready',
        steps: [],
      };
    }

    return {
      status: 'missing',
      steps: [],
    };
  }

  private createCraftableCoralRelicReadingLines(
    steps: readonly RoccoInventoryFusionStep[],
  ): readonly string[] {
    return [
      this.localization.text.baitShop.toiletMagazineReadingCraftableRelicIntroLine,
      ...steps.map((step) => this.createCraftableCoralRelicStepLine(step)),
      this.localization.text.baitShop.toiletMagazineReadingCraftableRelicOutroLine,
    ].filter((line) => line.trim().length > 0);
  }

  private createCraftableCoralRelicStepLine(step: RoccoInventoryFusionStep): string {
    const [firstItemId, secondItemId] = step.ingredientIds;
    return this.formatTemplateLine(
      this.localization.text.baitShop.toiletMagazineReadingCraftStepLine,
      {
        first: resolveRoccoInventoryItemLabel(firstItemId, this.localization) ?? firstItemId,
        second: resolveRoccoInventoryItemLabel(secondItemId, this.localization) ?? secondItemId,
        result:
          resolveRoccoInventoryItemLabel(step.resultItemId, this.localization) ?? step.resultItemId,
      },
    );
  }

  private formatTemplateLine(template: string, replacements: Record<string, string>): string {
    let formatted = template;
    for (const [key, value] of Object.entries(replacements)) {
      formatted = formatted.replaceAll(`{${key}}`, () => value);
    }

    return formatted;
  }

  private beginDefeatSequence(): void {
    if (!this.engine || this.readingSequence) {
      return;
    }

    this.pendingCoralRelicWish = undefined;
    this.wishSequence = undefined;
    this.engine.video.actionMenus.closeMenu();
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.gridMenus.clearCarriedItem();
    this.engine.video.messages.clearMessages();
    this.readingDialogue?.cancel();
    this.clearPassiveStanPoliceAlert();
    this.removeReadingMessageAnchorSprite();
    this.setInputEnabled(false);
    this.readingSequence = {
      phase: 'fading',
      lineIndex: 0,
      lines: [],
      elapsedMs: 0,
    };
    this.engine.audio.playSound(BAIT_SHOP_TOILET_READING_DEFEAT_SOUND_ID, {
      restart: true,
      volume: BAIT_SHOP_TOILET_READING_DEFEAT_SOUND_VOLUME,
    });
    this.addReadingDefeatFadePrimitive(0);
  }

  private updateThrowSequence(deltaMs: number): void {
    if (!this.engine || !this.throwSequence || !Number.isFinite(deltaMs) || deltaMs < 0) {
      return;
    }

    const sequence = this.throwSequence;
    switch (sequence.phase) {
      case 'walking-to-center': {
        this.updateThrowWalkingToCenter(sequence);
        break;
      }
      case 'walking-to-back': {
        this.updateThrowWalkingToBack();
        break;
      }
      case 'pickup-hold': {
        this.updateThrowPickupHold(sequence, deltaMs);
        break;
      }
      case 'falling': {
        this.updateThrowFalling(sequence, deltaMs);
        break;
      }
    }
  }

  private updateThrowWalkingToCenter(sequence: BaitShopToiletThrowSequence): void {
    if (!this.engine || this.engine.video.sprites.isMoving(DEFAULT_SPRITE_INSTANCE_ID)) {
      return;
    }

    const isStarted = this.engine.video.sprites.goTo(
      DEFAULT_SPRITE_INSTANCE_ID,
      BAIT_SHOP_TOILET_THROW_CENTER_GROUND_X,
      BAIT_SHOP_TOILET_THROW_BACK_GROUND_Y,
      {
        action: DEFAULT_SPRITE_RUN_ACTION_ID,
        idleAction: DEFAULT_SPRITE_IDLE_ACTION_ID,
        stopDistance: 1,
        idleSettleDelayMs: 0,
        idleSettleFacing: 'diagonal-from-facing',
      },
    );
    if (!isStarted) {
      this.finishThrowSequence();
      return;
    }
    sequence.phase = 'walking-to-back';
    sequence.elapsedMs = 0;
  }

  private updateThrowWalkingToBack(): void {
    if (!this.engine || this.engine.video.sprites.isMoving(DEFAULT_SPRITE_INSTANCE_ID)) {
      return;
    }
    this.beginPickupHold();
  }

  private updateThrowPickupHold(sequence: BaitShopToiletThrowSequence, deltaMs: number): void {
    if (!this.engine) {
      return;
    }
    sequence.elapsedMs += deltaMs;
    if (sequence.elapsedMs < BAIT_SHOP_TOILET_THROW_FACE_FRONT_WAIT_MS) {
      return;
    }
    this.engine.video.sprites.playAction(
      DEFAULT_SPRITE_INSTANCE_ID,
      DEFAULT_SPRITE_IDLE_ACTION_ID,
      {
        direction: 'down',
        restart: true,
      },
    );
    sequence.phase = 'falling';
    sequence.elapsedMs = 0;
  }

  private updateThrowFalling(sequence: BaitShopToiletThrowSequence, deltaMs: number): void {
    if (!this.engine) {
      return;
    }
    sequence.elapsedMs += deltaMs;
    const progress = Math.min(
      1,
      sequence.elapsedMs / BAIT_SHOP_TOILET_THROW_RELIC_FALL_DURATION_MS,
    );
    const eased = 1 - (1 - progress) * (1 - progress);
    const x = sequence.startPoint.x + (sequence.endPoint.x - sequence.startPoint.x) * eased;
    const y = sequence.startPoint.y + (sequence.endPoint.y - sequence.startPoint.y) * eased;
    this.engine.video.sprites.setPosition(BAIT_SHOP_TOILET_THROW_RELIC_SPRITE_INSTANCE_ID, x, y);
    if (progress >= 1) {
      this.finishThrowSequence();
    }
  }

  private beginPickupHold(): void {
    if (!this.engine || !this.throwSequence) {
      this.finishThrowSequence();
      return;
    }

    const player = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!player) {
      this.finishThrowSequence();
      return;
    }

    const placement = this.resolveThrowRelicPlacement(player);

    this.throwSequence.relicScale = placement.relicScale;
    this.throwSequence.startPoint = placement.startPoint;
    this.throwSequence.endPoint = placement.endPoint;
    this.throwSequence.groundPoint = { ...placement.endPoint };

    this.engine.video.sprites.playAction(
      DEFAULT_SPRITE_INSTANCE_ID,
      DEFAULT_SPRITE_PICK_UP_ACTION_ID,
      {
        direction: 'down',
        restart: true,
      },
    );

    this.engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_THROW_RELIC_SPRITE_INSTANCE_ID);
    this.engine.video.sprites.createSpriteFromDefinition(
      BAIT_SHOP_TOILET_THROW_RELIC_SPRITE_DEFINITION_ID,
      {
        id: BAIT_SHOP_TOILET_THROW_RELIC_SPRITE_INSTANCE_ID,
        transform: {
          x: placement.startPoint.x,
          y: placement.startPoint.y,
          scaleX: placement.relicScale,
          scaleY: placement.relicScale,
          rotation: 0,
        },
        renderLayer: 'world.behind',
        zIndex: 14,
        depthMode: 'fixed',
        interactive: false,
        collisionEnabled: false,
        ignoreMessages: true,
      },
    );
    this.engine.video.sprites.stopAnimation(BAIT_SHOP_TOILET_THROW_RELIC_SPRITE_INSTANCE_ID);
    this.engine.video.sprites.setAnimationFrame(BAIT_SHOP_TOILET_THROW_RELIC_SPRITE_INSTANCE_ID, 0);

    this.throwSequence.phase = 'pickup-hold';
    this.throwSequence.elapsedMs = 0;
  }

  private resolveThrowRelicPlacement(
    player: RoccoSpriteInstance,
  ): BaitShopToiletThrowRelicPlacement {
    const scaleX = player.transform.scaleX || DEFAULT_SPRITE_SCALE;
    const scaleY = player.transform.scaleY || DEFAULT_SPRITE_SCALE;
    const roccoSpriteWidth = DEFAULT_SPRITE_FRAME_WIDTH * scaleX;
    const roccoSpriteHeight = DEFAULT_SPRITE_FRAME_HEIGHT * scaleY;
    const originX = player.transform.x;
    const originY = player.transform.y;
    const centerX = originX + roccoSpriteWidth / 2;
    return {
      relicScale: DEFAULT_CORAL_RELIC_GROUND_SPRITE.scaleRelativeToRoccoBase * scaleY,
      startPoint: {
        x: originX + BAIT_SHOP_TOILET_THROW_RELIC_START_OFFSET_X,
        y: originY + roccoSpriteHeight / 2,
      },
      endPoint: {
        x: centerX,
        y: originY + roccoSpriteHeight + BAIT_SHOP_TOILET_THROW_RELIC_FALL_OFFSET_Y,
      },
    };
  }

  private finishThrowSequence(): void {
    if (!this.engine) {
      this.throwSequence = undefined;
      return;
    }

    const sequence = this.throwSequence;
    this.throwSequence = undefined;
    this.engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_THROW_RELIC_SPRITE_INSTANCE_ID);
    this.setInputEnabled(true);
    if (sequence) {
      const groundPoint =
        sequence.groundPoint.x !== 0 || sequence.groundPoint.y !== 0
          ? sequence.groundPoint
          : (this.resolvePlayerGroundPoint() ?? sequence.groundPoint);
      sequence.onComplete({ ...groundPoint });
    }
  }

  private createThrowRelicSpriteDefinition(): RoccoSpriteDefinition {
    const width = DEFAULT_CORAL_RELIC_GROUND_SPRITE.width;
    const height = DEFAULT_CORAL_RELIC_GROUND_SPRITE.height;

    return {
      id: BAIT_SHOP_TOILET_THROW_RELIC_SPRITE_DEFINITION_ID,
      name: 'Thrown Coral Relic',
      images: [
        {
          id: BAIT_SHOP_TOILET_THROW_RELIC_IMAGE_ID,
          uri: roccoCoralRelicAssetUrl,
          width,
          height,
        },
      ],
      frames: [
        {
          id: BAIT_SHOP_TOILET_THROW_RELIC_FRAME_ID,
          imageId: BAIT_SHOP_TOILET_THROW_RELIC_IMAGE_ID,
          durationMs: 1000,
          pivot: {
            x: width / 2,
            y: height,
          },
        },
      ],
      animations: {
        idle: {
          id: 'idle',
          loop: false,
          playbackRate: 1,
          frames: [
            {
              frameId: BAIT_SHOP_TOILET_THROW_RELIC_FRAME_ID,
              durationMs: 1000,
            },
          ],
        },
      },
      defaultAnimation: 'idle',
      render: {
        renderLayer: 'world.behind',
        zIndex: 14,
        depthMode: 'fixed',
        opacity: 1,
      },
      metadata: {
        purpose: 'thrown-coral-relic',
      },
    };
  }

  private isSeatedAction(activation: RoccoActionMenuActivation): boolean {
    return (
      this.roccoSeated &&
      activation.definitionId === ROCCO_PLAYER_ACTION_MENU_ID &&
      activation.targetInstanceId === BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID
    );
  }

  private handleSeatedAction(activation: RoccoActionMenuActivation): void {
    if (activation.actionId === ROCCO_PLAYER_TALK_ACTION_ID) {
      this.showToiletThoughtLines(
        this.localization.text.rocco.selfTalkLines,
        BAIT_SHOP_TOILET_SELF_TALK_HISTORY_KEY,
      );
      return;
    }

    if (activation.actionId === BAIT_SHOP_TOILET_READ_ACTION_ID) {
      this.startMagazineReadingSequence();
    }
  }

  private startMagazineReadingSequence(): void {
    if (!this.engine || !this.readingDialogue || this.readingSequence) {
      return;
    }

    const lines = this.createMagazineReadingLines();
    if (lines.length === 0) {
      return;
    }

    this.engine.video.actionMenus.closeMenu();
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.gridMenus.clearCarriedItem();
    this.engine.video.messages.clearMessages();
    this.readingDialogue.cancel();
    this.clearPassiveStanPoliceAlert();
    this.engine.video.sprites.stopMovement(DEFAULT_SPRITE_INSTANCE_ID);
    this.setReadingOverlayVisible(true);
    this.readingSequence = {
      phase: 'lines',
      lineIndex: 0,
      lines,
      elapsedMs: 0,
    };
    this.showCurrentMagazineReadingLine();
  }

  private advanceReadingSequence(): void {
    if (!this.engine || !this.readingSequence || this.readingSequence.phase !== 'lines') {
      return;
    }

    if (this.readingSequence.lineIndex < this.readingSequence.lines.length - 1) {
      this.readingSequence = {
        ...this.readingSequence,
        lineIndex: this.readingSequence.lineIndex + 1,
        elapsedMs: 0,
      };
      this.showCurrentMagazineReadingLine();
      return;
    }

    if (this.resolveCoralRelicAssemblyPlan().status !== 'missing') {
      this.beginEscapeStandSequence();
      return;
    }

    this.beginStanPoliceAlert();
  }

  private updateReadingSequence(deltaMs: number): void {
    if (
      !this.engine ||
      !this.readingSequence ||
      this.readingSequence.phase === 'restarting' ||
      !Number.isFinite(deltaMs) ||
      deltaMs <= 0
    ) {
      return;
    }

    if (this.readingSequence.phase === 'lines') {
      return;
    }

    if (this.readingSequence.phase === 'stan-alert') {
      return;
    }

    if (this.readingSequence.phase === 'fading') {
      const elapsedMs = Math.min(
        BAIT_SHOP_TOILET_READING_DEFEAT_FADE_DURATION_MS,
        this.readingSequence.elapsedMs + deltaMs,
      );
      this.readingSequence = {
        ...this.readingSequence,
        elapsedMs,
      };
      this.addReadingDefeatFadePrimitive(
        elapsedMs / BAIT_SHOP_TOILET_READING_DEFEAT_FADE_DURATION_MS,
      );

      if (elapsedMs >= BAIT_SHOP_TOILET_READING_DEFEAT_FADE_DURATION_MS) {
        this.showReadingDefeatTitle();
      }
      return;
    }

    const elapsedMs = this.readingSequence.elapsedMs + deltaMs;
    if (elapsedMs < BAIT_SHOP_TOILET_READING_DEFEAT_TITLE_DURATION_MS) {
      this.readingSequence = {
        ...this.readingSequence,
        elapsedMs,
      };
      return;
    }

    this.finishReadingDefeat();
  }

  private createMagazineReadingLines(): readonly string[] {
    const introLines = this.localization.text.baitShop.toiletMagazineReadingIntroLines;
    const coralRelicAssemblyPlan = this.resolveCoralRelicAssemblyPlan();
    let branchLines: readonly string[];
    if (coralRelicAssemblyPlan.status === 'ready') {
      branchLines = this.localization.text.baitShop.toiletMagazineReadingCoralRelicLines;
    } else if (coralRelicAssemblyPlan.status === 'craftable') {
      branchLines = this.createCraftableCoralRelicReadingLines(coralRelicAssemblyPlan.steps);
    } else {
      branchLines = this.localization.text.baitShop.toiletMagazineReadingMissingRelicLines;
    }
    return [
      ...introLines.slice(0, 2),
      this.isStanIdentified()
        ? this.localization.text.baitShop.toiletMagazineKnownStanLine
        : this.localization.text.baitShop.toiletMagazineUnknownStanLine,
      ...introLines.slice(2),
      ...branchLines,
    ].filter((line) => line.trim().length > 0);
  }

  private isStanIdentified(): boolean {
    return this.options.isStanIdentified?.() ?? false;
  }

  private showCurrentMagazineReadingLine(): void {
    if (!this.engine || !this.readingDialogue || !this.readingSequence) {
      return;
    }

    const line = this.readingSequence.lines[this.readingSequence.lineIndex];
    if (!line) {
      return;
    }

    this.ensureReadingMessageAnchorSprite();
    this.readingDialogue.beginLinearSequence({
      speaker: 'npc',
      lines: [line],
      lineTtlMs: BAIT_SHOP_TOILET_READING_LINE_DURATION_MS,
      messageKind: 'think',
      messageOptions: {
        id: BAIT_SHOP_TOILET_READING_MESSAGE_ID,
        side: 'above',
        maxWidth: BAIT_SHOP_TOILET_READING_MESSAGE_MAX_WIDTH,
        zIndex: 5000,
        style: {
          fill: '#101810',
          fontSize: BAIT_SHOP_TOILET_READING_MESSAGE_FONT_SIZE,
          fontWeight: '700',
          bubbleFill: '#e8ecd9',
          bubbleStroke: '#263326',
          bubbleStrokeWidth: 2,
          showThoughtTrail: false,
        },
      },
      onComplete: () => {
        if (this.readingSequence?.phase === 'lines') {
          this.advanceReadingSequence();
        }
      },
    });
  }

  private ensureReadingMessageAnchorSprite(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.sprites.removeSprite(
      BAIT_SHOP_TOILET_READING_MESSAGE_ANCHOR_SPRITE_INSTANCE_ID,
    );
    this.engine.video.sprites.createSpriteFromDefinition(BAIT_SHOP_TOILET_SPRITE_DEFINITION_ID, {
      id: BAIT_SHOP_TOILET_READING_MESSAGE_ANCHOR_SPRITE_INSTANCE_ID,
      transform: {
        x: BAIT_SHOP_TOILET_READING_MESSAGE_ANCHOR_X,
        y: BAIT_SHOP_TOILET_READING_MESSAGE_ANCHOR_Y,
        scaleX: BAIT_SHOP_TOILET_READING_MESSAGE_ANCHOR_SCALE,
        scaleY: BAIT_SHOP_TOILET_READING_MESSAGE_ANCHOR_SCALE,
        rotation: 0,
      },
      renderLayer: 'world.behind',
      zIndex: 0,
      interactive: false,
      collisionEnabled: false,
      opacity: 0.01,
      ignoreMessages: true,
    });
  }

  private removeReadingMessageAnchorSprite(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.sprites.removeSprite(
      BAIT_SHOP_TOILET_READING_MESSAGE_ANCHOR_SPRITE_INSTANCE_ID,
    );
  }

  private beginEscapeStandSequence(): void {
    if (!this.engine) {
      return;
    }

    this.readingDialogue?.cancel();
    this.readingSequence = undefined;
    this.engine.video.messages.clearMessages();
    this.removeReadingMessageAnchorSprite();
    this.setReadingOverlayVisible(false);
    this.escapeUrgencyActive = true;
    this.pendingPostStandStanAlert = true;
    this.setInputEnabled(true);
    this.startStandSequence();
    if (!this.seatController.isActive()) {
      this.pendingPostStandStanAlert = false;
      this.startPassiveStanPoliceAlert();
      this.syncToiletUrgencyPresentation();
    }
  }

  private beginReadingDefeatFade(): void {
    if (!this.engine || !this.readingSequence) {
      return;
    }

    this.readingDialogue?.cancel();
    this.clearPassiveStanPoliceAlert();
    this.readingSequence = {
      ...this.readingSequence,
      phase: 'fading',
      elapsedMs: 0,
    };
    this.setInputEnabled(false);
    this.engine.video.messages.clearMessages();
    this.removeStanPoliceAlertAnchorSprite();
    this.engine.video.actionMenus.closeMenu();
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.gridMenus.clearCarriedItem();
    this.engine.audio.playSound(BAIT_SHOP_TOILET_READING_DEFEAT_SOUND_ID, {
      restart: true,
      volume: BAIT_SHOP_TOILET_READING_DEFEAT_SOUND_VOLUME,
    });
    this.addReadingDefeatFadePrimitive(0);
  }

  private beginStanPoliceAlert(): void {
    if (!this.engine || !this.readingSequence || !this.policeDialogue) {
      return;
    }

    this.readingDialogue?.cancel();
    this.readingSequence = {
      ...this.readingSequence,
      phase: 'stan-alert',
      elapsedMs: 0,
    };
    this.engine.video.messages.clearMessages();
    this.engine.video.actionMenus.closeMenu();
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.gridMenus.clearCarriedItem();
    this.removeReadingMessageAnchorSprite();
    this.setReadingOverlayVisible(false);
    this.beginAdvanceablePoliceVoice(
      this.localization.text.baitShop.toiletPoliceAlertLine,
      BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_TTL_MS,
      'caller',
      () => {
        if (this.readingSequence?.phase === 'stan-alert') {
          this.beginReadingDefeatFade();
        }
      },
    );
  }

  private showReadingDefeatTitle(): void {
    if (!this.engine || !this.readingSequence) {
      return;
    }

    this.readingSequence = {
      ...this.readingSequence,
      phase: 'title',
      elapsedMs: 0,
    };
    this.engine.video.titles.addTitle({
      id: BAIT_SHOP_TOILET_READING_DEFEAT_TITLE_ID,
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
  }

  private finishReadingDefeat(): void {
    if (!this.engine) {
      return;
    }

    const onRestartRequested = this.onRestartRequested;
    this.readingSequence = {
      phase: 'restarting',
      lineIndex: 0,
      lines: [],
      elapsedMs: 0,
    };
    this.clearReadingPresentation();
    this.setInputEnabled(true);
    onRestartRequested?.();
  }

  private addReadingDefeatFadePrimitive(alpha: number): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.primitives.addPrimitive({
      id: BAIT_SHOP_TOILET_READING_DEFEAT_FADE_PRIMITIVE_ID,
      kind: 'rect',
      renderLayer: 'overlay.primitives',
      zIndex: 5000,
      color: DEFAULT_ROCCO_GREEN_BLACK,
      alpha,
      visible: true,
      x: 0,
      y: 0,
      width: DEFAULT_DESIGN_WIDTH,
      height: DEFAULT_DESIGN_HEIGHT,
      fill: true,
    });
  }

  private clearReadingPresentation(): void {
    if (!this.engine) {
      return;
    }

    this.readingDialogue?.cancel();
    this.clearPassiveStanPoliceAlert();
    this.readingSequence = undefined;
    this.engine.audio.stopSound(BAIT_SHOP_TOILET_READING_DEFEAT_SOUND_ID);
    this.engine.video.messages.removeMessage(BAIT_SHOP_TOILET_READING_MESSAGE_ID);
    this.engine.video.messages.removeMessage(BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_ID);
    this.engine.video.titles.removeTitle(BAIT_SHOP_TOILET_READING_DEFEAT_TITLE_ID);
    this.engine.video.primitives.removePrimitive(BAIT_SHOP_TOILET_READING_DEFEAT_FADE_PRIMITIVE_ID);
    this.pendingPostStandStanAlert = false;
    this.pendingCoralRelicWish = undefined;
    this.wishSequence = undefined;
    this.removeReadingMessageAnchorSprite();
    this.removeStanPoliceAlertAnchorSprite();
    this.setReadingOverlayVisible(false);
  }

  private setReadingOverlayVisible(isVisible: boolean): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.planes.updatePlane(
      BAIT_SHOP_TOILET_SCENE_ID,
      BAIT_SHOP_TOILET_READING_BACKDROP_PLANE_ID,
      { visible: isVisible },
    );
    this.engine.video.planes.updatePlane(
      BAIT_SHOP_TOILET_SCENE_ID,
      BAIT_SHOP_TOILET_READING_IMAGE_PLANE_ID,
      { visible: isVisible },
    );
  }

  private installToiletActionMenu(): void {
    if (!this.engine) {
      return;
    }

    if (
      this.toiletRemoved ||
      (this.escapeUrgencyActive && !this.isToiletReuseDuringUrgencyEnabled())
    ) {
      this.engine.video.actionMenus.unregisterMenu(BAIT_SHOP_TOILET_ACTION_MENU_ID);
      return;
    }

    this.engine.video.actionMenus.unregisterMenu(BAIT_SHOP_TOILET_ACTION_MENU_ID);
    this.engine.video.actionMenus.registerMenu(this.createToiletActionMenuDefinition());
  }

  private installSeatedRoccoActionMenu(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.actionMenus.unregisterMenu(BAIT_SHOP_TOILET_ACTION_MENU_ID);
    this.engine.video.actionMenus.unregisterMenu(ROCCO_PLAYER_ACTION_MENU_ID);
    this.engine.video.actionMenus.registerMenu(
      createSeatedRoccoActionMenuDefinition(
        this.localization,
        isRoccoDeveloperModeEnabled(this.engine),
      ),
    );
  }

  private restoreDefaultActionMenus(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.actionMenus.unregisterMenu(ROCCO_PLAYER_ACTION_MENU_ID);
    this.engine.video.actionMenus.registerMenu(
      createRoccoPlayerActionMenuDefinition(
        this.localization,
        isRoccoDeveloperModeEnabled(this.engine),
      ),
    );
  }

  private createToiletActionMenuDefinition(): RoccoActionMenuDefinition {
    return {
      ...makeBaitShopToiletActionMenuBase(),
      id: BAIT_SHOP_TOILET_ACTION_MENU_ID,
      items: [
        {
          id: 'look',
          actionId: 'look',
          label: this.localization.text.actions.look,
          imageUri: roccoDefaultActionMenuAssetUrls.look,
        },
        {
          id: 'use',
          actionId: 'use',
          label: this.localization.text.baitShop.toiletUseLabel,
          imageUri: roccoDefaultActionMenuAssetUrls.useWc,
        },
      ],
    };
  }

  private startSitSequence(): void {
    this.seatController.startSitSequence();
  }

  private startStandSequence(destination?: RoccoPoint): void {
    this.seatController.startStandSequence(destination);
  }

  hideRoccoAtSeatPoint(): void {
    const sprite = this.getPlayerSpriteClone();
    if (!sprite || !this.engine) {
      return;
    }

    const scaleX = sprite.transform.scaleX || BAIT_SHOP_TOILET_ROCCO_SCALE;
    const scaleY = sprite.transform.scaleY || BAIT_SHOP_TOILET_ROCCO_SCALE;
    const origin = toOriginFromGroundPoint(BAIT_SHOP_TOILET_SIT_SEAT_POINT, scaleX, scaleY);
    sprite.transform.x = origin.x;
    sprite.transform.y = origin.y;
    sprite.visible = false;
    sprite.enabled = true;
    sprite.interactive = false;
    sprite.collisionEnabled = false;
    this.recreatePlayerSprite(sprite);
  }

  showHiddenRoccoAtSeatPoint(): void {
    const sprite = this.getPlayerSpriteClone();
    if (!sprite || !this.engine) {
      return;
    }

    const scaleX = sprite.transform.scaleX || BAIT_SHOP_TOILET_ROCCO_SCALE;
    const scaleY = sprite.transform.scaleY || BAIT_SHOP_TOILET_ROCCO_SCALE;
    const origin = toOriginFromGroundPoint(BAIT_SHOP_TOILET_SIT_SEAT_POINT, scaleX, scaleY);
    sprite.transform.x = origin.x;
    sprite.transform.y = origin.y;
    sprite.visible = true;
    sprite.enabled = true;
    sprite.interactive = true;
    sprite.collisionEnabled = true;
    this.recreatePlayerSprite(sprite);
    this.engine.video.sprites.playAction(
      DEFAULT_SPRITE_INSTANCE_ID,
      DEFAULT_SPRITE_IDLE_ACTION_ID,
      {
        direction: 'down',
        restart: true,
      },
    );
  }

  private getPlayerSpriteClone(): RoccoSpriteInstance | undefined {
    return this.engine?.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
  }

  private recreatePlayerSprite(sprite: RoccoSpriteInstance): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.sprites.removeSprite(DEFAULT_SPRITE_INSTANCE_ID);
    this.engine.video.sprites.createSprite(sprite);
  }

  setToiletFrame(frameIndex: number): void {
    if (!this.engine || this.toiletFrameCount <= 0) {
      return;
    }

    const clampedIndex = Math.max(0, Math.min(this.toiletFrameCount - 1, frameIndex));
    this.engine.video.sprites.setAnimationFrame(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID, clampedIndex);
  }

  private showRoccoThoughtLines(lines: string[], historyKey: string): void {
    if (!this.engine) {
      return;
    }

    roccoCartridgeMessageRuntime.think(
      this.engine,
      DEFAULT_SPRITE_INSTANCE_ID,
      lines,
      {
        ttlMs: BAIT_SHOP_LOOK_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey,
        isAvoidImmediateRepeat: true,
      },
    );
  }

  private showRoccoThoughtLine(line: string): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.messages.think(DEFAULT_SPRITE_INSTANCE_ID, line, {
      ttlMs: BAIT_SHOP_LOOK_MESSAGE_TTL_MS,
    });
  }

  private showToiletThoughtLines(lines: string[], historyKey: string): void {
    if (!this.engine) {
      return;
    }

    roccoCartridgeMessageRuntime.think(
      this.engine,
      BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID,
      lines,
      {
        ttlMs: BAIT_SHOP_LOOK_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey,
        isAvoidImmediateRepeat: true,
      },
    );
  }

  private ensureStanPoliceAlertAnchorSprite(): void {
    if (!this.engine) {
      return;
    }

    const position = this.resolveStanPoliceAlertAnchorPosition(0);
    this.engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_STAN_ALERT_SPRITE_INSTANCE_ID);
    this.engine.video.sprites.createSpriteFromDefinition(BAIT_SHOP_TOILET_SPRITE_DEFINITION_ID, {
      id: BAIT_SHOP_TOILET_STAN_ALERT_SPRITE_INSTANCE_ID,
      transform: {
        x: position.x,
        y: position.y,
        scaleX: BAIT_SHOP_TOILET_STAN_ALERT_SCALE,
        scaleY: BAIT_SHOP_TOILET_STAN_ALERT_SCALE,
        rotation: 0,
      },
      renderLayer: 'world.behind',
      zIndex: 0,
      interactive: false,
      collisionEnabled: false,
      opacity: 0.01,
      ignoreMessages: true,
    });
  }

  private startPassiveStanPoliceAlert(): void {
    this.startPoliceVoice(
      this.localization.text.baitShop.toiletPoliceAlertLine,
      BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_TTL_MS,
    );
  }

  private updatePassiveStanPoliceAlert(deltaMs: number): void {
    if (
      !this.engine ||
      this.passiveStanPoliceAlertElapsedMs === undefined ||
      !Number.isFinite(deltaMs) ||
      deltaMs <= 0
    ) {
      return;
    }

    const nextElapsedMs = this.passiveStanPoliceAlertElapsedMs + deltaMs;
    const clampedAlertElapsedMs = Math.min(BAIT_SHOP_TOILET_STAN_ALERT_DURATION_MS, nextElapsedMs);
    this.passiveStanPoliceAlertElapsedMs = nextElapsedMs;
    this.updateStanPoliceAlertAnchor(clampedAlertElapsedMs);

    if (nextElapsedMs >= this.activePoliceVoiceTtlMs) {
      this.clearPassiveStanPoliceAlert();
    }
  }

  private startPoliceVoice(
    line: string,
    ttlMs: number,
    speaker: 'caller' | 'police' = 'caller',
  ): void {
    if (!this.engine) {
      return;
    }

    this.activePoliceVoiceTtlMs = ttlMs;
    this.passiveStanPoliceAlertElapsedMs = 0;
    this.ensureStanPoliceAlertAnchorSprite();
    this.showPoliceVoiceMessage(line, ttlMs, speaker);
  }

  private beginAdvanceablePoliceVoice(
    line: string,
    ttlMs: number,
    speaker: 'caller' | 'police' = 'caller',
    onComplete?: () => void,
  ): void {
    if (!this.engine || !this.policeDialogue) {
      return;
    }

    this.activePoliceVoiceTtlMs = ttlMs;
    this.passiveStanPoliceAlertElapsedMs = 0;
    this.ensureStanPoliceAlertAnchorSprite();
    this.policeDialogue.beginLinearSequence({
      speaker: 'npc',
      lines: [line],
      lineTtlMs: ttlMs,
      messageOptions: {
        id: BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_ID,
        side: 'left',
        maxWidth: BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_MAX_WIDTH,
        zIndex: 5000,
        style: this.createPoliceVoiceMessageStyle(speaker),
      },
      onComplete,
    });
  }

  private showPoliceVoiceMessage(
    line: string,
    ttlMs: number,
    speaker: 'caller' | 'police' = 'caller',
  ): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.messages.say(BAIT_SHOP_TOILET_STAN_ALERT_SPRITE_INSTANCE_ID, line, {
      id: BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_ID,
      ttlMs,
      side: 'left',
      maxWidth: BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_MAX_WIDTH,
      zIndex: 5000,
      style: this.createPoliceVoiceMessageStyle(speaker),
    });
  }

  private createPoliceVoiceMessageStyle(speaker: 'caller' | 'police'): {
    fill: string;
    bubbleFill: string;
    bubbleStroke: string;
    bubbleStrokeWidth: number;
  } {
    const fill =
      speaker === 'police'
        ? BAIT_SHOP_TOILET_POLICE_DIALOGUE_TEXT_COLOR
        : DEFAULT_STAN_DIALOGUE_TEXT_COLOR;
    const bubbleFill =
      speaker === 'police' ? BAIT_SHOP_TOILET_POLICE_DIALOGUE_BUBBLE_FILL : '#f1e7fa';

    return {
      fill,
      bubbleFill,
      bubbleStroke: fill,
      bubbleStrokeWidth: 2,
    };
  }

  private updateStanPoliceAlertAnchor(elapsedMs: number): void {
    if (!this.engine) {
      return;
    }

    const position = this.resolveStanPoliceAlertAnchorPosition(elapsedMs);
    this.engine.video.sprites.setPosition(
      BAIT_SHOP_TOILET_STAN_ALERT_SPRITE_INSTANCE_ID,
      position.x,
      position.y,
    );
  }

  private resolveStanPoliceAlertAnchorPosition(elapsedMs: number): RoccoPoint {
    const progress = Math.max(0, Math.min(1, elapsedMs / BAIT_SHOP_TOILET_STAN_ALERT_DURATION_MS));
    const easedProgress = 1 - (1 - progress) * (1 - progress);
    const baseX =
      BAIT_SHOP_TOILET_STAN_ALERT_START_X +
      (BAIT_SHOP_TOILET_STAN_ALERT_END_X - BAIT_SHOP_TOILET_STAN_ALERT_START_X) * easedProgress;
    const jitterX = Math.sin(elapsedMs / 190) * 14 + Math.sin(elapsedMs / 86) * 6;
    const jitterY = Math.sin(elapsedMs / 176) * 11 + Math.sin(elapsedMs / 62) * 4;

    return {
      x: baseX + jitterX,
      y: BAIT_SHOP_TOILET_STAN_ALERT_BASE_Y + jitterY,
    };
  }

  private removeStanPoliceAlertAnchorSprite(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_STAN_ALERT_SPRITE_INSTANCE_ID);
  }

  private clearPassiveStanPoliceAlert(): void {
    this.passiveStanPoliceAlertElapsedMs = undefined;
    this.activePoliceVoiceTtlMs = BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_TTL_MS;
    this.policeDialogue?.cancel();
    if (!this.engine) {
      return;
    }

    this.engine.video.messages.removeMessage(BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_ID);
    this.engine.video.messages.removeMessage(BAIT_SHOP_TOILET_POST_WISH_PLAYER_REPLY_MESSAGE_ID);
    this.engine.video.messages.removeMessage(
      `${BAIT_SHOP_TOILET_STAN_ALERT_SPRITE_INSTANCE_ID}:active-message`,
    );
    this.removeStanPoliceAlertAnchorSprite();
  }

  private createWishChoices() {
    return [
      {
        id: BAIT_SHOP_TOILET_WISH_NEVER_EXISTED_CHOICE_ID,
        text: this.localization.text.baitShop.coralRelicWishExistLine,
      },
      {
        id: BAIT_SHOP_TOILET_WISH_ROOT_CHOICE_ID,
        text: this.localization.text.baitShop.coralRelicWishRootLine,
      },
      {
        id: BAIT_SHOP_TOILET_WISH_STAN_DISAPPEAR_CHOICE_ID,
        text: this.isStanIdentified()
          ? this.localization.text.baitShop.coralRelicWishKnownStanDisappearLine
          : this.localization.text.baitShop.coralRelicWishUnknownStanDisappearLine,
      },
      {
        id: BAIT_SHOP_TOILET_WISH_ESCAPE_CHOICE_ID,
        text: this.localization.text.baitShop.coralRelicWishEscapeLine,
      },
    ] as const;
  }

  private resolveWishChoiceLine(itemId: string | undefined): string | undefined {
    return this.createWishChoices().find((choice) => choice.id === itemId)?.text;
  }

  private createPostWishPoliceResponseChoices() {
    return [
      {
        id: BAIT_SHOP_TOILET_POST_WISH_REPLY_MOMENT_PLEASE_CHOICE_ID,
        text: this.localization.text.baitShop.toiletPostWishReplyMomentPleaseLine,
      },
      {
        id: BAIT_SHOP_TOILET_POST_WISH_REPLY_NO_HIT_CHOICE_ID,
        text: this.localization.text.baitShop.toiletPostWishReplyNoHitLine,
      },
      {
        id: BAIT_SHOP_TOILET_POST_WISH_REPLY_WHAT_IF_NOT_CHOICE_ID,
        text: this.localization.text.baitShop.toiletPostWishReplyWhatIfNotLine,
      },
      {
        id: BAIT_SHOP_TOILET_POST_WISH_REPLY_COME_IN_CHOICE_ID,
        text: this.localization.text.baitShop.toiletPostWishReplyComeInLine,
      },
    ] as const;
  }

  private resolvePostWishPoliceResponseLine(itemId: string | undefined): string | undefined {
    return this.createPostWishPoliceResponseChoices().find((choice) => choice.id === itemId)?.text;
  }

  private openPostWishPoliceResponseMenu(): void {
    if (!this.engine || !this.wishSequence) {
      return;
    }

    this.engine.video.gridMenus.openMenu(
      createRoccoDialogueChoiceMenu({
        id: BAIT_SHOP_TOILET_POST_WISH_RESPONSE_MENU_ID,
        choices: this.createPostWishPoliceResponseChoices(),
      }).gridMenu,
    );
    this.setInputEnabled(true);
  }

  private startPostWishPoliceResponse(itemId: string | undefined): void {
    if (
      !this.engine ||
      !this.policeDialogue ||
      !this.wishSequence ||
      this.wishSequence.phase !== 'awaiting-police-response'
    ) {
      return;
    }

    const selected = this.resolvePostWishPoliceResponseLine(itemId);
    if (!selected) {
      return;
    }

    this.engine.video.gridMenus.closeMenu();
    this.wishSequence = {
      ...this.wishSequence,
      phase: 'police-response',
      elapsedMs: 0,
      policeReplyShown: false,
    };
    this.policeDialogue.beginLinearSequence({
      speaker: 'player',
      lines: [selected],
      lineTtlMs: BAIT_SHOP_TOILET_POST_WISH_PLAYER_REPLY_TTL_MS,
      messageOptions: {
        id: BAIT_SHOP_TOILET_POST_WISH_PLAYER_REPLY_MESSAGE_ID,
      },
      onComplete: () => {
        if (!this.engine || !this.wishSequence || this.wishSequence.phase !== 'police-response') {
          return;
        }

        this.beginAdvanceablePoliceVoice(
          this.localization.text.baitShop.toiletPostWishPoliceResponseLine,
          BAIT_SHOP_TOILET_POST_WISH_POLICE_REPLY_TTL_MS,
          'police',
          () => {
            if (
              !this.engine ||
              !this.wishSequence ||
              this.wishSequence.phase !== 'police-response'
            ) {
              return;
            }

            this.clearPassiveStanPoliceAlert();
            this.requestPortalActivation();
            this.setInputEnabled(true);
            this.wishSequence = undefined;
          },
        );
        this.wishSequence = {
          ...this.wishSequence,
          policeReplyShown: true,
        };
      },
    });
  }

  private advanceToPostWishPoliceResponseMenu(): void {
    if (!this.wishSequence) {
      return;
    }

    this.wishSequence = {
      ...this.wishSequence,
      phase: 'awaiting-police-response',
      elapsedMs: 0,
      policeReplyShown: false,
    };
    this.openPostWishPoliceResponseMenu();
  }

  private closePostWishPoliceWarningOnClick(): boolean {
    if (
      !this.policeDialogue ||
      !this.wishSequence ||
      this.wishSequence.phase !== 'post-toilet-police-warning' ||
      !this.wishSequence.policeReplyShown ||
      this.policeDialogue.isAwaitingChoice()
    ) {
      return false;
    }

    return this.policeDialogue.advance();
  }

  private advancePostWishPoliceResponseOnClick(): boolean {
    if (
      !this.policeDialogue ||
      !this.wishSequence ||
      this.wishSequence.phase !== 'police-response' ||
      this.policeDialogue.isAwaitingChoice()
    ) {
      return false;
    }

    return this.policeDialogue.advance();
  }

  private startDirectWishDefeat(): void {
    if (!this.engine || !this.pendingCoralRelicWish || this.wishSequence) {
      return;
    }

    this.pendingCoralRelicWish = undefined;
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.actionMenus.closeMenu();
    this.setInputEnabled(false);
    this.wishSequence = {
      phase: 'direct-defeat',
      outcome: 'direct-defeat',
      groundPoint: { x: 0, y: 0 },
      consumeRelic: () => {},
      elapsedMs: 0,
      smokeFrameIndex: 0,
      effectApplied: false,
      policeReplyShown: false,
    };
  }

  private startWishSequence(outcome: BaitShopToiletWishOutcome): void {
    if (!this.engine || !this.pendingCoralRelicWish || this.wishSequence) {
      return;
    }

    const pendingWish = this.pendingCoralRelicWish;
    this.pendingCoralRelicWish = undefined;
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.actionMenus.closeMenu();
    this.setInputEnabled(false);
    const isStarted = this.engine.video.sprites.goTo(
      DEFAULT_SPRITE_INSTANCE_ID,
      pendingWish.groundPoint.x,
      pendingWish.groundPoint.y,
      {
        action: DEFAULT_SPRITE_RUN_ACTION_ID,
        idleAction: DEFAULT_SPRITE_IDLE_ACTION_ID,
        stopDistance: 6,
        idleSettleDelayMs: 0,
        idleSettleFacing: 'diagonal-from-facing',
      },
    );
    if (!isStarted) {
      this.setInputEnabled(true);
      return;
    }

    this.wishSequence = {
      phase: 'walking-to-relic',
      outcome,
      groundPoint: { ...pendingWish.groundPoint },
      consumeRelic: pendingWish.consumeRelic,
      elapsedMs: 0,
      smokeFrameIndex: 0,
      effectApplied: false,
      policeReplyShown: false,
    };
  }

  private updateWishSequence(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    switch (this.wishSequence?.phase) {
      case 'direct-defeat': {
        this.updateDirectWishDefeat(deltaMs);
        return;
      }
      case 'post-toilet-police-warning': {
        this.updatePostWishPoliceWarning(deltaMs);
        return;
      }
      case 'walking-to-relic': {
        this.updateWalkingToRelicWish();
        return;
      }
      case 'smoke': {
        this.updateWishSmoke(deltaMs);
        return;
      }
      case 'awaiting-police-response': {
        return;
      }
      case 'police-response': {
        return;
      }
      case undefined: {
        return;
      }
    }
  }

  private updateDirectWishDefeat(deltaMs: number): void {
    if (!this.wishSequence) {
      return;
    }

    const nextElapsedMs = this.wishSequence.elapsedMs + deltaMs;
    this.wishSequence = {
      ...this.wishSequence,
      elapsedMs: nextElapsedMs,
    };
    if (nextElapsedMs >= BAIT_SHOP_TOILET_DIRECT_DEFEAT_DELAY_MS) {
      this.beginDefeatSequence();
    }
  }

  private updatePostWishPoliceWarning(deltaMs: number): void {
    if (!this.engine || !this.wishSequence) {
      return;
    }

    const nextElapsedMs = this.wishSequence.elapsedMs + deltaMs;
    let isPoliceReplyShown = this.wishSequence.policeReplyShown;
    if (
      !isPoliceReplyShown &&
      nextElapsedMs >= BAIT_SHOP_TOILET_POST_WISH_POLICE_WARNING_DELAY_MS
    ) {
      this.setInputEnabled(true);
      this.beginAdvanceablePoliceVoice(
        this.localization.text.baitShop.toiletPostWishPoliceWarningLine,
        BAIT_SHOP_TOILET_POST_WISH_POLICE_WARNING_TTL_MS,
        'police',
        () => {
          if (this.wishSequence?.phase !== 'post-toilet-police-warning') {
            return;
          }

          this.clearPassiveStanPoliceAlert();
          this.advanceToPostWishPoliceResponseMenu();
        },
      );
      isPoliceReplyShown = true;
    }

    this.wishSequence = {
      ...this.wishSequence,
      elapsedMs: nextElapsedMs,
      policeReplyShown: isPoliceReplyShown,
    };
  }

  private updateWalkingToRelicWish(): void {
    if (!this.engine || !this.wishSequence) {
      return;
    }

    if (this.engine.video.sprites.isMoving(DEFAULT_SPRITE_INSTANCE_ID)) {
      return;
    }

    const sequence = this.wishSequence;
    const player = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    const direction = player?.facing ?? player?.action?.direction ?? 'down';
    this.engine.audio.playSound(BAIT_SHOP_TOILET_MEDALLION_STEP_SOUND_ID, {
      restart: true,
      volume: BAIT_SHOP_TOILET_MEDALLION_STEP_SOUND_VOLUME,
    });
    this.engine.video.sprites.playAction(DEFAULT_SPRITE_INSTANCE_ID, DEFAULT_SPRITE_RUN_ACTION_ID, {
      direction,
      restart: true,
      playbackRate: 0,
    });
    sequence.consumeRelic();
    this.engine.audio.playSound(BAIT_SHOP_TOILET_SPELL_SOUND_ID, {
      restart: true,
      volume: BAIT_SHOP_TOILET_SPELL_SOUND_VOLUME,
    });
    if (sequence.outcome === 'rocco-disappears') {
      this.spawnSmokeSpriteAt(this.resolvePlayerSmokeGroundPoint());
    } else {
      this.spawnSmokeSpriteAt(this.resolveToiletSmokeGroundPoint());
    }
    this.wishSequence = {
      ...sequence,
      phase: 'smoke',
      elapsedMs: 0,
      smokeFrameIndex: 0,
    };
  }

  private updateWishSmoke(deltaMs: number): void {
    if (!this.engine || !this.wishSequence) {
      return;
    }

    const sequence = this.wishSequence;
    const nextElapsedMs = sequence.elapsedMs + deltaMs;
    const nextFrameIndex = Math.min(
      Math.max(0, this.smokeFrameCount - 1),
      Math.floor(nextElapsedMs / BAIT_SHOP_TOILET_SMOKE_FRAME_DURATION_MS),
    );
    if (nextFrameIndex !== sequence.smokeFrameIndex) {
      this.engine.video.sprites.setAnimationFrame(
        BAIT_SHOP_TOILET_SMOKE_SPRITE_INSTANCE_ID,
        nextFrameIndex,
      );
    }
    this.wishSequence = {
      ...sequence,
      elapsedMs: nextElapsedMs,
      smokeFrameIndex: nextFrameIndex,
    };

    this.applyWishSmokeEffect(sequence, nextFrameIndex);

    if (nextElapsedMs < this.smokeFrameCount * BAIT_SHOP_TOILET_SMOKE_FRAME_DURATION_MS) {
      return;
    }

    this.finishWishSmokeSequence(sequence, nextElapsedMs);
  }

  private applyWishSmokeEffect(sequence: BaitShopToiletWishSequence, nextFrameIndex: number): void {
    if (
      nextFrameIndex < BAIT_SHOP_TOILET_SMOKE_REMOVE_TOILET_FRAME_INDEX ||
      sequence.effectApplied
    ) {
      return;
    }
    if (sequence.outcome === 'rocco-disappears') {
      this.hideRoccoForWishDefeat();
    } else {
      this.hideToiletForSpell();
    }
    this.wishSequence = { ...sequence, effectApplied: true };
  }

  private finishWishSmokeSequence(
    sequence: BaitShopToiletWishSequence,
    nextElapsedMs: number,
  ): void {
    if (!this.engine) {
      return;
    }
    const player = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (player) {
      this.engine.video.sprites.playAction(
        DEFAULT_SPRITE_INSTANCE_ID,
        DEFAULT_SPRITE_IDLE_ACTION_ID,
        {
          direction: player.facing ?? player.action?.direction ?? 'down',
          restart: true,
        },
      );
    }
    this.engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_SMOKE_SPRITE_INSTANCE_ID);
    if (sequence.outcome === 'rocco-disappears') {
      this.beginDefeatSequence();
      return;
    }
    const elapsedSinceToiletDisappeared = Math.max(
      0,
      nextElapsedMs -
        BAIT_SHOP_TOILET_SMOKE_REMOVE_TOILET_FRAME_INDEX * BAIT_SHOP_TOILET_SMOKE_FRAME_DURATION_MS,
    );
    this.wishSequence = {
      ...sequence,
      phase: 'post-toilet-police-warning',
      elapsedMs: elapsedSinceToiletDisappeared,
      policeReplyShown: false,
    };
  }

  private spawnSmokeSpriteAt(position: RoccoPoint): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_SMOKE_SPRITE_INSTANCE_ID);
    this.engine.video.sprites.createSpriteFromDefinition(
      BAIT_SHOP_TOILET_SMOKE_SPRITE_DEFINITION_ID,
      {
        id: BAIT_SHOP_TOILET_SMOKE_SPRITE_INSTANCE_ID,
        transform: {
          x: position.x,
          y: position.y,
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
      },
    );
    this.engine.video.sprites.stopAnimation(BAIT_SHOP_TOILET_SMOKE_SPRITE_INSTANCE_ID);
    this.engine.video.sprites.setAnimationFrame(BAIT_SHOP_TOILET_SMOKE_SPRITE_INSTANCE_ID, 0);
  }

  private resolveToiletSmokeGroundPoint(): RoccoPoint {
    const toiletSprite = this.engine?.video.sprites.getSprite(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID);
    return {
      x: toiletSprite?.transform.x ?? BAIT_SHOP_TOILET_TARGET_X,
      y: toiletSprite?.transform.y ?? BAIT_SHOP_TOILET_TARGET_Y + BAIT_SHOP_TOILET_TARGET_HEIGHT,
    };
  }

  private resolvePlayerSmokeGroundPoint(): RoccoPoint {
    const player = this.engine?.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!player) {
      return this.resolvePlayerGroundPointForWish() ?? this.resolveToiletSmokeGroundPoint();
    }

    return {
      x: player.transform.x + DEFAULT_SPRITE_GROUND_ANCHOR_X * (player.transform.scaleX || 1),
      y: player.transform.y + DEFAULT_SPRITE_GROUND_ANCHOR_Y * (player.transform.scaleY || 1),
    };
  }

  private resolvePlayerGroundPointForWish(): RoccoPoint | undefined {
    const player = this.engine?.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!player) {
      return undefined;
    }

    return {
      x: player.transform.x + DEFAULT_SPRITE_GROUND_ANCHOR_X * (player.transform.scaleX || 1),
      y: player.transform.y + DEFAULT_SPRITE_GROUND_ANCHOR_Y * (player.transform.scaleY || 1),
    };
  }

  resolvePlayerGroundPoint(): RoccoPoint | undefined {
    return this.resolvePlayerGroundPointForWish();
  }

  private requestPortalActivation(): void {
    if (!this.engine) {
      return;
    }

    this.portalPendingActivation = true;
    this.updatePortalActivation();
  }

  private updatePortalActivation(): void {
    if (!this.engine || !this.portalPendingActivation || this.portalActive) {
      return;
    }

    if (this.isPlayerOverPortalZone()) {
      return;
    }

    this.portalPendingActivation = false;
    this.portalActive = true;
    this.ensurePortalPresentation(true);
    this.startPortalLoopSound();
    this.registerPortalTarget();
  }

  private updatePortalTransition(): void {
    if (
      !this.portalActive ||
      this.portalTransitionRequested ||
      !this.onConnectorTransitionRequested ||
      !this.isPlayerOverPortalZone()
    ) {
      return;
    }

    this.portalTransitionRequested = true;
    const isTransitioned =
      this.onConnectorTransitionRequested(BAIT_SHOP_TOILET_PORTAL_CONNECTOR_ID) ?? false;
    if (!isTransitioned) {
      this.portalTransitionRequested = false;
    }
  }

  private isPlayerOverPortalZone(): boolean {
    const playerRect = this.resolvePlayerVisualRect();
    if (!playerRect || !this.portalTargetRect) {
      return false;
    }

    return (
      playerRect.x < this.portalTargetRect.x + this.portalTargetRect.width &&
      playerRect.x + playerRect.width > this.portalTargetRect.x &&
      playerRect.y < this.portalTargetRect.y + this.portalTargetRect.height &&
      playerRect.y + playerRect.height > this.portalTargetRect.y
    );
  }

  private resolvePlayerVisualRect():
    | { x: number; y: number; width: number; height: number }
    | undefined {
    const player = this.engine?.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!player) {
      return undefined;
    }

    return {
      x: player.transform.x,
      y: player.transform.y,
      width: Math.max(1, DEFAULT_SPRITE_FRAME_WIDTH * Math.abs(player.transform.scaleX || 1)),
      height: Math.max(1, DEFAULT_SPRITE_FRAME_HEIGHT * Math.abs(player.transform.scaleY || 1)),
    };
  }

  private ensurePortalPresentation(isPlayOpening: boolean): void {
    if (!this.engine || !this.portalActive) {
      return;
    }

    const position = this.resolvePortalBasePoint();
    this.engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_PORTAL_SPRITE_INSTANCE_ID);
    this.engine.video.sprites.createSpriteFromDefinition(
      BAIT_SHOP_TOILET_PORTAL_SPRITE_DEFINITION_ID,
      {
        id: BAIT_SHOP_TOILET_PORTAL_SPRITE_INSTANCE_ID,
        transform: {
          x: position.x,
          y: position.y,
          scaleX: this.portalScale,
          scaleY: this.portalScale,
          rotation: 0,
        },
        renderLayer: 'world.front',
        zIndex: 21,
        depthMode: 'fixed',
        interactive: true,
        collisionEnabled: false,
        visibleDescription: {
          enabled: true,
          text: this.resolvePortalDescription(),
        },
        ignoreMessages: true,
      },
    );
    this.engine.video.sprites.playAnimation(
      BAIT_SHOP_TOILET_PORTAL_SPRITE_INSTANCE_ID,
      isPlayOpening
        ? BAIT_SHOP_TOILET_PORTAL_OPEN_ANIMATION_ID
        : BAIT_SHOP_TOILET_PORTAL_LOOP_ANIMATION_ID,
      {
        restart: true,
      },
    );
  }

  private registerPortalTarget(): void {
    if (!this.engine || !this.portalActive || !this.portalTargetRect) {
      return;
    }

    this.engine.video.sceneTargets?.unregisterTarget(BAIT_SHOP_TOILET_PORTAL_SPRITE_INSTANCE_ID);
    this.engine.video.sceneTargets?.registerTarget({
      instanceId: BAIT_SHOP_TOILET_PORTAL_SPRITE_INSTANCE_ID,
      definitionId: 'rocco-bait-shop-toilet-portal-target',
      shape: {
        kind: 'rect',
        x: this.portalTargetRect.x,
        y: this.portalTargetRect.y,
        width: this.portalTargetRect.width,
        height: this.portalTargetRect.height,
      },
      priority: 26,
      renderLayer: 'world.front',
      visibleDescription: {
        enabled: true,
        text: this.resolvePortalDescription(),
      },
    });
  }

  private unregisterPortalTarget(): void {
    this.engine?.video.sceneTargets?.unregisterTarget(BAIT_SHOP_TOILET_PORTAL_SPRITE_INSTANCE_ID);
  }

  private resolvePortalBasePoint(): RoccoPoint {
    return {
      x:
        (this.toiletTargetRect?.x ?? BAIT_SHOP_TOILET_TARGET_X) +
        (this.toiletTargetRect?.width ?? 96) / 2,
      y:
        (this.toiletTargetRect?.y ?? BAIT_SHOP_TOILET_TARGET_Y) +
        BAIT_SHOP_TOILET_TARGET_HEIGHT +
        BAIT_SHOP_TOILET_PORTAL_OFFSET_Y,
    };
  }

  private resolvePortalDescription(): string {
    return this.localization.text.baitShop.portalDescription;
  }

  private startPortalLoopSound(): void {
    if (!this.engine || !this.portalActive) {
      return;
    }

    this.engine.audio.playSound(BAIT_SHOP_TOILET_PORTAL_LOOP_SOUND_ID, {
      restart: true,
      volume: BAIT_SHOP_TOILET_PORTAL_LOOP_SOUND_VOLUME,
    });
  }

  private hideToiletForSpell(): void {
    if (!this.engine || this.toiletRemoved) {
      return;
    }

    this.toiletRemoved = true;
    this.unregisterUrgentToiletTarget();
    this.engine.video.actionMenus.unregisterMenu(BAIT_SHOP_TOILET_ACTION_MENU_ID);
    this.engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID);
  }

  private hideRoccoForWishDefeat(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.sprites.removeSprite(DEFAULT_SPRITE_INSTANCE_ID);
  }

  private syncToiletUrgencyPresentation(): void {
    if (!this.engine || this.toiletRemoved || this.roccoSeated) {
      return;
    }

    if (this.escapeUrgencyActive) {
      if (this.isToiletReuseDuringUrgencyEnabled()) {
        this.unregisterUrgentToiletTarget();
        this.setToiletInteractive(true);
        this.installToiletActionMenu();
        return;
      }

      this.engine.video.actionMenus.unregisterMenu(BAIT_SHOP_TOILET_ACTION_MENU_ID);
      this.setToiletInteractive(false);
      this.registerUrgentToiletTarget();
      return;
    }

    this.unregisterUrgentToiletTarget();
    this.setToiletInteractive(true);
    this.installToiletActionMenu();
  }

  private setToiletInteractive(isInteractive: boolean): void {
    if (!this.engine) {
      return;
    }

    const sprite = this.engine.video.sprites.getSprite(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID);
    if (!sprite || sprite.interactive === isInteractive) {
      return;
    }

    sprite.interactive = isInteractive;
    this.engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID);
    this.engine.video.sprites.createSprite(sprite);
  }

  private registerUrgentToiletTarget(): void {
    if (!this.engine || !this.toiletTargetRect) {
      return;
    }

    this.engine.video.sceneTargets?.unregisterTarget(BAIT_SHOP_TOILET_URGENT_TARGET_INSTANCE_ID);
    this.engine.video.sceneTargets?.registerTarget({
      instanceId: BAIT_SHOP_TOILET_URGENT_TARGET_INSTANCE_ID,
      definitionId: 'rocco-bait-shop-toilet-urgent',
      shape: {
        kind: 'rect',
        x: this.toiletTargetRect.x,
        y: this.toiletTargetRect.y,
        width: this.toiletTargetRect.width,
        height: this.toiletTargetRect.height,
      },
      priority: 28,
      renderLayer: 'world.behind',
      visibleDescription: {
        enabled: true,
        text: this.localization.text.descriptions.toilet,
      },
    });
  }

  private unregisterUrgentToiletTarget(): void {
    this.engine?.video.sceneTargets?.unregisterTarget(BAIT_SHOP_TOILET_URGENT_TARGET_INSTANCE_ID);
  }

  private setToiletVisibleDescription(text: string): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.sprites.setVisibleDescription(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID, {
      enabled: true,
      text,
    });
  }

  private handleWishMenuActivation(activation: RoccoGridMenuActivation): void {
    if (activation.interaction === 'close') {
      this.pendingCoralRelicWish = undefined;
      return;
    }

    if (
      activation.interaction !== 'activate' ||
      !this.resolveWishChoiceLine(activation.itemId) ||
      !this.engine
    ) {
      return;
    }

    if (activation.itemId === BAIT_SHOP_TOILET_WISH_NEVER_EXISTED_CHOICE_ID) {
      this.startWishSequence('rocco-disappears');
      return;
    }

    if (
      activation.itemId === BAIT_SHOP_TOILET_WISH_ROOT_CHOICE_ID ||
      activation.itemId === BAIT_SHOP_TOILET_WISH_ESCAPE_CHOICE_ID
    ) {
      this.startWishSequence('toilet-disappears');
      return;
    }

    if (activation.itemId === BAIT_SHOP_TOILET_WISH_STAN_DISAPPEAR_CHOICE_ID) {
      this.startDirectWishDefeat();
      return;
    }

    this.pendingCoralRelicWish = undefined;
  }

  private handlePostWishResponseMenuActivation(activation: RoccoGridMenuActivation): void {
    if (!this.policeDialogue) {
      return;
    }

    if (activation.interaction === 'close') {
      this.policeDialogue.reopenChoices();
      return;
    }

    if (activation.interaction === 'activate') {
      this.startPostWishPoliceResponse(activation.itemId);
    }
  }

  isEscapeUrgencyActive(): boolean {
    return this.escapeUrgencyActive && !this.toiletRemoved;
  }

  refreshDeveloperEventPresentation(): void {
    if (!this.engine) {
      return;
    }

    this.syncToiletUrgencyPresentation();
  }

  shouldLoseOnExit(connectorId: string): boolean {
    return connectorId === BAIT_SHOP_TOILET_RETURN_CONNECTOR_ID && this.roccoSatOnToilet;
  }

  beginExitDefeat(): void {
    if (!this.engine || this.readingSequence || this.wishSequence) {
      return;
    }

    this.beginDefeatSequence();
  }

  openCoralRelicWishMenu(groundPoint: RoccoPoint, consumeRelic: () => void): void {
    if (!this.engine || !this.isEscapeUrgencyActive() || this.wishSequence) {
      return;
    }

    this.pendingCoralRelicWish = {
      groundPoint: { ...groundPoint },
      consumeRelic,
    };
    this.engine.video.actionMenus.closeMenu();
    this.engine.video.gridMenus.openMenu(
      createRoccoDialogueChoiceMenu({
        id: BAIT_SHOP_TOILET_WISH_MENU_ID,
        choices: this.createWishChoices(),
      }).gridMenu,
    );
  }

  startThrowCoralRelicSequence(
    relicItem: RoccoInventoryItem,
    onComplete: (groundPoint: RoccoPoint) => void,
    isUrgencyOverride = this.isEscapeUrgencyActive(),
  ): void {
    const fallbackGroundPoint: RoccoPoint = {
      x: BAIT_SHOP_TOILET_THROW_CENTER_GROUND_X,
      y: BAIT_SHOP_TOILET_TARGET_Y + BAIT_SHOP_TOILET_TARGET_HEIGHT,
    };
    const safeComplete = (groundPoint: RoccoPoint): void => {
      onComplete({ ...groundPoint });
    };

    if (!this.engine) {
      safeComplete(fallbackGroundPoint);
      return;
    }

    if (this.throwSequence || !isUrgencyOverride) {
      safeComplete(this.resolvePlayerGroundPoint() ?? fallbackGroundPoint);
      return;
    }

    const player = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!player) {
      safeComplete(this.resolvePlayerGroundPoint() ?? fallbackGroundPoint);
      return;
    }

    const currentGround = this.resolvePlayerGroundPoint();
    const startY = currentGround?.y ?? player.transform.y;
    const isStarted = this.startThrowMovement(startY);
    if (!isStarted) {
      this.setInputEnabled(true);
      safeComplete(currentGround ?? fallbackGroundPoint);
      return;
    }

    this.throwSequence = {
      phase: 'walking-to-center',
      elapsedMs: 0,
      relicItem,
      relicScale: 0,
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 0, y: 0 },
      groundPoint: { x: 0, y: 0 },
      onComplete,
    };
  }

  private startThrowMovement(startY: number): boolean {
    if (!this.engine) {
      return false;
    }
    this.engine.video.actionMenus.closeMenu();
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.gridMenus.clearCarriedItem();
    this.engine.video.messages.clearMessages();
    this.setInputEnabled(false);
    this.engine.video.sprites.stopMovement(DEFAULT_SPRITE_INSTANCE_ID);
    return this.engine.video.sprites.goTo(
      DEFAULT_SPRITE_INSTANCE_ID,
      BAIT_SHOP_TOILET_THROW_CENTER_GROUND_X,
      startY,
      {
        action: DEFAULT_SPRITE_RUN_ACTION_ID,
        idleAction: DEFAULT_SPRITE_IDLE_ACTION_ID,
        stopDistance: 1,
        idleSettleDelayMs: 0,
        idleSettleFacing: 'diagonal-from-facing',
      },
    );
  }

  private initializeToiletMountState(
    engine: CartridgeSdkV1Runtime,
    options: RoccoLevelMountOptions,
  ): void {
    this.setInputEnabled(true);
    this.engine = engine;
    this.spriteController = undefined;
    this.readingDialogue = new RoccoDialogueSession({
      id: BAIT_SHOP_TOILET_READING_DIALOGUE_ID,
      engine,
      playerSpriteInstanceId: BAIT_SHOP_TOILET_READING_MESSAGE_ANCHOR_SPRITE_INSTANCE_ID,
      npcSpriteInstanceId: BAIT_SHOP_TOILET_READING_MESSAGE_ANCHOR_SPRITE_INSTANCE_ID,
      playerLineTtlMs: BAIT_SHOP_TOILET_READING_LINE_DURATION_MS,
      npcLineTtlMs: BAIT_SHOP_TOILET_READING_LINE_DURATION_MS,
    });
    this.policeDialogue = new RoccoDialogueSession({
      id: BAIT_SHOP_TOILET_POLICE_DIALOGUE_ID,
      engine,
      playerSpriteInstanceId: DEFAULT_SPRITE_INSTANCE_ID,
      npcSpriteInstanceId: BAIT_SHOP_TOILET_STAN_ALERT_SPRITE_INSTANCE_ID,
      promptTtlMs: BAIT_SHOP_TOILET_POST_WISH_POLICE_WARNING_TTL_MS,
      playerLineTtlMs: BAIT_SHOP_TOILET_POST_WISH_PLAYER_REPLY_TTL_MS,
      npcLineTtlMs: BAIT_SHOP_TOILET_POST_WISH_POLICE_REPLY_TTL_MS,
    });
    this.toiletFrameCount = 0;
    this.seatController.reset();
    this.readingSequence = undefined;
    this.onRestartRequested = options.onRestartRequested;
    this.onConnectorTransitionRequested = options.onConnectorTransitionRequested;
    this.pendingPostStandStanAlert = false;
    this.passiveStanPoliceAlertElapsedMs = undefined;
    this.activePoliceVoiceTtlMs = BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_TTL_MS;
    this.portalPendingActivation = false;
    this.toiletTargetRect = undefined;
    this.portalTargetRect = undefined;
    this.smokeScale = 1;
    this.portalScale = 1;
    this.smokeFrameCount = 0;
    this.pendingCoralRelicWish = undefined;
    this.wishSequence = undefined;
    this.throwSequence = undefined;
    this.portalTransitionRequested = false;
  }

  private registerToiletMountSounds(engine: CartridgeSdkV1Runtime): void {
    engine.audio.registerSound({
      id: BAIT_SHOP_TOILET_READING_DEFEAT_SOUND_ID,
      uri: roccoDefaultYouLoseSoundUrl,
      volume: BAIT_SHOP_TOILET_READING_DEFEAT_SOUND_VOLUME,
      loop: false,
    });
    engine.audio.registerSound({
      id: BAIT_SHOP_TOILET_MEDALLION_STEP_SOUND_ID,
      uri: baitShopToiletAssetUrls.medallionStepSound,
      volume: BAIT_SHOP_TOILET_MEDALLION_STEP_SOUND_VOLUME,
      loop: false,
    });
    engine.audio.registerSound({
      id: BAIT_SHOP_TOILET_PORTAL_LOOP_SOUND_ID,
      uri: baitShopToiletAssetUrls.portalLoopSound,
      volume: BAIT_SHOP_TOILET_PORTAL_LOOP_SOUND_VOLUME,
      loop: true,
    });
    engine.audio.registerSound({
      id: BAIT_SHOP_TOILET_SPELL_SOUND_ID,
      uri: baitShopToiletAssetUrls.spellSound,
      volume: BAIT_SHOP_TOILET_SPELL_SOUND_VOLUME,
      loop: false,
    });
    engine.audio.registerSound({
      id: DOOR_CLOSING_SOUND_ID,
      uri: baitShopToiletAssetUrls.doorClosingSound,
      volume: DOOR_CLOSING_SOUND_VOLUME,
      loop: false,
    });
  }

  private async preloadToiletMountSounds(
    engine: CartridgeSdkV1Runtime,
    preloader: RoccoAssetPreloader | undefined,
  ): Promise<void> {
    await preloadBaitShopToiletSound(
      engine,
      preloader,
      BAIT_SHOP_TOILET_READING_DEFEAT_SOUND_ID,
      'Bait shop toilet reading defeat sound could not be preloaded.',
    );
    await preloadBaitShopToiletSound(
      engine,
      preloader,
      BAIT_SHOP_TOILET_MEDALLION_STEP_SOUND_ID,
      'Bait shop toilet medallion step sound could not be preloaded.',
    );
    await preloadBaitShopToiletSound(
      engine,
      preloader,
      BAIT_SHOP_TOILET_PORTAL_LOOP_SOUND_ID,
      'Bait shop toilet portal loop sound could not be preloaded.',
    );
    await preloadBaitShopToiletSound(
      engine,
      preloader,
      BAIT_SHOP_TOILET_SPELL_SOUND_ID,
      'Bait shop toilet spell sound could not be preloaded.',
    );
    await preloadBaitShopToiletSound(
      engine,
      preloader,
      DOOR_CLOSING_SOUND_ID,
      'Bait shop toilet door closing sound could not be preloaded.',
    );
  }

  private async prepareToiletMountAssets(
    engine: CartridgeSdkV1Runtime,
    options: RoccoLevelMountOptions,
    preloader: RoccoAssetPreloader | undefined,
  ): Promise<BaitShopToiletMountAssets> {
    const entryConnector = findRoccoLevelConnector(this.connectors, options.entryConnectorId);
    const initialPosition = entryConnector
      ? {
          x: options.entryPosition?.x ?? entryConnector.entryPoint.x,
          y: entryConnector.entryPoint.y,
        }
      : { ...BAIT_SHOP_TOILET_ENTRY_POSITION };
    const initialFacing = entryConnector?.entryFacing ?? 'up';
    this.shouldPlayDoorClosingSound =
      options.entryConnectorId === BAIT_SHOP_TOILET_RETURN_CONNECTOR_ID;
    const scene = await loadOrCreateBaitShopScene(engine, BAIT_SHOP_TOILET_SCENE_DEFINITION);
    const [toiletSprite, smokeSprite, portalSprite] = await Promise.all([
      createBaitShopToiletSpriteDefinition(),
      createBaitShopToiletSmokeSpriteDefinition(),
      createBaitShopToiletPortalSpriteDefinition(),
    ]);
    const throwRelicSprite = this.createThrowRelicSpriteDefinition();
    await (preloader?.preloadPlaneScene(engine, scene) ?? engine.video.preloadPlaneScene(scene));
    await Promise.all([
      preloader?.preloadSpriteDefinition(engine, toiletSprite.definition) ??
        engine.video.preloadSpriteDefinition(toiletSprite.definition),
      preloader?.preloadSpriteDefinition(engine, smokeSprite.definition) ??
        engine.video.preloadSpriteDefinition(smokeSprite.definition),
      preloader?.preloadSpriteDefinition(engine, portalSprite.definition) ??
        engine.video.preloadSpriteDefinition(portalSprite.definition),
      preloader?.preloadSpriteDefinition(engine, throwRelicSprite) ??
        engine.video.preloadSpriteDefinition(throwRelicSprite),
    ]);
    return {
      scene,
      initialPosition,
      initialFacing,
      toiletSprite,
      smokeSprite,
      portalSprite,
      throwRelicSprite,
    };
  }

  private loadToiletSpriteDefinitions(
    engine: CartridgeSdkV1Runtime,
    assets: BaitShopToiletMountAssets,
  ): void {
    engine.video.sprites.loadSpriteDefinition(assets.toiletSprite.definition);
    engine.video.sprites.loadSpriteDefinition(assets.smokeSprite.definition);
    engine.video.sprites.loadSpriteDefinition(assets.portalSprite.definition);
    engine.video.sprites.loadSpriteDefinition(assets.throwRelicSprite);
    engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID);
    engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_SMOKE_SPRITE_INSTANCE_ID);
    engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_PORTAL_SPRITE_INSTANCE_ID);
  }

  private updateToiletSpriteGeometry(assets: BaitShopToiletMountAssets): number {
    const toiletScale = BAIT_SHOP_TOILET_TARGET_HEIGHT / assets.toiletSprite.initialFrameHeight;
    const toiletRenderedWidth = assets.toiletSprite.initialFrameWidth * toiletScale;
    this.toiletTargetRect = {
      x: BAIT_SHOP_TOILET_TARGET_X,
      y: BAIT_SHOP_TOILET_TARGET_Y,
      width: toiletRenderedWidth,
      height: BAIT_SHOP_TOILET_TARGET_HEIGHT,
    };
    this.smokeScale = Math.max(
      0.01,
      BAIT_SHOP_TOILET_SMOKE_TARGET_HEIGHT / Math.max(1, assets.smokeSprite.initialFrameHeight),
    );
    this.portalScale = Math.max(
      0.01,
      BAIT_SHOP_TOILET_PORTAL_TARGET_HEIGHT / Math.max(1, assets.portalSprite.initialFrameHeight),
    );
    const portalRenderedWidth = assets.portalSprite.initialFrameWidth * this.portalScale;
    const portalBasePoint = this.resolvePortalBasePoint();
    this.portalTargetRect = {
      x: portalBasePoint.x - portalRenderedWidth / 2,
      y: portalBasePoint.y - BAIT_SHOP_TOILET_PORTAL_TARGET_HEIGHT,
      width: portalRenderedWidth,
      height: BAIT_SHOP_TOILET_PORTAL_TARGET_HEIGHT,
    };
    this.smokeFrameCount = assets.smokeSprite.frameCount;
    return toiletScale;
  }

  private createToiletSprite(
    engine: CartridgeSdkV1Runtime,
    assets: BaitShopToiletMountAssets,
    toiletScale: number,
    toiletRenderedWidth: number,
  ): void {
    engine.video.sprites.createSpriteFromDefinition(BAIT_SHOP_TOILET_SPRITE_DEFINITION_ID, {
      id: BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID,
      transform: {
        x: BAIT_SHOP_TOILET_TARGET_X + toiletRenderedWidth / 2,
        y: BAIT_SHOP_TOILET_TARGET_Y + BAIT_SHOP_TOILET_TARGET_HEIGHT,
        scaleX: toiletScale,
        scaleY: toiletScale,
        rotation: 0,
      },
      renderLayer: 'world.behind',
      zIndex: 10,
      depthMode: 'fixed',
      interactive: true,
      collisionEnabled: false,
      tint: BAIT_SHOP_ROCCO_TINT,
      visibleDescription: { enabled: true, text: this.localization.text.descriptions.toilet },
    });
    engine.video.sprites.stopAnimation(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID);
    engine.video.sprites.setAnimationFrame(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID, 0);
    this.toiletFrameCount = assets.toiletSprite.frameCount;
  }

  private async installToiletMountPresentation(
    engine: CartridgeSdkV1Runtime,
    assets: BaitShopToiletMountAssets,
    options: RoccoLevelMountOptions,
    preloader: RoccoAssetPreloader | undefined,
  ): Promise<void> {
    engine.loadPlaneScene(assets.scene);
    this.clearReadingPresentation();
    await installBaitShopWalkMap(engine, baitShopToiletAssetUrls.walkMap, preloader);
    this.loadToiletSpriteDefinitions(engine, assets);
    const toiletScale = this.updateToiletSpriteGeometry(assets);
    this.createToiletSprite(
      engine,
      assets,
      toiletScale,
      assets.toiletSprite.initialFrameWidth * toiletScale,
    );
    this.restoreDefaultActionMenus();
    this.installToiletActionMenu();
    this.spriteController = await installDefaultSprite(
      engine,
      {
        appearance: options.roccoAppearance,
        initialFacing: assets.initialFacing,
        initialPosition: { ...assets.initialPosition },
        scale: BAIT_SHOP_TOILET_ROCCO_SCALE,
        tint: BAIT_SHOP_ROCCO_TINT,
        localization: this.localization,
        playIntro: false,
        perspectiveAutoAdjust: BAIT_SHOP_PERSPECTIVE_AUTO_ADJUST,
      },
      preloader,
    );
  }

  async mount(
    engine: CartridgeSdkV1Runtime,
    options: RoccoLevelMountOptions = {},
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoPlaneScene> {
    this.initializeToiletMountState(engine, options);
    this.registerToiletMountSounds(engine);
    await this.preloadToiletMountSounds(engine, preloader);
    engine.audio.stopSound(BAIT_SHOP_TOILET_READING_DEFEAT_SOUND_ID);

    const assets = await this.prepareToiletMountAssets(engine, options, preloader);
    await this.installToiletMountPresentation(engine, assets, options, preloader);
    this.unregisterUrgentToiletTarget();
    if (this.toiletRemoved) {
      engine.video.actionMenus.unregisterMenu(BAIT_SHOP_TOILET_ACTION_MENU_ID);
      engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID);
    } else if (this.escapeUrgencyActive) {
      this.syncToiletUrgencyPresentation();
    }
    if (this.portalActive) {
      this.ensurePortalPresentation(false);
      this.startPortalLoopSound();
      this.registerPortalTarget();
    }

    return assets.scene;
  }

  unmount(engine: CartridgeSdkV1Runtime): void {
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    this.readingDialogue?.cancel();
    this.policeDialogue?.cancel();
    this.clearReadingPresentation();
    this.setInputEnabled(true);
    engine.video.gridMenus.closeMenu();
    engine.video.actionMenus.unregisterMenu(BAIT_SHOP_TOILET_ACTION_MENU_ID);
    engine.video.actionMenus.unregisterMenu(ROCCO_PLAYER_ACTION_MENU_ID);
    engine.video.actionMenus.registerMenu(
      createRoccoPlayerActionMenuDefinition(this.localization, isRoccoDeveloperModeEnabled(engine)),
    );
    engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID);
    engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_SMOKE_SPRITE_INSTANCE_ID);
    engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_PORTAL_SPRITE_INSTANCE_ID);
    engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_THROW_RELIC_SPRITE_INSTANCE_ID);
    this.unregisterUrgentToiletTarget();
    this.unregisterPortalTarget();
    uninstallDefaultSprite(engine);
    uninstallBaitShopWalkMap(engine);
    engine.audio.unregisterSound(BAIT_SHOP_TOILET_READING_DEFEAT_SOUND_ID);
    engine.audio.unregisterSound(BAIT_SHOP_TOILET_MEDALLION_STEP_SOUND_ID);
    engine.audio.unregisterSound(BAIT_SHOP_TOILET_PORTAL_LOOP_SOUND_ID);
    engine.audio.unregisterSound(BAIT_SHOP_TOILET_SPELL_SOUND_ID);
    engine.audio.stopSound(DOOR_CLOSING_SOUND_ID);
    engine.audio.unregisterSound(DOOR_CLOSING_SOUND_ID);
    this.shouldPlayDoorClosingSound = false;
    this.engine = undefined;
    this.inputLease = undefined;
    this.spriteController = undefined;
    this.readingDialogue = undefined;
    this.policeDialogue = undefined;
    this.toiletFrameCount = 0;
    this.seatController.reset();
    this.readingSequence = undefined;
    this.onRestartRequested = undefined;
    this.onConnectorTransitionRequested = undefined;
    this.pendingPostStandStanAlert = false;
    this.passiveStanPoliceAlertElapsedMs = undefined;
    this.activePoliceVoiceTtlMs = BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_TTL_MS;
    this.portalPendingActivation = false;
    this.toiletTargetRect = undefined;
    this.portalTargetRect = undefined;
    this.smokeScale = 1;
    this.portalScale = 1;
    this.smokeFrameCount = 0;
    this.pendingCoralRelicWish = undefined;
    this.wishSequence = undefined;
    this.throwSequence = undefined;
    this.portalTransitionRequested = false;
  }

  update(deltaMs: number): void {
    this.spriteController?.update(deltaMs);
    this.seatController.update(deltaMs);
    this.readingDialogue?.update(deltaMs);
    this.policeDialogue?.update(deltaMs);
    this.updateReadingSequence(deltaMs);
    this.updatePassiveStanPoliceAlert(deltaMs);
    this.updateThrowSequence(deltaMs);
    this.updateWishSequence(deltaMs);
    this.updatePortalActivation();
    this.updatePortalTransition();
    if (this.shouldPlayDoorClosingSound && this.engine) {
      this.shouldPlayDoorClosingSound = false;
      this.engine.audio.playSound(DOOR_CLOSING_SOUND_ID, {
        restart: true,
        volume: DOOR_CLOSING_SOUND_VOLUME,
      });
    }
  }

  handleGridMenu(activation: RoccoGridMenuActivation): void {
    if (activation.definitionId === BAIT_SHOP_TOILET_WISH_MENU_ID) {
      this.handleWishMenuActivation(activation);
      return;
    }

    if (activation.definitionId === BAIT_SHOP_TOILET_POST_WISH_RESPONSE_MENU_ID) {
      this.handlePostWishResponseMenuActivation(activation);
    }
  }

  handleAction(activation: RoccoActionMenuActivation): void {
    if (this.readingSequence || this.wishSequence || this.throwSequence) {
      return;
    }

    if (this.isSeatedAction(activation)) {
      this.handleSeatedAction(activation);
      return;
    }

    if (
      activation.targetInstanceId !== BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID ||
      this.seatController.isActive()
    ) {
      return;
    }

    if (activation.actionId === 'look') {
      this.showRoccoThoughtLines(
        this.localization.text.baitShop.toiletLookLines,
        BAIT_SHOP_TOILET_LOOK_HISTORY_KEY,
      );
      return;
    }

    if (activation.actionId !== 'use') {
      return;
    }

    if (!this.hasMagazine()) {
      this.showRoccoThoughtLine(this.localization.text.baitShop.toiletNeedMagazineLine);
      return;
    }

    this.startSitSequence();
  }

  handleSceneClick(activation: RoccoSceneClickAction): CartridgeActionDisposition | void {
    if (this.throwSequence) {
      return suppressDefaultPlayerMovement();
    }

    if (this.readingSequence) {
      if (this.readingSequence.phase === 'lines') {
        this.readingDialogue?.advance();
      } else if (this.readingSequence.phase === 'stan-alert') {
        this.policeDialogue?.advance();
      }
      return suppressDefaultPlayerMovement();
    }

    if (this.closePostWishPoliceWarningOnClick()) {
      return suppressDefaultPlayerMovement();
    }

    if (this.advancePostWishPoliceResponseOnClick()) {
      return suppressDefaultPlayerMovement();
    }

    if (activation.targetInstanceId === BAIT_SHOP_TOILET_URGENT_TARGET_INSTANCE_ID) {
      this.showRoccoThoughtLine(this.localization.text.baitShop.toiletUrgentLine);
      return suppressDefaultPlayerMovement();
    }

    if (this.handlePortalSceneClick(activation)) {
      return suppressDefaultPlayerMovement();
    }

    if (!this.roccoSeated || this.seatController.isActive()) {
      return;
    }

    if (activation.targetInstanceId === BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID) {
      // Let the input layer open the seated toilet action menu instead of
      // consuming the click as a generic seated interaction.
      return;
    }

    if (IS_BAIT_SHOP_TOILET_ALLOW_STAND_WALK_CANCEL && !activation.targetInstanceId) {
      this.startStandSequence({
        x: activation.sceneX,
        y: activation.sceneY,
      });
      return suppressDefaultPlayerMovement();
    }

    this.showToiletThoughtLines(
      this.localization.text.baitShop.toiletStaySeatedLines,
      BAIT_SHOP_TOILET_STAY_SEATED_HISTORY_KEY,
    );
    return suppressDefaultPlayerMovement();
  }

  handleInventorySceneClick(
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ): boolean {
    if (
      this.seatController.isActive() ||
      this.readingSequence ||
      this.wishSequence ||
      this.throwSequence
    ) {
      return false;
    }

    if (this.roccoSeated) {
      return false;
    }

    if (
      carriedItem.item.id !== ROCCO_INVENTORY_MAGAZINE_ITEM_ID ||
      activation.targetInstanceId !== BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID
    ) {
      return false;
    }

    if (!this.hasMagazine()) {
      return false;
    }

    this.startSitSequence();

    if (this.engine) {
      this.engine.video.gridMenus.clearCarriedItem();
    }

    return true;
  }
}

export class RoccoBaitShopToiletLevel implements RoccoLevel, RoccoToiletLevelCapability {
  private readonly controller: RoccoBaitShopToiletController;

  readonly id: string;
  readonly title: string;
  readonly connectors = BAIT_SHOP_TOILET_CONNECTORS;

  constructor(
    localization: RoccoLocalization = createRoccoLocalization(),
    options: RoccoBaitShopToiletLevelOptions = {},
  ) {
    this.controller = new RoccoBaitShopToiletController(localization, options);
    this.id = this.controller.id;
    this.title = this.controller.title;
  }

  mount(
    engine: CartridgeSdkV1Runtime,
    options?: RoccoLevelMountOptions,
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoPlaneScene> {
    return this.controller.mount(engine, options, preloader);
  }

  unmount(engine: CartridgeSdkV1Runtime): void {
    this.controller.unmount(engine);
  }

  update(deltaMs: number): void {
    this.controller.update(deltaMs);
  }

  handleAction(activation: RoccoActionMenuActivation): void {
    this.controller.handleAction(activation);
  }

  handleGridMenu(activation: RoccoGridMenuActivation): void {
    this.controller.handleGridMenu(activation);
  }

  handleSceneClick(activation: RoccoSceneClickAction): CartridgeActionDisposition | void {
    return this.controller.handleSceneClick(activation);
  }

  handleInventorySceneClick(
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ): boolean {
    return this.controller.handleInventorySceneClick(activation, carriedItem);
  }

  isEscapeUrgencyActive(): boolean {
    return this.controller.isEscapeUrgencyActive();
  }

  startThrowCoralRelicSequence(
    relicItem: RoccoInventoryItem,
    onComplete: (groundPoint: RoccoPoint) => void,
  ): void {
    this.controller.startThrowCoralRelicSequence(
      relicItem,
      onComplete,
      this.isEscapeUrgencyActive(),
    );
  }

  openCoralRelicWishMenu(groundPoint: RoccoPoint, consumeRelic: () => void): void {
    this.controller.openCoralRelicWishMenu(groundPoint, consumeRelic);
  }

  refreshDeveloperEventPresentation(): void {
    this.controller.refreshDeveloperEventPresentation();
  }

  shouldLoseOnExit(connectorId: string): boolean {
    return this.controller.shouldLoseOnExit(connectorId);
  }

  beginExitDefeat(): void {
    this.controller.beginExitDefeat();
  }
}
