export const GUYSPRITE_CONFIG = {
  ids: {
    definition: 'guysprite-threepwood-sprite',
    instance: 'guysprite-threepwood-main',
    idleAction: 'idle',
    runAction: 'run',
  },
  frame: {
    width: 300,
    height: 500,
    baseline: 486,
    groundAnchor: { x: 150, y: 486 },
    hitbox: {
      kind: 'rect' as const,
      x: 54,
      y: 26,
      width: 190,
      height: 460,
    },
  },
  motion: {
    runSpeed: 165,
    pixelsPerFrame: 46,
    scale: 0.38,
    standingPoseDurationMs: 100,
    standingSequenceAnimationId: 'stand-sequence',
    standingSequenceRightAnimationId: 'stand-sequence-right',
  },
} as const;
