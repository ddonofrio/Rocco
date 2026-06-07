export interface RoccoPoint {
  x: number;
  y: number;
}

export interface RoccoRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoccoSpriteImageAlphaMask {
  width: number;
  height: number;
  alpha: number[];
}

export interface RoccoSpriteImage {
  id: string;
  uri?: string;
  assetId?: string;
  dataRef?: string;
  width?: number;
  height?: number;
  alphaMask?: RoccoSpriteImageAlphaMask;
}

export interface RoccoRectShape {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoccoCircleShape {
  kind: 'circle';
  x: number;
  y: number;
  radius: number;
}

export interface RoccoPolygonShape {
  kind: 'polygon';
  points: RoccoPoint[];
}

export type RoccoCollisionShape =
  | RoccoRectShape
  | RoccoCircleShape
  | RoccoPolygonShape;

export interface RoccoCollisionProfile {
  layer: string;
  mask: string[];
  mode: 'none' | 'trigger' | 'solid';
}

export interface RoccoSpriteFrame {
  id: string;
  imageId: string;
  rect?: RoccoRect;
  durationMs?: number;
  pivot?: RoccoPoint;
  hitbox?: RoccoCollisionShape;
  collisionBoxes?: RoccoCollisionShape[];
}

export interface RoccoAnimationFrameRef {
  frameId: string;
  durationMs: number;
}

export interface RoccoAnimationMotionBinding {
  mode: 'time' | 'distance' | 'velocity' | 'manual';
  pixelsPerFrame?: number;
  speedReference?: number;
}

export interface RoccoAnimationClip {
  id: string;
  frames: RoccoAnimationFrameRef[];
  loop: boolean;
  playbackRate: number;
  next?: string;
  motionBinding?: RoccoAnimationMotionBinding;
}

export interface RoccoMotionProfile {
  maxSpeedX?: number;
  maxSpeedY?: number;
  accelerationX?: number;
  accelerationY?: number;
  decelerationX?: number;
  decelerationY?: number;
  units: 'pixels-per-second';
}

export interface RoccoSpriteRenderDefaults {
  renderLayer: string;
  zIndex: number;
  depthMode: RoccoDepthMode;
  opacity: number;
}

export type RoccoSpriteAutoAdjustMode = 'match-visible-height';

export interface RoccoSpriteAutoAdjust {
  enabled: boolean;
  mode?: RoccoSpriteAutoAdjustMode;
}

export interface RoccoSpriteVisualAdjustment {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

export interface RoccoSpritePresentationTransform {
  pitchDegrees?: number;
  yawDegrees?: number;
}

export interface RoccoSpriteVisibleDescription {
  enabled: boolean;
  text: string;
  textKey?: string;
}

export interface RoccoSpriteWalkMapSpan {
  yMin: number;
  yMax: number;
}

export interface RoccoSpriteWalkMapColumn {
  x: number;
  spans: RoccoSpriteWalkMapSpan[];
}

export interface RoccoSpriteWalkMap {
  id: string;
  width: number;
  height: number;
  origin: RoccoPoint;
  alphaThreshold: number;
  columns: RoccoSpriteWalkMapColumn[];
}

export interface RoccoSpriteNavigationBinding {
  walkMapId: string;
  groundAnchor?: RoccoPoint;
  constrainMovement?: boolean;
  followSurface?: boolean;
}

export interface RoccoSpriteDefinition {
  id: string;
  name?: string;
  images: RoccoSpriteImage[];
  frames: RoccoSpriteFrame[];
  animations: Record<string, RoccoAnimationClip>;
  defaultAnimation: string;
  defaultMotion?: RoccoMotionProfile;
  actions?: Record<string, RoccoSpriteActionProfile>;
  defaultMoveAction?: string;
  defaultIdleAction?: string;
  defaultFacing?: RoccoFacingDirection;
  pivot?: RoccoPoint;
  anchor?: RoccoPoint;
  groundAnchor?: RoccoPoint;
  baseline?: number;
  bounds?: RoccoRect;
  hitbox?: RoccoCollisionShape;
  collisionBoxes?: RoccoCollisionShape[];
  collisionProfile?: RoccoCollisionProfile;
  render?: RoccoSpriteRenderDefaults;
  autoAdjust?: Partial<RoccoSpriteAutoAdjust>;
  navigation?: Partial<RoccoSpriteNavigationBinding>;
  visibleDescription?: Partial<RoccoSpriteVisibleDescription>;
  metadata?: Record<string, unknown>;
}

export interface RoccoMoveOptions {
  speed?: number;
  acceleration?: number;
  deceleration?: number;
  stopDistance?: number;
  action?: string;
  idleAction?: string;
  idleSettleDelayMs?: number;
  idleSettleFacing?: 'down-diagonal-from-side' | 'diagonal-from-facing';
  onCompleteAction?: string;
  animation?: string;
  facingMode?: 'none' | 'velocity' | 'target';
  onComplete?: string;
}

export interface RoccoSpriteGoToOptions extends RoccoMoveOptions {
  targetInstanceId?: string;
  keepDistance?: number;
  faceTargetOnComplete?: boolean;
  foregroundFacingBias?: number;
}

export type RoccoFacingDirection =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'up-left'
  | 'up-right'
  | 'down-left'
  | 'down-right';

export const ROCCO_SPRITE_DIRECTIONS: readonly RoccoFacingDirection[] = [
  'right',
  'down-right',
  'down',
  'down-left',
  'left',
  'up-left',
  'up',
  'up-right',
];

export type RoccoDepthMode = 'fixed' | 'y-sort' | 'baseline-sort' | 'manual';

export type RoccoSpriteDirectionalAnimations = Partial<Record<RoccoFacingDirection, string>> & {
  default?: string;
};

export interface RoccoSpriteActionProfile {
  id: string;
  animationId?: string;
  directionalAnimations?: RoccoSpriteDirectionalAnimations;
  speed?: number;
  playbackRate?: number;
  motionBinding?: RoccoAnimationMotionBinding;
}

export type RoccoSpriteMotionCommand =
  | {
      kind: 'move-to';
      target: RoccoPoint;
      options?: RoccoMoveOptions;
    }
  | {
      kind: 'move-by';
      delta: RoccoPoint;
      options?: RoccoMoveOptions;
    }
  | {
      kind: 'follow-path';
      path: RoccoPoint[];
      currentIndex: number;
      options?: RoccoMoveOptions;
    };

export interface RoccoSpriteTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation?: number;
  flipX?: boolean;
  flipY?: boolean;
  presentation?: RoccoSpritePresentationTransform;
}

export interface RoccoSpriteAnimationState {
  animationId: string;
  frameIndex: number;
  elapsedMs: number;
  playing: boolean;
  playbackRate: number;
  motionBinding?: RoccoAnimationMotionBinding;
}

export interface RoccoSpriteActionState {
  actionId: string;
  direction: RoccoFacingDirection;
}

export interface RoccoSpriteMotionState {
  velocityX: number;
  velocityY: number;
  accelerationX: number;
  accelerationY: number;
  maxSpeed?: number;
  command?: RoccoSpriteMotionCommand;
  idleSettle?: RoccoSpriteIdleSettleState;
  distanceAccumulator: number;
}

export interface RoccoSpriteIdleSettleState {
  elapsedMs: number;
  delayMs: number;
  actionId: string;
  direction: RoccoFacingDirection;
}

export interface RoccoSpriteInstance {
  id: string;
  definitionId: string;
  transform: RoccoSpriteTransform;
  motion: RoccoSpriteMotionState;
  animation: RoccoSpriteAnimationState;
  action?: RoccoSpriteActionState;
  facing?: RoccoFacingDirection;
  visible: boolean;
  enabled: boolean;
  interactive: boolean;
  collisionEnabled: boolean;
  renderLayer: string;
  zIndex: number;
  depth?: number;
  depthMode?: RoccoDepthMode;
  opacity: number;
  tint?: string;
  navigation?: RoccoSpriteNavigationBinding;
  visibleDescription?: Partial<RoccoSpriteVisibleDescription>;
  state?: Record<string, unknown>;
}

export interface RoccoPlayAnimationOptions {
  restart?: boolean;
  playbackRate?: number;
}

export interface RoccoPlayActionOptions {
  direction?: RoccoFacingDirection;
  restart?: boolean;
  playbackRate?: number;
}

export interface RoccoSpriteHit {
  instanceId: string;
  definitionId: string;
  shape: RoccoCollisionShape;
}

export interface RoccoSpriteVisiblePixelHit {
  instanceId: string;
  definitionId: string;
  text: string;
  textKey?: string;
}

export interface RoccoCollisionHit {
  a: string;
  b: string;
  shapeA?: RoccoCollisionShape;
  shapeB?: RoccoCollisionShape;
}

export interface RoccoSpriteSystem {
  registerWalkMap(walkMap: RoccoSpriteWalkMap): void;
  unregisterWalkMap(walkMapId: string): void;
  getWalkMap(walkMapId: string): RoccoSpriteWalkMap | undefined;
  listWalkMaps(): RoccoSpriteWalkMap[];

  registerSpriteDefinition(definition: RoccoSpriteDefinition): void;
  unregisterSpriteDefinition(definitionId: string): void;
  getSpriteDefinition(definitionId: string): RoccoSpriteDefinition | undefined;
  listSpriteDefinitions(): RoccoSpriteDefinition[];

  loadSpriteDefinition(definition: RoccoSpriteDefinition): void;
  loadSpriteDefinitions(definitions: RoccoSpriteDefinition[]): void;

  createSprite(instance: RoccoSpriteInstance): void;
  createSpriteFromDefinition(
    definitionId: string,
    options?: Partial<RoccoSpriteInstance>,
  ): RoccoSpriteInstance;
  removeSprite(instanceId: string): void;
  getSprite(instanceId: string): RoccoSpriteInstance | undefined;
  listSprites(): RoccoSpriteInstance[];

  playAnimation(instanceId: string, animationId: string, options?: RoccoPlayAnimationOptions): void;
  playAction(instanceId: string, actionId: string, options?: RoccoPlayActionOptions): void;
  stopAnimation(instanceId: string): void;
  setAnimationFrame(instanceId: string, frameIndex: number): void;
  setPlaybackRate(instanceId: string, playbackRate: number): void;
  bindAnimationToMotion(instanceId: string, binding: RoccoAnimationMotionBinding): void;

  setPosition(instanceId: string, x: number, y: number): void;
  setScale(instanceId: string, scaleX: number, scaleY: number): void;
  setFlip(instanceId: string, flipX: boolean, flipY: boolean): void;
  setPresentationTransform(instanceId: string, transform: Partial<RoccoSpritePresentationTransform>): void;
  translate(instanceId: string, dx: number, dy: number): void;
  setVelocity(instanceId: string, velocityX: number, velocityY: number): void;
  setAcceleration(instanceId: string, accelerationX: number, accelerationY: number): void;
  stopMovement(instanceId: string): void;

  moveTo(instanceId: string, x: number, y: number, options?: RoccoMoveOptions): void;
  goTo(instanceId: string, x: number, y: number, options?: RoccoSpriteGoToOptions): void;
  moveBy(instanceId: string, dx: number, dy: number, options?: RoccoMoveOptions): void;
  followPath(instanceId: string, path: RoccoPoint[], options?: RoccoMoveOptions): void;
  cancelMovement(instanceId: string): void;
  isMoving(instanceId: string): boolean;

  setFacing(instanceId: string, facing: RoccoFacingDirection): void;
  setRenderLayer(instanceId: string, renderLayer: string): void;
  setZIndex(instanceId: string, zIndex: number): void;
  setDepthMode(instanceId: string, depthMode: RoccoDepthMode): void;
  setInteractive(instanceId: string, interactive: boolean): void;
  setCollisionEnabled(instanceId: string, enabled: boolean): void;
  bindToWalkMap(instanceId: string, binding: RoccoSpriteNavigationBinding): void;
  clearWalkMapBinding(instanceId: string): void;

  hitTest(x: number, y: number): RoccoSpriteHit[];
  hitTestVisiblePixel(x: number, y: number): RoccoSpriteVisiblePixelHit[];
  queryCollisions(instanceId: string): RoccoCollisionHit[];

  update(deltaMs: number): void;
}
