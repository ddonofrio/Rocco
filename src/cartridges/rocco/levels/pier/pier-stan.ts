import type { RoccoEngine } from '../../../../engine/engine-sdk';
import {
  createRoccoSpriteAutoCroppedFrames,
  type RoccoSpriteDefinition,
} from '../../../../engine/video/sprites';
import { roccoDefaultStanAssetUrl } from '../../rocco-default-assets';
import {
  DEFAULT_STAN_RENDER_LAYER,
  DEFAULT_STAN_SLEEPING_ANIMATION_ID,
  DEFAULT_STAN_SPRITE_DEFINITION_ID,
  DEFAULT_STAN_SPRITE_INSTANCE_ID,
  DEFAULT_STAN_SPRITE_SCALE,
  DEFAULT_STAN_SHEET_HEIGHT,
  DEFAULT_STAN_SHEET_WIDTH,
  DEFAULT_STAN_X,
  DEFAULT_STAN_Y,
  DEFAULT_STAN_Z_INDEX,
} from '../../rocco-default-constants';
import type { RoccoPierSideAmbientController } from './pier-side-level';

const STAN_SHEET_IMAGE_ID = 'rocco-stan-sheet';
const STAN_SLEEPING_FRAME_INDEX = 6;
const STAN_FRAME_DURATION_MS = 1000;
const STAN_SHEET_ALPHA_THRESHOLD = 8;
const STAN_SHEET_PADDING = 8;
const STAN_SHEET_MIN_OPAQUE_PIXELS = 4000;

async function createDefaultStanSpriteDefinition(): Promise<RoccoSpriteDefinition> {
  const crop = await createRoccoSpriteAutoCroppedFrames({
    mode: 'sheet-components',
    sources: [
      {
        id: STAN_SHEET_IMAGE_ID,
        uri: roccoDefaultStanAssetUrl,
        width: DEFAULT_STAN_SHEET_WIDTH,
        height: DEFAULT_STAN_SHEET_HEIGHT,
      },
    ],
    frameIdPrefix: 'stan-pose',
    durationMs: STAN_FRAME_DURATION_MS,
    alphaThreshold: STAN_SHEET_ALPHA_THRESHOLD,
    padding: STAN_SHEET_PADDING,
    minOpaquePixels: STAN_SHEET_MIN_OPAQUE_PIXELS,
    pivot: { mode: 'bottom-center' },
    hitbox: 'none',
  });

  const sleepingFrameId =
    crop.frameIds[STAN_SLEEPING_FRAME_INDEX] ?? crop.frameIds.at(-1) ?? 'stan-pose-1';

  return {
    id: DEFAULT_STAN_SPRITE_DEFINITION_ID,
    name: 'Pier Beginning Stan',
    images: crop.images,
    frames: crop.frames,
    animations: {
      [DEFAULT_STAN_SLEEPING_ANIMATION_ID]: {
        id: DEFAULT_STAN_SLEEPING_ANIMATION_ID,
        loop: false,
        playbackRate: 1,
        frames: [
          {
            frameId: sleepingFrameId,
            durationMs: STAN_FRAME_DURATION_MS,
          },
        ],
      },
    },
    defaultAnimation: DEFAULT_STAN_SLEEPING_ANIMATION_ID,
    render: {
      renderLayer: DEFAULT_STAN_RENDER_LAYER,
      zIndex: DEFAULT_STAN_Z_INDEX,
      depthMode: 'baseline-sort',
      opacity: 1,
    },
    metadata: {
      purpose: 'pier-start-stan',
    },
  };
}

class RoccoSleepingStanController implements RoccoPierSideAmbientController {
  update(): void {}

  unmount(engine: RoccoEngine): void {
    engine.video.sprites.removeSprite(DEFAULT_STAN_SPRITE_INSTANCE_ID);
    engine.video.render(0);
  }
}

export async function installDefaultStan(
  engine: RoccoEngine,
): Promise<RoccoPierSideAmbientController> {
  const definition = await createDefaultStanSpriteDefinition();
  await engine.video.preloadSpriteDefinition(definition);
  engine.video.sprites.loadSpriteDefinition(definition);
  engine.video.sprites.removeSprite(DEFAULT_STAN_SPRITE_INSTANCE_ID);

  engine.video.sprites.createSpriteFromDefinition(DEFAULT_STAN_SPRITE_DEFINITION_ID, {
    id: DEFAULT_STAN_SPRITE_INSTANCE_ID,
    transform: {
      x: DEFAULT_STAN_X,
      y: DEFAULT_STAN_Y,
      scaleX: DEFAULT_STAN_SPRITE_SCALE,
      scaleY: DEFAULT_STAN_SPRITE_SCALE,
      rotation: 0,
    },
    renderLayer: DEFAULT_STAN_RENDER_LAYER,
    zIndex: DEFAULT_STAN_Z_INDEX,
    depthMode: 'baseline-sort',
    interactive: false,
    collisionEnabled: false,
  });
  engine.video.sprites.playAnimation(DEFAULT_STAN_SPRITE_INSTANCE_ID, DEFAULT_STAN_SLEEPING_ANIMATION_ID, {
    restart: true,
  });
  engine.video.render(0);

  return new RoccoSleepingStanController();
}
