import type { RoccoSceneClickAction } from '../../../../console/cartridges';
import type { RoccoPoint } from '../../../../console/video/sprites';
import {
  isRpceLevelRectPoint,
  findRpceLevelConnector,
  type RpceLevel,
  type RpceLevelConnector,
} from './rpce-level';
import type { RpceLevelConnectionEndpoint } from './rpce-map';

interface RpcePendingExitIntent {
  levelId: string;
  connectorId: string;
}

export interface RpceTransitionControllerSnapshot {
  pendingExitIntent: RpcePendingExitIntent | null;
  transitionCooldownMs: number;
}

export interface RpceResolvedLevelTransition {
  fromLevelId: string;
  connector: RpceLevelConnector;
  targetEndpoint: RpceLevelConnectionEndpoint;
}

export interface RpceTransitionControllerOptions {
  resolveConnectedEndpoint: (
    levelId: string,
    connectorId: string,
  ) => RpceLevelConnectionEndpoint | null;
  canTraverseConnector: (connector: RpceLevelConnector) => boolean;
  resolvePlayerGroundPoint: () => RoccoPoint | undefined;
}

function nullValue<T>(): T {
  return JSON.parse('null') as T;
}

export class RpceTransitionController {
  private readonly options: RpceTransitionControllerOptions;
  private pendingExitIntent: RpcePendingExitIntent | null = nullValue();
  private transitionCooldownMs = 0;

  constructor(options: RpceTransitionControllerOptions) {
    this.options = options;
  }

  private resolveTouchedConnector(level: RpceLevel): RpceLevelConnector | undefined {
    const playerGround = this.options.resolvePlayerGroundPoint();
    if (!playerGround) {
      return undefined;
    }

    return level.connectors.find(
      (connector) =>
        connector.exitArea && isRpceLevelRectPoint(connector.exitArea, playerGround),
    );
  }

  private resolveClickedConnector(
    level: RpceLevel,
    scenePoint: RoccoPoint,
  ): RpceLevelConnector | undefined {
    return level.connectors.find(
      (connector) =>
        connector.exitArea && isRpceLevelRectPoint(connector.exitArea, scenePoint),
    );
  }

  private matchesPendingExitIntent(levelId: string, connectorId: string): boolean {
    return (
      this.pendingExitIntent?.levelId === levelId &&
      this.pendingExitIntent.connectorId === connectorId
    );
  }

  private clearPendingExitIntentState(): void {
    this.pendingExitIntent = nullValue();
  }

  private resolveTransition(
    fromLevelId: string,
    connector: RpceLevelConnector,
  ): RpceResolvedLevelTransition | null {
    const targetEndpoint = this.options.resolveConnectedEndpoint(fromLevelId, connector.id);
    if (!targetEndpoint) {
      return nullValue();
    }

    return {
      fromLevelId,
      connector,
      targetEndpoint,
    };
  }

  reset(): void {
    this.clearPendingExitIntentState();
    this.transitionCooldownMs = 0;
  }

  clearPendingExitIntent(): void {
    this.clearPendingExitIntentState();
  }

  setCooldown(durationMs: number): void {
    this.transitionCooldownMs = Math.max(0, Math.round(durationMs));
  }

  createSnapshot(): RpceTransitionControllerSnapshot {
    return {
      pendingExitIntent: this.pendingExitIntent ? { ...this.pendingExitIntent } : nullValue(),
      transitionCooldownMs: this.transitionCooldownMs,
    };
  }

  restoreSnapshot(snapshot: RpceTransitionControllerSnapshot): void {
    this.pendingExitIntent = snapshot.pendingExitIntent
      ? { ...snapshot.pendingExitIntent }
      : nullValue();
    this.transitionCooldownMs = Math.max(0, Math.round(snapshot.transitionCooldownMs));
  }

  update(level: RpceLevel | null, deltaMs: number): RpceResolvedLevelTransition | null {
    this.transitionCooldownMs = Math.max(0, this.transitionCooldownMs - Math.max(0, deltaMs));
    if (!level || this.transitionCooldownMs > 0) {
      return nullValue();
    }

    const connector = this.resolveTouchedConnector(level);
    if (!connector || !this.options.canTraverseConnector(connector)) {
      return nullValue();
    }

    if (!this.matchesPendingExitIntent(level.id, connector.id)) {
      return nullValue();
    }

    return this.resolveTransition(level.id, connector);
  }

  updatePendingExitIntent(level: RpceLevel | null, action: RoccoSceneClickAction): void {
    if (!level || action.targetInstanceId) {
      this.clearPendingExitIntentState();
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
      : nullValue();
  }

  resolveScriptedTransition(
    level: RpceLevel | null,
    connectorId: string,
  ): RpceResolvedLevelTransition | null {
    if (!level) {
      return nullValue();
    }

    const connector = findRpceLevelConnector(level.connectors, connectorId);
    if (!connector || !this.options.canTraverseConnector(connector)) {
      return nullValue();
    }

    return this.resolveTransition(level.id, connector);
  }
}
