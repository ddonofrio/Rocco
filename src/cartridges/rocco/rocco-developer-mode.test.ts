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
  isRoccoDeveloperModeEnabled,
  ROCCO_PLAYER_DEVELOPER_ACTION_ID,
} from './rocco-developer-mode';
import { createRoccoPlayerActionMenuDefinition } from './rocco-player-action-menu';

describe('Rocco developer mode', () => {
  it('defaults to disabled when no engine flag is available', () => {
    const localization = createRoccoLocalization('en');
    const menu = createRoccoPlayerActionMenuDefinition(localization);

    expect(isRoccoDeveloperModeEnabled(undefined)).toBe(false);
    expect(
      menu.items.some((item) => item.actionId === ROCCO_PLAYER_DEVELOPER_ACTION_ID),
    ).toBe(false);
  });

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
