import { describe, expect, it } from 'vitest';

import { RoccoDatabase } from '../../../src/console/persistence/db';
import { DexieSaveStore } from '../../../src/console/persistence/store';
import { createSaveRepository } from '../../../src/console/persistence/save-repository';
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
  describe('scene store', () => {
    it('saves and loads a scene through the real database', async () => {
      const db = new RoccoDatabase();
      const scene = makeScene();

      await db.scenes_v4.put({
        id: 'cart:scene-1',
        cartridgeId: 'cart',
        sceneId: 'scene-1',
        scene,
        updatedAt: Date.now(),
      });

      const row = await db.scenes_v4.get(['cart', 'scene-1']);
      expect(row).toBeDefined();
      expect(row?.sceneId).toBe('scene-1');
      expect(row?.scene.planes[0].id).toBe('plane-1');
    });

    it('does not collide between cartridges with the same scene id', async () => {
      const db = new RoccoDatabase();

      await db.scenes_v4.put({
        id: 'cart-a:scene-1',
        cartridgeId: 'cart-a',
        sceneId: 'scene-1',
        scene: makeScene({ planes: [{ id: 'plane-a', enabled: true, source: { kind: 'solid', color: '#000000' }, colorModel: { kind: 'native' }, transform: { x: 0, y: 0, scaleX: 1, scaleY: 1 }, scroll: { x: 0, y: 0 }, wrap: { x: false, y: false }, opacity: 1, priority: 0, visible: true }] }),
        updatedAt: Date.now(),
      });

      await db.scenes_v4.put({
        id: 'cart-b:scene-1',
        cartridgeId: 'cart-b',
        sceneId: 'scene-1',
        scene: makeScene({ planes: [{ id: 'plane-b', enabled: true, source: { kind: 'solid', color: '#000000' }, colorModel: { kind: 'native' }, transform: { x: 0, y: 0, scaleX: 1, scaleY: 1 }, scroll: { x: 0, y: 0 }, wrap: { x: false, y: false }, opacity: 1, priority: 0, visible: true }] }),
        updatedAt: Date.now(),
      });

      const rowA = await db.scenes_v4.get(['cart-a', 'scene-1']);
      const rowB = await db.scenes_v4.get(['cart-b', 'scene-1']);

      expect(rowA?.cartridgeId).toBe('cart-a');
      expect(rowB?.cartridgeId).toBe('cart-b');
      expect(rowA?.scene.planes[0].id).toBe('plane-a');
      expect(rowB?.scene.planes[0].id).toBe('plane-b');
    });
  });

  describe('save store', () => {
    it('increments revision on each save', async () => {
      const db = new RoccoDatabase();
      const store = new DexieSaveStore(db);
      const repo = createSaveRepository<TestState>({
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
      const db = new RoccoDatabase();
      const store = new DexieSaveStore(db);
      const repo = createSaveRepository<TestState>({
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
      const db = new RoccoDatabase();
      const store = new DexieSaveStore(db);
      const repo = createSaveRepository<TestState>({
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
      const db = new RoccoDatabase();
      const store = new DexieSaveStore(db);
      const repo = createSaveRepository<TestState>({
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

    it('rolls back a failed transaction so no partial row is published', async () => {
      const db = new RoccoDatabase();
      const store = new DexieSaveStore(db);

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

      const repo = createSaveRepository<TestState>({
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

      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase('rocco_db');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error('indexeddb delete failed'));
      });

      const db = new RoccoDatabase();

      await db.scenes.put({
        id: 'old-1',
        cartridgeId: '',
        sceneId: 'old-1',
        scene: makeScene({ id: 'old-1' }),
        updatedAt: 100,
      });

      await db.scenes.put({
        id: 'old-2',
        cartridgeId: '',
        sceneId: 'old-2',
        scene: makeScene({ id: 'old-2' }),
        updatedAt: 200,
      });

      await db.scenes_v4.put({
        id: 'rocco-default:old-1',
        cartridgeId: 'rocco-default',
        sceneId: 'old-1',
        scene: makeScene({ id: 'old-1' }),
        updatedAt: 100,
      });

      await loadPlaneSceneRecord('rocco-default', 'old-2');

      const row = await db.scenes_v4.get(['rocco-default', 'old-2']);
      expect(row).toBeDefined();
      expect(row?.sceneId).toBe('old-2');
      expect(row?.cartridgeId).toBe('rocco-default');

      const row2 = await db.scenes_v4.get(['rocco-default', 'old-1']);
      expect(row2?.sceneId).toBe('old-1');
    });
  });
});
