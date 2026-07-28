import { describe, expect, it } from 'vitest';

import { createRoccoLocalization } from '../../../src/cartridges/rocco/localization';
import {
  createRoccoCoralRelicInventoryItem,
  RoccoInventory,
  ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID,
} from '../../../src/cartridges/rocco/inventory';
import {
  createRoccoDeveloperEventMenuDefinition,
  createRoccoDeveloperRootMenuDefinition,
  createRoccoDeveloperInventoryItem,
  createRoccoDeveloperInventoryMenuDefinition,
  isRoccoDeveloperModeEnabled,
  ROCCO_DEVELOPER_EVENTS_CHOICE_ID,
  ROCCO_DEVELOPER_FINAL_SCREEN_CHOICE_ID,
  ROCCO_PLAYER_DEVELOPER_ACTION_ID,
} from '../../../src/cartridges/rocco/rocco-developer-mode';
import { createRoccoPlayerActionMenuDefinition } from '../../../src/cartridges/rocco/games/rocco-default/player';

describe('Rocco developer mode', () => {
  it('defaults to disabled when no engine flag is available', () => {
    const localization = createRoccoLocalization('en');
    const menu = createRoccoPlayerActionMenuDefinition(localization);

    expect(isRoccoDeveloperModeEnabled(undefined)).toBe(false);
    expect(menu.items.some((item) => item.actionId === ROCCO_PLAYER_DEVELOPER_ACTION_ID)).toBe(
      false,
    );
  });

  it('lists the coral relic in the developer inventory menu and can create it on demand', () => {
    const localization = createRoccoLocalization('es');
    const inventory = new RoccoInventory();

    const menu = createRoccoDeveloperInventoryMenuDefinition(localization, inventory);

    expect(menu.items.some((item) => item.id === ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID)).toBe(true);
    expect(
      createRoccoDeveloperInventoryItem(localization, ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID),
    ).toMatchObject({
      id: ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID,
      label: createRoccoCoralRelicInventoryItem(localization).label,
    });
  });

  it('includes the alter events entry in the developer root menu', () => {
    const localization = createRoccoLocalization('es');

    expect(
      createRoccoDeveloperRootMenuDefinition(localization).items.some(
        (item) => item.id === ROCCO_DEVELOPER_EVENTS_CHOICE_ID,
      ),
    ).toBe(true);
  });

  it('includes the final screen shortcut in the developer root menu', () => {
    const localization = createRoccoLocalization('es');

    expect(
      createRoccoDeveloperRootMenuDefinition(localization).items.some(
        (item) => item.id === ROCCO_DEVELOPER_FINAL_SCREEN_CHOICE_ID,
      ),
    ).toBe(true);
  });

  it('renders developer event toggles with localized ON and OFF labels', () => {
    const localization = createRoccoLocalization('es');
    const menu = createRoccoDeveloperEventMenuDefinition(localization, [
      {
        id: 'allow-toilet-reuse',
        text: localization.text.developer.allowToiletReuseEvent,
        enabled: false,
      },
      {
        id: 'allow-toilet-reuse-on',
        text: localization.text.developer.allowToiletReuseEvent,
        enabled: true,
      },
    ]);

    expect(menu.items).toMatchObject([
      {
        id: 'allow-toilet-reuse',
        label: `${localization.text.developer.allowToiletReuseEvent}: ${localization.text.developer.off}`,
      },
      {
        id: 'allow-toilet-reuse-on',
        label: `${localization.text.developer.allowToiletReuseEvent}: ${localization.text.developer.on}`,
      },
    ]);
  });
});
