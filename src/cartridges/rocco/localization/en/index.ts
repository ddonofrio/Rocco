import type { RoccoTextCatalog } from '../types';
import { englishBaitShopText } from './bait-shop';
import { englishPelikanText, englishRoccoText, englishStanText } from './characters';
import { englishInventoryText } from './inventory';
import { englishNetherText } from './nether';
import { englishFinalScreenText } from './final-screen';
import {
  englishBaitBucketText,
  englishFeedingText,
  englishKeysText,
  englishMiddleLevelText,
  englishPierDoorText,
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
  pierDoor: englishPierDoorText,
  baitShop: englishBaitShopText,
  nether: englishNetherText,
  finalScreen: englishFinalScreenText,
};
