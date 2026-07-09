import type { RoccoSceneClickAction } from '../../../../engine/cartridges';
import type { RoccoPoint } from '../../../../engine/video/sprites';
import {
  containsRoccoLevelRectPoint,
  findRoccoLevelConnector,
  type RoccoLevel,
  type RoccoLevelConnector,
} from '../rocco-level-types';

export interface RoccoLevelConnectionEndpoint {
  levelId: string;
  connectorId: string;
}

interface RoccoLevelConnection {
  a: RoccoLevelConnectionEndpoint;
  b: RoccoLevelConnectionEndpoint;
}

interface RoccoPendingExitIntent {
  levelId: string;
  connectorId: string;
}

export interface RoccoResolvedLevelTransition {
  fromLevelId: string;
  connector: RoccoLevelConnector;
  targetEndpoint: RoccoLevelConnectionEndpoint;
}

export interface RoccoLevelTransitionControllerOptions {
  canTraverseConnector: (connector: RoccoLevelConnector) => boolean;
  resolvePlayerGroundPoint: () => RoccoPoint | undefined;
}

const ROCCO_LEVEL_CONNECTIONS: readonly RoccoLevelConnection[] = [
  {
    a: { levelId: 'pier-middle', connectorId: 'east' },
    b: { levelId: 'pier-start', connectorId: 'west' },
  },
  {
    a: { levelId: 'pier-middle', connectorId: 'west' },
    b: { levelId: 'pier-end', connectorId: 'east' },
  },
  {
    a: { levelId: 'bait-shop', connectorId: 'south' },
    b: { levelId: 'bait-shop-second', connectorId: 'south' },
  },
  {
    a: { levelId: 'bait-shop-second', connectorId: 'toilet-door' },
    b: { levelId: 'bait-shop-toilet', connectorId: 'south' },
  },
  {
    a: { levelId: 'bait-shop-toilet', connectorId: 'portal' },
    b: { levelId: 'nether-console-hardware-spawn', connectorId: 'entry' },
  },
  {
    a: { levelId: 'nether-console-hardware-spawn', connectorId: 'north' },
    b: { levelId: 'nether-end-of-hallway-door', connectorId: 'south' },
  },
  {
    a: { levelId: 'nether-reset-office', connectorId: 'south' },
    b: { levelId: 'nether-reset-office-second', connectorId: 'south' },
  },
] as const;

export class RoccoLevelTransitionController {
  private readonly options: RoccoLevelTransitionControllerOptions;
  private pendingExitIntent: RoccoPendingExitIntent | null = null;
  private transitionCooldownMs = 0;

  constructor(options: RoccoLevelTransitionControllerOptions) {
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

  update(level: RoccoLevel | null, deltaMs: number): RoccoResolvedLevelTransition | null {
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

  updatePendingExitIntent(level: RoccoLevel | null, action: RoccoSceneClickAction): void {
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
    level: RoccoLevel | null,
    connectorId: string,
  ): RoccoResolvedLevelTransition | null {
    if (!level) {
      return null;
    }

    const connector = findRoccoLevelConnector(level.connectors, connectorId);
    if (!connector || !this.options.canTraverseConnector(connector)) {
      return null;
    }

    return this.resolveTransition(level.id, connector);
  }

  private resolveTouchedConnector(level: RoccoLevel): RoccoLevelConnector | undefined {
    const playerGround = this.options.resolvePlayerGroundPoint();
    if (!playerGround) {
      return undefined;
    }

    return level.connectors.find(
      (connector) =>
        connector.exitArea && containsRoccoLevelRectPoint(connector.exitArea, playerGround),
    );
  }

  private resolveClickedConnector(
    level: RoccoLevel,
    scenePoint: RoccoPoint,
  ): RoccoLevelConnector | undefined {
    return level.connectors.find(
      (connector) =>
        connector.exitArea && containsRoccoLevelRectPoint(connector.exitArea, scenePoint),
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
    connector: RoccoLevelConnector,
  ): RoccoResolvedLevelTransition | null {
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
  ): RoccoLevelConnectionEndpoint | undefined {
    for (const connection of ROCCO_LEVEL_CONNECTIONS) {
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
