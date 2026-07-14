import { describe, expect, it } from 'vitest';

import { createSaveRepository } from '../../../src/console/persistence/save-repository';
import type {
  CartridgeSaveProvider,
  SaveEnvelopeRow,
  SaveStore,
  SaveStoreKey,
} from '../../../src/console/persistence/types';
import {
  SaveQuotaExceededError,
  SaveRevisionConflictError,
  SaveSchemaError,
} from '../../../src/console/persistence/types';

interface TestState {
  level: number;
  migrated?: boolean;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function serializeKey(key: SaveStoreKey): string {
  return `${key[0]}:${key[1]}:${key[2]}`;
}

/** In-memory `SaveStore` with real transaction roll-back semantics. */
class MemorySaveStore implements SaveStore {
  protected readonly rows = new Map<string, SaveEnvelopeRow>();

  async get(key: SaveStoreKey): Promise<SaveEnvelopeRow | undefined> {
    await Promise.resolve();
    const row = this.rows.get(serializeKey(key));
    return row ? clone(row) : undefined;
  }

  async put(row: SaveEnvelopeRow): Promise<void> {
    this.rows.set(row.key, clone(row));
    await Promise.resolve();
  }

  async queryByProfile(
    cartridgeId: string,
    profileId: string,
  ): Promise<SaveEnvelopeRow[]> {
    await Promise.resolve();
    return [...this.rows.values()]
      .filter((row) => row.cartridgeId === cartridgeId && row.profileId === profileId)
      .map((row) => clone(row));
  }

  async delete(key: SaveStoreKey): Promise<void> {
    await Promise.resolve();
    this.rows.delete(serializeKey(key));
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    const snapshot = new Map(this.rows);
    try {
      return await work();
    } catch (error) {
      this.rows.clear();
      for (const [key, value] of snapshot) {
        this.rows.set(key, value);
      }
      throw error;
    }
  }
}

/** A store whose `put` always fails with a quota error. */
class QuotaSaveStore extends MemorySaveStore {
  override async put(row: SaveEnvelopeRow): Promise<void> {
    await super.put(row);
    const error = new Error('quota') as Error & { name: string };
    error.name = 'QuotaExceededError';
    throw error;
  }
}

/**
 * A store that performs every write inside the transaction but crashes at
 * commit. Proves the repository's in-transaction writes are rolled back
 * when the commit fails (no partial save published).
 */
class CommitCrashStore extends MemorySaveStore {
  override async transaction<T>(work: () => Promise<T>): Promise<T> {
    const snapshot = new Map(this.rows);
    try {
      await work();
      throw new Error('commit crash');
    } catch (error) {
      this.rows.clear();
      for (const [key, value] of snapshot) {
        this.rows.set(key, value);
      }
      throw error;
    }
  }
}

function makeProvider(
  schemaVersion: number,
  state: TestState,
): CartridgeSaveProvider<TestState> {
  return {
    schemaVersion,
    serializeState: () => clone(state),
    migrateState: (from: number, payload: unknown) => {
      if (from < schemaVersion) {
        return { ...(payload as TestState), migrated: true };
      }
      return payload as TestState;
    },
  };
}

function seedRow(
  _store: MemorySaveStore,
  partial: Omit<SaveEnvelopeRow, 'cartridgeId' | 'cartridgeVersion' | 'key'> &
    Partial<Pick<SaveEnvelopeRow, 'cartridgeId' | 'cartridgeVersion'>>,
): SaveEnvelopeRow {
  const row: SaveEnvelopeRow = {
    key: `${partial.cartridgeId ?? 'cart'}:${partial.profileId}:${partial.slotId}`,
    cartridgeId: partial.cartridgeId ?? 'cart',
    cartridgeVersion: partial.cartridgeVersion ?? '0.1.0',
    schemaVersion: partial.schemaVersion,
    profileId: partial.profileId,
    slotId: partial.slotId,
    revision: partial.revision,
    createdAt: partial.createdAt,
    updatedAt: partial.updatedAt,
    payload: partial.payload,
  };
  return row;
}

describe('versioned save repository', () => {
  it('round-trips payload and metadata on save/load', async () => {
    const store = new MemorySaveStore();
    const state: TestState = { level: 3 };
    const repo = createSaveRepository({
      cartridgeId: 'cart',
      cartridgeVersion: '0.1.0',
      provider: makeProvider(1, state),
      store,
    });

    const meta = await repo.save('player-1', 'slot-a');
    expect(meta.cartridgeId).toBe('cart');
    expect(meta.cartridgeVersion).toBe('0.1.0');
    expect(meta.schemaVersion).toBe(1);
    expect(meta.profileId).toBe('player-1');
    expect(meta.slotId).toBe('slot-a');
    expect(meta.revision).toBe(1);

    const loaded = await repo.load('player-1', 'slot-a');
    expect(loaded).toEqual({ level: 3 });
  });

  it('increments the revision on each save', async () => {
    const store = new MemorySaveStore();
    const repo = createSaveRepository({
      cartridgeId: 'cart',
      cartridgeVersion: '0.1.0',
      provider: makeProvider(1, { level: 1 }),
      store,
    });

    expect((await repo.save('p', 's')).revision).toBe(1);
    expect((await repo.save('p', 's')).revision).toBe(2);
    expect((await repo.save('p', 's')).revision).toBe(3);

    const loaded = await repo.load('p', 's');
    expect(loaded).toEqual({ level: 1 });
  });

  it('rejects a stale expectedRevision and publishes nothing', async () => {
    const store = new MemorySaveStore();
    await store.put(
      seedRow(store, {
        profileId: 'p',
        slotId: 's',
        schemaVersion: 1,
        revision: 5,
        createdAt: 100,
        updatedAt: 100,
        payload: { level: 1 },
      }),
    );

    const repo = createSaveRepository({
      cartridgeId: 'cart',
      cartridgeVersion: '0.1.0',
      provider: makeProvider(1, { level: 99 }),
      store,
    });

    await expect(repo.save('p', 's', { expectedRevision: 5 })).resolves.toMatchObject({
      revision: 6,
    });

    await expect(
      repo.save('p', 's', { expectedRevision: 5 }),
    ).rejects.toBeInstanceOf(SaveRevisionConflictError);

    const after = await store.get(['cart', 'p', 's']);
    expect(after?.revision).toBe(6);
    expect(after?.payload).toEqual({ level: 99 });
  });

  it('migrates a v1 payload forward to v2 on load and persists it', async () => {
    const store = new MemorySaveStore();
    await store.put(
      seedRow(store, {
        profileId: 'p',
        slotId: 's',
        schemaVersion: 1,
        revision: 2,
        createdAt: 50,
        updatedAt: 50,
        payload: { level: 7 },
      }),
    );

    const repo = createSaveRepository({
      cartridgeId: 'cart',
      cartridgeVersion: '0.1.0',
      provider: makeProvider(2, { level: 7 }),
      store,
    });

    const loaded = await repo.load('p', 's');
    expect(loaded).toEqual({ level: 7, migrated: true });

    const reloaded = await repo.load('p', 's');
    expect(reloaded).toEqual({ level: 7, migrated: true });

    const row = await store.get(['cart', 'p', 's']);
    expect(row?.schemaVersion).toBe(2);
  });

  it('throws SaveSchemaError when the stored schema is newer than supported', async () => {
    const store = new MemorySaveStore();
    await store.put(
      seedRow(store, {
        profileId: 'p',
        slotId: 's',
        schemaVersion: 3,
        revision: 1,
        createdAt: 1,
        updatedAt: 1,
        payload: { level: 1 },
      }),
    );

    const repo = createSaveRepository({
      cartridgeId: 'cart',
      cartridgeVersion: '0.1.0',
      provider: makeProvider(2, { level: 1 }),
      store,
    });

    await expect(repo.load('p', 's')).rejects.toBeInstanceOf(SaveSchemaError);
  });

  it('never collides across cartridges, profiles, or slots', async () => {
    const store = new MemorySaveStore();
    const repoA = createSaveRepository({
      cartridgeId: 'cart-a',
      cartridgeVersion: '0.1.0',
      provider: makeProvider(1, { level: 1 }),
      store,
    });
    const repoB = createSaveRepository({
      cartridgeId: 'cart-b',
      cartridgeVersion: '0.1.0',
      provider: makeProvider(1, { level: 2 }),
      store,
    });

    await repoA.save('profile-1', 'shared');
    await repoB.save('profile-1', 'shared');

    expect(await repoA.load('profile-1', 'shared')).toEqual({ level: 1 });
    expect(await repoB.load('profile-1', 'shared')).toEqual({ level: 2 });
    expect(await repoA.load('profile-1', 'shared')).not.toEqual(
      await repoB.load('profile-1', 'shared'),
    );
  });

  it('lists only the requested profile slots', async () => {
    const store = new MemorySaveStore();
    const repo = createSaveRepository({
      cartridgeId: 'cart',
      cartridgeVersion: '0.1.0',
      provider: makeProvider(1, { level: 1 }),
      store,
    });

    await repo.save('p', 's1');
    await repo.save('p', 's2');
    await repo.save('q', 's3');

    const pSlots = await repo.listSlots('p');
    const qSlots = await repo.listSlots('q');

    expect(pSlots.map((s) => s.slotId).sort()).toEqual(['s1', 's2']);
    expect(qSlots.map((s) => s.slotId)).toEqual(['s3']);
  });

  it('removes a slot on delete', async () => {
    const store = new MemorySaveStore();
    const repo = createSaveRepository({
      cartridgeId: 'cart',
      cartridgeVersion: '0.1.0',
      provider: makeProvider(1, { level: 1 }),
      store,
    });

    await repo.save('p', 's');
    expect(await repo.load('p', 's')).not.toBeNull();

    await repo.delete('p', 's');
    expect(await repo.load('p', 's')).toBeNull();
  });

  it('migrates on exportSave then round-trips through importSave', async () => {
    const storeA = new MemorySaveStore();
    await storeA.put(
      seedRow(storeA, {
        profileId: 'p',
        slotId: 's',
        schemaVersion: 1,
        revision: 2,
        createdAt: 50,
        updatedAt: 50,
        payload: { level: 4 },
      }),
    );
    const repoA = createSaveRepository({
      cartridgeId: 'cart',
      cartridgeVersion: '0.1.0',
      provider: makeProvider(2, { level: 0 }),
      store: storeA,
    });

    const envelope = await repoA.exportSave('p', 's');
    expect(envelope).not.toBeNull();
    expect(envelope?.schemaVersion).toBe(2);
    expect(envelope?.payload).toEqual({ level: 4, migrated: true });

    const storeB = new MemorySaveStore();
    const repoB = createSaveRepository({
      cartridgeId: 'cart',
      cartridgeVersion: '0.1.0',
      provider: makeProvider(2, { level: 0 }),
      store: storeB,
    });

    await repoB.importSave(envelope!);
    expect(await repoB.load('p', 's')).toEqual({ level: 4, migrated: true });
  });

  it('surfaces quota errors as SaveQuotaExceededError', async () => {
    const store = new QuotaSaveStore();
    const repo = createSaveRepository({
      cartridgeId: 'cart',
      cartridgeVersion: '0.1.0',
      provider: makeProvider(1, { level: 1 }),
      store,
    });

    await expect(repo.save('p', 's')).rejects.toBeInstanceOf(SaveQuotaExceededError);
    expect(await store.get(['cart', 'p', 's'])).toBeUndefined();
  });

  it('rolls back a failed save so no partial row is published', async () => {
    const store = new CommitCrashStore();
    await store.put(
      seedRow(store, {
        profileId: 'p',
        slotId: 's',
        schemaVersion: 1,
        revision: 4,
        createdAt: 1,
        updatedAt: 1,
        payload: { level: 1 },
      }),
    );

    const repo = createSaveRepository({
      cartridgeId: 'cart',
      cartridgeVersion: '0.1.0',
      provider: makeProvider(1, { level: 9 }),
      store,
    });

    await expect(repo.save('p', 's')).rejects.toThrow('commit crash');

    const after = await store.get(['cart', 'p', 's']);
    expect(after?.revision).toBe(4);
    expect(after?.payload).toEqual({ level: 1 });
  });
});
