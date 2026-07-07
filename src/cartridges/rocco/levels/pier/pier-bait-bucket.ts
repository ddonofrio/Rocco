import type { RoccoEngine } from '../../../../engine/engine-sdk';
import type {
  RoccoActionMenuActivation,
  RoccoActionMenuDefinition,
} from '../../../../engine/video/action-menu';
import type { RoccoSpriteDefinition } from '../../../../engine/video/sprites';
import {
  roccoDefaultActionMenuAssetUrls,
  roccoDefaultBaitBucketAssetUrls,
} from '../../rocco-default-assets';
import { roccoCartridgeMessageRuntime } from '../../dialogue';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import {
  DEFAULT_BAIT_BUCKET_DROPPED_ANIMATION_ID,
  DEFAULT_BAIT_BUCKET_DROPPED_PIVOT_X,
  DEFAULT_BAIT_BUCKET_DROPPED_PIVOT_Y,
  DEFAULT_BAIT_BUCKET_NORMAL_ANIMATION_ID,
  DEFAULT_BAIT_BUCKET_NORMAL_PIVOT_X,
  DEFAULT_BAIT_BUCKET_NORMAL_PIVOT_Y,
  DEFAULT_BAIT_BUCKET_RENDER_LAYER,
  DEFAULT_BAIT_BUCKET_SCALE,
  DEFAULT_BAIT_BUCKET_SPRITE_DEFINITION_ID,
  DEFAULT_BAIT_BUCKET_SPRITE_HEIGHT,
  DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID,
  DEFAULT_BAIT_BUCKET_SPRITE_WIDTH,
  DEFAULT_BAIT_BUCKET_X,
  DEFAULT_BAIT_BUCKET_Y,
  DEFAULT_BAIT_BUCKET_Z_INDEX,
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_RUN_ACTION_ID,
  DEFAULT_SPRITE_SCALE,
} from '../../rocco-default-constants';

const NORMAL_FRAME_ID = 'bait-bucket-normal-frame';
const DROPPED_FRAME_ID = 'bait-bucket-dropped-frame';
const NORMAL_MENU_ID = 'rocco-bait-bucket-normal-action-menu';
const DROPPED_MENU_ID = 'rocco-bait-bucket-dropped-action-menu';
const KICK_ACTION_ID = 'kick';
const KICK_APPROACH_DISTANCE = 58;
const KICK_LIFT_HEIGHT = 38;
const KICK_DURATION_MS = 520;
const ACTION_MESSAGE_TTL_MS = 5200;
const ACTION_MENU_ITEM_SIZE = 92;
const ACTION_MENU_ORBIT_RADIUS = 88;
const ACTION_MENU_ORBIT_SPEED = 0.08;

type BaitBucketControllerState = 'normal' | 'approaching-kick' | 'kicking' | 'dropped';

function makeActionMenuBase(id: string): Omit<RoccoActionMenuDefinition, 'items'> {
  return {
    id,
    targetInstanceIds: [DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID],
    renderLayer: 'ui.action-menu',
    itemSize: ACTION_MENU_ITEM_SIZE,
    orbitRadius: ACTION_MENU_ORBIT_RADIUS,
    orbitSpeedRadiansPerSecond: ACTION_MENU_ORBIT_SPEED,
    hoverScale: 1.16,
    circleFill: '#0f1610',
    circleStroke: '#d7e6c5',
    circleStrokeWidth: 2,
  };
}

function createNormalBaitBucketActionMenu(
  localization: RoccoLocalization,
): RoccoActionMenuDefinition {
  return {
    ...makeActionMenuBase(NORMAL_MENU_ID),
    items: [
      {
        id: 'look',
        actionId: 'look',
        label: localization.text.actions.look,
        imageUri: roccoDefaultActionMenuAssetUrls.look,
      },
      {
        id: 'grab',
        actionId: 'grab',
        label: localization.text.actions.grab,
        imageUri: roccoDefaultActionMenuAssetUrls.grab,
      },
      {
        id: 'kick',
        actionId: KICK_ACTION_ID,
        label: localization.text.actions.kick,
        imageUri: roccoDefaultActionMenuAssetUrls.kick,
      },
    ],
  };
}

function createDroppedBaitBucketActionMenu(
  localization: RoccoLocalization,
): RoccoActionMenuDefinition {
  return {
    ...makeActionMenuBase(DROPPED_MENU_ID),
    items: [
      {
        id: 'look',
        actionId: 'look',
        label: localization.text.actions.look,
        imageUri: roccoDefaultActionMenuAssetUrls.look,
      },
      {
        id: 'grab',
        actionId: 'grab',
        label: localization.text.actions.grab,
        imageUri: roccoDefaultActionMenuAssetUrls.grab,
      },
    ],
  };
}

export function createDefaultBaitBucketSpriteDefinition(
  localization: RoccoLocalization = createRoccoLocalization(),
): RoccoSpriteDefinition {
  return {
    id: DEFAULT_BAIT_BUCKET_SPRITE_DEFINITION_ID,
    name: 'Rocco Demo Bait Bucket',
    images: [
      {
        id: 'bait-bucket-normal',
        uri: roccoDefaultBaitBucketAssetUrls.normal,
        width: DEFAULT_BAIT_BUCKET_SPRITE_WIDTH,
        height: DEFAULT_BAIT_BUCKET_SPRITE_HEIGHT,
      },
      {
        id: 'bait-bucket-dropped',
        uri: roccoDefaultBaitBucketAssetUrls.dropped,
        width: DEFAULT_BAIT_BUCKET_SPRITE_WIDTH,
        height: DEFAULT_BAIT_BUCKET_SPRITE_HEIGHT,
      },
    ],
    frames: [
      {
        id: NORMAL_FRAME_ID,
        imageId: 'bait-bucket-normal',
        durationMs: 1000,
        pivot: {
          x: DEFAULT_BAIT_BUCKET_NORMAL_PIVOT_X,
          y: DEFAULT_BAIT_BUCKET_NORMAL_PIVOT_Y,
        },
        hitbox: {
          kind: 'rect',
          x: 166,
          y: 237,
          width: 911,
          height: 763,
        },
      },
      {
        id: DROPPED_FRAME_ID,
        imageId: 'bait-bucket-dropped',
        durationMs: 1000,
        pivot: {
          x: DEFAULT_BAIT_BUCKET_DROPPED_PIVOT_X,
          y: DEFAULT_BAIT_BUCKET_DROPPED_PIVOT_Y,
        },
        hitbox: {
          kind: 'rect',
          x: 105,
          y: 264,
          width: 994,
          height: 705,
        },
      },
    ],
    animations: {
      [DEFAULT_BAIT_BUCKET_NORMAL_ANIMATION_ID]: {
        id: DEFAULT_BAIT_BUCKET_NORMAL_ANIMATION_ID,
        loop: false,
        playbackRate: 1,
        frames: [{ frameId: NORMAL_FRAME_ID, durationMs: 1000 }],
      },
      [DEFAULT_BAIT_BUCKET_DROPPED_ANIMATION_ID]: {
        id: DEFAULT_BAIT_BUCKET_DROPPED_ANIMATION_ID,
        loop: false,
        playbackRate: 1,
        frames: [{ frameId: DROPPED_FRAME_ID, durationMs: 1000 }],
      },
    },
    defaultAnimation: DEFAULT_BAIT_BUCKET_NORMAL_ANIMATION_ID,
    render: {
      renderLayer: DEFAULT_BAIT_BUCKET_RENDER_LAYER,
      zIndex: DEFAULT_BAIT_BUCKET_Z_INDEX,
      depthMode: 'baseline-sort',
      opacity: 1,
    },
    visibleDescription: {
      enabled: true,
      text: localization.text.descriptions.baitBucket,
    },
    metadata: {
      purpose: 'default-rocco-bait-bucket-demo',
    },
  };
}

export interface RoccoDefaultBaitBucketController {
  update(deltaMs: number): void;
  handleAction(activation: RoccoActionMenuActivation): void;
  isDropped(): boolean;
  disableActionMenus(): void;
}

export interface RoccoDefaultBaitBucketState {
  dropped: boolean;
}

export interface RoccoDefaultBaitBucketControllerOptions {
  localization?: RoccoLocalization;
  initialState?: RoccoDefaultBaitBucketState;
  onDropped?: () => void;
}

class RoccoBaitBucketController implements RoccoDefaultBaitBucketController {
  private readonly engine: RoccoEngine;
  private readonly options: RoccoDefaultBaitBucketControllerOptions;
  private readonly localization: RoccoLocalization;
  private state: BaitBucketControllerState = 'normal';
  private kickElapsedMs = 0;
  private droppedPoseApplied = false;

  constructor(engine: RoccoEngine, options: RoccoDefaultBaitBucketControllerOptions = {}) {
    this.engine = engine;
    this.options = options;
    this.localization = options.localization ?? createRoccoLocalization();
  }

  start(): void {
    this.kickElapsedMs = 0;
    this.droppedPoseApplied = false;
    if (this.options.initialState?.dropped) {
      this.restoreDropped();
      return;
    }

    this.state = 'normal';
    this.installNormalMenu();
  }

  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    if (this.state === 'approaching-kick') {
      this.updateApproach();
      return;
    }

    if (this.state === 'kicking') {
      this.updateKick(deltaMs);
    }
  }

  handleAction(activation: RoccoActionMenuActivation): void {
    if (activation.targetInstanceId !== DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID) {
      return;
    }

    if (this.handleSimpleAction(activation.actionId)) {
      return;
    }

    if (activation.actionId !== KICK_ACTION_ID || this.state !== 'normal') {
      return;
    }

    this.startKickApproach();
  }

  isDropped(): boolean {
    return this.state === 'dropped';
  }

  disableActionMenus(): void {
    this.engine.video.actionMenus.unregisterMenu(NORMAL_MENU_ID);
    this.engine.video.actionMenus.unregisterMenu(DROPPED_MENU_ID);
    this.engine.video.render(0);
  }

  private startKickApproach(): void {
    this.engine.setInputEnabled(false);
    this.engine.video.sprites.moveTo(
      DEFAULT_SPRITE_INSTANCE_ID,
      DEFAULT_BAIT_BUCKET_X +
        KICK_APPROACH_DISTANCE -
        DEFAULT_SPRITE_GROUND_ANCHOR_X * DEFAULT_SPRITE_SCALE,
      DEFAULT_BAIT_BUCKET_Y - DEFAULT_SPRITE_GROUND_ANCHOR_Y * DEFAULT_SPRITE_SCALE,
      {
        action: DEFAULT_SPRITE_RUN_ACTION_ID,
        onCompleteAction: DEFAULT_SPRITE_IDLE_ACTION_ID,
        stopDistance: 1,
      },
    );
    this.engine.video.render(0);
    this.state = 'approaching-kick';
  }

  private handleSimpleAction(actionId: string): boolean {
    if (this.state === 'normal' && actionId === 'look') {
      this.showRoccoThought(this.localization.text.baitBucket.normalLookLines, 'bait-bucket-normal-look');
      return true;
    }

    if (this.state === 'normal' && actionId === 'grab') {
      this.showRoccoThought(this.localization.text.baitBucket.normalGrabLines, 'bait-bucket-normal-grab');
      return true;
    }

    if (this.state === 'dropped' && actionId === 'look') {
      this.showRoccoThought(this.localization.text.baitBucket.droppedLookLines, 'bait-bucket-dropped-look');
      return true;
    }

    if (this.state === 'dropped' && actionId === 'grab') {
      this.showRoccoThought(this.localization.text.baitBucket.droppedGrabLines, 'bait-bucket-dropped-grab');
      return true;
    }

    return false;
  }

  private showRoccoThought(lines: readonly string[], historyKey: string): void {
    roccoCartridgeMessageRuntime.think(
      this.engine,
      DEFAULT_SPRITE_INSTANCE_ID,
      [...lines],
      {
        ttlMs: ACTION_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey,
        avoidImmediateRepeat: true,
      },
    );
    this.engine.video.render(0);
  }

  private updateApproach(): void {
    if (this.engine.video.sprites.isMoving(DEFAULT_SPRITE_INSTANCE_ID)) {
      return;
    }

    this.engine.video.sprites.playAction(DEFAULT_SPRITE_INSTANCE_ID, DEFAULT_SPRITE_RUN_ACTION_ID, {
      direction: 'left',
      restart: true,
      playbackRate: 0,
    });
    this.engine.video.render(0);
    this.state = 'kicking';
    this.kickElapsedMs = 0;
    this.droppedPoseApplied = false;
  }

  private updateKick(deltaMs: number): void {
    this.kickElapsedMs = Math.min(KICK_DURATION_MS, this.kickElapsedMs + deltaMs);
    const progress = this.kickElapsedMs / KICK_DURATION_MS;
    const lift = Math.sin(progress * Math.PI) * KICK_LIFT_HEIGHT;
    this.engine.video.sprites.setPosition(
      DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID,
      DEFAULT_BAIT_BUCKET_X,
      DEFAULT_BAIT_BUCKET_Y - lift,
    );
    this.engine.video.render(0);

    if (progress >= 0.5 && !this.droppedPoseApplied) {
      this.engine.video.sprites.playAnimation(
        DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID,
        DEFAULT_BAIT_BUCKET_DROPPED_ANIMATION_ID,
        {
          restart: false,
        },
      );
      this.engine.video.render(0);
      this.droppedPoseApplied = true;
    }

    if (this.kickElapsedMs >= KICK_DURATION_MS) {
      this.finishKick();
    }
  }

  private finishKick(): void {
    this.applyDroppedPose();
    this.engine.video.sprites.playAction(
      DEFAULT_SPRITE_INSTANCE_ID,
      DEFAULT_SPRITE_IDLE_ACTION_ID,
      {
        direction: 'left',
        restart: true,
      },
    );
    this.engine.video.render(0);
    this.engine.setInputEnabled(true);
    this.state = 'dropped';
    this.options.onDropped?.();
    this.installDroppedMenu();
  }

  private restoreDropped(): void {
    this.state = 'dropped';
    this.kickElapsedMs = KICK_DURATION_MS;
    this.droppedPoseApplied = true;
    this.applyDroppedPose();
    this.installDroppedMenu();
  }

  private applyDroppedPose(): void {
    this.engine.video.sprites.setPosition(
      DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID,
      DEFAULT_BAIT_BUCKET_X,
      DEFAULT_BAIT_BUCKET_Y,
    );
    this.engine.video.sprites.playAnimation(
      DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID,
      DEFAULT_BAIT_BUCKET_DROPPED_ANIMATION_ID,
      {
        restart: false,
      },
    );
    this.engine.video.render(0);
  }

  private installNormalMenu(): void {
    this.disableActionMenus();
    this.engine.video.actionMenus.registerMenu(
      createNormalBaitBucketActionMenu(this.localization),
    );
    this.engine.video.render(0);
  }

  private installDroppedMenu(): void {
    this.disableActionMenus();
    this.engine.video.actionMenus.registerMenu(
      createDroppedBaitBucketActionMenu(this.localization),
    );
    this.engine.video.render(0);
  }
}

export async function installDefaultBaitBucket(
  engine: RoccoEngine,
  options: RoccoDefaultBaitBucketControllerOptions = {},
): Promise<RoccoDefaultBaitBucketController> {
  const localization = options.localization ?? createRoccoLocalization();
  const definition = createDefaultBaitBucketSpriteDefinition(localization);
  await engine.video.preloadSpriteDefinition(definition);
  engine.video.sprites.loadSpriteDefinition(definition);
  engine.video.sprites.removeSprite(DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID);

  engine.video.sprites.createSpriteFromDefinition(DEFAULT_BAIT_BUCKET_SPRITE_DEFINITION_ID, {
    id: DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID,
    transform: {
      x: DEFAULT_BAIT_BUCKET_X,
      y: DEFAULT_BAIT_BUCKET_Y,
      scaleX: DEFAULT_BAIT_BUCKET_SCALE,
      scaleY: DEFAULT_BAIT_BUCKET_SCALE,
      rotation: 0,
    },
    renderLayer: DEFAULT_BAIT_BUCKET_RENDER_LAYER,
    zIndex: DEFAULT_BAIT_BUCKET_Z_INDEX,
    depthMode: 'baseline-sort',
    opacity: 1,
    interactive: true,
    collisionEnabled: true,
  });
  engine.video.render(0);

  const controller = new RoccoBaitBucketController(engine, {
    ...options,
    localization,
  });
  controller.start();
  return controller;
}

export function uninstallDefaultBaitBucket(engine: RoccoEngine): void {
  engine.video.actionMenus.unregisterMenu(NORMAL_MENU_ID);
  engine.video.actionMenus.unregisterMenu(DROPPED_MENU_ID);
  engine.video.sprites.removeSprite(DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID);
  engine.video.render(0);
}
