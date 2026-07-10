import type {
  RoccoEffect,
  RoccoEffectContext,
  RoccoEffectManager,
  RoccoEffectRegistry,
  RoccoEffectTargetResolver,
} from './types';

interface RoccoDefaultEffectManagerOptions {
  registry: RoccoEffectRegistry;
  resolveTarget: RoccoEffectTargetResolver;
  onError?: (error: unknown) => void;
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export class RoccoDefaultEffectManager implements RoccoEffectManager {
  private readonly registry: RoccoEffectRegistry;
  private readonly resolveTarget: RoccoEffectTargetResolver;
  private readonly onError: ((error: unknown) => void) | undefined;
  private readonly effects = new Map<string, RoccoEffect>();

  constructor(options: RoccoDefaultEffectManagerOptions) {
    this.registry = options.registry;
    this.resolveTarget = options.resolveTarget;
    this.onError = options.onError;
  }

  add(effect: RoccoEffect): void {
    if (this.effects.has(effect.id)) {
      throw new Error(`Effect with id '${effect.id}' already exists`);
    }
    this.effects.set(effect.id, clone(effect));
  }

  remove(effectId: string): void {
    this.requireEffect(effectId);
    this.effects.delete(effectId);
  }

  enable(effectId: string): void {
    const effect = this.requireEffect(effectId);
    effect.enabled = true;
  }

  disable(effectId: string): void {
    const effect = this.requireEffect(effectId);
    effect.enabled = false;
  }

  update(effectId: string, patch: Partial<RoccoEffect>): void {
    const current = this.requireEffect(effectId);
    const nextParams =
      patch.params === undefined
        ? current.params
        : isObject(current.params) && isObject(patch.params)
          ? { ...current.params, ...patch.params }
          : patch.params;

    const next: RoccoEffect = {
      ...current,
      ...patch,
      params: nextParams,
    };

    this.effects.set(effectId, clone(next));
  }

  tick(context: RoccoEffectContext): void {
    for (const effect of this.effects.values()) {
      if (!effect.enabled) {
        continue;
      }

      const runtime = this.registry.get(effect.kind, effect.targetType);
      if (!runtime) {
        continue;
      }

      const target = this.resolveTarget(effect.targetType, effect.targetId);
      if (target === undefined || target === null) {
        continue;
      }

      try {
        runtime.apply(target, effect.params, context);
      } catch (error) {
        this.onError?.(error);
      }
    }
  }

  list(): RoccoEffect[] {
    return [...this.effects.values()].map((effect) => clone(effect));
  }

  private requireEffect(effectId: string): RoccoEffect {
    const effect = this.effects.get(effectId);
    if (!effect) {
      throw new Error(`Effect '${effectId}' was not found`);
    }

    return effect;
  }
}
