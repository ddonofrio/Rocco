import { describe, expect, it } from 'vitest';

import { UniqueRegistry } from '../../../src/console/registries/unique-registry';

describe('UniqueRegistry', () => {
  it('registers a value and returns a lease', () => {
    const registry = new UniqueRegistry<string, { name: string }>();
    const lease = registry.register('alpha', { name: 'Alpha' }, 'scope-a');

    expect(lease.qualifiedId).toBe('alpha');
    expect(lease.ownerScopeId).toBe('scope-a');
    expect(registry.get('alpha')).toEqual({ name: 'Alpha' });
    expect(registry.has('alpha')).toBe(true);
  });

  it('throws on duplicate registration', () => {
    const registry = new UniqueRegistry<string, { name: string }>();
    registry.register('alpha', { name: 'Alpha' }, 'scope-a');

    expect(() => registry.register('alpha', { name: 'Beta' }, 'scope-b')).toThrow(
      "Duplicate registry entry 'alpha'",
    );
  });

  it('unregisters by id', () => {
    const registry = new UniqueRegistry<string, { name: string }>();
    const lease = registry.register('alpha', { name: 'Alpha' }, 'scope-a');
    void lease.dispose();

    expect(registry.has('alpha')).toBe(false);
    expect(registry.get('alpha')).toBeUndefined();
  });

  it('replaces a value with matching revision', () => {
    const registry = new UniqueRegistry<string, { name: string }>();
    registry.register('alpha', { name: 'Alpha' }, 'scope-a');

    registry.replace('alpha', { name: 'Beta' }, 0);

    expect(registry.get('alpha')).toEqual({ name: 'Beta' });
  });

  it('throws on revision mismatch', () => {
    const registry = new UniqueRegistry<string, { name: string }>();
    registry.register('alpha', { name: 'Alpha' }, 'scope-a');

    expect(() => registry.replace('alpha', { name: 'Beta' }, 1)).toThrow(
      "Revision mismatch for 'alpha'",
    );
  });

  it('throws when replacing unregistered entry', () => {
    const registry = new UniqueRegistry<string, { name: string }>();

    expect(() => registry.replace('alpha', { name: 'Beta' }, 0)).toThrow(
      "Cannot replace unregistered entry 'alpha'",
    );
  });

  it('lists all values', () => {
    const registry = new UniqueRegistry<string, { name: string }>();
    registry.register('alpha', { name: 'Alpha' }, 'scope-a');
    registry.register('beta', { name: 'Beta' }, 'scope-b');

    expect(registry.list()).toEqual([{ name: 'Alpha' }, { name: 'Beta' }]);
  });
});
