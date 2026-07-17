/* eslint-disable max-lines */

import { ROCCO_SPRITE_DIRECTIONS } from './types';
import type {
  RoccoAnimationClip,
  RoccoAnimationFrameReference,
  RoccoAnimationMotionBinding,
  RoccoFacingDirection,
  RoccoMoveOptions,
  RoccoPlayActionOptions,
  RoccoPlayAnimationOptions,
  RoccoPoint,
  RoccoSpriteActionProfile,
  RoccoSpriteDefinition,
  RoccoSpriteInstance,
} from './types';

const EPSILON = 0.0001;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isFiniteNumber(value: number | undefined): value is number {
  return Number.isFinite(value);
}

function isAtMoveTarget(
  instance: RoccoSpriteInstance,
  target: RoccoPoint,
  stopDistance: number,
): boolean {
  return Math.hypot(target.x - instance.transform.x, target.y - instance.transform.y) <= stopDistance;
}

function toFacingDirection(vx: number, vy: number): RoccoFacingDirection | undefined {
  if (Math.abs(vx) < EPSILON && Math.abs(vy) < EPSILON) {
    return undefined;
  }

  const sector = Math.round(Math.atan2(vy, vx) / (Math.PI / 4));
  const index = (sector + ROCCO_SPRITE_DIRECTIONS.length) % ROCCO_SPRITE_DIRECTIONS.length;
  return ROCCO_SPRITE_DIRECTIONS[index] ?? 'right';
}

function toHorizontalSideFacing(direction: RoccoFacingDirection | undefined): 'left' | 'right' | undefined {
  if (!direction) {
    return undefined;
  }
  if (direction.includes('left')) {
    return 'left';
  }
  if (direction.includes('right')) {
    return 'right';
  }
  return undefined;
}

function toDiagonalFacingFromFacing(
  direction: RoccoFacingDirection,
  sideFallback?: 'left' | 'right',
): RoccoFacingDirection {
  const side = toHorizontalSideFacing(direction) ?? sideFallback;
  if (direction.includes('up')) {
    if (side === 'left') {
      return 'up-left';
    }
    if (side === 'right') {
      return 'up-right';
    }
    return 'up';
  }
  if (direction.includes('down')) {
    if (side === 'left') {
      return 'down-left';
    }
    if (side === 'right') {
      return 'down-right';
    }
    return 'down';
  }
  if (side) {
    return side === 'left' ? 'down-left' : 'down-right';
  }
  return direction;
}

interface WalkMapConstraintResult {
  x: number;
  y: number;
  blocked: boolean;
}

interface RoccoSpriteMotionAnimationDriverOptions {
  requireDefinition: (definitionId: string) => RoccoSpriteDefinition;
  assertAnimationExists: (definition: RoccoSpriteDefinition, animationId: string) => RoccoAnimationClip;
  assertActionExists: (definition: RoccoSpriteDefinition, actionId: string) => RoccoSpriteActionProfile;
  constrainOriginToWalkMap: (
    instance: RoccoSpriteInstance,
    nextX: number,
    nextY: number,
    options?: Pick<RoccoMoveOptions, 'constrainToWalkMap'>,
  ) => WalkMapConstraintResult;
  resolvePerspectiveAutoAdjustMotionScale: (
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
  ) => { x: number; y: number } | undefined;
  resolveCompletionTargetFacing: (
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    options?: RoccoMoveOptions,
  ) => RoccoFacingDirection | undefined;
}

export class RoccoSpriteMotionAnimationDriver {
  private readonly requireDefinition: (definitionId: string) => RoccoSpriteDefinition;
  private readonly assertAnimationExists: (
    definition: RoccoSpriteDefinition,
    animationId: string,
  ) => RoccoAnimationClip;
  private readonly assertActionExists: (
    definition: RoccoSpriteDefinition,
    actionId: string,
  ) => RoccoSpriteActionProfile;
  private readonly constrainOriginToWalkMap: (
    instance: RoccoSpriteInstance,
    nextX: number,
    nextY: number,
    options?: Pick<RoccoMoveOptions, 'constrainToWalkMap'>,
  ) => WalkMapConstraintResult;
  private readonly resolvePerspectiveAutoAdjustMotionScale: (
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
  ) => { x: number; y: number } | undefined;
  private readonly resolveCompletionTargetFacing: (
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    options?: RoccoMoveOptions,
  ) => RoccoFacingDirection | undefined;

  constructor(options: RoccoSpriteMotionAnimationDriverOptions) {
    this.requireDefinition = options.requireDefinition;
    this.assertAnimationExists = options.assertAnimationExists;
    this.assertActionExists = options.assertActionExists;
    this.constrainOriginToWalkMap = options.constrainOriginToWalkMap;
    this.resolvePerspectiveAutoAdjustMotionScale = options.resolvePerspectiveAutoAdjustMotionScale;
    this.resolveCompletionTargetFacing = options.resolveCompletionTargetFacing;
  }

  private integrateMotion(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    deltaSeconds: number,
  ): void {
    const perspectiveMotionScale =
      this.resolvePerspectiveAutoAdjustMotionScale(instance, definition) ?? { x: 1, y: 1 };

    instance.motion.velocityX += instance.motion.accelerationX * deltaSeconds;
    instance.motion.velocityY += instance.motion.accelerationY * deltaSeconds;

    if (isFiniteNumber(instance.motion.maxSpeed) && instance.motion.maxSpeed > 0) {
      const effectiveVelocityX = instance.motion.velocityX * perspectiveMotionScale.x;
      const effectiveVelocityY = instance.motion.velocityY * perspectiveMotionScale.y;
      const speed = Math.hypot(effectiveVelocityX, effectiveVelocityY);
      if (speed > instance.motion.maxSpeed) {
        const ratio = instance.motion.maxSpeed / speed;
        instance.motion.velocityX *= ratio;
        instance.motion.velocityY *= ratio;
      }
    }

    const constrained = this.constrainOriginToWalkMap(
      instance,
      instance.transform.x + instance.motion.velocityX * deltaSeconds * perspectiveMotionScale.x,
      instance.transform.y + instance.motion.velocityY * deltaSeconds * perspectiveMotionScale.y,
      instance.motion.command?.options,
    );
    instance.transform.x = constrained.x;
    instance.transform.y = constrained.y;
    if (constrained.blocked) {
      instance.motion.velocityX = 0;
      instance.motion.velocityY = 0;
    }
  }

  private applyMovementCommand(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    deltaSeconds: number,
  ): boolean {
    const command = instance.motion.command;
    if (!command) {
      return false;
    }

    if (command.kind === 'move-by') {
      instance.motion.command = {
        kind: 'move-to',
        target: {
          x: instance.transform.x + command.delta.x,
          y: instance.transform.y + command.delta.y,
        },
        options: command.options,
      };
      return this.applyMovementCommand(instance, definition, deltaSeconds);
    }

    if (command.kind === 'follow-path') {
      if (command.path.length === 0) {
        instance.motion.command = undefined;
        this.applyIdleAction(instance, definition, command.options);
        return true;
      }

      const currentTarget = command.path[command.currentIndex] ?? command.path.at(-1);
      if (this.driveTowardTarget(instance, definition, currentTarget, command.options, deltaSeconds)) {
        command.currentIndex += 1;
        if (command.currentIndex >= command.path.length) {
          instance.motion.command = undefined;
          this.applyMovementOnComplete(instance, definition, command.options);
        }
      }
      return true;
    }

    if (command.kind === 'move-to') {
      const isReached = this.driveTowardTarget(instance, definition, command.target, command.options, deltaSeconds);
      if (isReached) {
        instance.motion.command = undefined;
        this.applyMovementOnComplete(instance, definition, command.options);
      }
      return true;
    }

    return false;
  }

  private driveTowardTarget(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    target: RoccoPoint,
    options: RoccoMoveOptions | undefined,
    deltaSeconds: number,
  ): boolean {
    const dx = target.x - instance.transform.x;
    const dy = target.y - instance.transform.y;
    const distance = Math.hypot(dx, dy);
    const stopDistance = options?.stopDistance ?? 1;

    if (isAtMoveTarget(instance, target, stopDistance)) {
      instance.transform.x = target.x;
      instance.transform.y = target.y;
      instance.motion.velocityX = 0;
      instance.motion.velocityY = 0;
      return true;
    }

    const action = this.resolveMovementAction(definition, options);
    const baseSpeed = options?.speed ?? action?.speed ?? instance.motion.maxSpeed ?? 120;
    const perspectiveMotionScale =
      this.resolvePerspectiveAutoAdjustMotionScale(instance, definition) ?? { x: 1, y: 1 };
    const speedX = baseSpeed * perspectiveMotionScale.x;
    const speedY = baseSpeed * perspectiveMotionScale.y;
    if (speedX <= 0 && speedY <= 0) {
      return false;
    }

    const nx = dx / distance;
    const ny = dy / distance;
    const facing = toFacingDirection(nx, ny);

    this.applyTowardTargetMotion(
      instance,
      definition,
      action,
      options,
      nx,
      ny,
      speedX,
      speedY,
      perspectiveMotionScale,
      facing,
    );

    return this.advanceTowardTarget(
      instance,
      target,
      options,
      deltaSeconds,
      nx,
      ny,
      distance,
      stopDistance,
    );
  }

  private advanceTowardTarget(
    instance: RoccoSpriteInstance,
    target: RoccoPoint,
    options: RoccoMoveOptions | undefined,
    deltaSeconds: number,
    nx: number,
    ny: number,
    distance: number,
    stopDistance: number,
  ): boolean {
    const stepX = instance.motion.velocityX * deltaSeconds;
    const stepY = instance.motion.velocityY * deltaSeconds;
    const projectedAdvance = nx * stepX + ny * stepY;
    if (projectedAdvance >= Math.max(0, distance - stopDistance)) {
      const constrained = this.constrainOriginToWalkMap(instance, target.x, target.y, options);
      instance.transform.x = constrained.x;
      instance.transform.y = constrained.y;
      instance.motion.velocityX = 0;
      instance.motion.velocityY = 0;
      return true;
    }
    const constrained = this.constrainOriginToWalkMap(
      instance,
      instance.transform.x + stepX,
      instance.transform.y + stepY,
      options,
    );
    instance.transform.x = constrained.x;
    instance.transform.y = constrained.y;
    return constrained.blocked;
  }

  private applyTowardTargetMotion(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    action: RoccoSpriteActionProfile | undefined,
    options: RoccoMoveOptions | undefined,
    nx: number,
    ny: number,
    speedX: number,
    speedY: number,
    perspectiveMotionScale: { x: number; y: number },
    facing: RoccoFacingDirection | undefined,
  ): void {
    instance.motion.velocityX = nx * speedX;
    instance.motion.velocityY = ny * speedY;
    if (options?.acceleration !== undefined && Number.isFinite(options.acceleration)) {
      instance.motion.accelerationX = nx * options.acceleration * perspectiveMotionScale.x;
      instance.motion.accelerationY = ny * options.acceleration * perspectiveMotionScale.y;
    }
    if (facing && options?.facingMode !== 'none') {
      instance.facing = facing;
      if (!options?.animation && action) {
        this.applyAction(instance, definition, action.id, facing, { restart: false });
      }
    }
  }

  private applyMovementOnComplete(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    options?: RoccoMoveOptions,
  ): void {
    const movementFacing = instance.facing ?? definition.defaultFacing ?? 'down';
    const targetFacing = this.resolveCompletionTargetFacing(instance, definition, options);
    const completionFacing = targetFacing ?? movementFacing;
    if (this.applyDeferredIdleSettle(instance, definition, movementFacing, completionFacing, options)) {
      return;
    }

    if (targetFacing) {
      instance.facing = targetFacing;
    }

    if (options?.onCompleteAction) {
      this.applyAction(instance, definition, options.onCompleteAction, instance.facing ?? 'down', {
        restart: true,
      });
      return;
    }

    if (options?.onComplete && Object.hasOwn(definition.animations, options.onComplete)) {
      this.playAnimation(instance, definition, options.onComplete, { restart: true });
      return;
    }

    this.applyIdleAction(instance, definition, options);
  }

  private applyDeferredIdleSettle(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    movementFacing: RoccoFacingDirection,
    completionFacing: RoccoFacingDirection,
    options?: RoccoMoveOptions,
  ): boolean {
    if (!options?.idleSettleFacing) {
      return false;
    }

    const delayMs = options.idleSettleDelayMs ?? 0;
    const actionId = options.idleAction ?? definition.defaultIdleAction;
    if (!actionId || !Object.hasOwn(definition.actions ?? {}, actionId) || delayMs <= 0) {
      return false;
    }

    const sideFacing = toHorizontalSideFacing(movementFacing);
    let settledFacing = completionFacing;
    if (options.idleSettleFacing === 'diagonal-from-facing') {
      settledFacing = toDiagonalFacingFromFacing(completionFacing, sideFacing);
    } else if (sideFacing) {
      settledFacing = toDiagonalFacingFromFacing('down', sideFacing);
    }

    this.applyAction(instance, definition, actionId, sideFacing ?? completionFacing, { restart: true });
    instance.motion.idleSettle = {
      elapsedMs: 0,
      delayMs,
      actionId,
      direction: settledFacing,
    };
    return true;
  }

  private primeMoveAction(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    target: RoccoPoint,
    options?: RoccoMoveOptions,
  ): void {
    const action = this.resolveMovementAction(definition, options);
    if (!action) {
      return;
    }

    const facing = toFacingDirection(target.x - instance.transform.x, target.y - instance.transform.y);
    if (!facing || options?.facingMode === 'none') {
      return;
    }

    this.applyAction(instance, definition, action.id, facing, { restart: false });
  }

  private applyVelocityDrivenAction(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    facing: RoccoFacingDirection,
  ): void {
    const actionId = definition.defaultMoveAction;
    if (!actionId || !Object.hasOwn(definition.actions ?? {}, actionId)) {
      return;
    }

    this.applyAction(instance, definition, actionId, facing, { restart: false });
  }

  private applyIdleAction(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    options?: RoccoMoveOptions,
  ): void {
    const actionId = options?.idleAction ?? definition.defaultIdleAction;
    if (!actionId || !Object.hasOwn(definition.actions ?? {}, actionId)) {
      return;
    }

    this.applyAction(instance, definition, actionId, instance.facing ?? definition.defaultFacing ?? 'down', {
      restart: false,
    });
  }

  private resolveMovementAction(
    definition: RoccoSpriteDefinition,
    options?: RoccoMoveOptions,
  ): RoccoSpriteActionProfile | undefined {
    const actionId = options?.action ?? definition.defaultMoveAction;
    if (!actionId) {
      return undefined;
    }

    return definition.actions?.[actionId];
  }

  private applyAction(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    actionId: string,
    direction: RoccoFacingDirection,
    options?: RoccoPlayActionOptions,
  ): void {
    const action = this.assertActionExists(definition, actionId);
    const animationId = this.resolveActionAnimation(action, direction);
    if (!animationId) {
      return;
    }

    const clip = this.assertAnimationExists(definition, animationId);
    const shouldRestart = options?.restart ?? instance.animation.animationId !== animationId;
    instance.animation.animationId = animationId;
    if (shouldRestart) {
      this.resetAnimationProgress(instance);
    }

    instance.animation.playing = true;
    instance.animation.playbackRate = options?.playbackRate ?? action.playbackRate ?? 1;
    instance.animation.motionBinding = action.motionBinding ?? clip.motionBinding;
    instance.action = {
      actionId: action.id,
      direction,
    };
    instance.facing = direction;
  }

  private resolveActionAnimation(
    action: RoccoSpriteActionProfile,
    direction: RoccoFacingDirection,
  ): string | undefined {
    return action.directionalAnimations?.[direction] ?? action.directionalAnimations?.default ?? action.animationId;
  }

  private updateIdleSettle(instance: RoccoSpriteInstance, deltaMs: number): void {
    const settle = instance.motion.idleSettle;
    if (!settle) {
      return;
    }

    if (instance.motion.command || Math.hypot(instance.motion.velocityX, instance.motion.velocityY) > EPSILON) {
      instance.motion.idleSettle = undefined;
      return;
    }

    settle.elapsedMs += deltaMs;
    if (settle.elapsedMs < settle.delayMs) {
      return;
    }

    const definition = this.requireDefinition(instance.definitionId);
    instance.motion.idleSettle = undefined;
    this.applyAction(instance, definition, settle.actionId, settle.direction, { restart: true });
  }

  private updateAnimation(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    deltaMs: number,
  ): void {
    if (!instance.animation.playing) {
      return;
    }

    const clip = this.assertAnimationExists(definition, instance.animation.animationId);
    if (clip.frames.length === 0) {
      return;
    }

    const binding = instance.animation.motionBinding ?? clip.motionBinding;
    if (binding?.mode === 'distance') {
      this.updateDistanceBoundAnimation(instance, definition, clip, binding);
      return;
    }

    const playbackRate = (clip.playbackRate || 1) * (instance.animation.playbackRate ?? 1);
    instance.animation.elapsedMs += deltaMs * playbackRate;
    this.consumeAnimationTime(instance, definition, clip);
  }

  private updateDistanceBoundAnimation(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    clip: RoccoAnimationClip,
    binding: RoccoAnimationMotionBinding,
  ): void {
    const pixelsPerFrame = Number(binding.pixelsPerFrame ?? NaN);
    if (!Number.isFinite(pixelsPerFrame) || pixelsPerFrame <= 0) {
      return;
    }

    while (instance.motion.distanceAccumulator >= pixelsPerFrame) {
      instance.motion.distanceAccumulator -= pixelsPerFrame;
      this.advanceFrame(instance, definition, clip);
      if (!instance.animation.playing) {
        return;
      }
    }
  }

  private consumeAnimationTime(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    clip: RoccoAnimationClip,
  ): void {
    let guard = 0;
    while (guard < 128) {
      guard += 1;
      const safeFrameIndex = clamp(instance.animation.frameIndex, 0, clip.frames.length - 1);
      instance.animation.frameIndex = safeFrameIndex;
      const frameReference = clip.frames[safeFrameIndex];
      if (!frameReference) {
        instance.animation.playing = false;
        return;
      }
      const duration = this.resolveFrameDuration(frameReference, definition);
      if (instance.animation.elapsedMs < duration) {
        return;
      }

      instance.animation.elapsedMs -= duration;
      this.advanceFrame(instance, definition, clip);
      if (!instance.animation.playing) {
        return;
      }
    }
  }

  private advanceFrame(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    clip: RoccoAnimationClip,
  ): void {
    const nextIndex = instance.animation.frameIndex + 1;
    if (nextIndex < clip.frames.length) {
      instance.animation.frameIndex = nextIndex;
      return;
    }

    if (clip.loop) {
      instance.animation.frameIndex = 0;
      return;
    }

    if (clip.next && Object.hasOwn(definition.animations, clip.next)) {
      instance.animation.animationId = clip.next;
      instance.animation.frameIndex = 0;
      instance.animation.elapsedMs = 0;
      instance.animation.motionBinding = definition.animations[clip.next].motionBinding;
      return;
    }

    instance.animation.frameIndex = clip.frames.length - 1;
    instance.animation.playing = false;
  }

  private resolveFrameDuration(frameReference: RoccoAnimationFrameReference, definition: RoccoSpriteDefinition): number {
    const byReference = Number(frameReference.durationMs ?? NaN);
    if (Number.isFinite(byReference) && byReference > 0) {
      return byReference;
    }

    const frame = definition.frames.find((item) => item.id === frameReference.frameId);
    const byFrame = Number(frame?.durationMs ?? NaN);
    if (Number.isFinite(byFrame) && byFrame > 0) {
      return byFrame;
    }

    return 100;
  }

  private resetAnimationProgress(instance: RoccoSpriteInstance): void {
    instance.animation.frameIndex = 0;
    instance.animation.elapsedMs = 0;
    instance.motion.distanceAccumulator = 0;
  }

  playAnimation(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    animationId: string,
    options?: RoccoPlayAnimationOptions,
  ): void {
    const clip = this.assertAnimationExists(definition, animationId);
    const shouldRestart = options?.restart ?? instance.animation.animationId !== animationId;
    instance.animation.animationId = animationId;
    if (shouldRestart) {
      this.resetAnimationProgress(instance);
    }
    instance.animation.playing = true;
    instance.animation.playbackRate =
      options?.playbackRate ??
      (isFiniteNumber(instance.animation.playbackRate)
        ? instance.animation.playbackRate
        : clip.playbackRate || 1);
    instance.animation.motionBinding = clip.motionBinding;
    instance.action = undefined;
  }

  playAction(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    actionId: string,
    options?: RoccoPlayActionOptions,
  ): void {
    const direction = options?.direction ?? instance.facing ?? definition.defaultFacing ?? 'down';
    this.applyAction(instance, definition, actionId, direction, {
      restart: options?.restart,
      playbackRate: options?.playbackRate,
    });
  }

  setVelocity(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    velocityX: number,
    velocityY: number,
  ): void {
    if (Math.abs(velocityX) > EPSILON || Math.abs(velocityY) > EPSILON) {
      instance.motion.idleSettle = undefined;
    }
    instance.motion.velocityX = velocityX;
    instance.motion.velocityY = velocityY;
    const facing = toFacingDirection(velocityX, velocityY);
    if (facing) {
      instance.facing = facing;
      this.applyVelocityDrivenAction(instance, definition, facing);
    } else {
      this.applyIdleAction(instance, definition);
    }
  }

  stopMovement(instance: RoccoSpriteInstance, definition: RoccoSpriteDefinition): void {
    instance.motion.velocityX = 0;
    instance.motion.velocityY = 0;
    instance.motion.accelerationX = 0;
    instance.motion.accelerationY = 0;
    instance.motion.command = undefined;
    this.applyIdleAction(instance, definition);
  }

  moveTo(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    x: number,
    y: number,
    options?: RoccoMoveOptions,
  ): void {
    instance.motion.idleSettle = undefined;
    instance.motion.command = {
      kind: 'move-to',
      target: { x, y },
      options: clone(options),
    };
    if (options?.animation) {
      this.playAnimation(instance, definition, options.animation, { restart: false });
      return;
    }

    this.primeMoveAction(instance, definition, { x, y }, options);
  }

  moveBy(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    dx: number,
    dy: number,
    options?: RoccoMoveOptions,
  ): void {
    instance.motion.idleSettle = undefined;
    instance.motion.command = {
      kind: 'move-by',
      delta: { x: dx, y: dy },
      options: clone(options),
    };
    if (options?.animation) {
      this.playAnimation(instance, definition, options.animation, { restart: false });
      return;
    }

    this.primeMoveAction(
      instance,
      definition,
      { x: instance.transform.x + dx, y: instance.transform.y + dy },
      options,
    );
  }

  followPath(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    path: RoccoPoint[],
    options?: RoccoMoveOptions,
  ): void {
    instance.motion.idleSettle = undefined;
    instance.motion.command = {
      kind: 'follow-path',
      path: clone(path),
      currentIndex: 0,
      options: clone(options),
    };
    if (options?.animation) {
      this.playAnimation(instance, definition, options.animation, { restart: false });
      return;
    }

    if (path.length > 0) {
      this.primeMoveAction(instance, definition, path[0], options);
    }
  }

  cancelMovement(instance: RoccoSpriteInstance, definition: RoccoSpriteDefinition): void {
    instance.motion.command = undefined;
    instance.motion.idleSettle = undefined;
    instance.motion.velocityX = 0;
    instance.motion.velocityY = 0;
    this.applyIdleAction(instance, definition);
  }

  update(instance: RoccoSpriteInstance, deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    const definition = this.requireDefinition(instance.definitionId);
    const deltaSeconds = deltaMs / 1000;
    const previousX = instance.transform.x;
    const previousY = instance.transform.y;
    const isHadCommand = instance.motion.command !== undefined;

    const isCommandIntegrated = this.applyMovementCommand(instance, definition, deltaSeconds);
    const isCompletedCommandThisTick = isHadCommand && isCommandIntegrated && instance.motion.command === undefined;
    if (!isCommandIntegrated) {
      this.integrateMotion(instance, definition, deltaSeconds);
    }

    const movedX = instance.transform.x - previousX;
    const movedY = instance.transform.y - previousY;
    const movedDistance = Math.hypot(movedX, movedY);
    if (movedDistance > EPSILON) {
      instance.motion.distanceAccumulator += movedDistance;
      const facing = toFacingDirection(movedX, movedY);
      if (facing && !isCompletedCommandThisTick) {
        instance.facing = facing;
        if (!isCommandIntegrated && !instance.motion.command) {
          this.applyVelocityDrivenAction(instance, definition, facing);
        }
      }
    }

    this.updateAnimation(instance, definition, deltaMs);
    this.updateIdleSettle(instance, deltaMs);
  }
}
