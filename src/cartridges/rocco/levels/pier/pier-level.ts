import type { RoccoEngine } from '../../../../engine/engine-sdk';
import type { RoccoActionMenuActivation } from '../../../../engine/video/action-menu';
import type { RoccoPlaneScene } from '../../../../engine/video/planes';
import { Assets } from 'pixi.js';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import {
  DEFAULT_FEEDING_LOOK_ACTION_ID,
  DEFAULT_FEEDING_LOOK_MESSAGE_TTL_MS,
  installDefaultFeedingLookActionMenu,
  isDefaultFeedingLookTarget,
  pickDefaultFeedingLookLine,
  uninstallDefaultFeedingLookActionMenu,
} from './pier-feeding-interactions';
import type { RoccoNonRepeatingLineSelectionState } from '../../../../game/non-repeating-line-selection';
import {
  installDefaultActionMenu,
  DEFAULT_ACTION_MENU_ID,
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
} from '../rocco-level-types';
import { findRoccoLevelConnector } from '../rocco-level-types';
import {
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_KEYS_X,
  DEFAULT_KEYS_Y,
  DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_Y_VALUES,
  PIER_BACKGROUND_SCROLL_CENTER_X,
  PIER_LEVEL_EXIT_TRIGGER_WIDTH,
  PIER_MIDDLE_SCENE_ID,
  PIER_PLAYER_LEFT_ENTRY_X,
  PIER_PLAYER_RIGHT_ENTRY_X,
  ROCCO_PIER_MIDDLE_LEVEL_ID,
} from '../../rocco-default-constants';
import {
  installDefaultSprite,
  uninstallDefaultSprite,
  type RoccoDefaultSpriteController,
} from '../../rocco-default-sprites';
import { roccoDefaultActionMenuAssetUrls } from '../../rocco-default-assets';

const DEFAULT_ENTRY_Y = DEFAULT_SPRITE_Y_VALUES[0] ?? 180;
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
    keysX: DEFAULT_KEYS_X,
    keysY: DEFAULT_KEYS_Y,
  };
}

export const ROCCO_PIER_MIDDLE_CONNECTORS: readonly RoccoLevelConnector[] = [
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

export class RoccoPierMiddleLevel implements RoccoLevel {
  readonly id = ROCCO_PIER_MIDDLE_LEVEL_ID;
  readonly title: string;
  readonly connectors = ROCCO_PIER_MIDDLE_CONNECTORS;
  private readonly localization: RoccoLocalization;

  private spriteController: RoccoDefaultSpriteController | null = null;
  private cloudController: RoccoDefaultCloudController | null = null;
  private keysController: RoccoDefaultKeysController | null = null;
  private pelikanController: RoccoDefaultPelikanController | null = null;
  private baitBucketController: RoccoDefaultBaitBucketController | null = null;
  private engine: RoccoEngine | null = null;
  private feedingInteractionsInstalled = false;
  private feedingLookSelectionState: RoccoNonRepeatingLineSelectionState | null = null;
  private pendingPelikanTakeoffMs: number | null = null;
  private options: RoccoLevelMountOptions = {};
  private readonly levelState = createInitialMiddleLevelState();

  constructor(localization: RoccoLocalization = createRoccoLocalization()) {
    this.localization = localization;
    this.title = localization.text.levels.middle;
  }

  async mount(
    engine: RoccoEngine,
    options: RoccoLevelMountOptions = {},
  ): Promise<RoccoPlaneScene> {
    this.engine = engine;
    this.options = options;
    this.spriteController = null;
    this.cloudController = null;
    this.keysController = null;
    this.pelikanController = null;
    this.baitBucketController = null;
    this.feedingInteractionsInstalled = false;
    this.feedingLookSelectionState = null;
    this.pendingPelikanTakeoffMs = null;
    uninstallDefaultFeedingLookActionMenu(engine);

    const scene = await loadOrCreatePierScene(engine, {
      sceneId: PIER_MIDDLE_SCENE_ID,
      backgroundScrollX: PIER_BACKGROUND_SCROLL_CENTER_X,
    });
    await engine.video.preloadPlaneScene(scene);
    engine.loadPlaneScene(scene);
    await installDefaultWalkMap(engine, {
      backgroundScrollX: PIER_BACKGROUND_SCROLL_CENTER_X,
    });

    await Promise.all([
      Assets.load(roccoDefaultActionMenuAssetUrls.grab),
      Assets.load(roccoDefaultActionMenuAssetUrls.kick),
      Assets.load(roccoDefaultActionMenuAssetUrls.look),
      Assets.load(roccoDefaultActionMenuAssetUrls.talk),
    ]).catch(() => {
      engine.log('Assets', 'Some action menu icons could not be preloaded.');
    });

    const entryConnector = findRoccoLevelConnector(this.connectors, options.entryConnectorId);
    const spriteInstallOptions = entryConnector
      ? {
          initialFacing: entryConnector.entryFacing,
          initialPosition: entryConnector.entryPoint,
          playIntro: false,
        }
      : undefined;

    const initialKeysState = this.resolveInitialKeysState();
    const [
      cloudController,
      baitBucketController,
      keysController,
      pelikanController,
      spriteController,
    ] = await Promise.all([
      installDefaultCloud(engine),
      installDefaultBaitBucket(engine, {
        localization: this.localization,
        initialState: {
          dropped: this.levelState.baitBucketDropped,
        },
        onDropped: () => {
          this.levelState.baitBucketDropped = true;
        },
      }),
      installDefaultKeys(engine, {
        localization: this.localization,
        initialState: initialKeysState,
        onCollected: () => {
          this.levelState.keysStatus = 'collected';
          this.options.onKeysCollected?.();
        },
      }),
      installDefaultPelikan(engine, {
        localization: this.localization,
        initialState: this.levelState.pelikanState,
        onTakeoff: () => {
          this.levelState.keysStatus = 'revealed';
          this.levelState.keysX = DEFAULT_KEYS_X;
          this.levelState.keysY = DEFAULT_KEYS_Y;
          this.keysController?.revealAt(DEFAULT_KEYS_X, DEFAULT_KEYS_Y);
        },
      }),
      installDefaultSprite(engine, {
        ...spriteInstallOptions,
        localization: this.localization,
      }),
    ]);

    this.cloudController = cloudController;
    this.baitBucketController = baitBucketController;
    this.keysController = keysController;
    this.pelikanController = pelikanController;
    this.spriteController = spriteController;

    if (this.levelState.pelikanState === 'feeding') {
      this.installFeedingInteractionsIfReady();
    } else {
      installDefaultActionMenu(engine, this.localization);
    }

    return scene;
  }

  unmount(engine: RoccoEngine): void {
    this.keysController?.cancel();
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    uninstallDefaultFeedingLookActionMenu(engine);
    uninstallDefaultBaitBucket(engine);
    uninstallDefaultKeys(engine);
    uninstallDefaultPelikan(engine);
    uninstallDefaultCloud(engine);
    uninstallDefaultSprite(engine);
    uninstallDefaultWalkMap(engine);
    this.spriteController = null;
    this.cloudController = null;
    this.keysController = null;
    this.pelikanController = null;
    this.baitBucketController = null;
    this.feedingInteractionsInstalled = false;
    this.pendingPelikanTakeoffMs = null;
    this.engine = null;
    engine.video.render(0);
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

    if (
      activation.targetInstanceId !== DEFAULT_PELIKAN_SPRITE_INSTANCE_ID ||
      activation.actionId !== 'talk' ||
      !this.engine
    ) {
      return;
    }

    if (this.baitBucketController?.isDropped()) {
      if (this.pendingPelikanTakeoffMs !== null) {
        return;
      }

      this.engine.video.messages.say(
        DEFAULT_SPRITE_INSTANCE_ID,
        this.localization.text.middleLevel.pelikanFeedingLine,
        {
          ttlMs: DEFAULT_PELIKAN_FEEDING_LINE_TTL_MS,
        },
      );
      this.pendingPelikanTakeoffMs = DEFAULT_PELIKAN_FEEDING_LINE_TTL_MS;
      this.engine.video.render(0);
      return;
    }

    showDefaultPelikanTalkReaction(this.engine, this.localization);
  }

  handleSceneClick(): void {
    if (!this.engine?.isInputEnabled()) {
      return;
    }

    this.spriteController?.cancelIntro();
  }

  private installFeedingInteractionsIfReady(): void {
    if (!this.engine || this.feedingInteractionsInstalled || !this.pelikanController?.isFeeding()) {
      return;
    }

    this.levelState.pelikanState = 'feeding';
    if (this.levelState.keysStatus === 'hidden') {
      this.levelState.keysStatus = 'revealed';
      this.levelState.keysX = DEFAULT_KEYS_X;
      this.levelState.keysY = DEFAULT_KEYS_Y;
      this.keysController?.revealAt(DEFAULT_KEYS_X, DEFAULT_KEYS_Y);
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
      this.levelState.keysX = DEFAULT_KEYS_X;
      this.levelState.keysY = DEFAULT_KEYS_Y;
    }
  }

  private resolveInitialKeysState(): RoccoDefaultKeysState {
    if (this.levelState.pelikanState === 'feeding' && this.levelState.keysStatus === 'hidden') {
      this.levelState.keysStatus = 'revealed';
      this.levelState.keysX = DEFAULT_KEYS_X;
      this.levelState.keysY = DEFAULT_KEYS_Y;
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
    this.engine.video.messages.think(DEFAULT_SPRITE_INSTANCE_ID, selection.line, {
      ttlMs: DEFAULT_FEEDING_LOOK_MESSAGE_TTL_MS,
    });
    this.engine.video.render(0);

    if (selection.line === this.localization.text.feeding.turnAwayLine) {
      this.engine.video.sprites.playAction(
        DEFAULT_SPRITE_INSTANCE_ID,
        DEFAULT_SPRITE_IDLE_ACTION_ID,
        {
          direction: 'right',
          restart: true,
        },
      );
      this.engine.video.render(0);
    }

    return true;
  }

  private resolvePelikanDeltaMs(deltaMs: number): number {
    if (this.pendingPelikanTakeoffMs === null) {
      return deltaMs;
    }

    const safeDeltaMs = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
    this.pendingPelikanTakeoffMs -= safeDeltaMs;
    if (this.pendingPelikanTakeoffMs > 0) {
      return 0;
    }

    const leftoverDeltaMs = Math.max(0, -this.pendingPelikanTakeoffMs);
    this.pendingPelikanTakeoffMs = null;
    this.pelikanController?.startBaitFeedingSequence();
    return leftoverDeltaMs;
  }
}
