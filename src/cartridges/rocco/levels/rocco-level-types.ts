import type { RoccoCartridgeActionResult, RoccoSceneClickAction } from '../../../console/cartridges';
import type { RoccoEngine } from '../../../console/engine-sdk';
import type { RoccoActionMenuActivation } from '../../../console/video/action-menu';
import type { RoccoGridMenuActivation } from '../../../console/video/grid-menu';
import type { RoccoPlaneScene } from '../../../console/video/planes';
import type { RoccoFacingDirection, RoccoPoint } from '../../../console/video/sprites';
import type { RoccoInventoryItem } from '../inventory';
import type { RoccoPlayerAppearance } from '../rocco-player-appearance';
import { RoccoAssetPreloader } from './rocco-asset-preloader';

export interface RoccoLevelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoccoLevelConnector {
  id: string;
  exitArea?: RoccoLevelRect;
  entryPoint: RoccoPoint;
  entryFacing: RoccoFacingDirection;
  requiresKeys?: boolean;
  preservePlayerPosition?: boolean;
}

export interface RoccoLevelMountOptions {
  entryConnectorId?: string;
  entryPosition?: RoccoPoint;
  roccoAppearance?: RoccoPlayerAppearance;
  forceArrivalSequence?: boolean;
  onKeysCollectRequested?: () => boolean;
  onKeysCollected?: () => void;
  onConnectorTransitionRequested?: (connectorId: string) => boolean;
  onRestartRequested?: (request?: RoccoLevelRestartRequest) => void;
  onPickupRequested?: (item: RoccoInventoryItem) => boolean;
  onPickupCollected?: (item: RoccoInventoryItem) => void;
}

export interface RoccoLevelRestartRequest {
  levelId: string;
  entryConnectorId?: string;
  entryPosition?: RoccoPoint;
  forceArrivalSequence?: boolean;
}

export interface RoccoLevel {
  readonly id: string;
  readonly title: string;
  readonly connectors: readonly RoccoLevelConnector[];

  mount(
    engine: RoccoEngine,
    options?: RoccoLevelMountOptions,
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoPlaneScene>;
  unmount(engine: RoccoEngine): void;
  update(deltaMs: number): void;
  handleAction(activation: RoccoActionMenuActivation): void;
  handleGridMenu?(activation: RoccoGridMenuActivation): void;
  handleSceneClick?(action: RoccoSceneClickAction): RoccoCartridgeActionResult | void;
}

export function containsRoccoLevelRectPoint(rect: RoccoLevelRect, point: RoccoPoint): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function findRoccoLevelConnector(
  connectors: readonly RoccoLevelConnector[],
  connectorId: string | undefined,
): RoccoLevelConnector | undefined {
  if (!connectorId) {
    return undefined;
  }

  return connectors.find((connector) => connector.id === connectorId);
}
