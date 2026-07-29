import type { RoccoTextCatalog } from '../types';
import { spanishBaitShopText } from './bait-shop';
import { spanishPelikanText, spanishRoccoText, spanishStanText } from './characters';
import { spanishInventoryText } from './inventory';
import { spanishNetherText } from './nether';
import { spanishFinalScreenText } from './final-screen';
import {
  spanishBaitBucketText,
  spanishFeedingText,
  spanishKeysText,
  spanishMiddleLevelText,
  spanishPierDoorText,
} from './pier';
import {
  spanishActionsText,
  spanishDescriptionsText,
  spanishDeveloperText,
  spanishLevelsText,
  spanishManifestText,
} from './system';

export const roccoSpanishText: RoccoTextCatalog = {
  manifest: spanishManifestText,
  actions: spanishActionsText,
  descriptions: spanishDescriptionsText,
  levels: spanishLevelsText,
  baitBucket: spanishBaitBucketText,
  feeding: spanishFeedingText,
  keys: spanishKeysText,
  inventory: spanishInventoryText,
  developer: spanishDeveloperText,
  rocco: spanishRoccoText,
  pelikan: spanishPelikanText,
  stan: spanishStanText,
  middleLevel: spanishMiddleLevelText,
  pierDoor: spanishPierDoorText,
  baitShop: spanishBaitShopText,
  nether: spanishNetherText,
  finalScreen: spanishFinalScreenText,
};
