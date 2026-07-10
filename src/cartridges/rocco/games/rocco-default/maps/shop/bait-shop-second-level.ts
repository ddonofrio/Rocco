import type { RoccoSceneClickAction } from '../../../../../../console/cartridges';
import type { RoccoEngine } from '../../../../../../console/engine-sdk';
import type {
  RoccoActionMenuActivation,
  RoccoActionMenuDefinition,
} from '../../../../../../console/video/action-menu';
import type { RoccoGridMenuCarriedItem } from '../../../../../../console/video/grid-menu';
import type { RoccoGraphicPlane, RoccoPlaneScene } from '../../../../../../console/video/planes';
import type { RoccoFacingDirection, RoccoSpriteDefinition } from '../../../../../../console/video/sprites';
import {
  ROCCO_INVENTORY_KEYS_ITEM_ID,
  ROCCO_INVENTORY_MYSTERIOUS_KEY_ITEM_ID,
} from '../../inventory';
import { roccoCartridgeMessageRuntime } from '../../../../rpce/dialogue';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import {
  roccoDefaultActionMenuAssetUrls,
  roccoDefaultMicromaniaClosedAssetUrl,
} from '../../sprites';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import {
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_SCALE,
} from '../../constants';
import {
  installDefaultSprite,
  uninstallDefaultSprite,
  type RoccoDefaultSpriteController,
} from '../../sprites';
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
} from './bait-shop-assets';
import {
  installBaitShopWalkMap,
  loadOrCreateBaitShopScene,
  uninstallBaitShopWalkMap,
  type RoccoBaitShopSceneDefinition,
} from './bait-shop-level';
import { pierDoorOpeningSoundUrl } from '../../../../levels/pier/pier-assets';
import { BAIT_SHOP_DOOR_OPENING_SOUND_ID } from '../../../../levels/pier/pier-bait-shop-door';

export const ROCCO_BAIT_SHOP_SECOND_LEVEL_ID = 'bait-shop-second';
export const BAIT_SHOP_SECOND_SCENE_ID = 'rocco-bait-shop-second-scene';

export interface RoccoBaitShopSecondLevelOptions {
  hasMagazine?: () => boolean;
  hasMysteriousKey?: () => boolean;
  onMagazineCollected?: (known: boolean) => boolean;
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
const BAIT_SHOP_ROCCO_SCALE = DEFAULT_SPRITE_SCALE * 1.2;
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
    BAIT_SHOP_TOILET_DOOR_GROUND_POINT.x - DEFAULT_SPRITE_GROUND_ANCHOR_X * BAIT_SHOP_ROCCO_SCALE,
  ),
  y: Math.round(
    BAIT_SHOP_TOILET_DOOR_GROUND_POINT.y - DEFAULT_SPRITE_GROUND_ANCHOR_Y * BAIT_SHOP_ROCCO_SCALE,
  ),
} as const;
const BAIT_SHOP_LOOK_MESSAGE_TTL_MS = 10400;
const BAIT_SHOP_ACTION_MENU_ITEM_SIZE = 92;
const BAIT_SHOP_ACTION_MENU_ORBIT_RADIUS = 88;
const BAIT_SHOP_ACTION_MENU_ORBIT_SPEED = 0.08;
const BAIT_SHOP_TOILET_DOOR_SOUND_VOLUME = 0.42;

const BAIT_SHOP_SECOND_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: BAIT_SHOP_RETURN_CONNECTOR_ID,
    exitArea: {
      x: 0,
      y: DEFAULT_DESIGN_HEIGHT - BAIT_SHOP_SECOND_RETURN_EXIT_TRIGGER_HEIGHT,
      width: DEFAULT_DESIGN_WIDTH,
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
    width: DEFAULT_DESIGN_WIDTH,
    height: DEFAULT_DESIGN_HEIGHT,
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
        uri: roccoDefaultMicromaniaClosedAssetUrl,
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
  readonly id = ROCCO_BAIT_SHOP_SECOND_LEVEL_ID;
  readonly title: string;
  readonly connectors = BAIT_SHOP_SECOND_CONNECTORS;

  private readonly localization: RoccoLocalization;
  private readonly options: RoccoBaitShopSecondLevelOptions;
  private engine: RoccoEngine | null = null;
  private spriteController: RoccoDefaultSpriteController | null = null;
  private scriptedInteractionController: RoccoScriptedSceneInteractionController | null = null;
  private onConnectorTransitionRequested: ((connectorId: string) => boolean) | null = null;
  private toiletDoorOpen = false;
  private toiletDoorKnown = false;
  private magazineKnown = false;
  private magazineCollected = false;

  constructor(
    localization: RoccoLocalization = createRoccoLocalization(),
    options: RoccoBaitShopSecondLevelOptions = {},
  ) {
    this.localization = localization;
    this.options = options;
    this.title = localization.text.levels.baitShopPlaceholderTitle;
  }

  async mount(
    engine: RoccoEngine,
    options: RoccoLevelMountOptions = {},
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoPlaneScene> {
    this.engine = engine;
    this.spriteController = null;
    this.scriptedInteractionController = null;
    this.onConnectorTransitionRequested = options.onConnectorTransitionRequested ?? null;
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
    await (preloader?.preloadPlaneScene(engine, scene) ?? engine.video.preloadPlaneScene(scene));
    await (preloader?.preloadSpriteDefinition(engine, magazineDefinition) ?? engine.video.preloadSpriteDefinition(magazineDefinition));
    engine.loadPlaneScene(scene);
    await installBaitShopWalkMap(engine, baitShopSecondScreenAssetUrls.walkMap, preloader);
    engine.video.sprites.loadSpriteDefinition(magazineDefinition);
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
    this.scriptedInteractionController = new RoccoScriptedSceneInteractionController(engine, []);
    this.syncToiletDoorPresentation();
    this.syncMagazinePresentation();

    return scene;
  }

  unmount(engine: RoccoEngine): void {
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    this.scriptedInteractionController?.cancel();
    this.uninstallToiletDoorInteractions(engine);
    this.uninstallMagazineInteractions(engine);
    this.unregisterToiletDoorSound(engine);
    uninstallDefaultSprite(engine);
    uninstallBaitShopWalkMap(engine);
    this.engine = null;
    this.spriteController = null;
    this.scriptedInteractionController = null;
    this.onConnectorTransitionRequested = null;
    engine.video.render(0);
  }

  update(deltaMs: number): void {
    this.spriteController?.update(deltaMs);
    this.scriptedInteractionController?.update();
  }

  handleSceneClick(activation: RoccoSceneClickAction) {
    if (
      activation.targetInstanceId === BAIT_SHOP_TOILET_DOOR_TARGET_INSTANCE_ID &&
      this.toiletDoorOpen
    ) {
      this.walkIntoToilet();
      return { suppressDefaultPlayerMove: true };
    }
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

    const collected = this.options.onMagazineCollected?.(this.magazineKnown) ?? true;
    if (!collected) {
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
      restoreInputOnComplete: false,
      onReached: () => {
        const transitioned =
          this.onConnectorTransitionRequested?.(BAIT_SHOP_TOILET_CONNECTOR_ID) ?? false;
        if (!transitioned) {
          this.engine?.setInputEnabled(true);
          this.engine?.video.render(0);
        }
      },
    });
  }

  private syncToiletDoorPresentation(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.actionMenus.closeMenu();
    this.engine.video.planes.updatePlane(BAIT_SHOP_SECOND_SCENE_ID, BAIT_SHOP_TOILET_DOOR_OPEN_PLANE_ID, {
      visible: this.toiletDoorOpen,
    });
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
    this.engine.video.render(0);
  }

  private syncMagazinePresentation(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.actionMenus.unregisterMenu(BAIT_SHOP_MAGAZINE_ACTION_MENU_ID);
    this.engine.video.sprites.removeSprite(BAIT_SHOP_MAGAZINE_SPRITE_INSTANCE_ID);

    if (this.magazineCollected) {
      this.engine.video.actionMenus.closeMenu();
      this.engine.video.render(0);
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
    this.engine.video.render(0);
  }

  private uninstallToiletDoorInteractions(engine: RoccoEngine): void {
    engine.video.actionMenus.unregisterMenu(BAIT_SHOP_TOILET_DOOR_ACTION_MENU_ID);
    engine.video.sceneTargets?.unregisterTarget(BAIT_SHOP_TOILET_DOOR_TARGET_INSTANCE_ID);
    engine.video.render(0);
  }

  private async registerToiletDoorSound(engine: RoccoEngine): Promise<void> {
    engine.audio.registerSound({
      id: BAIT_SHOP_DOOR_OPENING_SOUND_ID,
      uri: pierDoorOpeningSoundUrl,
      volume: BAIT_SHOP_TOILET_DOOR_SOUND_VOLUME,
      loop: false,
    });
    await engine.audio.preloadSound(BAIT_SHOP_DOOR_OPENING_SOUND_ID).catch(() => {
      engine.log('Audio', 'Bait shop toilet door opening sound could not be preloaded.');
    });
  }

  private unregisterToiletDoorSound(engine: RoccoEngine): void {
    engine.audio.stopSound(BAIT_SHOP_DOOR_OPENING_SOUND_ID);
    engine.audio.unregisterSound(BAIT_SHOP_DOOR_OPENING_SOUND_ID);
  }

  private uninstallMagazineInteractions(engine: RoccoEngine): void {
    engine.video.actionMenus.unregisterMenu(BAIT_SHOP_MAGAZINE_ACTION_MENU_ID);
    engine.video.sprites.removeSprite(BAIT_SHOP_MAGAZINE_SPRITE_INSTANCE_ID);
    engine.video.render(0);
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
            imageUri: roccoDefaultActionMenuAssetUrls.grab,
          },
          {
            id: 'walk',
            actionId: 'walk',
            label: this.localization.text.baitShop.toiletDoorWalkLabel,
            imageUri: roccoDefaultActionMenuAssetUrls.kick,
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
          imageUri: roccoDefaultActionMenuAssetUrls.look,
        },
        {
          id: 'open',
          actionId: 'open',
          label: this.localization.text.baitShop.toiletDoorOpenLabel,
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
          imageUri: roccoDefaultActionMenuAssetUrls.look,
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

    this.engine.video.messages.think(DEFAULT_SPRITE_INSTANCE_ID, line, {
      ttlMs: BAIT_SHOP_LOOK_MESSAGE_TTL_MS,
    });
    this.engine.video.render(0);
  }

  private showThoughtLines(lines: readonly string[], historyKey: string): void {
    if (!this.engine) {
      return;
    }

    roccoCartridgeMessageRuntime.think(
      this.engine,
      DEFAULT_SPRITE_INSTANCE_ID,
      [...lines],
      {
        ttlMs: BAIT_SHOP_LOOK_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey,
        avoidImmediateRepeat: true,
      },
    );
    this.engine.video.render(0);
  }

  private hasToiletDoorKey(): boolean {
    return this.options.hasMysteriousKey?.() ?? false;
  }

  private faceToiletDoorFromCurrentPosition(): void {
    if (!this.engine) {
      return;
    }

    const sprite = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!sprite) {
      return;
    }

    const groundX =
      sprite.transform.x + DEFAULT_SPRITE_GROUND_ANCHOR_X * (sprite.transform.scaleX || 1);
    const deltaX = BAIT_SHOP_TOILET_DOOR_GROUND_POINT.x - groundX;
    const facing: RoccoFacingDirection =
      Math.abs(deltaX) <= 18 ? 'up' : deltaX < 0 ? 'up-left' : 'up-right';
    this.engine.video.sprites.playAction(DEFAULT_SPRITE_INSTANCE_ID, DEFAULT_SPRITE_IDLE_ACTION_ID, {
      direction: facing,
      restart: true,
    });
    this.engine.video.render(0);
  }
}
