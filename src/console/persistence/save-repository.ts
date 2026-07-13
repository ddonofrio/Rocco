/**
 * Versioned, slot/profile-scoped cartridge save repository (audit DAT-001,
 * §6.6, ROCCO-014).
 *
 * A cartridge obtains one repository bound to its `cartridgeId` and a
 * `CartridgeSaveProvider` via `createSaveRepository`. The console owns the
 * envelope, key, revision, and transactional write; the cartridge owns how
 * the `payload` is produced and migrated. The console never imports
 * game-internal fields.
 */

import { DexieSaveStore } from './store';
import {
  isQuotaExceededError,
  SaveQuotaExceededError,
  SaveRevisionConflictError,
  SaveSchemaError,
  type CartridgeSaveRepository,
  type CreateSaveRepositoryOptions,
  type PortableSaveEnvelope,
  type SaveEnvelopeRow,
  type SaveMetadata,
  type SaveOptions,
  type SaveStore,
} from './types';

function buildKey(cartridgeId: string, profileId: string, slotId: string): string {
  return `${cartridgeId}:${profileId}:${slotId}`;
}

function toMetadata(row: SaveEnvelopeRow): SaveMetadata {
  return {
    cartridgeId: row.cartridgeId,
    cartridgeVersion: row.cartridgeVersion,
    schemaVersion: row.schemaVersion,
    profileId: row.profileId,
    slotId: row.slotId,
    revision: row.revision,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createSaveRepository<TState>(
  options: CreateSaveRepositoryOptions<TState>,
): CartridgeSaveRepository<TState> {
  const { cartridgeId, cartridgeVersion, provider } = options;
  const store: SaveStore = options.store ?? new DexieSaveStore();

  function keyOf(profileId: string, slotId: string): string {
    return buildKey(cartridgeId, profileId, slotId);
  }

  /**
   * Migrates a stored envelope forward to the provider's schema version and
   * persists the migrated envelope. Throws `SaveSchemaError` when the stored
   * schema is newer than the provider can handle (explainable, recoverable
   * failure rather than silent corruption).
   */
  async function materialize(row: SaveEnvelopeRow): Promise<TState> {
    if (row.schemaVersion > provider.schemaVersion) {
      throw new SaveSchemaError({
        key: row.key,
        storedSchemaVersion: row.schemaVersion,
        supportedSchemaVersion: provider.schemaVersion,
      });
    }

    if (row.schemaVersion === provider.schemaVersion) {
      return row.payload as TState;
    }

    const migrated = provider.migrateState(row.schemaVersion, row.payload);
    const updated: SaveEnvelopeRow = {
      ...row,
      payload: migrated,
      schemaVersion: provider.schemaVersion,
      updatedAt: Date.now(),
    };
    await store.put(updated);
    return migrated;
  }

  async function save(
    profileId: string,
    slotId: string,
    saveOptions?: SaveOptions,
  ): Promise<SaveMetadata> {
    const key = keyOf(profileId, slotId);
    try {
      return await store.transaction(async () => {
        const existing = await store.get(key);

        if (
          saveOptions?.expectedRevision !== undefined &&
          existing &&
          existing.revision !== saveOptions.expectedRevision
        ) {
          throw new SaveRevisionConflictError({
            key,
            expectedRevision: saveOptions.expectedRevision,
            actualRevision: existing.revision,
          });
        }

        const now = Date.now();
        const revision = (existing?.revision ?? 0) + 1;
        const row: SaveEnvelopeRow = {
          key,
          cartridgeId,
          cartridgeVersion,
          schemaVersion: provider.schemaVersion,
          profileId,
          slotId,
          revision,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          payload: provider.serializeState(),
        };
        await store.put(row);
        return toMetadata(row);
      });
    } catch (error) {
      if (isQuotaExceededError(error)) {
        throw new SaveQuotaExceededError(key, error);
      }
      throw error;
    }
  }

  async function load(profileId: string, slotId: string): Promise<TState | null> {
    const row = await store.get(keyOf(profileId, slotId));
    if (!row) {
      return null;
    }
    return materialize(row);
  }

  async function listSlots(profileId: string): Promise<readonly SaveMetadata[]> {
    const rows = await store.queryByProfile(cartridgeId, profileId);
    return rows.map(toMetadata);
  }

  async function deleteSlot(profileId: string, slotId: string): Promise<void> {
    await store.delete(keyOf(profileId, slotId));
  }

  async function exportSave(
    profileId: string,
    slotId: string,
  ): Promise<PortableSaveEnvelope<TState> | null> {
    const row = await store.get(keyOf(profileId, slotId));
    if (!row) {
      return null;
    }
    const payload = await materialize(row);
    return {
      cartridgeId: row.cartridgeId,
      cartridgeVersion: row.cartridgeVersion,
      schemaVersion: provider.schemaVersion,
      profileId: row.profileId,
      slotId: row.slotId,
      revision: row.revision,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      payload,
    };
  }

  async function importSave(
    envelope: PortableSaveEnvelope<TState>,
  ): Promise<SaveMetadata> {
    const key = keyOf(envelope.profileId, envelope.slotId);
    const now = Date.now();
    const existing = await store.get(key);
    const row: SaveEnvelopeRow = {
      key,
      cartridgeId,
      cartridgeVersion: envelope.cartridgeVersion,
      schemaVersion: envelope.schemaVersion,
      profileId: envelope.profileId,
      slotId: envelope.slotId,
      revision: (existing?.revision ?? 0) + 1,
      createdAt: envelope.createdAt ?? now,
      updatedAt: now,
      payload: envelope.payload,
    };
    await store.put(row);
    return toMetadata(row);
  }

  return {
    listSlots,
    load,
    save,
    delete: deleteSlot,
    exportSave,
    importSave,
  };
}
