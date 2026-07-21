import type { RoccoLocalization } from '../localization';
import { ROCCO_PLAYER_CONFIG } from '../games/rocco-default/player/rocco-player-config';
import { PIER_BAIT_BUCKET_CONFIG } from '../games/rocco-default/maps/pier/pier-bait-bucket-config';
import { PIER_PELIKAN_CONFIG } from '../games/rocco-default/maps/pier/pier-pelikan-config';
import {
  ROCCO_INVENTORY_KEYS_ITEM_ID,
  ROCCO_INVENTORY_MAGAZINE_ITEM_ID,
  ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
} from './rocco-inventory';

interface ResolveRoccoInventoryUseLinesOptions {
  itemId: string;
  targetInstanceId: string;
  localization: RoccoLocalization;
}

export function resolveRoccoInventoryUseLines(
  options: ResolveRoccoInventoryUseLinesOptions,
): string[] {
  const { itemId, targetInstanceId, localization } = options;

  if (
    itemId === ROCCO_INVENTORY_MAGAZINE_ITEM_ID &&
    targetInstanceId === ROCCO_PLAYER_CONFIG.ids.instance
  ) {
    return [localization.text.inventory.magazineOnSelfLine];
  }

  if (targetInstanceId === PIER_BAIT_BUCKET_CONFIG.spriteInstanceId) {
    if (itemId === ROCCO_INVENTORY_KEYS_ITEM_ID) {
      return localization.text.inventory.keysOnBaitBucketLines;
    }
    if (itemId === ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID) {
      return localization.text.inventory.moneyOnBaitBucketLines;
    }
  }

  if (targetInstanceId === PIER_PELIKAN_CONFIG.spriteInstanceId) {
    if (itemId === ROCCO_INVENTORY_KEYS_ITEM_ID) {
      return localization.text.inventory.keysOnPelikanLines;
    }
    if (itemId === ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID) {
      return localization.text.inventory.moneyOnPelikanLines;
    }
  }

  return localization.text.inventory.cannotUseItemLines;
}
