import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RoccoPlaneScene } from '../../../src/console/video/planes';

const TEST_CARTRIDGE_ID = 'test-cartridge';

type PrimitiveKey = string | number | (string | number)[];

class MockTable<T extends { id: string }> {
  private readonly rows = new Map<string, T>();

  private serializeKey(key: PrimitiveKey): string {
    if (Array.isArray(key)) {
      return key.join(':');
    }
    return String(key);
  }

  count(): Promise<number> {
    return Promise.resolve(this.rows.size);
  }

  toArray(): Promise<T[]> {
    return Promise.resolve(this.rows.values().map((row) => structuredClone(row)).toArray());
  }

  get(key: PrimitiveKey): Promise<T | undefined> {
    const row = this.rows.get(this.serializeKey(key));
    return Promise.resolve(row ? structuredClone(row) : undefined);
  }

  put(row: T): Promise<string> {
    this.rows.set(row.id, structuredClone(row));
    return Promise.resolve(row.id);
  }

  bulkPut(rows: T[]): Promise<void> {
    for (const row of rows) {
      this.rows.set(row.id, structuredClone(row));
    }
    return Promise.resolve();
  }
}

class MockDexie {
  scenes?: MockTable<{ id: string; updatedAt: number; scene: unknown }>;
  scenes_v4?: MockTable<{
    id: string;
    cartridgeId: string;
    sceneId: string;
    scene: unknown;
    updatedAt: number;
  }>;

  constructor(_databaseName: string) {}

  version(_version: number) {
    return {
      stores: (schema: Record<string, string | null>) => {
        for (const tableName of Object.keys(schema)) {
          if (tableName === 'scenes') {
            this.scenes ??= new MockTable<{
              id: string;
              updatedAt: number;
              scene: unknown;
            }>();
          } else if (tableName === 'scenes_v4') {
            this.scenes_v4 ??= new MockTable<{
              id: string;
              cartridgeId: string;
              sceneId: string;
              scene: unknown;
              updatedAt: number;
            }>();
          }
        }
        return this;
      },
    };
  }
}

vi.mock('dexie', () => ({
  default: MockDexie,
}));

async function importPersistenceModule() {
  return import('../../../src/console/persistence/database');
}

beforeEach(() => {
  vi.resetModules();
});

describe('persistence namespacing', () => {
  it('saves and loads a scene scoped to a cartridge', async () => {
    const { loadPlaneSceneRecord, savePlaneScene } = await importPersistenceModule();
    const scene = {
      id: 'scene-1',
      planes: [],
      palettes: [],
      colorRegisterSets: [],
      attributeMaps: [],
    };

    await savePlaneScene(TEST_CARTRIDGE_ID, scene);
    const loaded = await loadPlaneSceneRecord(TEST_CARTRIDGE_ID, 'scene-1');

    expect(loaded?.id).toBe('scene-1');
    expect(loaded?.scene).toEqual(scene);
  });

  it('does not collide between cartridges with the same scene id', async () => {
    const { loadPlaneSceneRecord, savePlaneScene } = await importPersistenceModule();
    const sceneA = {
      id: 'scene-1',
      planes: [{ id: 'plane-a' }],
      palettes: [],
      colorRegisterSets: [],
      attributeMaps: [],
    } as unknown as RoccoPlaneScene;
    const sceneB = {
      id: 'scene-1',
      planes: [{ id: 'plane-b' }],
      palettes: [],
      colorRegisterSets: [],
      attributeMaps: [],
    } as unknown as RoccoPlaneScene;

    await savePlaneScene('cartridge-a', sceneA);
    await savePlaneScene('cartridge-b', sceneB);

    const loadedA = await loadPlaneSceneRecord('cartridge-a', 'scene-1');
    const loadedB = await loadPlaneSceneRecord('cartridge-b', 'scene-1');

    expect(loadedA?.scene.planes[0].id).toBe('plane-a');
    expect(loadedB?.scene.planes[0].id).toBe('plane-b');
  });
});
