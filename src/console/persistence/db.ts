import Dexie, { type Table } from 'dexie';

import type { RoccoPlaneScene, RoccoPlaneSceneRecord } from '../video/planes/types';

class RoccoDatabase extends Dexie {
  scenes!: Table<RoccoPlaneSceneRecord, string>;

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
  }
}

const db = new RoccoDatabase();

export async function loadPlaneSceneRecord(sceneId: string): Promise<RoccoPlaneSceneRecord | null> {
  const record = await db.scenes.get(sceneId);
  return record ?? null;
}

export async function savePlaneScene(scene: RoccoPlaneScene): Promise<RoccoPlaneSceneRecord> {
  const record: RoccoPlaneSceneRecord = {
    id: scene.id,
    scene,
    updatedAt: Date.now(),
  };
  await db.scenes.put(record);
  return record;
}
