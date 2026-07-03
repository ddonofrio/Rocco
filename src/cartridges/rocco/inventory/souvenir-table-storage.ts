import type { RoccoLocalization } from '../localization';
import { RoccoInventoryStorage } from './inventory-storage';
import { createBaitShopSouvenirTableItems } from './souvenir-table-items';

export const BAIT_SHOP_SOUVENIR_TABLE_STORAGE_ID = 'bait-shop-souvenir-table-storage';

export function createBaitShopSouvenirTableStorage(
  localization: RoccoLocalization,
): RoccoInventoryStorage {
  const storage = new RoccoInventoryStorage({
    id: BAIT_SHOP_SOUVENIR_TABLE_STORAGE_ID,
    columns: 5,
    rows: 4,
  });

  storage.replaceItems(createBaitShopSouvenirTableItems(localization));
  return storage;
}
