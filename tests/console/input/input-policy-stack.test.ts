import { describe, expect, it, vi } from 'vitest';

import {
  InputPolicyStackError,
  InputPolicyStackImpl,
} from '../../../src/console/input/input-policy-stack';

function stackWithClock(): {
  stack: InputPolicyStackImpl;
  clock: { now: number };
} {
  const clock = { now: 1000 };
  const stack = new InputPolicyStackImpl(() => clock.now);
  return { stack, clock };
}

describe('InputPolicyStackImpl', () => {
  it('defaults to interactive when no lease is held', () => {
    const { stack } = stackWithClock();
    expect(stack.getEffectiveMode()).toBe('interactive');
    expect(stack.isInteractive()).toBe(true);
    expect(stack.listLeases()).toEqual([]);
  });

  it('returns the most restrictive mode across owners', () => {
    const { stack } = stackWithClock();
    const a = stack.acquire({ ownerId: 'a', mode: 'advance-only' });
    expect(stack.getEffectiveMode()).toBe('advance-only');

    const b = stack.acquire({ ownerId: 'b', mode: 'blocked' });
    expect(stack.getEffectiveMode()).toBe('blocked');

    b.dispose();
    expect(stack.getEffectiveMode()).toBe('advance-only');

    a.dispose();
    expect(stack.getEffectiveMode()).toBe('interactive');
  });

  it('keeps the lock when only one of two equal owners releases', () => {
    const { stack } = stackWithClock();
    stack.acquire({ ownerId: 'transition', mode: 'blocked' });
    stack.acquire({ ownerId: 'sequence', mode: 'blocked' });
    expect(stack.getEffectiveMode()).toBe('blocked');

    stack.releaseAll('transition');
    expect(stack.getEffectiveMode()).toBe('blocked');
  });

  it('releaseAll only clears the named owner', () => {
    const { stack } = stackWithClock();
    stack.acquire({ ownerId: 'owner', mode: 'blocked' });
    stack.acquire({ ownerId: 'other', mode: 'blocked' });

    stack.releaseAll('owner');
    expect(stack.getEffectiveMode()).toBe('blocked');
  });

  it('dispose is idempotent', () => {
    const { stack } = stackWithClock();
    const lease = stack.acquire({ ownerId: 'owner', mode: 'blocked' });
    lease.dispose();
    lease.dispose();
    expect(stack.getEffectiveMode()).toBe('interactive');
  });

  it('notifies listeners only when the effective mode changes', () => {
    const { stack } = stackWithClock();
    const listener = vi.fn();
    stack.onChange(listener);

    const advance = stack.acquire({ ownerId: 'a', mode: 'advance-only' });
    expect(listener).toHaveBeenCalledTimes(1);

    const blocked = stack.acquire({ ownerId: 'b', mode: 'blocked' });
    expect(listener).toHaveBeenCalledTimes(2);

    // Adding another blocked lease does not change the effective mode.
    const blockedTwo = stack.acquire({ ownerId: 'c', mode: 'blocked' });
    expect(listener).toHaveBeenCalledTimes(2);

    // Removing a redundant blocked lease also does not change the mode.
    blockedTwo.dispose();
    expect(listener).toHaveBeenCalledTimes(2);

    blocked.dispose();
    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenLastCalledWith('advance-only');

    advance.dispose();
    expect(listener).toHaveBeenCalledTimes(4);
    expect(listener).toHaveBeenLastCalledWith('interactive');
  });

  it('exposes diagnostic lease info with age', () => {
    const { stack, clock } = stackWithClock();
    stack.acquire({ ownerId: 'owner', mode: 'blocked' });
    clock.now = 1500;
    const [info] = stack.listLeases();
    expect(info?.ownerId).toBe('owner');
    expect(info?.mode).toBe('blocked');
    expect(info?.ageMs()).toBe(500);
  });

  it('rejects an invalid mode value at the type level only', () => {
    const { stack } = stackWithClock();
    const lease = stack.acquire({ ownerId: 'owner', mode: 'blocked' });
    expect(lease.mode).toBe('blocked');
  });

  it('exposes an error type for diagnostics', () => {
    expect(new InputPolicyStackError('boom').name).toBe('InputPolicyStackError');
  });
});
