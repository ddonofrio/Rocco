export interface RoccoEffect<TParams = unknown> {
  id: string;
  kind: string;
  targetType: string;
  targetId: string;
  params: TParams;
  enabled: boolean;
}

export interface RoccoEffectContext {
  deltaMs: number;
  deltaSeconds: number;
  elapsedMs: number;
  elapsedSeconds: number;
}

export interface RoccoEffectRuntime<TTarget = unknown, TParams = unknown> {
  kind: string;
  targetType: string;
  apply(target: TTarget, params: TParams, context: RoccoEffectContext): void;
}

export interface RoccoEffectRegistry {
  register<TTarget, TParams>(runtime: RoccoEffectRuntime<TTarget, TParams>): void;
  get(kind: string, targetType: string): RoccoEffectRuntime | undefined;
}

export interface RoccoEffectManager {
  add(effect: RoccoEffect): void;
  remove(effectId: string): void;
  enable(effectId: string): void;
  disable(effectId: string): void;
  update(effectId: string, patch: Partial<RoccoEffect>): void;
  tick(context: RoccoEffectContext): void;
}

export type RoccoEffectTargetResolver = (targetType: string, targetId: string) => unknown;
