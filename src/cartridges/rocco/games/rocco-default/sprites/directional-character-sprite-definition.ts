import type {
  RoccoAnimationClip,
  RoccoCollisionShape,
  RoccoFacingDirection,
  RoccoPoint,
  RoccoSpriteActionProfile,
  RoccoSpriteDefinition,
  RoccoSpriteDirectionalAnimations,
  RoccoSpriteFrame,
  RoccoSpriteImage,
} from '../../../../../console/video/sprites';

export interface DirectionalCharacterSpriteAssets {
  runLeft: readonly [string, string];
  runRight: readonly [string, string];
  standing: Readonly<Record<RoccoFacingDirection, string>>;
}

export interface DirectionalCharacterSpriteSpec {
  definitionId: string;
  name: string;
  idPrefix: string;
  assets: DirectionalCharacterSpriteAssets;
  frame: {
    width: number;
    height: number;
    baseline: number;
    groundAnchor: RoccoPoint;
    hitbox: RoccoCollisionShape;
  };
  motion: {
    runSpeed: number;
    pixelsPerFrame: number;
    runFrameDurationMs: number;
    standingPoseDurationMs: number;
  };
  actions: {
    idle: string;
    run: string;
    standingSequence?: string;
    standingSequenceRight?: string;
  };
  render: NonNullable<RoccoSpriteDefinition['render']>;
  metadata?: RoccoSpriteDefinition['metadata'];
}

const STANDING_DIRECTIONS: readonly RoccoFacingDirection[] = [
  'down',
  'down-left',
  'left',
  'up-left',
  'up',
  'up-right',
  'right',
  'down-right',
];

const STANDING_SEQUENCE_LEFT_DIRECTIONS: readonly RoccoFacingDirection[] = [
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

const STANDING_SEQUENCE_RIGHT_DIRECTIONS: readonly RoccoFacingDirection[] = [
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

function makeStandingImageId(idPrefix: string, direction: RoccoFacingDirection): string {
  return `${idPrefix}-stand-${direction}`;
}

function makeStandingFrameId(idPrefix: string, direction: RoccoFacingDirection): string {
  return `${idPrefix}-stand-${direction}`;
}

function makeStandingAnimationId(idPrefix: string, direction: RoccoFacingDirection): string {
  return `${idPrefix}-stand-${direction}`;
}

function makeIdleAnimations(idPrefix: string): RoccoSpriteDirectionalAnimations {
  return {
    default: makeStandingAnimationId(idPrefix, 'left'),
    down: makeStandingAnimationId(idPrefix, 'down'),
    'down-left': makeStandingAnimationId(idPrefix, 'down-left'),
    left: makeStandingAnimationId(idPrefix, 'left'),
    'up-left': makeStandingAnimationId(idPrefix, 'up-left'),
    up: makeStandingAnimationId(idPrefix, 'up'),
    'up-right': makeStandingAnimationId(idPrefix, 'up-right'),
    right: makeStandingAnimationId(idPrefix, 'right'),
    'down-right': makeStandingAnimationId(idPrefix, 'down-right'),
  };
}

function makeRunAnimations(idPrefix: string): RoccoSpriteDirectionalAnimations {
  return {
    default: `${idPrefix}-run-left`,
    left: `${idPrefix}-run-left`,
    right: `${idPrefix}-run-right`,
  };
}

function createSpriteImages(spec: DirectionalCharacterSpriteSpec): RoccoSpriteImage[] {
  const standImages = STANDING_DIRECTIONS.map((direction) => ({
    id: makeStandingImageId(spec.idPrefix, direction),
    uri: spec.assets.standing[direction],
    width: spec.frame.width,
    height: spec.frame.height,
  }));

  const runLeftImages = spec.assets.runLeft.map((uri, index) => ({
    id: `${spec.idPrefix}-run-left-${index + 1}`,
    uri,
    width: spec.frame.width,
    height: spec.frame.height,
  }));

  const runRightImages = spec.assets.runRight.map((uri, index) => ({
    id: `${spec.idPrefix}-run-right-${index + 1}`,
    uri,
    width: spec.frame.width,
    height: spec.frame.height,
  }));

  return [...runLeftImages, ...runRightImages, ...standImages];
}

function createSpriteFrames(spec: DirectionalCharacterSpriteSpec): RoccoSpriteFrame[] {
  const runFrames: RoccoSpriteFrame[] = [
    {
      id: `${spec.idPrefix}-run-left-a`,
      imageId: `${spec.idPrefix}-run-left-1`,
      durationMs: spec.motion.runFrameDurationMs,
      hitbox: spec.frame.hitbox,
    },
    {
      id: `${spec.idPrefix}-run-left-b`,
      imageId: `${spec.idPrefix}-run-left-2`,
      durationMs: spec.motion.runFrameDurationMs,
    },
    {
      id: `${spec.idPrefix}-run-right-a`,
      imageId: `${spec.idPrefix}-run-right-1`,
      durationMs: spec.motion.runFrameDurationMs,
      hitbox: spec.frame.hitbox,
    },
    {
      id: `${spec.idPrefix}-run-right-b`,
      imageId: `${spec.idPrefix}-run-right-2`,
      durationMs: spec.motion.runFrameDurationMs,
    },
  ];

  const standFrames = STANDING_DIRECTIONS.map((direction) => ({
    id: makeStandingFrameId(spec.idPrefix, direction),
    imageId: makeStandingImageId(spec.idPrefix, direction),
    durationMs: spec.motion.standingPoseDurationMs,
    hitbox: spec.frame.hitbox,
  }));

  return [...runFrames, ...standFrames];
}

function createRunAnimation(
  id: string,
  firstFrameId: string,
  secondFrameId: string,
  pixelsPerFrame: number,
  runFrameDurationMs: number,
): RoccoAnimationClip {
  return {
    id,
    loop: true,
    playbackRate: 1,
    motionBinding: {
      mode: 'distance' as const,
      pixelsPerFrame,
    },
    frames: [
      { frameId: firstFrameId, durationMs: runFrameDurationMs },
      { frameId: secondFrameId, durationMs: runFrameDurationMs },
    ],
  };
}

function createStandingAnimations(
  spec: DirectionalCharacterSpriteSpec,
): Record<string, RoccoAnimationClip> {
  return Object.fromEntries(
    STANDING_DIRECTIONS.map((direction) => [
      makeStandingAnimationId(spec.idPrefix, direction),
      {
        id: makeStandingAnimationId(spec.idPrefix, direction),
        loop: true,
        playbackRate: 1,
        frames: [
          {
            frameId: makeStandingFrameId(spec.idPrefix, direction),
            durationMs: spec.motion.standingPoseDurationMs,
          },
        ],
      },
    ]),
  );
}

function createSequenceAnimations(
  spec: DirectionalCharacterSpriteSpec,
): Record<string, RoccoAnimationClip> {
  const animations: Record<string, RoccoAnimationClip> = {};

  if (spec.actions.standingSequence) {
    animations[spec.actions.standingSequence] = {
      id: spec.actions.standingSequence,
      loop: false,
      playbackRate: 1,
      frames: STANDING_SEQUENCE_LEFT_DIRECTIONS.map((direction) => ({
        frameId: makeStandingFrameId(spec.idPrefix, direction),
        durationMs: spec.motion.standingPoseDurationMs,
      })),
    };
  }

  if (spec.actions.standingSequenceRight) {
    animations[spec.actions.standingSequenceRight] = {
      id: spec.actions.standingSequenceRight,
      loop: false,
      playbackRate: 1,
      frames: STANDING_SEQUENCE_RIGHT_DIRECTIONS.map((direction) => ({
        frameId: makeStandingFrameId(spec.idPrefix, direction),
        durationMs: spec.motion.standingPoseDurationMs,
      })),
    };
  }

  return animations;
}

function createRunAnimations(
  spec: DirectionalCharacterSpriteSpec,
): Record<string, RoccoAnimationClip> {
  return {
    [`${spec.idPrefix}-run-left`]: createRunAnimation(
      `${spec.idPrefix}-run-left`,
      `${spec.idPrefix}-run-left-a`,
      `${spec.idPrefix}-run-left-b`,
      spec.motion.pixelsPerFrame,
      spec.motion.runFrameDurationMs,
    ),
    [`${spec.idPrefix}-run-right`]: createRunAnimation(
      `${spec.idPrefix}-run-right`,
      `${spec.idPrefix}-run-right-a`,
      `${spec.idPrefix}-run-right-b`,
      spec.motion.pixelsPerFrame,
      spec.motion.runFrameDurationMs,
    ),
  };
}

function createActionProfiles(
  spec: DirectionalCharacterSpriteSpec,
): Record<string, RoccoSpriteActionProfile> {
  return {
    [spec.actions.idle]: {
      id: spec.actions.idle,
      directionalAnimations: makeIdleAnimations(spec.idPrefix),
      playbackRate: 1,
    },
    [spec.actions.run]: {
      id: spec.actions.run,
      directionalAnimations: makeRunAnimations(spec.idPrefix),
      speed: spec.motion.runSpeed,
      playbackRate: 1,
      motionBinding: {
        mode: 'distance' as const,
        pixelsPerFrame: spec.motion.pixelsPerFrame,
      },
    },
  };
}

function buildDirectionalSpriteDefinition(
  spec: DirectionalCharacterSpriteSpec,
): RoccoSpriteDefinition {
  const definitionAnnotations: Record<string, unknown> = {
    purpose: spec.metadata?.purpose ?? `directional-${spec.idPrefix}`,
    ...spec.metadata,
  };

  return {
    id: spec.definitionId,
    name: spec.name,
    images: createSpriteImages(spec),
    frames: createSpriteFrames(spec),
    animations: {
      ...createStandingAnimations(spec),
      ...createSequenceAnimations(spec),
      ...createRunAnimations(spec),
    },
    defaultAnimation: makeStandingAnimationId(spec.idPrefix, 'left'),
    defaultIdleAction: spec.actions.idle,
    defaultMoveAction: spec.actions.run,
    defaultFacing: 'left',
    actions: createActionProfiles(spec),
    defaultMotion: {
      maxSpeedX: spec.motion.runSpeed,
      maxSpeedY: spec.motion.runSpeed,
      units: 'pixels-per-second' as const,
    },
    render: spec.render,
    autoAdjust: {
      enabled: true,
      mode: 'match-visible-height',
    },
    hitbox: spec.frame.hitbox,
    collisionBoxes: [spec.frame.hitbox],
    groundAnchor: {
      x: spec.frame.groundAnchor.x,
      y: spec.frame.groundAnchor.y,
    },
    baseline: spec.frame.baseline,
    metadata: definitionAnnotations,
  };
}

export function createDirectionalCharacterSpriteDefinition(
  spec: DirectionalCharacterSpriteSpec,
): RoccoSpriteDefinition {
  return buildDirectionalSpriteDefinition(spec);
}
