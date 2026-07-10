import type { RoccoEngine } from '../../../../../../console/engine-sdk';
import {
  createRoccoSpriteAutoCroppedFrames,
  type RoccoSpriteDefinition,
} from '../../../../../../console/video/sprites';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import {
  roccoDefaultPelikanAssetUrls,
  roccoDefaultPelikanFeedingAssetUrl,
  roccoDefaultPelikanFlyingSoundUrl,
  roccoDefaultPelikanFlightAssetUrl,
} from '../../sprites';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import { DEFAULT_ACTION_MENU_ID } from './pier-pelikan-action-menu';
import {
  DEFAULT_PELIKAN_FEEDING_ANIMATION_ID,
  DEFAULT_PELIKAN_FEEDING_FRAME_DURATION_MS,
  DEFAULT_PELIKAN_FEEDING_RENDER_LAYER,
  DEFAULT_PELIKAN_FEEDING_WAIT_ANIMATION_ID,
  DEFAULT_PELIKAN_FEEDING_Z_INDEX,
  DEFAULT_PELIKAN_FEEDING_X,
  DEFAULT_PELIKAN_FEEDING_Y,
  DEFAULT_PELIKAN_FLIGHT_ANIMATION_ID,
  DEFAULT_PELIKAN_FLIGHT_ARC_HEIGHT,
  DEFAULT_PELIKAN_FLIGHT_DURATION_MS,
  DEFAULT_PELIKAN_FLIGHT_FRAME_DURATION_MS,
  DEFAULT_PELIKAN_FLIGHT_SOUND_ID,
  DEFAULT_PELIKAN_FLIGHT_SOUND_VOLUME,
  DEFAULT_PELIKAN_FOOT_PIVOT_X,
  DEFAULT_PELIKAN_FOOT_PIVOT_Y,
  DEFAULT_PELIKAN_FRAME_DURATION_MS,
  DEFAULT_PELIKAN_MAX_FEEDING_WAIT_MS,
  DEFAULT_PELIKAN_MAX_POSE_DELAY_MS,
  DEFAULT_PELIKAN_MIN_FEEDING_WAIT_MS,
  DEFAULT_PELIKAN_MIN_POSE_DELAY_MS,
  DEFAULT_PELIKAN_PERCH_X,
  DEFAULT_PELIKAN_PERCH_Y,
  DEFAULT_PELIKAN_RENDER_LAYER,
  DEFAULT_PELIKAN_SHEET_HEIGHT,
  DEFAULT_PELIKAN_SHEET_WIDTH,
  DEFAULT_PELIKAN_SPRITE_ANIMATION_ID,
  DEFAULT_PELIKAN_SPRITE_DEFINITION_ID,
  DEFAULT_PELIKAN_SPRITE_HEIGHT,
  DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
  DEFAULT_PELIKAN_SPRITE_OPACITY,
  DEFAULT_PELIKAN_SPRITE_SCALE,
  DEFAULT_PELIKAN_SPRITE_WIDTH,
  DEFAULT_PELIKAN_TURN_DURATION_MS,
  DEFAULT_PELIKAN_Z_INDEX,
} from '../../constants';

const PELIKAN_FLIGHT_IMAGE_ID = 'rocco-pelikan-flight-sheet';
const PELIKAN_FEEDING_IMAGE_ID = 'rocco-pelikan-feeding-sheet';
const PELIKAN_SHEET_ALPHA_THRESHOLD = 8;
const PELIKAN_SHEET_FRAME_PADDING = 8;
const PELIKAN_SHEET_MIN_OPAQUE_PIXELS = 5000;

function makePelikanFrameId(index: number): string {
  return `pelikan-idle-${index + 1}`;
}

function makePelikanPoseAnimationId(index: number): string {
  return `pelikan-pose-${index + 1}`;
}

function smoothStep(value: number): number {
  return value * value * (3 - 2 * value);
}

async function createDefaultPelikanSpriteDefinition(
  localization: RoccoLocalization = createRoccoLocalization(),
): Promise<RoccoSpriteDefinition> {
  const idleImages = roccoDefaultPelikanAssetUrls.map((uri, index) => ({
    id: `rocco-pelikan-${index + 1}`,
    uri,
    width: DEFAULT_PELIKAN_SPRITE_WIDTH,
    height: DEFAULT_PELIKAN_SPRITE_HEIGHT,
  }));
  const idleFrames = roccoDefaultPelikanAssetUrls.map((_, index) => ({
    id: makePelikanFrameId(index),
    imageId: `rocco-pelikan-${index + 1}`,
    durationMs: DEFAULT_PELIKAN_FRAME_DURATION_MS,
    pivot: {
      x: DEFAULT_PELIKAN_FOOT_PIVOT_X,
      y: DEFAULT_PELIKAN_FOOT_PIVOT_Y,
    },
    hitbox: {
      kind: 'rect' as const,
      x: 52,
      y: 36,
      width: 214,
      height: 320,
    },
  }));
  const flightCrop = await createRoccoSpriteAutoCroppedFrames({
    mode: 'sheet-components',
    sources: [
      {
        id: PELIKAN_FLIGHT_IMAGE_ID,
        uri: roccoDefaultPelikanFlightAssetUrl,
        width: DEFAULT_PELIKAN_SHEET_WIDTH,
        height: DEFAULT_PELIKAN_SHEET_HEIGHT,
      },
    ],
    frameIdPrefix: 'pelikan-flight',
    durationMs: DEFAULT_PELIKAN_FLIGHT_FRAME_DURATION_MS,
    alphaThreshold: PELIKAN_SHEET_ALPHA_THRESHOLD,
    padding: PELIKAN_SHEET_FRAME_PADDING,
    minOpaquePixels: PELIKAN_SHEET_MIN_OPAQUE_PIXELS,
    pivot: { mode: 'relative', x: 0.52, y: 0.55 },
  });
  const feedingCrop = await createRoccoSpriteAutoCroppedFrames({
    mode: 'sheet-components',
    sources: [
      {
        id: PELIKAN_FEEDING_IMAGE_ID,
        uri: roccoDefaultPelikanFeedingAssetUrl,
        width: DEFAULT_PELIKAN_SHEET_WIDTH,
        height: DEFAULT_PELIKAN_SHEET_HEIGHT,
      },
    ],
    frameIdPrefix: 'pelikan-feeding',
    durationMs: DEFAULT_PELIKAN_FEEDING_FRAME_DURATION_MS,
    alphaThreshold: PELIKAN_SHEET_ALPHA_THRESHOLD,
    padding: PELIKAN_SHEET_FRAME_PADDING,
    minOpaquePixels: PELIKAN_SHEET_MIN_OPAQUE_PIXELS,
    pivot: { mode: 'relative', x: 0.55, y: 0.94 },
  });
  const feedingWaitFrameId =
    feedingCrop.frameIds.at(-1) ?? feedingCrop.frameIds[0] ?? makePelikanFrameId(0);

  return {
    id: DEFAULT_PELIKAN_SPRITE_DEFINITION_ID,
    name: 'Rocco Demo Pelikan',
    images: [...idleImages, ...flightCrop.images, ...feedingCrop.images],
    frames: [...idleFrames, ...flightCrop.frames, ...feedingCrop.frames],
    animations: {
      [DEFAULT_PELIKAN_SPRITE_ANIMATION_ID]: {
        id: DEFAULT_PELIKAN_SPRITE_ANIMATION_ID,
        loop: false,
        playbackRate: 1,
        frames: [{ frameId: makePelikanFrameId(0), durationMs: DEFAULT_PELIKAN_FRAME_DURATION_MS }],
      },
      [DEFAULT_PELIKAN_FLIGHT_ANIMATION_ID]: {
        id: DEFAULT_PELIKAN_FLIGHT_ANIMATION_ID,
        loop: true,
        playbackRate: 1,
        frames: flightCrop.frameIds.map((frameId) => ({
          frameId,
          durationMs: DEFAULT_PELIKAN_FLIGHT_FRAME_DURATION_MS,
        })),
      },
      [DEFAULT_PELIKAN_FEEDING_ANIMATION_ID]: {
        id: DEFAULT_PELIKAN_FEEDING_ANIMATION_ID,
        loop: true,
        playbackRate: 1,
        frames: feedingCrop.frameIds.map((frameId) => ({
          frameId,
          durationMs: DEFAULT_PELIKAN_FEEDING_FRAME_DURATION_MS,
        })),
      },
      [DEFAULT_PELIKAN_FEEDING_WAIT_ANIMATION_ID]: {
        id: DEFAULT_PELIKAN_FEEDING_WAIT_ANIMATION_ID,
        loop: false,
        playbackRate: 1,
        frames: [
          { frameId: feedingWaitFrameId, durationMs: DEFAULT_PELIKAN_FEEDING_FRAME_DURATION_MS },
        ],
      },
      ...Object.fromEntries(
        roccoDefaultPelikanAssetUrls.map((_, index) => [
          makePelikanPoseAnimationId(index),
          {
            id: makePelikanPoseAnimationId(index),
            loop: false,
            playbackRate: 1,
            frames: [
              { frameId: makePelikanFrameId(index), durationMs: DEFAULT_PELIKAN_FRAME_DURATION_MS },
            ],
          },
        ]),
      ),
    },
    defaultAnimation: DEFAULT_PELIKAN_SPRITE_ANIMATION_ID,
    pivot: {
      x: DEFAULT_PELIKAN_FOOT_PIVOT_X,
      y: DEFAULT_PELIKAN_FOOT_PIVOT_Y,
    },
    render: {
      renderLayer: DEFAULT_PELIKAN_RENDER_LAYER,
      zIndex: DEFAULT_PELIKAN_Z_INDEX,
      depthMode: 'fixed',
      opacity: DEFAULT_PELIKAN_SPRITE_OPACITY,
    },
    bounds: {
      x: 0,
      y: 0,
      width: DEFAULT_PELIKAN_SPRITE_WIDTH,
      height: DEFAULT_PELIKAN_SPRITE_HEIGHT,
    },
    hitbox: {
      kind: 'rect',
      x: 52,
      y: 36,
      width: 214,
      height: 320,
    },
    visibleDescription: {
      enabled: true,
      text: localization.text.descriptions.pelikan,
    },
    metadata: {
      purpose: 'default-rocco-pelikan-demo',
    },
  };
}

export interface RoccoDefaultPelikanController {
  update(deltaMs: number): void;
  startBaitFeedingSequence(): boolean;
  isFeeding(): boolean;
}

export type RoccoDefaultPelikanState = 'idle' | 'feeding';

export interface RoccoDefaultPelikanOptions {
  localization?: RoccoLocalization;
  initialState?: RoccoDefaultPelikanState;
  onTakeoff?: () => void;
}

type PelikanControllerState = 'idle' | 'turning-to-bait' | 'flying-to-bait' | 'feeding';
type PelikanFeedingPhase = 'eating' | 'waiting';

class RoccoIdlePelikanController implements RoccoDefaultPelikanController {
  private readonly engine: RoccoEngine;
  private readonly options: RoccoDefaultPelikanOptions;
  private readonly random: () => number;
  private readonly feedingCycleDurationMs: number;
  private state: PelikanControllerState = 'idle';
  private feedingPhase: PelikanFeedingPhase = 'eating';
  private elapsedMs = 0;
  private nextPoseDelayMs = 0;
  private nextFeedingWaitMs = DEFAULT_PELIKAN_MIN_FEEDING_WAIT_MS;
  private poseIndex = 0;
  private flightStartX = DEFAULT_PELIKAN_PERCH_X;
  private flightStartY = DEFAULT_PELIKAN_PERCH_Y;

  constructor(
    engine: RoccoEngine,
    feedingCycleDurationMs: number,
    options: RoccoDefaultPelikanOptions = {},
    random: () => number = Math.random,
  ) {
    this.engine = engine;
    this.options = options;
    this.feedingCycleDurationMs = Math.max(
      DEFAULT_PELIKAN_FEEDING_FRAME_DURATION_MS,
      feedingCycleDurationMs,
    );
    this.random = random;
  }

  start(): void {
    if (this.options.initialState === 'feeding') {
      this.restoreFeeding();
      return;
    }

    this.state = 'idle';
    this.poseIndex = 0;
    this.elapsedMs = 0;
    this.scheduleNextPose();
    this.playCurrentPose();
  }

  update(deltaMs: number): void {
    const safeDeltaMs = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
    if (this.state === 'idle') {
      this.updateIdle(safeDeltaMs);
      return;
    }

    if (this.state === 'turning-to-bait') {
      this.updateTurningToBait(safeDeltaMs);
      return;
    }

    if (this.state === 'flying-to-bait') {
      this.updateFlyingToBait(safeDeltaMs);
      return;
    }

    if (this.state === 'feeding') {
      this.updateFeeding(safeDeltaMs);
    }
  }

  startBaitFeedingSequence(): boolean {
    if (this.state !== 'idle') {
      return false;
    }

    this.state = 'turning-to-bait';
    this.elapsedMs = 0;
    this.engine.video.actionMenus.unregisterMenu(DEFAULT_ACTION_MENU_ID);
    this.engine.video.sprites.setFlip(DEFAULT_PELIKAN_SPRITE_INSTANCE_ID, true, false);
    this.engine.video.render(0);
    this.playCurrentPose();
    return true;
  }

  isFeeding(): boolean {
    return this.state === 'feeding';
  }

  private updateIdle(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    if (this.elapsedMs < this.nextPoseDelayMs) {
      return;
    }

    this.elapsedMs = 0;
    this.poseIndex = this.resolveNextPoseIndex();
    this.scheduleNextPose();
    this.playCurrentPose();
  }

  private updateTurningToBait(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    if (this.elapsedMs < DEFAULT_PELIKAN_TURN_DURATION_MS) {
      return;
    }

    const sprite = this.engine.video.sprites.getSprite(DEFAULT_PELIKAN_SPRITE_INSTANCE_ID);
    this.flightStartX = sprite?.transform.x ?? DEFAULT_PELIKAN_PERCH_X;
    this.flightStartY = sprite?.transform.y ?? DEFAULT_PELIKAN_PERCH_Y;
    this.elapsedMs = 0;
    this.state = 'flying-to-bait';
    this.engine.video.sprites.setFlip(DEFAULT_PELIKAN_SPRITE_INSTANCE_ID, false, false);
    this.engine.video.sprites.setRenderLayer(
      DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
      DEFAULT_PELIKAN_FEEDING_RENDER_LAYER,
    );
    this.engine.video.sprites.setDepthMode(DEFAULT_PELIKAN_SPRITE_INSTANCE_ID, 'baseline-sort');
    this.engine.video.sprites.setZIndex(
      DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
      DEFAULT_PELIKAN_Z_INDEX,
    );
    this.engine.video.render(0);
    this.options.onTakeoff?.();
    this.engine.audio.playSound(DEFAULT_PELIKAN_FLIGHT_SOUND_ID, {
      restart: true,
      volume: DEFAULT_PELIKAN_FLIGHT_SOUND_VOLUME,
    });
    this.engine.video.sprites.playAnimation(
      DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
      DEFAULT_PELIKAN_FLIGHT_ANIMATION_ID,
      {
        restart: true,
      },
    );
    this.engine.video.render(0);
  }

  private updateFlyingToBait(deltaMs: number): void {
    this.elapsedMs = Math.min(DEFAULT_PELIKAN_FLIGHT_DURATION_MS, this.elapsedMs + deltaMs);
    const progress = this.elapsedMs / DEFAULT_PELIKAN_FLIGHT_DURATION_MS;
    const easedProgress = smoothStep(progress);
    const x = this.flightStartX + (DEFAULT_PELIKAN_FEEDING_X - this.flightStartX) * easedProgress;
    const y =
      this.flightStartY +
      (DEFAULT_PELIKAN_FEEDING_Y - this.flightStartY) * easedProgress -
      Math.sin(progress * Math.PI) * DEFAULT_PELIKAN_FLIGHT_ARC_HEIGHT;

    this.engine.video.sprites.setPosition(DEFAULT_PELIKAN_SPRITE_INSTANCE_ID, x, y);
    this.engine.video.render(0);
    if (this.elapsedMs < DEFAULT_PELIKAN_FLIGHT_DURATION_MS) {
      return;
    }

    this.finishFlightToBait();
  }

  private finishFlightToBait(): void {
    this.state = 'feeding';
    this.elapsedMs = 0;
    this.engine.audio.stopSound(DEFAULT_PELIKAN_FLIGHT_SOUND_ID);
    this.engine.video.sprites.setPosition(
      DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
      DEFAULT_PELIKAN_FEEDING_X,
      DEFAULT_PELIKAN_FEEDING_Y,
    );
    this.engine.video.sprites.setDepthMode(DEFAULT_PELIKAN_SPRITE_INSTANCE_ID, 'manual');
    this.engine.video.sprites.setZIndex(
      DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
      DEFAULT_PELIKAN_FEEDING_Z_INDEX,
    );
    this.engine.video.render(0);
    this.startFeedingCycle();
  }

  private restoreFeeding(): void {
    this.state = 'feeding';
    this.elapsedMs = 0;
    this.feedingPhase = 'eating';
    this.engine.audio.stopSound(DEFAULT_PELIKAN_FLIGHT_SOUND_ID);
    this.engine.video.sprites.setFlip(DEFAULT_PELIKAN_SPRITE_INSTANCE_ID, false, false);
    this.engine.video.sprites.setPosition(
      DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
      DEFAULT_PELIKAN_FEEDING_X,
      DEFAULT_PELIKAN_FEEDING_Y,
    );
    this.engine.video.sprites.setRenderLayer(
      DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
      DEFAULT_PELIKAN_FEEDING_RENDER_LAYER,
    );
    this.engine.video.sprites.setDepthMode(DEFAULT_PELIKAN_SPRITE_INSTANCE_ID, 'manual');
    this.engine.video.sprites.setZIndex(
      DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
      DEFAULT_PELIKAN_FEEDING_Z_INDEX,
    );
    this.engine.video.render(0);
    this.startFeedingCycle();
  }

  private updateFeeding(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    if (this.feedingPhase === 'eating') {
      if (this.elapsedMs >= this.feedingCycleDurationMs) {
        this.startFeedingWait();
      }
      return;
    }

    if (this.elapsedMs >= this.nextFeedingWaitMs) {
      this.startFeedingCycle();
    }
  }

  private startFeedingCycle(): void {
    this.feedingPhase = 'eating';
    this.elapsedMs = 0;
    this.engine.video.sprites.playAnimation(
      DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
      DEFAULT_PELIKAN_FEEDING_ANIMATION_ID,
      {
        restart: true,
        playbackRate: 1,
      },
    );
    this.engine.video.render(0);
  }

  private startFeedingWait(): void {
    this.feedingPhase = 'waiting';
    this.elapsedMs = 0;
    this.nextFeedingWaitMs = this.resolveNextFeedingWaitMs();
    this.engine.video.sprites.playAnimation(
      DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
      DEFAULT_PELIKAN_FEEDING_WAIT_ANIMATION_ID,
      {
        restart: true,
      },
    );
    this.engine.video.render(0);
  }

  private resolveNextFeedingWaitMs(): number {
    const range = DEFAULT_PELIKAN_MAX_FEEDING_WAIT_MS - DEFAULT_PELIKAN_MIN_FEEDING_WAIT_MS;
    return DEFAULT_PELIKAN_MIN_FEEDING_WAIT_MS + this.random() * Math.max(0, range);
  }

  private resolveNextPoseIndex(): number {
    if (roccoDefaultPelikanAssetUrls.length <= 1) {
      return 0;
    }

    let nextIndex = this.poseIndex;
    while (nextIndex === this.poseIndex) {
      nextIndex = Math.floor(this.random() * roccoDefaultPelikanAssetUrls.length);
    }
    return nextIndex;
  }

  private scheduleNextPose(): void {
    const range = DEFAULT_PELIKAN_MAX_POSE_DELAY_MS - DEFAULT_PELIKAN_MIN_POSE_DELAY_MS;
    this.nextPoseDelayMs = DEFAULT_PELIKAN_MIN_POSE_DELAY_MS + this.random() * Math.max(0, range);
  }

  private playCurrentPose(): void {
    this.engine.video.sprites.playAnimation(
      DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
      makePelikanPoseAnimationId(this.poseIndex),
      {
        restart: true,
      },
    );
    this.engine.video.render(0);
  }
}

export async function installDefaultPelikan(
  engine: RoccoEngine,
  options: RoccoDefaultPelikanOptions = {},
  preloader?: RoccoAssetPreloader,
): Promise<RoccoDefaultPelikanController> {
  const definition = await createDefaultPelikanSpriteDefinition(
    options.localization ?? createRoccoLocalization(),
  );
  engine.audio.registerSound({
    id: DEFAULT_PELIKAN_FLIGHT_SOUND_ID,
    uri: roccoDefaultPelikanFlyingSoundUrl,
    volume: DEFAULT_PELIKAN_FLIGHT_SOUND_VOLUME,
    loop: false,
  });
  await preloader?.preloadSound(engine, DEFAULT_PELIKAN_FLIGHT_SOUND_ID).catch(() => {
    engine.log('Audio', 'Pelikan flight sound could not be preloaded.');
  });
  await (preloader?.preloadSpriteDefinition(engine, definition) ?? engine.video.preloadSpriteDefinition(definition));
  engine.video.sprites.loadSpriteDefinition(definition);
  engine.video.sprites.removeSprite(DEFAULT_PELIKAN_SPRITE_INSTANCE_ID);
  engine.audio.stopSound(DEFAULT_PELIKAN_FLIGHT_SOUND_ID);

  engine.video.sprites.createSpriteFromDefinition(DEFAULT_PELIKAN_SPRITE_DEFINITION_ID, {
    id: DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
    transform: {
      x: DEFAULT_PELIKAN_PERCH_X,
      y: DEFAULT_PELIKAN_PERCH_Y,
      scaleX: DEFAULT_PELIKAN_SPRITE_SCALE,
      scaleY: DEFAULT_PELIKAN_SPRITE_SCALE,
      rotation: 0,
      flipX: false,
      flipY: false,
    },
    renderLayer: DEFAULT_PELIKAN_RENDER_LAYER,
    zIndex: DEFAULT_PELIKAN_Z_INDEX,
    depthMode: 'fixed',
    opacity: DEFAULT_PELIKAN_SPRITE_OPACITY,
    interactive: true,
    collisionEnabled: true,
  });
  engine.video.render(0);

  const feedingCycleDurationMs =
    definition.animations[DEFAULT_PELIKAN_FEEDING_ANIMATION_ID]?.frames.reduce(
      (total, frame) => total + frame.durationMs,
      0,
    ) ?? DEFAULT_PELIKAN_FEEDING_FRAME_DURATION_MS;
  const controller = new RoccoIdlePelikanController(engine, feedingCycleDurationMs, options);
  controller.start();
  return controller;
}

export function uninstallDefaultPelikan(engine: RoccoEngine): void {
  engine.video.actionMenus.unregisterMenu(DEFAULT_ACTION_MENU_ID);
  engine.video.sprites.removeSprite(DEFAULT_PELIKAN_SPRITE_INSTANCE_ID);
  engine.audio.stopSound(DEFAULT_PELIKAN_FLIGHT_SOUND_ID);
  engine.video.render(0);
}
