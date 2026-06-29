import type { RoccoEngine } from '../../../engine/engine-sdk';
import type {
  RoccoCartridgeAction,
  RoccoCartridgeActionResult,
  RoccoSceneClickAction,
} from '../../../engine/cartridges';
import type { RoccoGridMenuCarriedItem } from '../../../engine/video/grid-menu';
import type { RoccoPlaneScene } from '../../../engine/video/planes';
import type {
  RoccoPoint,
  RoccoSpriteDefinition,
  RoccoSpriteFrame,
  RoccoSpriteInstance,
} from '../../../engine/video/sprites';
import {
  DEFAULT_BAIT_SHOP_DOOR_OPEN_ANIMATION_ID,
  DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID,
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_ROCCO_GREEN_BLACK,
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_STAN_SLEEPING_ANIMATION_ID,
  DEFAULT_STAN_SPRITE_INSTANCE_ID,
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
} from '../rocco-default-constants';
import {
  roccoDefaultDeveloperSpriteCycleCursorAssetUrl,
  roccoDefaultPoliceWhistleSoundUrl,
} from '../rocco-default-assets';
import { RoccoPierMiddleLevel } from './pier/pier-level';
import { createRoccoLocalization, type RoccoLocalization } from '../localization';
import {
  createRoccoKeysInventoryItem,
  createRoccoMagazineInventoryItem,
  createRoccoMysteriousKeyInventoryItem,
  createRoccoTwentyEurosInventoryItem,
  RoccoInventory,
  ROCCO_INVENTORY_KEYS_ITEM_ID,
  ROCCO_INVENTORY_MAGAZINE_ITEM_ID,
  ROCCO_INVENTORY_MENU_ID,
  ROCCO_INVENTORY_MYSTERIOUS_KEY_ITEM_ID,
  ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
  resolveRoccoInventoryUseLines,
} from '../inventory';
import {
  installRoccoPlayerActionMenu,
  isRoccoPlayerDeveloperAction,
  isRoccoPlayerInventoryAction,
  uninstallRoccoPlayerActionMenu,
} from '../rocco-player-action-menu';
import {
  createRoccoDeveloperInventoryItem,
  createRoccoDeveloperInventoryMenuDefinition,
  createRoccoDeveloperLevelMenuDefinition,
  createRoccoDeveloperScreenMenuDefinition,
  createRoccoDeveloperRootMenuDefinition,
  type RoccoDeveloperLevelOption,
  ROCCO_DEVELOPER_CYCLE_SPRITE_CHOICE_ID,
  ROCCO_DEVELOPER_INVENTORY_CHOICE_ID,
  ROCCO_DEVELOPER_INVENTORY_MENU_ID,
  ROCCO_DEVELOPER_JUMP_CHOICE_ID,
  ROCCO_DEVELOPER_LEVEL_MENU_ID,
  ROCCO_DEVELOPER_MODE_ENABLED,
  ROCCO_DEVELOPER_ROOT_MENU_ID,
  ROCCO_DEVELOPER_SCREEN_MENU_ID,
} from '../rocco-developer-mode';
import {
  containsRoccoLevelRectPoint,
  findRoccoLevelConnector,
  type RoccoLevel,
  type RoccoLevelConnector,
} from './rocco-level-types';
import { BAIT_SHOP_DOOR_OPENING_SOUND_ID } from './pier/pier-bait-shop-door';
import {
  installPierBeginningAmbient,
  type RoccoPierBeginningAmbientPersistentState,
} from './pier/pier-beginning-ambient';
import { RoccoPierSideLevel } from './pier/pier-side-level';
import {
  DEFAULT_STAN_DIALOGUE_TEXT_COLOR,
  DEFAULT_STAN_LOOK_RIGHT_ANIMATION_ID,
} from './pier/pier-stan';
import { RoccoBaitShopLevel, ROCCO_BAIT_SHOP_LEVEL_ID } from './bait-shop/bait-shop-level';
import {
  RoccoBaitShopSecondLevel,
  ROCCO_BAIT_SHOP_SECOND_LEVEL_ID,
} from './bait-shop/bait-shop-second-level';
import {
  RoccoBaitShopToiletLevel,
  ROCCO_BAIT_SHOP_TOILET_LEVEL_ID,
} from './bait-shop/bait-shop-toilet-level';

interface RoccoLevelConnectionEndpoint {
  levelId: string;
  connectorId: string;
}

interface RoccoLevelConnection {
  a: RoccoLevelConnectionEndpoint;
  b: RoccoLevelConnectionEndpoint;
}

interface RoccoLevelInventorySceneClickHandler {
  handleInventorySceneClick(
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ): boolean;
}

type RoccoGridMenuCartridgeAction = Extract<RoccoCartridgeAction, { kind: 'grid-menu' }>;
type StanPoliceDefeatPhase = 'speaking' | 'fading' | 'title';
type BaitShopDoorEntryPhase = 'open-door-hold' | 'transitioning';
type StanMoneyExchangePhase = 'stan-speaking' | 'rocco-replying';

interface RoccoDeveloperCursorAttachment {
  imageUri: string;
  label?: string;
  size?: number;
  opacity?: number;
}

interface RoccoDeveloperSpriteCycleOriginalState {
  animationId: string;
  frameIndex: number;
  playbackRate: number;
  playing: boolean;
  action?: NonNullable<RoccoSpriteInstance['action']>;
  facing?: RoccoSpriteInstance['facing'];
}

interface RoccoDeveloperSpriteCyclePreview {
  image: RoccoSpriteDefinition['images'][number];
  frame: RoccoSpriteFrame;
}

export interface RoccoLevelManagerMountResult {
  level: RoccoLevel;
  scene: RoccoPlaneScene;
}

export interface RoccoLevelManagerOptions {
  cartridgeTitle?: string;
  localization?: RoccoLocalization;
  inventory?: RoccoInventory;
  onRestartRequested?: () => void;
}

const DEFAULT_ENTRY_Y = DEFAULT_SPRITE_Y_VALUES[0] ?? 180;
const STAN_POLICE_DEFEAT_SOUND_ID = 'rocco-stan-police-whistle-sound';
const STAN_POLICE_DEFEAT_SOUND_VOLUME = 0.45;
const STAN_POLICE_DEFEAT_MESSAGE_TTL_MS = 3800;
const STAN_POLICE_DEFEAT_FADE_DURATION_MS = 1300;
const STAN_POLICE_DEFEAT_TITLE_DURATION_MS = 3600;
const STAN_POLICE_DEFEAT_FADE_PRIMITIVE_ID = 'rocco-stan-police-defeat-fade';
const STAN_POLICE_DEFEAT_TITLE_ID = 'rocco-stan-police-defeat-title';
const STAN_MONEY_ACCEPTED_TTL_MS = 3600;
const ROCCO_MONEY_REPLY_TTL_MS = 3000;
const BAIT_SHOP_ENTRY_DOOR_OPEN_HOLD_MS = 1000;
const DEFAULT_START_LEVEL_ID = ROCCO_PIER_MIDDLE_LEVEL_ID;
const DEVELOPER_SPRITE_CYCLE_ANIMATION_ID = '__rocco-developer-sprite-cycle__';
const DEVELOPER_SPRITE_CYCLE_FRAME_ID_PREFIX = '__rocco-developer-sprite-cycle-frame';
const DEVELOPER_SPRITE_CYCLE_FRAME_DURATION_MS = 1000;
const DEVELOPER_SPRITE_CYCLE_TOP_TITLE_ID = 'rocco-developer-sprite-cycle-top-title';
const DEVELOPER_SPRITE_CYCLE_SPRITE_TITLE_ID = 'rocco-developer-sprite-cycle-sprite-title';
const DEVELOPER_SPRITE_CYCLE_CURSOR_SIZE = 34;

interface StanPoliceDefeatSequence {
  phase: StanPoliceDefeatPhase;
  elapsedMs: number;
}

interface BaitShopDoorEntrySequence {
  phase: BaitShopDoorEntryPhase;
  elapsedMs: number;
}

interface StanMoneyExchangeSequence {
  phase: StanMoneyExchangePhase;
  elapsedMs: number;
}

interface RoccoPendingExitIntent {
  levelId: string;
  connectorId: string;
}

const PIER_START_CONNECTORS: readonly RoccoLevelConnector[] = [
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

const PIER_END_CONNECTORS: readonly RoccoLevelConnector[] = [
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

const ROCCO_LEVEL_CONNECTIONS: readonly RoccoLevelConnection[] = [
  {
    a: { levelId: ROCCO_PIER_MIDDLE_LEVEL_ID, connectorId: 'east' },
    b: { levelId: ROCCO_PIER_START_LEVEL_ID, connectorId: 'west' },
  },
  {
    a: { levelId: ROCCO_PIER_MIDDLE_LEVEL_ID, connectorId: 'west' },
    b: { levelId: ROCCO_PIER_END_LEVEL_ID, connectorId: 'east' },
  },
  {
    a: { levelId: ROCCO_BAIT_SHOP_LEVEL_ID, connectorId: 'south' },
    b: { levelId: ROCCO_BAIT_SHOP_SECOND_LEVEL_ID, connectorId: 'south' },
  },
  {
    a: { levelId: ROCCO_BAIT_SHOP_SECOND_LEVEL_ID, connectorId: 'toilet-door' },
    b: { levelId: ROCCO_BAIT_SHOP_TOILET_LEVEL_ID, connectorId: 'south' },
  },
];

export class RoccoLevelManager {
  private readonly levels = new Map<string, RoccoLevel>();
  private readonly options: RoccoLevelManagerOptions;
  private readonly beginningAmbientState: RoccoPierBeginningAmbientPersistentState = {
    stan: {
      isIdentified: false,
    },
    door: {
      revealed: true,
    },
  };
  private engine: RoccoEngine | null = null;
  private activeLevel: RoccoLevel | null = null;
  private activeSceneId: string | null = null;
  private transitioning = false;
  private transitionCooldownMs = 0;
  private readonly localization: RoccoLocalization;
  private readonly inventory: RoccoInventory;
  private stanPoliceDefeat: StanPoliceDefeatSequence | null = null;
  private baitShopDoorEntry: BaitShopDoorEntrySequence | null = null;
  private stanMoneyExchange: StanMoneyExchangeSequence | null = null;
  private developerJumpPending = false;
  private developerSpriteCycleActive = false;
  private readonly developerSpriteCycleIndexes = new Map<string, number>();
  private readonly developerSpriteCycleOriginalStates = new Map<
    string,
    RoccoDeveloperSpriteCycleOriginalState
  >();
  private developerSpriteCyclePreviousCursorAttachment: RoccoDeveloperCursorAttachment | null = null;
  private pendingExitIntent: RoccoPendingExitIntent | null = null;

  constructor(options: RoccoLevelManagerOptions = {}) {
    this.options = {
      cartridgeTitle: 'ROCCO',
      ...options,
    };
    this.localization = options.localization ?? createRoccoLocalization();
    this.inventory = options.inventory ?? new RoccoInventory();
    this.inventory.addItem(createRoccoTwentyEurosInventoryItem(this.localization));
    this.registerDefaultLevels();
  }

  async mount(engine: RoccoEngine): Promise<RoccoLevelManagerMountResult> {
    this.engine = engine;
    this.engine.audio.registerSound({
      id: STAN_POLICE_DEFEAT_SOUND_ID,
      uri: roccoDefaultPoliceWhistleSoundUrl,
      volume: STAN_POLICE_DEFEAT_SOUND_VOLUME,
      loop: false,
    });
    await this.engine.audio.preloadSound(STAN_POLICE_DEFEAT_SOUND_ID).catch(() => {
      this.engine?.log('Audio', 'Stan police whistle sound could not be preloaded.');
    });
    this.engine.audio.stopSound(STAN_POLICE_DEFEAT_SOUND_ID);
    this.clearStanPoliceDefeatPresentation();
    this.activeSceneId = null;
    this.developerJumpPending = false;
    this.developerSpriteCycleActive = false;
    this.developerSpriteCycleIndexes.clear();
    this.developerSpriteCycleOriginalStates.clear();
    this.developerSpriteCyclePreviousCursorAttachment = null;
    this.pendingExitIntent = null;
    const level = this.requireLevel(DEFAULT_START_LEVEL_ID);
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

    this.deactivateDeveloperSpriteCycleMode();
    this.activeLevel.unmount(this.engine);
    uninstallRoccoPlayerActionMenu(this.engine);
    this.stanPoliceDefeat = null;
    this.clearStanPoliceDefeatPresentation();
    this.baitShopDoorEntry = null;
    this.stanMoneyExchange = null;
    this.activeSceneId = null;
    this.developerJumpPending = false;
    this.developerSpriteCycleActive = false;
    this.developerSpriteCycleIndexes.clear();
    this.developerSpriteCycleOriginalStates.clear();
    this.developerSpriteCyclePreviousCursorAttachment = null;
    this.pendingExitIntent = null;
    this.engine.audio.unregisterSound(STAN_POLICE_DEFEAT_SOUND_ID);
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.gridMenus.clearCarriedItem();
    this.activeLevel = null;
    this.engine = null;
  }

  update(deltaMs: number): void {
    if (this.stanPoliceDefeat) {
      this.updateStanPoliceDefeat(deltaMs);
      return;
    }

    if (this.baitShopDoorEntry) {
      this.updateBaitShopDoorEntry(deltaMs);
      return;
    }

    if (this.stanMoneyExchange) {
      this.updateStanMoneyExchange(deltaMs);
      return;
    }

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

    if (!this.matchesPendingExitIntent(this.activeLevel.id, connector.id)) {
      return;
    }

    void this.transitionThrough(connector);
  }

  handleAction(activation: RoccoCartridgeAction): RoccoCartridgeActionResult | void {
    if (this.stanPoliceDefeat || this.baitShopDoorEntry || this.stanMoneyExchange) {
      return;
    }

    if (isSceneClickCartridgeAction(activation)) {
      if (this.handleDeveloperSpriteCycleSceneClick(activation)) {
        return { suppressDefaultPlayerMove: true };
      }

      if (this.handleDeveloperJumpSceneClick(activation)) {
        return { suppressDefaultPlayerMove: true };
      }

      this.updatePendingExitIntent(activation);
      const carriedItem = this.engine?.video.gridMenus.getCarriedItem();
      if (carriedItem?.definitionId === ROCCO_INVENTORY_MENU_ID) {
        if (this.handleLevelInventorySceneClick(activation, carriedItem)) {
          return;
        }
        this.handleInventorySceneClick(activation, carriedItem);
        return;
      }

      return this.activeLevel?.handleSceneClick?.(activation);
    }

    if (isGridMenuCartridgeAction(activation)) {
      if (this.handleDeveloperGridAction(activation)) {
        return;
      }

      this.handleInventoryGridAction(activation);
      return;
    }

    if (isRoccoPlayerDeveloperAction(activation)) {
      this.openDeveloperRootMenu();
      return;
    }

    if (isRoccoPlayerInventoryAction(activation)) {
      this.toggleInventoryMenu();
      return;
    }

    this.activeLevel?.handleAction(activation);
  }

  getActiveLevel(): RoccoLevel | null {
    return this.activeLevel;
  }

  private registerDefaultLevels(): void {
    const levels: RoccoLevel[] = [
      new RoccoPierMiddleLevel(this.localization),
      new RoccoPierSideLevel({
        id: ROCCO_PIER_START_LEVEL_ID,
        title: this.localization.text.levels.beginning,
        sceneId: PIER_START_SCENE_ID,
        backgroundScrollX: PIER_BACKGROUND_SCROLL_RIGHT_X,
        connectors: PIER_START_CONNECTORS,
        mountAmbient: (engine) =>
          installPierBeginningAmbient(engine, this.localization, this.beginningAmbientState),
      }),
      new RoccoPierSideLevel({
        id: ROCCO_PIER_END_LEVEL_ID,
        title: this.localization.text.levels.end,
        sceneId: PIER_END_SCENE_ID,
        backgroundScrollX: PIER_BACKGROUND_SCROLL_LEFT_X,
        connectors: PIER_END_CONNECTORS,
      }),
      new RoccoBaitShopLevel(this.localization, {
        isStanIdentified: () => this.beginningAmbientState.stan.isIdentified,
        hasMysteriousKey: () => this.inventory.hasItem(ROCCO_INVENTORY_MYSTERIOUS_KEY_ITEM_ID),
        onMysteriousKeyCollected: () => {
          this.inventory.addItem(createRoccoMysteriousKeyInventoryItem(this.localization));
        },
      }),
      new RoccoBaitShopSecondLevel(this.localization, {
        hasMagazine: () => this.inventory.hasItem(ROCCO_INVENTORY_MAGAZINE_ITEM_ID),
        onMagazineCollected: (known) => {
          this.inventory.addItem(createRoccoMagazineInventoryItem(this.localization, known));
        },
      }),
      new RoccoBaitShopToiletLevel(this.localization, {
        hasMagazine: () => this.inventory.hasItem(ROCCO_INVENTORY_MAGAZINE_ITEM_ID),
        isStanIdentified: () => this.beginningAmbientState.stan.isIdentified,
      }),
    ];

    for (const level of levels) {
      this.levels.set(level.id, level);
    }
  }

  private resolveTouchedConnector(level: RoccoLevel): RoccoLevelConnector | undefined {
    const playerGround = this.resolvePlayerGroundPoint();
    if (!playerGround) {
      return undefined;
    }

    return level.connectors.find(
      (connector) => connector.exitArea && containsRoccoLevelRectPoint(connector.exitArea, playerGround),
    );
  }

  private resolveClickedConnector(
    level: RoccoLevel,
    scenePoint: RoccoPoint,
  ): RoccoLevelConnector | undefined {
    return level.connectors.find(
      (connector) => connector.exitArea && containsRoccoLevelRectPoint(connector.exitArea, scenePoint),
    );
  }

  private updatePendingExitIntent(activation: RoccoSceneClickAction): void {
    if (!this.activeLevel) {
      this.pendingExitIntent = null;
      return;
    }

    if (activation.targetInstanceId) {
      this.pendingExitIntent = null;
      return;
    }

    const connector = this.resolveClickedConnector(this.activeLevel, {
      x: activation.sceneX,
      y: activation.sceneY,
    });
    this.pendingExitIntent = connector
      ? {
          levelId: this.activeLevel.id,
          connectorId: connector.id,
        }
      : null;
  }

  private matchesPendingExitIntent(levelId: string, connectorId: string): boolean {
    return (
      this.pendingExitIntent?.levelId === levelId &&
      this.pendingExitIntent.connectorId === connectorId
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

  private resolvePlayerPosition(): RoccoPoint | undefined {
    if (!this.engine) {
      return undefined;
    }

    const player = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!player) {
      return undefined;
    }

    return {
      x: player.transform.x,
      y: player.transform.y,
    };
  }

  private resolveMirroredPlayerPosition(): RoccoPoint | undefined {
    const playerPosition = this.resolvePlayerPosition();
    if (!playerPosition || !this.engine) {
      return undefined;
    }

    const player = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    if (!player) {
      return undefined;
    }

    const scaleX = player.transform.scaleX || 1;
    const groundOffsetX = DEFAULT_SPRITE_GROUND_ANCHOR_X * scaleX;
    const mirroredGroundX = DEFAULT_DESIGN_WIDTH - (playerPosition.x + groundOffsetX);

    return {
      x: mirroredGroundX - groundOffsetX,
      y: playerPosition.y,
    };
  }

  private async switchToLevel(levelId: string): Promise<boolean> {
    if (!this.engine || !this.activeLevel) {
      return false;
    }

    if (this.activeLevel.id === levelId) {
      return true;
    }

    this.deactivateDeveloperSpriteCycleMode();
    const currentLevel = this.activeLevel;
    const targetLevel = this.requireLevel(levelId);
    const engine = this.engine;
    this.transitioning = true;
    this.pendingExitIntent = null;
    engine.setInputEnabled(false);
    engine.beginComposition();

    try {
      currentLevel.unmount(engine);
      this.activeLevel = targetLevel;
      const scene = await targetLevel.mount(engine, this.createLevelMountOptions());
      this.updateStatus(scene);
      return true;
    } catch (error) {
      engine.log('System', `Developer level jump failed: ${String(error)}`);
      this.activeLevel = currentLevel;
      return false;
    } finally {
      engine.endComposition();
      engine.setInputEnabled(true);
      this.transitioning = false;
      engine.video.render(0);
    }
  }

  private async transitionThrough(connector: RoccoLevelConnector): Promise<void> {
    if (!this.engine || !this.activeLevel) {
      return;
    }

    this.deactivateDeveloperSpriteCycleMode();
    const currentLevel = this.activeLevel;
    const targetEndpoint = this.resolveConnectedEndpoint(currentLevel.id, connector.id);
    if (!targetEndpoint) {
      return;
    }

    const targetLevel = this.requireLevel(targetEndpoint.levelId);
    const engine = this.engine;
    const entryPosition = connector.preservePlayerPosition
      ? this.resolveMirroredPlayerPosition()
      : undefined;
    this.transitioning = true;
    this.pendingExitIntent = null;
    engine.setInputEnabled(false);
    engine.beginComposition();

    try {
      currentLevel.unmount(engine);
      this.activeLevel = targetLevel;
      const scene = await targetLevel.mount(engine, {
        entryConnectorId: targetEndpoint.connectorId,
        entryPosition,
        ...this.createLevelMountOptions(),
      });
      this.transitionCooldownMs = PIER_LEVEL_TRANSITION_COOLDOWN_MS;
      this.updateStatus(scene);
    } catch (error) {
      engine.log('System', `Level transition failed: ${String(error)}`);
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

  private updateStatus(scene: RoccoPlaneScene): void {
    if (!this.engine || !this.activeLevel) {
      return;
    }

    this.activeSceneId = scene.id;
    this.engine.setStatus(this.buildStatusMessage(scene.id));
  }

  private refreshStatus(): void {
    if (!this.engine || !this.activeLevel || !this.activeSceneId) {
      return;
    }

    this.engine.setStatus(this.buildStatusMessage(this.activeSceneId));
  }

  private buildStatusMessage(sceneId: string): string {
    const baseStatus =
      `${this.localization.text.levels.statusCartridge}: ${this.options.cartridgeTitle ?? 'ROCCO'} | ${this.localization.text.levels.statusLevel}: ${this.activeLevel?.title ?? ''} | ${this.localization.text.levels.statusScene}: ${sceneId}`;

    if (this.developerSpriteCycleActive) {
      return `${baseStatus} | ${this.localization.text.developer.clickToCycleSpriteStatus}`;
    }

    if (!this.developerJumpPending) {
      return baseStatus;
    }

    return `${baseStatus} | ${this.localization.text.developer.clickToJumpStatus}`;
  }

  private createLevelMountOptions(): {
    onKeysCollected: () => void;
    onConnectorTransitionRequested: (connectorId: string) => boolean;
    onRestartRequested?: () => void;
  } {
    return {
      onKeysCollected: () => {
        this.inventory.addItem(createRoccoKeysInventoryItem(this.localization));
        this.engine?.video.messages.think(
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
      onConnectorTransitionRequested: (connectorId: string) =>
        this.requestScriptedConnectorTransition(connectorId),
      onRestartRequested: this.options.onRestartRequested,
    };
  }

  private requestScriptedConnectorTransition(connectorId: string): boolean {
    if (!this.activeLevel || this.transitioning) {
      return false;
    }

    const connector = findRoccoLevelConnector(this.activeLevel.connectors, connectorId);
    if (!connector) {
      return false;
    }

    if (connector.requiresKeys && !this.inventory.hasItem(ROCCO_INVENTORY_KEYS_ITEM_ID)) {
      return false;
    }

    void this.transitionThrough(connector);
    return true;
  }

  private toggleInventoryMenu(): void {
    if (!this.engine) {
      return;
    }

    this.developerJumpPending = false;
    this.deactivateDeveloperSpriteCycleMode();
    this.engine.setInputEnabled(true);
    this.engine.video.actionMenus.closeMenu();
    this.engine.video.gridMenus.toggleMenu(this.inventory.createGridMenuDefinition(this.localization));
    this.refreshStatus();
    this.engine.video.render(0);
  }

  private handleInventoryGridAction(activation: RoccoGridMenuCartridgeAction): void {
    if (activation.definitionId !== ROCCO_INVENTORY_MENU_ID) {
      this.activeLevel?.handleGridMenu?.(activation);
      return;
    }

    if (activation.interaction === 'place' || activation.interaction === 'carry') {
      this.inventory.applyGridMenuItems(activation.items);
    }
  }

  private handleDeveloperGridAction(activation: RoccoGridMenuCartridgeAction): boolean {
    if (!ROCCO_DEVELOPER_MODE_ENABLED) {
      return false;
    }

    if (activation.definitionId === ROCCO_DEVELOPER_ROOT_MENU_ID) {
      if (activation.interaction === 'activate') {
        this.handleDeveloperRootSelection(activation.itemId);
      }
      return true;
    }

    if (activation.definitionId === ROCCO_DEVELOPER_LEVEL_MENU_ID) {
      if (activation.interaction === 'activate' && activation.itemId) {
        this.openDeveloperScreenMenu(activation.itemId);
      }
      return true;
    }

    if (activation.definitionId === ROCCO_DEVELOPER_SCREEN_MENU_ID) {
      if (activation.interaction === 'activate' && activation.itemId) {
        void this.prepareDeveloperJump(activation.itemId);
      }
      return true;
    }

    if (activation.definitionId === ROCCO_DEVELOPER_INVENTORY_MENU_ID) {
      if (activation.interaction === 'activate' && activation.itemId) {
        this.toggleDeveloperInventoryItem(activation.itemId);
      }
      return true;
    }

    return false;
  }

  private openDeveloperRootMenu(): void {
    if (!this.engine || !ROCCO_DEVELOPER_MODE_ENABLED) {
      return;
    }

    this.developerJumpPending = false;
    this.deactivateDeveloperSpriteCycleMode();
    this.engine.setInputEnabled(true);
    this.engine.video.actionMenus.closeMenu();
    this.engine.video.gridMenus.openMenu(createRoccoDeveloperRootMenuDefinition(this.localization));
    this.refreshStatus();
    this.engine.video.render(0);
  }

  private handleDeveloperRootSelection(itemId: string | undefined): void {
    if (!itemId) {
      return;
    }

    if (itemId === ROCCO_DEVELOPER_JUMP_CHOICE_ID) {
      this.openDeveloperLevelMenu();
      return;
    }

    if (itemId === ROCCO_DEVELOPER_INVENTORY_CHOICE_ID) {
      this.openDeveloperInventoryMenu();
      return;
    }

    if (itemId === ROCCO_DEVELOPER_CYCLE_SPRITE_CHOICE_ID) {
      this.activateDeveloperSpriteCycleMode();
    }
  }

  private openDeveloperLevelMenu(): void {
    if (!this.engine || !ROCCO_DEVELOPER_MODE_ENABLED) {
      return;
    }

    this.developerJumpPending = false;
    this.deactivateDeveloperSpriteCycleMode();
    this.engine.setInputEnabled(true);
    this.engine.video.gridMenus.openMenu(
      createRoccoDeveloperLevelMenuDefinition(this.localization, this.createDeveloperLevelOptions()),
    );
    this.refreshStatus();
    this.engine.video.render(0);
  }

  private openDeveloperScreenMenu(levelOptionId: string): void {
    if (!this.engine || !ROCCO_DEVELOPER_MODE_ENABLED) {
      return;
    }

    const levelOption = this.findDeveloperLevelOption(levelOptionId);
    if (!levelOption) {
      return;
    }

    this.developerJumpPending = false;
    this.deactivateDeveloperSpriteCycleMode();
    this.engine.setInputEnabled(true);
    this.engine.video.gridMenus.openMenu(
      createRoccoDeveloperScreenMenuDefinition(this.localization, levelOption.screens),
    );
    this.refreshStatus();
    this.engine.video.render(0);
  }

  private openDeveloperInventoryMenu(): void {
    if (!this.engine || !ROCCO_DEVELOPER_MODE_ENABLED) {
      return;
    }

    this.developerJumpPending = false;
    this.deactivateDeveloperSpriteCycleMode();
    this.engine.setInputEnabled(true);
    this.engine.video.gridMenus.openMenu(
      createRoccoDeveloperInventoryMenuDefinition(this.localization, this.inventory),
    );
    this.refreshStatus();
    this.engine.video.render(0);
  }

  private async prepareDeveloperJump(screenId: string): Promise<void> {
    if (!this.engine || !ROCCO_DEVELOPER_MODE_ENABLED) {
      return;
    }

    this.deactivateDeveloperSpriteCycleMode();
    const screenOption = this.findDeveloperScreenOption(screenId);
    if (!screenOption) {
      return;
    }

    this.developerJumpPending = false;
    const switched = await this.switchToLevel(screenOption.targetLevelId);
    if (!switched) {
      this.refreshStatus();
      return;
    }

    this.developerJumpPending = true;
    this.engine.setInputEnabled(false);
    this.refreshStatus();
    this.engine.video.render(0);
  }

  private toggleDeveloperInventoryItem(itemId: string): void {
    if (!ROCCO_DEVELOPER_MODE_ENABLED) {
      return;
    }

    const item = createRoccoDeveloperInventoryItem(this.localization, itemId);
    if (!item) {
      return;
    }

    if (item.id === itemId) {
      if (this.inventory.hasItem(itemId)) {
        this.inventory.removeItem(itemId);
      } else {
        this.inventory.addItem(item);
      }
    } else {
      const currentVariant = this.inventory
        .listItems()
        .find((inventoryItem) => inventoryItem.id === item.id);
      if (currentVariant?.label === item.label) {
        this.inventory.removeItem(item.id);
      } else {
        this.inventory.addItem(item);
      }
    }

    this.openDeveloperInventoryMenu();
  }

  private createDeveloperLevelOptions(): readonly RoccoDeveloperLevelOption[] {
    return [
      {
        id: 'pier',
        title: this.localization.text.developer.pierLevelLabel,
        screens: [
          {
            id: ROCCO_PIER_START_LEVEL_ID,
            title: this.requireLevel(ROCCO_PIER_START_LEVEL_ID).title,
            targetLevelId: ROCCO_PIER_START_LEVEL_ID,
          },
          {
            id: ROCCO_PIER_MIDDLE_LEVEL_ID,
            title: this.requireLevel(ROCCO_PIER_MIDDLE_LEVEL_ID).title,
            targetLevelId: ROCCO_PIER_MIDDLE_LEVEL_ID,
          },
          {
            id: ROCCO_PIER_END_LEVEL_ID,
            title: this.requireLevel(ROCCO_PIER_END_LEVEL_ID).title,
            targetLevelId: ROCCO_PIER_END_LEVEL_ID,
          },
        ],
      },
      {
        id: ROCCO_BAIT_SHOP_LEVEL_ID,
        title: this.requireLevel(ROCCO_BAIT_SHOP_LEVEL_ID).title,
        screens: [
          {
            id: ROCCO_BAIT_SHOP_LEVEL_ID,
            title: `${this.requireLevel(ROCCO_BAIT_SHOP_LEVEL_ID).title} 1`,
            targetLevelId: ROCCO_BAIT_SHOP_LEVEL_ID,
          },
          {
            id: ROCCO_BAIT_SHOP_SECOND_LEVEL_ID,
            title: `${this.requireLevel(ROCCO_BAIT_SHOP_LEVEL_ID).title} 2`,
            targetLevelId: ROCCO_BAIT_SHOP_SECOND_LEVEL_ID,
          },
          {
            id: ROCCO_BAIT_SHOP_TOILET_LEVEL_ID,
            title: this.requireLevel(ROCCO_BAIT_SHOP_TOILET_LEVEL_ID).title,
            targetLevelId: ROCCO_BAIT_SHOP_TOILET_LEVEL_ID,
          },
        ],
      },
    ];
  }

  private findDeveloperLevelOption(levelOptionId: string): RoccoDeveloperLevelOption | undefined {
    return this.createDeveloperLevelOptions().find((levelOption) => levelOption.id === levelOptionId);
  }

  private findDeveloperScreenOption(screenId: string): RoccoDeveloperLevelOption['screens'][number] | undefined {
    for (const levelOption of this.createDeveloperLevelOptions()) {
      const screenOption = levelOption.screens.find((screen) => screen.id === screenId);
      if (screenOption) {
        return screenOption;
      }
    }

    return undefined;
  }

  private handleInventorySceneClick(
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ): void {
    if (!this.engine) {
      return;
    }

    if (!activation.targetInstanceId) {
      this.engine.video.gridMenus.clearCarriedItem();
      this.engine.video.render(0);
      return;
    }

    if (this.shouldTriggerBaitShopDoorUse(activation, carriedItem)) {
      this.startBaitShopDoorUse();
      return;
    }

    if (this.shouldTriggerStanPoliceDefeat(activation, carriedItem)) {
      this.startStanPoliceDefeat();
      return;
    }

    if (this.shouldGiveStanMoney(activation, carriedItem)) {
      this.giveStanMoney();
      return;
    }

    this.engine.video.messages.think(
      DEFAULT_SPRITE_INSTANCE_ID,
      resolveRoccoInventoryUseLines({
        itemId: carriedItem.item.id,
        targetInstanceId: activation.targetInstanceId,
        localization: this.localization,
      }),
      {
        lineSelection: {
          mode: 'random',
          count: 1,
          historyKey: `inventory-use:${carriedItem.item.id}:${activation.targetInstanceId}`,
          avoidImmediateRepeat: true,
        },
        ttlMs: 5200,
      },
    );
    this.engine.video.gridMenus.clearCarriedItem();
    this.engine.video.render(0);
  }

  private handleLevelInventorySceneClick(
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ): boolean {
    if (!this.activeLevel || !hasInventorySceneClickHandler(this.activeLevel)) {
      return false;
    }

    return this.activeLevel.handleInventorySceneClick(activation, carriedItem);
  }

  private handleDeveloperJumpSceneClick(activation: RoccoSceneClickAction): boolean {
    if (!this.engine || !ROCCO_DEVELOPER_MODE_ENABLED || !this.developerJumpPending) {
      return false;
    }

    const player = this.engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID);
    this.developerJumpPending = false;
    this.engine.setInputEnabled(true);
    this.engine.video.actionMenus.closeMenu();
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.messages.clearMessages();

    if (!player) {
      this.refreshStatus();
      this.engine.video.render(0);
      return true;
    }

    const scaleX = player.transform.scaleX || 1;
    const scaleY = player.transform.scaleY || 1;
    this.engine.video.sprites.stopMovement(DEFAULT_SPRITE_INSTANCE_ID);
    this.engine.video.sprites.setPosition(
      DEFAULT_SPRITE_INSTANCE_ID,
      activation.sceneX - DEFAULT_SPRITE_GROUND_ANCHOR_X * scaleX,
      activation.sceneY - DEFAULT_SPRITE_GROUND_ANCHOR_Y * scaleY,
      {
        constrainToWalkMap: false,
      },
    );
    this.refreshStatus();
    this.engine.video.render(0);
    return true;
  }

  private activateDeveloperSpriteCycleMode(): void {
    if (!this.engine || !ROCCO_DEVELOPER_MODE_ENABLED) {
      return;
    }

    this.developerJumpPending = false;
    this.deactivateDeveloperSpriteCycleMode();
    this.developerSpriteCycleIndexes.clear();
    this.developerSpriteCycleActive = true;
    this.developerSpriteCyclePreviousCursorAttachment =
      this.engine.video.viewport.getHost()?.getCursorAttachment() ?? null;
    this.engine.video.actionMenus.closeMenu();
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.messages.clearMessages();
    this.engine.video.viewport.getHost()?.setCursorAttachment({
      imageUri: roccoDefaultDeveloperSpriteCycleCursorAssetUrl,
      label: this.localization.text.developer.cycleSprite,
      size: DEVELOPER_SPRITE_CYCLE_CURSOR_SIZE,
      opacity: 0.96,
    });
    this.engine.setInputEnabled(false);
    this.refreshStatus();
    this.engine.video.render(0);
  }

  private deactivateDeveloperSpriteCycleMode(): void {
    if (this.engine) {
      for (const [instanceId, originalState] of this.developerSpriteCycleOriginalStates) {
        this.restoreDeveloperSpriteCycleState(instanceId, originalState);
      }
      this.engine.video.viewport
        .getHost()
        ?.setCursorAttachment(this.developerSpriteCyclePreviousCursorAttachment ?? undefined);
      this.engine.video.titles.removeTitle(DEVELOPER_SPRITE_CYCLE_TOP_TITLE_ID);
      this.engine.video.titles.removeTitle(DEVELOPER_SPRITE_CYCLE_SPRITE_TITLE_ID);
    }

    this.developerSpriteCycleActive = false;
    this.developerSpriteCycleIndexes.clear();
    this.developerSpriteCycleOriginalStates.clear();
    this.developerSpriteCyclePreviousCursorAttachment = null;
  }

  private handleDeveloperSpriteCycleSceneClick(activation: RoccoSceneClickAction): boolean {
    if (!this.engine || !ROCCO_DEVELOPER_MODE_ENABLED || !this.developerSpriteCycleActive) {
      return false;
    }

    if (!activation.targetInstanceId) {
      this.deactivateDeveloperSpriteCycleMode();
      this.engine.setInputEnabled(true);
      this.refreshStatus();
      this.engine.video.render(0);
      return true;
    }

    const sprite = this.engine.video.sprites.getSprite(activation.targetInstanceId);
    if (!sprite) {
      this.deactivateDeveloperSpriteCycleMode();
      this.engine.setInputEnabled(true);
      this.refreshStatus();
      this.engine.video.render(0);
      return true;
    }

    this.showNextDeveloperSpriteCyclePreview(sprite);
    return true;
  }

  private showNextDeveloperSpriteCyclePreview(sprite: RoccoSpriteInstance): void {
    if (!this.engine) {
      return;
    }

    const definition = this.ensureDeveloperSpriteCycleDefinition(sprite.definitionId);
    if (!definition || definition.images.length === 0) {
      return;
    }

    if (!this.developerSpriteCycleOriginalStates.has(sprite.id)) {
      this.developerSpriteCycleOriginalStates.set(sprite.id, {
        animationId: sprite.animation.animationId,
        frameIndex: sprite.animation.frameIndex,
        playbackRate: sprite.animation.playbackRate,
        playing: sprite.animation.playing,
        action: sprite.action ? { ...sprite.action } : undefined,
        facing: sprite.facing,
      });
    }

    const nextIndex =
      ((this.developerSpriteCycleIndexes.get(sprite.id) ?? -1) + 1) % definition.images.length;
    this.developerSpriteCycleIndexes.set(sprite.id, nextIndex);
    this.engine.video.sprites.playAnimation(sprite.id, DEVELOPER_SPRITE_CYCLE_ANIMATION_ID, {
      restart: sprite.animation.animationId !== DEVELOPER_SPRITE_CYCLE_ANIMATION_ID,
    });
    this.engine.video.sprites.setAnimationFrame(sprite.id, nextIndex);
    this.engine.video.sprites.stopAnimation(sprite.id);

    const preview = this.resolveDeveloperSpriteCyclePreview(definition, nextIndex);
    if (!preview) {
      this.engine.video.render(0);
      return;
    }

    this.updateDeveloperSpriteCycleTitles(sprite.id, preview, nextIndex);
    this.engine.video.render(0);
  }

  private ensureDeveloperSpriteCycleDefinition(
    definitionId: string,
  ): RoccoSpriteDefinition | undefined {
    if (!this.engine) {
      return undefined;
    }

    const definition = this.engine.video.sprites.getSpriteDefinition(definitionId);
    if (!definition) {
      return undefined;
    }

    if (definition.animations[DEVELOPER_SPRITE_CYCLE_ANIMATION_ID]) {
      return definition;
    }

    const existingFrameByImageId = new Map<string, RoccoSpriteFrame>();
    for (const frame of definition.frames) {
      if (!existingFrameByImageId.has(frame.imageId)) {
        existingFrameByImageId.set(frame.imageId, frame);
      }
    }

    const extraFrames: RoccoSpriteFrame[] = [];
    const previewFrameRefs = definition.images.map((image, index) => {
      const existingFrame = existingFrameByImageId.get(image.id);
      if (existingFrame) {
        return {
          frameId: existingFrame.id,
          durationMs: DEVELOPER_SPRITE_CYCLE_FRAME_DURATION_MS,
        };
      }

      const frameId = `${DEVELOPER_SPRITE_CYCLE_FRAME_ID_PREFIX}-${index}`;
      extraFrames.push({
        id: frameId,
        imageId: image.id,
        durationMs: DEVELOPER_SPRITE_CYCLE_FRAME_DURATION_MS,
        pivot: definition.pivot,
        hitbox: definition.hitbox,
      });
      return {
        frameId,
        durationMs: DEVELOPER_SPRITE_CYCLE_FRAME_DURATION_MS,
      };
    });

    const augmentedDefinition: RoccoSpriteDefinition = {
      ...definition,
      frames: [...definition.frames, ...extraFrames],
      animations: {
        ...definition.animations,
        [DEVELOPER_SPRITE_CYCLE_ANIMATION_ID]: {
          id: DEVELOPER_SPRITE_CYCLE_ANIMATION_ID,
          loop: true,
          playbackRate: 1,
          frames: previewFrameRefs,
        },
      },
    };

    this.engine.video.sprites.loadSpriteDefinition(augmentedDefinition);
    return augmentedDefinition;
  }

  private resolveDeveloperSpriteCyclePreview(
    definition: RoccoSpriteDefinition,
    imageIndex: number,
  ): RoccoDeveloperSpriteCyclePreview | undefined {
    const clip = definition.animations[DEVELOPER_SPRITE_CYCLE_ANIMATION_ID];
    const image = definition.images[imageIndex];
    const frameId = clip?.frames[imageIndex]?.frameId;
    if (!image || !frameId) {
      return undefined;
    }

    const frame = definition.frames.find((candidate) => candidate.id === frameId);
    if (!frame) {
      return undefined;
    }

    return { image, frame };
  }

  private updateDeveloperSpriteCycleTitles(
    instanceId: string,
    preview: RoccoDeveloperSpriteCyclePreview,
    imageIndex: number,
  ): void {
    if (!this.engine) {
      return;
    }

    const sprite = this.engine.video.sprites.getSprite(instanceId);
    if (!sprite) {
      return;
    }

    const indexText = String(imageIndex);
    const labelPosition = this.resolveDeveloperSpriteCycleLabelPosition(sprite, preview);
    this.engine.video.titles.addTitle({
      id: DEVELOPER_SPRITE_CYCLE_TOP_TITLE_ID,
      text: indexText,
      renderLayer: 'overlay.titles',
      zIndex: 5000,
      x: DEFAULT_DESIGN_WIDTH / 2,
      y: 34,
      anchor: { x: 0.5, y: 0.5 },
      style: {
        fill: '#d7e6c5',
        fontFamily: 'Cascadia Mono, Lucida Console, monospace',
        fontSize: 28,
        fontWeight: '700',
        align: 'center',
        stroke: {
          color: '#0f1610',
          width: 5,
          alpha: 0.95,
        },
      },
      visible: true,
    });
    this.engine.video.titles.addTitle({
      id: DEVELOPER_SPRITE_CYCLE_SPRITE_TITLE_ID,
      text: indexText,
      renderLayer: 'overlay.titles',
      zIndex: 5000,
      x: labelPosition.x,
      y: labelPosition.y,
      anchor: { x: 0.5, y: 0.5 },
      style: {
        fill: '#8ecf6e',
        fontFamily: 'Cascadia Mono, Lucida Console, monospace',
        fontSize: 22,
        fontWeight: '700',
        align: 'center',
        stroke: {
          color: '#0f1610',
          width: 4,
          alpha: 0.95,
        },
      },
      visible: true,
    });
  }

  private resolveDeveloperSpriteCycleLabelPosition(
    sprite: RoccoSpriteInstance,
    preview: RoccoDeveloperSpriteCyclePreview,
  ): RoccoPoint {
    const previewWidth = preview.frame.rect?.width ?? preview.image.width ?? 0;
    const pivot = preview.frame.pivot ?? { x: 0, y: 0 };
    const scaleX = sprite.transform.scaleX || 1;
    const scaleY = sprite.transform.scaleY || 1;
    const horizontalDirection = sprite.transform.flipX ? -1 : 1;
    const x = sprite.transform.x + (previewWidth / 2 - pivot.x) * scaleX * horizontalDirection;
    const y = Math.max(22, sprite.transform.y - pivot.y * scaleY - 18);
    return { x, y };
  }

  private restoreDeveloperSpriteCycleState(
    instanceId: string,
    originalState: RoccoDeveloperSpriteCycleOriginalState,
  ): void {
    if (!this.engine) {
      return;
    }

    const sprite = this.engine.video.sprites.getSprite(instanceId);
    if (!sprite) {
      return;
    }

    try {
      if (originalState.action) {
        this.engine.video.sprites.playAction(instanceId, originalState.action.actionId, {
          direction: originalState.action.direction,
          restart: true,
          playbackRate: originalState.playbackRate,
        });
      } else {
        this.engine.video.sprites.playAnimation(instanceId, originalState.animationId, {
          restart: true,
          playbackRate: originalState.playbackRate,
        });
      }
      this.engine.video.sprites.setAnimationFrame(instanceId, originalState.frameIndex);
      if (originalState.facing) {
        this.engine.video.sprites.setFacing(instanceId, originalState.facing);
      }
      if (!originalState.playing) {
        this.engine.video.sprites.stopAnimation(instanceId);
      }
    } catch (error) {
      this.engine.log('System', `Developer sprite cycle restore failed: ${String(error)}`);
    }
  }

  private requireLevel(levelId: string): RoccoLevel {
    const level = this.levels.get(levelId);
    if (!level) {
      throw new Error(`Level '${levelId}' is not registered.`);
    }

    return level;
  }

  private shouldTriggerStanPoliceDefeat(
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ): boolean {
    return (
      this.activeLevel?.id === ROCCO_PIER_START_LEVEL_ID &&
      carriedItem.item.id === ROCCO_INVENTORY_KEYS_ITEM_ID &&
      activation.targetInstanceId === DEFAULT_STAN_SPRITE_INSTANCE_ID
    );
  }

  private shouldTriggerBaitShopDoorUse(
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ): boolean {
    return (
      this.activeLevel?.id === ROCCO_PIER_START_LEVEL_ID &&
      carriedItem.item.id === ROCCO_INVENTORY_KEYS_ITEM_ID &&
      activation.targetInstanceId === DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID
    );
  }

  private shouldGiveStanMoney(
    activation: RoccoSceneClickAction,
    carriedItem: RoccoGridMenuCarriedItem,
  ): boolean {
    return (
      this.activeLevel?.id === ROCCO_PIER_START_LEVEL_ID &&
      carriedItem.item.id === ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID &&
      activation.targetInstanceId === DEFAULT_STAN_SPRITE_INSTANCE_ID
    );
  }

  private startStanPoliceDefeat(): void {
    if (!this.engine) {
      return;
    }

    this.stanPoliceDefeat = {
      phase: 'speaking',
      elapsedMs: 0,
    };
    this.engine.setInputEnabled(false);
    this.engine.video.gridMenus.clearCarriedItem();
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.actionMenus.closeMenu();
    this.engine.video.sprites.playAnimation(
      DEFAULT_STAN_SPRITE_INSTANCE_ID,
      DEFAULT_STAN_LOOK_RIGHT_ANIMATION_ID,
      {
        restart: true,
      },
    );
    this.engine.video.messages.say(
      DEFAULT_STAN_SPRITE_INSTANCE_ID,
      this.localization.text.inventory.keysOnStanArrestLine,
      {
        ttlMs: STAN_POLICE_DEFEAT_MESSAGE_TTL_MS,
        style: {
          fill: DEFAULT_STAN_DIALOGUE_TEXT_COLOR,
        },
      },
    );
    this.engine.video.render(0);
  }

  private giveStanMoney(): void {
    if (!this.engine) {
      return;
    }

    this.inventory.removeItem(ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID);
    this.stanMoneyExchange = {
      phase: 'stan-speaking',
      elapsedMs: 0,
    };
    this.engine.setInputEnabled(false);
    this.engine.video.gridMenus.clearCarriedItem();
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.actionMenus.closeMenu();
    this.engine.video.sprites.playAnimation(
      DEFAULT_STAN_SPRITE_INSTANCE_ID,
      DEFAULT_STAN_LOOK_RIGHT_ANIMATION_ID,
      {
        restart: true,
      },
    );
    this.engine.video.messages.say(
      DEFAULT_STAN_SPRITE_INSTANCE_ID,
      this.localization.text.inventory.moneyOnStanAcceptedLines,
      {
        lineSelection: {
          mode: 'random',
          count: 1,
          historyKey: 'inventory-money-on-stan-accepted',
          avoidImmediateRepeat: true,
        },
        ttlMs: STAN_MONEY_ACCEPTED_TTL_MS,
        style: {
          fill: DEFAULT_STAN_DIALOGUE_TEXT_COLOR,
        },
      },
    );
    this.engine.video.render(0);
  }

  private startBaitShopDoorUse(): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.gridMenus.clearCarriedItem();
    this.engine.video.gridMenus.closeMenu();
    this.engine.video.actionMenus.closeMenu();
    this.pendingExitIntent = null;
    if (this.isStanAwake()) {
      this.startStanPoliceDefeat();
      return;
    }

    this.baitShopDoorEntry = {
      phase: 'open-door-hold',
      elapsedMs: 0,
    };
    this.engine.setInputEnabled(false);
    this.engine.video.sprites.stopMovement(DEFAULT_SPRITE_INSTANCE_ID);
    this.engine.video.sprites.playAction(DEFAULT_SPRITE_INSTANCE_ID, DEFAULT_SPRITE_IDLE_ACTION_ID, {
      direction: 'left',
      restart: true,
    });
    this.engine.video.sprites.playAnimation(
      DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID,
      DEFAULT_BAIT_SHOP_DOOR_OPEN_ANIMATION_ID,
      {
        restart: true,
      },
    );
    this.engine.audio.playSound(BAIT_SHOP_DOOR_OPENING_SOUND_ID, {
      restart: true,
    });
    this.engine.video.render(0);
  }

  private updateStanPoliceDefeat(deltaMs: number): void {
    if (!this.engine || !this.stanPoliceDefeat || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    if (this.stanPoliceDefeat.phase === 'speaking') {
      const nextElapsedMs = this.stanPoliceDefeat.elapsedMs + deltaMs;
      if (nextElapsedMs < STAN_POLICE_DEFEAT_MESSAGE_TTL_MS) {
        this.stanPoliceDefeat.elapsedMs = nextElapsedMs;
        return;
      }

      const overflowMs = nextElapsedMs - STAN_POLICE_DEFEAT_MESSAGE_TTL_MS;
      this.beginStanPoliceDefeatFade();
      this.updateStanPoliceDefeat(overflowMs);
      return;
    }

    if (this.stanPoliceDefeat.phase === 'fading') {
      const nextElapsedMs = this.stanPoliceDefeat.elapsedMs + deltaMs;
      const clampedElapsedMs = Math.min(STAN_POLICE_DEFEAT_FADE_DURATION_MS, nextElapsedMs);
      this.stanPoliceDefeat.elapsedMs = clampedElapsedMs;
      this.addStanPoliceDefeatFadePrimitive(clampedElapsedMs / STAN_POLICE_DEFEAT_FADE_DURATION_MS);

      if (nextElapsedMs < STAN_POLICE_DEFEAT_FADE_DURATION_MS) {
        return;
      }

      const overflowMs = nextElapsedMs - STAN_POLICE_DEFEAT_FADE_DURATION_MS;
      this.showStanPoliceDefeatTitle();
      this.updateStanPoliceDefeat(overflowMs);
      return;
    }

    const nextElapsedMs = this.stanPoliceDefeat.elapsedMs + deltaMs;
    if (nextElapsedMs < STAN_POLICE_DEFEAT_TITLE_DURATION_MS) {
      this.stanPoliceDefeat.elapsedMs = nextElapsedMs;
      return;
    }

    this.finishStanPoliceDefeat();
  }

  private updateBaitShopDoorEntry(deltaMs: number): void {
    if (!this.engine || !this.baitShopDoorEntry || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    if (this.baitShopDoorEntry.phase === 'open-door-hold') {
      const nextElapsedMs = this.baitShopDoorEntry.elapsedMs + deltaMs;
      if (nextElapsedMs < BAIT_SHOP_ENTRY_DOOR_OPEN_HOLD_MS) {
        this.baitShopDoorEntry.elapsedMs = nextElapsedMs;
        return;
      }

      this.baitShopDoorEntry = {
        phase: 'transitioning',
        elapsedMs: 0,
      };
      void this.enterBaitShop();
    }
  }

  private updateStanMoneyExchange(deltaMs: number): void {
    if (!this.engine || !this.stanMoneyExchange || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    if (this.stanMoneyExchange.phase === 'stan-speaking') {
      const nextElapsedMs = this.stanMoneyExchange.elapsedMs + deltaMs;
      if (nextElapsedMs < STAN_MONEY_ACCEPTED_TTL_MS) {
        this.stanMoneyExchange.elapsedMs = nextElapsedMs;
        return;
      }

      const overflowMs = nextElapsedMs - STAN_MONEY_ACCEPTED_TTL_MS;
      this.beginStanMoneyReply();
      this.updateStanMoneyExchange(overflowMs);
      return;
    }

    const nextElapsedMs = this.stanMoneyExchange.elapsedMs + deltaMs;
    if (nextElapsedMs < ROCCO_MONEY_REPLY_TTL_MS) {
      this.stanMoneyExchange.elapsedMs = nextElapsedMs;
      return;
    }

    this.finishStanMoneyExchange();
  }

  private beginStanMoneyReply(): void {
    if (!this.engine) {
      return;
    }

    this.stanMoneyExchange = {
      phase: 'rocco-replying',
      elapsedMs: 0,
    };
    this.engine.video.messages.think(
      DEFAULT_SPRITE_INSTANCE_ID,
      this.localization.text.inventory.moneyOnStanReplyLine,
      {
        ttlMs: ROCCO_MONEY_REPLY_TTL_MS,
      },
    );
    this.engine.video.render(0);
  }

  private finishStanMoneyExchange(): void {
    if (!this.engine) {
      return;
    }

    this.stanMoneyExchange = null;
    this.engine.setInputEnabled(true);
    this.engine.video.render(0);
  }

  private beginStanPoliceDefeatFade(): void {
    if (!this.engine) {
      return;
    }

    this.stanPoliceDefeat = {
      phase: 'fading',
      elapsedMs: 0,
    };
    this.engine.audio.playSound(STAN_POLICE_DEFEAT_SOUND_ID, {
      restart: true,
      volume: STAN_POLICE_DEFEAT_SOUND_VOLUME,
    });
    this.addStanPoliceDefeatFadePrimitive(0);
  }

  private showStanPoliceDefeatTitle(): void {
    if (!this.engine) {
      return;
    }

    this.stanPoliceDefeat = {
      phase: 'title',
      elapsedMs: 0,
    };
    this.engine.video.titles.addTitle({
      id: STAN_POLICE_DEFEAT_TITLE_ID,
      text: this.localization.text.keys.defeatTitle,
      renderLayer: 'overlay.titles',
      zIndex: 5000,
      x: DEFAULT_DESIGN_WIDTH / 2,
      y: DEFAULT_DESIGN_HEIGHT / 2,
      anchor: { x: 0.5, y: 0.5 },
      style: {
        fill: '#cbd6c0',
        fontFamily: 'Cascadia Mono, Lucida Console, monospace',
        fontSize: 42,
        fontWeight: '700',
        align: 'center',
        stroke: {
          color: '#1f2a20',
          width: 6,
          alpha: 0.95,
        },
      },
      visible: true,
    });
    this.engine.video.render(0);
  }

  private finishStanPoliceDefeat(): void {
    if (!this.engine) {
      return;
    }

    const onRestartRequested = this.options.onRestartRequested;
    this.stanPoliceDefeat = null;
    this.clearStanPoliceDefeatPresentation();
    this.engine.setInputEnabled(true);
    onRestartRequested?.();
  }

  private addStanPoliceDefeatFadePrimitive(alpha: number): void {
    if (!this.engine) {
      return;
    }

    this.engine.video.primitives.addPrimitive({
      id: STAN_POLICE_DEFEAT_FADE_PRIMITIVE_ID,
      kind: 'rect',
      renderLayer: 'overlay.primitives',
      zIndex: 5000,
      color: DEFAULT_ROCCO_GREEN_BLACK,
      alpha,
      visible: true,
      x: 0,
      y: 0,
      width: DEFAULT_DESIGN_WIDTH,
      height: DEFAULT_DESIGN_HEIGHT,
      fill: true,
    });
    this.engine.video.render(0);
  }

  private clearStanPoliceDefeatPresentation(): void {
    if (!this.engine) {
      return;
    }

    this.engine.audio.stopSound(STAN_POLICE_DEFEAT_SOUND_ID);
    this.engine.video.titles.removeTitle(STAN_POLICE_DEFEAT_TITLE_ID);
    this.engine.video.primitives.removePrimitive(STAN_POLICE_DEFEAT_FADE_PRIMITIVE_ID);
    this.engine.video.render(0);
  }

  private isStanAwake(): boolean {
    if (!this.engine) {
      return false;
    }

    const stan = this.engine.video.sprites.getSprite(DEFAULT_STAN_SPRITE_INSTANCE_ID);
    return Boolean(stan && stan.animation.animationId !== DEFAULT_STAN_SLEEPING_ANIMATION_ID);
  }

  private async enterBaitShop(): Promise<void> {
    if (!this.engine || !this.activeLevel) {
      return;
    }

    this.deactivateDeveloperSpriteCycleMode();
    const currentLevel = this.activeLevel;
    const targetLevel = this.requireLevel(ROCCO_BAIT_SHOP_LEVEL_ID);
    const engine = this.engine;
    this.transitioning = true;
    this.pendingExitIntent = null;
    engine.beginComposition();

    try {
      currentLevel.unmount(engine);
      this.activeLevel = targetLevel;
      const scene = await targetLevel.mount(engine, this.createLevelMountOptions());
      this.updateStatus(scene);
    } catch (error) {
      engine.log('System', `Bait shop level transition failed: ${String(error)}`);
      this.activeLevel = currentLevel;
    } finally {
      this.baitShopDoorEntry = null;
      engine.endComposition();
      engine.setInputEnabled(true);
      this.transitioning = false;
      engine.video.render(0);
    }
  }
}

function isGridMenuCartridgeAction(
  activation: RoccoCartridgeAction,
): activation is RoccoGridMenuCartridgeAction {
  return 'kind' in activation && activation.kind === 'grid-menu';
}

function isSceneClickCartridgeAction(
  activation: RoccoCartridgeAction,
): activation is RoccoSceneClickAction {
  return 'kind' in activation && activation.kind === 'scene-click';
}

function hasInventorySceneClickHandler(
  level: RoccoLevel,
): level is RoccoLevel & RoccoLevelInventorySceneClickHandler {
  return (
    'handleInventorySceneClick' in level &&
    typeof (level as Partial<RoccoLevelInventorySceneClickHandler>).handleInventorySceneClick ===
      'function'
  );
}
