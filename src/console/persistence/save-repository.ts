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
  type CartridgeSaveRepository as CartridgeSaveRepo,
  type CreateSaveRepositoryOptions as CreateSaveRepoOptions,
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function assertRepoIdentity(
  cartridgeId: string,
  cartridgeVersion: string,
  providerSchemaVersion: number,
): void {
  if (!isNonEmptyString(cartridgeId)) {
    throw new SaveSchemaError({
      key: 'invalid-save-repository',
      storedSchemaVersion: 0,
      supportedSchemaVersion: providerSchemaVersion,
    });
  }

  if (!isNonEmptyString(cartridgeVersion) || !isNonNegativeSafeInteger(providerSchemaVersion)) {
    throw new SaveSchemaError({
      key: `${cartridgeId}:invalid-save-repository`,
      storedSchemaVersion: 0,
      supportedSchemaVersion: providerSchemaVersion,
    });
  }
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
  options: CreateSaveRepoOptions<TState>,
): CartridgeSaveRepo<TState> {
  const { cartridgeId, cartridgeVersion, provider } = options;
  const store: SaveStore = options.store ?? new DexieSaveStore();
  assertRepoIdentity(cartridgeId, cartridgeVersion, provider.schemaVersion);

  function keyOf(profileId: string, slotId: string): SaveStoreKey {
    return buildKey(cartridgeId, profileId, slotId);
  }

  function validateKeyParts(profileId: string, slotId: string): void {
    if (!isNonEmptyString(profileId) || !isNonEmptyString(slotId)) {
      throw new SaveSchemaError({
        key: formatSaveKey(keyOf(profileId, slotId)),
        storedSchemaVersion: 0,
        supportedSchemaVersion: provider.schemaVersion,
      });
    }
  }

  function validateExpectedRevision(expectedRevision: number): void {
    if (!isPositiveSafeInteger(expectedRevision)) {
      throw new SaveRevisionConflictError({
        key: `${cartridgeId}:invalid-expected-revision`,
        expectedRevision,
        actualRevision: 0,
      });
    }
  }

  function normalizeImportedEnvelope(
    envelope: PortableSaveEnvelope<TState>,
  ): PortableSaveEnvelope<TState> {
    if (
      !isNonEmptyString(envelope.cartridgeId) ||
      !isNonEmptyString(envelope.cartridgeVersion) ||
      !isNonEmptyString(envelope.profileId) ||
      !isNonEmptyString(envelope.slotId) ||
      !isNonNegativeSafeInteger(envelope.schemaVersion) ||
      !isPositiveSafeInteger(envelope.revision) ||
      !isPositiveSafeInteger(envelope.createdAt) ||
      !isPositiveSafeInteger(envelope.updatedAt) ||
      envelope.updatedAt < envelope.createdAt
    ) {
      throw new SaveSchemaError({
        key: 'invalid-import-envelope',
        storedSchemaVersion:
          typeof envelope.schemaVersion === 'number' ? envelope.schemaVersion : 0,
        supportedSchemaVersion: provider.schemaVersion,
      });
    }

    if (envelope.cartridgeId !== cartridgeId) {
      throw new SaveSchemaError({
        key: formatSaveKey(keyOf(envelope.profileId, envelope.slotId)),
        storedSchemaVersion: envelope.schemaVersion,
        supportedSchemaVersion: provider.schemaVersion,
      });
    }

    if (envelope.schemaVersion > provider.schemaVersion) {
      throw new SaveSchemaError({
        key: formatSaveKey(keyOf(envelope.profileId, envelope.slotId)),
        storedSchemaVersion: envelope.schemaVersion,
        supportedSchemaVersion: provider.schemaVersion,
      });
    }

    return envelope;
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
    await store.transaction(async () => {
      const updated: SaveEnvelopeRow = {
        ...row,
        payload: migrated,
        schemaVersion: provider.schemaVersion,
        cartridgeVersion,
        revision: row.revision + 1,
        updatedAt: Date.now(),
      };
      await store.put(updated);
    });
    return migrated;
  }

  async function save(
    profileId: string,
    slotId: string,
    saveOptions?: SaveOptions,
  ): Promise<SaveMetadata> {
    validateKeyParts(profileId, slotId);
    const key = keyOf(profileId, slotId);
    if (saveOptions?.expectedRevision !== undefined) {
      validateExpectedRevision(saveOptions.expectedRevision);
    }
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
    const normalized = normalizeImportedEnvelope(envelope);
    validateKeyParts(normalized.profileId, normalized.slotId);
    const key = keyOf(normalized.profileId, normalized.slotId);
    const now = Date.now();

    try {
      return await store.transaction(async () => {
        const existing = await store.get(key);
        const migrated =
          normalized.schemaVersion < provider.schemaVersion
            ? provider.migrateState(normalized.schemaVersion, normalized.payload)
            : normalized.payload;
        const row: SaveEnvelopeRow = {
          key: formatSaveKey(key),
          cartridgeId,
          cartridgeVersion,
          schemaVersion: provider.schemaVersion,
          profileId: normalized.profileId,
          slotId: normalized.slotId,
          revision: Math.max(existing?.revision ?? 0, normalized.revision) + 1,
          createdAt: existing?.createdAt ?? normalized.createdAt,
          updatedAt: now,
          payload: migrated,
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

  return {
    listSlots,
    load,
    save,
    delete: deleteSlot,
    exportSave,
    importSave,
  };
}
