import type { RoccoLocalization } from '../../localization';
import type { RoccoLevel } from '../../../../levels/rocco-level-types';
import type { RpceLevelConnection, RpceMapDefinition } from '../../../../rpce/core';
import {
  RoccoNetherConsoleHardwareSpawnLevel,
  RoccoNetherEndOfHallwayDoorLevel,
  RoccoNetherResetOfficeLevel,
  RoccoNetherResetOfficeSecondLevel,
  ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID,
  ROCCO_NETHER_END_OF_HALLWAY_DOOR_LEVEL_ID,
  ROCCO_NETHER_RESET_OFFICE_LEVEL_ID,
  ROCCO_NETHER_RESET_OFFICE_SECOND_LEVEL_ID,
} from './levels';

export const ROCCO_DEFAULT_NETHER_MAP_ID = 'nether';

export interface RoccoDefaultNetherMapOptions {
  localization: RoccoLocalization;
}

export const ROCCO_DEFAULT_NETHER_CONNECTIONS: readonly RpceLevelConnection[] = [
  {
    a: { levelId: ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID, connectorId: 'north' },
    b: { levelId: ROCCO_NETHER_END_OF_HALLWAY_DOOR_LEVEL_ID, connectorId: 'south' },
  },
  {
    a: { levelId: ROCCO_NETHER_RESET_OFFICE_LEVEL_ID, connectorId: 'south' },
    b: { levelId: ROCCO_NETHER_RESET_OFFICE_SECOND_LEVEL_ID, connectorId: 'south' },
  },
] as const;

export function createRoccoDefaultNetherMap(
  options: RoccoDefaultNetherMapOptions,
): RpceMapDefinition<RoccoLevel> {
  const structure = createRoccoDefaultNetherMapStructure();
  const factories: Record<string, () => RoccoLevel> = {
    [ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID]: () =>
      new RoccoNetherConsoleHardwareSpawnLevel(options.localization),
    [ROCCO_NETHER_END_OF_HALLWAY_DOOR_LEVEL_ID]: () =>
      new RoccoNetherEndOfHallwayDoorLevel(options.localization),
    [ROCCO_NETHER_RESET_OFFICE_LEVEL_ID]: () =>
      new RoccoNetherResetOfficeLevel(options.localization),
    [ROCCO_NETHER_RESET_OFFICE_SECOND_LEVEL_ID]: () =>
      new RoccoNetherResetOfficeSecondLevel(options.localization),
  };

  return {
    ...structure,
    levels: structure.levels.map((definition) => ({
      ...definition,
      createLevel: factories[definition.id],
    })),
  };
}

export function createRoccoDefaultNetherMapStructure(): RpceMapDefinition {
  return {
    id: ROCCO_DEFAULT_NETHER_MAP_ID,
    title: 'Nether',
    initialLevelId: ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID,
    levels: [
      { id: ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID },
      { id: ROCCO_NETHER_END_OF_HALLWAY_DOOR_LEVEL_ID },
      { id: ROCCO_NETHER_RESET_OFFICE_LEVEL_ID },
      { id: ROCCO_NETHER_RESET_OFFICE_SECOND_LEVEL_ID },
    ],
    connections: ROCCO_DEFAULT_NETHER_CONNECTIONS,
  };
}
