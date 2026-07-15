import type { DisposableResource } from '../lifecycle/lifecycle';

export interface RegistrationLease extends DisposableResource {
  readonly qualifiedId: string;
  readonly ownerScopeId: string;
}

export interface UniqueRegistryEntry<TValue> {
  readonly value: TValue;
  readonly revision: number;
}

export class UniqueRegistry<TId extends string, TValue> {
  private readonly entries = new Map<TId, UniqueRegistryEntry<TValue>>();
  private readonly leases = new Map<string, RegistrationLease>();

  register(id: TId, value: TValue, ownerScopeId: string): RegistrationLease {
    if (this.entries.has(id)) {
      const existing = this.entries.get(id)!;
      throw new Error(
        `Duplicate registry entry '${id}' owned by scope '${String(existing.value)}' (new owner: '${ownerScopeId}'). ` +
          `Use replace() if intentional.`,
      );
    }

    const lease: RegistrationLease = {
      qualifiedId: id,
      ownerScopeId,
      dispose: () => this.unregister(id),
    };

    this.entries.set(id, { value, revision: 0 });
    this.leases.set(id, lease);
    return lease;
  }

  replace(id: TId, value: TValue, expectedRevision: number): void {
    const current = this.entries.get(id);
    if (!current) {
      throw new Error(`Cannot replace unregistered entry '${id}'. Call register() first.`);
    }

    if (current.revision !== expectedRevision) {
      throw new Error(
        `Revision mismatch for '${id}': expected ${expectedRevision}, found ${current.revision}. ` +
          `The entry was modified by another operation.`,
      );
    }

    this.entries.set(id, { value, revision: current.revision + 1 });
  }

  unregister(id: TId): void {
    this.entries.delete(id);
    this.leases.delete(id);
  }

  get(id: TId): TValue | undefined {
    return this.entries.get(id)?.value;
  }

  has(id: TId): boolean {
    return this.entries.has(id);
  }

  list(): readonly TValue[] {
    // `Array.from` trips unicorn/prefer-spread; Iterator helper needs ES2024 lib.
    // eslint-disable-next-line unicorn/prefer-iterator-to-array
    return [...this.entries.values()].map((entry) => entry.value);
  }

  getLease(id: TId): RegistrationLease | undefined {
    return this.leases.get(id);
  }
}
