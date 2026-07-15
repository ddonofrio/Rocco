import type { RoccoPrimitive, RoccoPrimitiveSystem } from './types';

function clone<T>(value: T): T {
  return structuredClone(value);
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
    // `Array.from` trips unicorn/prefer-spread; Iterator helper needs ES2024 lib.
    // eslint-disable-next-line unicorn/prefer-iterator-to-array
    return [...this.primitives.values()].map((primitive) => clone(primitive));
  }
}

