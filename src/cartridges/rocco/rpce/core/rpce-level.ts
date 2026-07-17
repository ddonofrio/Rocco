import type { RoccoSceneClickAction } from '../../../../console/cartridges';
import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';
import type { RoccoActionMenuActivation } from '../../../../console/video/action-menu';
import type { RoccoGridMenuActivation } from '../../../../console/video/grid-menu';
import type { RoccoPlaneScene } from '../../../../console/video/planes';
import type { RoccoFacingDirection, RoccoPoint } from '../../../../console/video/sprites';
import type { RpceInventoryItem } from '../inventory/types';
import type { RpceAssetPreloader } from './rpce-asset-preloader';

export interface RpceLevelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RpceLevelConnector {
  id: string;
  exitArea?: RpceLevelRect;
  entryPoint: RoccoPoint;
  entryFacing: RoccoFacingDirection;
  requiresKeys?: boolean;
  preservePlayerPosition?: boolean;
}

export interface RpceLevelMountOptions {
  entryConnectorId?: string;
  entryPosition?: RoccoPoint;
  playerAppearanceId?: string;
  roccoAppearance?: string;
  forceArrivalSequence?: boolean;
  onKeysCollectRequested?: () => boolean;
  onKeysCollected?: () => void;
  onConnectorTransitionRequested?: (connectorId: string) => boolean;
  onRestartRequested?: (request?: RpceLevelRestartRequest) => void;
  onPickupRequested?: (item: RpceInventoryItem) => boolean;
  onPickupCollected?: (item: RpceInventoryItem) => void;
}

export interface RpceLevelRestartRequest {
  levelId: string;
  entryConnectorId?: string;
  entryPosition?: RoccoPoint;
  forceArrivalSequence?: boolean;
}

export interface RpceLevel {
  readonly id: string;
  readonly title: string;
  readonly connectors: readonly RpceLevelConnector[];

  mount(
    engine: CartridgeSdkV1Runtime,
    options?: RpceLevelMountOptions,
    preloader?: RpceAssetPreloader,
  ): Promise<RoccoPlaneScene>;
  unmount(engine: CartridgeSdkV1Runtime): void;
  update(deltaMs: number): void;
  handleAction(activation: RoccoActionMenuActivation): void;
  handleGridMenu?(activation: RoccoGridMenuActivation): void;
  handleSceneClick?(action: RoccoSceneClickAction): void;
}

export function isRpceLevelRectPoint(rect: RpceLevelRect, point: RoccoPoint): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function findRpceLevelConnector(
  connectors: readonly RpceLevelConnector[],
  connectorId: string | undefined,
): RpceLevelConnector | undefined {
  if (!connectorId) {
    return undefined;
  }

  return connectors.find((connector) => connector.id === connectorId);
}
