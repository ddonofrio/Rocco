import { describe, expect, it } from 'vitest';

import { createRoccoLocalization } from '../../../../src/cartridges/rocco/localization';
import {
  DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID,
  DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
} from '../../../../src/cartridges/rocco/rocco-default-constants';
import {
  createRoccoBataInventoryItem,
  createRoccoKeysInventoryItem,
  createRoccoMagazineInventoryItem,
  createRoccoMysteriousKeyInventoryItem,
  createRoccoSpiralRazorInventoryItem,
  createRoccoTwentyEurosInventoryItem,
  planRoccoCoralRelicAssembly,
  RoccoInventory,
  ROCCO_INVENTORY_ABYSSAL_TALISMAN_ITEM_ID,
  ROCCO_INVENTORY_BATA_ITEM_ID,
  ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID,
  ROCCO_INVENTORY_FLOATING_AMULET_ITEM_ID,
  ROCCO_INVENTORY_KEYS_ITEM_ID,
  ROCCO_INVENTORY_MENU_ID,
  ROCCO_INVENTORY_SPIRAL_RAZOR_ITEM_ID,
  ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
  ROCCO_PLAYER_INVENTORY_STORAGE_ID,
} from '../../../../src/cartridges/rocco/inventory/rocco-inventory';
import { resolveRoccoInventoryUseLines } from '../../../../src/cartridges/rocco/inventory/rocco-inventory-interactions';
import {
  BAIT_SHOP_SOUVENIR_AMBER_TURRITELLA_ITEM_ID,
  BAIT_SHOP_SOUVENIR_BEACH_NECKLACE_ITEM_ID,
  BAIT_SHOP_SOUVENIR_JAPANESE_FLOAT_ITEM_ID,
  BAIT_SHOP_SOUVENIR_RAZOR_SHELL_ITEM_ID,
  BAIT_SHOP_SOUVENIR_RED_CORAL_ITEM_ID,
  createBaitShopSouvenirTableItems,
} from '../../../../src/cartridges/rocco/inventory/souvenir-table-items';

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
      title: localization.text.inventory.title,
      columns: 3,
      rows: 3,
      reorderable: true,
      items: [
        {
          id: ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
          label: localization.text.inventory.twentyEurosLabel,
          slotIndex: 0,
        },
        {
          id: ROCCO_INVENTORY_KEYS_ITEM_ID,
          label: localization.text.inventory.keysLabel,
          slotIndex: 4,
        },
      ],
    });
  });

  it('resolves cartridge-specific use lines for carried inventory items', () => {
    const localization = createRoccoLocalization('es');

    expect(
      resolveRoccoInventoryUseLines({
        itemId: ROCCO_INVENTORY_KEYS_ITEM_ID,
        targetInstanceId: DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID,
        localization,
      }),
    ).toEqual(localization.text.inventory.keysOnBaitBucketLines);

    expect(
      resolveRoccoInventoryUseLines({
        itemId: ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
        targetInstanceId: DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
        localization,
      }),
    ).toEqual(localization.text.inventory.moneyOnPelikanLines);

    expect(
      resolveRoccoInventoryUseLines({
        itemId: 'unknown-item',
        targetInstanceId: 'unknown-target',
        localization,
      }),
    ).toEqual(localization.text.inventory.cannotUseItemLines);
  });

  it('rejects adding a tenth item once the 3x3 inventory is full', () => {
    const localization = createRoccoLocalization('en');
    const inventory = new RoccoInventory();
    const souvenirs = createBaitShopSouvenirTableItems(localization);

    inventory.addItem(createRoccoTwentyEurosInventoryItem(localization));
    inventory.addItem(createRoccoKeysInventoryItem(localization));
    inventory.addItem(createRoccoMysteriousKeyInventoryItem(localization));
    inventory.addItem(createRoccoMagazineInventoryItem(localization, true));
    for (const souvenir of souvenirs.slice(0, 5)) {
      inventory.addItem(souvenir);
    }

    expect(inventory.listItems()).toHaveLength(9);
    expect(inventory.hasOpenSlot()).toBe(false);
    expect(inventory.listItems().map((item) => item.slotIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const overflowItem = souvenirs[5];
    expect(overflowItem).toBeDefined();
    if (!overflowItem) {
      throw new Error('Expected a tenth souvenir item for the overflow check.');
    }
    expect(() => inventory.addItem(overflowItem)).toThrow("Storage 'rocco-player-inventory' is full.");
    expect(inventory.listItems()).toHaveLength(9);
  });

  it('reads fused item labels from the localization catalog', () => {
    const spanishLocalization = createRoccoLocalization('es');
    const englishLocalization = createRoccoLocalization('en');

    expect(createRoccoSpiralRazorInventoryItem(spanishLocalization).label).toBe(
      spanishLocalization.text.inventory.spiralRazorLabel,
    );
    expect(createRoccoSpiralRazorInventoryItem(englishLocalization).label).toBe(
      englishLocalization.text.inventory.spiralRazorLabel,
    );
  });

  it('builds the remaining Coral Relic recipe steps from accessible items', () => {
    expect(
      planRoccoCoralRelicAssembly([
        BAIT_SHOP_SOUVENIR_JAPANESE_FLOAT_ITEM_ID,
        BAIT_SHOP_SOUVENIR_BEACH_NECKLACE_ITEM_ID,
        BAIT_SHOP_SOUVENIR_AMBER_TURRITELLA_ITEM_ID,
        BAIT_SHOP_SOUVENIR_RAZOR_SHELL_ITEM_ID,
        BAIT_SHOP_SOUVENIR_RED_CORAL_ITEM_ID,
      ]),
    ).toEqual({
      status: 'craftable',
      steps: [
        {
          ingredientIds: [
            BAIT_SHOP_SOUVENIR_AMBER_TURRITELLA_ITEM_ID,
            BAIT_SHOP_SOUVENIR_RAZOR_SHELL_ITEM_ID,
          ],
          resultItemId: ROCCO_INVENTORY_SPIRAL_RAZOR_ITEM_ID,
        },
        {
          ingredientIds: [
            BAIT_SHOP_SOUVENIR_JAPANESE_FLOAT_ITEM_ID,
            BAIT_SHOP_SOUVENIR_BEACH_NECKLACE_ITEM_ID,
          ],
          resultItemId: ROCCO_INVENTORY_FLOATING_AMULET_ITEM_ID,
        },
        {
          ingredientIds: [
            ROCCO_INVENTORY_SPIRAL_RAZOR_ITEM_ID,
            ROCCO_INVENTORY_FLOATING_AMULET_ITEM_ID,
          ],
          resultItemId: ROCCO_INVENTORY_ABYSSAL_TALISMAN_ITEM_ID,
        },
        {
          ingredientIds: [
            ROCCO_INVENTORY_ABYSSAL_TALISMAN_ITEM_ID,
            BAIT_SHOP_SOUVENIR_RED_CORAL_ITEM_ID,
          ],
          resultItemId: ROCCO_INVENTORY_CORAL_RELIC_ITEM_ID,
        },
      ],
    });
  });

  it('marks the Coral Relic as missing when the accessible items cannot complete the recipe', () => {
    expect(
      planRoccoCoralRelicAssembly([
        BAIT_SHOP_SOUVENIR_JAPANESE_FLOAT_ITEM_ID,
        BAIT_SHOP_SOUVENIR_BEACH_NECKLACE_ITEM_ID,
        BAIT_SHOP_SOUVENIR_RED_CORAL_ITEM_ID,
      ]),
    ).toEqual({
      status: 'missing',
      steps: [],
    });
  });
});

describe('createRoccoBataInventoryItem', () => {
  it('builds a lab-coat inventory item bound to the player storage', () => {
    const localization = createRoccoLocalization('es');
    const item = createRoccoBataInventoryItem(localization);

    expect(item.id).toBe(ROCCO_INVENTORY_BATA_ITEM_ID);
    expect(item.label).toBe(localization.text.inventory.bataLabel);
    expect(item.imageUri).toContain('lab-coat.png');
    expect(item.allowedStorageIds).toEqual([ROCCO_PLAYER_INVENTORY_STORAGE_ID]);
    expect(item.groundSprite).toBeDefined();
  });
});
