import Dexie, { type Table } from 'dexie';

import type { RoccoPlaneScene, RoccoPlaneSceneRecord } from '../video/planes';
import type { SaveEnvelopeRow, SceneStoreKey, SaveStoreKey } from './types';

interface RoccoLegacyPlaneSceneRecordRow {
  id: string;
  cartridgeId?: string;
  sceneId?: string;
  scene: RoccoPlaneScene;
  updatedAt: number;
}

export interface RoccoPlaneSceneRecordRow {
  id: string;
  cartridgeId: string;
  sceneId: string;
  scene: RoccoPlaneScene;
  updatedAt: number;
}

export class RoccoDatabase extends Dexie {
  scenes!: Table<RoccoLegacyPlaneSceneRecordRow, string>;
  scenes_v4!: Table<RoccoPlaneSceneRecordRow, SceneStoreKey>;
  saves!: Table<SaveEnvelopeRow, SaveStoreKey>;

  constructor() {
    super('rocco_db');
    this.version(2).stores({
      saves: '++id, sceneId, updatedAt',
      scenes: 'id, updatedAt',
      planeAssets: 'id, kind, updatedAt',
    });
    this.version(3).stores({
      // eslint-disable-next-line unicorn/no-null -- Dexie uses `null` to drop an object store on upgrade.
      saves: null,
      scenes: 'id, updatedAt',
      // eslint-disable-next-line unicorn/no-null -- Dexie uses `null` to drop an object store on upgrade.
      planeAssets: null,
    });
    this.version(4).stores({
      scenes_v4: '[cartridgeId+sceneId], updatedAt',
    });
    this.version(5).stores({
      saves: '[cartridgeId+profileId+slotId], [cartridgeId+profileId], updatedAt',
    });
  }
}

const databaseState = {
  instance: undefined as RoccoDatabase | undefined,
  migrationPromise: undefined as Promise<void> | undefined,
};

/**
 * Lazily opens the singleton IndexedDB database. Recreated after
 * {@link closeRoccoDatabase} so the resource can be released on runtime
 * dispose and reopened transparently (audit ROCCO-014: resource close).
 */
export function getRoccoDatabase(): RoccoDatabase {
  if (!databaseState.instance) {
    databaseState.instance = new RoccoDatabase();
  }
  return databaseState.instance;
}

/** Closes the singleton database, releasing the IndexedDB connection. */
export function closeRoccoDatabase(): void {
  if (databaseState.instance) {
    databaseState.instance.close();
    databaseState.instance = undefined;
  }
  databaseState.migrationPromise = undefined;
}

async function migrateLegacyScenes(): Promise<void> {
  if (databaseState.migrationPromise) {
    return databaseState.migrationPromise;
  }

  databaseState.migrationPromise = (async () => {
    const database_ = getRoccoDatabase();
    const legacy = await database_.scenes.toArray();
    if (legacy.length === 0) {
      return;
    }

    await database_.transaction('rw', database_.scenes, database_.scenes_v4, async () => {
      for (const row of legacy) {
        const owner = resolveLegacySceneOwner(row);
        const sceneId = row.sceneId || row.id;
        const key: SceneStoreKey = [owner, sceneId];
        const exists = await database_.scenes_v4.get(key);
        if (!exists) {
          await database_.scenes_v4.put({
            id: `${owner}:${sceneId}`,
            cartridgeId: owner,
            sceneId,
            scene: row.scene,
            updatedAt: row.updatedAt,
          });
        }
      }
    });
  })();

  return databaseState.migrationPromise;
}

function resolveLegacySceneOwner(row: RoccoLegacyPlaneSceneRecordRow): string {
  const owner = row.cartridgeId?.trim();
  if (owner) {
    return owner;
  }

  return 'rocco-default';
}

export async function loadPlaneSceneRecord(
  cartridgeId: string,
  sceneId: string,
): Promise<RoccoPlaneSceneRecord | null> {
  await migrateLegacyScenes();
  const database_ = getRoccoDatabase();

  const key: SceneStoreKey = [cartridgeId, sceneId];
  const row = await database_.scenes_v4.get(key);
  if (!row) {
    // eslint-disable-next-line unicorn/no-null -- public contract returns `| null` to keep SDK callers stable.
    return null;
  }

  return {
    id: row.sceneId,
    scene: row.scene,
    updatedAt: row.updatedAt,
  };
}

export async function savePlaneScene(
  cartridgeId: string,
  scene: RoccoPlaneScene,
): Promise<RoccoPlaneSceneRecord> {
  await migrateLegacyScenes();
  const database_ = getRoccoDatabase();

  const record: RoccoPlaneSceneRecordRow = {
    id: `${cartridgeId}:${scene.id}`,
    cartridgeId,
    sceneId: scene.id,
    scene,
    updatedAt: Date.now(),
  };
  await database_.scenes_v4.put(record);
  return {
    id: scene.id,
    scene,
    updatedAt: record.updatedAt,
  };
}
