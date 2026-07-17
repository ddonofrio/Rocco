import type { RoccoSpriteDefinition } from '../../../../../../console/video/sprites';
import { createRoccoSpriteAutoCroppedFrames } from '../../../../../../console/video/sprites';
import { baitShopToiletAssetUrls } from '../../../../levels/bait-shop/bait-shop-assets';

export const NETHER_ARRIVAL_SMOKE_DEFINITION_ID = 'rocco-nether-arrival-smoke';
export const NETHER_ARRIVAL_SMOKE_INSTANCE_ID = 'rocco-nether-arrival-smoke-instance';
export const NETHER_ARRIVAL_SMOKE_ANIMATION_ID = 'nether-arrival-smoke';
export const NETHER_ARRIVAL_SMOKE_FRAME_DURATION_MS = 120;
export const NETHER_ARRIVAL_PORTAL_DEFINITION_ID = 'rocco-nether-arrival-portal';
export const NETHER_ARRIVAL_PORTAL_INSTANCE_ID = 'rocco-nether-arrival-portal-instance';
export const NETHER_ARRIVAL_PORTAL_OPEN_ANIMATION_ID = 'nether-arrival-portal-open';
export const NETHER_ARRIVAL_PORTAL_LOOP_ANIMATION_ID = 'nether-arrival-portal-loop';
export const NETHER_ARRIVAL_PORTAL_FRAME_DURATION_MS = 120;
export const NETHER_ARRIVAL_PORTAL_LOOP_SOUND_ID = 'rocco-nether-arrival-portal-loop-sound';
export const NETHER_ARRIVAL_SPELL_SOUND_ID = 'rocco-nether-arrival-spell-sound';
export const NETHER_ARRIVAL_PORTAL_LOOP_SOUND_URL = baitShopToiletAssetUrls.portalLoopSound;
export const NETHER_ARRIVAL_SPELL_SOUND_URL = baitShopToiletAssetUrls.spellSound;

const NETHER_ARRIVAL_SMOKE_IMAGE_ID_PREFIX = 'rocco-nether-arrival-smoke-image';
const NETHER_ARRIVAL_SMOKE_FRAME_ID_PREFIX = 'rocco-nether-arrival-smoke-frame';
const NETHER_ARRIVAL_PORTAL_IMAGE_ID_PREFIX = 'rocco-nether-arrival-portal-image';
const NETHER_ARRIVAL_PORTAL_FRAME_ID_PREFIX = 'rocco-nether-arrival-portal-frame';

export interface NetherArrivalSmokeDefinition {
  definition: RoccoSpriteDefinition;
  frameCount: number;
  initialFrameHeight: number;
}

export interface NetherArrivalPortalDefinition {
  definition: RoccoSpriteDefinition;
  initialFrameWidth: number;
  initialFrameHeight: number;
}

type NetherArrivalCrop = Awaited<ReturnType<typeof createRoccoSpriteAutoCroppedFrames>>;

function createNetherArrivalSmokeDefinition(
  crop: NetherArrivalCrop,
  frameIds: readonly string[],
): RoccoSpriteDefinition {
  return {
    id: NETHER_ARRIVAL_SMOKE_DEFINITION_ID,
    name: 'Nether Arrival Smoke',
    images: crop.images,
    frames: crop.frames,
    animations: {
      [NETHER_ARRIVAL_SMOKE_ANIMATION_ID]: {
        id: NETHER_ARRIVAL_SMOKE_ANIMATION_ID,
        loop: false,
        playbackRate: 1,
        frames: frameIds.map((frameId) => ({
          frameId,
          durationMs: NETHER_ARRIVAL_SMOKE_FRAME_DURATION_MS,
        })),
      },
    },
    defaultAnimation: NETHER_ARRIVAL_SMOKE_ANIMATION_ID,
    render: {
      renderLayer: 'world.front',
      zIndex: 22,
      depthMode: 'fixed',
      opacity: 1,
    },
    metadata: {
      purpose: 'nether-arrival-smoke',
    },
    ignoreMessages: true,
  };
}

function createNetherArrivalPortalDefinition(
  crop: NetherArrivalCrop,
  frameIds: readonly string[],
): RoccoSpriteDefinition {
  const openingFrameIds = frameIds.slice(0, 8);
  const loopFrameIds = frameIds.slice(4, 8);

  return {
    id: NETHER_ARRIVAL_PORTAL_DEFINITION_ID,
    name: 'Nether Arrival Portal',
    images: crop.images,
    frames: crop.frames,
    animations: {
      [NETHER_ARRIVAL_PORTAL_OPEN_ANIMATION_ID]: {
        id: NETHER_ARRIVAL_PORTAL_OPEN_ANIMATION_ID,
        loop: false,
        next: NETHER_ARRIVAL_PORTAL_LOOP_ANIMATION_ID,
        playbackRate: 1,
        frames: openingFrameIds.map((frameId) => ({
          frameId,
          durationMs: NETHER_ARRIVAL_PORTAL_FRAME_DURATION_MS,
        })),
      },
      [NETHER_ARRIVAL_PORTAL_LOOP_ANIMATION_ID]: {
        id: NETHER_ARRIVAL_PORTAL_LOOP_ANIMATION_ID,
        loop: true,
        playbackRate: 1,
        frames: loopFrameIds.map((frameId) => ({
          frameId,
          durationMs: NETHER_ARRIVAL_PORTAL_FRAME_DURATION_MS,
        })),
      },
    },
    defaultAnimation: NETHER_ARRIVAL_PORTAL_OPEN_ANIMATION_ID,
    render: {
      renderLayer: 'world.front',
      zIndex: 21,
      depthMode: 'fixed',
      opacity: 1,
    },
    metadata: {
      purpose: 'nether-arrival-portal',
    },
    ignoreMessages: true,
  };
}

export async function createNetherArrivalSmokeSpriteDefinition(): Promise<NetherArrivalSmokeDefinition> {
  const crop = await createRoccoSpriteAutoCroppedFrames({
    mode: 'image-list',
    sources: baitShopToiletAssetUrls.smokeFrames.map((uri, index) => ({
      id: `${NETHER_ARRIVAL_SMOKE_IMAGE_ID_PREFIX}-${index + 1}`,
      uri,
    })),
    frameIdPrefix: NETHER_ARRIVAL_SMOKE_FRAME_ID_PREFIX,
    durationMs: NETHER_ARRIVAL_SMOKE_FRAME_DURATION_MS,
    alphaThreshold: 1,
    padding: 0,
    pivot: { mode: 'bottom-center' },
    hitbox: 'none',
  });

  const frameIds =
    crop.frameIds.length > 0 ? crop.frameIds : [`${NETHER_ARRIVAL_SMOKE_FRAME_ID_PREFIX}-1`];
  const initialFrame = crop.frames.find((frame) => frame.id === frameIds[0]) ?? crop.frames[0];
  const initialFrameHeight = initialFrame?.rect?.height ?? 1;

  return {
    frameCount: frameIds.length,
    initialFrameHeight,
    definition: createNetherArrivalSmokeDefinition(crop, frameIds),
  };
}

export async function createNetherArrivalPortalSpriteDefinition(): Promise<NetherArrivalPortalDefinition> {
  const crop = await createRoccoSpriteAutoCroppedFrames({
    mode: 'image-list',
    sources: baitShopToiletAssetUrls.portalFrames.map((uri, index) => ({
      id: `${NETHER_ARRIVAL_PORTAL_IMAGE_ID_PREFIX}-${index + 1}`,
      uri,
    })),
    frameIdPrefix: NETHER_ARRIVAL_PORTAL_FRAME_ID_PREFIX,
    durationMs: NETHER_ARRIVAL_PORTAL_FRAME_DURATION_MS,
    alphaThreshold: 1,
    padding: 0,
    pivot: { mode: 'bottom-center' },
    hitbox: 'none',
  });

  const frameIds =
    crop.frameIds.length > 0 ? crop.frameIds : [`${NETHER_ARRIVAL_PORTAL_FRAME_ID_PREFIX}-1`];
  const initialFrame = crop.frames.find((frame) => frame.id === frameIds[0]) ?? crop.frames[0];
  const initialFrameWidth = initialFrame?.rect?.width ?? 1;
  const initialFrameHeight = initialFrame?.rect?.height ?? 1;

  return {
    initialFrameWidth,
    initialFrameHeight,
    definition: createNetherArrivalPortalDefinition(crop, frameIds),
  };
}
