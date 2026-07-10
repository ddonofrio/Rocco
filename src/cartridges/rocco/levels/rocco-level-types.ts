import type { RoccoEngine } from '../../../engine/engine-sdk';
import type { RoccoCartridgeActionResult, RoccoSceneClickAction } from '../../../engine/cartridges';
import type { RoccoActionMenuActivation } from '../../../engine/video/action-menu';
import type { RoccoGridMenuActivation } from '../../../engine/video/grid-menu';
import type { RoccoPlaneScene } from '../../../engine/video/planes';
import type { RoccoFacingDirection, RoccoPoint } from '../../../engine/video/sprites';
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
  isEscapeUrgencyActive?: () => boolean;
  startThrowCoralRelicSequence?: (
    relicItem: RoccoInventoryItem,
    onComplete: (groundPoint: RoccoPoint) => void,
  ) => void;
  openCoralRelicWishMenu?: (
    groundPoint: RoccoPoint,
    consumeRelic: () => void,
  ) => void;
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
