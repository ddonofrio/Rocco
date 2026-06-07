import type { RoccoPrimitive, RoccoPrimitiveSystem } from './types';

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export class RoccoPrimitiveSystemSDK implements RoccoPrimitiveSystem {
  private readonly primitives = new Map<string, RoccoPrimitive>();

  addPrimitive(primitive: RoccoPrimitive): void {
    this.primitives.set(primitive.id, clone(primitive));
  }

  removePrimitive(id: string): void {
    this.primitives.delete(id);
  }

  clearPrimitives(): void {
    this.primitives.clear();
  }

  getPrimitive(id: string): RoccoPrimitive | undefined {
    const primitive = this.primitives.get(id);
    return primitive ? clone(primitive) : undefined;
  }

  listPrimitives(): RoccoPrimitive[] {
    return [...this.primitives.values()].map((primitive) => clone(primitive));
  }
}

