import type { RoccoLevel } from '../../levels/rocco-level-types';
import type { RpceLevelConnection, RpceMapDefinition } from '../../rpce/core';
import {
  createRoccoDefaultNetherMap,
  type RoccoDefaultNetherMapOptions,
  ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID,
} from './maps/nether';
import { createRoccoDefaultPierMap, type RoccoDefaultPierMapOptions } from './maps/pier';
import {
  createRoccoDefaultShopMap,
  type RoccoDefaultShopMapOptions,
  ROCCO_BAIT_SHOP_TOILET_LEVEL_ID,
} from './maps/shop';
import { createRoccoDefaultFinalMap, type RoccoDefaultFinalMapOptions } from './maps/final';

export interface RoccoDefaultGameMapsOptions
  extends
    RoccoDefaultPierMapOptions,
    RoccoDefaultShopMapOptions,
    RoccoDefaultNetherMapOptions,
    RoccoDefaultFinalMapOptions {}

const ROCCO_BAIT_SHOP_TOILET_PORTAL_CONNECTOR_ID = 'portal';
const ROCCO_NETHER_ENTRY_CONNECTOR_ID = 'entry';

/**
 * The only cross-map connection in the rocco-default game: the bait-shop toilet portal
 * links into the Nether entry connector. Per-map connections stay on their own map
 * definition; this is the single place that owns a link spanning two maps.
 */
export const ROCCO_DEFAULT_GAME_CROSS_CONNECTIONS: readonly RpceLevelConnection[] = [
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
] as const;

export function createRoccoDefaultGameMaps(
  options: RoccoDefaultGameMapsOptions,
): readonly RpceMapDefinition<RoccoLevel>[] {
  return [
    createRoccoDefaultPierMap(options),
    createRoccoDefaultShopMap(options),
    createRoccoDefaultNetherMap(options),
    createRoccoDefaultFinalMap(options),
  ];
}
