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
import {
  BAIT_SHOP_SOUVENIR_AMBER_TURRITELLA_ITEM_ID,
  BAIT_SHOP_SOUVENIR_BEACH_NECKLACE_ITEM_ID,
  BAIT_SHOP_SOUVENIR_JAPANESE_FLOAT_ITEM_ID,
  BAIT_SHOP_SOUVENIR_RAZOR_SHELL_ITEM_ID,
  BAIT_SHOP_SOUVENIR_RED_CORAL_ITEM_ID,
} from './souvenir-table-items';
import type { RoccoInventoryGroundSpriteDefinition, RoccoInventoryItem } from './types';

export const ROCCO_INVENTORY_MENU_ID = 'rocco-inventory-menu';
export const ROCCO_INVENTORY_ABYSSAL_TALISMAN_ITEM_ID = 'rocco-abyssal-talisman';
export const ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID = 'rocco-coral-relic';
export const ROCCO_INVENTORY_DROP_BUTTON_ID = 'drop-item';
export const ROCCO_INVENTORY_FLOATING_AMULET_ITEM_ID = 'rocco-floating-amulet';
export const ROCCO_INVENTORY_KEYS_ITEM_ID = 'rocco-keys';
export const ROCCO_INVENTORY_MAGAZINE_ITEM_ID = 'rocco-magazine';
export const ROCCO_INVENTORY_MYSTERIOUS_KEY_ITEM_ID = 'rocco-mysterious-key';
export const ROCCO_PLAYER_INVENTORY_STORAGE_ID = 'rocco-player-inventory';
export const ROCCO_INVENTORY_SPIRAL_RAZOR_ITEM_ID = 'rocco-spiral-razor';
export const ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID = 'rocco-twenty-euros';
const INVENTORY_BACKDROP_ALPHA = 0.32;
const INVENTORY_BUTTON_HEIGHT = 40;
const INVENTORY_BUTTON_GAP = 14;
const INVENTORY_SLOT_SIZE = 106;
const INVENTORY_SLOT_GAP = 8;
const roccoAbyssalTalismanAssetUrl = new URL('./assets/souvenirs/abyssal-talisman.png', import.meta.url)
  .href;
const roccoCoralRelicAssetUrl = new URL('./assets/souvenirs/coral-relic.png', import.meta.url)
  .href;
const roccoFloatingAmuletAssetUrl = new URL('./assets/souvenirs/floating-amulet.png', import.meta.url)
  .href;
const roccoSpiralRazorAssetUrl = new URL('./assets/souvenirs/spiral-razor.png', import.meta.url)
  .href;

interface RoccoInventoryFusionRecipe {
  ingredientIds: readonly [string, string];
  createResult(localization: RoccoLocalization): RoccoInventoryItem;
}

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
const DEFAULT_FLOATING_AMULET_GROUND_SPRITE = createGroundSpriteDefinition(
  roccoFloatingAmuletAssetUrl,
  1254,
  1254,
  24,
);
const DEFAULT_SPIRAL_RAZOR_GROUND_SPRITE = createGroundSpriteDefinition(
  roccoSpiralRazorAssetUrl,
  882,
  1002,
  24,
);
const DEFAULT_ABYSSAL_TALISMAN_GROUND_SPRITE = createGroundSpriteDefinition(
  roccoAbyssalTalismanAssetUrl,
  901,
  1172,
  24,
);
const DEFAULT_CORAL_RELIC_GROUND_SPRITE = createGroundSpriteDefinition(
  roccoCoralRelicAssetUrl,
  909,
  1232,
  24,
);

const ROCCO_INVENTORY_FUSION_RECIPES: readonly RoccoInventoryFusionRecipe[] = [
  {
    ingredientIds: [
      BAIT_SHOP_SOUVENIR_JAPANESE_FLOAT_ITEM_ID,
      BAIT_SHOP_SOUVENIR_BEACH_NECKLACE_ITEM_ID,
    ],
    createResult: createRoccoFloatingAmuletInventoryItem,
  },
  {
    ingredientIds: [
      BAIT_SHOP_SOUVENIR_AMBER_TURRITELLA_ITEM_ID,
      BAIT_SHOP_SOUVENIR_RAZOR_SHELL_ITEM_ID,
    ],
    createResult: createRoccoSpiralRazorInventoryItem,
  },
  {
    ingredientIds: [
      ROCCO_INVENTORY_SPIRAL_RAZOR_ITEM_ID,
      ROCCO_INVENTORY_FLOATING_AMULET_ITEM_ID,
    ],
    createResult: createRoccoAbyssalTalismanInventoryItem,
  },
  {
    ingredientIds: [
      ROCCO_INVENTORY_ABYSSAL_TALISMAN_ITEM_ID,
      BAIT_SHOP_SOUVENIR_RED_CORAL_ITEM_ID,
    ],
    createResult: createRoccoCoralRelicInventoryItem,
  },
];

function resolveRoccoInventoryFusionRecipe(
  firstItemId: string,
  secondItemId: string,
): RoccoInventoryFusionRecipe | undefined {
  return ROCCO_INVENTORY_FUSION_RECIPES.find(
    ({ ingredientIds }) =>
      (ingredientIds[0] === firstItemId && ingredientIds[1] === secondItemId) ||
      (ingredientIds[0] === secondItemId && ingredientIds[1] === firstItemId),
  );
}

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

  tryFuseItems(
    carriedItemId: string,
    targetItemId: string,
    localization: RoccoLocalization,
    targetSlotIndex?: number,
  ): RoccoInventoryItem | undefined {
    const carriedItem = this.getItem(carriedItemId);
    const targetItem = this.getItem(targetItemId);
    const fusionRecipe = resolveRoccoInventoryFusionRecipe(carriedItemId, targetItemId);
    if (!carriedItem || !targetItem || !fusionRecipe) {
      return undefined;
    }

    const fusedItem: RoccoInventoryItem = {
      ...fusionRecipe.createResult(localization),
      slotIndex: targetSlotIndex ?? targetItem.slotIndex ?? carriedItem.slotIndex,
    };
    const remainingItems = this.listItems().filter(
      (item) => item.id !== carriedItem.id && item.id !== targetItem.id,
    );

    try {
      this.replaceItems([...remainingItems, fusedItem]);
      return this.getItem(fusedItem.id);
    } catch {
      return undefined;
    }
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

export function createRoccoFloatingAmuletInventoryItem(
  localization: RoccoLocalization,
): RoccoInventoryItem {
  return {
    id: ROCCO_INVENTORY_FLOATING_AMULET_ITEM_ID,
    label: localization.locale === 'es' ? 'Amuleto flotante' : 'Floating Amulet',
    imageUri: roccoFloatingAmuletAssetUrl,
    allowedStorageIds: [ROCCO_PLAYER_INVENTORY_STORAGE_ID],
    groundSprite: DEFAULT_FLOATING_AMULET_GROUND_SPRITE,
  };
}

export function createRoccoSpiralRazorInventoryItem(
  localization: RoccoLocalization,
): RoccoInventoryItem {
  return {
    id: ROCCO_INVENTORY_SPIRAL_RAZOR_ITEM_ID,
    label: localization.locale === 'es' ? 'Navaja turritela' : 'Turritella Razor',
    imageUri: roccoSpiralRazorAssetUrl,
    allowedStorageIds: [ROCCO_PLAYER_INVENTORY_STORAGE_ID],
    groundSprite: DEFAULT_SPIRAL_RAZOR_GROUND_SPRITE,
  };
}

export function createRoccoAbyssalTalismanInventoryItem(
  localization: RoccoLocalization,
): RoccoInventoryItem {
  return {
    id: ROCCO_INVENTORY_ABYSSAL_TALISMAN_ITEM_ID,
    label: localization.locale === 'es' ? 'Talism\u00e1n abisal' : 'Abyssal Talisman',
    imageUri: roccoAbyssalTalismanAssetUrl,
    allowedStorageIds: [ROCCO_PLAYER_INVENTORY_STORAGE_ID],
    groundSprite: DEFAULT_ABYSSAL_TALISMAN_GROUND_SPRITE,
  };
}

export function createRoccoCoralRelicInventoryItem(
  localization: RoccoLocalization,
): RoccoInventoryItem {
  return {
    id: ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID,
    label: localization.locale === 'es' ? 'Reliquia coralina' : 'Coral Relic',
    imageUri: roccoCoralRelicAssetUrl,
    allowedStorageIds: [ROCCO_PLAYER_INVENTORY_STORAGE_ID],
    groundSprite: DEFAULT_CORAL_RELIC_GROUND_SPRITE,
  };
}
