import { DEFAULT_SPRITE_SCALE } from '../rocco-default-constants';
import type { RoccoLocalization } from '../localization';
import type { RoccoInventoryGroundSpriteDefinition, RoccoInventoryItem } from './types';

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

const souvenirTableAssetUrls = {
  amberSpiral: new URL('./assets/souvenirs/amber-spiral.png', import.meta.url).href,
  amberStar: new URL('./assets/souvenirs/amber-star.png', import.meta.url).href,
  amberTurritella: new URL('./assets/souvenirs/amber-turritella.png', import.meta.url).href,
  beachNecklace: new URL('./assets/souvenirs/beach-necklace.png', import.meta.url).href,
  copperFan: new URL('./assets/souvenirs/copper-fan.png', import.meta.url).href,
  goldenNautilus: new URL('./assets/souvenirs/golden-nautilus.png', import.meta.url).href,
  goldenScallop: new URL('./assets/souvenirs/golden-scallop.png', import.meta.url).href,
  hollowUrchin: new URL('./assets/souvenirs/hollow-urchin.png', import.meta.url).href,
  horseshoeCrab: new URL('./assets/souvenirs/horseshoe-crab.png', import.meta.url).href,
  japaneseFloat: new URL('./assets/souvenirs/japanese-float.png', import.meta.url).href,
  razorShell: new URL('./assets/souvenirs/razor-shell.png', import.meta.url).href,
  redCoral: new URL('./assets/souvenirs/red-coral.png', import.meta.url).href,
  seaDollar: new URL('./assets/souvenirs/sea-dollar.png', import.meta.url).href,
  speckledCowrie: new URL('./assets/souvenirs/speckled-cowrie.png', import.meta.url).href,
  spinyMurex: new URL('./assets/souvenirs/spiny-murex.png', import.meta.url).href,
  stripedClam: new URL('./assets/souvenirs/striped-clam.png', import.meta.url).href,
  stripedUrchin: new URL('./assets/souvenirs/striped-urchin.png', import.meta.url).href,
  tigerCone: new URL('./assets/souvenirs/tiger-cone.png', import.meta.url).href,
  towerShell: new URL('./assets/souvenirs/tower-shell.png', import.meta.url).href,
} as const;

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
    scaleRelativeToRoccoBase: spriteScaleAtDefaultRoccoScale / DEFAULT_SPRITE_SCALE,
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
      imageUri: souvenirTableAssetUrls.seaDollar,
      slotIndex: 0,
      width: 300,
      height: 300,
      labels: {
        en: 'Sea Dollar',
        es: 'D\u00f3lar marino',
      },
    },
    {
      id: 'souvenir-horseshoe-crab',
      imageUri: souvenirTableAssetUrls.horseshoeCrab,
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
      imageUri: souvenirTableAssetUrls.stripedClam,
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
      imageUri: souvenirTableAssetUrls.beachNecklace,
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
      imageUri: souvenirTableAssetUrls.goldenNautilus,
      slotIndex: 4,
      width: 300,
      height: 300,
      labels: {
        en: 'Golden Nautilus',
        es: 'N\u00e1utilo dorado',
      },
    },
    {
      id: 'souvenir-hollow-urchin',
      imageUri: souvenirTableAssetUrls.hollowUrchin,
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
      imageUri: souvenirTableAssetUrls.spinyMurex,
      slotIndex: 6,
      width: 300,
      height: 300,
      labels: {
        en: 'Spiny Murex',
        es: 'M\u00farice espinoso',
      },
    },
    {
      id: 'souvenir-tower-shell',
      imageUri: souvenirTableAssetUrls.towerShell,
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
      imageUri: souvenirTableAssetUrls.razorShell,
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
      imageUri: souvenirTableAssetUrls.redCoral,
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
      imageUri: souvenirTableAssetUrls.amberStar,
      slotIndex: 10,
      width: 300,
      height: 300,
      labels: {
        en: 'Amber Star',
        es: 'Estrella \u00e1mbar',
      },
    },
    {
      id: 'souvenir-copper-fan',
      imageUri: souvenirTableAssetUrls.copperFan,
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
      imageUri: souvenirTableAssetUrls.japaneseFloat,
      slotIndex: 12,
      width: 300,
      height: 300,
      labels: {
        en: 'Japanese Float',
        es: 'Flotador japon\u00e9s',
      },
    },
    {
      id: 'souvenir-speckled-cowrie',
      imageUri: souvenirTableAssetUrls.speckledCowrie,
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
      imageUri: souvenirTableAssetUrls.amberTurritella,
      slotIndex: 14,
      width: 300,
      height: 300,
      labels: {
        en: 'Amber Turritella',
        es: 'Turritela \u00e1mbar',
      },
    },
    {
      id: 'souvenir-striped-urchin',
      imageUri: souvenirTableAssetUrls.stripedUrchin,
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
      imageUri: souvenirTableAssetUrls.amberSpiral,
      slotIndex: 17,
      width: 266,
      height: 265,
      labels: {
        en: 'Amber Spiral',
        es: 'Espiral \u00e1mbar',
      },
    },
    {
      id: 'souvenir-tiger-cone',
      imageUri: souvenirTableAssetUrls.tigerCone,
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
      imageUri: souvenirTableAssetUrls.goldenScallop,
      slotIndex: 19,
      width: 300,
      height: 300,
      labels: {
        en: 'Golden Scallop',
        es: 'Vieira dorada',
      },
    },
  ];

export const ROCCO_SOUVENIR_TABLE_ITEM_IMAGE_URLS = Object.values(souvenirTableAssetUrls);

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
