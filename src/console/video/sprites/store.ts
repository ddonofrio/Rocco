import type { RoccoSpriteDefinition, RoccoSpriteInstance } from './types';

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function isFiniteNumber(value: number | undefined): value is number {
  return Number.isFinite(value);
}

function pickMaxSpeed(definition: RoccoSpriteDefinition): number | undefined {
  const profile = definition.defaultMotion;
  const actionSpeeds = Object.values(definition.actions ?? {})
    .map((action) => action.speed)
    .filter(isFiniteNumber);
  const candidates = [profile?.maxSpeedX, profile?.maxSpeedY, ...actionSpeeds].filter(isFiniteNumber);
  if (candidates.length === 0) {
    return undefined;
  }

  return Math.max(...candidates.map((value) => Math.abs(value)));
}

export class RoccoSpriteStore {
  private readonly definitions = new Map<string, RoccoSpriteDefinition>();
  private nextInstanceSerial = 1;

  register(definition: RoccoSpriteDefinition): void {
    this.validateDefinition(definition);
    if (this.definitions.has(definition.id)) {
      throw new Error(`Duplicate sprite definition registration '${definition.id}'.`);
    }
    this.definitions.set(definition.id, clone(definition));
  }

  registerOrReplace(definition: RoccoSpriteDefinition): void {
    this.validateDefinition(definition);
    this.definitions.set(definition.id, clone(definition));
  }

  registerMany(definitions: RoccoSpriteDefinition[]): void {
    for (const definition of definitions) {
      this.register(definition);
    }
  }

  unregister(definitionId: string): void {
    this.definitions.delete(definitionId);
  }

  get(definitionId: string): RoccoSpriteDefinition | undefined {
    const definition = this.definitions.get(definitionId);
    return definition ? clone(definition) : undefined;
  }

  list(): RoccoSpriteDefinition[] {
    return [...this.definitions.values()].map((definition) => clone(definition));
  }

  createInstanceFromDefinition(
    definitionId: string,
    options?: Partial<RoccoSpriteInstance>,
  ): RoccoSpriteInstance {
    const definition = this.requireDefinition(definitionId);
    const defaultFacing = definition.defaultFacing ?? 'down';
    const defaultAction = definition.defaultIdleAction ? definition.actions?.[definition.defaultIdleAction] : undefined;
    const defaultAnimationId =
      defaultAction?.directionalAnimations?.[defaultFacing] ??
      defaultAction?.directionalAnimations?.default ??
      defaultAction?.animationId ??
      definition.defaultAnimation;
    const defaultAnimation = definition.animations[defaultAnimationId];
    if (!defaultAnimation || defaultAnimation.frames.length === 0) {
      throw new Error(`Sprite definition '${definition.id}' has invalid default animation.`);
    }

    const base: RoccoSpriteInstance = {
      id: `sprite-${definition.id}-${this.nextInstanceSerial++}`,
      definitionId: definition.id,
      transform: {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        flipX: false,
        flipY: false,
      },
      motion: {
        velocityX: 0,
        velocityY: 0,
        accelerationX: definition.defaultMotion?.accelerationX ?? 0,
        accelerationY: definition.defaultMotion?.accelerationY ?? 0,
        maxSpeed: pickMaxSpeed(definition),
        distanceAccumulator: 0,
      },
      animation: {
        animationId: defaultAnimationId,
        frameIndex: 0,
        elapsedMs: 0,
        playing: true,
        playbackRate: defaultAnimation.playbackRate || 1,
        motionBinding: defaultAnimation.motionBinding,
      },
      action: definition.defaultIdleAction
        ? {
            actionId: definition.defaultIdleAction,
            direction: defaultFacing,
          }
        : undefined,
      facing: defaultFacing,
      visible: true,
      enabled: true,
      interactive: false,
      collisionEnabled: true,
      renderLayer: definition.render?.renderLayer ?? 'world.actors',
      zIndex: definition.render?.zIndex ?? 0,
      depthMode: definition.render?.depthMode ?? 'fixed',
      opacity: definition.render?.opacity ?? 1,
      tint: undefined,
      contrast: undefined,
      visibleDescription: definition.visibleDescription ? clone(definition.visibleDescription) : undefined,
      ignoreMessages: definition.ignoreMessages ?? false,
      state: {},
    };

    const merged = this.mergeInstance(base, options);
    this.ensureAnimationState(merged, definition);
    return merged;
  }

  private mergeInstance(base: RoccoSpriteInstance, options?: Partial<RoccoSpriteInstance>): RoccoSpriteInstance {
    if (!options) {
      return clone(base);
    }

    return {
      ...base,
      ...clone(options),
      definitionId: base.definitionId,
      transform: {
        ...base.transform,
        ...options.transform,
      },
      motion: {
        ...base.motion,
        ...options.motion,
      },
      animation: {
        ...base.animation,
        ...options.animation,
      },
      state: options.state ? clone(options.state) : base.state,
    };
  }

  private ensureAnimationState(instance: RoccoSpriteInstance, definition: RoccoSpriteDefinition): void {
    const clip = definition.animations[instance.animation.animationId];
    if (!clip || clip.frames.length === 0) {
      throw new Error(
        `Sprite instance '${instance.id}' references animation '${instance.animation.animationId}' that does not exist.`,
      );
    }

    if (!Number.isFinite(instance.animation.frameIndex) || instance.animation.frameIndex < 0) {
      instance.animation.frameIndex = 0;
      return;
    }

    if (instance.animation.frameIndex >= clip.frames.length) {
      instance.animation.frameIndex = clip.frames.length - 1;
    }
  }

  private requireDefinition(definitionId: string): RoccoSpriteDefinition {
    const definition = this.definitions.get(definitionId);
    if (!definition) {
      throw new Error(`Sprite definition '${definitionId}' was not found.`);
    }

    return clone(definition);
  }

  private validateDefinition(definition: RoccoSpriteDefinition): void {
    if (!definition.id) {
      throw new Error('Sprite definition id is required.');
    }
    if (definition.images.length === 0) {
      throw new Error(`Sprite definition '${definition.id}' must include at least one image.`);
    }
    if (definition.frames.length === 0) {
      throw new Error(`Sprite definition '${definition.id}' must include at least one frame.`);
    }
    if (!definition.animations[definition.defaultAnimation]) {
      throw new Error(
        `Sprite definition '${definition.id}' default animation '${definition.defaultAnimation}' was not found.`,
      );
    }
    this.validateActions(definition);

    const imageIds = new Set(definition.images.map((image) => image.id));
    for (const frame of definition.frames) {
      if (!imageIds.has(frame.imageId)) {
        throw new Error(
          `Sprite definition '${definition.id}' frame '${frame.id}' references missing image '${frame.imageId}'.`,
        );
      }
    }

    const frameIds = new Set(definition.frames.map((frame) => frame.id));
    for (const animation of Object.values(definition.animations)) {
      if (animation.frames.length === 0) {
        throw new Error(`Sprite definition '${definition.id}' animation '${animation.id}' has no frames.`);
      }

      for (const frameReference of animation.frames) {
        if (!frameIds.has(frameReference.frameId)) {
          throw new Error(
            `Sprite definition '${definition.id}' animation '${animation.id}' references missing frame '${frameReference.frameId}'.`,
          );
        }
      }
    }
  }

  private validateActions(definition: RoccoSpriteDefinition): void {
    const actions = definition.actions ?? {};
    if (definition.defaultMoveAction && !actions[definition.defaultMoveAction]) {
      throw new Error(
        `Sprite definition '${definition.id}' default move action '${definition.defaultMoveAction}' was not found.`,
      );
    }
    if (definition.defaultIdleAction && !actions[definition.defaultIdleAction]) {
      throw new Error(
        `Sprite definition '${definition.id}' default idle action '${definition.defaultIdleAction}' was not found.`,
      );
    }

    for (const [actionId, action] of Object.entries(actions)) {
      if (!action.id) {
        throw new Error(`Sprite definition '${definition.id}' action '${actionId}' must include an id.`);
      }
      if (action.id !== actionId) {
        throw new Error(`Sprite definition '${definition.id}' action '${actionId}' has mismatched id '${action.id}'.`);
      }
      if (action.speed !== undefined && (!Number.isFinite(action.speed) || action.speed <= 0)) {
        throw new Error(`Sprite definition '${definition.id}' action '${actionId}' has invalid speed.`);
      }
      if (action.playbackRate !== undefined && (!Number.isFinite(action.playbackRate) || action.playbackRate <= 0)) {
        throw new Error(`Sprite definition '${definition.id}' action '${actionId}' has invalid playback rate.`);
      }

      const animationIds = [
        action.animationId,
        action.directionalAnimations?.default,
        ...Object.values(action.directionalAnimations ?? {}),
      ].filter((animationId): animationId is string => typeof animationId === 'string' && animationId.length > 0);
      for (const animationId of animationIds) {
        if (!definition.animations[animationId]) {
          throw new Error(
            `Sprite definition '${definition.id}' action '${actionId}' references missing animation '${animationId}'.`,
          );
        }
      }
    }
  }
}
