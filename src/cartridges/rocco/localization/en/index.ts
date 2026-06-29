import type { RoccoTextCatalog } from '../types';
import { englishBaitShopText } from './bait-shop';
import { englishPelikanText, englishRoccoText, englishStanText } from './characters';
import { englishInventoryText } from './inventory';
import {
  englishBaitBucketText,
  englishFeedingText,
  englishKeysText,
  englishMiddleLevelText,
} from './pier';
import {
  englishActionsText,
  englishDescriptionsText,
  englishDeveloperText,
  englishLevelsText,
  englishManifestText,
} from './system';

export const roccoEnglishText: RoccoTextCatalog = {
  manifest: englishManifestText,
  actions: englishActionsText,
  descriptions: englishDescriptionsText,
  levels: englishLevelsText,
  baitBucket: englishBaitBucketText,
  feeding: englishFeedingText,
  keys: englishKeysText,
  inventory: englishInventoryText,
  developer: englishDeveloperText,
  rocco: englishRoccoText,
  pelikan: englishPelikanText,
  stan: englishStanText,
  middleLevel: englishMiddleLevelText,
  baitShop: englishBaitShopText,
};
