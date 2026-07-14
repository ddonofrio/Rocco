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

  it('treats failed as a terminal state', () => {
    const machine = new LifecycleStateMachine();

    machine.markInitializing();
    machine.markFailed();
    expect(machine.canInitialize()).toBe(false);
    expect(machine.isTerminal()).toBe(true);
    expect(() => machine.markInitializing()).toThrow();
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

  it('supports the stop path before disposal', () => {
    const machine = new LifecycleStateMachine();

    machine.markInitializing();
    machine.markReady();
    machine.markStopping();
    machine.markStopped();
    machine.markDisposing();
    machine.markDisposed();

    expect(machine.current).toBe('disposed');
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

  it('rejects invalid completion transitions', () => {
    const machine = new LifecycleStateMachine();

    expect(() => machine.markReady()).toThrow();
    expect(() => machine.markDisposed()).toThrow();
  });

  it('rejects beginning disposal from a disposed state', () => {
    const machine = new LifecycleStateMachine();

    machine.markDisposing();
    expect(() => machine.markDisposing()).toThrow();
  });
});
