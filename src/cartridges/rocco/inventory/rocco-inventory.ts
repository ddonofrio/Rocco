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
  createBaitShopSouvenirTableItems,
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
export const ROCCO_INVENTORY_BATA_ITEM_ID = 'rocco-bata';
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
const roccoBataAssetUrl = new URL('../assets/props/lab-coat.png', import.meta.url).href;
const roccoBataGroundAssetUrl = new URL('../assets/props/lab-coat-ground.png', import.meta.url)
  .href;

interface RoccoInventoryFusionRecipe {
  resultItemId: string;
  ingredientIds: readonly [string, string];
  createResult(localization: RoccoLocalization): RoccoInventoryItem;
}

export interface RoccoInventoryFusionStep {
  ingredientIds: readonly [string, string];
  resultItemId: string;
}

export interface RoccoCoralRelicAssemblyPlan {
  status: 'ready' | 'craftable' | 'missing';
  steps: readonly RoccoInventoryFusionStep[];
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
const DEFAULT_BATA_GROUND_SPRITE = createGroundSpriteDefinition(
  roccoBataGroundAssetUrl,
  300,
  320,
  44,
);

const ROCCO_INVENTORY_FUSION_RECIPES: readonly RoccoInventoryFusionRecipe[] = [
  {
    resultItemId: ROCCO_INVENTORY_FLOATING_AMULET_ITEM_ID,
    ingredientIds: [
      BAIT_SHOP_SOUVENIR_JAPANESE_FLOAT_ITEM_ID,
      BAIT_SHOP_SOUVENIR_BEACH_NECKLACE_ITEM_ID,
    ],
    createResult: createRoccoFloatingAmuletInventoryItem,
  },
  {
    resultItemId: ROCCO_INVENTORY_SPIRAL_RAZOR_ITEM_ID,
    ingredientIds: [
      BAIT_SHOP_SOUVENIR_AMBER_TURRITELLA_ITEM_ID,
      BAIT_SHOP_SOUVENIR_RAZOR_SHELL_ITEM_ID,
    ],
    createResult: createRoccoSpiralRazorInventoryItem,
  },
  {
    resultItemId: ROCCO_INVENTORY_ABYSSAL_TALISMAN_ITEM_ID,
    ingredientIds: [
      ROCCO_INVENTORY_SPIRAL_RAZOR_ITEM_ID,
      ROCCO_INVENTORY_FLOATING_AMULET_ITEM_ID,
    ],
    createResult: createRoccoAbyssalTalismanInventoryItem,
  },
  {
    resultItemId: ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID,
    ingredientIds: [
      ROCCO_INVENTORY_ABYSSAL_TALISMAN_ITEM_ID,
      BAIT_SHOP_SOUVENIR_RED_CORAL_ITEM_ID,
    ],
    createResult: createRoccoCoralRelicInventoryItem,
  },
];

const ROCCO_INVENTORY_FUSION_RECIPES_BY_RESULT = new Map(
  ROCCO_INVENTORY_FUSION_RECIPES.map((recipe) => [recipe.resultItemId, recipe] as const),
);

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

function applyFusionRecipeToItemIds(
  availableItemIds: ReadonlySet<string>,
  recipe: RoccoInventoryFusionRecipe,
): Set<string> {
  const nextAvailableItemIds = new Set(availableItemIds);
  nextAvailableItemIds.delete(recipe.ingredientIds[0]);
  nextAvailableItemIds.delete(recipe.ingredientIds[1]);
  nextAvailableItemIds.add(recipe.resultItemId);
  return nextAvailableItemIds;
}

function buildFusionPlan(
  targetItemId: string,
  availableItemIds: ReadonlySet<string>,
): { availableItemIds: Set<string>; steps: RoccoInventoryFusionStep[] } | null {
  if (availableItemIds.has(targetItemId)) {
    return {
      availableItemIds: new Set(availableItemIds),
      steps: [],
    };
  }

  const recipe = ROCCO_INVENTORY_FUSION_RECIPES_BY_RESULT.get(targetItemId);
  if (!recipe) {
    return null;
  }

  let nextAvailableItemIds = new Set(availableItemIds);
  const steps: RoccoInventoryFusionStep[] = [];
  for (const ingredientId of recipe.ingredientIds) {
    const ingredientPlan = buildFusionPlan(ingredientId, nextAvailableItemIds);
    if (!ingredientPlan) {
      return null;
    }

    nextAvailableItemIds = ingredientPlan.availableItemIds;
    steps.push(...ingredientPlan.steps);
  }

  if (
    !nextAvailableItemIds.has(recipe.ingredientIds[0]) ||
    !nextAvailableItemIds.has(recipe.ingredientIds[1])
  ) {
    return null;
  }

  return {
    availableItemIds: applyFusionRecipeToItemIds(nextAvailableItemIds, recipe),
    steps: [
      ...steps,
      {
        ingredientIds: recipe.ingredientIds,
        resultItemId: recipe.resultItemId,
      },
    ],
  };
}

export function planRoccoCoralRelicAssembly(
  itemIds: Iterable<string>,
): RoccoCoralRelicAssemblyPlan {
  const availableItemIds = new Set(itemIds);
  if (availableItemIds.has(ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID)) {
    return {
      status: 'ready',
      steps: [],
    };
  }

  const fusionPlan = buildFusionPlan(ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID, availableItemIds);
  if (!fusionPlan) {
    return {
      status: 'missing',
      steps: [],
    };
  }

  return {
    status: 'craftable',
    steps: fusionPlan.steps,
  };
}

export function resolveRoccoInventoryItemLabel(
  itemId: string,
  localization: RoccoLocalization,
): string | undefined {
  switch (itemId) {
    case ROCCO_INVENTORY_FLOATING_AMULET_ITEM_ID:
      return createRoccoFloatingAmuletInventoryItem(localization).label;
    case ROCCO_INVENTORY_SPIRAL_RAZOR_ITEM_ID:
      return createRoccoSpiralRazorInventoryItem(localization).label;
    case ROCCO_INVENTORY_ABYSSAL_TALISMAN_ITEM_ID:
      return createRoccoAbyssalTalismanInventoryItem(localization).label;
    case ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID:
      return createRoccoCoralRelicInventoryItem(localization).label;
    default:
      return createBaitShopSouvenirTableItems(localization).find((item) => item.id === itemId)?.label;
  }
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
    label: localization.text.inventory.floatingAmuletLabel,
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
    label: localization.text.inventory.spiralRazorLabel,
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
    label: localization.text.inventory.abyssalTalismanLabel,
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
    label: localization.text.inventory.coralRelicLabel,
    imageUri: roccoCoralRelicAssetUrl,
    allowedStorageIds: [ROCCO_PLAYER_INVENTORY_STORAGE_ID],
    groundSprite: DEFAULT_CORAL_RELIC_GROUND_SPRITE,
  };
}

export function createRoccoBataInventoryItem(
  localization: RoccoLocalization,
): RoccoInventoryItem {
  return {
    id: ROCCO_INVENTORY_BATA_ITEM_ID,
    label: localization.text.inventory.bataLabel,
    imageUri: roccoBataAssetUrl,
    allowedStorageIds: [ROCCO_PLAYER_INVENTORY_STORAGE_ID],
    groundSprite: DEFAULT_BATA_GROUND_SPRITE,
  };
}
