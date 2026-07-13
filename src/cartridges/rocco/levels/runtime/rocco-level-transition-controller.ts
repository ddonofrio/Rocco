import type { RoccoPoint } from '../../../../console/video/sprites';
import type { RpceCompiledGame, RpceLevelConnectionEndpoint, RpceResolvedLevelTransition } from '../../rpce/core';
import { RpceTransitionController } from '../../rpce/core';
import type { RoccoLevelConnector } from '../rocco-level-types';

export type RoccoLevelConnectionEndpoint = RpceLevelConnectionEndpoint;
export type RoccoResolvedLevelTransition = RpceResolvedLevelTransition;

export interface RoccoLevelTransitionControllerOptions {
  compiledGame: RpceCompiledGame;
  canTraverseConnector: (connector: RoccoLevelConnector) => boolean;
  resolvePlayerGroundPoint: () => RoccoPoint | undefined;
}

export class RoccoLevelTransitionController extends RpceTransitionController {
  constructor(options: RoccoLevelTransitionControllerOptions) {
    super({
      resolveConnectedEndpoint: (levelId, connectorId) =>
        options.compiledGame.resolveConnectedEndpoint(levelId, connectorId),
      canTraverseConnector: options.canTraverseConnector,
      resolvePlayerGroundPoint: options.resolvePlayerGroundPoint,
    });
  }
}
