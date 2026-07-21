import type { RoccoCollisionShape, RoccoSpriteDefinition } from '../../console/video/sprites';
import type { RoccoLocalization } from './localization';
import {
  DEFAULT_GUYSPRITE_BASELINE,
  DEFAULT_GUYSPRITE_FRAME_HEIGHT,
  DEFAULT_GUYSPRITE_FRAME_WIDTH,
  DEFAULT_GUYSPRITE_GROUND_ANCHOR_X,
  DEFAULT_GUYSPRITE_GROUND_ANCHOR_Y,
  DEFAULT_GUYSPRITE_IDLE_ACTION_ID,
  DEFAULT_GUYSPRITE_PIXELS_PER_FRAME,
  DEFAULT_GUYSPRITE_RUN_ACTION_ID,
  DEFAULT_GUYSPRITE_RUN_SPEED,
  DEFAULT_GUYSPRITE_SPRITE_DEFINITION_ID,
  DEFAULT_GUYSPRITE_STANDING_POSE_DURATION_MS,
  DEFAULT_GUYSPRITE_STANDING_SEQUENCE_ANIMATION_ID,
  DEFAULT_GUYSPRITE_STANDING_SEQUENCE_RIGHT_ANIMATION_ID,
} from './rocco-default-constants';
import {
  roccoDefaultGuyspriteRunLeftAssetUrls,
  roccoDefaultGuyspriteRunRightAssetUrls,
  roccoDefaultGuyspriteStandingAssetUrls,
} from './rocco-default-assets';
import { createRoccoLocalization } from './localization';

type StandingDirection = 'down' | 'down-left' | 'left' | 'up-left' | 'up' | 'up-right' | 'right' | 'down-right';

const STANDING_DIRECTIONS: readonly StandingDirection[] = [
  'down',
  'down-left',
  'left',
  'up-left',
  'up',
  'up-right',
  'right',
  'down-right',
];

const STANDING_SEQUENCE_LEFT_DIRECTIONS: readonly StandingDirection[] = [
  'left',
  'up-left',
  'up',
  'up-right',
  'right',
  'down-right',
  'down',
  'down-left',
  'left',
];

const STANDING_SEQUENCE_RIGHT_DIRECTIONS: readonly StandingDirection[] = [
  'right',
  'down-right',
  'down',
  'down-left',
  'left',
  'up-left',
  'up',
  'up-right',
  'right',
];

function makeGuyspriteStandingAnimationId(direction: StandingDirection): string {
  return `guysprite-stand-${direction}`;
}

function createGuyspriteImages(): RoccoSpriteDefinition['images'] {
  const assets = {
    runLeft: roccoDefaultGuyspriteRunLeftAssetUrls,
    runRight: roccoDefaultGuyspriteRunRightAssetUrls,
    standing: roccoDefaultGuyspriteStandingAssetUrls,
  };

  return [
    ...assets.runLeft.map((uri, index) => ({
      id: `guysprite-run-left-${index + 1}`,
      uri,
      width: DEFAULT_GUYSPRITE_FRAME_WIDTH,
      height: DEFAULT_GUYSPRITE_FRAME_HEIGHT,
    })),
    ...assets.runRight.map((uri, index) => ({
      id: `guysprite-run-right-${index + 1}`,
      uri,
      width: DEFAULT_GUYSPRITE_FRAME_WIDTH,
      height: DEFAULT_GUYSPRITE_FRAME_HEIGHT,
    })),
    ...STANDING_DIRECTIONS.map((direction) => ({
      id: `guysprite-stand-${direction}`,
      uri: assets.standing[direction],
      width: DEFAULT_GUYSPRITE_FRAME_WIDTH,
      height: DEFAULT_GUYSPRITE_FRAME_HEIGHT,
    })),
  ];
}

function createGuyspriteFrames(): RoccoSpriteDefinition['frames'] {
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
    ...STANDING_DIRECTIONS.map((direction) => ({
      id: `guysprite-stand-${direction}`,
      imageId: `guysprite-stand-${direction}`,
      durationMs: DEFAULT_GUYSPRITE_STANDING_POSE_DURATION_MS,
      hitbox: makeDefaultHitbox(),
    })),
  ];
}

function createGuyspriteStandingAnimations(): RoccoSpriteDefinition['animations'] {
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

function createGuyspriteSequenceAnimations(): RoccoSpriteDefinition['animations'] {
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

function createGuyspriteMovementAnimations(): RoccoSpriteDefinition['animations'] {
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
  };
}

function createGuyspriteAnimations(): RoccoSpriteDefinition['animations'] {
  return {
    ...createGuyspriteStandingAnimations(),
    ...createGuyspriteSequenceAnimations(),
    ...createGuyspriteMovementAnimations(),
  };
}

function createGuyspriteActions(): RoccoSpriteDefinition['actions'] {
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
  };
}

function makeDefaultHitbox(): RoccoCollisionShape {
  return {
    kind: 'rect',
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
