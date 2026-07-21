import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import {
  createRoccoSpriteAutoCroppedFrames,
  type RoccoSpriteDefinition,
} from '../../../../../../console/video/sprites';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import {
  pierPelikanAssetUrls,
  pierPelikanFeedingAssetUrl,
  pierPelikanFlyingSoundUrl,
  pierPelikanFlightAssetUrl,
} from './pier-pelikan-assets';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import { DEFAULT_ACTION_MENU_ID } from './pier-pelikan-action-menu';
import { PIER_PELIKAN_CONFIG } from './pier-pelikan-config';

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

type PelikanCrop = Awaited<ReturnType<typeof createRoccoSpriteAutoCroppedFrames>>;

function createPelikanIdleImages(): RoccoSpriteDefinition['images'] {
  return pierPelikanAssetUrls.map((uri, index) => ({
    id: `rocco-pelikan-${index + 1}`,
    uri,
    width: PIER_PELIKAN_CONFIG.spriteWidth,
    height: PIER_PELIKAN_CONFIG.spriteHeight,
  }));
}

function createPelikanIdleFrames(): RoccoSpriteDefinition['frames'] {
  return pierPelikanAssetUrls.map((_, index) => ({
    id: makePelikanFrameId(index),
    imageId: `rocco-pelikan-${index + 1}`,
    durationMs: PIER_PELIKAN_CONFIG.frameDurationMs,
    pivot: {
      x: PIER_PELIKAN_CONFIG.footPivotX,
      y: PIER_PELIKAN_CONFIG.footPivotY,
    },
    hitbox: {
      kind: 'rect' as const,
      x: 52,
      y: 36,
      width: 214,
      height: 320,
    },
  }));
}

function createPelikanCrop(
  id: string,
  uri: string,
  frameIdPrefix: string,
  durationMs: number,
  pivot: { x: number; y: number },
): Promise<PelikanCrop> {
  return createRoccoSpriteAutoCroppedFrames({
    mode: 'sheet-components',
    sources: [
      {
        id,
        uri,
        width: PIER_PELIKAN_CONFIG.sheetWidth,
        height: PIER_PELIKAN_CONFIG.sheetHeight,
      },
    ],
    frameIdPrefix,
    durationMs,
    alphaThreshold: PELIKAN_SHEET_ALPHA_THRESHOLD,
    padding: PELIKAN_SHEET_FRAME_PADDING,
    minOpaquePixels: PELIKAN_SHEET_MIN_OPAQUE_PIXELS,
    pivot: { mode: 'relative', ...pivot },
  });
}

async function createPelikanCrops(): Promise<[PelikanCrop, PelikanCrop]> {
  return Promise.all([
    createPelikanCrop(
      PELIKAN_FLIGHT_IMAGE_ID,
      pierPelikanFlightAssetUrl,
      'pelikan-flight',
      PIER_PELIKAN_CONFIG.flightFrameDurationMs,
      { x: 0.52, y: 0.55 },
    ),
    createPelikanCrop(
      PELIKAN_FEEDING_IMAGE_ID,
      pierPelikanFeedingAssetUrl,
      'pelikan-feeding',
      PIER_PELIKAN_CONFIG.feedingFrameDurationMs,
      { x: 0.55, y: 0.94 },
    ),
  ]);
}

function createPelikanAnimation(
  id: string,
  frameIds: readonly string[],
  durationMs: number,
  isLoop: boolean,
) {
  return {
    id,
    loop: isLoop,
    playbackRate: 1,
    frames: frameIds.map((frameId) => ({ frameId, durationMs })),
  };
}

function createPelikanAnimations(
  idleFrames: RoccoSpriteDefinition['frames'],
  flightCrop: PelikanCrop,
  feedingCrop: PelikanCrop,
): RoccoSpriteDefinition['animations'] {
  const feedingWaitFrameId =
    feedingCrop.frameIds.at(-1) ?? feedingCrop.frameIds[0] ?? makePelikanFrameId(0);
  const poseAnimations = Object.fromEntries(
    pierPelikanAssetUrls.map((_, index) => {
      const frameId = makePelikanFrameId(index);
      return [
        makePelikanPoseAnimationId(index),
        createPelikanAnimation(
          makePelikanPoseAnimationId(index),
          [frameId],
          PIER_PELIKAN_CONFIG.frameDurationMs,
          false,
        ),
      ];
    }),
  );

  return {
    [PIER_PELIKAN_CONFIG.spriteAnimationId]: createPelikanAnimation(
      PIER_PELIKAN_CONFIG.spriteAnimationId,
      [idleFrames[0]?.id ?? makePelikanFrameId(0)],
      PIER_PELIKAN_CONFIG.frameDurationMs,
      false,
    ),
    [PIER_PELIKAN_CONFIG.flightAnimationId]: createPelikanAnimation(
      PIER_PELIKAN_CONFIG.flightAnimationId,
      flightCrop.frameIds,
      PIER_PELIKAN_CONFIG.flightFrameDurationMs,
      true,
    ),
    [PIER_PELIKAN_CONFIG.feedingAnimationId]: createPelikanAnimation(
      PIER_PELIKAN_CONFIG.feedingAnimationId,
      feedingCrop.frameIds,
      PIER_PELIKAN_CONFIG.feedingFrameDurationMs,
      true,
    ),
    [PIER_PELIKAN_CONFIG.feedingWaitAnimationId]: createPelikanAnimation(
      PIER_PELIKAN_CONFIG.feedingWaitAnimationId,
      [feedingWaitFrameId],
      PIER_PELIKAN_CONFIG.feedingFrameDurationMs,
      false,
    ),
    ...poseAnimations,
  };
}

async function createDefaultPelikanSpriteDefinition(
  localization: RoccoLocalization = createRoccoLocalization(),
): Promise<RoccoSpriteDefinition> {
  const idleImages = createPelikanIdleImages();
  const idleFrames = createPelikanIdleFrames();
  const [flightCrop, feedingCrop] = await createPelikanCrops();

  return {
    id: PIER_PELIKAN_CONFIG.spriteDefinitionId,
    name: 'Rocco Demo Pelikan',
    images: [...idleImages, ...flightCrop.images, ...feedingCrop.images],
    frames: [...idleFrames, ...flightCrop.frames, ...feedingCrop.frames],
    animations: createPelikanAnimations(idleFrames, flightCrop, feedingCrop),
    defaultAnimation: PIER_PELIKAN_CONFIG.spriteAnimationId,
    pivot: {
      x: PIER_PELIKAN_CONFIG.footPivotX,
      y: PIER_PELIKAN_CONFIG.footPivotY,
    },
    render: {
      renderLayer: PIER_PELIKAN_CONFIG.renderLayer,
      zIndex: PIER_PELIKAN_CONFIG.zIndex,
      depthMode: 'fixed',
      opacity: PIER_PELIKAN_CONFIG.spriteOpacity,
    },
    bounds: {
      x: 0,
      y: 0,
      width: PIER_PELIKAN_CONFIG.spriteWidth,
      height: PIER_PELIKAN_CONFIG.spriteHeight,
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
  private readonly engine: CartridgeSdkV1Runtime;
  private readonly options: RoccoDefaultPelikanOptions;
  private readonly random: () => number;
  private readonly feedingCycleDurationMs: number;
  private state: PelikanControllerState = 'idle';
  private feedingPhase: PelikanFeedingPhase = 'eating';
  private elapsedMs = 0;
  private nextPoseDelayMs = 0;
  private nextFeedingWaitMs = PIER_PELIKAN_CONFIG.minFeedingWaitMs;
  private poseIndex = 0;
  private flightStartX = PIER_PELIKAN_CONFIG.perchX;
  private flightStartY = PIER_PELIKAN_CONFIG.perchY;

  constructor(
    engine: CartridgeSdkV1Runtime,
    feedingCycleDurationMs: number,
    options: RoccoDefaultPelikanOptions = {},
    random: () => number = Math.random,
  ) {
    this.engine = engine;
    this.options = options;
    this.feedingCycleDurationMs = Math.max(
      PIER_PELIKAN_CONFIG.feedingFrameDurationMs,
      feedingCycleDurationMs,
    );
    this.random = random;
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
    if (this.elapsedMs < PIER_PELIKAN_CONFIG.turnDurationMs) {
      return;
    }

    const sprite = this.engine.video.sprites.getSprite(PIER_PELIKAN_CONFIG.spriteInstanceId);
    this.flightStartX = sprite?.transform.x ?? PIER_PELIKAN_CONFIG.perchX;
    this.flightStartY = sprite?.transform.y ?? PIER_PELIKAN_CONFIG.perchY;
    this.elapsedMs = 0;
    this.state = 'flying-to-bait';
    this.engine.video.sprites.setFlip(PIER_PELIKAN_CONFIG.spriteInstanceId, false, false);
    this.engine.video.sprites.setRenderLayer(
      PIER_PELIKAN_CONFIG.spriteInstanceId,
      PIER_PELIKAN_CONFIG.feedingRenderLayer,
    );
    this.engine.video.sprites.setDepthMode(PIER_PELIKAN_CONFIG.spriteInstanceId, 'baseline-sort');
    this.engine.video.sprites.setZIndex(
      PIER_PELIKAN_CONFIG.spriteInstanceId,
      PIER_PELIKAN_CONFIG.zIndex,
    );
    this.options.onTakeoff?.();
    this.engine.audio.playSound(PIER_PELIKAN_CONFIG.flightSoundId, {
      restart: true,
      volume: PIER_PELIKAN_CONFIG.flightSoundVolume,
    });
    this.engine.video.sprites.playAnimation(
      PIER_PELIKAN_CONFIG.spriteInstanceId,
      PIER_PELIKAN_CONFIG.flightAnimationId,
      {
        restart: true,
      },
    );
  }

  private updateFlyingToBait(deltaMs: number): void {
    this.elapsedMs = Math.min(PIER_PELIKAN_CONFIG.flightDurationMs, this.elapsedMs + deltaMs);
    const progress = this.elapsedMs / PIER_PELIKAN_CONFIG.flightDurationMs;
    const easedProgress = smoothStep(progress);
    const x =
      this.flightStartX + (PIER_PELIKAN_CONFIG.feedingX - this.flightStartX) * easedProgress;
    const y =
      this.flightStartY +
      (PIER_PELIKAN_CONFIG.feedingY - this.flightStartY) * easedProgress -
      Math.sin(progress * Math.PI) * PIER_PELIKAN_CONFIG.flightArcHeight;

    this.engine.video.sprites.setPosition(PIER_PELIKAN_CONFIG.spriteInstanceId, x, y);
    if (this.elapsedMs < PIER_PELIKAN_CONFIG.flightDurationMs) {
      return;
    }

    this.finishFlightToBait();
  }

  private finishFlightToBait(): void {
    this.state = 'feeding';
    this.elapsedMs = 0;
    this.engine.audio.stopSound(PIER_PELIKAN_CONFIG.flightSoundId);
    this.engine.video.sprites.setPosition(
      PIER_PELIKAN_CONFIG.spriteInstanceId,
      PIER_PELIKAN_CONFIG.feedingX,
      PIER_PELIKAN_CONFIG.feedingY,
    );
    this.engine.video.sprites.setDepthMode(PIER_PELIKAN_CONFIG.spriteInstanceId, 'manual');
    this.engine.video.sprites.setZIndex(
      PIER_PELIKAN_CONFIG.spriteInstanceId,
      PIER_PELIKAN_CONFIG.feedingZIndex,
    );
    this.startFeedingCycle();
  }

  private restoreFeeding(): void {
    this.state = 'feeding';
    this.elapsedMs = 0;
    this.feedingPhase = 'eating';
    this.engine.audio.stopSound(PIER_PELIKAN_CONFIG.flightSoundId);
    this.engine.video.sprites.setFlip(PIER_PELIKAN_CONFIG.spriteInstanceId, false, false);
    this.engine.video.sprites.setPosition(
      PIER_PELIKAN_CONFIG.spriteInstanceId,
      PIER_PELIKAN_CONFIG.feedingX,
      PIER_PELIKAN_CONFIG.feedingY,
    );
    this.engine.video.sprites.setRenderLayer(
      PIER_PELIKAN_CONFIG.spriteInstanceId,
      PIER_PELIKAN_CONFIG.feedingRenderLayer,
    );
    this.engine.video.sprites.setDepthMode(PIER_PELIKAN_CONFIG.spriteInstanceId, 'manual');
    this.engine.video.sprites.setZIndex(
      PIER_PELIKAN_CONFIG.spriteInstanceId,
      PIER_PELIKAN_CONFIG.feedingZIndex,
    );
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
      PIER_PELIKAN_CONFIG.spriteInstanceId,
      PIER_PELIKAN_CONFIG.feedingAnimationId,
      {
        restart: true,
        playbackRate: 1,
      },
    );
  }

  private startFeedingWait(): void {
    this.feedingPhase = 'waiting';
    this.elapsedMs = 0;
    this.nextFeedingWaitMs = this.resolveNextFeedingWaitMs();
    this.engine.video.sprites.playAnimation(
      PIER_PELIKAN_CONFIG.spriteInstanceId,
      PIER_PELIKAN_CONFIG.feedingWaitAnimationId,
      {
        restart: true,
      },
    );
  }

  private resolveNextFeedingWaitMs(): number {
    const range = PIER_PELIKAN_CONFIG.maxFeedingWaitMs - PIER_PELIKAN_CONFIG.minFeedingWaitMs;
    return PIER_PELIKAN_CONFIG.minFeedingWaitMs + this.random() * Math.max(0, range);
  }

  private resolveNextPoseIndex(): number {
    if (pierPelikanAssetUrls.length <= 1) {
      return 0;
    }

    let nextIndex = this.poseIndex;
    while (nextIndex === this.poseIndex) {
      nextIndex = Math.floor(this.random() * pierPelikanAssetUrls.length);
    }
    return nextIndex;
  }

  private scheduleNextPose(): void {
    const range = PIER_PELIKAN_CONFIG.maxPoseDelayMs - PIER_PELIKAN_CONFIG.minPoseDelayMs;
    this.nextPoseDelayMs = PIER_PELIKAN_CONFIG.minPoseDelayMs + this.random() * Math.max(0, range);
  }

  private playCurrentPose(): void {
    this.engine.video.sprites.playAnimation(
      PIER_PELIKAN_CONFIG.spriteInstanceId,
      makePelikanPoseAnimationId(this.poseIndex),
      {
        restart: true,
      },
    );
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
    this.engine.video.sprites.setFlip(PIER_PELIKAN_CONFIG.spriteInstanceId, true, false);
    this.playCurrentPose();
    return true;
  }

  isFeeding(): boolean {
    return this.state === 'feeding';
  }
}

function registerPelikanFlightSound(engine: CartridgeSdkV1Runtime): void {
  engine.audio.unregisterSound(PIER_PELIKAN_CONFIG.flightSoundId);
  engine.audio.registerSound({
    id: PIER_PELIKAN_CONFIG.flightSoundId,
    uri: pierPelikanFlyingSoundUrl,
    volume: PIER_PELIKAN_CONFIG.flightSoundVolume,
    loop: false,
  });
}

async function preloadPelikanAssets(
  engine: CartridgeSdkV1Runtime,
  definition: RoccoSpriteDefinition,
  preloader?: RoccoAssetPreloader,
): Promise<void> {
  try {
    await preloader?.preloadSound(engine, PIER_PELIKAN_CONFIG.flightSoundId);
  } catch {
    engine.log('Audio', 'Pelikan flight sound could not be preloaded.');
  }
  await (preloader?.preloadSpriteDefinition(engine, definition) ??
    engine.video.preloadSpriteDefinition(definition));
}

function createPelikanSprite(engine: CartridgeSdkV1Runtime): void {
  engine.video.sprites.createSpriteFromDefinition(PIER_PELIKAN_CONFIG.spriteDefinitionId, {
    id: PIER_PELIKAN_CONFIG.spriteInstanceId,
    transform: {
      x: PIER_PELIKAN_CONFIG.perchX,
      y: PIER_PELIKAN_CONFIG.perchY,
      scaleX: PIER_PELIKAN_CONFIG.spriteScale,
      scaleY: PIER_PELIKAN_CONFIG.spriteScale,
      rotation: 0,
      flipX: false,
      flipY: false,
    },
    renderLayer: PIER_PELIKAN_CONFIG.renderLayer,
    zIndex: PIER_PELIKAN_CONFIG.zIndex,
    depthMode: 'fixed',
    opacity: PIER_PELIKAN_CONFIG.spriteOpacity,
    interactive: true,
    collisionEnabled: true,
  });
}

export async function installDefaultPelikan(
  engine: CartridgeSdkV1Runtime,
  options: RoccoDefaultPelikanOptions = {},
  preloader?: RoccoAssetPreloader,
): Promise<RoccoDefaultPelikanController> {
  const definition = await createDefaultPelikanSpriteDefinition(
    options.localization ?? createRoccoLocalization(),
  );
  registerPelikanFlightSound(engine);
  await preloadPelikanAssets(engine, definition, preloader);
  engine.video.sprites.loadSpriteDefinition(definition);
  engine.video.sprites.removeSprite(PIER_PELIKAN_CONFIG.spriteInstanceId);
  engine.audio.stopSound(PIER_PELIKAN_CONFIG.flightSoundId);
  createPelikanSprite(engine);

  const feedingCycleDurationMs =
    definition.animations[PIER_PELIKAN_CONFIG.feedingAnimationId]?.frames.reduce(
      (total, frame) => total + frame.durationMs,
      0,
    ) ?? PIER_PELIKAN_CONFIG.feedingFrameDurationMs;
  const controller = new RoccoIdlePelikanController(engine, feedingCycleDurationMs, options);
  controller.start();
  return controller;
}

export function uninstallDefaultPelikan(engine: CartridgeSdkV1Runtime): void {
  engine.video.actionMenus.unregisterMenu(DEFAULT_ACTION_MENU_ID);
  engine.video.sprites.removeSprite(PIER_PELIKAN_CONFIG.spriteInstanceId);
  engine.audio.stopSound(PIER_PELIKAN_CONFIG.flightSoundId);
  engine.audio.unregisterSound(PIER_PELIKAN_CONFIG.flightSoundId);
}
