import { beforeEach, describe, expect, it, vi } from 'vitest';

const TEST_CARTRIDGE_ID = 'test-cartridge';

class MockTable<T extends { id: string }> {
  private readonly rows = new Map<string, T>();

  async count(): Promise<number> {
    return this.rows.size;
  }

  async toArray(): Promise<T[]> {
    return [...this.rows.values()].map((row) => structuredClone(row));
  }

  async get(id: string): Promise<T | undefined> {
    const row = this.rows.get(id);
    return row ? structuredClone(row) : undefined;
  }

  async put(row: T): Promise<string> {
    this.rows.set(row.id, structuredClone(row));
    return row.id;
  }

  async bulkPut(rows: T[]): Promise<void> {
    for (const row of rows) {
      this.rows.set(row.id, structuredClone(row));
    }
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
        const tables = this as unknown as Record<string, MockTable<{ id: string }> | undefined>;
        for (const tableName of Object.keys(schema)) {
          if (!tables[tableName]) {
            tables[tableName] = new MockTable<{ id: string }>();
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
  return import('../../../src/console/persistence/db');
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
    const sceneA = { id: 'scene-1', planes: [{ id: 'plane-a' } as any], palettes: [], colorRegisterSets: [], attributeMaps: [] };
    const sceneB = { id: 'scene-1', planes: [{ id: 'plane-b' } as any], palettes: [], colorRegisterSets: [], attributeMaps: [] };

    await savePlaneScene('cartridge-a', sceneA);
    await savePlaneScene('cartridge-b', sceneB);

    const loadedA = await loadPlaneSceneRecord('cartridge-a', 'scene-1');
    const loadedB = await loadPlaneSceneRecord('cartridge-b', 'scene-1');

    expect(loadedA?.scene.planes[0].id).toBe('plane-a');
    expect(loadedB?.scene.planes[0].id).toBe('plane-b');
  });
});
