import Dexie, { type Table, type Transaction } from 'dexie';

import type { RoccoPlaneScene, RoccoPlaneSceneRecord } from '../video/planes';
import {
  formatSaveKey,
  type SaveEnvelopeRow,
  type SceneStoreKey,
  type SaveStoreKey,
} from './types';

interface RoccoLegacyPlaneSceneRecordRow {
  id: string;
  cartridgeId?: string;
  sceneId?: string;
  scene: RoccoPlaneScene;
  updatedAt: number;
}

interface RoccoLegacySaveRecordRow {
  id?: number | string;
  key?: string;
  cartridgeId?: string;
  cartridgeVersion?: string;
  profileId?: string;
  slotId?: string;
  schemaVersion?: number;
  revision?: number;
  createdAt?: number;
  updatedAt?: number;
  payload?: unknown;
  state?: unknown;
  data?: unknown;
}

interface RoccoStagedSaveRecordRow {
  key: string;
  cartridgeId: string;
  cartridgeVersion: string;
  profileId: string;
  slotId: string;
  schemaVersion: number;
  revision: number;
  createdAt: number;
  updatedAt: number;
  payload: unknown;
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
  legacy_saves!: Table<RoccoStagedSaveRecordRow, string>;

  constructor() {
    super('rocco_db');
    this.version(2).stores({
      saves: '++id, sceneId, updatedAt',
      scenes: 'id, updatedAt',
      planeAssets: 'id, kind, updatedAt',
    });
    this.version(2.5)
      .stores({
        legacy_saves: 'key, cartridgeId, profileId, slotId, updatedAt',
      })
      .upgrade(stageLegacySaves);
    this.version(3).stores({
      saves: null,
      legacy_saves: 'key, cartridgeId, profileId, slotId, updatedAt',
      scenes: 'id, updatedAt',
      planeAssets: null,
    });
    this.version(4).stores({
      scenes_v4: '[cartridgeId+sceneId], updatedAt',
    });
    this.version(4.5)
      .stores({
        saves: '[cartridgeId+profileId+slotId], [cartridgeId+profileId], updatedAt',
      })
      .upgrade(restoreLegacySaves);
    this.version(5).stores({
      saves: '[cartridgeId+profileId+slotId], [cartridgeId+profileId], updatedAt',
      legacy_saves: null,
    });
  }
}

async function stageLegacySaves(transaction: Transaction): Promise<void> {
  const oldSaves = transaction.table<RoccoLegacySaveRecordRow>('saves');
  const stagedSaves = transaction.table<RoccoStagedSaveRecordRow>('legacy_saves');
  const rows = await oldSaves.toArray();

  for (const row of rows) {
    const staged = normalizeLegacySave(row);
    const existing = await stagedSaves.get(staged.key);
    if (!existing) {
      await stagedSaves.put(staged);
    }
  }
}

async function restoreLegacySaves(transaction: Transaction): Promise<void> {
  const stagedSaves = transaction.idbtrans.objectStoreNames.contains('legacy_saves')
    ? transaction.table<RoccoStagedSaveRecordRow>('legacy_saves')
    : undefined;
  if (!stagedSaves) {
    return;
  }

  const saves = transaction.table<SaveEnvelopeRow>('saves');
  const stagedRows = await stagedSaves.toArray();
  for (const staged of stagedRows) {
    const key: SaveStoreKey = [staged.cartridgeId, staged.profileId, staged.slotId];
    if (await saves.get(key)) {
      continue;
    }
    await saves.put({
      key: formatSaveKey(key),
      cartridgeId: staged.cartridgeId,
      cartridgeVersion: staged.cartridgeVersion,
      schemaVersion: staged.schemaVersion,
      profileId: staged.profileId,
      slotId: staged.slotId,
      revision: staged.revision,
      createdAt: staged.createdAt,
      updatedAt: staged.updatedAt,
      payload: staged.payload,
    });
  }
}

function normalizeLegacySave(row: RoccoLegacySaveRecordRow): RoccoStagedSaveRecordRow {
  const cartridgeId = row.cartridgeId?.trim() || 'rocco-default';
  const profileId = row.profileId?.trim() || 'default';
  const slotId = row.slotId?.trim() || 'legacy-' + String(row.id ?? '0');
  const updatedAt = normalizeTimestamp(row.updatedAt);
  const createdAt = normalizeTimestamp(row.createdAt) ?? updatedAt;
  const revision = normalizeRevision(row.revision);

  return {
    key: formatSaveKey([cartridgeId, profileId, slotId]),
    cartridgeId,
    cartridgeVersion: row.cartridgeVersion?.trim() || 'legacy',
    profileId,
    slotId,
    schemaVersion: normalizeSchemaVersion(row.schemaVersion),
    revision,
    createdAt,
    updatedAt,
    payload: row.payload ?? row.state ?? row.data ?? row,
  };
}

function normalizeTimestamp(value: number | undefined): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : Date.now();
}

function normalizeRevision(value: number | undefined): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : 1;
}

function normalizeSchemaVersion(value: number | undefined): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

const databaseState = {
  instance: undefined as RoccoDatabase | undefined,
  migrationPromise: undefined as Promise<void> | undefined,
};

/**
 * Lazily opens the singleton IndexedDB database. Recreated after
 * {@link closeRoccoDatabase} so the resource can be released on runtime
 * dispose and reopened transparently.
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
