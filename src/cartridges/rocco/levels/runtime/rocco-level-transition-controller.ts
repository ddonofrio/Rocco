import type { RoccoPoint } from '../../../../console/video/sprites';
import { ROCCO_DEFAULT_GAME_CONNECTIONS } from '../../games/rocco-default/game-structure';
import {
  RpceTransitionController,
  type RpceLevelConnectionEndpoint,
  type RpceResolvedLevelTransition,
} from '../../rpce/core';
import type { RoccoLevelConnector } from '../rocco-level-types';

export type RoccoLevelConnectionEndpoint = RpceLevelConnectionEndpoint;
export type RoccoResolvedLevelTransition = RpceResolvedLevelTransition;

export interface RoccoLevelTransitionControllerOptions {
  canTraverseConnector: (connector: RoccoLevelConnector) => boolean;
  resolvePlayerGroundPoint: () => RoccoPoint | undefined;
}

export class RoccoLevelTransitionController extends RpceTransitionController {
  constructor(options: RoccoLevelTransitionControllerOptions) {
    super({
      connections: ROCCO_DEFAULT_GAME_CONNECTIONS,
      canTraverseConnector: options.canTraverseConnector,
      resolvePlayerGroundPoint: options.resolvePlayerGroundPoint,
    });
  }
}
