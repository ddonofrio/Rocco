export const ROCCO_PLAYER_CONFIG = {
  ids: {
    definition: 'rocco-running-demo-sprite',
    instance: 'rocco-running-demo-main',
    idleAction: 'idle',
    runAction: 'run',
    pickUpAction: 'pick-up',
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
  },
  standing: {
    poseCount: 9,
    poseDurationMs: 100,
    standingSequenceAnimationId: 'stand-sequence',
    standingSequenceRightAnimationId: 'stand-sequence-right',
  },
  placement: {
    startX: 980,
    centerGroundX: 480,
    pauseX: 423,
    walkTopBaselineY: 320,
    walkBottomBaselineY: 360,
    walkTopY: 135,
    walkBottomY: 175,
    yValues: [150, 165, 135, 175],
  },
} as const;
