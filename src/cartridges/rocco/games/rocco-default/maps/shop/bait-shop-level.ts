/* eslint-disable max-lines */

import type { RoccoEngine } from '../../../../../../console/engine-sdk';
import type { RoccoSceneClickAction } from '../../../../../../console/cartridges';
import type { InputPolicyLease } from '../../../../../../console/input';
import type {
  RoccoActionMenuActivation,
  RoccoActionMenuDefinition,
} from '../../../../../../console/video/action-menu';
import type { RoccoGraphicPlane, RoccoPlaneScene } from '../../../../../../console/video/planes';
/* eslint-disable unicorn/consistent-class-member-order */

import {
  createRoccoSpriteWalkMapFromImageData,
  type RoccoCollisionShape,
  type RoccoFacingDirection,
  type RoccoPoint,
} from '../../../../../../console/video/sprites';
import { BAIT_SHOP_SOUVENIR_TABLE_STORAGE_ID } from '../../inventory';
import { roccoCartridgeMessageRuntime } from '../../../../rpce/dialogue';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import { roccoDefaultActionMenuAssetUrls } from '../../sprites';
import { roccoDefaultCartridgeManifest } from '../../../../rocco-default-manifest';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import {
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_ROCCO_GREEN_BLACK,
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_RUN_ACTION_ID,
  DEFAULT_SPRITE_SCALE,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_WALK_MAP_ALPHA_THRESHOLD,
  DEFAULT_WALK_MAP_ID,
} from '../../constants';
import {
  installDefaultSprite,
  uninstallDefaultSprite,
  type RoccoDefaultSpriteController,
} from '../../sprites';
import {
  RoccoScriptedSceneInteractionController,
  type RoccoScriptedSceneInteractionDefinition,
} from '../../../../scripted-scene-interaction-controller';
import {
  findRoccoLevelConnector,
  type RoccoLevel,
  type RoccoLevelConnector,
  type RoccoLevelMountOptions,
} from '../../../../levels/rocco-level-types';
import { baitShopInteriorAssetUrls, baitShopDoorClosingSoundUrl } from './bait-shop-assets';
import {
  BaitShopBenchJumpController,
  type BaitShopBenchJumpControllerHost,
  type BaitShopBenchJumpDownOptions,
} from './bait-shop-bench-jump-controller';

export const ROCCO_BAIT_SHOP_LEVEL_ID = 'bait-shop';
export const BAIT_SHOP_SCENE_ID = 'rocco-bait-shop-scene';

const BAIT_SHOP_BACKGROUND_IMAGE_URL = baitShopInteriorAssetUrls.background;
const BAIT_SHOP_FOREGROUND_IMAGE_URL = baitShopInteriorAssetUrls.foreground;
const BAIT_SHOP_SOUVENIR_CLOSEUP_IMAGE_URL = baitShopInteriorAssetUrls.souvenirCloseup;
const BAIT_SHOP_WALK_MAP_IMAGE_URL = baitShopInteriorAssetUrls.walkMap;

interface BaitShopSceneTargetSpec {
  instanceId: string;
  definitionId: string;
  descriptionKey: keyof RoccoLocalization['text']['descriptions'];
  shape: RoccoCollisionShape;
  renderPlaneId?: string;
  priority?: number;
  suppressDefaultPlayerMove?: boolean;
}

export interface RoccoBaitShopLevelOptions {
  isStanIdentified?: () => boolean;
  hasMysteriousKey?: () => boolean;
  onMysteriousKeyCollected?: () => boolean;
  onOpenInventoryRequested?: () => void;
  onOpenStorageInventoryRequested?: (
    storageId: string,
    onInventoryClosed: () => void,
  ) => void;
  onCloseStorageInventoryRequested?: (storageId: string) => void;
  onExitShopRequested?: () => void;
}

const BAIT_SHOP_ENTRY_POSITION = {
  x: 665,
  y: 110,
} as const;
const BAIT_SHOP_SHELL_CITY_TARGET_INSTANCE_ID = 'rocco-bait-shop-shell-city-sign-target';
const BAIT_SHOP_BENCH_TARGET_INSTANCE_ID = 'rocco-bait-shop-bench-target';
const BAIT_SHOP_POSTCARD_RACK_TARGET_INSTANCE_ID = 'rocco-bait-shop-postcard-rack-target';
const BAIT_SHOP_SOUVENIR_TABLE_TARGET_INSTANCE_ID = 'rocco-bait-shop-souvenir-table-target';
const BAIT_SHOP_HIDDEN_KEYS_TARGET_INSTANCE_ID = 'rocco-bait-shop-hidden-keys-target';
const BAIT_SHOP_CASH_REGISTER_TARGET_INSTANCE_ID = 'rocco-bait-shop-cash-register-target';
const BAIT_SHOP_WINDOW_TARGET_INSTANCE_ID = 'rocco-bait-shop-window-target';
const BAIT_SHOP_LEFT_BARREL_TARGET_INSTANCE_ID = 'rocco-bait-shop-left-barrel-target';
const BAIT_SHOP_EXIT_DOOR_TARGET_INSTANCE_ID = 'rocco-bait-shop-exit-door-target';
const BAIT_SHOP_EXIT_DOOR_ACTION_MENU_ID = 'rocco-bait-shop-exit-door-action-menu';
const BAIT_SHOP_BENCH_ACTION_MENU_ID = 'rocco-bait-shop-bench-action-menu';
const BAIT_SHOP_POSTCARD_RACK_ACTION_MENU_ID = 'rocco-bait-shop-postcard-rack-action-menu';
const BAIT_SHOP_SOUVENIR_TABLE_ACTION_MENU_ID = 'rocco-bait-shop-souvenir-table-action-menu';
const BAIT_SHOP_CASH_REGISTER_ACTION_MENU_ID = 'rocco-bait-shop-cash-register-action-menu';
const BAIT_SHOP_BENCH_INTERACTION_POINT = {
  x: 267,
  y: 410,
} as const;
const BAIT_SHOP_SOUVENIR_TABLE_INTERACTION_POINT = {
  x: 228,
  y: 365,
} as const;
const BAIT_SHOP_BENCH_KICK_START_POINT = {
  x: 336,
  y: 325,
} as const;
const BAIT_SHOP_BENCH_TOP_POINT = {
  x: 339,
  y: 247,
} as const;
const BAIT_SHOP_CASH_REGISTER_INTERACTION_POINT = {
  x: 410,
  y: 285,
} as const;
const BAIT_SHOP_BENCH_FOCUS_X = 307;
const BAIT_SHOP_POSTCARD_RACK_FOCUS_X = 242;
const BAIT_SHOP_SOUVENIR_TABLE_FOCUS_X = 149;
const BAIT_SHOP_CASH_REGISTER_FOCUS_X = 395;
const BAIT_SHOP_LEFT_WALL_INTERACTION_POINT = {
  x: 300,
  y: 430,
} as const;
const BAIT_SHOP_LOOK_MESSAGE_TTL_MS = 10_400;
const BAIT_SHOP_SHELL_CITY_HISTORY_KEY = 'bait-shop-shell-city-sign';
const BAIT_SHOP_BENCH_LOOK_HISTORY_KEY = 'bait-shop-bench-look';
const BAIT_SHOP_BENCH_GRAB_HISTORY_KEY = 'bait-shop-bench-grab';
const BAIT_SHOP_POSTCARD_RACK_LOOK_HISTORY_KEY = 'bait-shop-postcard-rack-look';
const BAIT_SHOP_POSTCARD_RACK_KICK_HISTORY_KEY = 'bait-shop-postcard-rack-kick';
const BAIT_SHOP_POSTCARD_RACK_GRAB_HISTORY_KEY = 'bait-shop-postcard-rack-grab';
const BAIT_SHOP_SOUVENIR_TABLE_LOOK_HISTORY_KEY = 'bait-shop-souvenir-table-look';
const BAIT_SHOP_SOUVENIR_TABLE_KICK_HISTORY_KEY = 'bait-shop-souvenir-table-kick';
const BAIT_SHOP_CASH_REGISTER_LOOK_HISTORY_KEY = 'bait-shop-cash-register-look';
const BAIT_SHOP_CASH_REGISTER_GRAB_HISTORY_KEY = 'bait-shop-cash-register-grab';
const BAIT_SHOP_CASH_REGISTER_KICK_HISTORY_KEY = 'bait-shop-cash-register-kick';
const BAIT_SHOP_WINDOW_HISTORY_KEY = 'bait-shop-window';
const BAIT_SHOP_LEFT_BARREL_HISTORY_KEY = 'bait-shop-left-barrel';
const BAIT_SHOP_ROCCO_SCALE = DEFAULT_SPRITE_SCALE * 1.2;
const BAIT_SHOP_ROCCO_TINT = '#cccccc';
const BAIT_SHOP_COUNTER_OCCLUSION_THRESHOLD_Y = 338;
const BAIT_SHOP_ACTION_MENU_ITEM_SIZE = 92;
const BAIT_SHOP_ACTION_MENU_ORBIT_RADIUS = 88;
const BAIT_SHOP_ACTION_MENU_ORBIT_SPEED = 0.08;
const BAIT_SHOP_BENCH_DISMOUNT_IDLE_SETTLE_DELAY_MS = 650;
const BAIT_SHOP_PERSPECTIVE_AUTO_ADJUST = {
  farY: 280,
  nearY: 530,
  farScale: 0.8,
  nearScale: 1,
} as const;
const BAIT_SHOP_SOUVENIR_CLOSEUP_PLANE_ID = 'rocco-bait-shop-souvenir-closeup';
const BAIT_SHOP_SOUVENIR_CLOSEUP_TARGET_INSTANCE_ID = 'rocco-bait-shop-souvenir-closeup-target';
const BAIT_SHOP_SECOND_SCREEN_ENTRY_Y = 220;
const BAIT_SHOP_SECOND_SCREEN_EXIT_TRIGGER_HEIGHT = 30;
const DOOR_CLOSING_SOUND_ID = 'rocco-bait-shop-door-closing-sound';
const DOOR_CLOSING_SOUND_VOLUME = 0.21;

export interface RoccoBaitShopScenePlaneIds {
  backplate: string;
  background: string;
  foreground?: string;
}

export interface RoccoBaitShopSceneDefinition {
  sceneId: string;
  planeIds: RoccoBaitShopScenePlaneIds;
  backgroundUri: string;
  backgroundName: string;
  foregroundUri?: string;
  foregroundName?: string;
  foregroundDepthMode?: RoccoGraphicPlane['depthMode'];
  extraPlanes?: readonly RoccoGraphicPlane[];
}

const BAIT_SHOP_SECOND_SCREEN_CONNECTOR_ID = 'south';
const BAIT_SHOP_RETURN_ENTRY_POSITION = {
  x: 250,
  y: BAIT_SHOP_SECOND_SCREEN_ENTRY_Y,
} as const;

const BAIT_SHOP_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: BAIT_SHOP_SECOND_SCREEN_CONNECTOR_ID,
    exitArea: {
      x: 0,
      y: DEFAULT_DESIGN_HEIGHT - BAIT_SHOP_SECOND_SCREEN_EXIT_TRIGGER_HEIGHT,
      width: DEFAULT_DESIGN_WIDTH,
      height: BAIT_SHOP_SECOND_SCREEN_EXIT_TRIGGER_HEIGHT,
    },
    entryPoint: {
      ...BAIT_SHOP_RETURN_ENTRY_POSITION,
    },
    entryFacing: 'up',
    preservePlayerPosition: true,
  },
];

const BAIT_SHOP_SOUVENIR_CLOSEUP_PLANE: RoccoGraphicPlane = {
  id: BAIT_SHOP_SOUVENIR_CLOSEUP_PLANE_ID,
  name: 'Bait Shop Souvenir Closeup',
  enabled: true,
  source: {
    kind: 'image',
    uri: BAIT_SHOP_SOUVENIR_CLOSEUP_IMAGE_URL,
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
  opacity: 1,
  priority: 120,
  renderLayer: 'foreground',
  visible: false,
};

const BAIT_SHOP_SCENE_DEFINITION: RoccoBaitShopSceneDefinition = {
  sceneId: BAIT_SHOP_SCENE_ID,
  planeIds: {
    backplate: 'rocco-bait-shop-backplate',
    background: 'rocco-bait-shop-background',
    foreground: 'rocco-bait-shop-foreground',
  },
  backgroundUri: BAIT_SHOP_BACKGROUND_IMAGE_URL,
  backgroundName: 'Bait Shop Background',
  foregroundUri: BAIT_SHOP_FOREGROUND_IMAGE_URL,
  foregroundName: 'Bait Shop Counter Foreground',
  foregroundDepthMode: {
    kind: 'sprite-y-threshold',
    subject: 'active-player',
    samplePoint: 'ground-y',
    thresholdY: BAIT_SHOP_COUNTER_OCCLUSION_THRESHOLD_Y,
    frontLayer: 'world.front',
    backLayer: 'background.main',
    frontWhen: 'less-than-or-equal',
  },
  extraPlanes: [BAIT_SHOP_SOUVENIR_CLOSEUP_PLANE],
};

function rect(x: number, y: number, width: number, height: number): RoccoCollisionShape {
  return {
    kind: 'rect',
    x,
    y,
    width,
    height,
  };
}

function polygon(points: Array<{ x: number; y: number }>): RoccoCollisionShape {
  return {
    kind: 'polygon',
    points,
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

const BAIT_SHOP_SCENE_TARGETS: readonly BaitShopSceneTargetSpec[] = [
  {
    instanceId: BAIT_SHOP_SHELL_CITY_TARGET_INSTANCE_ID,
    definitionId: 'rocco-bait-shop-shell-city-sign',
    descriptionKey: 'shellCitySign',
    shape: polygon([
      { x: 271, y: 69 },
      { x: 390, y: 69 },
      { x: 404, y: 87 },
      { x: 404, y: 144 },
      { x: 381, y: 162 },
      { x: 297, y: 164 },
      { x: 271, y: 145 },
      { x: 269, y: 91 },
    ]),
    priority: 24,
    suppressDefaultPlayerMove: true,
  },
  {
    instanceId: BAIT_SHOP_BENCH_TARGET_INSTANCE_ID,
    definitionId: 'rocco-bait-shop-bench',
    descriptionKey: 'bench',
    shape: polygon([
      { x: 312, y: 236 },
      { x: 363, y: 236 },
      { x: 363, y: 317 },
      { x: 312, y: 317 },
    ]),
    priority: 23,
    suppressDefaultPlayerMove: true,
  },
  {
    instanceId: BAIT_SHOP_POSTCARD_RACK_TARGET_INSTANCE_ID,
    definitionId: 'rocco-bait-shop-postcard-rack',
    descriptionKey: 'postcardRack',
    shape: rect(215, 116, 54, 136),
    priority: 22,
    suppressDefaultPlayerMove: true,
  },
  {
    instanceId: BAIT_SHOP_SOUVENIR_TABLE_TARGET_INSTANCE_ID,
    definitionId: 'rocco-bait-shop-souvenir-table',
    descriptionKey: 'souvenirTable',
    shape: rect(87, 223, 124, 124),
    priority: 21,
    suppressDefaultPlayerMove: true,
  },
  {
    instanceId: BAIT_SHOP_CASH_REGISTER_TARGET_INSTANCE_ID,
    definitionId: 'rocco-bait-shop-cash-register',
    descriptionKey: 'cashRegister',
    shape: rect(351, 164, 88, 86),
    renderPlaneId: 'rocco-bait-shop-foreground',
    priority: 22,
    suppressDefaultPlayerMove: true,
  },
  {
    instanceId: BAIT_SHOP_WINDOW_TARGET_INSTANCE_ID,
    definitionId: 'rocco-bait-shop-window',
    descriptionKey: 'window',
    shape: rect(67, 133, 63, 84),
    priority: 21,
    suppressDefaultPlayerMove: true,
  },
  {
    instanceId: BAIT_SHOP_LEFT_BARREL_TARGET_INSTANCE_ID,
    definitionId: 'rocco-bait-shop-left-barrel',
    descriptionKey: 'barrel',
    shape: rect(0, 332, 77, 88),
    priority: 19,
    suppressDefaultPlayerMove: true,
  },
  {
    instanceId: BAIT_SHOP_EXIT_DOOR_TARGET_INSTANCE_ID,
    definitionId: 'rocco-bait-shop-exit-door',
    descriptionKey: 'shopExitDoorDescription',
    shape: rect(774, 109, 33, 155),
    priority: 20,
    suppressDefaultPlayerMove: true,
  },
];

function makeFullscreenPlaneBase(): Pick<
  RoccoGraphicPlane,
  'colorModel' | 'enabled' | 'opacity' | 'scroll' | 'transform' | 'viewport' | 'visible' | 'wrap'
> {
  return {
    enabled: true,
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
    opacity: 1,
    visible: true,
  };
}

function createDefaultBaitShopPlanes(
  definition: RoccoBaitShopSceneDefinition,
): RoccoGraphicPlane[] {
  const base = makeFullscreenPlaneBase();

  const planes: RoccoGraphicPlane[] = [
    {
      ...base,
      id: definition.planeIds.backplate,
      name: 'Bait Shop Backplate',
      source: {
        kind: 'solid',
        color: DEFAULT_ROCCO_GREEN_BLACK,
      },
      priority: 0,
      renderLayer: 'background.back',
    },
    {
      ...base,
      id: definition.planeIds.background,
      name: definition.backgroundName,
      source: {
        kind: 'image',
        uri: definition.backgroundUri,
        width: DEFAULT_DESIGN_WIDTH,
        height: DEFAULT_DESIGN_HEIGHT,
      },
      priority: 0,
      renderLayer: 'background.main',
    },
  ];

  if (definition.foregroundUri && definition.planeIds.foreground) {
    planes.push({
      ...base,
      id: definition.planeIds.foreground,
      name: definition.foregroundName ?? 'Bait Shop Foreground',
      source: {
        kind: 'image',
        uri: definition.foregroundUri,
        width: DEFAULT_DESIGN_WIDTH,
        height: DEFAULT_DESIGN_HEIGHT,
      },
      depthMode: definition.foregroundDepthMode,
      priority: 0,
      renderLayer: 'world.front',
    });
  }

  if (definition.extraPlanes?.length) {
    planes.push(...definition.extraPlanes.map((plane) => structuredClone(plane)));
  }

  return planes;
}

function createDefaultBaitShopScene(
  definition: RoccoBaitShopSceneDefinition,
): RoccoPlaneScene {
  return {
    id: definition.sceneId,
    planes: createDefaultBaitShopPlanes(definition),
    clearColor: DEFAULT_ROCCO_GREEN_BLACK,
    palettes: [],
    colorRegisterSets: [],
    attributeMaps: [],
  };
}

function hasSameJsonShape(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeBaitShopScene(
  scene: RoccoPlaneScene,
  definition: RoccoBaitShopSceneDefinition,
): { scene: RoccoPlaneScene; changed: boolean } {
  let isChanged = false;
  const defaultPlanes = createDefaultBaitShopPlanes(definition);
  const defaultPlaneIds = new Set(defaultPlanes.map((plane) => plane.id));
  const currentPlanes = new Map(scene.planes.map((plane) => [plane.id, plane]));
  const normalizedDefaultPlanes = defaultPlanes.map((defaultPlane) => {
    const currentPlane = currentPlanes.get(defaultPlane.id);
    if (!currentPlane || !hasSameJsonShape(currentPlane, defaultPlane)) {
      isChanged = true;
      return defaultPlane;
    }

    return currentPlane;
  });
  const customPlanes = scene.planes.filter((plane) => !defaultPlaneIds.has(plane.id));
  const nextPlanes = [...normalizedDefaultPlanes, ...customPlanes];
  if (!hasSameJsonShape(scene.planes, nextPlanes)) {
    isChanged = true;
  }

  const nextScene: RoccoPlaneScene = {
    ...scene,
    id: definition.sceneId,
    planes: nextPlanes,
    clearColor: DEFAULT_ROCCO_GREEN_BLACK,
    palettes: scene.palettes ?? [],
    colorRegisterSets: scene.colorRegisterSets ?? [],
    attributeMaps: scene.attributeMaps ?? [],
  };

  if (!isChanged && hasSameJsonShape(scene, nextScene)) {
    return { scene, changed: false };
  }

  return { scene: nextScene, changed: true };
}

export async function loadOrCreateBaitShopScene(
  engine: RoccoEngine,
  definition: RoccoBaitShopSceneDefinition,
): Promise<RoccoPlaneScene> {
  const restoredRecord = await engine.persistence.loadPlaneSceneRecord(
    roccoDefaultCartridgeManifest.id,
    definition.sceneId,
  );
  if (!restoredRecord) {
    const created = createDefaultBaitShopScene(definition);
    await engine.persistence.savePlaneScene(roccoDefaultCartridgeManifest.id, created);
    engine.log('System', `Bait shop scene '${definition.sceneId}' initialized.`);
    return created;
  }

  engine.log('System', `Bait shop scene '${definition.sceneId}' restored from IndexedDB.`);
  const normalized = normalizeBaitShopScene(restoredRecord.scene, definition);
  if (normalized.changed) {
    await engine.persistence.savePlaneScene(roccoDefaultCartridgeManifest.id, normalized.scene);
    engine.log('System', `Bait shop scene '${definition.sceneId}' refreshed.`);
  }

  return normalized.scene;
}

export async function installBaitShopWalkMap(
  engine: RoccoEngine,
  walkMapImageUrl: string,
  preloader?: RoccoAssetPreloader,
): Promise<void> {
  preloader?.addWalkMap();
  const image = await loadImage(walkMapImageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = DEFAULT_DESIGN_WIDTH;
  canvas.height = DEFAULT_DESIGN_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not read bait shop walk map image.');
  }

  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  engine.video.sprites.registerWalkMap(
    createRoccoSpriteWalkMapFromImageData({
      id: DEFAULT_WALK_MAP_ID,
      width: imageData.width,
      height: imageData.height,
      data: imageData.data,
      alphaThreshold: DEFAULT_WALK_MAP_ALPHA_THRESHOLD,
    }),
  );
}

export function uninstallBaitShopWalkMap(engine: RoccoEngine): void {
  engine.video.sprites.unregisterWalkMap(DEFAULT_WALK_MAP_ID);
}

function installBaitShopSceneTargets(
  engine: RoccoEngine,
  localization: RoccoLocalization,
): void {
  for (const target of BAIT_SHOP_SCENE_TARGETS) {
    engine.video.sceneTargets?.registerTarget({
      instanceId: target.instanceId,
      definitionId: target.definitionId,
      shape: target.shape,
      renderPlaneId: target.renderPlaneId,
      priority: target.priority ?? 0,
      suppressDefaultPlayerMove: target.suppressDefaultPlayerMove,
      visibleDescription: {
        enabled: true,
        text: localization.text.descriptions[target.descriptionKey],
      },
    });
  }
}

function uninstallBaitShopSceneTargets(engine: RoccoEngine): void {
  for (const target of BAIT_SHOP_SCENE_TARGETS) {
    engine.video.sceneTargets?.unregisterTarget(target.instanceId);
  }
  engine.video.sceneTargets?.unregisterTarget(BAIT_SHOP_HIDDEN_KEYS_TARGET_INSTANCE_ID);
  engine.video.sceneTargets?.unregisterTarget(BAIT_SHOP_SOUVENIR_CLOSEUP_TARGET_INSTANCE_ID);
  engine.video.sceneTargets?.unregisterTarget(BAIT_SHOP_EXIT_DOOR_TARGET_INSTANCE_ID);
}

function makeBaitShopActionMenuBase(
  id: string,
  targetInstanceId: string,
): Omit<RoccoActionMenuDefinition, 'items'> {
  return {
    id,
    targetInstanceIds: [targetInstanceId],
    renderLayer: 'ui.action-menu',
    itemSize: BAIT_SHOP_ACTION_MENU_ITEM_SIZE,
    orbitRadius: BAIT_SHOP_ACTION_MENU_ORBIT_RADIUS,
    orbitSpeedRadiansPerSecond: BAIT_SHOP_ACTION_MENU_ORBIT_SPEED,
    hoverScale: 1.16,
    circleFill: '#0f1610',
    circleStroke: '#d7e6c5',
    circleStrokeWidth: 2,
  };
}

function releaseInputLease(inputLease: InputPolicyLease | undefined): InputPolicyLease | undefined {
  inputLease?.dispose();
  return undefined;
}

async function loadImage(uri: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = uri;

  if (typeof image.decode === 'function') {
    await image.decode();
    return image;
  }

  return new Promise((resolve, reject) => {
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => {
      reject(new Error(`Could not load image '${uri}'.`));
    });
  });
}

export class RoccoBaitShopLevel implements RoccoLevel, BaitShopBenchJumpControllerHost {
  private readonly localization: RoccoLocalization;
  private readonly options: RoccoBaitShopLevelOptions;
  private readonly benchJumpController: BaitShopBenchJumpController;
  private benchJumpInputLease: InputPolicyLease | undefined;
  private engine: RoccoEngine | undefined;
  private spriteController: RoccoDefaultSpriteController | undefined;
  private scriptedInteractionController: RoccoScriptedSceneInteractionController | undefined;
  private souvenirCloseupVisible = false;
  private hiddenKeysRevealed = false;
  private hiddenKeysCollected = false;
  readonly id = ROCCO_BAIT_SHOP_LEVEL_ID;
  readonly title: string;
  readonly connectors = BAIT_SHOP_CONNECTORS;

  constructor(
    localization: RoccoLocalization = createRoccoLocalization(),
    options: RoccoBaitShopLevelOptions = {},
  ) {
    this.localization = localization;
    this.options = options;
    this.title = localization.text.levels.baitShopPlaceholderTitle;
    this.benchJumpController = new BaitShopBenchJumpController(this);
  }

  get roccoOnBench(): boolean {
    return this.benchJumpController.isOnBench();
  }

  resolveJumpOrigins(direction: 'up' | 'down'):
    { startOrigin: RoccoPoint; endOrigin: RoccoPoint } | undefined {
    const sprite = this.engine?.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!sprite) {
      return undefined;
    }

    const scaleX = sprite.transform.scaleX || BAIT_SHOP_ROCCO_SCALE;
    const scaleY = sprite.transform.scaleY || BAIT_SHOP_ROCCO_SCALE;
    const startPoint = direction === 'up' ? BAIT_SHOP_BENCH_KICK_START_POINT : BAIT_SHOP_BENCH_TOP_POINT;
    const endPoint = direction === 'up' ? BAIT_SHOP_BENCH_TOP_POINT : BAIT_SHOP_BENCH_KICK_START_POINT;
    return {
      startOrigin: toOriginFromGroundPoint(startPoint, scaleX, scaleY),
      endOrigin: toOriginFromGroundPoint(endPoint, scaleX, scaleY),
    };
  }

  setInputEnabled(isEnabled: boolean): void {
    if (isEnabled) {
      this.benchJumpInputLease = releaseInputLease(this.benchJumpInputLease);
      return;
    }

    this.benchJumpInputLease ??= this.engine?.acquireInputLease('bait-shop-bench-jump', 'blocked');
  }

  setWalkConstraint(isMovementConstrained: boolean): void {
    this.setRoccoWalkConstraint(isMovementConstrained);
  }

  stopPlayerMovement(): void {
    this.engine?.video.sprites.stopMovement(DEFAULT_SPRITE_INSTANCE_ID);
  }

  setPlayerPosition(origin: RoccoPoint): void {
    this.engine?.video.sprites.setPosition(DEFAULT_SPRITE_INSTANCE_ID, origin.x, origin.y, {
      constrainToWalkMap: false,
    });
  }

  playRunAction(direction: RoccoFacingDirection): void {
    this.engine?.video.sprites.playAction(DEFAULT_SPRITE_INSTANCE_ID, DEFAULT_SPRITE_RUN_ACTION_ID, {
      direction,
      restart: true,
      playbackRate: 0,
    });
  }

  playIdleAction(direction: RoccoFacingDirection): void {
    this.engine?.video.sprites.playAction(DEFAULT_SPRITE_INSTANCE_ID, DEFAULT_SPRITE_IDLE_ACTION_ID, {
      direction,
      restart: true,
    });
  }

  render(): void {
    this.engine?.video.render(0);
  }

  onBenchOccupancyChanged(): void {
    this.syncHiddenKeysTarget();
  }

  onJumpUpFinished(): void {
    this.engine?.video.messages.think(DEFAULT_SPRITE_INSTANCE_ID, this.localization.text.baitShop.benchJumpUpLine, {
      ttlMs: BAIT_SHOP_LOOK_MESSAGE_TTL_MS,
    });
  }

  onJumpDownFinished(options: BaitShopBenchJumpDownOptions): void {
    if (!this.engine) {
      return;
    }
    if (options.onComplete) {
      options.onComplete();
      return;
    }
    if (options.walkTo) {
      this.engine.video.sprites.goTo(DEFAULT_SPRITE_INSTANCE_ID, options.walkTo.x, options.walkTo.y, {
        idleSettleDelayMs: BAIT_SHOP_BENCH_DISMOUNT_IDLE_SETTLE_DELAY_MS,
        idleSettleFacing: 'diagonal-from-facing',
      });
    }
  }

  private handleBenchAction(activation: RoccoActionMenuActivation): void {
    if (activation.actionId === 'look') {
      this.faceBaitShopTargetFromCurrentPosition(BAIT_SHOP_BENCH_FOCUS_X);
      this.showBaitShopLines(
        this.resolveBenchLookLines(),
        BAIT_SHOP_BENCH_LOOK_HISTORY_KEY,
      );
      return;
    }

    if (activation.actionId === 'kick') {
      this.runBenchAwareScriptedInteraction({
        targetInstanceId: BAIT_SHOP_BENCH_TARGET_INSTANCE_ID,
        moveTo: { ...BAIT_SHOP_BENCH_KICK_START_POINT },
        constrainToWalkMap: false,
        facing: 'up',
        onReached: () => {
          this.startBenchJumpUpSequence();
        },
      });
      return;
    }

    if (activation.actionId !== 'grab') {
      return;
    }

    this.runBenchAwareScriptedInteraction({
      targetInstanceId: BAIT_SHOP_BENCH_TARGET_INSTANCE_ID,
      moveTo: { ...BAIT_SHOP_BENCH_INTERACTION_POINT },
      facing: 'up-right',
      onReached: () => {
        this.showBaitShopLines(
          this.resolveBenchGrabLines(),
          BAIT_SHOP_BENCH_GRAB_HISTORY_KEY,
        );
      },
    });
  }

  private handlePostcardRackAction(activation: RoccoActionMenuActivation): void {
    this.faceBaitShopTargetFromCurrentPosition(BAIT_SHOP_POSTCARD_RACK_FOCUS_X);

    if (activation.actionId === 'look') {
      this.handlePostcardRackLook();
      return;
    }

    if (activation.actionId === 'kick') {
      this.showBaitShopLines(
        this.localization.text.baitShop.postcardRackKickLines,
        BAIT_SHOP_POSTCARD_RACK_KICK_HISTORY_KEY,
      );
      return;
    }

    if (activation.actionId !== 'grab') {
      return;
    }

    this.showBaitShopLines(
      this.localization.text.baitShop.postcardRackGrabLines,
      BAIT_SHOP_POSTCARD_RACK_GRAB_HISTORY_KEY,
    );
  }

  private handleSouvenirTableAction(activation: RoccoActionMenuActivation): void {
    this.faceBaitShopTargetFromCurrentPosition(BAIT_SHOP_SOUVENIR_TABLE_FOCUS_X);

    if (activation.actionId === 'look') {
      this.showBaitShopLines(
        this.resolveSouvenirTableLookLines(),
        BAIT_SHOP_SOUVENIR_TABLE_LOOK_HISTORY_KEY,
      );
      return;
    }

    if (activation.actionId === 'kick') {
      this.showBaitShopLines(
        this.localization.text.baitShop.souvenirTableKickLines,
        BAIT_SHOP_SOUVENIR_TABLE_KICK_HISTORY_KEY,
      );
      return;
    }

    if (activation.actionId === 'grab') {
      this.runBenchAwareScriptedInteraction({
        targetInstanceId: BAIT_SHOP_SOUVENIR_TABLE_TARGET_INSTANCE_ID,
        moveTo: { ...BAIT_SHOP_SOUVENIR_TABLE_INTERACTION_POINT },
        facing: 'up-left',
        onReached: () => {
          this.openSouvenirCloseup();
        },
      });
    }
  }

  private handleExitDoorAction(activation: RoccoActionMenuActivation): void {
    if (activation.actionId === 'look') {
      this.showBaitShopLines(
        this.localization.text.baitShop.shopExitDoorLookLines,
        'bait-shop-exit-door-look',
      );
      return;
    }

    if (activation.actionId === 'open') {
      this.showSingleBaitShopLine(this.localization.text.baitShop.shopExitDoorOpenLine);
      this.options.onExitShopRequested?.();
    }
  }

  private startBenchJumpUpSequence(): void {
    this.benchJumpController.startJumpUp();
  }

  private startBenchJumpDownSequence(options: BaitShopBenchJumpDownOptions = {}): void {
    this.benchJumpController.startJumpDown(options);
  }

  private setRoccoWalkConstraint(isMovementConstrained: boolean): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.sprites.bindToWalkMap(DEFAULT_SPRITE_INSTANCE_ID, {
      walkMapId: DEFAULT_WALK_MAP_ID,
      groundAnchor: {
        x: DEFAULT_SPRITE_GROUND_ANCHOR_X,
        y: DEFAULT_SPRITE_GROUND_ANCHOR_Y,
      },
      constrainMovement: isMovementConstrained,
      followSurface: true,
    });
  }

  private runBenchAwareScriptedInteraction(
    definition: RoccoScriptedSceneInteractionDefinition,
  ): void {
    if (this.roccoOnBench) {
      this.startBenchJumpDownSequence({
        onComplete: () => {
          this.scriptedInteractionController?.run(definition);
        },
      });
      return;
    }

    this.scriptedInteractionController?.run(definition);
  }

  private resolveShellCityLookLines(): string[] {
    return [
      ...this.localization.text.baitShop.shellCityLookLines,
      this.options.isStanIdentified?.()
        ? this.localization.text.baitShop.shellCityKnownStanLine
        : this.localization.text.baitShop.shellCityUnknownStanLine,
    ];
  }

  private resolveWindowLookLines(): string[] {
    return [
      ...this.localization.text.baitShop.windowLookLines,
      this.options.isStanIdentified?.()
        ? this.localization.text.baitShop.windowKnownStanClosedLine
        : this.localization.text.baitShop.windowUnknownStanClosedLine,
      this.options.isStanIdentified?.()
        ? this.localization.text.baitShop.windowKnownStanCleaningLine
        : this.localization.text.baitShop.windowUnknownStanCleaningLine,
    ];
  }

  private installActionMenus(engine: RoccoEngine): void {
    engine.video.actionMenus.unregisterMenu(BAIT_SHOP_BENCH_ACTION_MENU_ID);
    engine.video.actionMenus.unregisterMenu(BAIT_SHOP_POSTCARD_RACK_ACTION_MENU_ID);
    engine.video.actionMenus.unregisterMenu(BAIT_SHOP_SOUVENIR_TABLE_ACTION_MENU_ID);
    engine.video.actionMenus.unregisterMenu(BAIT_SHOP_CASH_REGISTER_ACTION_MENU_ID);
    engine.video.actionMenus.unregisterMenu(BAIT_SHOP_EXIT_DOOR_ACTION_MENU_ID);
    engine.video.actionMenus.registerMenu(this.createBenchActionMenuDefinition());
    engine.video.actionMenus.registerMenu(this.createPostcardRackActionMenuDefinition());
    engine.video.actionMenus.registerMenu(this.createSouvenirTableActionMenuDefinition());
    engine.video.actionMenus.registerMenu(this.createCashRegisterActionMenuDefinition());
    engine.video.actionMenus.registerMenu(this.createExitDoorActionMenuDefinition());
    engine.video.render(0);
  }

  private uninstallActionMenus(engine: RoccoEngine): void {
    engine.video.actionMenus.unregisterMenu(BAIT_SHOP_BENCH_ACTION_MENU_ID);
    engine.video.actionMenus.unregisterMenu(BAIT_SHOP_POSTCARD_RACK_ACTION_MENU_ID);
    engine.video.actionMenus.unregisterMenu(BAIT_SHOP_SOUVENIR_TABLE_ACTION_MENU_ID);
    engine.video.actionMenus.unregisterMenu(BAIT_SHOP_CASH_REGISTER_ACTION_MENU_ID);
    engine.video.actionMenus.unregisterMenu(BAIT_SHOP_EXIT_DOOR_ACTION_MENU_ID);
    engine.video.render(0);
  }

  private createBenchActionMenuDefinition(): RoccoActionMenuDefinition {
    return {
      ...makeBaitShopActionMenuBase(
        BAIT_SHOP_BENCH_ACTION_MENU_ID,
        BAIT_SHOP_BENCH_TARGET_INSTANCE_ID,
      ),
      items: [
        {
          id: 'kick',
          actionId: 'kick',
          label: this.localization.text.actions.kick,
          imageUri: roccoDefaultActionMenuAssetUrls.kick,
        },
        {
          id: 'grab',
          actionId: 'grab',
          label: this.localization.text.actions.grab,
          imageUri: roccoDefaultActionMenuAssetUrls.grab,
        },
        {
          id: 'look',
          actionId: 'look',
          label: this.localization.text.actions.look,
          imageUri: roccoDefaultActionMenuAssetUrls.look,
        },
      ],
    };
  }

  private createCashRegisterActionMenuDefinition(): RoccoActionMenuDefinition {
    return {
      ...makeBaitShopActionMenuBase(
        BAIT_SHOP_CASH_REGISTER_ACTION_MENU_ID,
        BAIT_SHOP_CASH_REGISTER_TARGET_INSTANCE_ID,
      ),
      items: [
        {
          id: 'kick',
          actionId: 'kick',
          label: this.localization.text.actions.kick,
          imageUri: roccoDefaultActionMenuAssetUrls.kick,
        },
        {
          id: 'grab',
          actionId: 'grab',
          label: this.localization.text.actions.grab,
          imageUri: roccoDefaultActionMenuAssetUrls.grab,
        },
        {
          id: 'look',
          actionId: 'look',
          label: this.localization.text.actions.look,
          imageUri: roccoDefaultActionMenuAssetUrls.look,
        },
      ],
    };
  }

  private createSouvenirTableActionMenuDefinition(): RoccoActionMenuDefinition {
    return {
      ...makeBaitShopActionMenuBase(
        BAIT_SHOP_SOUVENIR_TABLE_ACTION_MENU_ID,
        BAIT_SHOP_SOUVENIR_TABLE_TARGET_INSTANCE_ID,
      ),
      items: [
        {
          id: 'look',
          actionId: 'look',
          label: this.localization.text.actions.look,
          imageUri: roccoDefaultActionMenuAssetUrls.look,
        },
        {
          id: 'grab',
          actionId: 'grab',
          label: this.localization.text.actions.grab,
          imageUri: roccoDefaultActionMenuAssetUrls.grab,
        },
        {
          id: 'kick',
          actionId: 'kick',
          label: this.localization.text.actions.kick,
          imageUri: roccoDefaultActionMenuAssetUrls.kick,
        },
      ],
    };
  }

  private createPostcardRackActionMenuDefinition(): RoccoActionMenuDefinition {
    return {
      ...makeBaitShopActionMenuBase(
        BAIT_SHOP_POSTCARD_RACK_ACTION_MENU_ID,
        BAIT_SHOP_POSTCARD_RACK_TARGET_INSTANCE_ID,
      ),
      items: [
        {
          id: 'look',
          actionId: 'look',
          label: this.localization.text.actions.look,
          imageUri: roccoDefaultActionMenuAssetUrls.look,
        },
        {
          id: 'kick',
          actionId: 'kick',
          label: this.localization.text.actions.kick,
          imageUri: roccoDefaultActionMenuAssetUrls.kick,
        },
        {
          id: 'grab',
          actionId: 'grab',
          label: this.localization.text.actions.grab,
          imageUri: roccoDefaultActionMenuAssetUrls.grab,
        },
      ],
    };
  }

  private createExitDoorActionMenuDefinition(): RoccoActionMenuDefinition {
    return {
      ...makeBaitShopActionMenuBase(
        BAIT_SHOP_EXIT_DOOR_ACTION_MENU_ID,
        BAIT_SHOP_EXIT_DOOR_TARGET_INSTANCE_ID,
      ),
      items: [
        {
          id: 'look',
          actionId: 'look',
          label: this.localization.text.actions.look,
          imageUri: roccoDefaultActionMenuAssetUrls.look,
        },
        {
          id: 'open',
          actionId: 'open',
          label: this.localization.text.baitShop.toiletDoorOpenLabel,
          imageUri: roccoDefaultActionMenuAssetUrls.grab,
        },
      ],
    };
  }

  private showCashRegisterLines(lines: string[], historyKey: string): void {
    this.showBaitShopLines(lines, historyKey);
  }

  private handlePostcardRackLook(): void {
    if (this.roccoOnBench && !this.hiddenKeysCollected) {
      this.revealHiddenKeys();
      this.showSingleBaitShopLine(this.localization.text.baitShop.postcardRackRevealLine);
      return;
    }

    this.showBaitShopLines(
      this.localization.text.baitShop.postcardRackLookLines,
      BAIT_SHOP_POSTCARD_RACK_LOOK_HISTORY_KEY,
    );
  }

  private showBaitShopLines(lines: string[], historyKey: string): void {
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
    this.engine.video.render(0);
  }

  private showSingleBaitShopLine(line: string): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.messages.think(DEFAULT_SPRITE_INSTANCE_ID, line, {
      ttlMs: BAIT_SHOP_LOOK_MESSAGE_TTL_MS,
    });
    this.engine.video.render(0);
  }

  private openSouvenirCloseup(): void {
    if (!this.engine) {
      return;
    }

    this.souvenirCloseupVisible = true;
    this.syncSouvenirCloseupPresentation();
    if (this.options.onOpenStorageInventoryRequested) {
      this.options.onOpenStorageInventoryRequested(
        BAIT_SHOP_SOUVENIR_TABLE_STORAGE_ID,
        () => {
          this.hideSouvenirCloseup();
        },
      );
      return;
    }

    this.options.onOpenInventoryRequested?.();
  }

  private closeSouvenirCloseup(): void {
    if (!this.engine) {
      return;
    }

    this.hideSouvenirCloseup();
    this.options.onCloseStorageInventoryRequested?.(BAIT_SHOP_SOUVENIR_TABLE_STORAGE_ID);
  }

  private hideSouvenirCloseup(): void {
    if (!this.engine) {
      return;
    }

    this.souvenirCloseupVisible = false;
    this.syncSouvenirCloseupPresentation();
  }

  private syncSouvenirCloseupPresentation(): void {
    if (!this.engine) {
      return;
    }

    const overlayPlane = this.engine.video.planes?.resolvePlane?.(
      BAIT_SHOP_SCENE_ID,
      BAIT_SHOP_SOUVENIR_CLOSEUP_PLANE_ID,
    );
    if (overlayPlane) {
      this.engine.video.planes.updatePlane(BAIT_SHOP_SCENE_ID, BAIT_SHOP_SOUVENIR_CLOSEUP_PLANE_ID, {
        visible: this.souvenirCloseupVisible,
      });
    }

    this.engine.video.sceneTargets?.unregisterTarget(BAIT_SHOP_SOUVENIR_CLOSEUP_TARGET_INSTANCE_ID);
    if (this.souvenirCloseupVisible) {
      this.engine.video.sceneTargets?.registerTarget({
        instanceId: BAIT_SHOP_SOUVENIR_CLOSEUP_TARGET_INSTANCE_ID,
        definitionId: 'rocco-bait-shop-souvenir-closeup',
        shape: rect(0, 0, DEFAULT_DESIGN_WIDTH, DEFAULT_DESIGN_HEIGHT),
        priority: 999,
        suppressDefaultPlayerMove: true,
      });
    }

    this.engine.video.render(0);
  }

  private faceBaitShopTargetFromCurrentPosition(focusX: number): void {
    if (!this.engine) {
      return;
    }

    const sprite = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!sprite) {
      return;
    }

    const groundX =
      sprite.transform.x + DEFAULT_SPRITE_GROUND_ANCHOR_X * (sprite.transform.scaleX || 1);
    const groundY =
      sprite.transform.y + DEFAULT_SPRITE_GROUND_ANCHOR_Y * (sprite.transform.scaleY || 1);
    const facing = resolveBaitShopFacing(focusX, groundX, groundY);
    this.engine.video.sprites.playAction(DEFAULT_SPRITE_INSTANCE_ID, DEFAULT_SPRITE_IDLE_ACTION_ID, {
      direction: facing,
      restart: true,
    });
    this.engine.video.render(0);
  }

  private faceCashRegisterFromCurrentPosition(): void {
    this.faceBaitShopTargetFromCurrentPosition(BAIT_SHOP_CASH_REGISTER_FOCUS_X);
  }

  private resolveBenchLookLines(): string[] {
    return [
      ...this.localization.text.baitShop.benchLookLines,
      this.options.isStanIdentified?.()
        ? this.localization.text.baitShop.benchKnownStanWaitLine
        : this.localization.text.baitShop.benchUnknownStanWaitLine,
    ];
  }

  private resolveBenchGrabLines(): string[] {
    return [
      ...this.localization.text.baitShop.benchGrabLines,
      this.options.isStanIdentified?.()
        ? this.localization.text.baitShop.benchKnownStanStealLine
        : this.localization.text.baitShop.benchUnknownStanStealLine,
    ];
  }

  private resolveSouvenirTableLookLines(): string[] {
    return [
      ...this.localization.text.baitShop.souvenirTableLookLines,
      this.options.isStanIdentified?.()
        ? this.localization.text.baitShop.souvenirTableKnownStanLine
        : this.localization.text.baitShop.souvenirTableUnknownStanLine,
    ];
  }

  private resolveCashRegisterLookLines(): string[] {
    return [
      ...this.localization.text.baitShop.cashRegisterLookLines,
      this.options.isStanIdentified?.()
        ? this.localization.text.baitShop.cashRegisterKnownStanOldLine
        : this.localization.text.baitShop.cashRegisterUnknownStanOldLine,
    ];
  }

  private resolveCashRegisterGrabLines(): string[] {
    return [
      ...this.localization.text.baitShop.cashRegisterGrabLines,
      this.options.isStanIdentified?.()
        ? this.localization.text.baitShop.cashRegisterKnownStanPocketLine
        : this.localization.text.baitShop.cashRegisterUnknownStanPocketLine,
    ];
  }

  private resolveCashRegisterKickLines(): string[] {
    return [
      ...this.localization.text.baitShop.cashRegisterKickLines,
      this.options.isStanIdentified?.()
        ? this.localization.text.baitShop.cashRegisterKnownStanWakeLine
        : this.localization.text.baitShop.cashRegisterUnknownStanWakeLine,
    ];
  }

  private revealHiddenKeys(): void {
    if (this.hiddenKeysCollected) {
      return;
    }

    this.hiddenKeysRevealed = true;
    this.syncHiddenKeysTarget();
  }

  private collectHiddenKeys(): void {
    if (!this.engine || !this.roccoOnBench || this.hiddenKeysCollected || !this.hiddenKeysRevealed) {
      return;
    }

    const isCollected = this.options.onMysteriousKeyCollected?.() ?? true;
    if (!isCollected) {
      return;
    }

    this.hiddenKeysCollected = true;
    this.hiddenKeysRevealed = false;
    this.syncHiddenKeysTarget();
    this.showSingleBaitShopLine(this.localization.text.baitShop.hiddenKeysCollectedLine);
  }

  private syncHiddenKeysTarget(): void {
    if (!this.engine) {
      return;
    }

    if (!this.hiddenKeysRevealed || this.hiddenKeysCollected) {
      this.engine.video.sceneTargets?.unregisterTarget(BAIT_SHOP_HIDDEN_KEYS_TARGET_INSTANCE_ID);
      return;
    }

    this.engine.video.sceneTargets?.unregisterTarget(BAIT_SHOP_HIDDEN_KEYS_TARGET_INSTANCE_ID);
    this.engine.video.sceneTargets?.registerTarget({
      instanceId: BAIT_SHOP_HIDDEN_KEYS_TARGET_INSTANCE_ID,
      definitionId: 'rocco-bait-shop-hidden-keys',
      shape: rect(222, 111, 40, 7),
      interactive: this.roccoOnBench,
      priority: 25,
      suppressDefaultPlayerMove: true,
      visibleDescription: {
        enabled: true,
        text: this.localization.text.descriptions.hiddenKeys,
      },
    });
  }

  async mount(
    engine: RoccoEngine,
    options: RoccoLevelMountOptions = {},
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoPlaneScene> {
    this.engine = engine;
    this.spriteController = undefined;
    this.scriptedInteractionController = undefined;
    this.benchJumpInputLease = releaseInputLease(this.benchJumpInputLease);
    this.benchJumpController.reset();
    this.souvenirCloseupVisible = false;
    if (this.options.hasMysteriousKey?.()) {
      this.hiddenKeysCollected = true;
      this.hiddenKeysRevealed = false;
    }

    const entryConnector = findRoccoLevelConnector(this.connectors, options.entryConnectorId);
    const initialPosition = entryConnector
      ? {
          x: options.entryPosition?.x ?? entryConnector.entryPoint.x,
          y: entryConnector.entryPoint.y,
        }
      : { ...BAIT_SHOP_ENTRY_POSITION };
    const initialFacing = entryConnector?.entryFacing ?? 'down-left';
    const scene = await loadOrCreateBaitShopScene(engine, BAIT_SHOP_SCENE_DEFINITION);
    await (preloader?.preloadPlaneScene(engine, scene) ?? engine.video.preloadPlaneScene(scene));
    engine.loadPlaneScene(scene);
    await installBaitShopWalkMap(engine, BAIT_SHOP_WALK_MAP_IMAGE_URL, preloader);
    installBaitShopSceneTargets(engine, this.localization);
    this.syncSouvenirCloseupPresentation();
    this.syncHiddenKeysTarget();
    this.installActionMenus(engine);
    this.spriteController = await installDefaultSprite(engine, {
      appearance: options.roccoAppearance,
      initialFacing,
      initialPosition: { ...initialPosition },
      scale: BAIT_SHOP_ROCCO_SCALE,
      tint: BAIT_SHOP_ROCCO_TINT,
      localization: this.localization,
      playIntro: false,
      perspectiveAutoAdjust: BAIT_SHOP_PERSPECTIVE_AUTO_ADJUST,
    }, preloader);
    if (!options.entryConnectorId) {
      await this.playBaitShopDoorClosingSound(engine);
    }
    this.installBaitShopScriptedInteractions(engine);

    return scene;
  }

  private async playBaitShopDoorClosingSound(engine: RoccoEngine): Promise<void> {
    engine.audio.registerSound({
      id: DOOR_CLOSING_SOUND_ID,
      uri: baitShopDoorClosingSoundUrl,
      volume: DOOR_CLOSING_SOUND_VOLUME,
      loop: false,
    });
    try {
      await engine.audio.preloadSound(DOOR_CLOSING_SOUND_ID);
    } catch {
      engine.log('Audio', 'Bait shop door closing sound could not be preloaded.');
    }
    engine.audio.playSound(DOOR_CLOSING_SOUND_ID, {
      restart: true,
      volume: DOOR_CLOSING_SOUND_VOLUME,
    });
  }

  private installBaitShopScriptedInteractions(engine: RoccoEngine): void {
    this.scriptedInteractionController = new RoccoScriptedSceneInteractionController(engine, [
      this.createShellCityInteraction(engine),
      this.createWindowInteraction(engine),
      this.createLeftBarrelInteraction(engine),
    ]);
  }

  private createShellCityInteraction(engine: RoccoEngine): RoccoScriptedSceneInteractionDefinition {
    return {
      targetInstanceId: BAIT_SHOP_SHELL_CITY_TARGET_INSTANCE_ID,
      moveTo: { ...BAIT_SHOP_LEFT_WALL_INTERACTION_POINT },
      facing: 'up',
      onReached: () => {
        roccoCartridgeMessageRuntime.think(engine, DEFAULT_SPRITE_INSTANCE_ID, this.resolveShellCityLookLines(), {
          ttlMs: BAIT_SHOP_LOOK_MESSAGE_TTL_MS,
        }, { count: 1, historyKey: BAIT_SHOP_SHELL_CITY_HISTORY_KEY });
        engine.video.render(0);
      },
    };
  }

  private createWindowInteraction(engine: RoccoEngine): RoccoScriptedSceneInteractionDefinition {
    return {
      targetInstanceId: BAIT_SHOP_WINDOW_TARGET_INSTANCE_ID,
      moveTo: { ...BAIT_SHOP_LEFT_WALL_INTERACTION_POINT },
      facing: 'up-left',
      onReached: () => {
        roccoCartridgeMessageRuntime.think(engine, DEFAULT_SPRITE_INSTANCE_ID, this.resolveWindowLookLines(), {
          ttlMs: BAIT_SHOP_LOOK_MESSAGE_TTL_MS,
        }, { count: 1, historyKey: BAIT_SHOP_WINDOW_HISTORY_KEY });
        engine.video.render(0);
      },
    };
  }

  private createLeftBarrelInteraction(engine: RoccoEngine): RoccoScriptedSceneInteractionDefinition {
    return {
      targetInstanceId: BAIT_SHOP_LEFT_BARREL_TARGET_INSTANCE_ID,
      moveTo: { ...BAIT_SHOP_LEFT_WALL_INTERACTION_POINT },
      facing: 'down-left',
      onReached: () => {
        roccoCartridgeMessageRuntime.think(
          engine,
          DEFAULT_SPRITE_INSTANCE_ID,
          this.localization.text.baitShop.leftBarrelLookLines,
          { ttlMs: BAIT_SHOP_LOOK_MESSAGE_TTL_MS },
          { count: 1, historyKey: BAIT_SHOP_LEFT_BARREL_HISTORY_KEY },
        );
        engine.video.render(0);
      },
    };
  }

  unmount(engine: RoccoEngine): void {
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    this.scriptedInteractionController?.cancel();
    this.uninstallActionMenus(engine);
    this.souvenirCloseupVisible = false;
    this.syncSouvenirCloseupPresentation();
    uninstallBaitShopSceneTargets(engine);
    uninstallDefaultSprite(engine);
    uninstallBaitShopWalkMap(engine);
    engine.audio.stopSound(DOOR_CLOSING_SOUND_ID);
    engine.audio.unregisterSound(DOOR_CLOSING_SOUND_ID);
    this.engine = undefined;
    this.spriteController = undefined;
    this.scriptedInteractionController = undefined;
    this.benchJumpInputLease = releaseInputLease(this.benchJumpInputLease);
    this.benchJumpController.reset();
    this.souvenirCloseupVisible = false;
    engine.video.render(0);
  }

  update(deltaMs: number): void {
    this.spriteController?.update(deltaMs);
    this.scriptedInteractionController?.update();
    this.benchJumpController.update(deltaMs);
  }

  handleAction(activation: RoccoActionMenuActivation): void {
    if (activation.targetInstanceId === BAIT_SHOP_BENCH_TARGET_INSTANCE_ID) {
      this.handleBenchAction(activation);
      return;
    }

    if (activation.targetInstanceId === BAIT_SHOP_POSTCARD_RACK_TARGET_INSTANCE_ID) {
      this.handlePostcardRackAction(activation);
      return;
    }

    if (activation.targetInstanceId === BAIT_SHOP_SOUVENIR_TABLE_TARGET_INSTANCE_ID) {
      this.handleSouvenirTableAction(activation);
      return;
    }

    if (activation.targetInstanceId !== BAIT_SHOP_CASH_REGISTER_TARGET_INSTANCE_ID) {
      if (activation.targetInstanceId === BAIT_SHOP_EXIT_DOOR_TARGET_INSTANCE_ID) {
        this.handleExitDoorAction(activation);
        return;
      }

      return;
    }

    if (activation.actionId === 'look') {
      this.faceCashRegisterFromCurrentPosition();
      this.showCashRegisterLines(
        this.resolveCashRegisterLookLines(),
        BAIT_SHOP_CASH_REGISTER_LOOK_HISTORY_KEY,
      );
      return;
    }

    if (activation.actionId === 'kick') {
      this.faceCashRegisterFromCurrentPosition();
      this.showCashRegisterLines(
        this.resolveCashRegisterKickLines(),
        BAIT_SHOP_CASH_REGISTER_KICK_HISTORY_KEY,
      );
      return;
    }

    if (activation.actionId !== 'grab') {
      return;
    }

    this.runBenchAwareScriptedInteraction({
      targetInstanceId: BAIT_SHOP_CASH_REGISTER_TARGET_INSTANCE_ID,
      moveTo: { ...BAIT_SHOP_CASH_REGISTER_INTERACTION_POINT },
      facing: 'down-left',
      onReached: () => {
        this.showCashRegisterLines(
          this.resolveCashRegisterGrabLines(),
          BAIT_SHOP_CASH_REGISTER_GRAB_HISTORY_KEY,
        );
      },
    });
  }

  handleSceneClick(activation: RoccoSceneClickAction) {
    if (this.benchJumpController.isActive()) {
      return { suppressDefaultPlayerMove: true };
    }

    if (this.souvenirCloseupVisible) {
      this.closeSouvenirCloseup();
      return { suppressDefaultPlayerMove: true };
    }

    if (activation.targetInstanceId === BAIT_SHOP_HIDDEN_KEYS_TARGET_INSTANCE_ID) {
      this.collectHiddenKeys();
      return { suppressDefaultPlayerMove: true };
    }

    if (this.roccoOnBench && !activation.targetInstanceId) {
      this.startBenchJumpDownSequence({
        walkTo: {
          x: activation.sceneX,
          y: activation.sceneY,
        },
      });
      return { suppressDefaultPlayerMove: true };
    }

    if (
      this.roccoOnBench &&
      activation.targetInstanceId &&
      this.scriptedInteractionController?.hasTarget(activation.targetInstanceId)
    ) {
      this.startBenchJumpDownSequence({
        onComplete: () => {
          this.scriptedInteractionController?.handleSceneClick(activation);
        },
      });
      return { suppressDefaultPlayerMove: true };
    }

    this.scriptedInteractionController?.handleSceneClick(activation);
  }

  handleInventorySceneClick(): boolean {
    if (!this.souvenirCloseupVisible) {
      return false;
    }

    this.closeSouvenirCloseup();
    return true;
  }
}

function resolveBaitShopFacing(
  focusX: number,
  groundX: number,
  groundY: number,
): RoccoFacingDirection {
  const deltaX = focusX - groundX;
  const isBehindCounter = groundY <= BAIT_SHOP_COUNTER_OCCLUSION_THRESHOLD_Y;

  if (Math.abs(deltaX) <= 18) {
    return isBehindCounter ? 'down' : 'up';
  }

  if (deltaX < 0) {
    return isBehindCounter ? 'down-left' : 'up-left';
  }

  return isBehindCounter ? 'down-right' : 'up-right';
}
