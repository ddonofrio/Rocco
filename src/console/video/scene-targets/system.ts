import type { RoccoPoint, RoccoSpriteVisibleDescription } from '../sprites';
import type {
  RoccoSceneTargetDefinition,
  RoccoSceneTargetHit,
  RoccoSceneTargetSystem,
  RoccoSceneTargetVisibleHit,
} from './types';

const EPSILON = 0.0001;

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function pointInPolygon(point: RoccoPoint, points: readonly RoccoPoint[]): boolean {
  let isInside = false;
  for (let index = 0, index_ = points.length - 1; index < points.length; index_ = index++) {
    const xi = points[index]?.x ?? 0;
    const yi = points[index]?.y ?? 0;
    const xj = points[index_]?.x ?? 0;
    const yj = points[index_]?.y ?? 0;

    const isIntersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + EPSILON) + xi;
    if (isIntersects) {
      isInside = !isInside;
    }
  }
  return isInside;
}

function normalizeDefinition(definition: RoccoSceneTargetDefinition): RoccoSceneTargetDefinition {
  return {
    ...clone(definition),
    enabled: definition.enabled ?? true,
    interactive: definition.interactive ?? true,
    priority: definition.priority ?? 0,
  };
}

function isPointInTarget(definition: RoccoSceneTargetDefinition, point: RoccoPoint): boolean {
  const shape = definition.shape;
  if (shape.kind === 'rect') {
    return (
      point.x >= shape.x &&
      point.x <= shape.x + shape.width &&
      point.y >= shape.y &&
      point.y <= shape.y + shape.height
    );
  }

  if (shape.kind === 'circle') {
    const dx = point.x - shape.x;
    const dy = point.y - shape.y;
    return dx * dx + dy * dy <= shape.radius * shape.radius;
  }

  return pointInPolygon(point, shape.points);
}

function resolveVisibleDescription(
  definition: RoccoSceneTargetDefinition,
): RoccoSpriteVisibleDescription | undefined {
  const description = definition.visibleDescription;
  if (description?.enabled === false || !description?.text) {
    return undefined;
  }

  return {
    enabled: true,
    text: description.text,
    textKey: description.textKey,
  };
}

export class RoccoSceneTargetSystemSDK implements RoccoSceneTargetSystem {
  private readonly targets = new Map<string, RoccoSceneTargetDefinition>();

  registerTarget(definition: RoccoSceneTargetDefinition): void {
    if (!definition.instanceId) {
      throw new Error('Scene target instanceId is required.');
    }
    if (!definition.definitionId) {
      throw new Error(`Scene target '${definition.instanceId}' requires a definitionId.`);
    }

    if (this.targets.has(definition.instanceId)) {
      throw new Error(`Duplicate scene target registration '${definition.instanceId}'.`);
    }

    this.targets.set(definition.instanceId, normalizeDefinition(definition));
  }

  unregisterTarget(instanceId: string): void {
    this.targets.delete(instanceId);
  }

  clearTargets(): void {
    this.targets.clear();
  }

  getTarget(instanceId: string): RoccoSceneTargetDefinition | undefined {
    const target = this.targets.get(instanceId);
    return target ? clone(target) : undefined;
  }

  listTargets(): RoccoSceneTargetDefinition[] {
    return [...this.targets.values()].map((target) => clone(target));
  }

  setEnabled(instanceId: string, enabled: boolean): void {
    const target = this.targets.get(instanceId);
    if (!target) {
      return;
    }

    target.enabled = enabled;
  }

  setVisibleDescription(
    instanceId: string,
    visibleDescription?: Partial<RoccoSpriteVisibleDescription>,
  ): void {
    const target = this.targets.get(instanceId);
    if (!target) {
      return;
    }

    target.visibleDescription = visibleDescription ? clone(visibleDescription) : undefined;
  }

  hitTest(x: number, y: number): RoccoSceneTargetHit[] {
    const hits: RoccoSceneTargetHit[] = [];
    const point = { x, y };

    for (const target of this.targets.values()) {
      if (!target.enabled || !target.interactive || !isPointInTarget(target, point)) {
        continue;
      }

      hits.push({
        instanceId: target.instanceId,
        definitionId: target.definitionId,
        shape: clone(target.shape),
        priority: target.priority ?? 0,
      });
    }

    hits.sort((left, right) => right.priority - left.priority);
    return hits;
  }

  hitTestVisible(x: number, y: number): RoccoSceneTargetVisibleHit[] {
    const hits: RoccoSceneTargetVisibleHit[] = [];
    const point = { x, y };

    for (const target of this.targets.values()) {
      const description = resolveVisibleDescription(target);
      if (!target.enabled || !description || !isPointInTarget(target, point)) {
        continue;
      }

      hits.push({
        instanceId: target.instanceId,
        definitionId: target.definitionId,
        text: description.text,
        textKey: description.textKey,
        priority: target.priority ?? 0,
      });
    }

    hits.sort((left, right) => right.priority - left.priority);
    return hits;
  }
}
