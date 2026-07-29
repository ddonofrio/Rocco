import type { RoccoLocalization } from '../../localization';
import type { RoccoLevel } from '../../../../levels/rocco-level-types';
import type { RpceMapDefinition } from '../../../../rpce/core';
import { RoccoFinalScreenSession } from '../../../../levels/runtime/rocco-final-screen-session';
import { RoccoFinalScreenLevel } from './final-screen-level';

export const ROCCO_DEFAULT_FINAL_MAP_ID = 'final';
export const ROCCO_FINAL_SCREEN_LEVEL_ID = 'final-screen';

export interface RoccoDefaultFinalMapOptions {
  localization: RoccoLocalization;
  finalScreenSession: RoccoFinalScreenSession;
}

export function createRoccoDefaultFinalMapStructure(): RpceMapDefinition {
  return {
    id: ROCCO_DEFAULT_FINAL_MAP_ID,
    title: 'Final Screen',
    initialLevelId: ROCCO_FINAL_SCREEN_LEVEL_ID,
    levels: [{ id: ROCCO_FINAL_SCREEN_LEVEL_ID, connectorIds: [] }],
    connections: [],
  };
}

export function createRoccoDefaultFinalMap(
  options: RoccoDefaultFinalMapOptions,
): RpceMapDefinition<RoccoLevel> {
  const structure = createRoccoDefaultFinalMapStructure();
  return {
    ...structure,
    levels: structure.levels.map((definition) => ({
      ...definition,
      createLevel: () =>
        new RoccoFinalScreenLevel(options.localization, options.finalScreenSession),
    })),
  };
}
