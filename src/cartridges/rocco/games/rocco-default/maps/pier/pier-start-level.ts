import type { RoccoLocalization } from '../../localization';
import type { RoccoLevelConnector } from '../../../../levels/rocco-level-types';
import type { RoccoPierSideLevelDefinition } from './pier-side-level';
import { RoccoPierSideLevel } from './pier-side-level';
import {
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_SPRITE_Y_VALUES,
  PIER_BACKGROUND_SCROLL_RIGHT_X,
  PIER_LEVEL_EXIT_TRIGGER_WIDTH,
  PIER_PLAYER_LEFT_ENTRY_X,
  PIER_START_SCENE_ID,
  ROCCO_PIER_START_LEVEL_ID,
} from '../../constants';

const DEFAULT_ENTRY_Y = DEFAULT_SPRITE_Y_VALUES[0] ?? 180;

export const PIER_START_CONNECTORS: readonly RoccoLevelConnector[] = [
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

export class RoccoPierStartLevel extends RoccoPierSideLevel {
  constructor(options: {
    localization: RoccoLocalization;
    mountAmbient?: RoccoPierSideLevelDefinition['mountAmbient'];
  }) {
    super({
      id: ROCCO_PIER_START_LEVEL_ID,
      title: options.localization.text.levels.beginning,
      sceneId: PIER_START_SCENE_ID,
      backgroundScrollX: PIER_BACKGROUND_SCROLL_RIGHT_X,
      connectors: PIER_START_CONNECTORS,
      localization: options.localization,
      mountAmbient: options.mountAmbient,
    });
  }
}
