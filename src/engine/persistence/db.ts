import Dexie, { type Table } from 'dexie';

import type {
  RoccoPlaneAssetRecord,
  RoccoPlaneScene,
  RoccoPlaneSceneRecord,
} from '../video/planes/types';

class RoccoDatabase extends Dexie {
  scenes!: Table<RoccoPlaneSceneRecord, string>;
  planeAssets!: Table<RoccoPlaneAssetRecord, string>;

  constructor() {
    super('rocco_db');
    this.version(2).stores({
      saves: '++id, sceneId, updatedAt',
      scenes: 'id, updatedAt',
      planeAssets: 'id, kind, updatedAt',
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

export async function listPlaneScenes(): Promise<RoccoPlaneSceneRecord[]> {
  return db.scenes.orderBy('updatedAt').reverse().toArray();
}

export async function savePlaneAsset(asset: Omit<RoccoPlaneAssetRecord, 'updatedAt'>): Promise<void> {
  await db.planeAssets.put({
    ...asset,
    updatedAt: Date.now(),
  });
}
