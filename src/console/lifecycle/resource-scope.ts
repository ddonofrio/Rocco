import type {
  DisposableResource,
  Disposer,
  ResourceScope,
} from './lifecycle';

export class ResourceScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceScopeError';
  }
}

export class ResourceScopeClosedError extends ResourceScopeError {
  constructor(scopeId: string) {
    super(`Cannot register resources on a closed ResourceScope '${scopeId}'`);
    this.name = 'ResourceScopeClosedError';
  }
}

export interface ResourceScopeDisposalErrorDetail {
  readonly index: number;
  readonly error: unknown;
}

/**
 * Thrown after a scope finishes disposing when one or more disposers failed.
 * Every disposer is still attempted; this aggregates the failures so the
 * caller sees all of them instead of only the first.
 */
export class ResourceScopeDisposalError extends ResourceScopeError {
  readonly errors: readonly ResourceScopeDisposalErrorDetail[];

  constructor(scopeId: string, errors: readonly ResourceScopeDisposalErrorDetail[]) {
    const summary = errors
      .map((detail) => {
        const cause = detail.error instanceof Error ? detail.error.message : String(detail.error);
        return `  [${detail.index}] ${cause}`;
      })
      .join('\n');
    super(`ResourceScope '${scopeId}' finished with ${errors.length} disposal error(s):\n${summary}`);
    this.name = 'ResourceScopeDisposalError';
    this.errors = errors;
  }
}

interface ScopeEntry {
  readonly disposer: Disposer;
}

export interface ResourceScopeOptions {
  parent?: ResourceScope | null;
}

export class ResourceScopeImpl implements ResourceScope {
  readonly id: string;
  readonly parent: ResourceScope | null;
  readonly signal: AbortSignal;

  private readonly controller: AbortController;
  private readonly entries: ScopeEntry[] = [];
  private readonly ownedChildren = new Set<ResourceScopeImpl>();
  private disposed = false;

  constructor(id: string, options: ResourceScopeOptions = {}) {
    this.id = id;
    this.parent = options.parent ?? null;
    this.controller = new AbortController();
    this.signal = this.controller.signal;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  add<T extends DisposableResource>(resource: T): T {
    this.assertOpen();
    this.entries.push({ disposer: () => resource.dispose() });
    return resource;
  }

  defer(disposer: Disposer): void {
    this.assertOpen();
    this.entries.push({ disposer });
  }

  createChild(id: string): ResourceScope {
    this.assertOpen();
    const child = new ResourceScopeImpl(id, { parent: this });
    this.ownedChildren.add(child);
    this.entries.push({
      disposer: () => child.dispose(),
    });
    return child;
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.controller.abort();

    const failures: ResourceScopeDisposalErrorDetail[] = [];
    // LIFO: dispose in reverse registration order.
    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      try {
        await this.entries[index]?.disposer();
      } catch (error) {
        failures.push({ index, error });
      }
    }
    this.entries.length = 0;
    this.ownedChildren.clear();

    if (failures.length > 0) {
      throw new ResourceScopeDisposalError(this.id, failures);
    }
  }

  private assertOpen(): void {
    if (this.disposed) {
      throw new ResourceScopeClosedError(this.id);
    }
  }
}

export function createResourceScope(
  id: string,
  options: ResourceScopeOptions = {},
): ResourceScope {
  return new ResourceScopeImpl(id, options);
}
