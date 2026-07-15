import type { RoccoCollisionShape, RoccoSpriteVisibleDescription } from '../sprites';

export interface RoccoSceneTargetDefinition {
  instanceId: string;
  definitionId: string;
  shape: RoccoCollisionShape;
  renderLayer?: string;
  renderPlaneId?: string;
  enabled?: boolean;
  interactive?: boolean;
  priority?: number;
  suppressDefaultPlayerMove?: boolean;
  visibleDescription?: Partial<RoccoSpriteVisibleDescription>;
  metadata?: Record<string, unknown>;
}

export interface RoccoSceneTargetHit {
  instanceId: string;
  definitionId: string;
  shape: RoccoCollisionShape;
  priority: number;
}

export interface RoccoSceneTargetVisibleHit {
  instanceId: string;
  definitionId: string;
  text: string;
  textKey?: string;
  priority: number;
}

export interface RoccoSceneTargetSystem {
  registerTarget(definition: RoccoSceneTargetDefinition): void;
  unregisterTarget(instanceId: string): void;
  clearTargets(): void;
  getTarget(instanceId: string): RoccoSceneTargetDefinition | undefined;
  listTargets(): RoccoSceneTargetDefinition[];
  setEnabled(instanceId: string, isEnabled: boolean): void;
  setVisibleDescription(
    instanceId: string,
    visibleDescription?: Partial<RoccoSpriteVisibleDescription>,
  ): void;
  hitTest(x: number, y: number): RoccoSceneTargetHit[];
  hitTestVisible(x: number, y: number): RoccoSceneTargetVisibleHit[];
}
