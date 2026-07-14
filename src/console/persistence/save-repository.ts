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
  formatSaveKey,
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
  type SaveStoreKey,
} from './types';

function buildKey(
  cartridgeId: string,
  profileId: string,
  slotId: string,
): SaveStoreKey {
  return [cartridgeId, profileId, slotId];
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

  function keyOf(profileId: string, slotId: string): SaveStoreKey {
    return buildKey(cartridgeId, profileId, slotId);
  }

  function validateKeyParts(profileId: string, slotId: string): void {
    if (!profileId || !slotId) {
      throw new SaveSchemaError({
        key: formatSaveKey(keyOf(profileId, slotId)),
        storedSchemaVersion: 0,
        supportedSchemaVersion: provider.schemaVersion,
      });
    }
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
      cartridgeVersion,
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
    validateKeyParts(profileId, slotId);
    const key = keyOf(profileId, slotId);
    try {
      return await store.transaction(async () => {
        const existing = await store.get(key);

        if (saveOptions?.expectedRevision !== undefined) {
          if (!existing) {
            throw new SaveRevisionConflictError({
              key: formatSaveKey(key),
              expectedRevision: saveOptions.expectedRevision,
              actualRevision: 0,
            });
          }
          if (existing.revision !== saveOptions.expectedRevision) {
            throw new SaveRevisionConflictError({
              key: formatSaveKey(key),
              expectedRevision: saveOptions.expectedRevision,
              actualRevision: existing.revision,
            });
          }
        }

        const now = Date.now();
        const revision = (existing?.revision ?? 0) + 1;
        const row: SaveEnvelopeRow = {
          key: formatSaveKey(key),
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
        throw new SaveQuotaExceededError(formatSaveKey(key), error);
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
    validateKeyParts(profileId, slotId);
    await store.delete(keyOf(profileId, slotId));
  }

  async function exportSave(
    profileId: string,
    slotId: string,
  ): Promise<PortableSaveEnvelope<TState> | null> {
    const key = keyOf(profileId, slotId);
    const row = await store.get(key);
    if (!row) {
      return null;
    }
    const payload = await materialize(row);
    const updatedRow = await store.get(key);
    if (!updatedRow) {
      return null;
    }
    return {
      cartridgeId: updatedRow.cartridgeId,
      cartridgeVersion: updatedRow.cartridgeVersion,
      schemaVersion: updatedRow.schemaVersion,
      profileId: updatedRow.profileId,
      slotId: updatedRow.slotId,
      revision: updatedRow.revision,
      createdAt: updatedRow.createdAt,
      updatedAt: updatedRow.updatedAt,
      payload,
    };
  }

  async function importSave(
    envelope: PortableSaveEnvelope<TState>,
  ): Promise<SaveMetadata> {
    if (envelope.cartridgeId !== cartridgeId) {
      throw new SaveSchemaError({
        key: formatSaveKey(keyOf(envelope.profileId, envelope.slotId)),
        storedSchemaVersion: envelope.schemaVersion,
        supportedSchemaVersion: provider.schemaVersion,
      });
    }

    validateKeyParts(envelope.profileId, envelope.slotId);
    const key = keyOf(envelope.profileId, envelope.slotId);
    const now = Date.now();

    if (envelope.schemaVersion > provider.schemaVersion) {
      throw new SaveSchemaError({
        key: formatSaveKey(key),
        storedSchemaVersion: envelope.schemaVersion,
        supportedSchemaVersion: provider.schemaVersion,
      });
    }

    let payload = envelope.payload;
    if (envelope.schemaVersion < provider.schemaVersion) {
      payload = provider.migrateState(envelope.schemaVersion, envelope.payload);
    }

    const existing = await store.get(key);
    const row: SaveEnvelopeRow = {
      key: formatSaveKey(key),
      cartridgeId,
      cartridgeVersion: envelope.cartridgeVersion,
      schemaVersion: provider.schemaVersion,
      profileId: envelope.profileId,
      slotId: envelope.slotId,
      revision: (existing?.revision ?? 0) + 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      payload,
    };

    try {
      await store.transaction(async () => {
        await store.put(row);
      });
    } catch (error) {
      if (isQuotaExceededError(error)) {
        throw new SaveQuotaExceededError(formatSaveKey(key), error);
      }
      throw error;
    }

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
