import {
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_SPRITE_Y_VALUES,
  PIER_BACKGROUND_SCROLL_LEFT_X,
  PIER_BACKGROUND_SCROLL_RIGHT_X,
  PIER_END_SCENE_ID,
  PIER_LEVEL_EXIT_TRIGGER_WIDTH,
  PIER_PLAYER_LEFT_ENTRY_X,
  PIER_PLAYER_RIGHT_ENTRY_X,
  PIER_START_SCENE_ID,
  ROCCO_PIER_END_LEVEL_ID,
  ROCCO_PIER_MIDDLE_LEVEL_ID,
  ROCCO_PIER_START_LEVEL_ID,
} from '../../constants';
import type { RoccoLocalization } from '../../localization';
import type { RoccoLevel, RoccoLevelConnector } from '../../../../levels/rocco-level-types';
import type { RpceMapDefinition, RpceLevelConnection } from '../../../../rpce/core';
import {
  installPierBeginningAmbient,
  RoccoPierMiddleLevel,
  RoccoPierSideLevel,
  type RoccoPierSideLevelDefinition,
} from './levels';

export const ROCCO_DEFAULT_PIER_MAP_ID = 'pier';

export interface RoccoDefaultPierMapOptions {
  localization: RoccoLocalization;
  mountPierBeginningAmbient?: NonNullable<RoccoPierSideLevelDefinition['mountAmbient']>;
}

const DEFAULT_ENTRY_Y = DEFAULT_SPRITE_Y_VALUES[0] ?? 180;

const PIER_START_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: 'west',
    exitArea: {
      x: 0,
      y: 0,
      width: PIER_LEVEL_EXIT_TRIGGER_WIDTH,
      height: DEFAULT_DESIGN_HEIGHT,
    },
    entryPoint: {
      x: PIER_PLAYER_LEFT_ENTRY_X,
      y: DEFAULT_ENTRY_Y,
    },
    entryFacing: 'right',
  },
  {
    id: 'shop-exit',
    exitArea: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    },
    entryPoint: {
      x: 850,
      y: DEFAULT_ENTRY_Y - 30,
    },
    entryFacing: 'down',
  },
] as const;

const PIER_END_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: 'east',
    exitArea: {
      x: DEFAULT_DESIGN_WIDTH - PIER_LEVEL_EXIT_TRIGGER_WIDTH,
      y: 0,
      width: PIER_LEVEL_EXIT_TRIGGER_WIDTH,
      height: DEFAULT_DESIGN_HEIGHT,
    },
    entryPoint: {
      x: PIER_PLAYER_RIGHT_ENTRY_X,
      y: DEFAULT_ENTRY_Y,
    },
    entryFacing: 'left',
  },
] as const;

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
    ((engine, localization, persistentState, preloader) =>
      installPierBeginningAmbient(engine, localization, persistentState, preloader));

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
          new RoccoPierSideLevel({
            id: ROCCO_PIER_START_LEVEL_ID,
            title: options.localization.text.levels.beginning,
            sceneId: PIER_START_SCENE_ID,
            backgroundScrollX: PIER_BACKGROUND_SCROLL_RIGHT_X,
            connectors: PIER_START_CONNECTORS,
            localization: options.localization,
            mountAmbient,
          }),
      },
      {
        id: ROCCO_PIER_END_LEVEL_ID,
        createLevel: () =>
          new RoccoPierSideLevel({
            id: ROCCO_PIER_END_LEVEL_ID,
            title: options.localization.text.levels.end,
            sceneId: PIER_END_SCENE_ID,
            backgroundScrollX: PIER_BACKGROUND_SCROLL_LEFT_X,
            connectors: PIER_END_CONNECTORS,
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
