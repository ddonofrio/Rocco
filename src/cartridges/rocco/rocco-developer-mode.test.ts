import { describe, expect, it } from 'vitest';

import { createRoccoLocalization } from './localization';
import {
  createRoccoCoralRelicInventoryItem,
  RoccoInventory,
  ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID,
} from './inventory';
import {
  createRoccoDeveloperInventoryItem,
  createRoccoDeveloperInventoryMenuDefinition,
} from './rocco-developer-mode';

describe('Rocco developer mode', () => {
  it('lists the coral relic in the developer inventory menu and can create it on demand', () => {
    const localization = createRoccoLocalization('es');
    const inventory = new RoccoInventory();

    const menu = createRoccoDeveloperInventoryMenuDefinition(localization, inventory);

    expect(menu.items.some((item) => item.id === ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID)).toBe(true);
    expect(createRoccoDeveloperInventoryItem(localization, ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID)).toMatchObject(
      {
        id: ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID,
        label: createRoccoCoralRelicInventoryItem(localization).label,
      },
    );
  });
});
