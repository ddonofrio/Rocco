import type { RoccoCartridgeActionResult, RoccoSceneClickAction } from '../../../../engine/cartridges';
import type { RoccoEngine } from '../../../../engine/engine-sdk';
import type {
  RoccoActionMenuActivation,
  RoccoActionMenuDefinition,
} from '../../../../engine/video/action-menu';
import type { RoccoGraphicPlane, RoccoPlaneScene } from '../../../../engine/video/planes';
import {
  createRoccoSpriteAutoCroppedFrames,
  type RoccoPoint,
  type RoccoSpriteDefinition,
  type RoccoSpriteInstance,
} from '../../../../engine/video/sprites';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import {
  roccoDefaultActionMenuAssetUrls,
  roccoDefaultYouLoseSoundUrl,
} from '../../rocco-default-assets';
import {
  createRoccoPlayerActionMenuDefinition,
  ROCCO_PLAYER_ACTION_MENU_ID,
  ROCCO_PLAYER_DEVELOPER_ACTION_ID,
  ROCCO_PLAYER_INVENTORY_ACTION_ID,
  ROCCO_PLAYER_TALK_ACTION_ID,
} from '../../rocco-player-action-menu';
import { ROCCO_DEVELOPER_MODE_ENABLED } from '../../rocco-developer-mode';
import {
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_ROCCO_GREEN_BLACK,
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_RUN_ACTION_ID,
  DEFAULT_SPRITE_SCALE,
} from '../../rocco-default-constants';
import {
  installDefaultSprite,
  uninstallDefaultSprite,
  type RoccoDefaultSpriteController,
} from '../../rocco-default-sprites';
import { DEFAULT_STAN_DIALOGUE_TEXT_COLOR } from '../pier/pier-stan';
import {
  findRoccoLevelConnector,
  type RoccoLevel,
  type RoccoLevelConnector,
  type RoccoLevelMountOptions,
} from '../rocco-level-types';
import { baitShopToiletAssetUrls } from './bait-shop-assets';
import {
  installBaitShopWalkMap,
  loadOrCreateBaitShopScene,
  uninstallBaitShopWalkMap,
  type RoccoBaitShopSceneDefinition,
} from './bait-shop-level';

export const ROCCO_BAIT_SHOP_TOILET_LEVEL_ID = 'bait-shop-toilet';
export const BAIT_SHOP_TOILET_SCENE_ID = 'rocco-bait-shop-toilet-scene';

export interface RoccoBaitShopToiletLevelOptions {
  hasMagazine?: () => boolean;
  isStanIdentified?: () => boolean;
}

type BaitShopToiletSequencePhase =
  | 'walking-to-approach'
  | 'waiting-before-frame-one'
  | 'waiting-before-seat-walk'
  | 'walking-to-seat'
  | 'waiting-before-frame-two'
  | 'standing-before-walk'
  | 'standing-walking-to-approach'
  | 'standing-before-frame-zero';

interface BaitShopToiletSequence {
  phase: BaitShopToiletSequencePhase;
  elapsedMs: number;
}

type BaitShopToiletReadingPhase =
  | 'lines'
  | 'stan-alert'
  | 'fading'
  | 'title'
  | 'restarting';

interface BaitShopToiletReadingSequence {
  phase: BaitShopToiletReadingPhase;
  lineIndex: number;
  lines: readonly string[];
  elapsedMs: number;
}

const BAIT_SHOP_TOILET_RETURN_CONNECTOR_ID = 'south';
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
const BAIT_SHOP_LOOK_MESSAGE_TTL_MS = 10400;
const BAIT_SHOP_TOILET_READING_BACKDROP_PLANE_ID = 'rocco-bait-shop-toilet-reading-backdrop';
const BAIT_SHOP_TOILET_READING_IMAGE_PLANE_ID = 'rocco-bait-shop-toilet-reading-magazine';
const BAIT_SHOP_TOILET_READING_IMAGE_HEIGHT = DEFAULT_DESIGN_HEIGHT;
const BAIT_SHOP_TOILET_READING_IMAGE_WIDTH = DEFAULT_DESIGN_WIDTH;
const BAIT_SHOP_TOILET_READING_IMAGE_X = 0;
const BAIT_SHOP_TOILET_READING_MESSAGE_ID = 'rocco-bait-shop-toilet-reading-message';
const BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_ID = 'rocco-bait-shop-toilet-stan-alert-message';
const BAIT_SHOP_TOILET_STAN_ALERT_SPRITE_INSTANCE_ID =
  'rocco-bait-shop-toilet-stan-alert-anchor';
const BAIT_SHOP_TOILET_READING_MESSAGE_TTL_MS = 10 * 60 * 1000;
const BAIT_SHOP_TOILET_READING_LINE_DURATION_MS = 12800;
const BAIT_SHOP_TOILET_READING_MESSAGE_SCALE = 0.8;
const BAIT_SHOP_TOILET_READING_MESSAGE_MAX_WIDTH = Math.round(
  Math.min(
    DEFAULT_DESIGN_WIDTH - 44,
    330 * BAIT_SHOP_TOILET_READING_MESSAGE_SCALE * 4,
  ),
);
const BAIT_SHOP_TOILET_READING_MESSAGE_FONT_SIZE =
  18 * BAIT_SHOP_TOILET_READING_MESSAGE_SCALE * 2;
const BAIT_SHOP_TOILET_READING_MESSAGE_OFFSET_Y = -30;
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
const BAIT_SHOP_TOILET_READING_DEFEAT_TITLE_ID =
  'rocco-bait-shop-toilet-reading-defeat-title';
const BAIT_SHOP_TOILET_READING_DEFEAT_FADE_DURATION_MS = 1300;
const BAIT_SHOP_TOILET_READING_DEFEAT_TITLE_DURATION_MS = 3600;
const BAIT_SHOP_TOILET_ALLOW_STAND_WALK_CANCEL = false;
const BAIT_SHOP_PERSPECTIVE_AUTO_ADJUST = {
  farY: 280,
  nearY: 530,
  farScale: 0.8,
  nearScale: 1,
} as const;

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
  extraPlanes: [
    BAIT_SHOP_TOILET_READING_BACKDROP_PLANE,
    BAIT_SHOP_TOILET_READING_IMAGE_PLANE,
  ],
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
  const initialFrame =
    crop.frames.find((frame) => frame.id === frameIds[0]) ??
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
    definition: {
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
      render: {
        renderLayer: 'world.behind',
        zIndex: 10,
        depthMode: 'fixed',
        opacity: 1,
      },
      metadata: {
        purpose: 'bait-shop-toilet',
      },
    },
  };
}

function createSeatedRoccoActionMenuDefinition(
  localization: RoccoLocalization,
): RoccoActionMenuDefinition {
  const base = createRoccoPlayerActionMenuDefinition(localization);
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

  if (ROCCO_DEVELOPER_MODE_ENABLED) {
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

export class RoccoBaitShopToiletLevel implements RoccoLevel {
  readonly id = ROCCO_BAIT_SHOP_TOILET_LEVEL_ID;
  readonly title: string;
  readonly connectors = BAIT_SHOP_TOILET_CONNECTORS;

  private readonly localization: RoccoLocalization;
  private readonly options: RoccoBaitShopToiletLevelOptions;
  private engine: RoccoEngine | null = null;
  private spriteController: RoccoDefaultSpriteController | null = null;
  private toiletFrameCount = 0;
  private sequence: BaitShopToiletSequence | null = null;
  private readingSequence: BaitShopToiletReadingSequence | null = null;
  private roccoSeated = false;
  private queuedWalkDestination: RoccoPoint | null = null;
  private onRestartRequested: (() => void) | null = null;

  constructor(
    localization: RoccoLocalization = createRoccoLocalization(),
    options: RoccoBaitShopToiletLevelOptions = {},
  ) {
    this.localization = localization;
    this.options = options;
    this.title = localization.text.levels.baitShopToiletTitle;
  }

  async mount(
    engine: RoccoEngine,
    options: RoccoLevelMountOptions = {},
  ): Promise<RoccoPlaneScene> {
    this.engine = engine;
    this.spriteController = null;
    this.toiletFrameCount = 0;
    this.sequence = null;
    this.readingSequence = null;
    this.roccoSeated = false;
    this.queuedWalkDestination = null;
    this.onRestartRequested = options.onRestartRequested ?? null;
    engine.audio.registerSound({
      id: BAIT_SHOP_TOILET_READING_DEFEAT_SOUND_ID,
      uri: roccoDefaultYouLoseSoundUrl,
      volume: BAIT_SHOP_TOILET_READING_DEFEAT_SOUND_VOLUME,
      loop: false,
    });
    await engine.audio.preloadSound(BAIT_SHOP_TOILET_READING_DEFEAT_SOUND_ID).catch(() => {
      engine.log('Audio', 'Bait shop toilet reading defeat sound could not be preloaded.');
    });
    engine.audio.stopSound(BAIT_SHOP_TOILET_READING_DEFEAT_SOUND_ID);

    const entryConnector = findRoccoLevelConnector(this.connectors, options.entryConnectorId);
    const initialPosition = entryConnector
      ? {
          x: options.entryPosition?.x ?? entryConnector.entryPoint.x,
          y: entryConnector.entryPoint.y,
        }
      : { ...BAIT_SHOP_TOILET_ENTRY_POSITION };
    const initialFacing = entryConnector?.entryFacing ?? 'up';
    const scene = await loadOrCreateBaitShopScene(engine, BAIT_SHOP_TOILET_SCENE_DEFINITION);
    const toiletSprite = await createBaitShopToiletSpriteDefinition();
    await engine.video.preloadPlaneScene(scene);
    await engine.video.preloadSpriteDefinition(toiletSprite.definition);
    engine.loadPlaneScene(scene);
    this.clearReadingPresentation();
    await installBaitShopWalkMap(engine, baitShopToiletAssetUrls.walkMap);
    engine.video.sprites.loadSpriteDefinition(toiletSprite.definition);
    engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID);
    const toiletScale = BAIT_SHOP_TOILET_TARGET_HEIGHT / toiletSprite.initialFrameHeight;
    const toiletRenderedWidth = toiletSprite.initialFrameWidth * toiletScale;
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
      visibleDescription: {
        enabled: true,
        text: this.localization.text.descriptions.toilet,
      },
    });
    engine.video.sprites.stopAnimation(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID);
    engine.video.sprites.setAnimationFrame(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID, 0);
    this.toiletFrameCount = toiletSprite.frameCount;
    this.restoreDefaultActionMenus();
    this.installToiletActionMenu();
    this.spriteController = await installDefaultSprite(engine, {
      initialFacing,
      initialPosition: { ...initialPosition },
      scale: BAIT_SHOP_TOILET_ROCCO_SCALE,
      tint: BAIT_SHOP_ROCCO_TINT,
      localization: this.localization,
      playIntro: false,
      perspectiveAutoAdjust: BAIT_SHOP_PERSPECTIVE_AUTO_ADJUST,
    });

    return scene;
  }

  unmount(engine: RoccoEngine): void {
    const wasReading = this.readingSequence !== null;
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    this.clearReadingPresentation();
    if (wasReading) {
      engine.setInputEnabled(true);
    }
    engine.video.actionMenus.unregisterMenu(BAIT_SHOP_TOILET_ACTION_MENU_ID);
    engine.video.actionMenus.unregisterMenu(ROCCO_PLAYER_ACTION_MENU_ID);
    engine.video.actionMenus.registerMenu(createRoccoPlayerActionMenuDefinition(this.localization));
    engine.video.sprites.removeSprite(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID);
    uninstallDefaultSprite(engine);
    uninstallBaitShopWalkMap(engine);
    engine.audio.unregisterSound(BAIT_SHOP_TOILET_READING_DEFEAT_SOUND_ID);
    this.engine = null;
    this.spriteController = null;
    this.toiletFrameCount = 0;
    this.sequence = null;
    this.readingSequence = null;
    this.roccoSeated = false;
    this.queuedWalkDestination = null;
    this.onRestartRequested = null;
    engine.video.render(0);
  }

  update(deltaMs: number): void {
    this.spriteController?.update(deltaMs);
    this.updateSequence(deltaMs);
    this.updateReadingSequence(deltaMs);
  }

  handleAction(activation: RoccoActionMenuActivation): void {
    if (this.readingSequence) {
      return;
    }

    if (this.isSeatedAction(activation)) {
      this.handleSeatedAction(activation);
      return;
    }

    if (
      activation.targetInstanceId !== BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID ||
      this.sequence
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

  handleSceneClick(activation: RoccoSceneClickAction): RoccoCartridgeActionResult | void {
    if (this.readingSequence) {
      this.advanceReadingSequence();
      return { suppressDefaultPlayerMove: true };
    }

    if (!this.roccoSeated || this.sequence) {
      return;
    }

    if (activation.targetInstanceId === BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID) {
      return { suppressDefaultPlayerMove: true };
    }

    if (BAIT_SHOP_TOILET_ALLOW_STAND_WALK_CANCEL && !activation.targetInstanceId) {
      this.startStandSequence({
        x: activation.sceneX,
        y: activation.sceneY,
      });
      return { suppressDefaultPlayerMove: true };
    }

    this.showToiletThoughtLines(
      this.localization.text.baitShop.toiletStaySeatedLines,
      BAIT_SHOP_TOILET_STAY_SEATED_HISTORY_KEY,
    );
    return { suppressDefaultPlayerMove: true };
  }

  private hasMagazine(): boolean {
    return this.options.hasMagazine?.() ?? false;
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
    if (!this.engine || this.readingSequence) {
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
    this.engine.video.sprites.stopMovement(DEFAULT_SPRITE_INSTANCE_ID);
    this.engine.setInputEnabled(false);
    this.setReadingOverlayVisible(true);
    this.readingSequence = {
      phase: 'lines',
      lineIndex: 0,
      lines,
      elapsedMs: 0,
    };
    this.showCurrentMagazineReadingLine();
    this.engine.video.render(0);
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
      const elapsedMs = this.readingSequence.elapsedMs + deltaMs;
      if (elapsedMs < BAIT_SHOP_TOILET_READING_LINE_DURATION_MS) {
        this.readingSequence = {
          ...this.readingSequence,
          elapsedMs,
        };
        return;
      }

      this.advanceReadingSequence();
      return;
    }

    if (this.readingSequence.phase === 'stan-alert') {
      const nextElapsedMs = this.readingSequence.elapsedMs + deltaMs;
      const clampedElapsedMs = Math.min(BAIT_SHOP_TOILET_STAN_ALERT_DURATION_MS, nextElapsedMs);
      this.readingSequence = {
        ...this.readingSequence,
        elapsedMs: clampedElapsedMs,
      };
      this.updateStanPoliceAlertAnchor(clampedElapsedMs);

      if (nextElapsedMs < BAIT_SHOP_TOILET_STAN_ALERT_DURATION_MS) {
        return;
      }

      const overflowMs = nextElapsedMs - BAIT_SHOP_TOILET_STAN_ALERT_DURATION_MS;
      this.beginReadingDefeatFade();
      this.updateReadingSequence(overflowMs);
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
    const lines = this.localization.text.baitShop.toiletMagazineReadingLines;
    return [
      ...lines.slice(0, 2),
      this.isStanIdentified()
        ? this.localization.text.baitShop.toiletMagazineKnownStanLine
        : this.localization.text.baitShop.toiletMagazineUnknownStanLine,
      ...lines.slice(2),
    ].filter((line) => line.trim().length > 0);
  }

  private isStanIdentified(): boolean {
    return this.options.isStanIdentified?.() ?? false;
  }

  private showCurrentMagazineReadingLine(): void {
    if (!this.engine || !this.readingSequence) {
      return;
    }

    const line = this.readingSequence.lines[this.readingSequence.lineIndex];
    if (!line) {
      return;
    }

    this.engine.video.messages.think(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID, line, {
      id: BAIT_SHOP_TOILET_READING_MESSAGE_ID,
      ttlMs: BAIT_SHOP_TOILET_READING_MESSAGE_TTL_MS,
      side: 'above',
      offset: this.resolveReadingMessageOffset(),
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
    });
    this.engine.video.render(0);
  }

  private resolveReadingMessageOffset(): RoccoPoint {
    if (!this.engine) {
      return {
        x: 0,
        y: BAIT_SHOP_TOILET_READING_MESSAGE_OFFSET_Y,
      };
    }

    const toiletSprite = this.engine.video.sprites.getSprite(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID);
    return {
      x: toiletSprite ? DEFAULT_DESIGN_WIDTH / 2 - toiletSprite.transform.x : 0,
      y: BAIT_SHOP_TOILET_READING_MESSAGE_OFFSET_Y,
    };
  }

  private beginReadingDefeatFade(): void {
    if (!this.engine || !this.readingSequence) {
      return;
    }

    this.readingSequence = {
      ...this.readingSequence,
      phase: 'fading',
      elapsedMs: 0,
    };
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
    this.engine.video.render(0);
  }

  private beginStanPoliceAlert(): void {
    if (!this.engine || !this.readingSequence) {
      return;
    }

    this.readingSequence = {
      ...this.readingSequence,
      phase: 'stan-alert',
      elapsedMs: 0,
    };
    this.engine.video.messages.clearMessages();
    this.engine.video.actionMenus.closeMenu();
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.gridMenus.clearCarriedItem();
    this.setReadingOverlayVisible(false);
    this.ensureStanPoliceAlertAnchorSprite();
    this.showStanPoliceAlertMessage();
    this.engine.video.render(0);
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
    this.engine.video.render(0);
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
    this.engine.setInputEnabled(true);
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
    this.engine.video.render(0);
  }

  private clearReadingPresentation(): void {
    if (!this.engine) {
      return;
    }

    this.readingSequence = null;
    this.engine.audio.stopSound(BAIT_SHOP_TOILET_READING_DEFEAT_SOUND_ID);
    this.engine.video.messages.removeMessage(BAIT_SHOP_TOILET_READING_MESSAGE_ID);
    this.engine.video.messages.removeMessage(BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_ID);
    this.engine.video.titles.removeTitle(BAIT_SHOP_TOILET_READING_DEFEAT_TITLE_ID);
    this.engine.video.primitives.removePrimitive(BAIT_SHOP_TOILET_READING_DEFEAT_FADE_PRIMITIVE_ID);
    this.removeStanPoliceAlertAnchorSprite();
    this.setReadingOverlayVisible(false);
    this.engine.video.render(0);
  }

  private setReadingOverlayVisible(visible: boolean): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.planes.updatePlane(
      BAIT_SHOP_TOILET_SCENE_ID,
      BAIT_SHOP_TOILET_READING_BACKDROP_PLANE_ID,
      { visible },
    );
    this.engine.video.planes.updatePlane(
      BAIT_SHOP_TOILET_SCENE_ID,
      BAIT_SHOP_TOILET_READING_IMAGE_PLANE_ID,
      { visible },
    );
  }

  private installToiletActionMenu(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.actionMenus.unregisterMenu(BAIT_SHOP_TOILET_ACTION_MENU_ID);
    this.engine.video.actionMenus.registerMenu(this.createToiletActionMenuDefinition());
    this.engine.video.render(0);
  }

  private installSeatedRoccoActionMenu(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.actionMenus.unregisterMenu(BAIT_SHOP_TOILET_ACTION_MENU_ID);
    this.engine.video.actionMenus.unregisterMenu(ROCCO_PLAYER_ACTION_MENU_ID);
    this.engine.video.actionMenus.registerMenu(createSeatedRoccoActionMenuDefinition(this.localization));
    this.engine.video.render(0);
  }

  private restoreDefaultActionMenus(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.actionMenus.unregisterMenu(ROCCO_PLAYER_ACTION_MENU_ID);
    this.engine.video.actionMenus.registerMenu(createRoccoPlayerActionMenuDefinition(this.localization));
    this.engine.video.render(0);
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
    if (!this.engine || this.sequence) {
      return;
    }

    if (!this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID)) {
      return;
    }

    this.engine.video.actionMenus.closeMenu();
    this.engine.video.messages.clearMessages();
    this.engine.setInputEnabled(false);
    this.engine.video.sprites.stopMovement(DEFAULT_SPRITE_INSTANCE_ID);

    const started = this.engine.video.sprites.goTo(
      DEFAULT_SPRITE_INSTANCE_ID,
      BAIT_SHOP_TOILET_SIT_APPROACH_POINT.x,
      BAIT_SHOP_TOILET_SIT_APPROACH_POINT.y,
      {
        action: DEFAULT_SPRITE_RUN_ACTION_ID,
        idleAction: DEFAULT_SPRITE_IDLE_ACTION_ID,
        stopDistance: 1,
        idleSettleDelayMs: 0,
        idleSettleFacing: 'diagonal-from-facing',
      },
    );
    if (!started) {
      this.engine.setInputEnabled(true);
      return;
    }

    this.sequence = {
      phase: 'walking-to-approach',
      elapsedMs: 0,
    };
    this.engine.video.render(0);
  }

  private startStandSequence(destination: RoccoPoint): void {
    if (!this.engine || !this.roccoSeated || this.sequence) {
      return;
    }

    this.queuedWalkDestination = destination;
    this.engine.video.actionMenus.closeMenu();
    this.engine.video.messages.clearMessages();
    this.engine.setInputEnabled(false);
    this.setToiletFrame(1);
    this.showHiddenRoccoAtSeatPoint();
    this.sequence = {
      phase: 'standing-before-walk',
      elapsedMs: 0,
    };
    this.engine.video.render(0);
  }

  private updateSequence(deltaMs: number): void {
    if (!this.engine || !this.sequence || !Number.isFinite(deltaMs) || deltaMs < 0) {
      return;
    }

    if (this.sequence.phase === 'walking-to-approach') {
      if (this.engine.video.sprites.isMoving(DEFAULT_SPRITE_INSTANCE_ID)) {
        return;
      }

      this.engine.video.sprites.playAction(DEFAULT_SPRITE_INSTANCE_ID, DEFAULT_SPRITE_IDLE_ACTION_ID, {
        direction: 'up-left',
        restart: true,
      });
      this.sequence = {
        phase: 'waiting-before-frame-one',
        elapsedMs: 0,
      };
      this.engine.video.render(0);
      return;
    }

    if (this.sequence.phase === 'walking-to-seat') {
      if (this.engine.video.sprites.isMoving(DEFAULT_SPRITE_INSTANCE_ID)) {
        return;
      }

      this.engine.video.sprites.playAction(DEFAULT_SPRITE_INSTANCE_ID, DEFAULT_SPRITE_IDLE_ACTION_ID, {
        direction: 'down',
        restart: true,
      });
      this.sequence = {
        phase: 'waiting-before-frame-two',
        elapsedMs: 0,
      };
      this.engine.video.render(0);
      return;
    }

    if (this.sequence.phase === 'standing-walking-to-approach') {
      if (this.engine.video.sprites.isMoving(DEFAULT_SPRITE_INSTANCE_ID)) {
        return;
      }

      this.sequence = {
        phase: 'standing-before-frame-zero',
        elapsedMs: 0,
      };
      this.engine.video.render(0);
      return;
    }

    this.sequence.elapsedMs += deltaMs;
    if (this.sequence.elapsedMs < BAIT_SHOP_TOILET_SIT_WAIT_MS) {
      return;
    }

    if (this.sequence.phase === 'waiting-before-frame-one') {
      this.setToiletFrame(1);
      this.sequence = {
        phase: 'waiting-before-seat-walk',
        elapsedMs: 0,
      };
      return;
    }

    if (this.sequence.phase === 'waiting-before-seat-walk') {
      this.startSeatWalk();
      return;
    }

    if (this.sequence.phase === 'waiting-before-frame-two') {
      this.finishSitSequence();
      return;
    }

    if (this.sequence.phase === 'standing-before-walk') {
      this.startStandWalk();
      return;
    }

    if (this.sequence.phase === 'standing-before-frame-zero') {
      this.finishStandSequence();
    }
  }

  private startSeatWalk(): void {
    if (!this.engine) {
      return;
    }

    const started = this.engine.video.sprites.goTo(
      DEFAULT_SPRITE_INSTANCE_ID,
      BAIT_SHOP_TOILET_SIT_SEAT_POINT.x,
      BAIT_SHOP_TOILET_SIT_SEAT_POINT.y,
      {
        action: DEFAULT_SPRITE_RUN_ACTION_ID,
        idleAction: DEFAULT_SPRITE_IDLE_ACTION_ID,
        constrainToWalkMap: false,
        stopDistance: 1,
        idleSettleDelayMs: 0,
        idleSettleFacing: 'diagonal-from-facing',
      },
    );
    if (!started) {
      this.sequence = null;
      this.engine.setInputEnabled(true);
      return;
    }

    this.sequence = {
      phase: 'walking-to-seat',
      elapsedMs: 0,
    };
    this.engine.video.render(0);
  }

  private startStandWalk(): void {
    if (!this.engine) {
      return;
    }

    const started = this.engine.video.sprites.goTo(
      DEFAULT_SPRITE_INSTANCE_ID,
      BAIT_SHOP_TOILET_SIT_APPROACH_POINT.x,
      BAIT_SHOP_TOILET_SIT_APPROACH_POINT.y,
      {
        action: DEFAULT_SPRITE_RUN_ACTION_ID,
        idleAction: DEFAULT_SPRITE_IDLE_ACTION_ID,
        constrainToWalkMap: false,
        stopDistance: 1,
        idleSettleDelayMs: 0,
        idleSettleFacing: 'diagonal-from-facing',
      },
    );
    if (!started) {
      this.sequence = null;
      this.engine.setInputEnabled(true);
      return;
    }

    this.sequence = {
      phase: 'standing-walking-to-approach',
      elapsedMs: 0,
    };
    this.engine.video.render(0);
  }

  private finishSitSequence(): void {
    if (!this.engine) {
      return;
    }

    this.setToiletFrame(2);
    this.hideRoccoAtSeatPoint();
    this.roccoSeated = true;
    this.sequence = null;
    this.setToiletVisibleDescription(this.localization.text.descriptions.seatedRocco);
    this.installSeatedRoccoActionMenu();
    this.engine.setInputEnabled(true);
    this.engine.video.render(0);
  }

  private finishStandSequence(): void {
    if (!this.engine) {
      return;
    }

    this.setToiletFrame(0);
    this.roccoSeated = false;
    this.sequence = null;
    this.setToiletVisibleDescription(this.localization.text.descriptions.toilet);
    this.restoreDefaultActionMenus();
    this.installToiletActionMenu();
    this.engine.setInputEnabled(true);

    const destination = this.queuedWalkDestination;
    this.queuedWalkDestination = null;
    if (destination) {
      this.engine.video.sprites.goTo(DEFAULT_SPRITE_INSTANCE_ID, destination.x, destination.y, {
        idleSettleDelayMs: 0,
        idleSettleFacing: 'diagonal-from-facing',
      });
    }

    this.engine.video.render(0);
  }

  private hideRoccoAtSeatPoint(): void {
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

  private showHiddenRoccoAtSeatPoint(): void {
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
    this.engine.video.sprites.playAction(DEFAULT_SPRITE_INSTANCE_ID, DEFAULT_SPRITE_IDLE_ACTION_ID, {
      direction: 'down',
      restart: true,
    });
    this.engine.video.render(0);
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

  private setToiletFrame(frameIndex: number): void {
    if (!this.engine || this.toiletFrameCount <= 0) {
      return;
    }

    const clampedIndex = Math.max(0, Math.min(this.toiletFrameCount - 1, frameIndex));
    this.engine.video.sprites.setAnimationFrame(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID, clampedIndex);
    this.engine.video.render(0);
  }

  private showRoccoThoughtLines(lines: string[], historyKey: string): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.messages.think(DEFAULT_SPRITE_INSTANCE_ID, lines, {
      lineSelection: {
        mode: 'random',
        count: 1,
        historyKey,
        avoidImmediateRepeat: true,
      },
      ttlMs: BAIT_SHOP_LOOK_MESSAGE_TTL_MS,
    });
    this.engine.video.render(0);
  }

  private showRoccoThoughtLine(line: string): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.messages.think(DEFAULT_SPRITE_INSTANCE_ID, line, {
      ttlMs: BAIT_SHOP_LOOK_MESSAGE_TTL_MS,
    });
    this.engine.video.render(0);
  }

  private showToiletThoughtLines(lines: string[], historyKey: string): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.messages.think(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID, lines, {
      lineSelection: {
        mode: 'random',
        count: 1,
        historyKey,
        avoidImmediateRepeat: true,
      },
      ttlMs: BAIT_SHOP_LOOK_MESSAGE_TTL_MS,
    });
    this.engine.video.render(0);
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

  private showStanPoliceAlertMessage(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.messages.say(
      BAIT_SHOP_TOILET_STAN_ALERT_SPRITE_INSTANCE_ID,
      this.localization.text.baitShop.toiletPoliceAlertLine,
      {
        id: BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_ID,
        ttlMs: BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_TTL_MS,
        side: 'left',
        maxWidth: BAIT_SHOP_TOILET_STAN_ALERT_MESSAGE_MAX_WIDTH,
        zIndex: 5000,
        style: {
          fill: DEFAULT_STAN_DIALOGUE_TEXT_COLOR,
          bubbleFill: '#f1e7fa',
          bubbleStroke: DEFAULT_STAN_DIALOGUE_TEXT_COLOR,
          bubbleStrokeWidth: 2,
        },
      },
    );
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
    this.engine.video.render(0);
  }

  private resolveStanPoliceAlertAnchorPosition(elapsedMs: number): RoccoPoint {
    const progress = Math.max(
      0,
      Math.min(1, elapsedMs / BAIT_SHOP_TOILET_STAN_ALERT_DURATION_MS),
    );
    const easedProgress = 1 - (1 - progress) * (1 - progress);
    const baseX =
      BAIT_SHOP_TOILET_STAN_ALERT_START_X +
      (BAIT_SHOP_TOILET_STAN_ALERT_END_X - BAIT_SHOP_TOILET_STAN_ALERT_START_X) *
        easedProgress;
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

  private setToiletVisibleDescription(text: string): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.sprites.setVisibleDescription(BAIT_SHOP_TOILET_SPRITE_INSTANCE_ID, {
      enabled: true,
      text,
    });
  }
}
