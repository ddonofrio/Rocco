import { defaultRoccoRenderLayers } from '../render-layers';
import { RoccoSpriteStore } from './store';
import { ROCCO_SPRITE_DIRECTIONS } from './types';
import type {
  RoccoAnimationClip,
  RoccoAnimationFrameRef,
  RoccoAnimationMotionBinding,
  RoccoCollisionHit,
  RoccoCollisionShape,
  RoccoDepthMode,
  RoccoFacingDirection,
  RoccoMoveOptions,
  RoccoPlayActionOptions,
  RoccoPlayAnimationOptions,
  RoccoPoint,
  RoccoRect,
  RoccoSpriteActionProfile,
  RoccoSpriteDefinition,
  RoccoSpriteFrame,
  RoccoSpriteGoToOptions,
  RoccoSpriteHit,
  RoccoSpriteImage,
  RoccoSpriteInstance,
  RoccoSpritePresentationTransform,
  RoccoSpriteSystem,
  RoccoSpriteVisualAdjustment,
  RoccoSpriteWalkMap,
  RoccoSpriteWalkMapColumn,
  RoccoSpriteNavigationBinding,
  RoccoSpriteVisibleDescription,
  RoccoSpriteVisiblePixelHit,
} from './types';

const EPSILON = 0.0001;
const DEFAULT_FOREGROUND_FACING_BIAS = 0.35;
const MIN_FOREGROUND_FACING_BIAS_PIXELS = 12;
const DEFAULT_RENDER_LAYER_ORDER = new Map(
  defaultRoccoRenderLayers.map((layer, index) => [layer.id, index]),
);

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function resolvePresentationScale(transform?: RoccoSpritePresentationTransform): { x: number; y: number } {
  const yawDegrees = clamp(transform?.yawDegrees ?? 0, -89.9, 89.9);
  const pitchDegrees = clamp(transform?.pitchDegrees ?? 0, -89.9, 89.9);
  return {
    x: Math.max(EPSILON, Math.cos(degreesToRadians(yawDegrees))),
    y: Math.max(EPSILON, Math.cos(degreesToRadians(pitchDegrees))),
  };
}

function isFiniteNumber(value: number | undefined): value is number {
  return Number.isFinite(value);
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
    return side === 'left' ? 'up-left' : side === 'right' ? 'up-right' : 'up';
  }
  if (direction.includes('down')) {
    return side === 'left' ? 'down-left' : side === 'right' ? 'down-right' : 'down';
  }
  if (side) {
    return side === 'left' ? 'down-left' : 'down-right';
  }
  return direction;
}

function isGoToOptions(options: RoccoMoveOptions | undefined): options is RoccoSpriteGoToOptions {
  if (!options) {
    return false;
  }

  return (
    'targetInstanceId' in options ||
    'keepDistance' in options ||
    'faceTargetOnComplete' in options ||
    'foregroundFacingBias' in options
  );
}

function pointInPolygon(point: RoccoPoint, points: RoccoPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;

    const intersects =
      yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + EPSILON) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WorldCircle {
  x: number;
  y: number;
  radius: number;
}

interface WorldPolygon {
  points: RoccoPoint[];
}

interface WalkMapConstraintResult {
  x: number;
  y: number;
  blocked: boolean;
}

interface SpriteAlphaMask {
  width: number;
  height: number;
  alpha: Uint8ClampedArray;
}

interface SpriteVisibleBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

type WorldShape =
  | { kind: 'rect'; rect: WorldRect }
  | { kind: 'circle'; circle: WorldCircle }
  | { kind: 'polygon'; polygon: WorldPolygon };

export interface RoccoRenderableSprite {
  instance: RoccoSpriteInstance;
  definition: RoccoSpriteDefinition;
  frame: RoccoSpriteFrame;
  visualAdjustment?: RoccoSpriteVisualAdjustment;
}

export class RoccoSpriteSystemSDK implements RoccoSpriteSystem {
  private readonly store = new RoccoSpriteStore();
  private readonly instances = new Map<string, RoccoSpriteInstance>();
  private readonly walkMaps = new Map<string, RoccoSpriteWalkMap>();
  private readonly walkMapColumnIndexes = new Map<string, Map<number, RoccoSpriteWalkMapColumn>>();
  private readonly alphaMasks = new Map<string, SpriteAlphaMask>();
  private readonly pendingAlphaMaskLoads = new Map<string, Promise<void>>();
  private readonly visibleBoundsCache = new Map<string, SpriteVisibleBounds | null>();
  private readonly autoAdjustReferenceHeightCache = new Map<string, number | null>();

  registerWalkMap(walkMap: RoccoSpriteWalkMap): void {
    this.walkMaps.set(walkMap.id, clone(walkMap));
    this.walkMapColumnIndexes.set(
      walkMap.id,
      new Map(walkMap.columns.map((column) => [column.x, clone(column)])),
    );
  }

  unregisterWalkMap(walkMapId: string): void {
    this.walkMaps.delete(walkMapId);
    this.walkMapColumnIndexes.delete(walkMapId);
    for (const instance of this.instances.values()) {
      if (instance.navigation?.walkMapId === walkMapId) {
        instance.navigation = undefined;
      }
    }
  }

  getWalkMap(walkMapId: string): RoccoSpriteWalkMap | undefined {
    const walkMap = this.walkMaps.get(walkMapId);
    return walkMap ? clone(walkMap) : undefined;
  }

  listWalkMaps(): RoccoSpriteWalkMap[] {
    return [...this.walkMaps.values()].map((walkMap) => clone(walkMap));
  }

  registerSpriteDefinition(definition: RoccoSpriteDefinition): void {
    this.store.register(definition);
    this.clearVisualCachesForDefinition(definition.id);
  }

  unregisterSpriteDefinition(definitionId: string): void {
    this.store.unregister(definitionId);
    this.clearVisualCachesForDefinition(definitionId);
  }

  getSpriteDefinition(definitionId: string): RoccoSpriteDefinition | undefined {
    return this.store.get(definitionId);
  }

  listSpriteDefinitions(): RoccoSpriteDefinition[] {
    return this.store.list();
  }

  loadSpriteDefinition(definition: RoccoSpriteDefinition): void {
    this.store.register(definition);
    this.clearVisualCachesForDefinition(definition.id);
    void this.preloadDefinitionAssets(definition);
  }

  loadSpriteDefinitions(definitions: RoccoSpriteDefinition[]): void {
    this.store.registerMany(definitions);
    for (const definition of definitions) {
      this.clearVisualCachesForDefinition(definition.id);
    }
    void Promise.all(definitions.map((definition) => this.preloadDefinitionAssets(definition)));
  }

  async preloadDefinitionAssets(definition: RoccoSpriteDefinition): Promise<void> {
    const loads = definition.images.map((image) => this.queueAlphaMaskLoad(image, definition.id));
    await Promise.all(loads);
    this.clearVisualCachesForDefinition(definition.id);
  }

  createSprite(instance: RoccoSpriteInstance): void {
    if (this.instances.has(instance.id)) {
      throw new Error(`Sprite instance '${instance.id}' already exists.`);
    }
    const definition = this.requireDefinition(instance.definitionId);
    this.assertAnimationExists(definition, instance.animation.animationId);
    const created = clone(instance);
    if (!created.navigation && definition.navigation?.walkMapId) {
      created.navigation = {
        walkMapId: definition.navigation.walkMapId,
        groundAnchor: definition.navigation.groundAnchor ?? definition.groundAnchor,
        constrainMovement: definition.navigation.constrainMovement ?? true,
        followSurface: definition.navigation.followSurface ?? true,
      };
    }
    this.instances.set(instance.id, this.constrainInstanceToWalkMap(created).instance);
  }

  createSpriteFromDefinition(
    definitionId: string,
    options?: Partial<RoccoSpriteInstance>,
  ): RoccoSpriteInstance {
    const created = this.store.createInstanceFromDefinition(definitionId, options);
    this.createSprite(created);
    return clone(created);
  }

  removeSprite(instanceId: string): void {
    this.instances.delete(instanceId);
  }

  getSprite(instanceId: string): RoccoSpriteInstance | undefined {
    const instance = this.instances.get(instanceId);
    return instance ? clone(instance) : undefined;
  }

  listSprites(): RoccoSpriteInstance[] {
    return [...this.instances.values()].map((instance) => clone(instance));
  }

  playAnimation(instanceId: string, animationId: string, options?: RoccoPlayAnimationOptions): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    const clip = this.assertAnimationExists(definition, animationId);

    const shouldRestart = options?.restart ?? instance.animation.animationId !== animationId;
    instance.animation.animationId = animationId;
    if (shouldRestart) {
      instance.animation.frameIndex = 0;
      instance.animation.elapsedMs = 0;
      instance.motion.distanceAccumulator = 0;
    }
    instance.animation.playing = true;
    instance.animation.playbackRate =
      options?.playbackRate ??
      (isFiniteNumber(instance.animation.playbackRate) ? instance.animation.playbackRate : clip.playbackRate || 1);
    instance.animation.motionBinding = clip.motionBinding;
    instance.action = undefined;
  }

  playAction(instanceId: string, actionId: string, options?: RoccoPlayActionOptions): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    const direction = options?.direction ?? instance.facing ?? definition.defaultFacing ?? 'down';
    this.applyAction(instance, definition, actionId, direction, {
      restart: options?.restart,
      playbackRate: options?.playbackRate,
    });
  }

  stopAnimation(instanceId: string): void {
    const instance = this.requireInstance(instanceId);
    instance.animation.playing = false;
  }

  setAnimationFrame(instanceId: string, frameIndex: number): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    const clip = this.assertAnimationExists(definition, instance.animation.animationId);
    if (clip.frames.length === 0) {
      instance.animation.frameIndex = 0;
      return;
    }

    const clamped = clamp(Math.floor(frameIndex), 0, clip.frames.length - 1);
    instance.animation.frameIndex = clamped;
    instance.animation.elapsedMs = 0;
  }

  setPlaybackRate(instanceId: string, playbackRate: number): void {
    const instance = this.requireInstance(instanceId);
    instance.animation.playbackRate = Number.isFinite(playbackRate) ? playbackRate : 1;
  }

  bindAnimationToMotion(instanceId: string, binding: RoccoAnimationMotionBinding): void {
    const instance = this.requireInstance(instanceId);
    instance.animation.motionBinding = clone(binding);
  }

  setPosition(instanceId: string, x: number, y: number): void {
    const instance = this.requireInstance(instanceId);
    const constrained = this.constrainOriginToWalkMap(instance, x, y);
    instance.transform.x = constrained.x;
    instance.transform.y = constrained.y;
  }

  setScale(instanceId: string, scaleX: number, scaleY: number): void {
    const instance = this.requireInstance(instanceId);
    instance.transform.scaleX = Number.isFinite(scaleX) ? scaleX : instance.transform.scaleX;
    instance.transform.scaleY = Number.isFinite(scaleY) ? scaleY : instance.transform.scaleY;
  }

  setFlip(instanceId: string, flipX: boolean, flipY: boolean): void {
    const instance = this.requireInstance(instanceId);
    instance.transform.flipX = flipX;
    instance.transform.flipY = flipY;
  }

  setPresentationTransform(instanceId: string, transform: Partial<RoccoSpritePresentationTransform>): void {
    const instance = this.requireInstance(instanceId);
    instance.transform.presentation = {
      ...instance.transform.presentation,
      ...clone(transform),
    };
  }

  translate(instanceId: string, dx: number, dy: number): void {
    const instance = this.requireInstance(instanceId);
    const constrained = this.constrainOriginToWalkMap(
      instance,
      instance.transform.x + dx,
      instance.transform.y + dy,
    );
    instance.transform.x = constrained.x;
    instance.transform.y = constrained.y;
  }

  setVelocity(instanceId: string, velocityX: number, velocityY: number): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
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

  setAcceleration(instanceId: string, accelerationX: number, accelerationY: number): void {
    const instance = this.requireInstance(instanceId);
    instance.motion.accelerationX = accelerationX;
    instance.motion.accelerationY = accelerationY;
  }

  stopMovement(instanceId: string): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    instance.motion.velocityX = 0;
    instance.motion.velocityY = 0;
    instance.motion.accelerationX = 0;
    instance.motion.accelerationY = 0;
    instance.motion.command = undefined;
    this.applyIdleAction(instance, definition);
  }

  moveTo(instanceId: string, x: number, y: number, options?: RoccoMoveOptions): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    instance.motion.idleSettle = undefined;
    instance.motion.command = {
      kind: 'move-to',
      target: { x, y },
      options: clone(options),
    };
    if (options?.animation) {
      this.playAnimation(instanceId, options.animation, { restart: false });
    } else {
      this.primeMoveAction(instance, definition, { x, y }, options);
    }
  }

  goTo(instanceId: string, x: number, y: number, options?: RoccoSpriteGoToOptions): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    const moveOptions = this.resolveGoToMoveOptions(options);
    const targetGround = this.resolveGoToGroundTarget(instance, definition, { x, y }, moveOptions);
    const targetOrigin = this.toOriginFromGroundPoint(instance, definition, targetGround);
    this.moveTo(instanceId, targetOrigin.x, targetOrigin.y, moveOptions);
  }

  moveBy(instanceId: string, dx: number, dy: number, options?: RoccoMoveOptions): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    instance.motion.idleSettle = undefined;
    instance.motion.command = {
      kind: 'move-by',
      delta: { x: dx, y: dy },
      options: clone(options),
    };
    if (options?.animation) {
      this.playAnimation(instanceId, options.animation, { restart: false });
    } else {
      this.primeMoveAction(
        instance,
        definition,
        { x: instance.transform.x + dx, y: instance.transform.y + dy },
        options,
      );
    }
  }

  followPath(instanceId: string, path: RoccoPoint[], options?: RoccoMoveOptions): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    instance.motion.idleSettle = undefined;
    instance.motion.command = {
      kind: 'follow-path',
      path: clone(path),
      currentIndex: 0,
      options: clone(options),
    };
    if (options?.animation) {
      this.playAnimation(instanceId, options.animation, { restart: false });
    } else if (path.length > 0) {
      this.primeMoveAction(instance, definition, path[0], options);
    }
  }

  cancelMovement(instanceId: string): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    instance.motion.command = undefined;
    instance.motion.idleSettle = undefined;
    instance.motion.velocityX = 0;
    instance.motion.velocityY = 0;
    this.applyIdleAction(instance, definition);
  }

  isMoving(instanceId: string): boolean {
    const instance = this.requireInstance(instanceId);
    if (instance.motion.command) {
      return true;
    }
    return Math.abs(instance.motion.velocityX) > EPSILON || Math.abs(instance.motion.velocityY) > EPSILON;
  }

  setFacing(instanceId: string, facing: RoccoFacingDirection): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    instance.facing = facing;
    if (instance.action) {
      this.applyAction(instance, definition, instance.action.actionId, facing, { restart: false });
    }
  }

  setRenderLayer(instanceId: string, renderLayer: string): void {
    const instance = this.requireInstance(instanceId);
    instance.renderLayer = renderLayer;
  }

  setZIndex(instanceId: string, zIndex: number): void {
    const instance = this.requireInstance(instanceId);
    instance.zIndex = zIndex;
  }

  setDepthMode(instanceId: string, depthMode: RoccoDepthMode): void {
    const instance = this.requireInstance(instanceId);
    instance.depthMode = depthMode;
  }

  setInteractive(instanceId: string, interactive: boolean): void {
    const instance = this.requireInstance(instanceId);
    instance.interactive = interactive;
  }

  setCollisionEnabled(instanceId: string, enabled: boolean): void {
    const instance = this.requireInstance(instanceId);
    instance.collisionEnabled = enabled;
  }

  bindToWalkMap(instanceId: string, binding: RoccoSpriteNavigationBinding): void {
    const instance = this.requireInstance(instanceId);
    if (!this.walkMaps.has(binding.walkMapId)) {
      throw new Error(`Walk map '${binding.walkMapId}' was not found.`);
    }

    const definition = this.requireDefinition(instance.definitionId);
    instance.navigation = {
      ...clone(binding),
      groundAnchor: binding.groundAnchor ?? definition.groundAnchor,
      constrainMovement: binding.constrainMovement ?? true,
      followSurface: binding.followSurface ?? true,
    };
    const constrained = this.constrainOriginToWalkMap(instance, instance.transform.x, instance.transform.y);
    instance.transform.x = constrained.x;
    instance.transform.y = constrained.y;
  }

  clearWalkMapBinding(instanceId: string): void {
    const instance = this.requireInstance(instanceId);
    instance.navigation = undefined;
  }

  hitTest(x: number, y: number): RoccoSpriteHit[] {
    const hits: RoccoSpriteHit[] = [];

    for (const instance of this.instances.values()) {
      if (!instance.enabled || !instance.visible || !instance.interactive) {
        continue;
      }

      const definition = this.requireDefinition(instance.definitionId);
      const frame = this.resolveActiveFrame(definition, instance);
      const shape = frame.hitbox ?? definition.hitbox;
      if (!shape) {
        continue;
      }

      if (this.isPointInShape(instance, shape, { x, y })) {
        hits.push({
          instanceId: instance.id,
          definitionId: definition.id,
          shape: clone(shape),
        });
      }
    }

    return hits;
  }

  hitTestVisiblePixel(x: number, y: number): RoccoSpriteVisiblePixelHit[] {
    const hits: RoccoSpriteVisiblePixelHit[] = [];
    const renderables = this.listRenderableSprites().sort((left, right) =>
      this.compareRenderablesBackToFront(right, left),
    );

    for (const renderable of renderables) {
      const description = this.resolveVisibleDescription(renderable.instance, renderable.definition);
      if (!description) {
        continue;
      }

      if (this.isPointOnVisibleSpritePixel(renderable.instance, renderable.definition, renderable.frame, { x, y })) {
        hits.push({
          instanceId: renderable.instance.id,
          definitionId: renderable.definition.id,
          text: description.text,
          textKey: description.textKey,
        });
      }
    }

    return hits;
  }

  queryCollisions(instanceId: string): RoccoCollisionHit[] {
    const hits: RoccoCollisionHit[] = [];
    const subject = this.requireInstance(instanceId);
    if (!subject.enabled || !subject.visible || !subject.collisionEnabled) {
      return hits;
    }

    const subjectDef = this.requireDefinition(subject.definitionId);
    const subjectFrame = this.resolveActiveFrame(subjectDef, subject);
    const subjectShapes = this.resolveCollisionShapes(subjectDef, subjectFrame);
    if (subjectShapes.length === 0) {
      return hits;
    }

    for (const other of this.instances.values()) {
      if (other.id === subject.id || !other.enabled || !other.visible || !other.collisionEnabled) {
        continue;
      }

      const otherDef = this.requireDefinition(other.definitionId);
      const otherFrame = this.resolveActiveFrame(otherDef, other);
      const otherShapes = this.resolveCollisionShapes(otherDef, otherFrame);
      if (otherShapes.length === 0) {
        continue;
      }

      for (const shapeA of subjectShapes) {
        for (const shapeB of otherShapes) {
          if (this.intersects(subject, shapeA, other, shapeB)) {
            hits.push({
              a: subject.id,
              b: other.id,
              shapeA: clone(shapeA),
              shapeB: clone(shapeB),
            });
            break;
          }
        }
      }
    }

    return hits;
  }

  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    const deltaSeconds = deltaMs / 1000;
    for (const instance of this.instances.values()) {
      if (!instance.enabled) {
        continue;
      }

      const previousX = instance.transform.x;
      const previousY = instance.transform.y;

      const commandIntegrated = this.applyMovementCommand(instance, deltaSeconds);
      if (!commandIntegrated) {
        this.integrateMotion(instance, deltaSeconds);
      }

      const movedX = instance.transform.x - previousX;
      const movedY = instance.transform.y - previousY;
      const movedDistance = Math.hypot(movedX, movedY);
      if (movedDistance > EPSILON) {
        instance.motion.distanceAccumulator += movedDistance;
        const facing = toFacingDirection(movedX, movedY);
        if (facing) {
          instance.facing = facing;
          if (!commandIntegrated && !instance.motion.command) {
            const definition = this.requireDefinition(instance.definitionId);
            this.applyVelocityDrivenAction(instance, definition, facing);
          }
        }
      }

      this.updateAnimation(instance, deltaMs);
      this.updateIdleSettle(instance, deltaMs);
    }
  }

  listRenderableSprites(): RoccoRenderableSprite[] {
    const renderables: RoccoRenderableSprite[] = [];
    for (const instance of this.instances.values()) {
      if (!instance.enabled || !instance.visible || instance.opacity <= 0) {
        continue;
      }

      const definition = this.requireDefinition(instance.definitionId);
      const frame = this.resolveActiveFrame(definition, instance);
      renderables.push({
        instance: clone(instance),
        definition,
        frame: clone(frame),
        visualAdjustment: this.resolveVisualAdjustment(instance, definition, frame),
      });
    }

    renderables.sort((left, right) => this.compareRenderablesBackToFront(left, right));

    return renderables;
  }

  private integrateMotion(instance: RoccoSpriteInstance, deltaSeconds: number): void {
    instance.motion.velocityX += instance.motion.accelerationX * deltaSeconds;
    instance.motion.velocityY += instance.motion.accelerationY * deltaSeconds;

    if (isFiniteNumber(instance.motion.maxSpeed) && instance.motion.maxSpeed > 0) {
      const speed = Math.hypot(instance.motion.velocityX, instance.motion.velocityY);
      if (speed > instance.motion.maxSpeed) {
        const ratio = instance.motion.maxSpeed / speed;
        instance.motion.velocityX *= ratio;
        instance.motion.velocityY *= ratio;
      }
    }

    const constrained = this.constrainOriginToWalkMap(
      instance,
      instance.transform.x + instance.motion.velocityX * deltaSeconds,
      instance.transform.y + instance.motion.velocityY * deltaSeconds,
    );
    instance.transform.x = constrained.x;
    instance.transform.y = constrained.y;
    if (constrained.blocked) {
      instance.motion.velocityX = 0;
      instance.motion.velocityY = 0;
    }
  }

  private applyMovementCommand(instance: RoccoSpriteInstance, deltaSeconds: number): boolean {
    const command = instance.motion.command;
    if (!command) {
      return false;
    }

    const definition = this.requireDefinition(instance.definitionId);

    if (command.kind === 'move-by') {
      instance.motion.command = {
        kind: 'move-to',
        target: {
          x: instance.transform.x + command.delta.x,
          y: instance.transform.y + command.delta.y,
        },
        options: command.options,
      };
      return this.applyMovementCommand(instance, deltaSeconds);
    }

    if (command.kind === 'follow-path') {
      if (command.path.length === 0) {
        instance.motion.command = undefined;
        this.applyIdleAction(instance, definition, command.options);
        return true;
      }

      const currentTarget = command.path[command.currentIndex] ?? command.path[command.path.length - 1];
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
      const reached = this.driveTowardTarget(instance, definition, command.target, command.options, deltaSeconds);
      if (reached) {
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

    if (distance <= stopDistance) {
      instance.transform.x = target.x;
      instance.transform.y = target.y;
      instance.motion.velocityX = 0;
      instance.motion.velocityY = 0;
      return true;
    }

    const action = this.resolveMovementAction(definition, options);
    const speed = options?.speed ?? action?.speed ?? instance.motion.maxSpeed ?? 120;
    if (speed <= 0) {
      return false;
    }

    const nx = dx / distance;
    const ny = dy / distance;
    const facing = toFacingDirection(nx, ny);

    instance.motion.velocityX = nx * speed;
    instance.motion.velocityY = ny * speed;
    if (options?.acceleration !== undefined && Number.isFinite(options.acceleration)) {
      instance.motion.accelerationX = nx * options.acceleration;
      instance.motion.accelerationY = ny * options.acceleration;
    }

    if (facing && options?.facingMode !== 'none') {
      instance.facing = facing;
      if (!options?.animation && action) {
        this.applyAction(instance, definition, action.id, facing, { restart: false });
      }
    }

    const stepDistance = Math.max(0, speed * deltaSeconds);
    if (stepDistance >= Math.max(0, distance - stopDistance)) {
      const constrained = this.constrainOriginToWalkMap(instance, target.x, target.y);
      instance.transform.x = constrained.x;
      instance.transform.y = constrained.y;
      instance.motion.velocityX = 0;
      instance.motion.velocityY = 0;
      return true;
    }

    const constrained = this.constrainOriginToWalkMap(
      instance,
      instance.transform.x + nx * stepDistance,
      instance.transform.y + ny * stepDistance,
    );
    instance.transform.x = constrained.x;
    instance.transform.y = constrained.y;
    return constrained.blocked;
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
      this.applyAction(instance, definition, options.onCompleteAction, instance.facing ?? 'down', { restart: true });
      return;
    }

    if (options?.onComplete && definition.animations[options.onComplete]) {
      this.playAnimation(instance.id, options.onComplete, { restart: true });
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
    const sideFacing = toHorizontalSideFacing(movementFacing);
    const settledFacing =
      options.idleSettleFacing === 'diagonal-from-facing'
        ? toDiagonalFacingFromFacing(completionFacing, sideFacing)
        : sideFacing
          ? toDiagonalFacingFromFacing('down', sideFacing)
          : completionFacing;
    if (!actionId || !definition.actions?.[actionId] || delayMs <= 0) {
      return false;
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
    if (!actionId || !definition.actions?.[actionId]) {
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
    if (!actionId || !definition.actions?.[actionId]) {
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
      instance.animation.frameIndex = 0;
      instance.animation.elapsedMs = 0;
      instance.motion.distanceAccumulator = 0;
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

  private updateAnimation(instance: RoccoSpriteInstance, deltaMs: number): void {
    if (!instance.animation.playing) {
      return;
    }

    const definition = this.requireDefinition(instance.definitionId);
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
      const frameRef = clip.frames[safeFrameIndex];
      if (!frameRef) {
        instance.animation.playing = false;
        return;
      }
      const duration = this.resolveFrameDuration(frameRef, definition);
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

    if (clip.next && definition.animations[clip.next]) {
      instance.animation.animationId = clip.next;
      instance.animation.frameIndex = 0;
      instance.animation.elapsedMs = 0;
      instance.animation.motionBinding = definition.animations[clip.next].motionBinding;
      return;
    }

    instance.animation.frameIndex = clip.frames.length - 1;
    instance.animation.playing = false;
  }

  private resolveFrameDuration(frameRef: RoccoAnimationFrameRef, definition: RoccoSpriteDefinition): number {
    const byRef = Number(frameRef.durationMs ?? NaN);
    if (Number.isFinite(byRef) && byRef > 0) {
      return byRef;
    }

    const frame = definition.frames.find((item) => item.id === frameRef.frameId);
    const byFrame = Number(frame?.durationMs ?? NaN);
    if (Number.isFinite(byFrame) && byFrame > 0) {
      return byFrame;
    }

    return 100;
  }

  private resolveActiveFrame(definition: RoccoSpriteDefinition, instance: RoccoSpriteInstance): RoccoSpriteFrame {
    const clip = this.assertAnimationExists(definition, instance.animation.animationId);
    const safeIndex = clamp(instance.animation.frameIndex, 0, clip.frames.length - 1);
    const frameId = clip.frames[safeIndex]?.frameId;
    const frame = definition.frames.find((item) => item.id === frameId) ?? definition.frames[0];
    if (!frame) {
      throw new Error(`Sprite definition '${definition.id}' has no frames.`);
    }
    return frame;
  }

  private resolveCollisionShapes(
    definition: RoccoSpriteDefinition,
    frame: RoccoSpriteFrame,
  ): RoccoCollisionShape[] {
    const fromFrame = frame.collisionBoxes ?? [];
    if (fromFrame.length > 0) {
      return clone(fromFrame);
    }

    const fromDefinition = definition.collisionBoxes ?? [];
    if (fromDefinition.length > 0) {
      return clone(fromDefinition);
    }

    if (frame.hitbox) {
      return [clone(frame.hitbox)];
    }
    if (definition.hitbox) {
      return [clone(definition.hitbox)];
    }
    return [];
  }

  private isPointInShape(instance: RoccoSpriteInstance, shape: RoccoCollisionShape, point: RoccoPoint): boolean {
    const world = this.toWorldShape(instance, shape);
    if (world.kind === 'rect') {
      return (
        point.x >= world.rect.x &&
        point.x <= world.rect.x + world.rect.width &&
        point.y >= world.rect.y &&
        point.y <= world.rect.y + world.rect.height
      );
    }
    if (world.kind === 'circle') {
      const dx = point.x - world.circle.x;
      const dy = point.y - world.circle.y;
      return dx * dx + dy * dy <= world.circle.radius * world.circle.radius;
    }

    return pointInPolygon(point, world.polygon.points);
  }

  private intersects(
    leftInstance: RoccoSpriteInstance,
    leftShape: RoccoCollisionShape,
    rightInstance: RoccoSpriteInstance,
    rightShape: RoccoCollisionShape,
  ): boolean {
    const leftWorld = this.toWorldShape(leftInstance, leftShape);
    const rightWorld = this.toWorldShape(rightInstance, rightShape);

    if (leftWorld.kind === 'rect' && rightWorld.kind === 'rect') {
      return this.intersectsRectRect(leftWorld.rect, rightWorld.rect);
    }
    if (leftWorld.kind === 'circle' && rightWorld.kind === 'circle') {
      const dx = leftWorld.circle.x - rightWorld.circle.x;
      const dy = leftWorld.circle.y - rightWorld.circle.y;
      const radius = leftWorld.circle.radius + rightWorld.circle.radius;
      return dx * dx + dy * dy <= radius * radius;
    }
    if (leftWorld.kind === 'circle' && rightWorld.kind === 'rect') {
      return this.intersectsCircleRect(leftWorld.circle, rightWorld.rect);
    }
    if (leftWorld.kind === 'rect' && rightWorld.kind === 'circle') {
      return this.intersectsCircleRect(rightWorld.circle, leftWorld.rect);
    }

    const leftBounds = this.toBounds(leftWorld);
    const rightBounds = this.toBounds(rightWorld);
    return this.intersectsRectRect(leftBounds, rightBounds);
  }

  private intersectsRectRect(left: WorldRect, right: WorldRect): boolean {
    return (
      left.x < right.x + right.width &&
      left.x + left.width > right.x &&
      left.y < right.y + right.height &&
      left.y + left.height > right.y
    );
  }

  private intersectsCircleRect(circle: WorldCircle, rect: WorldRect): boolean {
    const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
    const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
  }

  private toBounds(shape: WorldShape): WorldRect {
    if (shape.kind === 'rect') {
      return shape.rect;
    }
    if (shape.kind === 'circle') {
      return {
        x: shape.circle.x - shape.circle.radius,
        y: shape.circle.y - shape.circle.radius,
        width: shape.circle.radius * 2,
        height: shape.circle.radius * 2,
      };
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const point of shape.polygon.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private toWorldShape(instance: RoccoSpriteInstance, shape: RoccoCollisionShape): WorldShape {
    const presentationScale = resolvePresentationScale(instance.transform.presentation);
    const scaleX = (instance.transform.scaleX || 1) * presentationScale.x * (instance.transform.flipX ? -1 : 1);
    const scaleY = (instance.transform.scaleY || 1) * presentationScale.y * (instance.transform.flipY ? -1 : 1);
    if (shape.kind === 'rect') {
      const width = shape.width * scaleX;
      const height = shape.height * scaleY;
      return {
        kind: 'rect',
        rect: {
          x: instance.transform.x + shape.x * scaleX + Math.min(0, width),
          y: instance.transform.y + shape.y * scaleY + Math.min(0, height),
          width: Math.abs(width),
          height: Math.abs(height),
        },
      };
    }

    if (shape.kind === 'circle') {
      const radiusScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
      return {
        kind: 'circle',
        circle: {
          x: instance.transform.x + shape.x * scaleX,
          y: instance.transform.y + shape.y * scaleY,
          radius: Math.abs(shape.radius * radiusScale),
        },
      };
    }

    return {
      kind: 'polygon',
      polygon: {
        points: shape.points.map((point) => ({
          x: instance.transform.x + point.x * scaleX,
          y: instance.transform.y + point.y * scaleY,
        })),
      },
    };
  }

  private resolveDepth(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    frame?: RoccoSpriteFrame,
  ): number {
    const mode = instance.depthMode ?? 'fixed';
    if (mode === 'manual') {
      return instance.depth ?? instance.zIndex;
    }
    if (mode === 'y-sort') {
      return instance.transform.y;
    }
    if (mode === 'baseline-sort') {
      return this.resolveBaselineDepth(instance, definition, frame ?? this.resolveActiveFrame(definition, instance));
    }
    return instance.zIndex;
  }

  private compareRenderablesBackToFront(left: RoccoRenderableSprite, right: RoccoRenderableSprite): number {
    const layerCompare = this.compareRenderLayers(left.instance.renderLayer, right.instance.renderLayer);
    if (layerCompare !== 0) {
      return layerCompare;
    }

    const depthLeft = this.resolveDepth(left.instance, left.definition, left.frame);
    const depthRight = this.resolveDepth(right.instance, right.definition, right.frame);
    if (depthLeft !== depthRight) {
      return depthLeft - depthRight;
    }

    if (left.instance.zIndex !== right.instance.zIndex) {
      return left.instance.zIndex - right.instance.zIndex;
    }

    return left.instance.id.localeCompare(right.instance.id);
  }

  private compareRenderLayers(left: string, right: string): number {
    const leftOrder = DEFAULT_RENDER_LAYER_ORDER.get(left);
    const rightOrder = DEFAULT_RENDER_LAYER_ORDER.get(right);

    if (leftOrder !== undefined && rightOrder !== undefined && leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    if (leftOrder !== undefined && rightOrder === undefined) {
      return -1;
    }
    if (leftOrder === undefined && rightOrder !== undefined) {
      return 1;
    }

    return left.localeCompare(right);
  }

  private resolveBaselineDepth(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    frame: RoccoSpriteFrame,
  ): number {
    const pivot = frame.pivot ?? definition.pivot ?? { x: 0, y: 0 };
    const anchor = instance.navigation?.groundAnchor ?? definition.groundAnchor;
    const scaleY = instance.transform.scaleY || 1;

    if (anchor) {
      return instance.transform.y + (anchor.y - pivot.y) * scaleY;
    }

    if (Number.isFinite(definition.baseline)) {
      return instance.transform.y + ((definition.baseline ?? 0) - pivot.y) * scaleY;
    }

    return instance.transform.y;
  }

  private requireInstance(instanceId: string): RoccoSpriteInstance {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Sprite instance '${instanceId}' was not found.`);
    }
    return instance;
  }

  private requireDefinition(definitionId: string): RoccoSpriteDefinition {
    const definition = this.store.get(definitionId);
    if (!definition) {
      throw new Error(`Sprite definition '${definitionId}' was not found.`);
    }
    return definition;
  }

  private assertAnimationExists(definition: RoccoSpriteDefinition, animationId: string): RoccoAnimationClip {
    const clip = definition.animations[animationId];
    if (!clip) {
      throw new Error(`Sprite definition '${definition.id}' has no animation '${animationId}'.`);
    }
    if (clip.frames.length === 0) {
      throw new Error(`Sprite animation '${animationId}' has no frames.`);
    }
    return clip;
  }

  private assertActionExists(definition: RoccoSpriteDefinition, actionId: string): RoccoSpriteActionProfile {
    const action = definition.actions?.[actionId];
    if (!action) {
      throw new Error(`Sprite definition '${definition.id}' has no action '${actionId}'.`);
    }
    return action;
  }

  private queueAlphaMaskLoad(image: RoccoSpriteImage, definitionId: string): Promise<void> {
    const key = this.resolveImageSourceKey(image, definitionId);
    if (this.alphaMasks.has(key)) {
      return Promise.resolve();
    }

    const pending = this.pendingAlphaMaskLoads.get(key);
    if (pending) {
      return pending;
    }

    const load = this.createAlphaMask(image)
      .then((mask) => {
        this.alphaMasks.set(key, mask);
      })
      .finally(() => {
        this.pendingAlphaMaskLoads.delete(key);
      });
    this.pendingAlphaMaskLoads.set(key, load);
    return load;
  }

  private async createAlphaMask(image: RoccoSpriteImage): Promise<SpriteAlphaMask> {
    if (image.alphaMask) {
      return {
        width: image.alphaMask.width,
        height: image.alphaMask.height,
        alpha: new Uint8ClampedArray(image.alphaMask.alpha),
      };
    }

    if (!image.uri || typeof document === 'undefined' || typeof Image === 'undefined') {
      return this.createOpaqueAlphaMask(image.width ?? 1, image.height ?? 1);
    }

    const loaded = await this.loadImage(image.uri);
    const width = loaded.naturalWidth || loaded.width || image.width || 1;
    const height = loaded.naturalHeight || loaded.height || image.height || 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
    const context = canvas.getContext('2d');
    if (!context) {
      return this.createOpaqueAlphaMask(width, height);
    }

    context.drawImage(loaded, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const alpha = new Uint8ClampedArray(canvas.width * canvas.height);
    for (let index = 0; index < alpha.length; index += 1) {
      alpha[index] = imageData.data[index * 4 + 3] ?? 0;
    }
    return {
      width: canvas.width,
      height: canvas.height,
      alpha,
    };
  }

  private createOpaqueAlphaMask(width: number, height: number): SpriteAlphaMask {
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));
    return {
      width: safeWidth,
      height: safeHeight,
      alpha: new Uint8ClampedArray(safeWidth * safeHeight).fill(255),
    };
  }

  private loadImage(uri: string): Promise<HTMLImageElement> {
    const image = new Image();
    image.src = uri;

    if (typeof image.decode === 'function') {
      return image.decode().then(() => image);
    }

    return new Promise((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load sprite image '${uri}'.`));
    });
  }

  private resolveImageSourceKey(image: RoccoSpriteImage, definitionId: string): string {
    if (image.uri) {
      return `uri:${image.uri}`;
    }
    if (image.assetId) {
      return `asset:${image.assetId}`;
    }
    if (image.dataRef) {
      return `data:${image.dataRef}`;
    }
    return `placeholder:${definitionId}:${image.id}`;
  }

  private clearVisualCachesForDefinition(definitionId: string): void {
    this.autoAdjustReferenceHeightCache.delete(definitionId);
    const prefix = `${definitionId}:`;
    for (const key of this.visibleBoundsCache.keys()) {
      if (key.startsWith(prefix)) {
        this.visibleBoundsCache.delete(key);
      }
    }
  }

  private resolveVisualAdjustment(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    frame: RoccoSpriteFrame,
  ): RoccoSpriteVisualAdjustment | undefined {
    const autoAdjust = definition.autoAdjust;
    if (!autoAdjust?.enabled) {
      return undefined;
    }

    const mode = autoAdjust.mode ?? 'match-visible-height';
    if (mode !== 'match-visible-height') {
      return undefined;
    }

    const bounds = this.resolveFrameVisibleBounds(definition, frame);
    const referenceHeight = this.resolveAutoAdjustReferenceHeight(definition);
    if (!bounds || !referenceHeight || bounds.height <= 0) {
      return undefined;
    }

    const scale = referenceHeight / bounds.height;
    if (!Number.isFinite(scale) || scale <= 0 || Math.abs(scale - 1) < EPSILON) {
      return undefined;
    }

    const groundAnchor = this.resolveGroundAnchor(definition, instance.navigation);
    return {
      scaleX: scale,
      scaleY: scale,
      offsetX: groundAnchor.x * (1 - scale),
      offsetY: groundAnchor.y * (1 - scale),
    };
  }

  private resolveAutoAdjustReferenceHeight(definition: RoccoSpriteDefinition): number | undefined {
    if (this.autoAdjustReferenceHeightCache.has(definition.id)) {
      return this.autoAdjustReferenceHeightCache.get(definition.id) ?? undefined;
    }

    let referenceHeight = 0;
    for (const frame of definition.frames) {
      const bounds = this.resolveFrameVisibleBounds(definition, frame);
      if (bounds) {
        referenceHeight = Math.max(referenceHeight, bounds.height);
      }
    }

    const resolved = referenceHeight > 0 ? referenceHeight : null;
    this.autoAdjustReferenceHeightCache.set(definition.id, resolved);
    return resolved ?? undefined;
  }

  private resolveFrameVisibleBounds(
    definition: RoccoSpriteDefinition,
    frame: RoccoSpriteFrame,
  ): SpriteVisibleBounds | undefined {
    const image = definition.images.find((item) => item.id === frame.imageId);
    if (!image) {
      return undefined;
    }

    const imageKey = this.resolveImageSourceKey(image, definition.id);
    const mask = this.alphaMasks.get(imageKey);
    if (!mask) {
      return undefined;
    }

    const frameRect = this.resolveFrameRect(frame, image, mask);
    const cacheKey = `${definition.id}:${frame.id}:${imageKey}:${frameRect.x}:${frameRect.y}:${frameRect.width}:${frameRect.height}`;
    if (this.visibleBoundsCache.has(cacheKey)) {
      return this.visibleBoundsCache.get(cacheKey) ?? undefined;
    }

    const bounds = this.calculateVisibleBounds(mask, frameRect);
    this.visibleBoundsCache.set(cacheKey, bounds ?? null);
    return bounds;
  }

  private calculateVisibleBounds(mask: SpriteAlphaMask, frameRect: RoccoRect): SpriteVisibleBounds | undefined {
    const startX = clamp(Math.floor(frameRect.x), 0, mask.width - 1);
    const startY = clamp(Math.floor(frameRect.y), 0, mask.height - 1);
    const endX = clamp(Math.ceil(frameRect.x + frameRect.width), 0, mask.width);
    const endY = clamp(Math.ceil(frameRect.y + frameRect.height), 0, mask.height);
    let minX = endX;
    let minY = endY;
    let maxX = startX - 1;
    let maxY = startY - 1;

    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        if ((mask.alpha[y * mask.width + x] ?? 0) <= 0) {
          continue;
        }

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX < minX || maxY < minY) {
      return undefined;
    }

    return {
      x: minX - frameRect.x,
      y: minY - frameRect.y,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  private resolveVisibleDescription(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
  ): RoccoSpriteVisibleDescription | undefined {
    const description = { ...definition.visibleDescription, ...instance.visibleDescription };
    if (description.enabled === false || !description.text) {
      return undefined;
    }

    return {
      enabled: true,
      text: description.text,
      textKey: description.textKey,
    };
  }

  private isPointOnVisibleSpritePixel(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    frame: RoccoSpriteFrame,
    point: RoccoPoint,
  ): boolean {
    const image = definition.images.find((item) => item.id === frame.imageId);
    if (!image) {
      return false;
    }

    const mask = this.alphaMasks.get(this.resolveImageSourceKey(image, definition.id));
    if (!mask) {
      return false;
    }

    const frameRect = this.resolveFrameRect(frame, image, mask);
    const visualAdjustment = this.resolveVisualAdjustment(instance, definition, frame);
    const localPoint = this.toSpriteLocalPoint(instance, definition, frame, frameRect, point, visualAdjustment);
    if (!localPoint) {
      return false;
    }

    const sourceX = Math.floor(frameRect.x + localPoint.x);
    const sourceY = Math.floor(frameRect.y + localPoint.y);
    if (sourceX < 0 || sourceY < 0 || sourceX >= mask.width || sourceY >= mask.height) {
      return false;
    }

    return (mask.alpha[sourceY * mask.width + sourceX] ?? 0) > 0;
  }

  private resolveFrameRect(frame: RoccoSpriteFrame, image: RoccoSpriteImage, mask: SpriteAlphaMask): RoccoRect {
    return (
      frame.rect ?? {
        x: 0,
        y: 0,
        width: image.width ?? mask.width,
        height: image.height ?? mask.height,
      }
    );
  }

  private toSpriteLocalPoint(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    frame: RoccoSpriteFrame,
    frameRect: RoccoRect,
    point: RoccoPoint,
    visualAdjustment?: RoccoSpriteVisualAdjustment,
  ): RoccoPoint | undefined {
    const presentationScale = resolvePresentationScale(instance.transform.presentation);
    const scaleX = (instance.transform.scaleX || 1) * presentationScale.x * (instance.transform.flipX ? -1 : 1);
    const scaleY = (instance.transform.scaleY || 1) * presentationScale.y * (instance.transform.flipY ? -1 : 1);
    if (Math.abs(scaleX) < EPSILON || Math.abs(scaleY) < EPSILON) {
      return undefined;
    }

    const rotation = -(instance.transform.rotation ?? 0);
    const dx = point.x - instance.transform.x;
    const dy = point.y - instance.transform.y;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const localX = ((dx * cos - dy * sin) / scaleX) + (frame.pivot ?? definition.pivot ?? { x: 0, y: 0 }).x;
    const localY = ((dx * sin + dy * cos) / scaleY) + (frame.pivot ?? definition.pivot ?? { x: 0, y: 0 }).y;
    const adjustedScaleX = visualAdjustment?.scaleX ?? 1;
    const adjustedScaleY = visualAdjustment?.scaleY ?? 1;
    if (Math.abs(adjustedScaleX) < EPSILON || Math.abs(adjustedScaleY) < EPSILON) {
      return undefined;
    }

    const adjustedLocalX = (localX - (visualAdjustment?.offsetX ?? 0)) / adjustedScaleX;
    const adjustedLocalY = (localY - (visualAdjustment?.offsetY ?? 0)) / adjustedScaleY;
    const anchor = definition.anchor ?? { x: 0, y: 0 };
    const imageX = adjustedLocalX + anchor.x * frameRect.width;
    const imageY = adjustedLocalY + anchor.y * frameRect.height;

    if (imageX < 0 || imageY < 0 || imageX >= frameRect.width || imageY >= frameRect.height) {
      return undefined;
    }

    return { x: imageX, y: imageY };
  }

  private constrainInstanceToWalkMap(instance: RoccoSpriteInstance): { instance: RoccoSpriteInstance; blocked: boolean } {
    const constrained = this.constrainOriginToWalkMap(instance, instance.transform.x, instance.transform.y);
    instance.transform.x = constrained.x;
    instance.transform.y = constrained.y;
    return { instance, blocked: constrained.blocked };
  }

  private resolveGoToGroundTarget(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    requestedGround: RoccoPoint,
    options?: RoccoSpriteGoToOptions,
  ): RoccoPoint {
    let approachGround = requestedGround;
    if (options?.targetInstanceId && options.targetInstanceId !== instance.id) {
      approachGround = this.resolveSpriteApproachGroundPoint(instance, definition, requestedGround, options);
    }

    return this.projectGroundPointToWalkMap(instance, approachGround);
  }

  private resolveGoToMoveOptions(options?: RoccoSpriteGoToOptions): RoccoSpriteGoToOptions | undefined {
    if (!options?.targetInstanceId) {
      return options;
    }

    return {
      ...options,
      faceTargetOnComplete: options.faceTargetOnComplete ?? true,
    };
  }

  private resolveCompletionTargetFacing(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    options?: RoccoMoveOptions,
  ): RoccoFacingDirection | undefined {
    const goToOptions = isGoToOptions(options) ? options : undefined;
    if (!goToOptions?.targetInstanceId || goToOptions.faceTargetOnComplete === false) {
      return undefined;
    }

    const target = this.instances.get(goToOptions.targetInstanceId);
    if (!target || target.id === instance.id) {
      return undefined;
    }

    const targetDefinition = this.requireDefinition(target.definitionId);
    const instanceGround = this.resolveInstanceGroundPoint(instance, definition);
    const targetGround = this.resolveInstanceGroundPoint(target, targetDefinition);
    let dx = targetGround.x - instanceGround.x;
    let dy = targetGround.y - instanceGround.y;

    if (this.isSpriteRenderedAbove(target, targetDefinition, instance, definition)) {
      const bias = goToOptions.foregroundFacingBias ?? DEFAULT_FOREGROUND_FACING_BIAS;
      const biasPixels = Math.max(MIN_FOREGROUND_FACING_BIAS_PIXELS, Math.abs(dx) * bias);
      dy = Math.max(dy + biasPixels, biasPixels);
    }

    return toFacingDirection(dx, dy);
  }

  private resolveSpriteApproachGroundPoint(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    requestedGround: RoccoPoint,
    options: RoccoSpriteGoToOptions,
  ): RoccoPoint {
    if (!options.targetInstanceId) {
      return requestedGround;
    }

    const target = this.instances.get(options.targetInstanceId);
    if (!target) {
      return requestedGround;
    }

    const targetDefinition = this.requireDefinition(target.definitionId);
    const targetGround = this.resolveInstanceGroundPoint(target, targetDefinition);
    const currentGround = this.resolveInstanceGroundPoint(instance, definition);
    let dx = currentGround.x - targetGround.x;
    let dy = currentGround.y - targetGround.y;
    let distance = Math.hypot(dx, dy);

    if (distance < EPSILON) {
      dx = requestedGround.x - targetGround.x;
      dy = requestedGround.y - targetGround.y;
      distance = Math.hypot(dx, dy);
    }

    if (distance < EPSILON) {
      dx = -1;
      dy = 0;
      distance = 1;
    }

    const keepDistance = options.keepDistance ?? this.resolveDefaultApproachDistance(instance, definition);
    return {
      x: targetGround.x + (dx / distance) * keepDistance,
      y: targetGround.y + (dy / distance) * keepDistance,
    };
  }

  private projectGroundPointToWalkMap(instance: RoccoSpriteInstance, groundPoint: RoccoPoint): RoccoPoint {
    const navigation = instance.navigation;
    if (!navigation?.walkMapId || navigation.constrainMovement === false) {
      return groundPoint;
    }

    const walkMap = this.walkMaps.get(navigation.walkMapId);
    if (!walkMap) {
      return groundPoint;
    }

    const resolved = this.resolveWalkMapPoint(walkMap, groundPoint.x, groundPoint.y);
    if (!resolved) {
      return groundPoint;
    }

    return {
      x: resolved.x,
      y: navigation.followSurface === false ? groundPoint.y : resolved.y,
    };
  }

  private resolveInstanceGroundPoint(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
  ): RoccoPoint {
    const groundAnchor = this.resolveGroundAnchor(definition, instance.navigation);
    const scaleX = instance.transform.scaleX || 1;
    const scaleY = instance.transform.scaleY || 1;
    return {
      x: instance.transform.x + groundAnchor.x * scaleX,
      y: instance.transform.y + groundAnchor.y * scaleY,
    };
  }

  private toOriginFromGroundPoint(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    groundPoint: RoccoPoint,
  ): RoccoPoint {
    const groundAnchor = this.resolveGroundAnchor(definition, instance.navigation);
    const scaleX = instance.transform.scaleX || 1;
    const scaleY = instance.transform.scaleY || 1;
    return {
      x: groundPoint.x - groundAnchor.x * scaleX,
      y: groundPoint.y - groundAnchor.y * scaleY,
    };
  }

  private resolveDefaultApproachDistance(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
  ): number {
    const frame = this.resolveActiveFrame(definition, instance);
    const image = definition.images.find((item) => item.id === frame.imageId);
    const logicalWidth = frame.rect?.width ?? image?.width ?? definition.bounds?.width ?? 64;
    return Math.max(24, Math.abs(logicalWidth * (instance.transform.scaleX || 1)));
  }

  private isSpriteRenderedAbove(
    target: RoccoSpriteInstance,
    targetDefinition: RoccoSpriteDefinition,
    subject: RoccoSpriteInstance,
    subjectDefinition: RoccoSpriteDefinition,
  ): boolean {
    const targetLayerOrder = DEFAULT_RENDER_LAYER_ORDER.get(target.renderLayer);
    const subjectLayerOrder = DEFAULT_RENDER_LAYER_ORDER.get(subject.renderLayer);
    if (
      targetLayerOrder !== undefined &&
      subjectLayerOrder !== undefined &&
      targetLayerOrder !== subjectLayerOrder
    ) {
      return targetLayerOrder > subjectLayerOrder;
    }

    const targetDepth = this.resolveDepth(target, targetDefinition);
    const subjectDepth = this.resolveDepth(subject, subjectDefinition);
    if (Math.abs(targetDepth - subjectDepth) > EPSILON) {
      return targetDepth > subjectDepth;
    }

    return target.zIndex > subject.zIndex;
  }

  private constrainOriginToWalkMap(
    instance: RoccoSpriteInstance,
    nextX: number,
    nextY: number,
  ): WalkMapConstraintResult {
    const navigation = instance.navigation;
    if (!navigation?.walkMapId || navigation.constrainMovement === false) {
      return { x: nextX, y: nextY, blocked: false };
    }

    const walkMap = this.walkMaps.get(navigation.walkMapId);
    if (!walkMap) {
      return { x: nextX, y: nextY, blocked: false };
    }

    const definition = this.requireDefinition(instance.definitionId);
    const groundAnchor = this.resolveGroundAnchor(definition, navigation);
    const scaleX = instance.transform.scaleX || 1;
    const scaleY = instance.transform.scaleY || 1;
    const groundX = nextX + groundAnchor.x * scaleX;
    const groundY = nextY + groundAnchor.y * scaleY;
    const resolved = this.resolveWalkMapPoint(walkMap, groundX, groundY);
    if (!resolved) {
      return {
        x: instance.transform.x,
        y: instance.transform.y,
        blocked: true,
      };
    }

    const followSurface = navigation.followSurface !== false;
    const nextGroundX = resolved.x;
    const nextGroundY = followSurface ? resolved.y : groundY;
    return {
      x: nextGroundX - groundAnchor.x * scaleX,
      y: nextGroundY - groundAnchor.y * scaleY,
      blocked: resolved.blocked,
    };
  }

  private resolveGroundAnchor(
    definition: RoccoSpriteDefinition,
    navigation?: RoccoSpriteNavigationBinding,
  ): RoccoPoint {
    return navigation?.groundAnchor ?? definition.groundAnchor ?? { x: 0, y: definition.baseline ?? 0 };
  }

  private resolveWalkMapPoint(
    walkMap: RoccoSpriteWalkMap,
    worldX: number,
    worldY: number,
  ): { x: number; y: number; blocked: boolean } | undefined {
    const localX = Math.round(worldX - walkMap.origin.x);
    const localY = worldY - walkMap.origin.y;
    const column = this.resolveWalkMapColumn(walkMap, localX);
    if (!column) {
      return undefined;
    }

    const span = this.resolveNearestSpan(column, localY);
    if (!span) {
      return undefined;
    }

    const clampedY = clamp(localY, span.yMin, span.yMax);
    return {
      x: walkMap.origin.x + column.x,
      y: walkMap.origin.y + clampedY,
      blocked: column.x !== localX,
    };
  }

  private resolveWalkMapColumn(
    walkMap: RoccoSpriteWalkMap,
    localX: number,
  ): RoccoSpriteWalkMapColumn | undefined {
    const columnIndex = this.walkMapColumnIndexes.get(walkMap.id);
    if (!columnIndex || walkMap.columns.length === 0) {
      return undefined;
    }

    const clampedX = clamp(localX, 0, walkMap.width - 1);
    const exact = columnIndex.get(clampedX);
    if (exact) {
      return exact;
    }

    let nearest: RoccoSpriteWalkMapColumn | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const column of walkMap.columns) {
      const distance = Math.abs(column.x - clampedX);
      if (distance < nearestDistance) {
        nearest = column;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  private resolveNearestSpan(
    column: RoccoSpriteWalkMapColumn,
    localY: number,
  ): { yMin: number; yMax: number } | undefined {
    let nearest = column.spans[0];
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const span of column.spans) {
      if (localY >= span.yMin && localY <= span.yMax) {
        return span;
      }

      const distance = Math.min(Math.abs(localY - span.yMin), Math.abs(localY - span.yMax));
      if (distance < nearestDistance) {
        nearest = span;
        nearestDistance = distance;
      }
    }
    return nearest;
  }
}
