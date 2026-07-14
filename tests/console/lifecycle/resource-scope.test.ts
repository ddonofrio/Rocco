import { describe, expect, it, vi } from 'vitest';

import {
  createResourceScope,
  ResourceScopeClosedError,
  ResourceScopeDisposalError,
} from '../../../src/console/lifecycle';

describe('ResourceScope', () => {
  it('disposes registered disposers in reverse (LIFO) order', async () => {
    const scope = createResourceScope('test');
    const order: string[] = [];

    scope.defer(() => {
      order.push('first');
    });
    scope.defer(() => {
      order.push('second');
    });
    scope.add({
      dispose: () => {
        order.push('resource');
      },
    });

    await scope.dispose();

    expect(order).toEqual(['resource', 'second', 'first']);
  });

  it('returns the registered resource from add for chaining', () => {
    const scope = createResourceScope('test');
    const resource = { dispose: vi.fn() };

    const returned = scope.add(resource);

    expect(returned).toBe(resource);
  });

  it('is idempotent and runs each disposer exactly once', async () => {
    const scope = createResourceScope('test');
    const disposer = vi.fn();

    scope.defer(disposer);
    await scope.dispose();
    await scope.dispose();

    expect(disposer).toHaveBeenCalledTimes(1);
    expect(scope.isDisposed).toBe(true);
  });

  it('returns the same promise for concurrent disposal and waits for cleanup once', async () => {
    const scope = createResourceScope('test');
    let resolveDisposer!: () => void;

    scope.defer(
      () =>
        new Promise<void>((resolve) => {
          resolveDisposer = resolve;
        }),
    );

    const firstDispose = scope.dispose();
    const secondDispose = scope.dispose();

    expect(firstDispose).toBe(secondDispose);

    let settled = false;
    void secondDispose.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    resolveDisposer();
    await firstDispose;
    expect(settled).toBe(true);
  });

  it('continues disposing after a failing disposer and aggregates errors', async () => {
    const scope = createResourceScope('test');
    const after = vi.fn();

    scope.defer(after);
    scope.defer(() => {
      throw new Error('boom');
    });

    let thrown: unknown;
    try {
      await scope.dispose();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ResourceScopeDisposalError);
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('aborts its AbortSignal when disposed', async () => {
    const scope = createResourceScope('test');
    const signal = scope.signal;

    expect(signal.aborted).toBe(false);
    await scope.dispose();

    expect(signal.aborted).toBe(true);
  });

  it('rejects registrations after it is closed', async () => {
    const scope = createResourceScope('test');
    await scope.dispose();

    expect(() => scope.defer(() => undefined)).toThrow(ResourceScopeClosedError);
    expect(() => scope.add({ dispose: () => undefined })).toThrow(ResourceScopeClosedError);
  });

  it('creates a child owned by the parent and cascades disposal', async () => {
    const parent = createResourceScope('parent');
    const childDisposer = vi.fn();
    const child = parent.createChild('child');
    child.defer(childDisposer);

    await parent.dispose();

    expect(child.isDisposed).toBe(true);
    expect(childDisposer).toHaveBeenCalledTimes(1);
  });

  it('disposing a child first detaches it from the parent without double-disposing', async () => {
    const parent = createResourceScope('parent');
    const childDisposer = vi.fn();
    const child = parent.createChild('child');
    child.defer(childDisposer);
    const childDispose = vi.spyOn(child, 'dispose');

    await child.dispose();
    await parent.dispose();

    expect(childDisposer).toHaveBeenCalledTimes(1);
    expect(childDispose).toHaveBeenCalledTimes(1);
  });

  it('exposes its parent reference', () => {
    const parent = createResourceScope('parent');
    const child = parent.createChild('child');

    expect(child.parent).toBe(parent);
    expect(parent.parent).toBeNull();
  });

  it('rejects duplicate child ids while a child is still owned by the parent', () => {
    const parent = createResourceScope('parent');

    parent.createChild('child');

    expect(() => parent.createChild('child')).toThrow(/already owns a child scope/i);
  });

  it('aborts child scopes before later parent disposers run', async () => {
    const parent = createResourceScope('parent');
    const child = parent.createChild('child');
    let childAbortedWhenParentDisposerRan = false;

    parent.defer(() => {
      childAbortedWhenParentDisposerRan = child.signal.aborted;
    });

    await parent.dispose();

    expect(childAbortedWhenParentDisposerRan).toBe(true);
  });

  it('waits for an in-flight child disposal when the parent closes', async () => {
    const parent = createResourceScope('parent');
    const child = parent.createChild('child');
    let rejectChild!: (error: Error) => void;

    child.defer(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectChild = reject;
        }),
    );

    const childDispose = child.dispose();
    const parentDispose = parent.dispose();

    let parentSettled = false;
    void parentDispose.catch(() => {
      parentSettled = true;
    });
    await Promise.resolve();
    expect(parentSettled).toBe(false);

    rejectChild(new Error('child failed'));

    await expect(childDispose).rejects.toBeInstanceOf(ResourceScopeDisposalError);
    await expect(parentDispose).rejects.toBeInstanceOf(ResourceScopeDisposalError);
  });
});
