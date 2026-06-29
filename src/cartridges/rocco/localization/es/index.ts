import type { RoccoTextCatalog } from '../types';
import { spanishBaitShopText } from './bait-shop';
import { spanishPelikanText, spanishRoccoText, spanishStanText } from './characters';
import { spanishInventoryText } from './inventory';
import {
  spanishBaitBucketText,
  spanishFeedingText,
  spanishKeysText,
  spanishMiddleLevelText,
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
  baitShop: spanishBaitShopText,
};
