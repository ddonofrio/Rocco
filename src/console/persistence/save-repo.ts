/**
 * Versioned, slot/profile-scoped cartridge save repository.
 *
 * A cartridge obtains one repository bound to its `cartridgeId` and a
 * `CartridgeSaveProvider` via `createSaveRepo`. The console owns the
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
  type CartridgeSaveRepo,
  type CreateSaveRepoOptions,
  type PortableSaveEnvelope,
  type SaveEnvelopeRow,
  type SaveMetadata,
  type SaveOptions,
  type SaveStore,
  type SaveStoreKey,
} from './types';

function buildKey(cartridgeId: string, profileId: string, slotId: string): SaveStoreKey {
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

class SaveRepoRuntime<TState> {
  private readonly cartridgeId: string;
  private readonly cartridgeVersion: string;
  private readonly provider: CreateSaveRepoOptions<TState>['provider'];
  private readonly store: SaveStore;

  constructor(options: CreateSaveRepoOptions<TState>) {
    this.cartridgeId = options.cartridgeId;
    this.cartridgeVersion = options.cartridgeVersion;
    this.provider = options.provider;
    this.store = options.store ?? new DexieSaveStore();
    assertRepoIdentity(this.cartridgeId, this.cartridgeVersion, this.provider.schemaVersion);
  }

  private keyOf(profileId: string, slotId: string): SaveStoreKey {
    return buildKey(this.cartridgeId, profileId, slotId);
  }

  private validateKeyParts(profileId: string, slotId: string): void {
    if (!isNonEmptyString(profileId) || !isNonEmptyString(slotId)) {
      throw new SaveSchemaError({
        key: formatSaveKey(this.keyOf(profileId, slotId)),
        storedSchemaVersion: 0,
        supportedSchemaVersion: this.provider.schemaVersion,
      });
    }
  }

  private normalizeImportedEnvelope(
    envelope: PortableSaveEnvelope<TState>,
  ): PortableSaveEnvelope<TState> {
    const isValid =
      isNonEmptyString(envelope.cartridgeId) &&
      isNonEmptyString(envelope.cartridgeVersion) &&
      isNonEmptyString(envelope.profileId) &&
      isNonEmptyString(envelope.slotId) &&
      isNonNegativeSafeInteger(envelope.schemaVersion) &&
      isPositiveSafeInteger(envelope.revision) &&
      isPositiveSafeInteger(envelope.createdAt) &&
      isPositiveSafeInteger(envelope.updatedAt) &&
      envelope.updatedAt >= envelope.createdAt;
    if (!isValid) {
      throw new SaveSchemaError({
        key: 'invalid-import-envelope',
        storedSchemaVersion:
          typeof envelope.schemaVersion === 'number' ? envelope.schemaVersion : 0,
        supportedSchemaVersion: this.provider.schemaVersion,
      });
    }
    if (
      envelope.cartridgeId !== this.cartridgeId ||
      envelope.schemaVersion > this.provider.schemaVersion
    ) {
      throw new SaveSchemaError({
        key: formatSaveKey(this.keyOf(envelope.profileId, envelope.slotId)),
        storedSchemaVersion: envelope.schemaVersion,
        supportedSchemaVersion: this.provider.schemaVersion,
      });
    }
    return envelope;
  }

  private async materialize(row: SaveEnvelopeRow): Promise<TState> {
    if (row.schemaVersion > this.provider.schemaVersion) {
      throw new SaveSchemaError({
        key: row.key,
        storedSchemaVersion: row.schemaVersion,
        supportedSchemaVersion: this.provider.schemaVersion,
      });
    }
    if (row.schemaVersion === this.provider.schemaVersion) {
      return row.payload as TState;
    }
    const migrated = this.provider.migrateState(row.schemaVersion, row.payload);
    await this.store.transaction(async () => {
      await this.store.put({
        ...row,
        payload: migrated,
        schemaVersion: this.provider.schemaVersion,
        cartridgeVersion: this.cartridgeVersion,
        revision: row.revision + 1,
        updatedAt: Date.now(),
      });
    });
    return migrated;
  }

  private async save(
    profileId: string,
    slotId: string,
    saveOptions?: SaveOptions,
  ): Promise<SaveMetadata> {
    this.validateKeyParts(profileId, slotId);
    if (
      saveOptions?.expectedRevision !== undefined &&
      !isPositiveSafeInteger(saveOptions.expectedRevision)
    ) {
      throw new SaveRevisionConflictError({
        key: `${this.cartridgeId}:invalid-expected-revision`,
        expectedRevision: saveOptions.expectedRevision,
        actualRevision: 0,
      });
    }
    const key = this.keyOf(profileId, slotId);
    try {
      return await this.store.transaction(async () => {
        const existing = await this.store.get(key);
        if (
          saveOptions?.expectedRevision !== undefined &&
          (!existing || existing.revision !== saveOptions.expectedRevision)
        ) {
          throw new SaveRevisionConflictError({
            key: formatSaveKey(key),
            expectedRevision: saveOptions.expectedRevision,
            actualRevision: existing?.revision ?? 0,
          });
        }
        const now = Date.now();
        const row: SaveEnvelopeRow = {
          key: formatSaveKey(key),
          cartridgeId: this.cartridgeId,
          cartridgeVersion: this.cartridgeVersion,
          schemaVersion: this.provider.schemaVersion,
          profileId,
          slotId,
          revision: (existing?.revision ?? 0) + 1,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          payload: this.provider.serializeState(),
        };
        await this.store.put(row);
        return toMetadata(row);
      });
    } catch (error) {
      if (isQuotaExceededError(error)) {
        throw new SaveQuotaExceededError(formatSaveKey(key), error);
      }
      throw error;
    }
  }

  private async load(profileId: string, slotId: string): Promise<TState | undefined> {
    const row = await this.store.get(this.keyOf(profileId, slotId));
    return row ? this.materialize(row) : undefined;
  }

  private async listSlots(profileId: string): Promise<readonly SaveMetadata[]> {
    const rows = await this.store.queryByProfile(this.cartridgeId, profileId);
    return rows.map((row) => toMetadata(row));
  }

  private async deleteSlot(profileId: string, slotId: string): Promise<void> {
    this.validateKeyParts(profileId, slotId);
    await this.store.delete(this.keyOf(profileId, slotId));
  }

  private async exportSave(
    profileId: string,
    slotId: string,
  ): Promise<PortableSaveEnvelope<TState> | undefined> {
    const key = this.keyOf(profileId, slotId);
    const row = await this.store.get(key);
    if (!row) {
      return undefined;
    }
    const payload = await this.materialize(row);
    const updatedRow = await this.store.get(key);
    if (!updatedRow) {
      return undefined;
    }
    return { ...updatedRow, payload };
  }

  private async importSave(envelope: PortableSaveEnvelope<TState>): Promise<SaveMetadata> {
    const normalized = this.normalizeImportedEnvelope(envelope);
    this.validateKeyParts(normalized.profileId, normalized.slotId);
    const key = this.keyOf(normalized.profileId, normalized.slotId);
    try {
      return await this.store.transaction(async () => {
        const existing = await this.store.get(key);
        const payload =
          normalized.schemaVersion < this.provider.schemaVersion
            ? this.provider.migrateState(normalized.schemaVersion, normalized.payload)
            : normalized.payload;
        const now = Date.now();
        const row: SaveEnvelopeRow = {
          key: formatSaveKey(key),
          cartridgeId: this.cartridgeId,
          cartridgeVersion: this.cartridgeVersion,
          schemaVersion: this.provider.schemaVersion,
          profileId: normalized.profileId,
          slotId: normalized.slotId,
          revision: Math.max(existing?.revision ?? 0, normalized.revision) + 1,
          createdAt: existing?.createdAt ?? normalized.createdAt,
          updatedAt: now,
          payload,
        };
        await this.store.put(row);
        return toMetadata(row);
      });
    } catch (error) {
      if (isQuotaExceededError(error)) {
        throw new SaveQuotaExceededError(formatSaveKey(key), error);
      }
      throw error;
    }
  }

  createRepository(): CartridgeSaveRepo<TState> {
    return {
      listSlots: this.listSlots.bind(this),
      load: this.load.bind(this),
      save: this.save.bind(this),
      delete: this.deleteSlot.bind(this),
      exportSave: this.exportSave.bind(this),
      importSave: this.importSave.bind(this),
    };
  }
}

export function createSaveRepo<TState>(
  options: CreateSaveRepoOptions<TState>,
): CartridgeSaveRepo<TState> {
  return new SaveRepoRuntime(options).createRepository();
}
