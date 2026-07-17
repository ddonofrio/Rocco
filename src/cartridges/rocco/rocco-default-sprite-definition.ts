import {
  type RoccoFacingDirection,
  type RoccoSpriteDefinition,
  type RoccoSpriteDirectionalAnimations,
} from '../../console/video/sprites';
import {
  DEFAULT_SPRITE_BASELINE,
  DEFAULT_SPRITE_DEFINITION_ID,
  DEFAULT_SPRITE_FRAME_HEIGHT,
  DEFAULT_SPRITE_FRAME_WIDTH,
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_PICK_UP_ACTION_ID,
  DEFAULT_SPRITE_PIXELS_PER_FRAME,
  DEFAULT_SPRITE_RUN_ACTION_ID,
  DEFAULT_SPRITE_RUN_SPEED,
  DEFAULT_SPRITE_STANDING_POSE_DURATION_MS,
  DEFAULT_SPRITE_STANDING_SEQUENCE_ANIMATION_ID,
  DEFAULT_SPRITE_STANDING_SEQUENCE_RIGHT_ANIMATION_ID,
} from './rocco-default-constants';
import {
  resolveRoccoPlayerAppearanceAssetUrls,
} from './rocco-default-assets';
import { createRoccoLocalization, type RoccoLocalization } from './localization';
import {
  DEFAULT_ROCCO_PLAYER_APPEARANCE,
  ROCCO_LAB_COAT_PLAYER_APPEARANCE,
  type RoccoPlayerAppearance,
} from './rocco-player-appearance';

const STANDING_DIRECTIONS: RoccoFacingDirection[] = [
  'down',
  'down-left',
  'left',
  'up-left',
  'up',
  'up-right',
  'right',
  'down-right',
];

const STANDING_SEQUENCE_LEFT_DIRECTIONS: RoccoFacingDirection[] = [
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

const STANDING_SEQUENCE_RIGHT_DIRECTIONS: RoccoFacingDirection[] = [
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

const PICK_UP_IMAGE_ID = 'rocco-pick-up';
const PICK_UP_FRAME_ID = 'pick-up-front';
const PICK_UP_ANIMATION_ID = 'pick-up-front';

function makeStandingImageId(direction: RoccoFacingDirection): string {
  return `rocco-stand-${direction}`;
}

function makeStandingFrameId(direction: RoccoFacingDirection): string {
  return `stand-${direction}`;
}

function makeStandingAnimationId(direction: RoccoFacingDirection): string {
  return `stand-${direction}`;
}

function makeIdleAnimations(): RoccoSpriteDirectionalAnimations {
  return {
    default: makeStandingAnimationId('left'),
    down: makeStandingAnimationId('down'),
    'down-left': makeStandingAnimationId('down-left'),
    left: makeStandingAnimationId('left'),
    'up-left': makeStandingAnimationId('up-left'),
    up: makeStandingAnimationId('up'),
    'up-right': makeStandingAnimationId('up-right'),
    right: makeStandingAnimationId('right'),
    'down-right': makeStandingAnimationId('down-right'),
  };
}

function makeRunAnimations(): RoccoSpriteDirectionalAnimations {
  return {
    default: 'run-left',
    left: 'run-left',
    right: 'run-right',
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

export interface RoccoDefaultSpriteDefinitionOptions {
  appearance?: RoccoPlayerAppearance;
}

type RoccoAppearanceAssets = ReturnType<typeof resolveRoccoPlayerAppearanceAssetUrls>;

function createDefaultSpriteImages(
  appearanceAssets: RoccoAppearanceAssets,
): RoccoSpriteDefinition['images'] {
  return [
    ...appearanceAssets.runLeft.map((uri, index) => ({
      id: `rocco-run-left-${index + 1}`,
      uri,
      width: DEFAULT_SPRITE_FRAME_WIDTH,
      height: DEFAULT_SPRITE_FRAME_HEIGHT,
    })),
    ...appearanceAssets.runRight.map((uri, index) => ({
      id: `rocco-run-right-${index + 1}`,
      uri,
      width: DEFAULT_SPRITE_FRAME_WIDTH,
      height: DEFAULT_SPRITE_FRAME_HEIGHT,
    })),
    {
      id: PICK_UP_IMAGE_ID,
      uri: appearanceAssets.pickUp,
      width: DEFAULT_SPRITE_FRAME_WIDTH,
      height: DEFAULT_SPRITE_FRAME_HEIGHT,
    },
    ...STANDING_DIRECTIONS.map((direction) => ({
      id: makeStandingImageId(direction),
      uri: appearanceAssets.standing[direction],
      width: DEFAULT_SPRITE_FRAME_WIDTH,
      height: DEFAULT_SPRITE_FRAME_HEIGHT,
    })),
  ];
}

function createDefaultSpriteFrames(): RoccoSpriteDefinition['frames'] {
  return [
    { id: 'run-left-a', imageId: 'rocco-run-left-1', durationMs: 120, hitbox: makeDefaultHitbox() },
    { id: 'run-left-b', imageId: 'rocco-run-left-2', durationMs: 120 },
    { id: 'run-right-a', imageId: 'rocco-run-right-1', durationMs: 120, hitbox: makeDefaultHitbox() },
    { id: 'run-right-b', imageId: 'rocco-run-right-2', durationMs: 120 },
    { id: PICK_UP_FRAME_ID, imageId: PICK_UP_IMAGE_ID, durationMs: 420, hitbox: makeDefaultHitbox() },
    ...STANDING_DIRECTIONS.map((direction) => ({
      id: makeStandingFrameId(direction),
      imageId: makeStandingImageId(direction),
      durationMs: DEFAULT_SPRITE_STANDING_POSE_DURATION_MS,
      hitbox: makeDefaultHitbox(),
    })),
  ];
}

function createStandingSpriteAnimations(): RoccoSpriteDefinition['animations'] {
  return Object.fromEntries(
    STANDING_DIRECTIONS.map((direction) => [
      makeStandingAnimationId(direction),
      {
        id: makeStandingAnimationId(direction),
        loop: true,
        playbackRate: 1,
        frames: [
          {
            frameId: makeStandingFrameId(direction),
            durationMs: DEFAULT_SPRITE_STANDING_POSE_DURATION_MS,
          },
        ],
      },
    ]),
  );
}

function createDefaultSpriteAnimations(): RoccoSpriteDefinition['animations'] {
  return {
    ...createStandingSpriteAnimations(),
    [DEFAULT_SPRITE_STANDING_SEQUENCE_ANIMATION_ID]: {
      id: DEFAULT_SPRITE_STANDING_SEQUENCE_ANIMATION_ID,
      loop: false,
      playbackRate: 1,
      frames: STANDING_SEQUENCE_LEFT_DIRECTIONS.map((direction) => ({
        frameId: makeStandingFrameId(direction),
        durationMs: DEFAULT_SPRITE_STANDING_POSE_DURATION_MS,
      })),
    },
    [DEFAULT_SPRITE_STANDING_SEQUENCE_RIGHT_ANIMATION_ID]: {
      id: DEFAULT_SPRITE_STANDING_SEQUENCE_RIGHT_ANIMATION_ID,
      loop: false,
      playbackRate: 1,
      frames: STANDING_SEQUENCE_RIGHT_DIRECTIONS.map((direction) => ({
        frameId: makeStandingFrameId(direction),
        durationMs: DEFAULT_SPRITE_STANDING_POSE_DURATION_MS,
      })),
    },
    'run-left': createRunAnimation('run-left', 'run-left-a', 'run-left-b'),
    'run-right': createRunAnimation('run-right', 'run-right-a', 'run-right-b'),
    [PICK_UP_ANIMATION_ID]: {
      id: PICK_UP_ANIMATION_ID,
      loop: false,
      playbackRate: 1,
      frames: [{ frameId: PICK_UP_FRAME_ID, durationMs: 420 }],
    },
  };
}

function createRunAnimation(id: string, firstFrameId: string, secondFrameId: string) {
  return {
    id,
    loop: true,
    playbackRate: 1,
    motionBinding: {
      mode: 'distance' as const,
      pixelsPerFrame: DEFAULT_SPRITE_PIXELS_PER_FRAME,
    },
    frames: [
      { frameId: firstFrameId, durationMs: 120 },
      { frameId: secondFrameId, durationMs: 120 },
    ],
  };
}

function createDefaultSpriteActions(): RoccoSpriteDefinition['actions'] {
  return {
    [DEFAULT_SPRITE_IDLE_ACTION_ID]: {
      id: DEFAULT_SPRITE_IDLE_ACTION_ID,
      directionalAnimations: makeIdleAnimations(),
      playbackRate: 1,
    },
    [DEFAULT_SPRITE_RUN_ACTION_ID]: {
      id: DEFAULT_SPRITE_RUN_ACTION_ID,
      directionalAnimations: makeRunAnimations(),
      speed: DEFAULT_SPRITE_RUN_SPEED,
      playbackRate: 1,
      motionBinding: {
        mode: 'distance',
        pixelsPerFrame: DEFAULT_SPRITE_PIXELS_PER_FRAME,
      },
    },
    [DEFAULT_SPRITE_PICK_UP_ACTION_ID]: {
      id: DEFAULT_SPRITE_PICK_UP_ACTION_ID,
      directionalAnimations: {
        default: PICK_UP_ANIMATION_ID,
        down: PICK_UP_ANIMATION_ID,
      },
      playbackRate: 1,
    },
  };
}

export function createDefaultSpriteDefinition(
  localization: RoccoLocalization = createRoccoLocalization(),
  options: RoccoDefaultSpriteDefinitionOptions = {},
): RoccoSpriteDefinition {
  const appearance = options.appearance ?? DEFAULT_ROCCO_PLAYER_APPEARANCE;
  const appearanceAssets = resolveRoccoPlayerAppearanceAssetUrls(appearance);

  return {
    id: DEFAULT_SPRITE_DEFINITION_ID,
    name:
      appearance === ROCCO_LAB_COAT_PLAYER_APPEARANCE
        ? 'Rocco Player Sprite (Lab Coat)'
        : 'Rocco Player Sprite',
    images: createDefaultSpriteImages(appearanceAssets),
    frames: createDefaultSpriteFrames(),
    animations: createDefaultSpriteAnimations(),
    defaultAnimation: makeStandingAnimationId('left'),
    defaultIdleAction: DEFAULT_SPRITE_IDLE_ACTION_ID,
    defaultMoveAction: DEFAULT_SPRITE_RUN_ACTION_ID,
    defaultFacing: 'left',
    actions: createDefaultSpriteActions(),
    defaultMotion: {
      maxSpeedX: DEFAULT_SPRITE_RUN_SPEED,
      maxSpeedY: DEFAULT_SPRITE_RUN_SPEED,
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
      x: DEFAULT_SPRITE_GROUND_ANCHOR_X,
      y: DEFAULT_SPRITE_GROUND_ANCHOR_Y,
    },
    baseline: DEFAULT_SPRITE_BASELINE,
    visibleDescription: {
      enabled: true,
      text: localization.text.descriptions.rocco,
    },
    metadata: {
      purpose: 'default-rocco-player',
      appearance,
    },
  };
}
