import Dexie, { type Table } from 'dexie';

import type { RoccoPlaneScene, RoccoPlaneSceneRecord } from '../video/planes';
import type { SaveEnvelopeRow } from './types';

export interface RoccoPlaneSceneRecordRow {
  id: string;
  cartridgeId: string;
  sceneId: string;
  scene: RoccoPlaneScene;
  updatedAt: number;
}

export class RoccoDatabase extends Dexie {
  scenes!: Table<RoccoPlaneSceneRecordRow, string>;
  scenes_v4!: Table<RoccoPlaneSceneRecordRow, string>;
  saves!: Table<SaveEnvelopeRow, string>;

  constructor() {
    super('rocco_db');
    this.version(2).stores({
      saves: '++id, sceneId, updatedAt',
      scenes: 'id, updatedAt',
      planeAssets: 'id, kind, updatedAt',
    });
    this.version(3).stores({
      saves: null,
      scenes: 'id, updatedAt',
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

let database: RoccoDatabase | null = null;

/**
 * Lazily opens the singleton IndexedDB database. Recreated after
 * {@link closeRoccoDatabase} so the resource can be released on runtime
 * dispose and reopened transparently (audit ROCCO-014: resource close).
 */
export function getRoccoDatabase(): RoccoDatabase {
  if (!database) {
    database = new RoccoDatabase();
  }
  return database;
}

/** Closes the singleton database, releasing the IndexedDB connection. */
export function closeRoccoDatabase(): void {
  if (database) {
    database.close();
    database = null;
  }
  migrationPromise = null;
}

let migrationPromise: Promise<void> | null = null;

async function migrateLegacyScenes(): Promise<void> {
  if (migrationPromise) {
    return migrationPromise;
  }

  migrationPromise = (async () => {
    const db = getRoccoDatabase();
    const hasNewTable = await db.scenes_v4.count();
    if (hasNewTable > 0) {
      return;
    }

    const legacy = await db.scenes.toArray();
    if (legacy.length === 0) {
      return;
    }

    await db.scenes_v4.bulkPut(
      legacy.map((row) => ({
        id: row.id,
        cartridgeId: 'legacy',
        sceneId: row.id,
        scene: row.scene,
        updatedAt: row.updatedAt,
      })),
    );
  })();

  return migrationPromise;
}

export async function loadPlaneSceneRecord(
  cartridgeId: string,
  sceneId: string,
): Promise<RoccoPlaneSceneRecord | null> {
  await migrateLegacyScenes();
  const db = getRoccoDatabase();

  const id = `${cartridgeId}:${sceneId}`;
  const row = await db.scenes_v4.get(id);
  if (!row) {
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
  const db = getRoccoDatabase();

  const id = `${cartridgeId}:${scene.id}`;
  const record: RoccoPlaneSceneRecordRow = {
    id,
    cartridgeId,
    sceneId: scene.id,
    scene,
    updatedAt: Date.now(),
  };
  await db.scenes_v4.put(record);
  return {
    id: scene.id,
    scene,
    updatedAt: record.updatedAt,
  };
}
