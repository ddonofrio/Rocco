import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoActionMenuDefinition } from '../../../../../../console/video/action-menu';
import type { RoccoSpriteDefinition } from '../../../../../../console/video/sprites';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import { ROCCO_ACTION_MENU_ASSETS } from '../../ui';
import { PIER_BAIT_SHOP_DOOR_CONFIG } from './pier-bait-shop-door-config';
import { pierBaitShopDoorAssetUrls, pierDoorOpeningSoundUrl } from './pier-bait-shop-door-assets';

const CLOSED_FRAME_ID = 'bait-shop-door-closed-frame';
const OPEN_FRAME_ID = 'bait-shop-door-open-frame';
const DOOR_IMAGE_CLOSED_ID = 'rocco-bait-shop-door-closed';
const DOOR_IMAGE_OPEN_ID = 'rocco-bait-shop-door-open';
const BAIT_SHOP_DOOR_SOUND_VOLUME = 0.42;
const BAIT_SHOP_DOOR_ACTION_MENU_ITEM_SIZE = 92;
const BAIT_SHOP_DOOR_ACTION_MENU_ORBIT_RADIUS = 88;
const BAIT_SHOP_DOOR_ACTION_MENU_ORBIT_SPEED = 0.08;

export const BAIT_SHOP_DOOR_OPENING_SOUND_ID = 'rocco-bait-shop-door-opening-sound';
export const BAIT_SHOP_DOOR_ACTION_MENU_ID = 'rocco-bait-shop-door-action-menu';

export interface RoccoBaitShopDoorState {
  revealed: boolean;
}

export interface RoccoBaitShopDoorController {
  update(deltaMs: number): void;
  reveal(): void;
  isRevealed(): boolean;
  unmount(engine: CartridgeSdkV1Runtime): void;
}

export interface RoccoBaitShopDoorInstallOptions {
  localization?: RoccoLocalization;
  initialState?: RoccoBaitShopDoorState;
}

function createDefaultBaitShopDoorSpriteDefinition(
  localization: RoccoLocalization,
): RoccoSpriteDefinition {
  return {
    id: PIER_BAIT_SHOP_DOOR_CONFIG.spriteDefinitionId,
    name: 'Bait Shop Door',
    images: createDoorImages(),
    frames: createDoorFrames(),
    animations: createDoorAnimations(),
    defaultAnimation: PIER_BAIT_SHOP_DOOR_CONFIG.closedAnimationId,
    render: {
      renderLayer: PIER_BAIT_SHOP_DOOR_CONFIG.renderLayer,
      zIndex: PIER_BAIT_SHOP_DOOR_CONFIG.zIndex,
      depthMode: 'fixed',
      opacity: 1,
    },
    visibleDescription: {
      enabled: true,
      text: localization.text.descriptions.baitShopDoor,
    },
    metadata: {
      purpose: 'pier-bait-shop-door',
    },
  };
}

function createDoorImages(): RoccoSpriteDefinition['images'] {
  return [
    {
      id: DOOR_IMAGE_CLOSED_ID,
      uri: pierBaitShopDoorAssetUrls.closed,
      width: PIER_BAIT_SHOP_DOOR_CONFIG.width,
      height: PIER_BAIT_SHOP_DOOR_CONFIG.height,
    },
    {
      id: DOOR_IMAGE_OPEN_ID,
      uri: pierBaitShopDoorAssetUrls.open,
      width: PIER_BAIT_SHOP_DOOR_CONFIG.width,
      height: PIER_BAIT_SHOP_DOOR_CONFIG.height,
    },
  ];
}

function createDoorFrames(): RoccoSpriteDefinition['frames'] {
  const hitbox = {
    kind: 'rect' as const,
    x: 0,
    y: 0,
    width: PIER_BAIT_SHOP_DOOR_CONFIG.width,
    height: PIER_BAIT_SHOP_DOOR_CONFIG.height,
  };
  const pivot = {
    x: PIER_BAIT_SHOP_DOOR_CONFIG.pivotX,
    y: PIER_BAIT_SHOP_DOOR_CONFIG.pivotY,
  };

  return [
    { id: CLOSED_FRAME_ID, imageId: DOOR_IMAGE_CLOSED_ID, durationMs: 1000, pivot, hitbox },
    { id: OPEN_FRAME_ID, imageId: DOOR_IMAGE_OPEN_ID, durationMs: 1000, pivot, hitbox },
  ];
}

function createDoorAnimations(): RoccoSpriteDefinition['animations'] {
  return {
    [PIER_BAIT_SHOP_DOOR_CONFIG.closedAnimationId]: {
      id: PIER_BAIT_SHOP_DOOR_CONFIG.closedAnimationId,
      loop: false,
      playbackRate: 1,
      frames: [{ frameId: CLOSED_FRAME_ID, durationMs: 1000 }],
    },
    [PIER_BAIT_SHOP_DOOR_CONFIG.openAnimationId]: {
      id: PIER_BAIT_SHOP_DOOR_CONFIG.openAnimationId,
      loop: false,
      playbackRate: 1,
      frames: [{ frameId: OPEN_FRAME_ID, durationMs: 1000 }],
    },
  };
}

function createBaitShopDoorActionMenuDefinition(
  localization: RoccoLocalization,
): RoccoActionMenuDefinition {
  return {
    id: BAIT_SHOP_DOOR_ACTION_MENU_ID,
    targetInstanceIds: [PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId],
    renderLayer: 'ui.action-menu',
    itemSize: BAIT_SHOP_DOOR_ACTION_MENU_ITEM_SIZE,
    orbitRadius: BAIT_SHOP_DOOR_ACTION_MENU_ORBIT_RADIUS,
    orbitSpeedRadiansPerSecond: BAIT_SHOP_DOOR_ACTION_MENU_ORBIT_SPEED,
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
        id: 'open',
        actionId: 'open',
        label: localization.text.baitShop.toiletDoorOpenLabel,
        imageUri: ROCCO_ACTION_MENU_ASSETS.grab,
      },
      {
        id: 'kick',
        actionId: 'kick',
        label: localization.text.actions.kick,
        imageUri: ROCCO_ACTION_MENU_ASSETS.kick,
      },
    ],
  };
}

class RoccoBaitShopDoorControllerImpl implements RoccoBaitShopDoorController {
  private readonly engine: CartridgeSdkV1Runtime;
  private readonly localization: RoccoLocalization;
  private revealed: boolean;

  constructor(
    engine: CartridgeSdkV1Runtime,
    localization: RoccoLocalization,
    initialState: RoccoBaitShopDoorState,
  ) {
    this.engine = engine;
    this.localization = localization;
    this.revealed = initialState.revealed;
  }

  update(): void {}

  reveal(): void {
    if (this.revealed) {
      return;
    }

    this.revealed = true;
    this.engine.video.sprites.setInteractive(PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId, true);
    this.engine.video.sprites.setVisibleDescription(PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId, {
      enabled: true,
      text: this.localization.text.descriptions.baitShopDoor,
    });
  }

  isRevealed(): boolean {
    return this.revealed;
  }

  unmount(engine: CartridgeSdkV1Runtime): void {
    engine.audio.stopSound(BAIT_SHOP_DOOR_OPENING_SOUND_ID);
    engine.audio.unregisterSound(BAIT_SHOP_DOOR_OPENING_SOUND_ID);
    engine.video.actionMenus.unregisterMenu(BAIT_SHOP_DOOR_ACTION_MENU_ID);
    engine.video.sprites.removeSprite(PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId);
  }
}

function registerBaitShopDoorSound(engine: CartridgeSdkV1Runtime): void {
  engine.audio.registerSound({
    id: BAIT_SHOP_DOOR_OPENING_SOUND_ID,
    uri: pierDoorOpeningSoundUrl,
    volume: BAIT_SHOP_DOOR_SOUND_VOLUME,
    loop: false,
  });
}

async function preloadBaitShopDoorSound(engine: CartridgeSdkV1Runtime): Promise<void> {
  try {
    await engine.audio.preloadSound(BAIT_SHOP_DOOR_OPENING_SOUND_ID);
  } catch {
    engine.log('Audio', 'Bait shop door opening sound could not be preloaded.');
  }
}

function createBaitShopDoorSprite(
  engine: CartridgeSdkV1Runtime,
  localization: RoccoLocalization,
  initialState: RoccoBaitShopDoorState,
): void {
  engine.video.sprites.createSpriteFromDefinition(PIER_BAIT_SHOP_DOOR_CONFIG.spriteDefinitionId, {
    id: PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId,
    transform: {
      x: PIER_BAIT_SHOP_DOOR_CONFIG.x,
      y: PIER_BAIT_SHOP_DOOR_CONFIG.y,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    },
    renderLayer: PIER_BAIT_SHOP_DOOR_CONFIG.renderLayer,
    zIndex: PIER_BAIT_SHOP_DOOR_CONFIG.zIndex,
    depthMode: 'fixed',
    interactive: initialState.revealed,
    collisionEnabled: false,
    visibleDescription: {
      enabled: initialState.revealed,
      text: localization.text.descriptions.baitShopDoor,
    },
  });
}

export async function installDefaultBaitShopDoor(
  engine: CartridgeSdkV1Runtime,
  options: RoccoBaitShopDoorInstallOptions = {},
  preloader?: RoccoAssetPreloader,
): Promise<RoccoBaitShopDoorController> {
  const localization = options.localization ?? createRoccoLocalization();
  const initialState = options.initialState ?? { revealed: true };
  const definition = createDefaultBaitShopDoorSpriteDefinition(localization);

  registerBaitShopDoorSound(engine);
  await preloadBaitShopDoorSound(engine);
  await (preloader?.preloadSpriteDefinition(engine, definition) ??
    engine.video.preloadSpriteDefinition(definition));
  engine.video.sprites.loadSpriteDefinition(definition);
  engine.video.sprites.removeSprite(PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId);
  engine.video.actionMenus.unregisterMenu(BAIT_SHOP_DOOR_ACTION_MENU_ID);
  engine.video.actionMenus.registerMenu(createBaitShopDoorActionMenuDefinition(localization));
  createBaitShopDoorSprite(engine, localization, initialState);

  engine.video.sprites.playAnimation(
    PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId,
    PIER_BAIT_SHOP_DOOR_CONFIG.closedAnimationId,
    {
      restart: true,
    },
  );

  return new RoccoBaitShopDoorControllerImpl(engine, localization, initialState);
}
