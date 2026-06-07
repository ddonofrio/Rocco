import type { RoccoEngine } from '../../../../engine/engine-api';
import type { RoccoCartridgeAction } from '../../../../engine/cartridges';
import type { RoccoPlaneScene } from '../../../../engine/video/planes';
import type { RoccoPoint } from '../../../../engine/video/sprites';
import {
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID,
  DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_Y_VALUES,
  PIER_BACKGROUND_SCROLL_LEFT_X,
  PIER_BACKGROUND_SCROLL_RIGHT_X,
  PIER_END_SCENE_ID,
  PIER_LEVEL_EXIT_TRIGGER_WIDTH,
  PIER_LEVEL_TRANSITION_COOLDOWN_MS,
  PIER_PLAYER_LEFT_ENTRY_X,
  PIER_PLAYER_RIGHT_ENTRY_X,
  PIER_START_SCENE_ID,
  ROCCO_PIER_END_LEVEL_ID,
  ROCCO_PIER_MIDDLE_LEVEL_ID,
  ROCCO_PIER_START_LEVEL_ID,
} from '../../rocco-default-constants';
import { RoccoPierMiddleLevel } from './pier-level';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import {
  createRoccoKeysInventoryItem,
  createRoccoTwentyEurosInventoryItem,
  RoccoInventory,
  ROCCO_INVENTORY_KEYS_ITEM_ID,
  ROCCO_INVENTORY_MENU_ID,
  ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
} from '../../inventory';
import {
  installRoccoPlayerActionMenu,
  isRoccoPlayerInventoryAction,
  uninstallRoccoPlayerActionMenu,
} from '../../rocco-player-action-menu';
import {
  containsPierRectPoint,
  type RoccoPierLevel,
  type RoccoPierLevelConnector,
} from './pier-level-types';
import { RoccoPierSideLevel } from './pier-side-level';

interface RoccoPierConnectionEndpoint {
  levelId: string;
  connectorId: string;
}

interface RoccoPierConnection {
  a: RoccoPierConnectionEndpoint;
  b: RoccoPierConnectionEndpoint;
}

type RoccoGridMenuCartridgeAction = Extract<RoccoCartridgeAction, { kind: 'grid-menu' }>;
type RoccoGridMenuItemUseCartridgeAction = Extract<
  RoccoCartridgeAction,
  { kind: 'grid-menu-item-use' }
>;

export interface RoccoPierLevelManagerMountResult {
  level: RoccoPierLevel;
  scene: RoccoPlaneScene;
}

export interface RoccoPierLevelManagerOptions {
  cartridgeTitle?: string;
  localization?: RoccoLocalization;
  inventory?: RoccoInventory;
  onRestartRequested?: () => void;
}

const DEFAULT_ENTRY_Y = DEFAULT_SPRITE_Y_VALUES[0] ?? 180;
const PIER_START_CONNECTORS: readonly RoccoPierLevelConnector[] = [
  {
    id: 'west',
    exitArea: {
      x: 0,
      y: 0,
      width: PIER_LEVEL_EXIT_TRIGGER_WIDTH,
      height: DEFAULT_DESIGN_HEIGHT,
    },
    entryPoint: {
      x: PIER_PLAYER_LEFT_ENTRY_X,
      y: DEFAULT_ENTRY_Y,
    },
    entryFacing: 'right',
  },
];

const PIER_END_CONNECTORS: readonly RoccoPierLevelConnector[] = [
  {
    id: 'east',
    exitArea: {
      x: DEFAULT_DESIGN_WIDTH - PIER_LEVEL_EXIT_TRIGGER_WIDTH,
      y: 0,
      width: PIER_LEVEL_EXIT_TRIGGER_WIDTH,
      height: DEFAULT_DESIGN_HEIGHT,
    },
    entryPoint: {
      x: PIER_PLAYER_RIGHT_ENTRY_X,
      y: DEFAULT_ENTRY_Y,
    },
    entryFacing: 'left',
  },
];

const PIER_CONNECTIONS: readonly RoccoPierConnection[] = [
  {
    a: { levelId: ROCCO_PIER_MIDDLE_LEVEL_ID, connectorId: 'east' },
    b: { levelId: ROCCO_PIER_START_LEVEL_ID, connectorId: 'west' },
  },
  {
    a: { levelId: ROCCO_PIER_MIDDLE_LEVEL_ID, connectorId: 'west' },
    b: { levelId: ROCCO_PIER_END_LEVEL_ID, connectorId: 'east' },
  },
];

export class RoccoPierLevelManager {
  private readonly levels = new Map<string, RoccoPierLevel>();
  private readonly options: RoccoPierLevelManagerOptions;
  private engine: RoccoEngine | null = null;
  private activeLevel: RoccoPierLevel | null = null;
  private transitioning = false;
  private transitionCooldownMs = 0;
  private readonly localization: RoccoLocalization;
  private readonly inventory: RoccoInventory;

  constructor(options: RoccoPierLevelManagerOptions = {}) {
    this.options = {
      cartridgeTitle: 'ROCCO',
      ...options,
    };
    this.localization = options.localization ?? createRoccoLocalization();
    this.inventory = options.inventory ?? new RoccoInventory();
    this.inventory.addItem(createRoccoTwentyEurosInventoryItem(this.localization));
    this.registerDefaultLevels();
  }

  async mount(engine: RoccoEngine): Promise<RoccoPierLevelManagerMountResult> {
    this.engine = engine;
    const level = this.requireLevel(ROCCO_PIER_MIDDLE_LEVEL_ID);
    this.activeLevel = level;
    const scene = await level.mount(engine, this.createLevelMountOptions());
    installRoccoPlayerActionMenu(engine, this.localization);
    this.updateStatus(scene);
    return { level, scene };
  }

  unmount(): void {
    if (!this.engine || !this.activeLevel) {
      return;
    }

    this.activeLevel.unmount(this.engine);
    uninstallRoccoPlayerActionMenu(this.engine);
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.gridMenus.clearCarriedItem();
    this.activeLevel = null;
    this.engine = null;
  }

  update(deltaMs: number): void {
    this.activeLevel?.update(deltaMs);
    if (!this.engine || !this.activeLevel || this.transitioning) {
      return;
    }

    this.transitionCooldownMs = Math.max(0, this.transitionCooldownMs - Math.max(0, deltaMs));
    if (this.transitionCooldownMs > 0) {
      return;
    }

    const connector = this.resolveTouchedConnector(this.activeLevel);
    if (!connector) {
      return;
    }

    if (connector.requiresKeys && !this.inventory.hasItem(ROCCO_INVENTORY_KEYS_ITEM_ID)) {
      return;
    }

    void this.transitionThrough(connector);
  }

  handleAction(activation: RoccoCartridgeAction): void {
    if (isGridMenuCartridgeAction(activation)) {
      this.handleInventoryGridAction(activation);
      return;
    }

    if (isGridMenuItemUseCartridgeAction(activation)) {
      this.handleInventoryItemUse(activation);
      return;
    }

    if (isRoccoPlayerInventoryAction(activation)) {
      this.toggleInventoryMenu();
      return;
    }

    this.activeLevel?.handleAction(activation);
  }

  getActiveLevel(): RoccoPierLevel | null {
    return this.activeLevel;
  }

  private registerDefaultLevels(): void {
    const levels: RoccoPierLevel[] = [
      new RoccoPierMiddleLevel(this.localization),
      new RoccoPierSideLevel({
        id: ROCCO_PIER_START_LEVEL_ID,
        title: this.localization.text.levels.beginning,
        sceneId: PIER_START_SCENE_ID,
        backgroundScrollX: PIER_BACKGROUND_SCROLL_RIGHT_X,
        connectors: PIER_START_CONNECTORS,
      }),
      new RoccoPierSideLevel({
        id: ROCCO_PIER_END_LEVEL_ID,
        title: this.localization.text.levels.end,
        sceneId: PIER_END_SCENE_ID,
        backgroundScrollX: PIER_BACKGROUND_SCROLL_LEFT_X,
        connectors: PIER_END_CONNECTORS,
      }),
    ];

    for (const level of levels) {
      this.levels.set(level.id, level);
    }
  }

  private resolveTouchedConnector(level: RoccoPierLevel): RoccoPierLevelConnector | undefined {
    const playerGround = this.resolvePlayerGroundPoint();
    if (!playerGround) {
      return undefined;
    }

    return level.connectors.find(
      (connector) => connector.exitArea && containsPierRectPoint(connector.exitArea, playerGround),
    );
  }

  private resolvePlayerGroundPoint(): RoccoPoint | undefined {
    if (!this.engine) {
      return undefined;
    }

    const player = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!player) {
      return undefined;
    }

    return {
      x: player.transform.x + DEFAULT_SPRITE_GROUND_ANCHOR_X * (player.transform.scaleX || 1),
      y: player.transform.y + DEFAULT_SPRITE_GROUND_ANCHOR_Y * (player.transform.scaleY || 1),
    };
  }

  private async transitionThrough(connector: RoccoPierLevelConnector): Promise<void> {
    if (!this.engine || !this.activeLevel) {
      return;
    }

    const currentLevel = this.activeLevel;
    const targetEndpoint = this.resolveConnectedEndpoint(currentLevel.id, connector.id);
    if (!targetEndpoint) {
      return;
    }

    const targetLevel = this.requireLevel(targetEndpoint.levelId);
    const engine = this.engine;
    this.transitioning = true;
    engine.setInputEnabled(false);
    engine.beginComposition();

    try {
      currentLevel.unmount(engine);
      this.activeLevel = targetLevel;
      const scene = await targetLevel.mount(engine, {
        entryConnectorId: targetEndpoint.connectorId,
        ...this.createLevelMountOptions(),
      });
      this.transitionCooldownMs = PIER_LEVEL_TRANSITION_COOLDOWN_MS;
      this.updateStatus(scene);
    } catch (error) {
      engine.log('System', `Pier level transition failed: ${String(error)}`);
      this.activeLevel = currentLevel;
    } finally {
      engine.endComposition();
      engine.setInputEnabled(true);
      this.transitioning = false;
      engine.video.render(0);
    }
  }

  private resolveConnectedEndpoint(
    levelId: string,
    connectorId: string,
  ): RoccoPierConnectionEndpoint | undefined {
    for (const connection of PIER_CONNECTIONS) {
      if (connection.a.levelId === levelId && connection.a.connectorId === connectorId) {
        return connection.b;
      }
      if (connection.b.levelId === levelId && connection.b.connectorId === connectorId) {
        return connection.a;
      }
    }

    return undefined;
  }

  private updateStatus(scene: RoccoPlaneScene): void {
    if (!this.engine || !this.activeLevel) {
      return;
    }

    this.engine.setStatus(
      `${this.localization.text.levels.statusCartridge}: ${this.options.cartridgeTitle ?? 'ROCCO'} | ${this.localization.text.levels.statusLevel}: ${this.activeLevel.title} | ${this.localization.text.levels.statusScene}: ${scene.id}`,
    );
  }

  private createLevelMountOptions(): {
    onKeysCollected: () => void;
    onRestartRequested?: () => void;
  } {
    return {
      onKeysCollected: () => {
        this.inventory.addItem(createRoccoKeysInventoryItem(this.localization));
        this.engine?.video.messages.say(
          DEFAULT_SPRITE_INSTANCE_ID,
          this.localization.text.keys.collectedLines,
          {
            lineSelection: {
              mode: 'random',
              count: 1,
              historyKey: 'keys-collected',
              avoidImmediateRepeat: true,
            },
            ttlMs: 5600,
          },
        );
        this.engine?.video.render(0);
      },
      onRestartRequested: this.options.onRestartRequested,
    };
  }

  private toggleInventoryMenu(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.actionMenus.closeMenu();
    this.engine.video.gridMenus.toggleMenu(this.inventory.createGridMenuDefinition(this.localization));
    this.engine.video.render(0);
  }

  private handleInventoryGridAction(activation: RoccoGridMenuCartridgeAction): void {
    if (activation.definitionId !== ROCCO_INVENTORY_MENU_ID) {
      return;
    }

    if (activation.interaction === 'place' || activation.interaction === 'carry') {
      this.inventory.applyGridMenuItems(activation.items);
    }
  }

  private handleInventoryItemUse(activation: RoccoGridMenuItemUseCartridgeAction): void {
    if (!this.engine || activation.definitionId !== ROCCO_INVENTORY_MENU_ID) {
      return;
    }

    this.engine.video.messages.think(
      DEFAULT_SPRITE_INSTANCE_ID,
      this.resolveInventoryItemUseLines(activation),
      {
        lineSelection: {
          mode: 'random',
          count: 1,
          historyKey: `inventory-use:${activation.itemId}:${activation.targetInstanceId}`,
          avoidImmediateRepeat: true,
        },
        ttlMs: 5200,
      },
    );
    this.engine.video.gridMenus.clearCarriedItem();
    this.engine.video.render(0);
  }

  private resolveInventoryItemUseLines(
    activation: RoccoGridMenuItemUseCartridgeAction,
  ): string[] {
    if (activation.targetInstanceId === DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID) {
      if (activation.itemId === ROCCO_INVENTORY_KEYS_ITEM_ID) {
        return this.localization.text.inventory.keysOnBaitBucketLines;
      }
      if (activation.itemId === ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID) {
        return this.localization.text.inventory.moneyOnBaitBucketLines;
      }
    }

    if (activation.targetInstanceId === DEFAULT_PELIKAN_SPRITE_INSTANCE_ID) {
      if (activation.itemId === ROCCO_INVENTORY_KEYS_ITEM_ID) {
        return this.localization.text.inventory.keysOnPelikanLines;
      }
      if (activation.itemId === ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID) {
        return this.localization.text.inventory.moneyOnPelikanLines;
      }
    }

    return this.localization.text.inventory.cannotUseItemLines;
  }

  private requireLevel(levelId: string): RoccoPierLevel {
    const level = this.levels.get(levelId);
    if (!level) {
      throw new Error(`Pier level '${levelId}' is not registered.`);
    }

    return level;
  }
}

function isGridMenuCartridgeAction(
  activation: RoccoCartridgeAction,
): activation is RoccoGridMenuCartridgeAction {
  return 'kind' in activation && activation.kind === 'grid-menu';
}

function isGridMenuItemUseCartridgeAction(
  activation: RoccoCartridgeAction,
): activation is RoccoGridMenuItemUseCartridgeAction {
  return 'kind' in activation && activation.kind === 'grid-menu-item-use';
}
