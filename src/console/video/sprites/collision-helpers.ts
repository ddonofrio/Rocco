import type {
  RoccoCollisionShape,
  RoccoPoint,
  RoccoSpriteDefinition,
  RoccoSpriteFrame,
  RoccoSpriteInstance,
  RoccoSpriteVisualAdjustment,
} from './types';

const EPSILON = 0.0001;

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

type WorldShape =
  | { kind: 'rect'; rect: WorldRect }
  | { kind: 'circle'; circle: WorldCircle }
  | { kind: 'polygon'; polygon: WorldPolygon };

export interface RoccoSpriteCollisionHelper {
  resolveCollisionShapes(
    definition: RoccoSpriteDefinition,
    frame: RoccoSpriteFrame,
  ): RoccoCollisionShape[];
  isPointInShape(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    frame: RoccoSpriteFrame,
    shape: RoccoCollisionShape,
    point: RoccoPoint,
  ): boolean;
  intersects(
    leftInstance: RoccoSpriteInstance,
    leftDefinition: RoccoSpriteDefinition,
    leftFrame: RoccoSpriteFrame,
    leftShape: RoccoCollisionShape,
    rightInstance: RoccoSpriteInstance,
    rightDefinition: RoccoSpriteDefinition,
    rightFrame: RoccoSpriteFrame,
    rightShape: RoccoCollisionShape,
  ): boolean;
}

export interface RoccoSpriteCollisionHelperOptions {
  resolveVisualAdjustment(
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
    frame: RoccoSpriteFrame,
  ): RoccoSpriteVisualAdjustment | undefined;
}

function toWorldPoint(
  options: RoccoSpriteCollisionHelperOptions,
  instance: RoccoSpriteInstance,
  definition: RoccoSpriteDefinition,
  frame: RoccoSpriteFrame,
  point: RoccoPoint,
): RoccoPoint {
  const visualAdjustment = options.resolveVisualAdjustment(instance, definition, frame);
  const { scaleX, scaleY } = resolveWorldScale(instance);
  const anchor = definition.anchor ?? { x: 0, y: 0 };
  const frameSize = resolveFrameSize(definition, frame);
  const localPoint = {
    x:
      (point.x - anchor.x * frameSize.width) * (visualAdjustment?.scaleX ?? 1) +
      (visualAdjustment?.offsetX ?? 0),
    y:
      (point.y - anchor.y * frameSize.height) * (visualAdjustment?.scaleY ?? 1) +
      (visualAdjustment?.offsetY ?? 0),
  };
  return transformLocalPointToWorld(
    instance,
    resolveFramePivot(definition, frame),
    localPoint,
    scaleX,
    scaleY,
  );
}

function createWorldCircle(
  options: RoccoSpriteCollisionHelperOptions,
  instance: RoccoSpriteInstance,
  definition: RoccoSpriteDefinition,
  frame: RoccoSpriteFrame,
  shape: Extract<RoccoCollisionShape, { kind: 'circle' }>,
): WorldShape {
  const frameSize = resolveFrameSize(definition, frame);
  const visualAdjustment = options.resolveVisualAdjustment(instance, definition, frame);
  const { scaleX, scaleY } = resolveWorldScale(instance);
  const anchor = definition.anchor ?? { x: 0, y: 0 };
  const adjustedScaleX = visualAdjustment?.scaleX ?? 1;
  const adjustedScaleY = visualAdjustment?.scaleY ?? 1;
  const localCenter = {
    x: (shape.x - anchor.x * frameSize.width) * adjustedScaleX + (visualAdjustment?.offsetX ?? 0),
    y: (shape.y - anchor.y * frameSize.height) * adjustedScaleY + (visualAdjustment?.offsetY ?? 0),
  };
  const worldCenter = transformLocalPointToWorld(
    instance,
    resolveFramePivot(definition, frame),
    localCenter,
    scaleX,
    scaleY,
  );
  const radiusScale =
    (Math.abs(scaleX * adjustedScaleX) + Math.abs(scaleY * adjustedScaleY)) / 2;
  return {
    kind: 'circle',
    circle: {
      x: worldCenter.x,
      y: worldCenter.y,
      radius: Math.abs(shape.radius * radiusScale),
    },
  };
}

function toWorldShape(
  options: RoccoSpriteCollisionHelperOptions,
  instance: RoccoSpriteInstance,
  definition: RoccoSpriteDefinition,
  frame: RoccoSpriteFrame,
  shape: RoccoCollisionShape,
): WorldShape {
  if (shape.kind === 'rect') {
    const points = [
      { x: shape.x, y: shape.y },
      { x: shape.x + shape.width, y: shape.y },
      { x: shape.x + shape.width, y: shape.y + shape.height },
      { x: shape.x, y: shape.y + shape.height },
    ].map((point) => toWorldPoint(options, instance, definition, frame, point));
    return { kind: 'polygon', polygon: { points } };
  }
  if (shape.kind === 'circle') {
    return createWorldCircle(options, instance, definition, frame, shape);
  }
  return {
    kind: 'polygon',
    polygon: {
      points: shape.points.map((point) => toWorldPoint(options, instance, definition, frame, point)),
    },
  };
}

function resolveCollisionShapes(
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
  return definition.hitbox ? [clone(definition.hitbox)] : [];
}

function isPointInShape(
  options: RoccoSpriteCollisionHelperOptions,
  instance: RoccoSpriteInstance,
  definition: RoccoSpriteDefinition,
  frame: RoccoSpriteFrame,
  shape: RoccoCollisionShape,
  point: RoccoPoint,
): boolean {
  const world = toWorldShape(options, instance, definition, frame, shape);
  if (world.kind === 'rect') {
    return isPointInRect(point, world.rect);
  }
  if (world.kind === 'circle') {
    const dx = point.x - world.circle.x;
    const dy = point.y - world.circle.y;
    return dx * dx + dy * dy <= world.circle.radius * world.circle.radius;
  }
  return isPointInPolygon(point, world.polygon.points);
}

function isIntersecting(
  options: RoccoSpriteCollisionHelperOptions,
  leftInstance: RoccoSpriteInstance,
  leftDefinition: RoccoSpriteDefinition,
  leftFrame: RoccoSpriteFrame,
  leftShape: RoccoCollisionShape,
  rightInstance: RoccoSpriteInstance,
  rightDefinition: RoccoSpriteDefinition,
  rightFrame: RoccoSpriteFrame,
  rightShape: RoccoCollisionShape,
): boolean {
  const leftWorld = toWorldShape(options, leftInstance, leftDefinition, leftFrame, leftShape);
  const rightWorld = toWorldShape(options, rightInstance, rightDefinition, rightFrame, rightShape);
  if (leftWorld.kind === 'rect' && rightWorld.kind === 'rect') {
    return isRectRectIntersection(leftWorld.rect, rightWorld.rect);
  }
  if (leftWorld.kind === 'circle' && rightWorld.kind === 'circle') {
    const dx = leftWorld.circle.x - rightWorld.circle.x;
    const dy = leftWorld.circle.y - rightWorld.circle.y;
    const radius = leftWorld.circle.radius + rightWorld.circle.radius;
    return dx * dx + dy * dy <= radius * radius;
  }
  if (leftWorld.kind === 'circle' && rightWorld.kind === 'rect') {
    return isCircleRectIntersection(leftWorld.circle, rightWorld.rect);
  }
  if (leftWorld.kind === 'rect' && rightWorld.kind === 'circle') {
    return isCircleRectIntersection(rightWorld.circle, leftWorld.rect);
  }
  return isRectRectIntersection(toBounds(leftWorld), toBounds(rightWorld));
}

export function createRoccoSpriteCollisionHelper(
  options: RoccoSpriteCollisionHelperOptions,
): RoccoSpriteCollisionHelper {
  return {
    resolveCollisionShapes,
    isPointInShape: (instance, definition, frame, shape, point) =>
      isPointInShape(options, instance, definition, frame, shape, point),
    intersects: (
      leftInstance,
      leftDefinition,
      leftFrame,
      leftShape,
      rightInstance,
      rightDefinition,
      rightFrame,
      rightShape,
    ) =>
      isIntersecting(
        options,
        leftInstance,
        leftDefinition,
        leftFrame,
        leftShape,
        rightInstance,
        rightDefinition,
        rightFrame,
        rightShape,
      ),
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function resolvePresentationScale(transform?: RoccoSpriteInstance['transform']['presentation']): {
  x: number;
  y: number;
} {
  const yawDegrees = clamp(transform?.yawDegrees ?? 0, -89.9, 89.9);
  const pitchDegrees = clamp(transform?.pitchDegrees ?? 0, -89.9, 89.9);
  return {
    x: Math.max(EPSILON, Math.cos(degreesToRadians(yawDegrees))),
    y: Math.max(EPSILON, Math.cos(degreesToRadians(pitchDegrees))),
  };
}

function resolveWorldScale(instance: RoccoSpriteInstance): { scaleX: number; scaleY: number } {
  const presentationScale = resolvePresentationScale(instance.transform.presentation);
  return {
    scaleX:
      (instance.transform.scaleX || 1) *
      presentationScale.x *
      (instance.transform.flipX ? -1 : 1),
    scaleY:
      (instance.transform.scaleY || 1) *
      presentationScale.y *
      (instance.transform.flipY ? -1 : 1),
  };
}

function resolveFramePivot(
  definition: RoccoSpriteDefinition,
  frame: RoccoSpriteFrame,
): RoccoPoint {
  return frame.pivot ?? definition.pivot ?? { x: 0, y: 0 };
}

function resolveFrameSize(
  definition: RoccoSpriteDefinition,
  frame: RoccoSpriteFrame,
): { width: number; height: number } {
  if (frame.rect) {
    return {
      width: frame.rect.width,
      height: frame.rect.height,
    };
  }

  const image = definition.images.find((item) => item.id === frame.imageId);
  return {
    width: image?.width ?? 0,
    height: image?.height ?? 0,
  };
}

function transformLocalPointToWorld(
  instance: RoccoSpriteInstance,
  pivot: RoccoPoint,
  localPoint: RoccoPoint,
  scaleX: number,
  scaleY: number,
): RoccoPoint {
  const translatedX = (localPoint.x - pivot.x) * scaleX;
  const translatedY = (localPoint.y - pivot.y) * scaleY;
  const rotation = instance.transform.rotation ?? 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  return {
    x: instance.transform.x + translatedX * cos - translatedY * sin,
    y: instance.transform.y + translatedX * sin + translatedY * cos,
  };
}

function isPointInRect(point: RoccoPoint, rect: WorldRect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function isPointInPolygon(point: RoccoPoint, points: readonly RoccoPoint[]): boolean {
  let isInside = false;
  for (let index = 0, index_ = points.length - 1; index < points.length; index_ = index++) {
    const xi = points[index]?.x ?? 0;
    const yi = points[index]?.y ?? 0;
    const xj = points[index_]?.x ?? 0;
    const yj = points[index_]?.y ?? 0;

    const isIntersects =
      yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + EPSILON) + xi;
    if (isIntersects) {
      isInside = !isInside;
    }
  }
  return isInside;
}

function isRectRectIntersection(left: WorldRect, right: WorldRect): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function isCircleRectIntersection(circle: WorldCircle, rect: WorldRect): boolean {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function toBounds(shape: WorldShape): WorldRect {
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

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
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
