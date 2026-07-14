import { beforeEach, describe, expect, it } from 'vitest';

import { RoccoDatabase } from '../../../src/console/persistence/db';
import { DexieSaveStore } from '../../../src/console/persistence/store';
import { createSaveRepository as createSaveRepo } from '../../../src/console/persistence/save-repository';
import type {
  CartridgeSaveProvider,
  SaveEnvelopeRow,
  SaveStore,
} from '../../../src/console/persistence/types';
import { SaveRevisionConflictError, SaveSchemaError } from '../../../src/console/persistence/types';
import type { RoccoPlaneScene } from '../../../src/console/video/planes';

interface TestState {
  level: number;
}

async function resetPersistenceDatabase(): Promise<void> {
  const { closeRoccoDatabase } = await import('../../../src/console/persistence/db');
  closeRoccoDatabase();

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('rocco_db');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('indexeddb delete failed'));
    request.onblocked = () => reject(new Error('indexeddb delete blocked'));
  });
}

function makeProvider(schemaVersion: number): CartridgeSaveProvider<TestState> {
  return {
    schemaVersion,
    serializeState: () => ({ level: 1 }),
    migrateState: (_from: number, payload: unknown) => ({
      ...(payload as TestState),
      migrated: true,
    }),
  };
}

function makeScene(overrides: Partial<RoccoPlaneScene> = {}): RoccoPlaneScene {
  return {
    id: 'scene-1',
    planes: [
      {
        id: 'plane-1',
        enabled: true,
        source: { kind: 'solid', color: '#000000' },
        colorModel: { kind: 'native' },
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
        scroll: { x: 0, y: 0 },
        wrap: { x: false, y: false },
        opacity: 1,
        priority: 0,
        visible: true,
      },
    ],
    palettes: [],
    colorRegisterSets: [],
    attributeMaps: [],
    ...overrides,
  };
}

describe('Dexie persistence with real IndexedDB', () => {
  beforeEach(async () => {
    await resetPersistenceDatabase();
  });

  describe('scene store', () => {
    it('round-trips a scene through savePlaneScene and loadPlaneSceneRecord', async () => {
      const { loadPlaneSceneRecord, savePlaneScene } = await import('../../../src/console/persistence/db');
      const scene = makeScene();

      await savePlaneScene('cart', scene);

      const loaded = await loadPlaneSceneRecord('cart', 'scene-1');
      expect(loaded?.id).toBe('scene-1');
      expect(loaded?.scene).toEqual(scene);
    });

    it('saves and loads a scene through the real database', async () => {
      const database = new RoccoDatabase();
      const scene = makeScene();

      await database.scenes_v4.put({
        id: 'cart:scene-1',
        cartridgeId: 'cart',
        sceneId: 'scene-1',
        scene,
        updatedAt: Date.now(),
      });

      const row = await database.scenes_v4.get(['cart', 'scene-1']);
      expect(row).toBeDefined();
      expect(row?.sceneId).toBe('scene-1');
      expect(row?.scene.planes[0].id).toBe('plane-1');
    });

    it('does not collide between cartridges with the same scene id', async () => {
      const database = new RoccoDatabase();

      await database.scenes_v4.put({
        id: 'cart-a:scene-1',
        cartridgeId: 'cart-a',
        sceneId: 'scene-1',
        scene: makeScene({ planes: [{ id: 'plane-a', enabled: true, source: { kind: 'solid', color: '#000000' }, colorModel: { kind: 'native' }, transform: { x: 0, y: 0, scaleX: 1, scaleY: 1 }, scroll: { x: 0, y: 0 }, wrap: { x: false, y: false }, opacity: 1, priority: 0, visible: true }] }),
        updatedAt: Date.now(),
      });

      await database.scenes_v4.put({
        id: 'cart-b:scene-1',
        cartridgeId: 'cart-b',
        sceneId: 'scene-1',
        scene: makeScene({ planes: [{ id: 'plane-b', enabled: true, source: { kind: 'solid', color: '#000000' }, colorModel: { kind: 'native' }, transform: { x: 0, y: 0, scaleX: 1, scaleY: 1 }, scroll: { x: 0, y: 0 }, wrap: { x: false, y: false }, opacity: 1, priority: 0, visible: true }] }),
        updatedAt: Date.now(),
      });

      const rowA = await database.scenes_v4.get(['cart-a', 'scene-1']);
      const rowB = await database.scenes_v4.get(['cart-b', 'scene-1']);

      expect(rowA?.cartridgeId).toBe('cart-a');
      expect(rowB?.cartridgeId).toBe('cart-b');
      expect(rowA?.scene.planes[0].id).toBe('plane-a');
      expect(rowB?.scene.planes[0].id).toBe('plane-b');
    });
  });

  describe('save store', () => {
    it('increments revision on each save', async () => {
      const database = new RoccoDatabase();
      const store = new DexieSaveStore(database);
      const repo = createSaveRepo<TestState>({
        cartridgeId: 'cart',
        cartridgeVersion: '1.0.0',
        provider: makeProvider(1),
        store,
      });

      expect((await repo.save('p', 's')).revision).toBe(1);
      expect((await repo.save('p', 's')).revision).toBe(2);
      expect((await repo.save('p', 's')).revision).toBe(3);
    });

    it('rejects a stale expectedRevision when the slot does not exist', async () => {
      const database = new RoccoDatabase();
      const store = new DexieSaveStore(database);
      const repo = createSaveRepo<TestState>({
        cartridgeId: 'cart',
        cartridgeVersion: '1.0.0',
        provider: makeProvider(1),
        store,
      });

      await expect(
        repo.save('p', 's', { expectedRevision: 5 }),
      ).rejects.toBeInstanceOf(SaveRevisionConflictError);
    });

    it('deletes a slot and load returns null', async () => {
      const database = new RoccoDatabase();
      const store = new DexieSaveStore(database);
      const repo = createSaveRepo<TestState>({
        cartridgeId: 'cart',
        cartridgeVersion: '1.0.0',
        provider: makeProvider(1),
        store,
      });

      await repo.save('p', 's');
      expect(await repo.load('p', 's')).toEqual({ level: 1 });

      await repo.delete('p', 's');
      expect(await repo.load('p', 's')).toBeNull();
    });

    it('rejects import from a different cartridge', async () => {
      const database = new RoccoDatabase();
      const store = new DexieSaveStore(database);
      const repo = createSaveRepo<TestState>({
        cartridgeId: 'cart-a',
        cartridgeVersion: '1.0.0',
        provider: makeProvider(1),
        store,
      });

      await expect(
        repo.importSave({
          cartridgeId: 'cart-b',
          cartridgeVersion: '1.0.0',
          schemaVersion: 1,
          profileId: 'p',
          slotId: 's',
          revision: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          payload: { level: 9 },
        }),
      ).rejects.toBeInstanceOf(SaveSchemaError);
    });

    it('rejects import with invalid revision or timestamps', async () => {
      const database = new RoccoDatabase();
      const store = new DexieSaveStore(database);
      const repo = createSaveRepo<TestState>({
        cartridgeId: 'cart-a',
        cartridgeVersion: '1.0.0',
        provider: makeProvider(1),
        store,
      });

      await expect(
        repo.importSave({
          cartridgeId: 'cart-a',
          cartridgeVersion: '1.0.0',
          schemaVersion: 1,
          profileId: 'p',
          slotId: 's',
          revision: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          payload: { level: 9 },
        }),
      ).rejects.toBeInstanceOf(SaveSchemaError);

      await expect(
        repo.importSave({
          cartridgeId: 'cart-a',
          cartridgeVersion: '1.0.0',
          schemaVersion: 1,
          profileId: 'p',
          slotId: 's',
          revision: 1,
          createdAt: 10,
          updatedAt: 5,
          payload: { level: 9 },
        }),
      ).rejects.toBeInstanceOf(SaveSchemaError);
    });

    it('persists migrated export metadata with bumped revision and current cartridge version', async () => {
      const database = new RoccoDatabase();
      const store = new DexieSaveStore(database);
      const seed: SaveEnvelopeRow = {
        key: 'cart:p:s',
        cartridgeId: 'cart',
        cartridgeVersion: '0.1.0',
        schemaVersion: 1,
        profileId: 'p',
        slotId: 's',
        revision: 4,
        createdAt: 10,
        updatedAt: 10,
        payload: { level: 7 },
      };
      await store.put(seed);

      const repo = createSaveRepo<TestState>({
        cartridgeId: 'cart',
        cartridgeVersion: '2.0.0',
        provider: makeProvider(2),
        store,
      });

      const exported = await repo.exportSave('p', 's');
      expect(exported?.schemaVersion).toBe(2);
      expect(exported?.cartridgeVersion).toBe('2.0.0');
      expect(exported?.revision).toBe(5);

      const row = await store.get(['cart', 'p', 's']);
      expect(row?.schemaVersion).toBe(2);
      expect(row?.cartridgeVersion).toBe('2.0.0');
      expect(row?.revision).toBe(5);
    });

    it('rolls back a failed transaction so no partial row is published', async () => {
      const database = new RoccoDatabase();
      const store = new DexieSaveStore(database);

      const failingStore: SaveStore = {
        get: store.get.bind(store),
        put: async (_row: SaveEnvelopeRow): Promise<void> => {
          await store.put({
            key: 'rollback:profile:slot',
            cartridgeId: 'rollback',
            cartridgeVersion: '1.0.0',
            schemaVersion: 1,
            profileId: 'profile',
            slotId: 'slot',
            revision: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            payload: { level: 1 },
          });
          throw new Error('commit crash');
        },
        queryByProfile: store.queryByProfile.bind(store),
        delete: store.delete.bind(store),
        transaction: store.transaction.bind(store),
      };

      const repo = createSaveRepo<TestState>({
        cartridgeId: 'cart',
        cartridgeVersion: '1.0.0',
        provider: makeProvider(1),
        store: failingStore,
      });

      await expect(repo.save('p', 's')).rejects.toThrow(new Error('commit crash'));
      expect(await store.get(['rollback', 'profile', 'slot'])).toBeUndefined();
    });
  });

  describe('legacy scene migration', () => {
    it('migrates partial legacy rows and resumes pending ones', async () => {
      const { closeRoccoDatabase, loadPlaneSceneRecord } = await import('../../../src/console/persistence/db');

      closeRoccoDatabase();
      await resetPersistenceDatabase();

      const database = new RoccoDatabase();

      await database.scenes.put({
        id: 'old-1',
        cartridgeId: '',
        sceneId: 'old-1',
        scene: makeScene({ id: 'old-1' }),
        updatedAt: 100,
      });

      await database.scenes.put({
        id: 'old-2',
        cartridgeId: '',
        sceneId: 'old-2',
        scene: makeScene({ id: 'old-2' }),
        updatedAt: 200,
      });

      await database.scenes_v4.put({
        id: 'rocco-default:old-1',
        cartridgeId: 'rocco-default',
        sceneId: 'old-1',
        scene: makeScene({ id: 'old-1' }),
        updatedAt: 100,
      });

      await loadPlaneSceneRecord('rocco-default', 'old-2');

      const row = await database.scenes_v4.get(['rocco-default', 'old-2']);
      expect(row).toBeDefined();
      expect(row?.sceneId).toBe('old-2');
      expect(row?.cartridgeId).toBe('rocco-default');

      const row2 = await database.scenes_v4.get(['rocco-default', 'old-1']);
      expect(row2?.sceneId).toBe('old-1');
    });
  });
});
