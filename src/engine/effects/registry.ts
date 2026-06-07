import type { RoccoEffectRegistry, RoccoEffectRuntime } from './types';

function runtimeKey(kind: string, targetType: string): string {
  return `${kind}::${targetType}`;
}

export class RoccoDefaultEffectRegistry implements RoccoEffectRegistry {
  private readonly runtimes = new Map<string, RoccoEffectRuntime>();

  register<TTarget, TParams>(runtime: RoccoEffectRuntime<TTarget, TParams>): void {
    const key = runtimeKey(runtime.kind, runtime.targetType);
    this.runtimes.set(key, runtime as RoccoEffectRuntime);
  }

  get(kind: string, targetType: string): RoccoEffectRuntime | undefined {
    return this.runtimes.get(runtimeKey(kind, targetType));
  }
}

