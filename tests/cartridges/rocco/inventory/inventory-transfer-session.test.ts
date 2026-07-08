import { describe, expect, it } from 'vitest';

import { createRoccoLocalization } from '../../../../src/cartridges/rocco/localization';
import {
  createBaitShopSouvenirTableStorage,
  createRoccoKeysInventoryItem,
  RoccoInventory,
  RoccoInventoryTransferSession,
  ROCCO_INVENTORY_KEYS_ITEM_ID,
} from '../../../../src/cartridges/rocco/inventory/index';

describe('RoccoInventoryTransferSession', () => {
  it('builds the bait shop souvenir table storage with all configured items in scattered slots', () => {
    const storage = createBaitShopSouvenirTableStorage(createRoccoLocalization('es'));

    expect(storage.columns).toBe(5);
    expect(storage.rows).toBe(4);
    expect(storage.listItems().map((item) => item.id)).toEqual([
      'souvenir-sea-dollar',
      'souvenir-horseshoe-crab',
      'souvenir-striped-clam',
      'souvenir-beach-necklace',
      'souvenir-golden-nautilus',
      'souvenir-hollow-urchin',
      'souvenir-spiny-murex',
      'souvenir-tower-shell',
      'souvenir-razor-shell',
      'souvenir-red-coral',
      'souvenir-amber-star',
      'souvenir-copper-fan',
      'souvenir-japanese-float',
      'souvenir-speckled-cowrie',
      'souvenir-amber-turritella',
      'souvenir-striped-urchin',
      'souvenir-amber-spiral',
      'souvenir-tiger-cone',
      'souvenir-golden-scallop',
    ]);
    expect(storage.listItems().map((item) => item.slotIndex)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19,
    ]);
  });

  it('projects the souvenir table and Rocco inventory into a dual inventory menu without drop buttons', () => {
    const localization = createRoccoLocalization('en');
    const tableStorage = createBaitShopSouvenirTableStorage(localization);
    const inventory = new RoccoInventory();
    inventory.addItem(createRoccoKeysInventoryItem(localization));
    const session = new RoccoInventoryTransferSession({
      menuId: 'test-transfer-menu',
      leftStorage: tableStorage,
      rightStorage: inventory,
    });

    const definition = session.createGridMenuDefinition();

    expect(definition).toMatchObject({
      id: 'test-transfer-menu',
      showTitle: false,
      columns: 8,
      rows: 4,
      reorderable: true,
    });
    expect(definition.buttons).toBeUndefined();
    expect(definition.blockedSlotIndexes).toEqual([29, 30, 31]);
    expect(
      definition.items.find((item) => item.id === ROCCO_INVENTORY_KEYS_ITEM_ID),
    ).toMatchObject({
      id: ROCCO_INVENTORY_KEYS_ITEM_ID,
      slotIndex: 5,
      label: 'Keys',
    });
  });

  it('lets souvenirs move into Rocco inventory and rejects parking Rocco-only items on the table', () => {
    const localization = createRoccoLocalization('en');
    const tableStorage = createBaitShopSouvenirTableStorage(localization);
    const inventory = new RoccoInventory();
    inventory.addItem(createRoccoKeysInventoryItem(localization));
    const session = new RoccoInventoryTransferSession({
      menuId: 'test-transfer-menu',
      leftStorage: tableStorage,
      rightStorage: inventory,
    });

    const definition = session.createGridMenuDefinition();
    const souvenirItem = tableStorage.listItems()[0];

    expect(
      session.isActivationValid({
        kind: 'grid-menu',
        definitionId: definition.id,
        interaction: 'place',
        itemId: souvenirItem?.id,
        toSlotIndex: 6,
        items: definition.items,
      }),
    ).toBe(true);

    const movedItems = definition.items.map((item) => {
      if (item.id === souvenirItem?.id) {
        return {
          ...item,
          slotIndex: 6,
        };
      }

      return item;
    });

    expect(session.commitMenuItems(movedItems)).toBe(true);
    expect(tableStorage.hasItem(souvenirItem?.id ?? '')).toBe(false);
    expect(inventory.hasItem(souvenirItem?.id ?? '')).toBe(true);
    expect(inventory.getItem(souvenirItem?.id ?? '')?.slotIndex).toBe(1);

    expect(
      session.isActivationValid({
        kind: 'grid-menu',
        definitionId: definition.id,
        interaction: 'place',
        itemId: ROCCO_INVENTORY_KEYS_ITEM_ID,
        toSlotIndex: 0,
        items: movedItems,
      }),
    ).toBe(false);
  });

  it('rejects transfer commits that would stack two items into the same Rocco slot', () => {
    const localization = createRoccoLocalization('en');
    const tableStorage = createBaitShopSouvenirTableStorage(localization);
    const inventory = new RoccoInventory();
    inventory.addItem(createRoccoKeysInventoryItem(localization));
    const session = new RoccoInventoryTransferSession({
      menuId: 'test-transfer-menu',
      leftStorage: tableStorage,
      rightStorage: inventory,
    });

    const definition = session.createGridMenuDefinition();
    const souvenirItem = tableStorage.listItems()[0];
    const invalidItems = definition.items.map((item) =>
      item.id === souvenirItem?.id
        ? {
            ...item,
            slotIndex: 5,
          }
        : item,
    );

    expect(session.commitMenuItems(invalidItems)).toBe(false);
    expect(tableStorage.hasItem(souvenirItem?.id ?? '')).toBe(true);
    expect(inventory.hasItem(souvenirItem?.id ?? '')).toBe(false);
    expect(inventory.getItem(ROCCO_INVENTORY_KEYS_ITEM_ID)?.slotIndex).toBe(0);
  });
});
