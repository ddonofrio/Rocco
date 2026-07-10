import type { RoccoSceneClickAction } from '../../../../console/cartridges';
import type { RoccoPoint } from '../../../../console/video/sprites';
import {
  containsRpceLevelRectPoint,
  findRpceLevelConnector,
  type RpceLevel,
  type RpceLevelConnector,
} from './rpce-level';
import type { RpceLevelConnection, RpceLevelConnectionEndpoint } from './rpce-map';

interface RpcePendingExitIntent {
  levelId: string;
  connectorId: string;
}

export interface RpceResolvedLevelTransition {
  fromLevelId: string;
  connector: RpceLevelConnector;
  targetEndpoint: RpceLevelConnectionEndpoint;
}

export interface RpceTransitionControllerOptions {
  connections: readonly RpceLevelConnection[];
  canTraverseConnector: (connector: RpceLevelConnector) => boolean;
  resolvePlayerGroundPoint: () => RoccoPoint | undefined;
}

export class RpceTransitionController {
  private readonly options: RpceTransitionControllerOptions;
  private pendingExitIntent: RpcePendingExitIntent | null = null;
  private transitionCooldownMs = 0;

  constructor(options: RpceTransitionControllerOptions) {
    this.options = options;
  }

  reset(): void {
    this.pendingExitIntent = null;
    this.transitionCooldownMs = 0;
  }

  clearPendingExitIntent(): void {
    this.pendingExitIntent = null;
  }

  setCooldown(durationMs: number): void {
    this.transitionCooldownMs = Math.max(0, Math.round(durationMs));
  }

  update(level: RpceLevel | null, deltaMs: number): RpceResolvedLevelTransition | null {
    this.transitionCooldownMs = Math.max(0, this.transitionCooldownMs - Math.max(0, deltaMs));
    if (!level || this.transitionCooldownMs > 0) {
      return null;
    }

    const connector = this.resolveTouchedConnector(level);
    if (!connector || !this.options.canTraverseConnector(connector)) {
      return null;
    }

    if (!this.matchesPendingExitIntent(level.id, connector.id)) {
      return null;
    }

    return this.resolveTransition(level.id, connector);
  }

  updatePendingExitIntent(level: RpceLevel | null, action: RoccoSceneClickAction): void {
    if (!level || action.targetInstanceId) {
      this.pendingExitIntent = null;
      return;
    }

    const connector = this.resolveClickedConnector(level, {
      x: action.sceneX,
      y: action.sceneY,
    });
    this.pendingExitIntent = connector
      ? {
          levelId: level.id,
          connectorId: connector.id,
        }
      : null;
  }

  resolveScriptedTransition(
    level: RpceLevel | null,
    connectorId: string,
  ): RpceResolvedLevelTransition | null {
    if (!level) {
      return null;
    }

    const connector = findRpceLevelConnector(level.connectors, connectorId);
    if (!connector || !this.options.canTraverseConnector(connector)) {
      return null;
    }

    return this.resolveTransition(level.id, connector);
  }

  private resolveTouchedConnector(level: RpceLevel): RpceLevelConnector | undefined {
    const playerGround = this.options.resolvePlayerGroundPoint();
    if (!playerGround) {
      return undefined;
    }

    return level.connectors.find(
      (connector) =>
        connector.exitArea && containsRpceLevelRectPoint(connector.exitArea, playerGround),
    );
  }

  private resolveClickedConnector(
    level: RpceLevel,
    scenePoint: RoccoPoint,
  ): RpceLevelConnector | undefined {
    return level.connectors.find(
      (connector) =>
        connector.exitArea && containsRpceLevelRectPoint(connector.exitArea, scenePoint),
    );
  }

  private matchesPendingExitIntent(levelId: string, connectorId: string): boolean {
    return (
      this.pendingExitIntent?.levelId === levelId &&
      this.pendingExitIntent.connectorId === connectorId
    );
  }

  private resolveTransition(
    fromLevelId: string,
    connector: RpceLevelConnector,
  ): RpceResolvedLevelTransition | null {
    const targetEndpoint = this.resolveConnectedEndpoint(fromLevelId, connector.id);
    if (!targetEndpoint) {
      return null;
    }

    return {
      fromLevelId,
      connector,
      targetEndpoint,
    };
  }

  private resolveConnectedEndpoint(
    levelId: string,
    connectorId: string,
  ): RpceLevelConnectionEndpoint | undefined {
    for (const connection of this.options.connections) {
      if (connection.a.levelId === levelId && connection.a.connectorId === connectorId) {
        return connection.b;
      }

      if (connection.b.levelId === levelId && connection.b.connectorId === connectorId) {
        return connection.a;
      }
    }

    return undefined;
  }
}
