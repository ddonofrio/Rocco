import type { DisposableResource, Disposer, ResourceScope } from './lifecycle';

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
    super(
      `ResourceScope '${scopeId}' finished with ${errors.length} disposal error(s):\n${summary}`,
    );
    this.name = 'ResourceScopeDisposalError';
    this.errors = errors;
  }
}

interface ScopeEntry {
  disposer: Disposer;
  active: boolean;
}

interface OwnedChildEntry {
  readonly entry: ScopeEntry;
}

interface ParentOwnership {
  readonly parent: ResourceScopeImpl;
  readonly childId: string;
  readonly entry: ScopeEntry;
  readonly detachAbortPropagation: () => void;
}

export interface ResourceScopeOptions {
  parent?: ResourceScope | null;
}

export class ResourceScopeImpl implements ResourceScope {
  private readonly controller: AbortController;
  private readonly entries: ScopeEntry[] = [];
  private readonly ownedChildren = new Map<string, OwnedChildEntry>();
  private closed = false;
  private disposePromise: Promise<void> | undefined = undefined;
  private parentOwnership: ParentOwnership | undefined = undefined;

  readonly id: string;
  readonly parent: ResourceScope | null;
  readonly signal: AbortSignal;

  constructor(id: string, options: ResourceScopeOptions = {}) {
    this.id = id;
    // `options.parent` is `ResourceScope | null | undefined` (optional prop);
    // the `?? null` maps the absent case to `null` to keep the `| null` contract.
    this.parent = options.parent ?? null;
    this.controller = new AbortController();
    this.signal = this.controller.signal;

    if (options.parent instanceof ResourceScopeImpl) {
      this.attachToParent(options.parent);
    }
  }

  private async disposeInternal(): Promise<void> {
    this.closed = true;
    this.controller.abort();

    const failures: ResourceScopeDisposalErrorDetail[] = [];
    const entries = [...this.entries];
    // LIFO: dispose in reverse registration order.
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (!entry?.active) {
        continue;
      }
      try {
        await entry.disposer();
      } catch (error) {
        failures.push({ index, error });
      }
    }
    this.entries.length = 0;
    this.ownedChildren.clear();
    this.detachFromParent();

    if (failures.length > 0) {
      throw new ResourceScopeDisposalError(this.id, failures);
    }
  }

  private attachToParent(parent: ResourceScopeImpl): void {
    parent.assertOpen();
    if (parent.ownedChildren.has(this.id)) {
      throw new ResourceScopeError(
        `ResourceScope '${parent.id}' already owns a child scope with id '${this.id}'`,
      );
    }

    const abortChild = () => {
      this.controller.abort();
    };
    parent.signal.addEventListener('abort', abortChild);

    const entry: ScopeEntry = {
      disposer: () => this.dispose(),
      active: true,
    };

    parent.ownedChildren.set(this.id, { entry });
    parent.entries.push(entry);
    this.parentOwnership = {
      parent,
      childId: this.id,
      entry,
      detachAbortPropagation: () => {
        parent.signal.removeEventListener('abort', abortChild);
      },
    };

    if (parent.signal.aborted) {
      this.controller.abort();
    }
  }

  private detachFromParent(): void {
    const ownership = this.parentOwnership;
    if (!ownership) {
      return;
    }

    ownership.entry.active = false;
    ownership.parent.ownedChildren.delete(ownership.childId);
    ownership.detachAbortPropagation();
    this.parentOwnership = undefined;
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new ResourceScopeClosedError(this.id);
    }
  }

  get isDisposed(): boolean {
    return this.closed;
  }

  add<T extends DisposableResource>(resource: T): T {
    this.assertOpen();
    this.entries.push({ disposer: () => resource.dispose(), active: true });
    return resource;
  }

  defer(disposer: Disposer): void {
    this.assertOpen();
    this.entries.push({ disposer, active: true });
  }

  createChild(id: string): ResourceScope {
    this.assertOpen();
    return new ResourceScopeImpl(id, { parent: this });
  }

  dispose(): Promise<void> {
    if (this.disposePromise) {
      return this.disposePromise;
    }

    this.disposePromise = this.disposeInternal();
    return this.disposePromise;
  }
}

export function createResourceScope(id: string, options: ResourceScopeOptions = {}): ResourceScope {
  return new ResourceScopeImpl(id, options);
}

/**
 * Registers an already-created resource atomically. If the scope rejects the
 * registration, the resource is disposed before the error reaches the caller.
 */
export async function adoptResource<T extends DisposableResource>(
  scope: ResourceScope,
  resource: T,
): Promise<T> {
  try {
    return scope.add(resource);
  } catch (registrationError) {
    try {
      await resource.dispose();
    } catch (disposeError) {
      throw new AggregateError(
        [registrationError, disposeError],
        'Resource adoption failed and cleanup also failed.',
        { cause: disposeError },
      );
    }
    throw registrationError;
  }
}
