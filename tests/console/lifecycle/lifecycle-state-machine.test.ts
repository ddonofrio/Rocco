import { describe, expect, it } from 'vitest';

import { LifecycleStateMachine } from '../../../src/console/lifecycle';

describe('LifecycleStateMachine', () => {
  it('starts in the new state', () => {
    expect(new LifecycleStateMachine().current).toBe('new');
  });

  it('transitions new -> initializing -> ready', () => {
    const machine = new LifecycleStateMachine();

    machine.markInitializing();
    expect(machine.current).toBe('initializing');
    machine.markReady();
    expect(machine.current).toBe('ready');
  });

  it('treats ready as idempotent for initialization', () => {
    const machine = new LifecycleStateMachine();

    machine.markInitializing();
    machine.markReady();
    expect(machine.canInitialize()).toBe(false);
  });

  it('allows re-initialization only from the failed state', () => {
    const machine = new LifecycleStateMachine();

    machine.markInitializing();
    machine.markFailed();
    expect(machine.canInitialize()).toBe(true);
  });

  it('marks a disposed runtime as terminal', () => {
    const machine = new LifecycleStateMachine();

    machine.markInitializing();
    machine.markReady();
    machine.markDisposing();
    machine.markDisposed();
    expect(machine.isTerminal()).toBe(true);
    expect(machine.canInitialize()).toBe(false);
  });

  it('rejects concurrent initialization', () => {
    const machine = new LifecycleStateMachine();

    machine.markInitializing();
    expect(() => machine.markInitializing()).toThrow();
  });

  it('rejects initialization from a non-recoverable state', () => {
    const machine = new LifecycleStateMachine();

    machine.markInitializing();
    machine.markReady();
    machine.markDisposing();
    expect(() => machine.markInitializing()).toThrow();
  });

  it('rejects beginning disposal from a disposed state', () => {
    const machine = new LifecycleStateMachine();

    machine.markDisposing();
    expect(() => machine.markDisposing()).toThrow();
  });
});
