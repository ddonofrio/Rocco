import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';
import type { RoccoPlaneScene } from '../../../../console/video/planes';
import {
  ROCCO_INVENTORY_KEYS_ITEM_ID,
  type RoccoInventoryItem,
} from '../../games/rocco-default/inventory';
import type { RoccoLocalization } from '../../games/rocco-default/localization';
import type { RoccoPlayerAppearance } from '../../games/rocco-default/player';
import type {
  RoccoLevel,
  RoccoLevelMountOptions,
  RoccoLevelRestartRequest,
} from '../rocco-level-types';
import { RoccoDeveloperRuntimeController } from './rocco-developer-runtime-controller';

export interface RoccoStatusPresenterOptions {
  localization: RoccoLocalization;
  cartridgeTitle: string;
  getEngine: () => CartridgeSdkV1Runtime | null;
  getActiveLevel: () => RoccoLevel | null;
  getActiveSceneId: () => string | null;
  setActiveSceneId: (sceneId: string | null) => void;
  getRoccoAppearance: () => RoccoPlayerAppearance;
  developerRuntime: RoccoDeveloperRuntimeController;
  canCollectIntoInventory: (itemId: string) => boolean;
  onKeysCollected: () => void;
  onConnectorTransitionRequested: (connectorId: string) => boolean;
  onNetherOfficeBellPressed: () => void;
  onRestartRequested: (request?: RoccoLevelRestartRequest) => void;
  onPickupRequested: (item: RoccoInventoryItem) => boolean;
  onPickupCollected: (item: RoccoInventoryItem) => void;
}

export class RoccoStatusPresenter {
  private readonly options: RoccoStatusPresenterOptions;

  constructor(options: RoccoStatusPresenterOptions) {
    this.options = options;
  }

  private buildStatusMessage(sceneId: string): string {
    const baseStatus = `${this.options.localization.text.levels.statusCartridge}: ${this.options.cartridgeTitle} | ${this.options.localization.text.levels.statusLevel}: ${this.options.getActiveLevel()?.title ?? ''} | ${this.options.localization.text.levels.statusScene}: ${sceneId}`;
    return this.options.developerRuntime.buildStatusMessage(baseStatus);
  }

  updateStatus(scene: RoccoPlaneScene): void {
    const engine = this.options.getEngine();
    if (!engine || !this.options.getActiveLevel()) {
      return;
    }
    this.options.setActiveSceneId(scene.id);
    engine.setStatus(this.buildStatusMessage(scene.id));
  }

  refreshStatus(): void {
    const engine = this.options.getEngine();
    const activeLevel = this.options.getActiveLevel();
    const sceneId = this.options.getActiveSceneId();
    if (!engine || !activeLevel || !sceneId) {
      return;
    }
    engine.setStatus(this.buildStatusMessage(sceneId));
  }

  createLevelMountOptions(): RoccoLevelMountOptions {
    return {
      roccoAppearance: this.options.getRoccoAppearance(),
      onKeysCollectRequested: () =>
        this.options.canCollectIntoInventory(ROCCO_INVENTORY_KEYS_ITEM_ID),
      onKeysCollected: this.options.onKeysCollected,
      onConnectorTransitionRequested: this.options.onConnectorTransitionRequested,
      onNetherOfficeBellPressed: this.options.onNetherOfficeBellPressed,
      onRestartRequested: this.options.onRestartRequested,
      onPickupRequested: (item) => this.options.canCollectIntoInventory(item.id),
      onPickupCollected: this.options.onPickupCollected,
    };
  }
}
