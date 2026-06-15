import type { RoccoEngine } from '../../../../engine/engine-sdk';
import type { RoccoSceneClickAction } from '../../../../engine/cartridges';
import type { RoccoActionMenuActivation } from '../../../../engine/video/action-menu';
import type { RoccoPlaneScene } from '../../../../engine/video/planes';
import type { RoccoFacingDirection, RoccoPoint } from '../../../../engine/video/sprites';

export interface RoccoPierRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoccoPierLevelConnector {
  id: string;
  exitArea?: RoccoPierRect;
  entryPoint: RoccoPoint;
  entryFacing: RoccoFacingDirection;
  requiresKeys?: boolean;
}

export interface RoccoPierLevelMountOptions {
  entryConnectorId?: string;
  onKeysCollected?: () => void;
  onRestartRequested?: () => void;
}

export interface RoccoPierLevel {
  readonly id: string;
  readonly title: string;
  readonly connectors: readonly RoccoPierLevelConnector[];

  mount(engine: RoccoEngine, options?: RoccoPierLevelMountOptions): Promise<RoccoPlaneScene>;
  unmount(engine: RoccoEngine): void;
  update(deltaMs: number): void;
  handleAction(activation: RoccoActionMenuActivation): void;
  handleSceneClick?(action: RoccoSceneClickAction): void;
}

export function containsPierRectPoint(rect: RoccoPierRect, point: RoccoPoint): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function findPierConnector(
  connectors: readonly RoccoPierLevelConnector[],
  connectorId: string | undefined,
): RoccoPierLevelConnector | undefined {
  if (!connectorId) {
    return undefined;
  }

  return connectors.find((connector) => connector.id === connectorId);
}
