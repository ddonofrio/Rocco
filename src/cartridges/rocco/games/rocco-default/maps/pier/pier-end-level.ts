import type { RoccoLocalization } from '../../localization';
import type { RoccoLevelConnector } from '../../../../levels/rocco-level-types';
import { RoccoPierSideLevel } from './pier-side-level';
import { ROCCO_PLAYER_CONFIG } from '../../player';
import { ROCCO_DESIGN_HEIGHT, ROCCO_DESIGN_WIDTH } from '../../game-design';
import {
  PIER_BACKGROUND_SCROLL_LEFT_X,
  PIER_LEVEL_EXIT_TRIGGER_WIDTH,
  PIER_PLAYER_RIGHT_ENTRY_X,
} from './pier-layout';
import { PIER_END_SCENE_ID, ROCCO_PIER_END_LEVEL_ID } from './pier-level-ids';

const DEFAULT_ENTRY_Y = ROCCO_PLAYER_CONFIG.placement.yValues[0] ?? 180;

export const PIER_END_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: 'east',
    exitArea: {
      x: ROCCO_DESIGN_WIDTH - PIER_LEVEL_EXIT_TRIGGER_WIDTH,
      y: 0,
      width: PIER_LEVEL_EXIT_TRIGGER_WIDTH,
      height: ROCCO_DESIGN_HEIGHT,
    },
    entryPoint: {
      x: PIER_PLAYER_RIGHT_ENTRY_X,
      y: DEFAULT_ENTRY_Y,
    },
    entryFacing: 'left',
  },
] as const;

export class RoccoPierEndLevel extends RoccoPierSideLevel {
  constructor(options: { localization: RoccoLocalization }) {
    super({
      id: ROCCO_PIER_END_LEVEL_ID,
      title: options.localization.text.levels.end,
      sceneId: PIER_END_SCENE_ID,
      backgroundScrollX: PIER_BACKGROUND_SCROLL_LEFT_X,
      connectors: PIER_END_CONNECTORS,
      localization: options.localization,
    });
  }
}
