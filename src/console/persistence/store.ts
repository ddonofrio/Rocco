/**
 * Dexie-backed implementation of {@link SaveStore}.
 *
 * Closes over the singleton database from `./db` and exposes the minimal
 * surface the versioned repository needs. Compound indexes are used so a single
 * slot key (`[cartridgeId+profileId+slotId]`) and profile listing
 * (`[cartridgeId+profileId]`) are both efficient.
 */

import type { RoccoDatabase } from './database';
import { getRoccoDatabase } from './database';
import type { SaveEnvelopeRow, SaveStore, SaveStoreKey } from './types';

export class DexieSaveStore implements SaveStore {
  private readonly db: RoccoDatabase;

  constructor(database?: RoccoDatabase) {
    this.db = database ?? getRoccoDatabase();
  }

  get(key: SaveStoreKey): Promise<SaveEnvelopeRow | undefined> {
    return this.db.saves.get(key);
  }

  async put(row: SaveEnvelopeRow): Promise<void> {
    await this.db.saves.put(row);
  }

  queryByProfile(
    cartridgeId: string,
    profileId: string,
  ): Promise<SaveEnvelopeRow[]> {
    return this.db.saves
      .where('[cartridgeId+profileId]')
      .equals([cartridgeId, profileId])
      .toArray();
  }

  async delete(key: SaveStoreKey): Promise<void> {
    await this.db.saves.delete(key);
  }

  transaction<T>(work: () => Promise<T>): Promise<T> {
    return this.db.transaction('rw', this.db.saves, work);
  }
}
