import type {
  RoccoEffect,
  RoccoEffectContext,
  RoccoEffectManager,
  RoccoEffectPatch,
  RoccoEffectRegistry,
  RoccoEffectTargetResolver,
} from './types';

interface RoccoDefaultEffectManagerOptions {
  registry: RoccoEffectRegistry;
  resolveTarget: RoccoEffectTargetResolver;
  onError?: (error: unknown) => void;
}

function clone<T>(value: T): T {
  return structuredClone(value);
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

  private requireEffect(effectId: string): RoccoEffect {
    const effect = this.effects.get(effectId);
    if (!effect) {
      throw new Error(`Effect '${effectId}' was not found`);
    }

    return effect;
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

  update(effectId: string, patch: RoccoEffectPatch): void {
    const current = this.requireEffect(effectId);
    let nextParameters = current.params;
    if (patch.params !== undefined) {
      nextParameters =
        isObject(current.params) && isObject(patch.params)
          ? { ...current.params, ...patch.params }
          : patch.params;
    }

    const next: RoccoEffect = {
      ...current,
      ...patch,
      params: nextParameters,
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
    return Array.from(this.effects.values(), (effect) => clone(effect));
  }
}
