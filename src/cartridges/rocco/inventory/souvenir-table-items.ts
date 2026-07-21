import { ROCCO_PLAYER_CONFIG } from '../games/rocco-default/player/rocco-player-config';
import type { RoccoLocalization } from '../localization';
import type { RoccoInventoryGroundSpriteDefinition, RoccoInventoryItem } from './types';
import { SOUVENIR_TABLE_ASSET_URLS } from './souvenir-assets';
export { ROCCO_SOUVENIR_TABLE_ITEM_IMAGE_URLS } from './souvenir-assets';

interface RoccoLocalizedSouvenirTableItemDefinition {
  id: string;
  imageUri: string;
  slotIndex: number;
  width: number;
  height: number;
  labels: {
    en: string;
    es: string;
  };
}

export const BAIT_SHOP_SOUVENIR_BEACH_NECKLACE_ITEM_ID = 'souvenir-beach-necklace';
export const BAIT_SHOP_SOUVENIR_AMBER_TURRITELLA_ITEM_ID = 'souvenir-amber-turritella';
export const BAIT_SHOP_SOUVENIR_JAPANESE_FLOAT_ITEM_ID = 'souvenir-japanese-float';
export const BAIT_SHOP_SOUVENIR_RAZOR_SHELL_ITEM_ID = 'souvenir-razor-shell';
export const BAIT_SHOP_SOUVENIR_RED_CORAL_ITEM_ID = 'souvenir-red-coral';

const SOUVENIR_REFERENCE_HEIGHT_AT_DEFAULT_ROCCO_SCALE = 24;

function createSouvenirGroundSpriteDefinition(
  imageUri: string,
  width: number,
  height: number,
): RoccoInventoryGroundSpriteDefinition {
  const spriteScaleAtDefaultRoccoScale =
    SOUVENIR_REFERENCE_HEIGHT_AT_DEFAULT_ROCCO_SCALE / Math.max(1, height);
  return {
    imageUri,
    width,
    height,
    scaleRelativeToRoccoBase: spriteScaleAtDefaultRoccoScale / ROCCO_PLAYER_CONFIG.motion.scale,
    renderLayer: 'world.behind',
    zIndex: 12,
    clickTargetPadding: {
      x: 18,
      y: 16,
    },
    pickable: true,
  };
}

const BAIT_SHOP_SOUVENIR_TABLE_ITEM_DEFINITIONS: readonly RoccoLocalizedSouvenirTableItemDefinition[] =
  [
    {
      id: 'souvenir-sea-dollar',
      imageUri: SOUVENIR_TABLE_ASSET_URLS.seaDollar,
      slotIndex: 0,
      width: 300,
      height: 300,
      labels: {
        en: 'Sea Dollar',
        es: 'D\u{F3}lar marino',
      },
    },
    {
      id: 'souvenir-horseshoe-crab',
      imageUri: SOUVENIR_TABLE_ASSET_URLS.horseshoeCrab,
      slotIndex: 1,
      width: 300,
      height: 300,
      labels: {
        en: 'Horseshoe Crab',
        es: 'Cangrejo herradura',
      },
    },
    {
      id: 'souvenir-striped-clam',
      imageUri: SOUVENIR_TABLE_ASSET_URLS.stripedClam,
      slotIndex: 2,
      width: 300,
      height: 300,
      labels: {
        en: 'Striped Clam',
        es: 'Almeja estriada',
      },
    },
    {
      id: BAIT_SHOP_SOUVENIR_BEACH_NECKLACE_ITEM_ID,
      imageUri: SOUVENIR_TABLE_ASSET_URLS.beachNecklace,
      slotIndex: 3,
      width: 300,
      height: 300,
      labels: {
        en: 'Beach Necklace',
        es: 'Collar playero',
      },
    },
    {
      id: 'souvenir-golden-nautilus',
      imageUri: SOUVENIR_TABLE_ASSET_URLS.goldenNautilus,
      slotIndex: 4,
      width: 300,
      height: 300,
      labels: {
        en: 'Golden Nautilus',
        es: 'N\u{E1}utilo dorado',
      },
    },
    {
      id: 'souvenir-hollow-urchin',
      imageUri: SOUVENIR_TABLE_ASSET_URLS.hollowUrchin,
      slotIndex: 5,
      width: 300,
      height: 300,
      labels: {
        en: 'Hollow Urchin',
        es: 'Erizo hueco',
      },
    },
    {
      id: 'souvenir-spiny-murex',
      imageUri: SOUVENIR_TABLE_ASSET_URLS.spinyMurex,
      slotIndex: 6,
      width: 300,
      height: 300,
      labels: {
        en: 'Spiny Murex',
        es: 'M\u{FA}rice espinoso',
      },
    },
    {
      id: 'souvenir-tower-shell',
      imageUri: SOUVENIR_TABLE_ASSET_URLS.towerShell,
      slotIndex: 7,
      width: 300,
      height: 300,
      labels: {
        en: 'Tower Shell',
        es: 'Caracola torre',
      },
    },
    {
      id: BAIT_SHOP_SOUVENIR_RAZOR_SHELL_ITEM_ID,
      imageUri: SOUVENIR_TABLE_ASSET_URLS.razorShell,
      slotIndex: 8,
      width: 300,
      height: 300,
      labels: {
        en: 'Razor Shell',
        es: 'Navaja marina',
      },
    },
    {
      id: BAIT_SHOP_SOUVENIR_RED_CORAL_ITEM_ID,
      imageUri: SOUVENIR_TABLE_ASSET_URLS.redCoral,
      slotIndex: 9,
      width: 300,
      height: 300,
      labels: {
        en: 'Red Coral',
        es: 'Coral rojo',
      },
    },
    {
      id: 'souvenir-amber-star',
      imageUri: SOUVENIR_TABLE_ASSET_URLS.amberStar,
      slotIndex: 10,
      width: 300,
      height: 300,
      labels: {
        en: 'Amber Star',
        es: 'Estrella \u{E1}mbar',
      },
    },
    {
      id: 'souvenir-copper-fan',
      imageUri: SOUVENIR_TABLE_ASSET_URLS.copperFan,
      slotIndex: 11,
      width: 300,
      height: 300,
      labels: {
        en: 'Copper Fan',
        es: 'Abanico cobrizo',
      },
    },
    {
      id: BAIT_SHOP_SOUVENIR_JAPANESE_FLOAT_ITEM_ID,
      imageUri: SOUVENIR_TABLE_ASSET_URLS.japaneseFloat,
      slotIndex: 12,
      width: 300,
      height: 300,
      labels: {
        en: 'Japanese Float',
        es: 'Flotador japon\u{E9}s',
      },
    },
    {
      id: 'souvenir-speckled-cowrie',
      imageUri: SOUVENIR_TABLE_ASSET_URLS.speckledCowrie,
      slotIndex: 13,
      width: 266,
      height: 265,
      labels: {
        en: 'Speckled Cowrie',
        es: 'Cauri moteado',
      },
    },
    {
      id: BAIT_SHOP_SOUVENIR_AMBER_TURRITELLA_ITEM_ID,
      imageUri: SOUVENIR_TABLE_ASSET_URLS.amberTurritella,
      slotIndex: 14,
      width: 300,
      height: 300,
      labels: {
        en: 'Amber Turritella',
        es: 'Turritela \u{E1}mbar',
      },
    },
    {
      id: 'souvenir-striped-urchin',
      imageUri: SOUVENIR_TABLE_ASSET_URLS.stripedUrchin,
      slotIndex: 15,
      width: 266,
      height: 265,
      labels: {
        en: 'Striped Urchin',
        es: 'Erizo estriado',
      },
    },
    {
      id: 'souvenir-amber-spiral',
      imageUri: SOUVENIR_TABLE_ASSET_URLS.amberSpiral,
      slotIndex: 17,
      width: 266,
      height: 265,
      labels: {
        en: 'Amber Spiral',
        es: 'Espiral \u{E1}mbar',
      },
    },
    {
      id: 'souvenir-tiger-cone',
      imageUri: SOUVENIR_TABLE_ASSET_URLS.tigerCone,
      slotIndex: 18,
      width: 300,
      height: 300,
      labels: {
        en: 'Tiger Cone',
        es: 'Cono tigre',
      },
    },
    {
      id: 'souvenir-golden-scallop',
      imageUri: SOUVENIR_TABLE_ASSET_URLS.goldenScallop,
      slotIndex: 19,
      width: 300,
      height: 300,
      labels: {
        en: 'Golden Scallop',
        es: 'Vieira dorada',
      },
    },
  ];

export function createBaitShopSouvenirTableItems(
  localization: RoccoLocalization,
): RoccoInventoryItem[] {
  return BAIT_SHOP_SOUVENIR_TABLE_ITEM_DEFINITIONS.map((definition) => ({
    id: definition.id,
    label: definition.labels[localization.locale],
    imageUri: definition.imageUri,
    slotIndex: definition.slotIndex,
    groundSprite: createSouvenirGroundSpriteDefinition(
      definition.imageUri,
      definition.width,
      definition.height,
    ),
  }));
}
