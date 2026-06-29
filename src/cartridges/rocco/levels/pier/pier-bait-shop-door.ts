import type { RoccoEngine } from '../../../../engine/engine-sdk';
import type { RoccoSpriteDefinition } from '../../../../engine/video/sprites';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import {
  DEFAULT_BAIT_SHOP_DOOR_CLOSED_ANIMATION_ID,
  DEFAULT_BAIT_SHOP_DOOR_HEIGHT,
  DEFAULT_BAIT_SHOP_DOOR_OPEN_ANIMATION_ID,
  DEFAULT_BAIT_SHOP_DOOR_PIVOT_X,
  DEFAULT_BAIT_SHOP_DOOR_PIVOT_Y,
  DEFAULT_BAIT_SHOP_DOOR_RENDER_LAYER,
  DEFAULT_BAIT_SHOP_DOOR_SPRITE_DEFINITION_ID,
  DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID,
  DEFAULT_BAIT_SHOP_DOOR_WIDTH,
  DEFAULT_BAIT_SHOP_DOOR_X,
  DEFAULT_BAIT_SHOP_DOOR_Y,
  DEFAULT_BAIT_SHOP_DOOR_Z_INDEX,
} from '../../rocco-default-constants';
import { pierBaitShopDoorAssetUrls, pierDoorOpeningSoundUrl } from './pier-assets';

const CLOSED_FRAME_ID = 'bait-shop-door-closed-frame';
const OPEN_FRAME_ID = 'bait-shop-door-open-frame';
const DOOR_IMAGE_CLOSED_ID = 'rocco-bait-shop-door-closed';
const DOOR_IMAGE_OPEN_ID = 'rocco-bait-shop-door-open';
const BAIT_SHOP_DOOR_SOUND_VOLUME = 0.42;

export const BAIT_SHOP_DOOR_OPENING_SOUND_ID = 'rocco-bait-shop-door-opening-sound';

export interface RoccoBaitShopDoorState {
  revealed: boolean;
}

export interface RoccoBaitShopDoorController {
  update(deltaMs: number): void;
  reveal(): void;
  isRevealed(): boolean;
  unmount(engine: RoccoEngine): void;
}

export interface RoccoBaitShopDoorInstallOptions {
  localization?: RoccoLocalization;
  initialState?: RoccoBaitShopDoorState;
}

function createDefaultBaitShopDoorSpriteDefinition(
  localization: RoccoLocalization,
): RoccoSpriteDefinition {
  return {
    id: DEFAULT_BAIT_SHOP_DOOR_SPRITE_DEFINITION_ID,
    name: 'Bait Shop Door',
    images: [
      {
        id: DOOR_IMAGE_CLOSED_ID,
        uri: pierBaitShopDoorAssetUrls.closed,
        width: DEFAULT_BAIT_SHOP_DOOR_WIDTH,
        height: DEFAULT_BAIT_SHOP_DOOR_HEIGHT,
      },
      {
        id: DOOR_IMAGE_OPEN_ID,
        uri: pierBaitShopDoorAssetUrls.open,
        width: DEFAULT_BAIT_SHOP_DOOR_WIDTH,
        height: DEFAULT_BAIT_SHOP_DOOR_HEIGHT,
      },
    ],
    frames: [
      {
        id: CLOSED_FRAME_ID,
        imageId: DOOR_IMAGE_CLOSED_ID,
        durationMs: 1000,
        pivot: {
          x: DEFAULT_BAIT_SHOP_DOOR_PIVOT_X,
          y: DEFAULT_BAIT_SHOP_DOOR_PIVOT_Y,
        },
        hitbox: {
          kind: 'rect',
          x: 0,
          y: 0,
          width: DEFAULT_BAIT_SHOP_DOOR_WIDTH,
          height: DEFAULT_BAIT_SHOP_DOOR_HEIGHT,
        },
      },
      {
        id: OPEN_FRAME_ID,
        imageId: DOOR_IMAGE_OPEN_ID,
        durationMs: 1000,
        pivot: {
          x: DEFAULT_BAIT_SHOP_DOOR_PIVOT_X,
          y: DEFAULT_BAIT_SHOP_DOOR_PIVOT_Y,
        },
        hitbox: {
          kind: 'rect',
          x: 0,
          y: 0,
          width: DEFAULT_BAIT_SHOP_DOOR_WIDTH,
          height: DEFAULT_BAIT_SHOP_DOOR_HEIGHT,
        },
      },
    ],
    animations: {
      [DEFAULT_BAIT_SHOP_DOOR_CLOSED_ANIMATION_ID]: {
        id: DEFAULT_BAIT_SHOP_DOOR_CLOSED_ANIMATION_ID,
        loop: false,
        playbackRate: 1,
        frames: [{ frameId: CLOSED_FRAME_ID, durationMs: 1000 }],
      },
      [DEFAULT_BAIT_SHOP_DOOR_OPEN_ANIMATION_ID]: {
        id: DEFAULT_BAIT_SHOP_DOOR_OPEN_ANIMATION_ID,
        loop: false,
        playbackRate: 1,
        frames: [{ frameId: OPEN_FRAME_ID, durationMs: 1000 }],
      },
    },
    defaultAnimation: DEFAULT_BAIT_SHOP_DOOR_CLOSED_ANIMATION_ID,
    render: {
      renderLayer: DEFAULT_BAIT_SHOP_DOOR_RENDER_LAYER,
      zIndex: DEFAULT_BAIT_SHOP_DOOR_Z_INDEX,
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

class RoccoBaitShopDoorControllerImpl implements RoccoBaitShopDoorController {
  private readonly engine: RoccoEngine;
  private readonly localization: RoccoLocalization;
  private revealed: boolean;

  constructor(
    engine: RoccoEngine,
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
    this.engine.video.sprites.setInteractive(DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID, true);
    this.engine.video.sprites.setVisibleDescription(DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID, {
      enabled: true,
      text: this.localization.text.descriptions.baitShopDoor,
    });
    this.engine.video.render(0);
  }

  isRevealed(): boolean {
    return this.revealed;
  }

  unmount(engine: RoccoEngine): void {
    engine.audio.stopSound(BAIT_SHOP_DOOR_OPENING_SOUND_ID);
    engine.audio.unregisterSound(BAIT_SHOP_DOOR_OPENING_SOUND_ID);
    engine.video.sprites.removeSprite(DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID);
    engine.video.render(0);
  }
}

export async function installDefaultBaitShopDoor(
  engine: RoccoEngine,
  options: RoccoBaitShopDoorInstallOptions = {},
): Promise<RoccoBaitShopDoorController> {
  const localization = options.localization ?? createRoccoLocalization();
  const initialState = options.initialState ?? { revealed: true };
  const definition = createDefaultBaitShopDoorSpriteDefinition(localization);

  engine.audio.registerSound({
    id: BAIT_SHOP_DOOR_OPENING_SOUND_ID,
    uri: pierDoorOpeningSoundUrl,
    volume: BAIT_SHOP_DOOR_SOUND_VOLUME,
    loop: false,
  });
  await engine.audio.preloadSound(BAIT_SHOP_DOOR_OPENING_SOUND_ID).catch(() => {
    engine.log('Audio', 'Bait shop door opening sound could not be preloaded.');
  });
  await engine.video.preloadSpriteDefinition(definition);
  engine.video.sprites.loadSpriteDefinition(definition);
  engine.video.sprites.removeSprite(DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID);

  engine.video.sprites.createSpriteFromDefinition(DEFAULT_BAIT_SHOP_DOOR_SPRITE_DEFINITION_ID, {
    id: DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID,
    transform: {
      x: DEFAULT_BAIT_SHOP_DOOR_X,
      y: DEFAULT_BAIT_SHOP_DOOR_Y,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    },
    renderLayer: DEFAULT_BAIT_SHOP_DOOR_RENDER_LAYER,
    zIndex: DEFAULT_BAIT_SHOP_DOOR_Z_INDEX,
    depthMode: 'fixed',
    interactive: initialState.revealed,
    collisionEnabled: false,
    visibleDescription: {
      enabled: initialState.revealed,
      text: localization.text.descriptions.baitShopDoor,
    },
  });

  engine.video.sprites.playAnimation(
    DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID,
    DEFAULT_BAIT_SHOP_DOOR_CLOSED_ANIMATION_ID,
    {
      restart: true,
    },
  );
  engine.video.render(0);

  return new RoccoBaitShopDoorControllerImpl(engine, localization, initialState);
}
