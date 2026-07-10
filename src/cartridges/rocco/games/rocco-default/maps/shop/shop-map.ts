import type { RoccoLocalization } from '../../localization';
import type { RoccoLevel } from '../../../../levels/rocco-level-types';
import type { RpceLevelConnection, RpceMapDefinition } from '../../../../rpce/core';
import {
  RoccoBaitShopLevel,
  RoccoBaitShopSecondLevel,
  RoccoBaitShopToiletLevel,
  ROCCO_BAIT_SHOP_LEVEL_ID,
  ROCCO_BAIT_SHOP_SECOND_LEVEL_ID,
  ROCCO_BAIT_SHOP_TOILET_LEVEL_ID,
  type RoccoBaitShopToiletLevelOptions,
} from './levels';

export const ROCCO_DEFAULT_SHOP_MAP_ID = 'shop';

export interface RoccoDefaultShopMapOptions {
  localization: RoccoLocalization;
  isStanIdentified: () => boolean;
  hasMysteriousKey: () => boolean;
  onMysteriousKeyCollected: () => boolean;
  hasMagazine: () => boolean;
  onMagazineCollected: (known: boolean) => boolean;
  hasCoralRelic: () => boolean;
  getCoralRelicAssemblyPlan: NonNullable<
    RoccoBaitShopToiletLevelOptions['getCoralRelicAssemblyPlan']
  >;
  allowToiletReuseDuringUrgency: () => boolean;
  openStorageInventory: (storageId: string, onInventoryClosed?: () => void) => void;
  closeStorageInventory: (storageId: string) => void;
}

export const ROCCO_DEFAULT_SHOP_CONNECTIONS: readonly RpceLevelConnection[] = [
  {
    a: { levelId: ROCCO_BAIT_SHOP_LEVEL_ID, connectorId: 'south' },
    b: { levelId: ROCCO_BAIT_SHOP_SECOND_LEVEL_ID, connectorId: 'south' },
  },
  {
    a: { levelId: ROCCO_BAIT_SHOP_SECOND_LEVEL_ID, connectorId: 'toilet-door' },
    b: { levelId: ROCCO_BAIT_SHOP_TOILET_LEVEL_ID, connectorId: 'south' },
  },
] as const;

export function createRoccoDefaultShopMap(
  options: RoccoDefaultShopMapOptions,
): RpceMapDefinition<RoccoLevel> {
  return {
    id: ROCCO_DEFAULT_SHOP_MAP_ID,
    title: 'Shop',
    initialLevelId: ROCCO_BAIT_SHOP_LEVEL_ID,
    levels: [
      {
        id: ROCCO_BAIT_SHOP_LEVEL_ID,
        createLevel: () =>
          new RoccoBaitShopLevel(options.localization, {
            isStanIdentified: options.isStanIdentified,
            hasMysteriousKey: options.hasMysteriousKey,
            onMysteriousKeyCollected: options.onMysteriousKeyCollected,
            onOpenStorageInventoryRequested: (storageId, onInventoryClosed) => {
              options.openStorageInventory(storageId, onInventoryClosed);
            },
            onCloseStorageInventoryRequested: (storageId) => {
              options.closeStorageInventory(storageId);
            },
          }),
      },
      {
        id: ROCCO_BAIT_SHOP_SECOND_LEVEL_ID,
        createLevel: () =>
          new RoccoBaitShopSecondLevel(options.localization, {
            hasMagazine: options.hasMagazine,
            hasMysteriousKey: options.hasMysteriousKey,
            onMagazineCollected: options.onMagazineCollected,
          }),
      },
      {
        id: ROCCO_BAIT_SHOP_TOILET_LEVEL_ID,
        createLevel: () =>
          new RoccoBaitShopToiletLevel(options.localization, {
            hasMagazine: options.hasMagazine,
            hasCoralRelic: options.hasCoralRelic,
            getCoralRelicAssemblyPlan: options.getCoralRelicAssemblyPlan,
            allowReuseDuringUrgency: options.allowToiletReuseDuringUrgency,
            isStanIdentified: options.isStanIdentified,
          }),
      },
    ],
    connections: ROCCO_DEFAULT_SHOP_CONNECTIONS,
  };
}

export function createRoccoDefaultShopMapStructure(): RpceMapDefinition {
  return {
    id: ROCCO_DEFAULT_SHOP_MAP_ID,
    title: 'Shop',
    initialLevelId: ROCCO_BAIT_SHOP_LEVEL_ID,
    levels: [
      { id: ROCCO_BAIT_SHOP_LEVEL_ID },
      { id: ROCCO_BAIT_SHOP_SECOND_LEVEL_ID },
      { id: ROCCO_BAIT_SHOP_TOILET_LEVEL_ID },
    ],
    connections: ROCCO_DEFAULT_SHOP_CONNECTIONS,
  };
}
