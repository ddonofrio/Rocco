import type { RoccoLevel } from '../../levels/rocco-level-types';
import type { RpceLevelConnection, RpceMapDefinition } from '../../rpce/core';
import {
  createRoccoDefaultNetherMap,
  type RoccoDefaultNetherMapOptions,
  ROCCO_DEFAULT_NETHER_CONNECTIONS,
  ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID,
} from './maps/nether';
import {
  createRoccoDefaultPierMap,
  type RoccoDefaultPierMapOptions,
  ROCCO_DEFAULT_PIER_CONNECTIONS,
} from './maps/pier';
import {
  createRoccoDefaultShopMap,
  type RoccoDefaultShopMapOptions,
  ROCCO_DEFAULT_SHOP_CONNECTIONS,
  ROCCO_BAIT_SHOP_TOILET_LEVEL_ID,
} from './maps/shop';

export interface RoccoDefaultGameMapsOptions
  extends RoccoDefaultPierMapOptions,
    RoccoDefaultShopMapOptions,
    RoccoDefaultNetherMapOptions {}

const ROCCO_BAIT_SHOP_TOILET_PORTAL_CONNECTOR_ID = 'portal';
const ROCCO_NETHER_ENTRY_CONNECTOR_ID = 'entry';

export const ROCCO_DEFAULT_GAME_CONNECTIONS: readonly RpceLevelConnection[] = [
  ...ROCCO_DEFAULT_PIER_CONNECTIONS,
  ...ROCCO_DEFAULT_SHOP_CONNECTIONS,
  {
    a: {
      levelId: ROCCO_BAIT_SHOP_TOILET_LEVEL_ID,
      connectorId: ROCCO_BAIT_SHOP_TOILET_PORTAL_CONNECTOR_ID,
    },
    b: {
      levelId: ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID,
      connectorId: ROCCO_NETHER_ENTRY_CONNECTOR_ID,
    },
  },
  ...ROCCO_DEFAULT_NETHER_CONNECTIONS,
] as const;

export function createRoccoDefaultGameMaps(
  options: RoccoDefaultGameMapsOptions,
): readonly RpceMapDefinition<RoccoLevel>[] {
  return [
    createRoccoDefaultPierMap(options),
    createRoccoDefaultShopMap(options),
    createRoccoDefaultNetherMap(options),
  ];
}
