import { compareRenderableSpritesBackToFront } from './depth';
import {
  normalizeGoToCompletionOptions,
  resolveGoToCompletionFacing,
} from './go-to-completion-policy';
import { RoccoSpriteStore } from './store';
import { createRoccoSpriteCollisionHelper } from './collision-helpers';
import { RoccoSpriteMotionAnimationDriver } from './motion-animation-driver';
import {
  createRoccoSpriteVisualHelper,
  type SpriteAlphaMask,
  type SpriteVisibleBounds,
} from './visual-helpers';
import { buildWalkMapGroundPath, resolveWalkMapPoint } from './walk-map-navigation';
import type {
  RoccoAnimationClip,
  RoccoAnimationMotionBinding,
  RoccoCollisionHit,
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
  RoccoSpriteInstance,
  RoccoSpritePresentationTransform,
  RoccoSpriteSystem,
  RoccoSpriteVisualAdjustment,
  RoccoSpriteWalkMap,
  RoccoSpriteWalkMapColumn,
  RoccoSpriteNavigationBinding,
  RoccoSpritePlacementOptions,
  RoccoSpriteAutoAdjustPerspectiveByY,
  RoccoSpriteAutoAdjustPerspectiveRegion,
  RoccoSpriteVisibleDescription,
  RoccoSpriteVisiblePixelHit,
} from './types';

const EPSILON = 0.0001;
const DEFAULT_EXPONENTIAL_SCALE_CURVE_STRENGTH = 4;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isPointInRect(point: RoccoPoint, rect: RoccoRect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function normalizeExponentialInterpolation(value: number): number {
  const clampedValue = clamp(value, 0, 1);
  const denominator = Math.exp(DEFAULT_EXPONENTIAL_SCALE_CURVE_STRENGTH) - 1;
  if (Math.abs(denominator) < EPSILON) {
    return clampedValue;
  }

  return (
    (Math.exp(DEFAULT_EXPONENTIAL_SCALE_CURVE_STRENGTH * clampedValue) - 1) / denominator
  );
}

interface WalkMapConstraintResult {
  x: number;
  y: number;
  blocked: boolean;
}

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
  private readonly visibleBoundsCache = new Map<string, SpriteVisibleBounds | undefined>();
  private readonly autoAdjustReferenceHeightCache = new Map<string, number | undefined>();
  private readonly visualHelper = createRoccoSpriteVisualHelper({
    alphaMasks: this.alphaMasks,
    pendingAlphaMaskLoads: this.pendingAlphaMaskLoads,
    visibleBoundsCache: this.visibleBoundsCache,
    autoAdjustReferenceHeightCache: this.autoAdjustReferenceHeightCache,
  });
  private readonly collisionHelper = createRoccoSpriteCollisionHelper({
    resolveVisualAdjustment: (instance, definition, frame) =>
      this.resolveVisualAdjustment(instance, definition, frame),
  });
  private readonly motionAnimationDriver = new RoccoSpriteMotionAnimationDriver({
    requireDefinition: (definitionId) => this.requireDefinition(definitionId),
    assertAnimationExists: (definition, animationId) =>
      this.assertAnimationExists(definition, animationId),
    assertActionExists: (definition, actionId) => this.assertActionExists(definition, actionId),
    constrainOriginToWalkMap: (instance, nextX, nextY, options) =>
      this.constrainOriginToWalkMap(instance, nextX, nextY, options),
    resolvePerspectiveAutoAdjustMotionScale: (instance, definition) =>
      this.resolvePerspectiveAutoAdjustMotionScale(instance, definition),
    resolveCompletionTargetFacing: (instance, definition, options) =>
      resolveGoToCompletionFacing({
        instance,
        definition,
        options,
        resolveTargetInstance: (targetInstanceId) => this.instances.get(targetInstanceId),
        requireDefinition: (definitionId) => this.requireDefinition(definitionId),
        resolveGroundPoint: (subjectInstance, subjectDefinition) =>
          this.resolveInstanceGroundPoint(subjectInstance, subjectDefinition),
        resolveActiveFrame: (subjectDefinition, subjectInstance) =>
          this.resolveActiveFrame(subjectDefinition, subjectInstance),
      }),
  });

  private resolveActiveFrame(
    definition: RoccoSpriteDefinition,
    instance: RoccoSpriteInstance,
  ): RoccoSpriteFrame {
    const clip = this.assertAnimationExists(definition, instance.animation.animationId);
    const safeIndex = clamp(instance.animation.frameIndex, 0, clip.frames.length - 1);
    const frameId = clip.frames[safeIndex]?.frameId;
    const frame = definition.frames.find((item) => item.id === frameId) ?? definition.frames[0];
    if (!frame) {
      throw new Error(`Sprite definition '${definition.id}' has no frames.`);
    }
    return frame;
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

  private resolveVisualAdjustment(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    frame: RoccoSpriteFrame,
  ): RoccoSpriteVisualAdjustment | undefined {
    const autoAdjust = definition.autoAdjust;
    if (!autoAdjust?.enabled) {
      return undefined;
    }

    let scaleX = 1;
    let scaleY = 1;
    let isChanged = false;

    const mode = autoAdjust.mode ?? 'match-visible-height';
    if (mode === 'match-visible-height') {
      const bounds = this.visualHelper.resolveFrameVisibleBounds(definition, frame);
      const referenceHeight = this.visualHelper.resolveAutoAdjustReferenceHeight(definition);
      if (bounds && referenceHeight && bounds.height > 0) {
        const scale = referenceHeight / bounds.height;
        if (Number.isFinite(scale) && scale > 0 && Math.abs(scale - 1) >= EPSILON) {
          scaleX *= scale;
          scaleY *= scale;
          isChanged = true;
        }
      }
    }

    const perspectiveScale = this.resolvePerspectiveAutoAdjustScale(
      instance,
      definition,
      autoAdjust.perspectiveByY,
    );
    if (perspectiveScale !== undefined && Math.abs(perspectiveScale - 1) >= EPSILON) {
      scaleX *= perspectiveScale;
      scaleY *= perspectiveScale;
      isChanged = true;
    }

    if (!isChanged) {
      return undefined;
    }

    const groundAnchor = this.resolveGroundAnchor(definition, instance.navigation);
    return {
      scaleX,
      scaleY,
      offsetX: groundAnchor.x * (1 - scaleX),
      offsetY: groundAnchor.y * (1 - scaleY),
    };
  }

  private resolvePerspectiveAutoAdjustScale(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    perspectiveByY?: RoccoSpriteAutoAdjustPerspectiveByY,
  ): number | undefined {
    if (!perspectiveByY) {
      return undefined;
    }

    const resolvedPerspectiveByY = this.resolvePerspectiveAutoAdjustConfig(
      instance,
      definition,
      perspectiveByY,
    );
    if (!resolvedPerspectiveByY) {
      return undefined;
    }

    const nearY = resolvedPerspectiveByY.nearY;
    const farY = resolvedPerspectiveByY.farY;
    const nearScale = resolvedPerspectiveByY.nearScale;
    const farScale = resolvedPerspectiveByY.farScale;
    if (
      !Number.isFinite(nearY) ||
      !Number.isFinite(farY) ||
      !Number.isFinite(nearScale) ||
      !Number.isFinite(farScale) ||
      nearScale <= 0 ||
      farScale <= 0
    ) {
      return undefined;
    }

    if (Math.abs(nearY - farY) < EPSILON) {
      return nearScale;
    }

    const groundPoint = this.resolveInstanceGroundPoint(instance, definition);
    const interpolation = clamp((groundPoint.y - farY) / (nearY - farY), 0, 1);
    const scaleCurve = this.resolvePerspectiveAutoAdjustScaleCurve(resolvedPerspectiveByY);
    if (scaleCurve === 'logarithmic') {
      return Math.exp(Math.log(farScale) + (Math.log(nearScale) - Math.log(farScale)) * interpolation);
    }

    if (scaleCurve === 'exponential') {
      return farScale + (nearScale - farScale) * normalizeExponentialInterpolation(interpolation);
    }

    return farScale + (nearScale - farScale) * interpolation;
  }

  private resolvePerspectiveAutoAdjustMotionScale(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
  ): { x: number; y: number } | undefined {
    const perspectiveByY = this.resolvePerspectiveAutoAdjustConfig(
      instance,
      definition,
      definition.autoAdjust?.perspectiveByY,
    );
    if (!definition.autoAdjust?.enabled || !perspectiveByY?.speedScale) {
      return undefined;
    }

    const scale = this.resolvePerspectiveAutoAdjustScale(instance, definition, perspectiveByY);
    if (scale === undefined) {
      return undefined;
    }

    switch (perspectiveByY.speedScaleMode) {
      case 'horizontal-only': {
        return { x: scale, y: 1 };
      }
      case 'vertical-only': {
        return { x: 1, y: scale };
      }
      default: {
        return { x: scale, y: scale };
      }
    }
  }

  private projectGroundPointToWalkMap(
    instance: RoccoSpriteInstance,
    groundPoint: RoccoPoint,
    options?: Pick<RoccoMoveOptions, 'constrainToWalkMap'>,
  ): RoccoPoint {
    const navigation = instance.navigation;
    if (!this.shouldConstrainOriginToWalkMap(instance, options)) {
      return groundPoint;
    }

    if (!navigation?.walkMapId) {
      return groundPoint;
    }

    const walkMap = this.walkMaps.get(navigation.walkMapId);
    if (!walkMap) {
      return groundPoint;
    }

    const resolved = resolveWalkMapPoint(
      walkMap,
      this.walkMapColumnIndexes.get(walkMap.id),
      groundPoint.x,
      groundPoint.y,
    );
    if (!resolved) {
      return groundPoint;
    }

    return {
      x: resolved.x,
      y: (navigation.followSurface === false ? groundPoint : resolved).y,
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

  private constrainOriginToWalkMap(
    instance: RoccoSpriteInstance,
    nextX: number,
    nextY: number,
    options?: Pick<RoccoMoveOptions, 'constrainToWalkMap'>,
  ): WalkMapConstraintResult {
    const navigation = instance.navigation;
    if (!this.shouldConstrainOriginToWalkMap(instance, options)) {
      return { x: nextX, y: nextY, blocked: false };
    }

    if (!navigation?.walkMapId) {
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
    const resolved = resolveWalkMapPoint(
      walkMap,
      this.walkMapColumnIndexes.get(walkMap.id),
      groundX,
      groundY,
    );
    if (!resolved) {
      return {
        x: instance.transform.x,
        y: instance.transform.y,
        blocked: true,
      };
    }

    const isFollowSurface = navigation.followSurface !== false;
    const nextGroundX = resolved.x;
    const nextGroundY = isFollowSurface ? resolved.y : groundY;
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

  private shouldConstrainOriginToWalkMap(
    instance: RoccoSpriteInstance,
    options?: Pick<RoccoMoveOptions, 'constrainToWalkMap'>,
  ): boolean {
    if (options?.constrainToWalkMap === false) {
      return false;
    }

    return Boolean(instance.navigation?.walkMapId) && instance.navigation?.constrainMovement !== false;
  }

  private resolvePerspectiveAutoAdjustConfig(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    perspectiveByY?: RoccoSpriteAutoAdjustPerspectiveByY,
  ): RoccoSpriteAutoAdjustPerspectiveByY | undefined {
    if (!perspectiveByY) {
      return undefined;
    }

    const groundPoint = this.resolveInstanceGroundPoint(instance, definition);
    const matchingRegion = perspectiveByY.regions?.find((candidate) =>
      isPointInRect(groundPoint, candidate.region),
    );
    if (matchingRegion) {
      return this.mergePerspectiveAutoAdjustRegion(perspectiveByY, matchingRegion);
    }

    if (perspectiveByY.activeRegion && !isPointInRect(groundPoint, perspectiveByY.activeRegion)) {
      return undefined;
    }

    return perspectiveByY;
  }

  private mergePerspectiveAutoAdjustRegion(
    base: RoccoSpriteAutoAdjustPerspectiveByY,
    region: RoccoSpriteAutoAdjustPerspectiveRegion,
  ): RoccoSpriteAutoAdjustPerspectiveByY {
    return {
      ...base,
      nearScale: region.nearScale ?? base.nearScale,
      farScale: region.farScale ?? base.farScale,
      speedScale: region.speedScale ?? base.speedScale,
      speedScaleMode: region.speedScaleMode ?? base.speedScaleMode,
      scaleCurve: region.scaleCurve ?? base.scaleCurve,
      logScale: region.logScale ?? base.logScale,
      activeRegion: region.region,
    };
  }

  private resolvePerspectiveAutoAdjustScaleCurve(
    perspectiveByY: RoccoSpriteAutoAdjustPerspectiveByY,
  ): 'linear' | 'logarithmic' | 'exponential' {
    if (perspectiveByY.scaleCurve) {
      return perspectiveByY.scaleCurve;
    }

    if (perspectiveByY.logScale) {
      return 'logarithmic';
    }

    return 'linear';
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
    const approachGround =
      options?.targetInstanceId && options.targetInstanceId !== instance.id
        ? this.resolveSpriteApproachGroundPoint(instance, definition, requestedGround, options)
        : requestedGround;

    return this.projectGroundPointToWalkMap(instance, approachGround, options);
  }

  private resolveGoToGroundPath(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    targetGround: RoccoPoint,
    options?: RoccoSpriteGoToOptions,
  ): RoccoPoint[] | null | undefined {
    const navigation = instance.navigation;
    if (!this.shouldConstrainOriginToWalkMap(instance, options)) {
      return undefined;
    }

    if (!navigation?.walkMapId) {
      return undefined;
    }

    const walkMap = this.walkMaps.get(navigation.walkMapId);
    if (!walkMap) {
      return undefined;
    }

    const currentGround = this.projectGroundPointToWalkMap(
      instance,
      this.resolveInstanceGroundPoint(instance, definition),
      options,
    );
    return buildWalkMapGroundPath(
      walkMap,
      this.walkMapColumnIndexes.get(walkMap.id),
      currentGround,
      targetGround,
    );
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
    return this.walkMaps.values().map((walkMap) => clone(walkMap)).toArray();
  }

  registerSpriteDefinition(definition: RoccoSpriteDefinition): void {
    this.store.register(definition);
    this.visualHelper.clearVisualCachesForDefinition(definition.id);
  }

  unregisterSpriteDefinition(definitionId: string): void {
    this.store.unregister(definitionId);
    this.visualHelper.clearVisualCachesForDefinition(definitionId);
  }

  getSpriteDefinition(definitionId: string): RoccoSpriteDefinition | undefined {
    return this.store.get(definitionId);
  }

  listSpriteDefinitions(): RoccoSpriteDefinition[] {
    return this.store.list();
  }

  loadSpriteDefinition(definition: RoccoSpriteDefinition): void {
    this.store.registerOrReplace(definition);
    this.visualHelper.clearVisualCachesForDefinition(definition.id);
    void this.preloadDefinitionAssets(definition);
  }

  loadSpriteDefinitions(definitions: RoccoSpriteDefinition[]): void {
    for (const definition of definitions) {
      this.store.registerOrReplace(definition);
    }
    for (const definition of definitions) {
      this.visualHelper.clearVisualCachesForDefinition(definition.id);
    }
    void Promise.all(definitions.map((definition) => this.preloadDefinitionAssets(definition)));
  }

  async preloadDefinitionAssets(definition: RoccoSpriteDefinition): Promise<void> {
    const loads = definition.images.map((image) => this.visualHelper.queueAlphaMaskLoad(image, definition.id));
    await Promise.all(loads);
    this.visualHelper.clearVisualCachesForDefinition(definition.id);
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
    return this.getSprite(created.id) ?? clone(created);
  }

  removeSprite(instanceId: string): void {
    this.instances.delete(instanceId);
  }

  getSprite(instanceId: string): RoccoSpriteInstance | undefined {
    const instance = this.instances.get(instanceId);
    return instance ? clone(instance) : undefined;
  }

  listSprites(): RoccoSpriteInstance[] {
    return this.instances.values().map((instance) => clone(instance)).toArray();
  }

  playAnimation(instanceId: string, animationId: string, options?: RoccoPlayAnimationOptions): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    this.motionAnimationDriver.playAnimation(instance, definition, animationId, options);
  }

  playAction(instanceId: string, actionId: string, options?: RoccoPlayActionOptions): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    this.motionAnimationDriver.playAction(instance, definition, actionId, options);
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

  setPosition(
    instanceId: string,
    x: number,
    y: number,
    options?: RoccoSpritePlacementOptions,
  ): void {
    const instance = this.requireInstance(instanceId);
    const constrained = this.constrainOriginToWalkMap(instance, x, y, options);
    instance.transform.x = constrained.x;
    instance.transform.y = constrained.y;
  }

  setScale(instanceId: string, scaleX: number, scaleY: number): void {
    const instance = this.requireInstance(instanceId);
    instance.transform.scaleX = Number.isFinite(scaleX) ? scaleX : instance.transform.scaleX;
    instance.transform.scaleY = Number.isFinite(scaleY) ? scaleY : instance.transform.scaleY;
  }

  setFlip(instanceId: string, isFlipX: boolean, isFlipY: boolean): void {
    const instance = this.requireInstance(instanceId);
    instance.transform.flipX = isFlipX;
    instance.transform.flipY = isFlipY;
  }

  setPresentationTransform(instanceId: string, transform: Partial<RoccoSpritePresentationTransform>): void {
    const instance = this.requireInstance(instanceId);
    instance.transform.presentation = {
      ...instance.transform.presentation,
      ...clone(transform),
    };
  }

  setVisibleDescription(
    instanceId: string,
    visibleDescription?: Partial<RoccoSpriteVisibleDescription>,
  ): void {
    const instance = this.requireInstance(instanceId);
    instance.visibleDescription = visibleDescription ? clone(visibleDescription) : undefined;
  }

  translate(
    instanceId: string,
    dx: number,
    dy: number,
    options?: RoccoSpritePlacementOptions,
  ): void {
    const instance = this.requireInstance(instanceId);
    const constrained = this.constrainOriginToWalkMap(
      instance,
      instance.transform.x + dx,
      instance.transform.y + dy,
      options,
    );
    instance.transform.x = constrained.x;
    instance.transform.y = constrained.y;
  }

  setVelocity(instanceId: string, velocityX: number, velocityY: number): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    this.motionAnimationDriver.setVelocity(instance, definition, velocityX, velocityY);
  }

  setAcceleration(instanceId: string, accelerationX: number, accelerationY: number): void {
    const instance = this.requireInstance(instanceId);
    instance.motion.accelerationX = accelerationX;
    instance.motion.accelerationY = accelerationY;
  }

  stopMovement(instanceId: string): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    this.motionAnimationDriver.stopMovement(instance, definition);
  }

  moveTo(instanceId: string, x: number, y: number, options?: RoccoMoveOptions): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    this.motionAnimationDriver.moveTo(instance, definition, x, y, options);
  }

  goTo(instanceId: string, x: number, y: number, options?: RoccoSpriteGoToOptions): boolean {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    const moveOptions = normalizeGoToCompletionOptions(options);
    const targetGround = this.resolveGoToGroundTarget(instance, definition, { x, y }, moveOptions);
    const groundPath = this.resolveGoToGroundPath(instance, definition, targetGround, moveOptions);
    if (groundPath === null) {
      this.cancelMovement(instanceId);
      return false;
    }

    if (groundPath && groundPath.length > 1) {
      this.followPath(
        instanceId,
        groundPath.map((point) => this.toOriginFromGroundPoint(instance, definition, point)),
        moveOptions,
      );
      return true;
    }

    const targetOrigin = this.toOriginFromGroundPoint(instance, definition, targetGround);
    this.moveTo(instanceId, targetOrigin.x, targetOrigin.y, moveOptions);
    return true;
  }

  moveBy(instanceId: string, dx: number, dy: number, options?: RoccoMoveOptions): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    this.motionAnimationDriver.moveBy(instance, definition, dx, dy, options);
  }

  followPath(instanceId: string, path: RoccoPoint[], options?: RoccoMoveOptions): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    this.motionAnimationDriver.followPath(instance, definition, path, options);
  }

  cancelMovement(instanceId: string): void {
    const instance = this.requireInstance(instanceId);
    const definition = this.requireDefinition(instance.definitionId);
    this.motionAnimationDriver.cancelMovement(instance, definition);
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
      this.motionAnimationDriver.playAction(instance, definition, instance.action.actionId, {
        direction: facing,
        restart: false,
      });
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

  setContrast(instanceId: string, contrast?: number): void {
    const instance = this.requireInstance(instanceId);
    instance.contrast = contrast;
  }

  setInteractive(instanceId: string, isInteractive: boolean): void {
    const instance = this.requireInstance(instanceId);
    instance.interactive = isInteractive;
  }

  setCollisionEnabled(instanceId: string, isEnabled: boolean): void {
    const instance = this.requireInstance(instanceId);
    instance.collisionEnabled = isEnabled;
  }

  bindToWalkMap(instanceId: string, binding: RoccoSpriteNavigationBinding): void {
    if (!this.walkMaps.has(binding.walkMapId)) {
      throw new Error(`Walk map '${binding.walkMapId}' was not found.`);
    }

    const instance = this.requireInstance(instanceId);
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

      if (this.collisionHelper.isPointInShape(instance, definition, frame, shape, { x, y })) {
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
    const renderables = this.listRenderableSprites().toSorted((front, back) =>
      compareRenderableSpritesBackToFront(back, front),
    );

    for (const renderable of renderables) {
      const description = this.resolveVisibleDescription(renderable.instance, renderable.definition);
      if (!description) {
        continue;
      }

      if (
        this.visualHelper.isPointOnVisibleSpritePixel(
          renderable.instance,
          renderable.definition,
          renderable.frame,
          { x, y },
          renderable.visualAdjustment,
        )
      ) {
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

  isPointOnVisiblePixel(instanceId: string, x: number, y: number): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.enabled || !instance.visible || instance.opacity <= 0) {
      return false;
    }

    const definition = this.requireDefinition(instance.definitionId);
    const frame = this.resolveActiveFrame(definition, instance);
    return this.visualHelper.isPointOnVisibleSpritePixel(
      instance,
      definition,
      frame,
      { x, y },
      this.resolveVisualAdjustment(instance, definition, frame),
    );
  }

  queryCollisions(instanceId: string): RoccoCollisionHit[] {
    const hits: RoccoCollisionHit[] = [];
    const subject = this.requireInstance(instanceId);
    if (!subject.enabled || !subject.visible || !subject.collisionEnabled) {
      return hits;
    }

    const subjectDefinition = this.requireDefinition(subject.definitionId);
    const subjectFrame = this.resolveActiveFrame(subjectDefinition, subject);
    const subjectShapes = this.collisionHelper.resolveCollisionShapes(subjectDefinition, subjectFrame);
    if (subjectShapes.length === 0) {
      return hits;
    }

    for (const other of this.instances.values()) {
      if (other.id === subject.id || !other.enabled || !other.visible || !other.collisionEnabled) {
        continue;
      }

      const otherDefinition = this.requireDefinition(other.definitionId);
      const otherFrame = this.resolveActiveFrame(otherDefinition, other);
      const otherShapes = this.collisionHelper.resolveCollisionShapes(otherDefinition, otherFrame);
      if (otherShapes.length === 0) {
        continue;
      }

      for (const shapeA of subjectShapes) {
        const collidingShape = otherShapes.find((shapeB) =>
          this.collisionHelper.intersects(
            subject,
            subjectDefinition,
            subjectFrame,
            shapeA,
            other,
            otherDefinition,
            otherFrame,
            shapeB,
          ),
        );
        if (collidingShape) {
          hits.push({
            a: subject.id,
            b: other.id,
            shapeA: clone(shapeA),
            shapeB: clone(collidingShape),
          });
        }
      }
    }

    return hits;
  }

  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    for (const instance of this.instances.values()) {
      if (!instance.enabled) {
        continue;
      }

      this.motionAnimationDriver.update(instance, deltaMs);
    }
  }

  listRenderableSprites(options?: { includeTransparent?: boolean }): RoccoRenderableSprite[] {
    const renderables: RoccoRenderableSprite[] = [];
    const isIncludeTransparent = options?.includeTransparent === true;
    for (const instance of this.instances.values()) {
      if (
        !instance.enabled ||
        !instance.visible ||
        (!isIncludeTransparent && instance.opacity <= 0)
      ) {
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

    renderables.sort((left, right) => compareRenderableSpritesBackToFront(left, right));

    return renderables;
  }
}
