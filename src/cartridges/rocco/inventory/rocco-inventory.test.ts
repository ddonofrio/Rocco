import { describe, expect, it } from 'vitest';

import { createRoccoLocalization } from '../localization';
import {
  createRoccoKeysInventoryItem,
  createRoccoTwentyEurosInventoryItem,
  RoccoInventory,
  ROCCO_INVENTORY_KEYS_ITEM_ID,
  ROCCO_INVENTORY_MENU_ID,
  ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
} from './rocco-inventory';

describe('RoccoInventory', () => {
  it('stores cartridge items and exposes them as a 3x3 grid menu', () => {
    const localization = createRoccoLocalization('es');
    const inventory = new RoccoInventory();

    inventory.addItem(createRoccoKeysInventoryItem(localization));
    inventory.addItem(createRoccoTwentyEurosInventoryItem(localization));
    inventory.applyGridMenuItems([
      {
        id: ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
        slotIndex: 0,
      },
      {
        id: ROCCO_INVENTORY_KEYS_ITEM_ID,
        slotIndex: 4,
      },
    ]);

    expect(inventory.hasItem(ROCCO_INVENTORY_KEYS_ITEM_ID)).toBe(true);
    expect(inventory.hasItem(ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID)).toBe(true);
    expect(inventory.listItems()).toHaveLength(2);
    expect(inventory.createGridMenuDefinition(localization)).toMatchObject({
      id: ROCCO_INVENTORY_MENU_ID,
      title: 'Inventario',
      columns: 3,
      rows: 3,
      reorderable: true,
      items: [
        {
          id: ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
          label: '20€',
          slotIndex: 0,
        },
        {
          id: ROCCO_INVENTORY_KEYS_ITEM_ID,
          label: 'Llaves',
          slotIndex: 4,
        },
      ],
    });
  });
});
