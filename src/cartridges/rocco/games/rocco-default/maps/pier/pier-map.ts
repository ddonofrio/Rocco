import {
  ROCCO_PIER_END_LEVEL_ID,
  ROCCO_PIER_MIDDLE_LEVEL_ID,
  ROCCO_PIER_START_LEVEL_ID,
} from '../../constants';
import type { RoccoLocalization } from '../../localization';
import type { RoccoLevel } from '../../../../levels/rocco-level-types';
import type { RpceMapDefinition, RpceLevelConnection } from '../../../../rpce/core';
import {
  installPierBeginningAmbient,
  RoccoPierEndLevel,
  RoccoPierMiddleLevel,
  RoccoPierStartLevel,
  type RoccoPierSideLevelDefinition,
} from './levels';

export const ROCCO_DEFAULT_PIER_MAP_ID = 'pier';

export interface RoccoDefaultPierMapOptions {
  localization: RoccoLocalization;
  mountPierBeginningAmbient?: NonNullable<RoccoPierSideLevelDefinition['mountAmbient']>;
}

export const ROCCO_DEFAULT_PIER_CONNECTIONS: readonly RpceLevelConnection[] = [
  {
    a: { levelId: ROCCO_PIER_MIDDLE_LEVEL_ID, connectorId: 'east' },
    b: { levelId: ROCCO_PIER_START_LEVEL_ID, connectorId: 'west' },
  },
  {
    a: { levelId: ROCCO_PIER_MIDDLE_LEVEL_ID, connectorId: 'west' },
    b: { levelId: ROCCO_PIER_END_LEVEL_ID, connectorId: 'east' },
  },
] as const;

export function createRoccoDefaultPierMap(
  options: RoccoDefaultPierMapOptions,
): RpceMapDefinition<RoccoLevel> {
  const mountAmbient =
    options.mountPierBeginningAmbient ??
    ((engine, localization, persistentState, preloader, entryConnectorId) =>
      installPierBeginningAmbient(engine, localization, persistentState, preloader, entryConnectorId));

  return {
    id: ROCCO_DEFAULT_PIER_MAP_ID,
    title: 'Pier',
    initialLevelId: ROCCO_PIER_MIDDLE_LEVEL_ID,
    levels: [
      {
        id: ROCCO_PIER_MIDDLE_LEVEL_ID,
        createLevel: () => new RoccoPierMiddleLevel(options.localization),
      },
      {
        id: ROCCO_PIER_START_LEVEL_ID,
        createLevel: () =>
          new RoccoPierStartLevel({
            localization: options.localization,
            mountAmbient,
          }),
      },
      {
        id: ROCCO_PIER_END_LEVEL_ID,
        createLevel: () => new RoccoPierEndLevel({
          localization: options.localization,
        }),
      },
    ],
    connections: ROCCO_DEFAULT_PIER_CONNECTIONS,
  };
}

export function createRoccoDefaultPierMapStructure(): RpceMapDefinition {
  return {
    id: ROCCO_DEFAULT_PIER_MAP_ID,
    title: 'Pier',
    initialLevelId: ROCCO_PIER_MIDDLE_LEVEL_ID,
    levels: [
      { id: ROCCO_PIER_START_LEVEL_ID },
      { id: ROCCO_PIER_MIDDLE_LEVEL_ID },
      { id: ROCCO_PIER_END_LEVEL_ID },
    ],
    connections: ROCCO_DEFAULT_PIER_CONNECTIONS,
  };
}
