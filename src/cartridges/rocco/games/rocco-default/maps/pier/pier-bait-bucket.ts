import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { InputPolicyLease } from '../../../../../../console/input';
import type {
  RoccoActionMenuActivation,
  RoccoActionMenuDefinition,
} from '../../../../../../console/video/action-menu';
import type { RoccoSpriteDefinition } from '../../../../../../console/video/sprites';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import { ROCCO_ACTION_MENU_ASSETS } from '../../ui';
import { pierBaitBucketAssetUrls, pierBaitBucketKickSoundUrl } from './pier-bait-bucket-assets';
import { roccoCartridgeMessageRuntime } from '../../../../rpce/dialogue';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import { ROCCO_PLAYER_CONFIG } from '../../player';
import { PIER_BAIT_BUCKET_CONFIG } from './pier-bait-bucket-config';

const NORMAL_FRAME_ID = 'bait-bucket-normal-frame';
const DROPPED_FRAME_ID = 'bait-bucket-dropped-frame';
const NORMAL_MENU_ID = 'rocco-bait-bucket-normal-action-menu';
const DROPPED_MENU_ID = 'rocco-bait-bucket-dropped-action-menu';
const KICK_ACTION_ID = 'kick';
const KICK_APPROACH_DISTANCE = 58;
const KICK_LIFT_HEIGHT = 38;
const KICK_DURATION_MS = 520;
const KICK_SOUND_ID = 'rocco-bait-bucket-kick-sound';
const KICK_SOUND_VOLUME = 0.125;
const ACTION_MESSAGE_TTL_MS = 5200;
const ACTION_MENU_ITEM_SIZE = 92;
const ACTION_MENU_ORBIT_RADIUS = 88;
const ACTION_MENU_ORBIT_SPEED = 0.08;

type BaitBucketControllerState = 'normal' | 'approaching-kick' | 'kicking' | 'dropped';

function makeActionMenuBase(id: string): Omit<RoccoActionMenuDefinition, 'items'> {
  return {
    id,
    targetInstanceIds: [PIER_BAIT_BUCKET_CONFIG.spriteInstanceId],
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
        imageUri: ROCCO_ACTION_MENU_ASSETS.look,
      },
      {
        id: 'grab',
        actionId: 'grab',
        label: localization.text.actions.grab,
        imageUri: ROCCO_ACTION_MENU_ASSETS.grab,
      },
      {
        id: 'kick',
        actionId: KICK_ACTION_ID,
        label: localization.text.actions.kick,
        imageUri: ROCCO_ACTION_MENU_ASSETS.kick,
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
        imageUri: ROCCO_ACTION_MENU_ASSETS.look,
      },
      {
        id: 'grab',
        actionId: 'grab',
        label: localization.text.actions.grab,
        imageUri: ROCCO_ACTION_MENU_ASSETS.grab,
      },
    ],
  };
}

export function createDefaultBaitBucketSpriteDefinition(
  localization: RoccoLocalization = createRoccoLocalization(),
): RoccoSpriteDefinition {
  return {
    id: PIER_BAIT_BUCKET_CONFIG.spriteDefinitionId,
    name: 'Rocco Demo Bait Bucket',
    images: createBaitBucketImages(),
    frames: createBaitBucketFrames(),
    animations: createBaitBucketAnimations(),
    defaultAnimation: PIER_BAIT_BUCKET_CONFIG.normalAnimationId,
    render: {
      renderLayer: PIER_BAIT_BUCKET_CONFIG.renderLayer,
      zIndex: PIER_BAIT_BUCKET_CONFIG.zIndex,
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

function createBaitBucketImages(): RoccoSpriteDefinition['images'] {
  return [
    {
      id: 'bait-bucket-normal',
      uri: pierBaitBucketAssetUrls.normal,
      width: PIER_BAIT_BUCKET_CONFIG.spriteWidth,
      height: PIER_BAIT_BUCKET_CONFIG.spriteHeight,
    },
    {
      id: 'bait-bucket-dropped',
      uri: pierBaitBucketAssetUrls.dropped,
      width: PIER_BAIT_BUCKET_CONFIG.spriteWidth,
      height: PIER_BAIT_BUCKET_CONFIG.spriteHeight,
    },
  ];
}

function createBaitBucketFrames(): RoccoSpriteDefinition['frames'] {
  return [
    {
      id: NORMAL_FRAME_ID,
      imageId: 'bait-bucket-normal',
      durationMs: 1000,
      pivot: {
        x: PIER_BAIT_BUCKET_CONFIG.normalPivotX,
        y: PIER_BAIT_BUCKET_CONFIG.normalPivotY,
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
        x: PIER_BAIT_BUCKET_CONFIG.droppedPivotX,
        y: PIER_BAIT_BUCKET_CONFIG.droppedPivotY,
      },
      hitbox: {
        kind: 'rect',
        x: 105,
        y: 264,
        width: 994,
        height: 705,
      },
    },
  ];
}

function createBaitBucketAnimations(): RoccoSpriteDefinition['animations'] {
  return {
    [PIER_BAIT_BUCKET_CONFIG.normalAnimationId]: {
      id: PIER_BAIT_BUCKET_CONFIG.normalAnimationId,
      loop: false,
      playbackRate: 1,
      frames: [{ frameId: NORMAL_FRAME_ID, durationMs: 1000 }],
    },
    [PIER_BAIT_BUCKET_CONFIG.droppedAnimationId]: {
      id: PIER_BAIT_BUCKET_CONFIG.droppedAnimationId,
      loop: false,
      playbackRate: 1,
      frames: [{ frameId: DROPPED_FRAME_ID, durationMs: 1000 }],
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
  private readonly engine: CartridgeSdkV1Runtime;
  private readonly options: RoccoDefaultBaitBucketControllerOptions;
  private readonly localization: RoccoLocalization;
  private state: BaitBucketControllerState = 'normal';
  private kickElapsedMs = 0;
  private droppedPoseApplied = false;
  private kickInputLease: InputPolicyLease | undefined;

  constructor(
    engine: CartridgeSdkV1Runtime,
    options: RoccoDefaultBaitBucketControllerOptions = {},
  ) {
    this.engine = engine;
    this.options = options;
    this.localization = options.localization ?? createRoccoLocalization();
  }

  private startKickApproach(): void {
    this.kickInputLease ??= this.engine.acquireInputLease('pier-bait-bucket-kick', 'blocked');
    this.engine.video.sprites.moveTo(
      ROCCO_PLAYER_CONFIG.ids.instance,
      PIER_BAIT_BUCKET_CONFIG.x +
        KICK_APPROACH_DISTANCE -
        ROCCO_PLAYER_CONFIG.frame.groundAnchor.x * ROCCO_PLAYER_CONFIG.motion.scale,
      PIER_BAIT_BUCKET_CONFIG.y -
        ROCCO_PLAYER_CONFIG.frame.groundAnchor.y * ROCCO_PLAYER_CONFIG.motion.scale,
      {
        action: ROCCO_PLAYER_CONFIG.ids.runAction,
        onCompleteAction: ROCCO_PLAYER_CONFIG.ids.idleAction,
        stopDistance: 1,
      },
    );
    this.state = 'approaching-kick';
  }

  private handleSimpleAction(actionId: string): boolean {
    if (this.state === 'normal' && actionId === 'look') {
      this.showRoccoThought(
        this.localization.text.baitBucket.normalLookLines,
        'bait-bucket-normal-look',
      );
      return true;
    }

    if (this.state === 'normal' && actionId === 'grab') {
      this.showRoccoThought(
        this.localization.text.baitBucket.normalGrabLines,
        'bait-bucket-normal-grab',
      );
      return true;
    }

    if (this.state === 'dropped' && actionId === 'look') {
      this.showRoccoThought(
        this.localization.text.baitBucket.droppedLookLines,
        'bait-bucket-dropped-look',
      );
      return true;
    }

    if (this.state === 'dropped' && actionId === 'grab') {
      this.showRoccoThought(
        this.localization.text.baitBucket.droppedGrabLines,
        'bait-bucket-dropped-grab',
      );
      return true;
    }

    return false;
  }

  private showRoccoThought(lines: readonly string[], historyKey: string): void {
    roccoCartridgeMessageRuntime.think(
      this.engine,
      ROCCO_PLAYER_CONFIG.ids.instance,
      [...lines],
      {
        ttlMs: ACTION_MESSAGE_TTL_MS,
      },
      {
        count: 1,
        historyKey,
        isAvoidImmediateRepeat: true,
      },
    );
  }

  private updateApproach(): void {
    if (this.engine.video.sprites.isMoving(ROCCO_PLAYER_CONFIG.ids.instance)) {
      return;
    }

    this.engine.video.sprites.playAction(
      ROCCO_PLAYER_CONFIG.ids.instance,
      ROCCO_PLAYER_CONFIG.ids.runAction,
      {
        direction: 'left',
        restart: true,
        playbackRate: 0,
      },
    );
    this.state = 'kicking';
    this.kickElapsedMs = 0;
    this.droppedPoseApplied = false;
    this.engine.audio.playSound(KICK_SOUND_ID, {
      restart: true,
      volume: KICK_SOUND_VOLUME,
    });
  }

  private updateKick(deltaMs: number): void {
    this.kickElapsedMs = Math.min(KICK_DURATION_MS, this.kickElapsedMs + deltaMs);
    const progress = this.kickElapsedMs / KICK_DURATION_MS;
    const lift = Math.sin(progress * Math.PI) * KICK_LIFT_HEIGHT;
    this.engine.video.sprites.setPosition(
      PIER_BAIT_BUCKET_CONFIG.spriteInstanceId,
      PIER_BAIT_BUCKET_CONFIG.x,
      PIER_BAIT_BUCKET_CONFIG.y - lift,
    );

    if (progress >= 0.5 && !this.droppedPoseApplied) {
      this.engine.video.sprites.playAnimation(
        PIER_BAIT_BUCKET_CONFIG.spriteInstanceId,
        PIER_BAIT_BUCKET_CONFIG.droppedAnimationId,
        {
          restart: false,
        },
      );
      this.droppedPoseApplied = true;
    }

    if (this.kickElapsedMs >= KICK_DURATION_MS) {
      this.finishKick();
    }
  }

  private finishKick(): void {
    this.applyDroppedPose();
    this.engine.video.sprites.playAction(
      ROCCO_PLAYER_CONFIG.ids.instance,
      ROCCO_PLAYER_CONFIG.ids.idleAction,
      {
        direction: 'left',
        restart: true,
      },
    );
    this.kickInputLease?.dispose();
    this.kickInputLease = undefined;
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
      PIER_BAIT_BUCKET_CONFIG.spriteInstanceId,
      PIER_BAIT_BUCKET_CONFIG.x,
      PIER_BAIT_BUCKET_CONFIG.y,
    );
    this.engine.video.sprites.playAnimation(
      PIER_BAIT_BUCKET_CONFIG.spriteInstanceId,
      PIER_BAIT_BUCKET_CONFIG.droppedAnimationId,
      {
        restart: false,
      },
    );
  }

  private installNormalMenu(): void {
    this.disableActionMenus();
    this.engine.video.actionMenus.registerMenu(createNormalBaitBucketActionMenu(this.localization));
  }

  private installDroppedMenu(): void {
    this.disableActionMenus();
    this.engine.video.actionMenus.registerMenu(
      createDroppedBaitBucketActionMenu(this.localization),
    );
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
    if (activation.targetInstanceId !== PIER_BAIT_BUCKET_CONFIG.spriteInstanceId) {
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
  }
}

export async function installDefaultBaitBucket(
  engine: CartridgeSdkV1Runtime,
  options: RoccoDefaultBaitBucketControllerOptions = {},
  preloader?: RoccoAssetPreloader,
): Promise<RoccoDefaultBaitBucketController> {
  const localization = options.localization ?? createRoccoLocalization();
  const definition = createDefaultBaitBucketSpriteDefinition(localization);
  await (preloader?.preloadSpriteDefinition(engine, definition) ??
    engine.video.preloadSpriteDefinition(definition));
  engine.video.sprites.loadSpriteDefinition(definition);
  engine.video.sprites.removeSprite(PIER_BAIT_BUCKET_CONFIG.spriteInstanceId);

  engine.audio.registerSound({
    id: KICK_SOUND_ID,
    uri: pierBaitBucketKickSoundUrl,
    volume: KICK_SOUND_VOLUME,
    loop: false,
  });
  try {
    await engine.audio.preloadSound(KICK_SOUND_ID);
  } catch {
    engine.log('Audio', 'Bait bucket kick sound could not be preloaded.');
  }
  engine.audio.stopSound(KICK_SOUND_ID);

  engine.video.sprites.createSpriteFromDefinition(PIER_BAIT_BUCKET_CONFIG.spriteDefinitionId, {
    id: PIER_BAIT_BUCKET_CONFIG.spriteInstanceId,
    transform: {
      x: PIER_BAIT_BUCKET_CONFIG.x,
      y: PIER_BAIT_BUCKET_CONFIG.y,
      scaleX: PIER_BAIT_BUCKET_CONFIG.scale,
      scaleY: PIER_BAIT_BUCKET_CONFIG.scale,
      rotation: 0,
    },
    renderLayer: PIER_BAIT_BUCKET_CONFIG.renderLayer,
    zIndex: PIER_BAIT_BUCKET_CONFIG.zIndex,
    depthMode: 'baseline-sort',
    opacity: 1,
    interactive: true,
    collisionEnabled: true,
  });

  const controller = new RoccoBaitBucketController(engine, {
    ...options,
    localization,
  });
  controller.start();
  return controller;
}

export function uninstallDefaultBaitBucket(engine: CartridgeSdkV1Runtime): void {
  engine.video.actionMenus.unregisterMenu(NORMAL_MENU_ID);
  engine.video.actionMenus.unregisterMenu(DROPPED_MENU_ID);
  engine.video.sprites.removeSprite(PIER_BAIT_BUCKET_CONFIG.spriteInstanceId);
  engine.audio.stopSound(KICK_SOUND_ID);
  engine.audio.unregisterSound(KICK_SOUND_ID);
}
