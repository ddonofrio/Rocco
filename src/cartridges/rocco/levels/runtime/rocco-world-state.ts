import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';
import type { RoccoPlaneScene } from '../../../../console/video/planes';
import type { RoccoFacingDirection, RoccoPoint } from '../../../../console/video/sprites';
import {
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_SCALE,
} from '../../games/rocco-default/constants';
import type { RoccoInventoryItem } from '../../games/rocco-default/inventory';
import type { RoccoPlayerAppearance } from '../../games/rocco-default/player';
import type { RoccoLevel, RoccoLevelMountOptions } from '../rocco-level-types';
import { RoccoAssetPreloader } from '../rocco-asset-preloader';
import { RoccoDeveloperRuntimeController } from './rocco-developer-runtime-controller';
import { RoccoDroppedInventoryController } from './rocco-dropped-inventory-controller';
import { RoccoInventoryRuntimeController } from './rocco-inventory-runtime-controller';
import { RoccoLevelTransitionController } from './rocco-level-transition-controller';
import { RoccoScriptedSequenceController } from './rocco-scripted-sequence-controller';

export interface RoccoNetherEntrySnapshot {
  inventoryItems: RoccoInventoryItem[];
  roccoAppearance: RoccoPlayerAppearance;
}

export interface RoccoLevelManagerMountStateSnapshot {
  entryConnectorId?: string;
  entryPosition?: RoccoPoint;
  forceArrivalSequence?: boolean;
}

export interface RoccoLevelManagerTransitionSnapshot {
  transitions: ReturnType<RoccoLevelTransitionController['createSnapshot']>;
  droppedInventory: ReturnType<RoccoDroppedInventoryController['createSnapshot']>;
  inventoryRuntime: ReturnType<RoccoInventoryRuntimeController['createSnapshot']>;
  scriptedSequences: ReturnType<RoccoScriptedSequenceController['createSnapshot']>;
  developerRuntime: ReturnType<RoccoDeveloperRuntimeController['createSnapshot']>;
  roccoAppearance: RoccoPlayerAppearance;
  pendingNetherEntrySnapshot: RoccoNetherEntrySnapshot | null;
  netherEntrySnapshot: RoccoNetherEntrySnapshot | null;
  activeSceneId: string | null;
  activeMountState: RoccoLevelManagerMountStateSnapshot | null;
}

export interface RoccoLevelManagerPlayerSnapshot {
  position: RoccoPoint;
  facing: RoccoFacingDirection;
}

export interface RoccoLevelTransitionPreparation {
  rollbackSnapshot: RoccoLevelManagerTransitionSnapshot;
  playerSnapshot: RoccoLevelManagerPlayerSnapshot | null;
  mountStateSnapshot: RoccoLevelManagerMountStateSnapshot | null;
  enteringNetherSnapshot: RoccoNetherEntrySnapshot | null;
}

export interface RoccoWorldStateOptions {
  getEngine: () => CartridgeSdkV1Runtime | null;
  getActiveLevel: () => RoccoLevel | null;
  setActiveLevel: (level: RoccoLevel | null) => void;
  getRoccoAppearance: () => RoccoPlayerAppearance;
  setRoccoAppearance: (appearance: RoccoPlayerAppearance) => void;
  getLevelMountOptions: () => RoccoLevelMountOptions;
  transitions: RoccoLevelTransitionController;
  droppedInventory: RoccoDroppedInventoryController;
  inventoryRuntime: RoccoInventoryRuntimeController;
  scriptedSequences: RoccoScriptedSequenceController;
  developerRuntime: RoccoDeveloperRuntimeController;
}

export class RoccoWorldState {
  private readonly options: RoccoWorldStateOptions;
  private activeSceneId: string | null = null;
  private pendingNetherEntrySnapshot: RoccoNetherEntrySnapshot | null = null;
  private netherEntrySnapshot: RoccoNetherEntrySnapshot | null = null;
  private activeMountState: RoccoLevelManagerMountStateSnapshot | null = null;

  constructor(options: RoccoWorldStateOptions) {
    this.options = options;
  }

  get currentSceneId(): string | null {
    return this.activeSceneId;
  }

  get currentMountState(): RoccoLevelManagerMountStateSnapshot | null {
    return this.cloneMountStateSnapshot(this.activeMountState);
  }

  get savedNetherEntrySnapshot(): RoccoNetherEntrySnapshot | null {
    return this.cloneNetherEntrySnapshot(this.netherEntrySnapshot);
  }

  get pendingNetherSnapshot(): RoccoNetherEntrySnapshot | null {
    return this.cloneNetherEntrySnapshot(this.pendingNetherEntrySnapshot);
  }

  setSceneId(sceneId: string | null): void {
    this.activeSceneId = sceneId;
  }

  setPendingNetherSnapshot(snapshot: RoccoNetherEntrySnapshot | null): void {
    this.pendingNetherEntrySnapshot = this.cloneNetherEntrySnapshot(snapshot);
  }

  clearSavedNetherEntrySnapshot(): void {
    this.netherEntrySnapshot = null;
  }

  setSavedNetherEntrySnapshot(snapshot: RoccoNetherEntrySnapshot | null): void {
    this.netherEntrySnapshot = this.cloneNetherEntrySnapshot(snapshot);
  }

  setActiveMountState(snapshot: RoccoLevelManagerMountStateSnapshot | null): void {
    this.activeMountState = this.cloneMountStateSnapshot(snapshot);
  }

  isNetherLevelId(levelId: string): boolean {
    return levelId.startsWith('nether-');
  }

  isEnteringNether(fromLevelId: string, toLevelId: string): boolean {
    return !this.isNetherLevelId(fromLevelId) && this.isNetherLevelId(toLevelId);
  }

  createNetherEntrySnapshot(): RoccoNetherEntrySnapshot {
    return {
      inventoryItems: this.options.inventoryRuntime.getPlayerInventory().listItems(),
      roccoAppearance: this.options.getRoccoAppearance(),
    };
  }

  captureNetherEntrySnapshot(snapshot = this.createNetherEntrySnapshot()): void {
    this.netherEntrySnapshot = this.cloneNetherEntrySnapshot(snapshot);
  }

  cloneNetherEntrySnapshot(
    snapshot: RoccoNetherEntrySnapshot | null,
  ): RoccoNetherEntrySnapshot | null {
    if (!snapshot) {
      return null;
    }
    return {
      inventoryItems: snapshot.inventoryItems.map((item) => structuredClone(item)),
      roccoAppearance: snapshot.roccoAppearance,
    };
  }

  cloneMountStateSnapshot(
    snapshot: RoccoLevelManagerMountStateSnapshot | null,
  ): RoccoLevelManagerMountStateSnapshot | null {
    if (!snapshot) {
      return null;
    }
    return {
      entryConnectorId: snapshot.entryConnectorId,
      entryPosition: snapshot.entryPosition ? { ...snapshot.entryPosition } : undefined,
      forceArrivalSequence: snapshot.forceArrivalSequence,
    };
  }

  createMountStateSnapshot(
    options: Pick<
      RoccoLevelMountOptions,
      'entryConnectorId' | 'entryPosition' | 'forceArrivalSequence'
    > = {},
  ): RoccoLevelManagerMountStateSnapshot {
    return {
      entryConnectorId: options.entryConnectorId,
      entryPosition: options.entryPosition ? { ...options.entryPosition } : undefined,
      forceArrivalSequence: options.forceArrivalSequence,
    };
  }

  buildRuntimeMountOptions(
    mountState: RoccoLevelManagerMountStateSnapshot | null = null,
  ): RoccoLevelMountOptions {
    return {
      ...this.options.getLevelMountOptions(),
      ...(mountState && (this.cloneMountStateSnapshot(mountState) ?? {})),
    };
  }

  applySuccessfulTransitionTarget(
    level: RoccoLevel,
    mountState: RoccoLevelManagerMountStateSnapshot,
  ): void {
    this.options.setActiveLevel(level);
    this.activeMountState = this.cloneMountStateSnapshot(mountState);
  }

  applyNetherEntrySnapshot(snapshot: RoccoNetherEntrySnapshot | null): void {
    this.clearNetherDroppedInventoryItems();
    if (!snapshot) {
      return;
    }
    const inventory = this.options.inventoryRuntime.getPlayerInventory();
    inventory.replaceItems(snapshot.inventoryItems);
    this.options.setRoccoAppearance(snapshot.roccoAppearance);
  }

  createTransitionSnapshot(): RoccoLevelManagerTransitionSnapshot {
    return {
      transitions: this.options.transitions.createSnapshot(),
      droppedInventory: this.options.droppedInventory.createSnapshot(),
      inventoryRuntime: this.options.inventoryRuntime.createSnapshot(),
      scriptedSequences: this.options.scriptedSequences.createSnapshot(),
      developerRuntime: this.options.developerRuntime.createSnapshot(),
      roccoAppearance: this.options.getRoccoAppearance(),
      pendingNetherEntrySnapshot: this.cloneNetherEntrySnapshot(this.pendingNetherEntrySnapshot),
      netherEntrySnapshot: this.cloneNetherEntrySnapshot(this.netherEntrySnapshot),
      activeSceneId: this.activeSceneId,
      activeMountState: this.cloneMountStateSnapshot(this.activeMountState),
    };
  }

  restoreTransitionSnapshot(
    snapshot: RoccoLevelManagerTransitionSnapshot,
    engine?: CartridgeSdkV1Runtime | null,
  ): void {
    this.options.transitions.restoreSnapshot(snapshot.transitions);
    this.options.droppedInventory.restoreSnapshot(snapshot.droppedInventory);
    this.options.inventoryRuntime.restoreSnapshot(snapshot.inventoryRuntime);
    this.options.scriptedSequences.restoreSnapshot(snapshot.scriptedSequences);
    this.options.developerRuntime.restoreSnapshot(snapshot.developerRuntime, engine);
    this.options.setRoccoAppearance(snapshot.roccoAppearance);
    this.pendingNetherEntrySnapshot = this.cloneNetherEntrySnapshot(
      snapshot.pendingNetherEntrySnapshot,
    );
    this.netherEntrySnapshot = this.cloneNetherEntrySnapshot(snapshot.netherEntrySnapshot);
    this.activeSceneId = snapshot.activeSceneId;
    this.activeMountState = this.cloneMountStateSnapshot(snapshot.activeMountState);
  }

  clearNetherDroppedInventoryItems(): void {
    this.options.droppedInventory.clearLevelItemsWhere((levelId) => this.isNetherLevelId(levelId));
  }

  hasAccessibleInventoryItem(levelId: string, itemId: string): boolean {
    return this.options.droppedInventory.hasAccessibleItem(
      levelId,
      this.options.inventoryRuntime.getPlayerInventory().listItems(),
      itemId,
    );
  }

  listAccessibleInventoryItemIds(levelId: string): string[] {
    return this.options.droppedInventory.listAccessibleItemIds(
      levelId,
      this.options.inventoryRuntime.getPlayerInventory().listItems(),
    );
  }

  resolvePlayerGroundPoint(): RoccoPoint | undefined {
    const engine = this.options.getEngine();
    if (!engine) {
      return undefined;
    }
    const player = engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!player) {
      return undefined;
    }
    return {
      x: player.transform.x + DEFAULT_SPRITE_GROUND_ANCHOR_X * (player.transform.scaleX || 1),
      y: player.transform.y + DEFAULT_SPRITE_GROUND_ANCHOR_Y * (player.transform.scaleY || 1),
    };
  }

  resolvePlayerBaseScale(): number {
    const engine = this.options.getEngine();
    if (!engine) {
      return DEFAULT_SPRITE_SCALE;
    }
    const player = engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    const scale = player?.transform.scaleY ?? player?.transform.scaleX ?? DEFAULT_SPRITE_SCALE;
    return Number.isFinite(scale) && scale > 0 ? scale : DEFAULT_SPRITE_SCALE;
  }

  resolvePlayerPosition(): RoccoPoint | undefined {
    const player = this.options.getEngine()?.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    return player ? { x: player.transform.x, y: player.transform.y } : undefined;
  }

  resolveMirroredPlayerPosition(): RoccoPoint | undefined {
    const playerPosition = this.resolvePlayerPosition();
    const player = this.options.getEngine()?.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!playerPosition || !player) {
      return undefined;
    }
    const groundOffsetX = DEFAULT_SPRITE_GROUND_ANCHOR_X * (player.transform.scaleX || 1);
    return {
      x: DEFAULT_DESIGN_WIDTH - (playerPosition.x + groundOffsetX) - groundOffsetX,
      y: playerPosition.y,
    };
  }

  capturePlayerSnapshot(): RoccoLevelManagerPlayerSnapshot | null {
    const player = this.options.getEngine()?.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!player) {
      return null;
    }
    return {
      position: { x: player.transform.x, y: player.transform.y },
      facing: player.facing ?? player.action?.direction ?? 'down',
    };
  }

  prepareLevelTransition(targetLevelId: string): RoccoLevelTransitionPreparation {
    const activeLevelId = this.options.getActiveLevel()?.id ?? '';
    return {
      rollbackSnapshot: this.createTransitionSnapshot(),
      playerSnapshot: this.capturePlayerSnapshot(),
      mountStateSnapshot: this.cloneMountStateSnapshot(this.activeMountState),
      enteringNetherSnapshot: this.isEnteringNether(activeLevelId, targetLevelId)
        ? this.createNetherEntrySnapshot()
        : null,
    };
  }

  async remountCurrentLevelWithSnapshot(
    engine: CartridgeSdkV1Runtime,
    currentLevel: RoccoLevel,
    mountState: RoccoLevelManagerMountStateSnapshot | null,
    playerSnapshot: RoccoLevelManagerPlayerSnapshot | null,
  ): Promise<RoccoPlaneScene | null> {
    const scene = await currentLevel.mount(
      engine,
      this.buildRuntimeMountOptions(mountState),
      new RoccoAssetPreloader(),
    );
    if (playerSnapshot && engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID)) {
      engine.video.sprites.stopMovement(DEFAULT_SPRITE_INSTANCE_ID);
      engine.video.sprites.setPosition(
        DEFAULT_SPRITE_INSTANCE_ID,
        playerSnapshot.position.x,
        playerSnapshot.position.y,
        { constrainToWalkMap: false },
      );
      engine.video.sprites.setFacing(DEFAULT_SPRITE_INSTANCE_ID, playerSnapshot.facing);
    }
    return scene;
  }
}
