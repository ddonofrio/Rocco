import type { RoccoSceneClickAction } from '../../../../../../console/cartridges';
import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type {
  RoccoActionMenuActivation,
  RoccoActionMenuDefinition,
} from '../../../../../../console/video/action-menu';
import type { RoccoGridMenuCarriedItem } from '../../../../../../console/video/grid-menu';
import type { RoccoGraphicPlane, RoccoPlaneScene } from '../../../../../../console/video/planes';
import type {
  RoccoFacingDirection,
  RoccoSpriteDefinition,
} from '../../../../../../console/video/sprites';
import {
  ROCCO_INVENTORY_KEYS_ITEM_ID,
  ROCCO_INVENTORY_MYSTERIOUS_KEY_ITEM_ID,
} from '../../inventory';
import { roccoCartridgeMessageRuntime } from '../../../../rpce/dialogue';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import { ROCCO_ACTION_MENU_ASSETS } from '../../ui';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import { ROCCO_PLAYER_CONFIG } from '../../player';
import { ROCCO_DESIGN_WIDTH, ROCCO_DESIGN_HEIGHT } from '../../game-design';
import {
  installRoccoPlayerSprite,
  uninstallRoccoPlayerSprite,
  type RoccoPlayerSpriteController,
} from '../../player';
import { RoccoScriptedSceneInteractionController } from '../../../../scripted-scene-interaction-controller';
import { resolveKeyLockedDoorLines } from '../../../../levels/key-locked-door-lines';
import {
  findRoccoLevelConnector,
  type RoccoLevel,
  type RoccoLevelConnector,
  type RoccoLevelMountOptions,
} from '../../../../levels/rocco-level-types';
import {
  baitShopSecondScreenAssetUrls,
  baitShopSecondScreenToiletDoorOpenAssetUrl,
  baitShopDoorClosingSoundUrl,
} from './bait-shop-assets';
import {
  installBaitShopWalkMap,
  loadOrCreateBaitShopScene,
  uninstallBaitShopWalkMap,
  type RoccoBaitShopSceneDefinition,
} from './bait-shop-level';
import { ROCCO_INVENTORY_MICROMANIA_CLOSED_ASSET_URL } from '../../../../inventory/rocco-inventory-assets';
import { pierDoorOpeningSoundUrl } from '../pier/pier-bait-shop-door-assets';
import { BAIT_SHOP_DOOR_OPENING_SOUND_ID } from '../../../../levels/pier/pier-bait-shop-door';

export const ROCCO_BAIT_SHOP_SECOND_LEVEL_ID = 'bait-shop-second';
export const BAIT_SHOP_SECOND_SCENE_ID = 'rocco-bait-shop-second-scene';

export interface RoccoBaitShopSecondLevelOptions {
  hasMagazine?: () => boolean;
  hasMysteriousKey?: () => boolean;
  onMagazineCollected?: (isKnown: boolean) => boolean;
}

const BAIT_SHOP_RETURN_CONNECTOR_ID = 'south';
const BAIT_SHOP_TOILET_CONNECTOR_ID = 'toilet-door';
const BAIT_SHOP_SECOND_RETURN_EXIT_TRIGGER_HEIGHT = 30;
const BAIT_SHOP_SECOND_ENTRY_POSITION = {
  x: 665,
  y: 220,
} as const;
const BAIT_SHOP_TOILET_DOOR_TARGET_INSTANCE_ID = 'rocco-bait-shop-second-toilet-door-target';
const BAIT_SHOP_TOILET_DOOR_ACTION_MENU_ID = 'rocco-bait-shop-second-toilet-door-action-menu';
const BAIT_SHOP_TOILET_DOOR_OPEN_PLANE_ID = 'rocco-bait-shop-second-toilet-door-open';
const BAIT_SHOP_TOILET_DOOR_LOOK_HISTORY_KEY = 'bait-shop-second-toilet-door-look';
const BAIT_SHOP_TOILET_DOOR_OPEN_HISTORY_KEY = 'bait-shop-second-toilet-door-open';
const BAIT_SHOP_TOILET_DOOR_WRONG_KEY_HISTORY_KEY = 'bait-shop-second-toilet-door-wrong-key';
const BAIT_SHOP_MAGAZINE_SPRITE_DEFINITION_ID = 'rocco-bait-shop-second-magazine';
const BAIT_SHOP_MAGAZINE_SPRITE_INSTANCE_ID = 'rocco-bait-shop-second-magazine-instance';
const BAIT_SHOP_MAGAZINE_ACTION_MENU_ID = 'rocco-bait-shop-second-magazine-action-menu';
const BAIT_SHOP_MAGAZINE_IMAGE_ID = 'rocco-bait-shop-second-magazine-image';
const BAIT_SHOP_MAGAZINE_FRAME_ID = 'rocco-bait-shop-second-magazine-frame';
const BAIT_SHOP_MAGAZINE_WIDTH = 324;
const BAIT_SHOP_MAGAZINE_HEIGHT = 192;
const BAIT_SHOP_MAGAZINE_TARGET_X = 393;
const BAIT_SHOP_MAGAZINE_TARGET_Y = 226;
const BAIT_SHOP_MAGAZINE_TARGET_HEIGHT = 25;
const BAIT_SHOP_MAGAZINE_TARGET_WIDTH =
  (BAIT_SHOP_MAGAZINE_WIDTH * BAIT_SHOP_MAGAZINE_TARGET_HEIGHT) / BAIT_SHOP_MAGAZINE_HEIGHT;
const BAIT_SHOP_MAGAZINE_SCALE_X = BAIT_SHOP_MAGAZINE_TARGET_WIDTH / BAIT_SHOP_MAGAZINE_WIDTH;
const BAIT_SHOP_MAGAZINE_SCALE_Y = BAIT_SHOP_MAGAZINE_TARGET_HEIGHT / BAIT_SHOP_MAGAZINE_HEIGHT;
const BAIT_SHOP_ROCCO_SCALE = ROCCO_PLAYER_CONFIG.motion.scale * 1.2;
const BAIT_SHOP_ROCCO_TINT = '#cccccc';
const BAIT_SHOP_PERSPECTIVE_AUTO_ADJUST = {
  farY: 280,
  nearY: 530,
  farScale: 0.8,
  nearScale: 1,
} as const;
const BAIT_SHOP_TOILET_DOOR_GROUND_POINT = {
  x: 630,
  y: 334,
} as const;
const BAIT_SHOP_TOILET_RETURN_ENTRY_POSITION = {
  x: Math.round(
    BAIT_SHOP_TOILET_DOOR_GROUND_POINT.x -
      ROCCO_PLAYER_CONFIG.frame.groundAnchor.x * BAIT_SHOP_ROCCO_SCALE,
  ),
  y: Math.round(
    BAIT_SHOP_TOILET_DOOR_GROUND_POINT.y -
      ROCCO_PLAYER_CONFIG.frame.groundAnchor.y * BAIT_SHOP_ROCCO_SCALE,
  ),
} as const;
const BAIT_SHOP_LOOK_MESSAGE_TTL_MS = 10_400;
const BAIT_SHOP_ACTION_MENU_ITEM_SIZE = 92;
const BAIT_SHOP_ACTION_MENU_ORBIT_RADIUS = 88;
const BAIT_SHOP_ACTION_MENU_ORBIT_SPEED = 0.08;
const BAIT_SHOP_TOILET_DOOR_SOUND_VOLUME = 0.42;
const DOOR_CLOSING_SOUND_ID = 'rocco-bait-shop-door-closing-sound';
const DOOR_CLOSING_SOUND_VOLUME = 0.21;

const BAIT_SHOP_SECOND_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: BAIT_SHOP_RETURN_CONNECTOR_ID,
    exitArea: {
      x: 0,
      y: ROCCO_DESIGN_HEIGHT - BAIT_SHOP_SECOND_RETURN_EXIT_TRIGGER_HEIGHT,
      width: ROCCO_DESIGN_WIDTH,
      height: BAIT_SHOP_SECOND_RETURN_EXIT_TRIGGER_HEIGHT,
    },
    entryPoint: {
      ...BAIT_SHOP_SECOND_ENTRY_POSITION,
    },
    entryFacing: 'up',
    preservePlayerPosition: true,
  },
  {
    id: BAIT_SHOP_TOILET_CONNECTOR_ID,
    entryPoint: {
      ...BAIT_SHOP_TOILET_RETURN_ENTRY_POSITION,
    },
    entryFacing: 'down',
  },
];

const BAIT_SHOP_SECOND_TOILET_DOOR_OPEN_PLANE: RoccoGraphicPlane = {
  id: BAIT_SHOP_TOILET_DOOR_OPEN_PLANE_ID,
  name: 'Bait Shop Second Toilet Door Open',
  enabled: true,
  source: {
    kind: 'image',
    uri: baitShopSecondScreenToiletDoorOpenAssetUrl,
    width: 110,
    height: 232,
  },
  colorModel: { kind: 'native' },
  transform: {
    x: 586,
    y: 82,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
  },
  scroll: { x: 0, y: 0 },
  wrap: { x: false, y: false },
  viewport: {
    x: 0,
    y: 0,
    width: ROCCO_DESIGN_WIDTH,
    height: ROCCO_DESIGN_HEIGHT,
  },
  opacity: 1,
  priority: 1,
  renderLayer: 'background.main',
  visible: false,
};

const BAIT_SHOP_SECOND_SCENE_DEFINITION: RoccoBaitShopSceneDefinition = {
  sceneId: BAIT_SHOP_SECOND_SCENE_ID,
  planeIds: {
    backplate: 'rocco-bait-shop-second-backplate',
    background: 'rocco-bait-shop-second-background',
  },
  backgroundUri: baitShopSecondScreenAssetUrls.background,
  backgroundName: 'Bait Shop Second Background',
  extraPlanes: [BAIT_SHOP_SECOND_TOILET_DOOR_OPEN_PLANE],
};

function makeBaitShopSecondActionMenuBase(
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

function createBaitShopMagazineSpriteDefinition(
  localization: RoccoLocalization,
): RoccoSpriteDefinition {
  return {
    id: BAIT_SHOP_MAGAZINE_SPRITE_DEFINITION_ID,
    name: 'Bait Shop Second Magazine',
    images: [
      {
        id: BAIT_SHOP_MAGAZINE_IMAGE_ID,
        uri: ROCCO_INVENTORY_MICROMANIA_CLOSED_ASSET_URL,
        width: BAIT_SHOP_MAGAZINE_WIDTH,
        height: BAIT_SHOP_MAGAZINE_HEIGHT,
      },
    ],
    frames: [
      {
        id: BAIT_SHOP_MAGAZINE_FRAME_ID,
        imageId: BAIT_SHOP_MAGAZINE_IMAGE_ID,
        durationMs: 1000,
        pivot: {
          x: 0,
          y: 0,
        },
        hitbox: {
          kind: 'rect',
          x: 0,
          y: 0,
          width: BAIT_SHOP_MAGAZINE_WIDTH,
          height: BAIT_SHOP_MAGAZINE_HEIGHT,
        },
      },
    ],
    animations: {
      idle: {
        id: 'idle',
        loop: false,
        playbackRate: 1,
        frames: [{ frameId: BAIT_SHOP_MAGAZINE_FRAME_ID, durationMs: 1000 }],
      },
    },
    defaultAnimation: 'idle',
    render: {
      renderLayer: 'world.behind',
      zIndex: 12,
      depthMode: 'fixed',
      opacity: 1,
    },
    visibleDescription: {
      enabled: true,
      text: localization.text.descriptions.magazine,
    },
    metadata: {
      purpose: 'bait-shop-second-magazine',
    },
  };
}

export class RoccoBaitShopSecondLevel implements RoccoLevel {
  private readonly localization: RoccoLocalization;
  private readonly options: RoccoBaitShopSecondLevelOptions;
  private engine: CartridgeSdkV1Runtime | undefined = undefined;
  private spriteController: RoccoPlayerSpriteController | undefined = undefined;
  private scriptedInteractionController: RoccoScriptedSceneInteractionController | undefined =
    undefined;
  private onConnectorTransitionRequested: ((connectorId: string) => boolean) | undefined =
    undefined;
  private toiletDoorOpen = false;
  private toiletDoorKnown = false;
  private magazineKnown = false;
  private magazineCollected = false;
  private shouldPlayDoorClosingSound = false;
  readonly id = ROCCO_BAIT_SHOP_SECOND_LEVEL_ID;
  readonly title: string;
  readonly connectors = BAIT_SHOP_SECOND_CONNECTORS;

  constructor(
    localization: RoccoLocalization = createRoccoLocalization(),
    options: RoccoBaitShopSecondLevelOptions = {},
  ) {
    this.localization = localization;
    this.options = options;
    this.title = localization.text.levels.baitShopPlaceholderTitle;
  }

  private syncSecondLevelPresentation(): void {
    this.syncToiletDoorPresentation();
    this.syncMagazinePresentation();
  }

  private handleMagazineAction(activation: RoccoActionMenuActivation): void {
    if (activation.actionId === 'look') {
      this.magazineKnown = true;
      if (this.engine) {
        this.engine.video.sprites.setVisibleDescription(BAIT_SHOP_MAGAZINE_SPRITE_INSTANCE_ID, {
          enabled: true,
          text: this.localization.text.descriptions.micromania,
        });
      }
      this.showThoughtLine(this.localization.text.baitShop.magazineLookLine);
      return;
    }

    if (activation.actionId !== 'grab' || this.magazineCollected) {
      return;
    }

    const isCollected = this.options.onMagazineCollected?.(this.magazineKnown) ?? true;
    if (!isCollected) {
      return;
    }

    this.magazineCollected = true;
    this.syncMagazinePresentation();
  }

  private unlockToiletDoorWithKey(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.gridMenus.clearCarriedItem();
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.actionMenus.closeMenu();
    this.faceToiletDoorFromCurrentPosition();
    this.toiletDoorOpen = true;
    this.toiletDoorKnown = true;
    this.engine.audio.playSound(BAIT_SHOP_DOOR_OPENING_SOUND_ID, {
      restart: true,
      volume: BAIT_SHOP_TOILET_DOOR_SOUND_VOLUME,
    });
    this.syncToiletDoorPresentation();
  }

  private closeToiletDoor(): void {
    this.toiletDoorOpen = false;
    this.toiletDoorKnown = true;
    this.syncToiletDoorPresentation();
  }

  private tryOpenToiletDoorByHand(): void {
    this.toiletDoorKnown = true;
    this.syncToiletDoorPresentation();
    this.faceToiletDoorFromCurrentPosition();
    this.showThoughtLines(
      resolveKeyLockedDoorLines({
        hasMatchingKey: this.hasToiletDoorKey(),
        withKeyLines: this.localization.text.baitShop.toiletDoorOpenWithKeyLines,
        withoutKeyLines: this.localization.text.baitShop.toiletDoorNeedsKeyLines,
      }),
      `${BAIT_SHOP_TOILET_DOOR_OPEN_HISTORY_KEY}:${this.hasToiletDoorKey() ? 'has-key' : 'no-key'}`,
    );
  }

  private rejectWrongToiletDoorKey(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.gridMenus.clearCarriedItem();
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.actionMenus.closeMenu();
    this.toiletDoorKnown = true;
    this.syncToiletDoorPresentation();
    this.faceToiletDoorFromCurrentPosition();
    this.showThoughtLines(
      this.localization.text.baitShop.toiletDoorWrongKeyLines,
      BAIT_SHOP_TOILET_DOOR_WRONG_KEY_HISTORY_KEY,
    );
  }

  private walkIntoToilet(): void {
    if (!this.scriptedInteractionController) {
      return;
    }

    this.scriptedInteractionController.run({
      targetInstanceId: BAIT_SHOP_TOILET_DOOR_TARGET_INSTANCE_ID,
      moveTo: { ...BAIT_SHOP_TOILET_DOOR_GROUND_POINT },
      facing: 'up',
      onReached: () => {
        const isTransitioned =
          this.onConnectorTransitionRequested?.(BAIT_SHOP_TOILET_CONNECTOR_ID) ?? false;
        if (!isTransitioned) {
          return;
        }
      },
    });
  }

  private syncToiletDoorPresentation(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.actionMenus.closeMenu();
    this.engine.video.planes.updatePlane(
      BAIT_SHOP_SECOND_SCENE_ID,
      BAIT_SHOP_TOILET_DOOR_OPEN_PLANE_ID,
      {
        visible: this.toiletDoorOpen,
      },
    );
    this.engine.video.sceneTargets?.unregisterTarget(BAIT_SHOP_TOILET_DOOR_TARGET_INSTANCE_ID);
    this.engine.video.sceneTargets?.registerTarget({
      instanceId: BAIT_SHOP_TOILET_DOOR_TARGET_INSTANCE_ID,
      definitionId: 'rocco-bait-shop-second-toilet-door',
      shape: {
        kind: 'rect',
        x: 586,
        y: 82,
        width: 89,
        height: 217,
      },
      priority: 24,
      suppressDefaultPlayerMove: true,
      visibleDescription: {
        enabled: true,
        text: this.toiletDoorKnown
          ? this.localization.text.descriptions.bathroom
          : this.localization.text.descriptions.backRightDoor,
      },
    });
    this.engine.video.actionMenus.unregisterMenu(BAIT_SHOP_TOILET_DOOR_ACTION_MENU_ID);
    if (!this.toiletDoorOpen) {
      this.engine.video.actionMenus.registerMenu(this.createToiletDoorActionMenuDefinition());
    }
  }

  private syncMagazinePresentation(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.actionMenus.unregisterMenu(BAIT_SHOP_MAGAZINE_ACTION_MENU_ID);
    this.engine.video.sprites.removeSprite(BAIT_SHOP_MAGAZINE_SPRITE_INSTANCE_ID);

    if (this.magazineCollected) {
      this.engine.video.actionMenus.closeMenu();
      return;
    }

    this.engine.video.sprites.createSpriteFromDefinition(BAIT_SHOP_MAGAZINE_SPRITE_DEFINITION_ID, {
      id: BAIT_SHOP_MAGAZINE_SPRITE_INSTANCE_ID,
      transform: {
        x: BAIT_SHOP_MAGAZINE_TARGET_X,
        y: BAIT_SHOP_MAGAZINE_TARGET_Y,
        scaleX: BAIT_SHOP_MAGAZINE_SCALE_X,
        scaleY: BAIT_SHOP_MAGAZINE_SCALE_Y,
        rotation: 0,
      },
      renderLayer: 'world.behind',
      zIndex: 12,
      depthMode: 'fixed',
      interactive: true,
      collisionEnabled: false,
      tint: BAIT_SHOP_ROCCO_TINT,
      visibleDescription: {
        enabled: true,
        text: this.magazineKnown
          ? this.localization.text.descriptions.micromania
          : this.localization.text.descriptions.magazine,
      },
    });
    this.engine.video.actionMenus.registerMenu(this.createMagazineActionMenuDefinition());
  }

  private uninstallToiletDoorInteractions(engine: CartridgeSdkV1Runtime): void {
    engine.video.actionMenus.unregisterMenu(BAIT_SHOP_TOILET_DOOR_ACTION_MENU_ID);
    engine.video.sceneTargets?.unregisterTarget(BAIT_SHOP_TOILET_DOOR_TARGET_INSTANCE_ID);
  }

  private async registerToiletDoorSound(engine: CartridgeSdkV1Runtime): Promise<void> {
    engine.audio.registerSound({
      id: BAIT_SHOP_DOOR_OPENING_SOUND_ID,
      uri: pierDoorOpeningSoundUrl,
      volume: BAIT_SHOP_TOILET_DOOR_SOUND_VOLUME,
      loop: false,
    });
    try {
      await engine.audio.preloadSound(BAIT_SHOP_DOOR_OPENING_SOUND_ID);
    } catch {
      engine.log('Audio', 'Bait shop toilet door opening sound could not be preloaded.');
    }
  }

  private unregisterToiletDoorSound(engine: CartridgeSdkV1Runtime): void {
    engine.audio.stopSound(BAIT_SHOP_DOOR_OPENING_SOUND_ID);
    engine.audio.unregisterSound(BAIT_SHOP_DOOR_OPENING_SOUND_ID);
  }

  private uninstallMagazineInteractions(engine: CartridgeSdkV1Runtime): void {
    engine.video.actionMenus.unregisterMenu(BAIT_SHOP_MAGAZINE_ACTION_MENU_ID);
    engine.video.sprites.removeSprite(BAIT_SHOP_MAGAZINE_SPRITE_INSTANCE_ID);
  }

  private createToiletDoorActionMenuDefinition(): RoccoActionMenuDefinition {
    if (this.toiletDoorOpen) {
      return {
        ...makeBaitShopSecondActionMenuBase(
          BAIT_SHOP_TOILET_DOOR_ACTION_MENU_ID,
          BAIT_SHOP_TOILET_DOOR_TARGET_INSTANCE_ID,
        ),
        items: [
          {
            id: 'close',
            actionId: 'close',
            label: this.localization.text.baitShop.toiletDoorCloseLabel,
            imageUri: ROCCO_ACTION_MENU_ASSETS.grab,
          },
          {
            id: 'walk',
            actionId: 'walk',
            label: this.localization.text.baitShop.toiletDoorWalkLabel,
            imageUri: ROCCO_ACTION_MENU_ASSETS.kick,
          },
        ],
      };
    }

    return {
      ...makeBaitShopSecondActionMenuBase(
        BAIT_SHOP_TOILET_DOOR_ACTION_MENU_ID,
        BAIT_SHOP_TOILET_DOOR_TARGET_INSTANCE_ID,
      ),
      items: [
        {
          id: 'look',
          actionId: 'look',
          label: this.localization.text.actions.look,
          imageUri: ROCCO_ACTION_MENU_ASSETS.look,
        },
        {
          id: 'open',
          actionId: 'open',
          label: this.localization.text.baitShop.toiletDoorOpenLabel,
          imageUri: ROCCO_ACTION_MENU_ASSETS.grab,
        },
        {
          id: 'kick',
          actionId: 'kick',
          label: this.localization.text.actions.kick,
          imageUri: ROCCO_ACTION_MENU_ASSETS.kick,
        },
      ],
    };
  }

  private createMagazineActionMenuDefinition(): RoccoActionMenuDefinition {
    return {
      ...makeBaitShopSecondActionMenuBase(
        BAIT_SHOP_MAGAZINE_ACTION_MENU_ID,
        BAIT_SHOP_MAGAZINE_SPRITE_INSTANCE_ID,
      ),
      items: [
        {
          id: 'look',
          actionId: 'look',
          label: this.localization.text.actions.look,
          imageUri: ROCCO_ACTION_MENU_ASSETS.look,
        },
        {
          id: 'grab',
          actionId: 'grab',
          label: this.localization.text.actions.grab,
          imageUri: ROCCO_ACTION_MENU_ASSETS.grab,
        },
      ],
    };
  }

  private showToiletDoorLookLines(): void {
    this.showThoughtLines(
      resolveKeyLockedDoorLines({
        hasMatchingKey: this.hasToiletDoorKey(),
        withKeyLines: this.localization.text.baitShop.toiletDoorLookWithKeyLines,
        withoutKeyLines: this.localization.text.baitShop.toiletDoorNeedsKeyLines,
      }),
      `${BAIT_SHOP_TOILET_DOOR_LOOK_HISTORY_KEY}:${this.hasToiletDoorKey() ? 'has-key' : 'no-key'}`,
    );
  }

  private showThoughtLine(line: string): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.messages.think(ROCCO_PLAYER_CONFIG.ids.instance, line, {
      ttlMs: BAIT_SHOP_LOOK_MESSAGE_TTL_MS,
    });
  }

  private showThoughtLines(lines: readonly string[], historyKey: string): void {
    if (!this.engine) {
      return;
    }

    roccoCartridgeMessageRuntime.think(
      this.engine,
      ROCCO_PLAYER_CONFIG.ids.instance,
      [...lines],
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

  private hasToiletDoorKey(): boolean {
    return this.options.hasMysteriousKey?.() ?? false;
  }

  private faceToiletDoorFromCurrentPosition(): void {
    if (!this.engine) {
      return;
    }

    const sprite = this.engine.video.sprites.getSprite(ROCCO_PLAYER_CONFIG.ids.instance);
    if (!sprite) {
      return;
    }

    const groundX =
      sprite.transform.x +
      ROCCO_PLAYER_CONFIG.frame.groundAnchor.x * (sprite.transform.scaleX || 1);
    const deltaX = BAIT_SHOP_TOILET_DOOR_GROUND_POINT.x - groundX;
    let facing: RoccoFacingDirection = 'up';
    if (Math.abs(deltaX) > 18) {
      facing = deltaX < 0 ? 'up-left' : 'up-right';
    }
    this.engine.video.sprites.playAction(
      ROCCO_PLAYER_CONFIG.ids.instance,
      ROCCO_PLAYER_CONFIG.ids.idleAction,
      {
        direction: facing,
        restart: true,
      },
    );
  }

  async mount(
    engine: CartridgeSdkV1Runtime,
    options: RoccoLevelMountOptions = {},
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoPlaneScene> {
    this.engine = engine;
    this.spriteController = undefined;
    this.scriptedInteractionController = undefined;
    this.onConnectorTransitionRequested = options.onConnectorTransitionRequested ?? undefined;
    if (options.entryConnectorId === BAIT_SHOP_TOILET_CONNECTOR_ID) {
      this.toiletDoorOpen = false;
      this.toiletDoorKnown = true;
    }
    if (this.options.hasMagazine?.()) {
      this.magazineCollected = true;
    }

    const entryConnector = findRoccoLevelConnector(this.connectors, options.entryConnectorId);
    const initialPosition = entryConnector
      ? {
          x: options.entryPosition?.x ?? entryConnector.entryPoint.x,
          y: entryConnector.entryPoint.y,
        }
      : { ...BAIT_SHOP_SECOND_ENTRY_POSITION };
    const initialFacing = entryConnector?.entryFacing ?? 'up';
    const scene = await loadOrCreateBaitShopScene(engine, BAIT_SHOP_SECOND_SCENE_DEFINITION);
    const magazineDefinition = createBaitShopMagazineSpriteDefinition(this.localization);
    await this.registerToiletDoorSound(engine);
    engine.audio.registerSound({
      id: DOOR_CLOSING_SOUND_ID,
      uri: baitShopDoorClosingSoundUrl,
      volume: DOOR_CLOSING_SOUND_VOLUME,
      loop: false,
    });
    try {
      await engine.audio.preloadSound(DOOR_CLOSING_SOUND_ID);
    } catch {
      engine.log('Audio', 'Bait shop second level door closing sound could not be preloaded.');
    }
    await (preloader?.preloadPlaneScene(engine, scene) ?? engine.video.preloadPlaneScene(scene));
    await (preloader?.preloadSpriteDefinition(engine, magazineDefinition) ??
      engine.video.preloadSpriteDefinition(magazineDefinition));
    engine.loadPlaneScene(scene);
    await installBaitShopWalkMap(engine, baitShopSecondScreenAssetUrls.walkMap, preloader);
    engine.video.sprites.loadSpriteDefinition(magazineDefinition);
    this.spriteController = await installRoccoPlayerSprite(
      engine,
      {
        appearance: options.roccoAppearance,
        initialFacing,
        initialPosition: { ...initialPosition },
        scale: BAIT_SHOP_ROCCO_SCALE,
        tint: BAIT_SHOP_ROCCO_TINT,
        localization: this.localization,
        playIntro: false,
        perspectiveAutoAdjust: BAIT_SHOP_PERSPECTIVE_AUTO_ADJUST,
      },
      preloader,
    );
    if (options.entryConnectorId === BAIT_SHOP_TOILET_CONNECTOR_ID) {
      this.shouldPlayDoorClosingSound = true;
    }
    this.scriptedInteractionController = new RoccoScriptedSceneInteractionController(engine, []);
    this.syncSecondLevelPresentation();

    return scene;
  }

  unmount(engine: CartridgeSdkV1Runtime): void {
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    this.scriptedInteractionController?.cancel();
    this.uninstallToiletDoorInteractions(engine);
    this.uninstallMagazineInteractions(engine);
    this.unregisterToiletDoorSound(engine);
    engine.audio.stopSound(DOOR_CLOSING_SOUND_ID);
    engine.audio.unregisterSound(DOOR_CLOSING_SOUND_ID);
    this.shouldPlayDoorClosingSound = false;
    uninstallRoccoPlayerSprite(engine);
    uninstallBaitShopWalkMap(engine);
    this.engine = undefined;
    this.spriteController = undefined;
    this.scriptedInteractionController = undefined;
    this.onConnectorTransitionRequested = undefined;
  }

  update(deltaMs: number): void {
    this.spriteController?.update(deltaMs);
    this.scriptedInteractionController?.update();
    if (this.shouldPlayDoorClosingSound && this.engine) {
      this.shouldPlayDoorClosingSound = false;
      this.engine.audio.playSound(DOOR_CLOSING_SOUND_ID, {
        restart: true,
        volume: DOOR_CLOSING_SOUND_VOLUME,
      });
    }
  }

  handleSceneClick(activation: RoccoSceneClickAction) {
    if (
      activation.targetInstanceId !== BAIT_SHOP_TOILET_DOOR_TARGET_INSTANCE_ID ||
      !this.toiletDoorOpen
    ) {
      return;
    }

    this.walkIntoToilet();
    return { suppressDefaultPlayerMove: true };
  }

  handleAction(activation: RoccoActionMenuActivation): void {
    if (activation.targetInstanceId === BAIT_SHOP_MAGAZINE_SPRITE_INSTANCE_ID) {
      this.handleMagazineAction(activation);
      return;
    }

    if (activation.targetInstanceId !== BAIT_SHOP_TOILET_DOOR_TARGET_INSTANCE_ID) {
      return;
    }

    if (activation.actionId === 'look') {
      this.faceToiletDoorFromCurrentPosition();
      this.showToiletDoorLookLines();
      return;
    }

    if (activation.actionId === 'kick') {
      this.faceToiletDoorFromCurrentPosition();
      this.showThoughtLine(this.localization.text.baitShop.toiletDoorKickLine);
      return;
    }

    if (activation.actionId === 'open') {
      this.tryOpenToiletDoorByHand();
      return;
    }

    if (activation.actionId === 'close') {
      this.closeToiletDoor();
      return;
    }

    if (activation.actionId === 'walk' && this.toiletDoorOpen) {
      this.walkIntoToilet();
    }
  }

  handleInventorySceneClick(
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ): boolean {
    if (
      activation.targetInstanceId !== BAIT_SHOP_TOILET_DOOR_TARGET_INSTANCE_ID ||
      this.toiletDoorOpen
    ) {
      return false;
    }

    if (carriedItem.item.id === ROCCO_INVENTORY_MYSTERIOUS_KEY_ITEM_ID) {
      this.unlockToiletDoorWithKey();
      return true;
    }

    if (carriedItem.item.id === ROCCO_INVENTORY_KEYS_ITEM_ID) {
      this.rejectWrongToiletDoorKey();
      return true;
    }

    return false;
  }
}
