import type { RoccoLocalization } from './localization';
import type { RoccoSpriteDefinition } from '../../console/video/sprites';
import {
  DEFAULT_GUYSPRITE_BASELINE,
  DEFAULT_GUYSPRITE_FRAME_HEIGHT,
  DEFAULT_GUYSPRITE_FRAME_WIDTH,
  DEFAULT_GUYSPRITE_GROUND_ANCHOR_X,
  DEFAULT_GUYSPRITE_GROUND_ANCHOR_Y,
  DEFAULT_GUYSPRITE_IDLE_ACTION_ID,
  DEFAULT_GUYSPRITE_PICK_UP_ACTION_ID,
  DEFAULT_GUYSPRITE_PIXELS_PER_FRAME,
  DEFAULT_GUYSPRITE_RUN_ACTION_ID,
  DEFAULT_GUYSPRITE_RUN_SPEED,
  DEFAULT_GUYSPRITE_SPRITE_DEFINITION_ID,
  DEFAULT_GUYSPRITE_STANDING_POSE_DURATION_MS,
  DEFAULT_GUYSPRITE_STANDING_SEQUENCE_ANIMATION_ID,
  DEFAULT_GUYSPRITE_STANDING_SEQUENCE_RIGHT_ANIMATION_ID,
} from './rocco-default-constants';
import {
  roccoDefaultGuyspritePickUpAssetUrl,
  roccoDefaultGuyspriteRunLeftAssetUrls,
  roccoDefaultGuyspriteRunRightAssetUrls,
  roccoDefaultGuyspriteStandingAssetUrls,
} from './rocco-default-assets';
import { createRoccoLocalization } from './localization';

const STANDING_DIRECTIONS = [
  'down',
  'down-left',
  'left',
  'up-left',
  'up',
  'up-right',
  'right',
  'down-right',
] as const;

const STANDING_SEQUENCE_LEFT_DIRECTIONS = [
  'left',
  'up-left',
  'up',
  'up-right',
  'right',
  'down-right',
  'down',
  'down-left',
  'left',
] as const;

const STANDING_SEQUENCE_RIGHT_DIRECTIONS = [
  'right',
  'down-right',
  'down',
  'down-left',
  'left',
  'up-left',
  'up',
  'up-right',
  'right',
] as const;

function makeGuyspriteStandingAnimationId(direction: string): string {
  return `guysprite-stand-${direction}`;
}

function createGuyspriteImages() {
  const assets = {
    runLeft: roccoDefaultGuyspriteRunLeftAssetUrls,
    runRight: roccoDefaultGuyspriteRunRightAssetUrls,
    standing: roccoDefaultGuyspriteStandingAssetUrls,
    pickUp: roccoDefaultGuyspritePickUpAssetUrl,
  };

  return [
    ...assets.runLeft.map((uri, index) => ({
      id: `guysprite-run-left-${index + 1}` as const,
      uri,
      width: DEFAULT_GUYSPRITE_FRAME_WIDTH,
      height: DEFAULT_GUYSPRITE_FRAME_HEIGHT,
    })),
    ...assets.runRight.map((uri, index) => ({
      id: `guysprite-run-right-${index + 1}` as const,
      uri,
      width: DEFAULT_GUYSPRITE_FRAME_WIDTH,
      height: DEFAULT_GUYSPRITE_FRAME_HEIGHT,
    })),
    {
      id: DEFAULT_GUYSPRITE_PICK_UP_ACTION_ID,
      uri: assets.pickUp,
      width: DEFAULT_GUYSPRITE_FRAME_WIDTH,
      height: DEFAULT_GUYSPRITE_FRAME_HEIGHT,
    },
    ...STANDING_DIRECTIONS.map((direction) => ({
      id: `guysprite-stand-${direction}` as const,
      uri: assets.standing[direction],
      width: DEFAULT_GUYSPRITE_FRAME_WIDTH,
      height: DEFAULT_GUYSPRITE_FRAME_HEIGHT,
    })),
  ];
}

function createGuyspriteFrames() {
  return [
    { id: 'guysprite-run-left-a', imageId: 'guysprite-run-left-1', durationMs: 120, hitbox: makeDefaultHitbox() },
    { id: 'guysprite-run-left-b', imageId: 'guysprite-run-left-2', durationMs: 120 },
    {
      id: 'guysprite-run-right-a',
      imageId: 'guysprite-run-right-1',
      durationMs: 120,
      hitbox: makeDefaultHitbox(),
    },
    { id: 'guysprite-run-right-b', imageId: 'guysprite-run-right-2', durationMs: 120 },
    {
      id: 'guysprite-pick-up',
      imageId: DEFAULT_GUYSPRITE_PICK_UP_ACTION_ID,
      durationMs: 420,
      hitbox: makeDefaultHitbox(),
    },
    ...STANDING_DIRECTIONS.map((direction) => ({
      id: `guysprite-stand-${direction}` as const,
      imageId: `guysprite-stand-${direction}` as const,
      durationMs: DEFAULT_GUYSPRITE_STANDING_POSE_DURATION_MS,
      hitbox: makeDefaultHitbox(),
    })),
  ];
}

function createGuyspriteStandingAnimations() {
  return Object.fromEntries(
    STANDING_DIRECTIONS.map((direction) => [
      makeGuyspriteStandingAnimationId(direction),
      {
        id: makeGuyspriteStandingAnimationId(direction),
        loop: true,
        playbackRate: 1,
        frames: [
          {
            frameId: makeGuyspriteStandingAnimationId(direction),
            durationMs: DEFAULT_GUYSPRITE_STANDING_POSE_DURATION_MS,
          },
        ],
      },
    ]),
  );
}

function createGuyspriteSequenceAnimations() {
  return {
    [DEFAULT_GUYSPRITE_STANDING_SEQUENCE_ANIMATION_ID]: {
      id: DEFAULT_GUYSPRITE_STANDING_SEQUENCE_ANIMATION_ID,
      loop: false,
      playbackRate: 1,
      frames: STANDING_SEQUENCE_LEFT_DIRECTIONS.map((direction) => ({
        frameId: makeGuyspriteStandingAnimationId(direction),
        durationMs: DEFAULT_GUYSPRITE_STANDING_POSE_DURATION_MS,
      })),
    },
    [DEFAULT_GUYSPRITE_STANDING_SEQUENCE_RIGHT_ANIMATION_ID]: {
      id: DEFAULT_GUYSPRITE_STANDING_SEQUENCE_RIGHT_ANIMATION_ID,
      loop: false,
      playbackRate: 1,
      frames: STANDING_SEQUENCE_RIGHT_DIRECTIONS.map((direction) => ({
        frameId: makeGuyspriteStandingAnimationId(direction),
        durationMs: DEFAULT_GUYSPRITE_STANDING_POSE_DURATION_MS,
      })),
    },
  };
}

function createGuyspriteMovementAnimations() {
  return {
    'guysprite-run-left': {
      id: 'guysprite-run-left',
      loop: true,
      playbackRate: 1,
      motionBinding: {
        mode: 'distance' as const,
        pixelsPerFrame: DEFAULT_GUYSPRITE_PIXELS_PER_FRAME,
      },
      frames: [
        { frameId: 'guysprite-run-left-a', durationMs: 120 },
        { frameId: 'guysprite-run-left-b', durationMs: 120 },
      ],
    },
    'guysprite-run-right': {
      id: 'guysprite-run-right',
      loop: true,
      playbackRate: 1,
      motionBinding: {
        mode: 'distance' as const,
        pixelsPerFrame: DEFAULT_GUYSPRITE_PIXELS_PER_FRAME,
      },
      frames: [
        { frameId: 'guysprite-run-right-a', durationMs: 120 },
        { frameId: 'guysprite-run-right-b', durationMs: 120 },
      ],
    },
    [DEFAULT_GUYSPRITE_PICK_UP_ACTION_ID]: {
      id: DEFAULT_GUYSPRITE_PICK_UP_ACTION_ID,
      loop: false,
      playbackRate: 1,
      frames: [{ frameId: 'guysprite-pick-up', durationMs: 420 }],
    },
  };
}

function createGuyspriteAnimations() {
  return {
    ...createGuyspriteStandingAnimations(),
    ...createGuyspriteSequenceAnimations(),
    ...createGuyspriteMovementAnimations(),
  };
}

function createGuyspriteActions() {
  return {
    [DEFAULT_GUYSPRITE_IDLE_ACTION_ID]: {
      id: DEFAULT_GUYSPRITE_IDLE_ACTION_ID,
      directionalAnimations: {
        default: 'guysprite-stand-left',
        down: 'guysprite-stand-down',
        'down-left': 'guysprite-stand-down-left',
        left: 'guysprite-stand-left',
        'up-left': 'guysprite-stand-up-left',
        up: 'guysprite-stand-up',
        'up-right': 'guysprite-stand-up-right',
        right: 'guysprite-stand-right',
        'down-right': 'guysprite-stand-down-right',
      },
      playbackRate: 1,
    },
    [DEFAULT_GUYSPRITE_RUN_ACTION_ID]: {
      id: DEFAULT_GUYSPRITE_RUN_ACTION_ID,
      directionalAnimations: {
        default: 'guysprite-run-left',
        left: 'guysprite-run-left',
        right: 'guysprite-run-right',
      },
      speed: DEFAULT_GUYSPRITE_RUN_SPEED,
      playbackRate: 1,
      motionBinding: {
        mode: 'distance' as const,
        pixelsPerFrame: DEFAULT_GUYSPRITE_PIXELS_PER_FRAME,
      },
    },
    [DEFAULT_GUYSPRITE_PICK_UP_ACTION_ID]: {
      id: DEFAULT_GUYSPRITE_PICK_UP_ACTION_ID,
      directionalAnimations: {
        default: DEFAULT_GUYSPRITE_PICK_UP_ACTION_ID,
        down: DEFAULT_GUYSPRITE_PICK_UP_ACTION_ID,
      },
      playbackRate: 1,
    },
  };
}

function makeDefaultHitbox() {
  return {
    kind: 'rect' as const,
    x: 54,
    y: 26,
    width: 190,
    height: 460,
  };
}

export function createGuyspriteSpriteDefinition(
  localization: RoccoLocalization = createRoccoLocalization(),
): RoccoSpriteDefinition {
  return {
    id: DEFAULT_GUYSPRITE_SPRITE_DEFINITION_ID,
    name: 'Guysprite Threepwood',
    images: createGuyspriteImages(),
    frames: createGuyspriteFrames(),
    animations: createGuyspriteAnimations(),
    defaultAnimation: 'guysprite-stand-left',
    defaultIdleAction: DEFAULT_GUYSPRITE_IDLE_ACTION_ID,
    defaultMoveAction: DEFAULT_GUYSPRITE_RUN_ACTION_ID,
    defaultFacing: 'left',
    actions: createGuyspriteActions(),
    defaultMotion: {
      maxSpeedX: DEFAULT_GUYSPRITE_RUN_SPEED,
      maxSpeedY: DEFAULT_GUYSPRITE_RUN_SPEED,
      units: 'pixels-per-second',
    },
    render: {
      renderLayer: 'world.actors',
      zIndex: 50,
      depthMode: 'baseline-sort',
      opacity: 1,
    },
    autoAdjust: {
      enabled: true,
      mode: 'match-visible-height',
    },
    hitbox: makeDefaultHitbox(),
    collisionBoxes: [makeDefaultHitbox()],
    groundAnchor: {
      x: DEFAULT_GUYSPRITE_GROUND_ANCHOR_X,
      y: DEFAULT_GUYSPRITE_GROUND_ANCHOR_Y,
    },
    baseline: DEFAULT_GUYSPRITE_BASELINE,
    visibleDescription: {
      enabled: true,
      text: localization.text.descriptions.rocco,
    },
    metadata: {
      purpose: 'guysprite-threepwood',
    },
  };
}
