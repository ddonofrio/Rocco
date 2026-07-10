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
  return {
    id: ROCCO_DEFAULT_NETHER_MAP_ID,
    title: 'Nether',
    initialLevelId: ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID,
    levels: [
      {
        id: ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID,
        createLevel: () => new RoccoNetherConsoleHardwareSpawnLevel(options.localization),
      },
      {
        id: ROCCO_NETHER_END_OF_HALLWAY_DOOR_LEVEL_ID,
        createLevel: () => new RoccoNetherEndOfHallwayDoorLevel(options.localization),
      },
      {
        id: ROCCO_NETHER_RESET_OFFICE_LEVEL_ID,
        createLevel: () => new RoccoNetherResetOfficeLevel(options.localization),
      },
      {
        id: ROCCO_NETHER_RESET_OFFICE_SECOND_LEVEL_ID,
        createLevel: () => new RoccoNetherResetOfficeSecondLevel(options.localization),
      },
    ],
    connections: ROCCO_DEFAULT_NETHER_CONNECTIONS,
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
