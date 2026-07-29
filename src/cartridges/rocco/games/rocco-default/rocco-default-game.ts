import type { RoccoLocalization } from './localization';
import {
  RoccoLevelManager,
  type RoccoLevelManagerMountResult,
  type RoccoLevelManagerOptions,
} from '../../levels/rocco-level-manager';
import type { RoccoLevel } from '../../levels/rocco-level-types';
import type { RpceGameDefinition } from '../../rpce/core';
import { createRoccoDefaultNetherMapStructure } from './maps/nether';
import { createRoccoDefaultPierMapStructure } from './maps/pier';
import { createRoccoDefaultShopMapStructure } from './maps/shop';
import { createRoccoDefaultFinalMapStructure } from './maps/final';
import { ROCCO_DEFAULT_GAME_CROSS_CONNECTIONS } from './game-structure';

export const ROCCO_DEFAULT_GAME_ID = 'rocco-default-game';

export function createRoccoDefaultGameDefinition(
  localization: RoccoLocalization,
): RpceGameDefinition<RoccoLevelManagerOptions, RoccoLevelManagerMountResult, RoccoLevel> {
  return {
    id: ROCCO_DEFAULT_GAME_ID,
    title: 'ROCCO',
    initialMapId: 'pier',
    maps: [
      createRoccoDefaultPierMapStructure(),
      createRoccoDefaultShopMapStructure(),
      createRoccoDefaultNetherMapStructure(),
      createRoccoDefaultFinalMapStructure(),
    ],
    connections: ROCCO_DEFAULT_GAME_CROSS_CONNECTIONS,
    createRuntimeController: (options) =>
      new RoccoLevelManager({
        ...options,
        localization: options.localization ?? localization,
      }),
  };
}
