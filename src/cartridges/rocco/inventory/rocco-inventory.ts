import type { RoccoGridMenuDefinition } from '../../../engine/video/grid-menu';
import { DEFAULT_SPRITE_SCALE } from '../rocco-default-constants';
import {
  roccoDefaultKeysAssetUrl,
  roccoDefaultMicromaniaClosedAssetUrl,
  roccoDefaultMicromaniaInventoryAssetUrl,
  roccoDefaultMysteriousKeyAssetUrl,
  roccoDefaultTwentyEurosAssetUrl,
} from '../rocco-default-assets';
import type { RoccoLocalization } from '../localization';
import { RoccoInventoryStorage } from './inventory-storage';
import type { RoccoInventoryGroundSpriteDefinition, RoccoInventoryItem } from './types';

export const ROCCO_INVENTORY_MENU_ID = 'rocco-inventory-menu';
export const ROCCO_INVENTORY_DROP_BUTTON_ID = 'drop-item';
export const ROCCO_INVENTORY_KEYS_ITEM_ID = 'rocco-keys';
export const ROCCO_INVENTORY_MAGAZINE_ITEM_ID = 'rocco-magazine';
export const ROCCO_INVENTORY_MYSTERIOUS_KEY_ITEM_ID = 'rocco-mysterious-key';
export const ROCCO_PLAYER_INVENTORY_STORAGE_ID = 'rocco-player-inventory';
export const ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID = 'rocco-twenty-euros';
const INVENTORY_BACKDROP_ALPHA = 0.32;
const INVENTORY_BUTTON_HEIGHT = 40;
const INVENTORY_BUTTON_GAP = 14;
const INVENTORY_SLOT_SIZE = 106;
const INVENTORY_SLOT_GAP = 8;

function createGroundSpriteDefinition(
  imageUri: string,
  width: number,
  height: number,
  referenceHeightAtDefaultRoccoScale: number,
): RoccoInventoryGroundSpriteDefinition {
  const spriteScaleAtDefaultRoccoScale =
    referenceHeightAtDefaultRoccoScale / Math.max(1, height);
  return {
    imageUri,
    width,
    height,
    scaleRelativeToRoccoBase: spriteScaleAtDefaultRoccoScale / DEFAULT_SPRITE_SCALE,
    renderLayer: 'world.behind',
    zIndex: 12,
    clickTargetPadding: {
      x: 26,
      y: 20,
    },
    pickable: true,
  };
}

const DEFAULT_KEYS_GROUND_SPRITE = createGroundSpriteDefinition(
  roccoDefaultKeysAssetUrl,
  300,
  400,
  34,
);
const DEFAULT_MYSTERIOUS_KEY_GROUND_SPRITE = createGroundSpriteDefinition(
  roccoDefaultMysteriousKeyAssetUrl,
  1254,
  1254,
  26,
);
const DEFAULT_TWENTY_EUROS_GROUND_SPRITE = createGroundSpriteDefinition(
  roccoDefaultTwentyEurosAssetUrl,
  1254,
  1254,
  28,
);
const DEFAULT_MAGAZINE_GROUND_SPRITE = createGroundSpriteDefinition(
  roccoDefaultMicromaniaClosedAssetUrl,
  324,
  192,
  24,
);

export class RoccoInventory extends RoccoInventoryStorage {
  constructor() {
    super({
      id: ROCCO_PLAYER_INVENTORY_STORAGE_ID,
      columns: 3,
      rows: 3,
    });
  }

  createGridMenuDefinition(localization: RoccoLocalization): RoccoGridMenuDefinition {
    return {
      id: ROCCO_INVENTORY_MENU_ID,
      title: localization.text.inventory.title,
      showTitle: false,
      columns: this.columns,
      rows: this.rows,
      slotSize: INVENTORY_SLOT_SIZE,
      gap: INVENTORY_SLOT_GAP,
      padding: 18,
      buttons: [
        {
          id: ROCCO_INVENTORY_DROP_BUTTON_ID,
          label: localization.text.inventory.dropButtonLabel,
          requiresCarriedItem: true,
        },
      ],
      buttonHeight: INVENTORY_BUTTON_HEIGHT,
      buttonGap: INVENTORY_BUTTON_GAP,
      renderLayer: 'ui',
      zIndex: 120,
      reorderable: true,
      panelFillAlpha: 0,
      panelStrokeAlpha: 0,
      backdropFill: '#000000',
      backdropAlpha: INVENTORY_BACKDROP_ALPHA,
      items: this.createGridMenuItems(),
    };
  }
}

export function createRoccoKeysInventoryItem(
  localization: RoccoLocalization,
): RoccoInventoryItem {
  return {
    id: ROCCO_INVENTORY_KEYS_ITEM_ID,
    label: localization.text.inventory.keysLabel,
    imageUri: roccoDefaultKeysAssetUrl,
    allowedStorageIds: [ROCCO_PLAYER_INVENTORY_STORAGE_ID],
    groundSprite: DEFAULT_KEYS_GROUND_SPRITE,
  };
}

export function createRoccoMysteriousKeyInventoryItem(
  localization: RoccoLocalization,
): RoccoInventoryItem {
  return {
    id: ROCCO_INVENTORY_MYSTERIOUS_KEY_ITEM_ID,
    label: localization.text.inventory.mysteriousKeyLabel,
    imageUri: roccoDefaultMysteriousKeyAssetUrl,
    allowedStorageIds: [ROCCO_PLAYER_INVENTORY_STORAGE_ID],
    groundSprite: DEFAULT_MYSTERIOUS_KEY_GROUND_SPRITE,
  };
}

export function createRoccoTwentyEurosInventoryItem(
  localization: RoccoLocalization,
): RoccoInventoryItem {
  return {
    id: ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
    label: localization.text.inventory.twentyEurosLabel,
    imageUri: roccoDefaultTwentyEurosAssetUrl,
    allowedStorageIds: [ROCCO_PLAYER_INVENTORY_STORAGE_ID],
    groundSprite: DEFAULT_TWENTY_EUROS_GROUND_SPRITE,
  };
}

export function createRoccoMagazineInventoryItem(
  localization: RoccoLocalization,
  known: boolean,
): RoccoInventoryItem {
  return {
    id: ROCCO_INVENTORY_MAGAZINE_ITEM_ID,
    label: known
      ? localization.text.inventory.micromaniaLabel
      : localization.text.inventory.magazineLabel,
    imageUri: roccoDefaultMicromaniaInventoryAssetUrl,
    allowedStorageIds: [ROCCO_PLAYER_INVENTORY_STORAGE_ID],
    groundSprite: DEFAULT_MAGAZINE_GROUND_SPRITE,
  };
}
