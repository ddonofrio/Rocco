export type RoccoEffectPatch = Partial<Omit<RoccoEffect, 'id' | 'kind' | 'targetType' | 'targetId'>>;

export interface RoccoEffect<TParameters = unknown> {
  id: string;
  kind: string;
  targetType: string;
  targetId: string;
  params: TParameters;
  enabled: boolean;
}

export interface RoccoEffectContext {
  deltaMs: number;
  deltaSeconds: number;
  elapsedMs: number;
  elapsedSeconds: number;
}

export interface RoccoEffectRuntime<TTarget = unknown, TParameters = unknown> {
  kind: string;
  targetType: string;
  apply(target: TTarget, parameters: TParameters, context: RoccoEffectContext): void;
}

export interface RoccoEffectRegistry {
  register<TTarget, TParameters>(runtime: RoccoEffectRuntime<TTarget, TParameters>): void;
  get(kind: string, targetType: string): RoccoEffectRuntime | undefined;
}

export interface RoccoEffectManager {
  add(effect: RoccoEffect): void;
  remove(effectId: string): void;
  enable(effectId: string): void;
  disable(effectId: string): void;
  update(effectId: string, patch: RoccoEffectPatch): void;
  tick(context: RoccoEffectContext): void;
}

export type RoccoEffectTargetResolver = (targetType: string, targetId: string) => unknown;
