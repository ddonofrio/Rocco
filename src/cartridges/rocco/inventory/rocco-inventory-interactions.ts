import type { RoccoLocalization } from '../localization';
import {
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID,
  DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
} from '../rocco-default-constants';
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
    targetInstanceId === DEFAULT_SPRITE_INSTANCE_ID
  ) {
    return [localization.text.inventory.magazineOnSelfLine];
  }

  if (targetInstanceId === DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID) {
    if (itemId === ROCCO_INVENTORY_KEYS_ITEM_ID) {
      return localization.text.inventory.keysOnBaitBucketLines;
    }
    if (itemId === ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID) {
      return localization.text.inventory.moneyOnBaitBucketLines;
    }
  }

  if (targetInstanceId === DEFAULT_PELIKAN_SPRITE_INSTANCE_ID) {
    if (itemId === ROCCO_INVENTORY_KEYS_ITEM_ID) {
      return localization.text.inventory.keysOnPelikanLines;
    }
    if (itemId === ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID) {
      return localization.text.inventory.moneyOnPelikanLines;
    }
  }

  return localization.text.inventory.cannotUseItemLines;
}
