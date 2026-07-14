import { describe, expect, it, vi } from 'vitest';

import {
  CompositionOwnershipError,
  CompositionServiceImpl,
} from '../../../src/console/composition/composition-service';

describe('CompositionServiceImpl', () => {
  it('returns null active message when no session is open', () => {
    const service = new CompositionServiceImpl();
    expect(service.getActiveMessage()).toBeNull();
    expect(service.getActiveStatus()).toBeNull();
    expect(service.listSessions()).toEqual([]);
  });

  it('opens a session owned by the caller', () => {
    const service = new CompositionServiceImpl();
    const session = service.begin({ ownerId: 'level-transition', message: 'LOADING 0%' });
    expect(session.ownerId).toBe('level-transition');
    expect(session.mode).toBe('exclusive');
    expect(session.status).toBe('active');
    expect(service.getActiveMessage()).toBe('LOADING 0%');
  });

  it('shows the most recently begun session message', () => {
    const service = new CompositionServiceImpl();
    service.begin({ ownerId: 'a', message: 'A' });
    const b = service.begin({ ownerId: 'b', message: 'B' });
    expect(service.getActiveMessage()).toBe('B');
    b.dispose();
    expect(service.getActiveMessage()).toBe('A');
  });

  it('does not close another owner session when one is disposed', () => {
    const service = new CompositionServiceImpl();
    const a = service.begin({ ownerId: 'a', message: 'A' });
    const b = service.begin({ ownerId: 'b', message: 'B' });

    b.dispose();

    expect(service.getActiveMessage()).toBe('A');
    expect(a.status).toBe('active');
    expect(service.listSessions()).toHaveLength(1);
  });

  it('only the owning session can mutate or close itself', () => {
    const service = new CompositionServiceImpl();
    const a = service.begin({ ownerId: 'a', message: 'A' });

    expect(() => service.report('intruder', a.id, { completed: 1, total: 1 })).toThrow(
      CompositionOwnershipError,
    );
    expect(() => service.disposeSession('intruder', a.id)).toThrow(CompositionOwnershipError);

    // The owner can still mutate.
    a.report({ completed: 50, total: 100, message: 'LOADING 50%' });
    expect(service.getActiveMessage()).toBe('LOADING 50%');
  });

  it('marks failure and keeps diagnostics', () => {
    const service = new CompositionServiceImpl();
    const session = service.begin({ ownerId: 'owner', message: 'LOADING' });
    session.report({ completed: 50, total: 100, message: 'LOADING 50%' });
    session.fail(new Error('boom'));
    expect(session.status).toBe('failed');
    expect(session.completed).toBe(50);
    expect(session.total).toBe(100);
    expect(session.error).toMatchObject({ name: 'Error', message: 'boom' });
    expect(service.getActiveStatus()).toBe('failed');
    expect(service.getActiveSessionInfo()).toMatchObject({
      message: 'LOADING 50%',
      status: 'failed',
      completed: 50,
      total: 100,
      error: {
        message: 'boom',
      },
    });
  });

  it('reports progress only while active', () => {
    const service = new CompositionServiceImpl();
    const session = service.begin({ ownerId: 'owner', message: 'LOADING' });
    session.fail(new Error('boom'));
    session.report({ completed: 100, total: 100, message: 'LOADING 100%' });
    expect(service.getActiveMessage()).toBe('LOADING');
  });

  it('dispose is idempotent', () => {
    const service = new CompositionServiceImpl();
    const session = service.begin({ ownerId: 'owner', message: 'LOADING' });
    session.dispose();
    session.dispose();
    expect(service.getActiveMessage()).toBeNull();
  });

  it('assigns monotonic ids', () => {
    const service = new CompositionServiceImpl();
    const a = service.begin({ ownerId: 'a' });
    const b = service.begin({ ownerId: 'b' });
    expect(a.id).toBe('composition-1');
    expect(b.id).toBe('composition-2');
  });

  it('notifies listeners on every change', () => {
    const service = new CompositionServiceImpl();
    const listener = vi.fn();
    service.onChange(listener);

    const session = service.begin({ ownerId: 'owner', message: 'LOADING 0%' });
    expect(listener).toHaveBeenCalledTimes(1);

    session.report({ completed: 50, total: 100, message: 'LOADING 50%' });
    expect(listener).toHaveBeenCalledTimes(2);

    session.dispose();
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('prefers the newest exclusive session over later shared ones', () => {
    const service = new CompositionServiceImpl();
    service.begin({ ownerId: 'shared-a', mode: 'shared', message: 'SHARED A' });
    const exclusive = service.begin({ ownerId: 'exclusive', mode: 'exclusive', message: 'EXCLUSIVE' });
    service.begin({ ownerId: 'shared-b', mode: 'shared', message: 'SHARED B' });

    expect(service.getActiveSessionInfo()).toMatchObject({
      ownerId: 'exclusive',
      mode: 'exclusive',
      message: 'EXCLUSIVE',
    });

    exclusive.dispose();

    expect(service.getActiveSessionInfo()).toMatchObject({
      ownerId: 'shared-b',
      mode: 'shared',
      message: 'SHARED B',
    });
  });
});
