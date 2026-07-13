import Dexie, { type Table } from 'dexie';

import type { RoccoPlaneScene, RoccoPlaneSceneRecord } from '../video/planes/types';

export interface RoccoPlaneSceneRecordRow {
  id: string;
  cartridgeId: string;
  sceneId: string;
  scene: RoccoPlaneScene;
  updatedAt: number;
}

class RoccoDatabase extends Dexie {
  scenes!: Table<RoccoPlaneSceneRecordRow, string>;
  scenes_v4!: Table<RoccoPlaneSceneRecordRow, string>;

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
  }
}

const db = new RoccoDatabase();

let migrationPromise: Promise<void> | null = null;

async function migrateLegacyScenes(): Promise<void> {
  if (migrationPromise) {
    return migrationPromise;
  }

  migrationPromise = (async () => {
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
