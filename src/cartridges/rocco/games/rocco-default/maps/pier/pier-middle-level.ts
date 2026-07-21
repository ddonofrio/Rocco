import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoActionMenuActivation } from '../../../../../../console/video/action-menu';
import type { RoccoPlaneScene } from '../../../../../../console/video/planes';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import {
  DEFAULT_FEEDING_LOOK_ACTION_ID,
  DEFAULT_FEEDING_LOOK_MESSAGE_TTL_MS,
  installDefaultFeedingLookActionMenu,
  isDefaultFeedingLookTarget,
  pickDefaultFeedingLookLine,
  uninstallDefaultFeedingLookActionMenu,
} from './pier-feeding-interactions';
import type { RoccoNonRepeatingLineSelectionState } from '../../../../rpce/dialogue';
import {
  installDefaultActionMenu,
  DEFAULT_ACTION_MENU_ID,
  showDefaultPelikanSimpleReaction,
  showDefaultPelikanTalkReaction,
} from './pier-pelikan-action-menu';
import {
  installDefaultBaitBucket,
  uninstallDefaultBaitBucket,
  type RoccoDefaultBaitBucketController,
} from './pier-bait-bucket';
import {
  installDefaultCloud,
  uninstallDefaultCloud,
  type RoccoDefaultCloudController,
} from './pier-clouds';
import {
  installDefaultKeys,
  uninstallDefaultKeys,
  type RoccoDefaultKeysController,
  type RoccoDefaultKeysState,
  type RoccoDefaultKeysStateStatus,
} from './pier-keys';
import {
  installDefaultPelikan,
  uninstallDefaultPelikan,
  type RoccoDefaultPelikanController,
  type RoccoDefaultPelikanState,
} from './pier-pelikan';
import { loadOrCreatePierScene } from './pier-scene';
import { installDefaultWalkMap, uninstallDefaultWalkMap } from './pier-walkmap';
import type {
  RoccoLevel,
  RoccoLevelConnector,
  RoccoLevelMountOptions,
} from '../../../../levels/rocco-level-types';
import { findRoccoLevelConnector } from '../../../../levels/rocco-level-types';
import { ROCCO_PLAYER_CONFIG } from '../../player';
import { ROCCO_DESIGN_HEIGHT, ROCCO_DESIGN_WIDTH } from '../../game-design';
import {
  PIER_BACKGROUND_SCROLL_CENTER_X,
  PIER_LEVEL_EXIT_TRIGGER_WIDTH,
  PIER_PLAYER_LEFT_ENTRY_X,
  PIER_PLAYER_RIGHT_ENTRY_X,
} from './pier-layout';
import { PIER_MIDDLE_SCENE_ID, ROCCO_PIER_MIDDLE_LEVEL_ID } from './pier-level-ids';
import { PIER_PELIKAN_CONFIG } from './pier-pelikan-config';
import { PIER_KEYS_CONFIG } from './pier-keys-config';
import {
  installRoccoPlayerSprite,
  uninstallRoccoPlayerSprite,
  type RoccoPlayerSpriteController,
} from '../../player';
import { ROCCO_ACTION_MENU_ASSETS } from '../../ui';

const DEFAULT_ENTRY_Y = ROCCO_PLAYER_CONFIG.placement.yValues[0] ?? 180;
export const DEFAULT_PELIKAN_FEEDING_LINE_TTL_MS = 2200;

interface RoccoPierMiddleLevelState {
  baitBucketDropped: boolean;
  pelikanState: RoccoDefaultPelikanState;
  keysStatus: RoccoDefaultKeysStateStatus;
  keysX: number;
  keysY: number;
}

function createInitialMiddleLevelState(): RoccoPierMiddleLevelState {
  return {
    baitBucketDropped: false,
    pelikanState: 'idle',
    keysStatus: 'hidden',
    keysX: PIER_KEYS_CONFIG.x,
    keysY: PIER_KEYS_CONFIG.y,
  };
}

export const ROCCO_PIER_MIDDLE_CONNECTORS: readonly RoccoLevelConnector[] = [
  {
    id: 'west',
    exitArea: {
      x: 0,
      y: 0,
      width: PIER_LEVEL_EXIT_TRIGGER_WIDTH,
      height: ROCCO_DESIGN_HEIGHT,
    },
    entryPoint: {
      x: PIER_PLAYER_LEFT_ENTRY_X,
      y: DEFAULT_ENTRY_Y,
    },
    entryFacing: 'right',
  },
  {
    id: 'east',
    exitArea: {
      x: ROCCO_DESIGN_WIDTH - PIER_LEVEL_EXIT_TRIGGER_WIDTH,
      y: 0,
      width: PIER_LEVEL_EXIT_TRIGGER_WIDTH,
      height: ROCCO_DESIGN_HEIGHT,
    },
    entryPoint: {
      x: PIER_PLAYER_RIGHT_ENTRY_X,
      y: DEFAULT_ENTRY_Y,
    },
    entryFacing: 'left',
  },
];

export class RoccoPierMiddleLevel implements RoccoLevel {
  private readonly localization: RoccoLocalization;
  private spriteController: RoccoPlayerSpriteController | undefined;
  private cloudController: RoccoDefaultCloudController | undefined;
  private keysController: RoccoDefaultKeysController | undefined;
  private pelikanController: RoccoDefaultPelikanController | undefined;
  private baitBucketController: RoccoDefaultBaitBucketController | undefined;
  private engine: CartridgeSdkV1Runtime | undefined;
  private feedingInteractionsInstalled = false;
  private feedingLookSelectionState: RoccoNonRepeatingLineSelectionState | undefined;
  private pendingPelikanTakeoffMs: number | undefined;
  private options: RoccoLevelMountOptions = {};
  private readonly levelState = createInitialMiddleLevelState();
  readonly id = ROCCO_PIER_MIDDLE_LEVEL_ID;
  readonly title: string;
  readonly connectors = ROCCO_PIER_MIDDLE_CONNECTORS;

  constructor(localization: RoccoLocalization = createRoccoLocalization()) {
    this.localization = localization;
    this.title = localization.text.levels.middle;
  }

  private installFeedingInteractionsIfReady(): void {
    if (!this.engine || this.feedingInteractionsInstalled || !this.pelikanController?.isFeeding()) {
      return;
    }

    this.levelState.pelikanState = 'feeding';
    if (this.levelState.keysStatus === 'hidden') {
      this.levelState.keysStatus = 'revealed';
      this.levelState.keysX = PIER_KEYS_CONFIG.x;
      this.levelState.keysY = PIER_KEYS_CONFIG.y;
      this.keysController?.revealAt(PIER_KEYS_CONFIG.x, PIER_KEYS_CONFIG.y);
    }

    this.engine.video.actionMenus.unregisterMenu(DEFAULT_ACTION_MENU_ID);
    this.baitBucketController?.disableActionMenus();
    installDefaultFeedingLookActionMenu(this.engine, this.localization);
    this.feedingInteractionsInstalled = true;
  }

  private syncStateFromControllers(): void {
    if (this.baitBucketController?.isDropped()) {
      this.levelState.baitBucketDropped = true;
    }

    if (this.pelikanController?.isFeeding()) {
      this.levelState.pelikanState = 'feeding';
    }

    if (this.keysController?.isRevealed()) {
      this.levelState.keysStatus = 'revealed';
      this.levelState.keysX = PIER_KEYS_CONFIG.x;
      this.levelState.keysY = PIER_KEYS_CONFIG.y;
    }
  }

  private resolveInitialKeysState(): RoccoDefaultKeysState {
    if (this.levelState.pelikanState === 'feeding' && this.levelState.keysStatus === 'hidden') {
      this.levelState.keysStatus = 'revealed';
      this.levelState.keysX = PIER_KEYS_CONFIG.x;
      this.levelState.keysY = PIER_KEYS_CONFIG.y;
    }

    return {
      status: this.levelState.keysStatus,
      x: this.levelState.keysX,
      y: this.levelState.keysY,
    };
  }

  private handleFeedingLookAction(activation: RoccoActionMenuActivation): boolean {
    if (
      !this.engine ||
      !this.pelikanController?.isFeeding() ||
      activation.actionId !== DEFAULT_FEEDING_LOOK_ACTION_ID ||
      !isDefaultFeedingLookTarget(activation.targetInstanceId)
    ) {
      return false;
    }

    const selection = pickDefaultFeedingLookLine(
      Math.random,
      this.feedingLookSelectionState,
      this.localization.text.feeding.lookLines,
    );
    this.feedingLookSelectionState = selection.state;
    this.engine.video.messages.think(ROCCO_PLAYER_CONFIG.ids.instance, selection.line, {
      ttlMs: DEFAULT_FEEDING_LOOK_MESSAGE_TTL_MS,
    });

    if (selection.line === this.localization.text.feeding.turnAwayLine) {
      this.engine.video.sprites.playAction(
        ROCCO_PLAYER_CONFIG.ids.instance,
        ROCCO_PLAYER_CONFIG.ids.idleAction,
        {
          direction: 'right',
          restart: true,
        },
      );
    }

    return true;
  }

  private resolvePelikanDeltaMs(deltaMs: number): number {
    if (this.pendingPelikanTakeoffMs === undefined) {
      return deltaMs;
    }

    const safeDeltaMs = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
    this.pendingPelikanTakeoffMs -= safeDeltaMs;
    if (this.pendingPelikanTakeoffMs > 0) {
      return 0;
    }

    const leftoverDeltaMs = Math.max(0, -this.pendingPelikanTakeoffMs);
    this.pendingPelikanTakeoffMs = undefined;
    this.pelikanController?.startBaitFeedingSequence();
    return leftoverDeltaMs;
  }

  private resetMountState(engine: CartridgeSdkV1Runtime, options: RoccoLevelMountOptions): void {
    this.engine = engine;
    this.options = options;
    this.spriteController = undefined;
    this.cloudController = undefined;
    this.keysController = undefined;
    this.pelikanController = undefined;
    this.baitBucketController = undefined;
    this.feedingInteractionsInstalled = false;
    this.feedingLookSelectionState = undefined;
    this.pendingPelikanTakeoffMs = undefined;
    uninstallDefaultFeedingLookActionMenu(engine);
  }

  private async loadMiddleScene(
    engine: CartridgeSdkV1Runtime,
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoPlaneScene> {
    const scene = await loadOrCreatePierScene(engine, {
      sceneId: PIER_MIDDLE_SCENE_ID,
      backgroundScrollX: PIER_BACKGROUND_SCROLL_CENTER_X,
    });
    await (preloader?.preloadPlaneScene(engine, scene) ?? engine.video.preloadPlaneScene(scene));
    engine.loadPlaneScene(scene);
    await installDefaultWalkMap(
      engine,
      { backgroundScrollX: PIER_BACKGROUND_SCROLL_CENTER_X },
      preloader,
    );
    return scene;
  }

  private async preloadMiddleActionMenuAssets(
    engine: CartridgeSdkV1Runtime,
    preloader?: RoccoAssetPreloader,
  ): Promise<void> {
    try {
      await preloader?.preloadAssetUrls(engine, [
        ROCCO_ACTION_MENU_ASSETS.grab,
        ROCCO_ACTION_MENU_ASSETS.kick,
        ROCCO_ACTION_MENU_ASSETS.look,
        ROCCO_ACTION_MENU_ASSETS.talk,
      ]);
    } catch {
      engine.log('Assets', 'Some action menu icons could not be preloaded.');
    }
  }

  private installMiddleBaitBucket(
    engine: CartridgeSdkV1Runtime,
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoDefaultBaitBucketController> {
    return installDefaultBaitBucket(
      engine,
      {
        localization: this.localization,
        initialState: { dropped: this.levelState.baitBucketDropped },
        onDropped: () => {
          this.levelState.baitBucketDropped = true;
        },
      },
      preloader,
    );
  }

  private installMiddleKeys(
    engine: CartridgeSdkV1Runtime,
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoDefaultKeysController> {
    return installDefaultKeys(
      engine,
      {
        localization: this.localization,
        initialState: this.resolveInitialKeysState(),
        onCollectRequested: () => this.options.onKeysCollectRequested?.() ?? true,
        onCollected: () => {
          this.levelState.keysStatus = 'collected';
          this.options.onKeysCollected?.();
        },
      },
      preloader,
    );
  }

  private installMiddlePelikan(
    engine: CartridgeSdkV1Runtime,
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoDefaultPelikanController> {
    return installDefaultPelikan(
      engine,
      {
        localization: this.localization,
        initialState: this.levelState.pelikanState,
        onTakeoff: () => {
          this.levelState.keysStatus = 'revealed';
          this.levelState.keysX = PIER_KEYS_CONFIG.x;
          this.levelState.keysY = PIER_KEYS_CONFIG.y;
          this.keysController?.revealAt(PIER_KEYS_CONFIG.x, PIER_KEYS_CONFIG.y);
        },
      },
      preloader,
    );
  }

  private installMiddleSprite(
    engine: CartridgeSdkV1Runtime,
    options: RoccoLevelMountOptions,
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoPlayerSpriteController> {
    const entryConnector = findRoccoLevelConnector(this.connectors, options.entryConnectorId);
    return installRoccoPlayerSprite(
      engine,
      {
        ...(entryConnector && {
          initialFacing: entryConnector.entryFacing,
          initialPosition: entryConnector.entryPoint,
          playIntro: false,
        }),
        appearance: options.roccoAppearance,
        localization: this.localization,
      },
      preloader,
    );
  }

  private async installMiddleControllers(
    engine: CartridgeSdkV1Runtime,
    options: RoccoLevelMountOptions,
    preloader?: RoccoAssetPreloader,
  ) {
    return Promise.all([
      installDefaultCloud(engine, preloader),
      this.installMiddleBaitBucket(engine, preloader),
      this.installMiddleKeys(engine, preloader),
      this.installMiddlePelikan(engine, preloader),
      this.installMiddleSprite(engine, options, preloader),
    ]);
  }

  async mount(
    engine: CartridgeSdkV1Runtime,
    options: RoccoLevelMountOptions = {},
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoPlaneScene> {
    this.resetMountState(engine, options);
    const scene = await this.loadMiddleScene(engine, preloader);
    await this.preloadMiddleActionMenuAssets(engine, preloader);
    const controllers = await this.installMiddleControllers(engine, options, preloader);
    this.cloudController = controllers[0];
    this.baitBucketController = controllers[1];
    this.keysController = controllers[2];
    this.pelikanController = controllers[3];
    this.spriteController = controllers[4];

    if (this.levelState.pelikanState === 'feeding') {
      this.installFeedingInteractionsIfReady();
    } else {
      installDefaultActionMenu(engine, this.localization);
    }

    return scene;
  }

  unmount(engine: CartridgeSdkV1Runtime): void {
    this.keysController?.cancel();
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    uninstallDefaultFeedingLookActionMenu(engine);
    uninstallDefaultBaitBucket(engine);
    uninstallDefaultKeys(engine);
    uninstallDefaultPelikan(engine);
    uninstallDefaultCloud(engine);
    uninstallRoccoPlayerSprite(engine);
    uninstallDefaultWalkMap(engine);
    this.spriteController = undefined;
    this.cloudController = undefined;
    this.keysController = undefined;
    this.pelikanController = undefined;
    this.baitBucketController = undefined;
    this.feedingInteractionsInstalled = false;
    this.pendingPelikanTakeoffMs = undefined;
    this.engine = undefined;
  }

  update(deltaMs: number): void {
    this.cloudController?.update(deltaMs);
    this.baitBucketController?.update(deltaMs);
    this.keysController?.update(deltaMs);
    this.pelikanController?.update(this.resolvePelikanDeltaMs(deltaMs));
    this.syncStateFromControllers();
    this.installFeedingInteractionsIfReady();
    this.spriteController?.update(deltaMs);
  }

  handleAction(activation: RoccoActionMenuActivation): void {
    this.baitBucketController?.handleAction(activation);
    this.keysController?.handleAction(activation);
    if (this.handleFeedingLookAction(activation)) {
      return;
    }

    if (activation.targetInstanceId !== PIER_PELIKAN_CONFIG.spriteInstanceId || !this.engine) {
      return;
    }

    if (showDefaultPelikanSimpleReaction(this.engine, activation.actionId, this.localization)) {
      return;
    }

    if (activation.actionId !== 'talk') {
      return;
    }

    if (this.baitBucketController?.isDropped()) {
      if (this.pendingPelikanTakeoffMs !== undefined) {
        return;
      }

      this.engine.video.messages.say(
        ROCCO_PLAYER_CONFIG.ids.instance,
        this.localization.text.middleLevel.pelikanFeedingLine,
        {
          ttlMs: DEFAULT_PELIKAN_FEEDING_LINE_TTL_MS,
        },
      );
      this.pendingPelikanTakeoffMs = DEFAULT_PELIKAN_FEEDING_LINE_TTL_MS;
      return;
    }

    showDefaultPelikanTalkReaction(this.engine, this.localization);
  }

  handleSceneClick() {
    const controller = this.spriteController;
    if (!this.engine || !controller?.isIntroActive()) {
      return;
    }

    if (controller.isIntroSpeaking()) {
      controller.advanceIntro();
    } else {
      controller.cancelIntro();
    }

    return { suppressDefaultPlayerMove: true };
  }
}
