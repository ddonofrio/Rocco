import {
  ROCCO_SPRITE_DIRECTIONS,
  type RoccoSpriteDefinition,
  type RoccoSpriteDirectionalAnimations,
} from '../../engine/video/sprites';
import {
  DEFAULT_SPRITE_DEFINITION_ID,
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_MOVE_SPEED,
  DEFAULT_SPRITE_WALK_ACTION_ID,
} from './terminal-work-in-progress-constants';

function makeDirectionalAnimations(animationId: string): RoccoSpriteDirectionalAnimations {
  return {
    default: animationId,
    ...Object.fromEntries(ROCCO_SPRITE_DIRECTIONS.map((direction) => [direction, animationId])),
  };
}

export function createDefaultSpriteDefinition(): RoccoSpriteDefinition {
  return {
    id: DEFAULT_SPRITE_DEFINITION_ID,
    name: 'Rocco Demo Sprite',
    images: [
      {
        id: 'demo-sheet',
        dataRef: 'placeholder:rocco-demo-sheet',
        width: 64,
        height: 32,
      },
    ],
    frames: [
      {
        id: 'pulse-a',
        imageId: 'demo-sheet',
        rect: { x: 0, y: 0, width: 32, height: 32 },
        durationMs: 220,
        hitbox: {
          kind: 'rect',
          x: 6,
          y: 6,
          width: 20,
          height: 20,
        },
      },
      {
        id: 'pulse-b',
        imageId: 'demo-sheet',
        rect: { x: 32, y: 0, width: 32, height: 32 },
        durationMs: 220,
        hitbox: {
          kind: 'rect',
          x: 6,
          y: 6,
          width: 20,
          height: 20,
        },
      },
    ],
    animations: {
      pulse: {
        id: 'pulse',
        loop: true,
        playbackRate: 1,
        frames: [
          { frameId: 'pulse-a', durationMs: 220 },
          { frameId: 'pulse-b', durationMs: 220 },
        ],
      },
      walk: {
        id: 'walk',
        loop: true,
        playbackRate: 1,
        motionBinding: {
          mode: 'distance',
          pixelsPerFrame: 10,
        },
        frames: [
          { frameId: 'pulse-a', durationMs: 120 },
          { frameId: 'pulse-b', durationMs: 120 },
        ],
      },
    },
    defaultAnimation: 'pulse',
    defaultIdleAction: DEFAULT_SPRITE_IDLE_ACTION_ID,
    defaultMoveAction: DEFAULT_SPRITE_WALK_ACTION_ID,
    defaultFacing: 'right',
    actions: {
      [DEFAULT_SPRITE_IDLE_ACTION_ID]: {
        id: DEFAULT_SPRITE_IDLE_ACTION_ID,
        directionalAnimations: makeDirectionalAnimations('pulse'),
        playbackRate: 1,
      },
      [DEFAULT_SPRITE_WALK_ACTION_ID]: {
        id: DEFAULT_SPRITE_WALK_ACTION_ID,
        directionalAnimations: makeDirectionalAnimations('walk'),
        speed: DEFAULT_SPRITE_MOVE_SPEED,
        playbackRate: 1,
        motionBinding: {
          mode: 'distance',
          pixelsPerFrame: 10,
        },
      },
    },
    defaultMotion: {
      maxSpeedX: 72,
      maxSpeedY: 72,
      units: 'pixels-per-second',
    },
    render: {
      renderLayer: 'world.actors',
      zIndex: 50,
      depthMode: 'fixed',
      opacity: 1,
    },
    hitbox: {
      kind: 'rect',
      x: 6,
      y: 6,
      width: 20,
      height: 20,
    },
    collisionBoxes: [
      {
        kind: 'rect',
        x: 6,
        y: 6,
        width: 20,
        height: 20,
      },
    ],
    baseline: 24,
    metadata: {
      purpose: 'default-cartridge-demo',
    },
  };
}
