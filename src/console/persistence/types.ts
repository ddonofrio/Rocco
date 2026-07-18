/**
 * Versioned cartridge-save domain contracts.
 *
 * These types separate the console-owned storage mechanics (envelope, key,
 * revision, transaction) from the cartridge-owned domain payload. The console
 * persists `SaveEnvelope<unknown>`; the cartridge decides how `payload` is
 * produced and migrated through a `CartridgeSaveProvider`. The console never
 * imports game-internal fields.
 */

/**
 * The persisted, version-stamped save envelope. `key` is the IndexedDB primary
 * key and is derived from the three scoping dimensions so two cartridges,
 * profiles, or slots can never collide.
 */
export interface SaveEnvelope<TPayload> {
  readonly cartridgeId: string;
  readonly cartridgeVersion: string;
  readonly schemaVersion: number;
  readonly profileId: string;
  readonly slotId: string;
  readonly revision: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly payload: TPayload;
}

/** Persisted row shape: the envelope plus its compound primary key. */
export interface SaveEnvelopeRow<TPayload = unknown> extends SaveEnvelope<TPayload> {
  readonly key: string;
}

/** Compound primary key for scene rows. */
export type SceneStoreKey = readonly [cartridgeId: string, sceneId: string];

/** Compound primary key for save rows. */
export type SaveStoreKey = readonly [cartridgeId: string, profileId: string, slotId: string];

/** Formats a save store key for diagnostics. */
export function formatSaveKey(key: SaveStoreKey): string {
  return `${key[0]}:${key[1]}:${key[2]}`;
}

/** Metadata returned by listing/reading slots, without the domain payload. */
export interface SaveMetadata {
  readonly cartridgeId: string;
  readonly cartridgeVersion: string;
  readonly schemaVersion: number;
  readonly profileId: string;
  readonly slotId: string;
  readonly revision: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/**
 * Portable envelope used for export/import backup & recovery. Identical to
 * `SaveEnvelope` but without the storage key (which is rederived on import).
 */
export type PortableSaveEnvelope<TPayload> = SaveEnvelope<TPayload>;

/**
 * Cartridge-owned contract. The console never inspects `payload`; the
 * cartridge declares the current `schemaVersion` and knows how to serialize and
 * migrate its own domain state.
 */
export interface CartridgeSaveProvider<TState> {
  /** Current domain schema version produced by `serializeState`. */
  readonly schemaVersion: number;

  /** Produce the serializable domain state for the active slot. */
  serializeState(): TState;

  /**
   * Migrate an older payload forward to the provider's `schemaVersion`.
   * `fromSchemaVersion` is the stored envelope's schema; the provider must
   * walk versions `fromSchemaVersion` -> `schemaVersion` deterministically.
   */
  migrateState(fromSchemaVersion: number, payload: unknown): TState;
}

export interface SaveOptions {
  /**
   * When provided, the save is rejected with `SaveRevisionConflictError`
   * unless the stored slot currently has exactly this revision. Prevents a
   * stale in-flight write from overwriting a newer committed save.
   */
  expectedRevision?: number;
}

/**
 * Console-provided, cartridge-scoped save repository. Bound to one
 * `cartridgeId` + `CartridgeSaveProvider` at creation time, so the methods
 * only take `profileId` + `slotId`.
 */
export interface CartridgeSaveRepo<TState> {
  listSlots(profileId: string): Promise<readonly SaveMetadata[]>;
  load(profileId: string, slotId: string): Promise<TState | undefined>;
  save(profileId: string, slotId: string, options?: SaveOptions): Promise<SaveMetadata>;
  delete(profileId: string, slotId: string): Promise<void>;
  exportSave(profileId: string, slotId: string): Promise<PortableSaveEnvelope<TState> | undefined>;
  importSave(envelope: PortableSaveEnvelope<TState>): Promise<SaveMetadata>;
}

export interface CreateSaveRepoOptions<TState> {
  readonly cartridgeId: string;
  readonly cartridgeVersion: string;
  readonly provider: CartridgeSaveProvider<TState>;
  /** Injectable store for tests; defaults to the Dexie-backed implementation. */
  readonly store?: SaveStore;
}

/**
 * Storage abstraction the repository depends on. Keeps the repository testable
 * without IndexedDB and lets the engine inject a different backend later.
 */
export interface SaveStore {
  get(key: SaveStoreKey): Promise<SaveEnvelopeRow | undefined>;
  put(row: SaveEnvelopeRow): Promise<void>;
  queryByProfile(cartridgeId: string, profileId: string): Promise<SaveEnvelopeRow[]>;
  delete(key: SaveStoreKey): Promise<void>;
  /** Runs `work` atomically; a thrown error rolls back every write inside. */
  transaction<T>(work: () => Promise<T>): Promise<T>;
}

/** Thrown when IndexedDB reports the storage quota is exceeded. */
export class SaveQuotaExceededError extends Error {
  readonly key: string;
  readonly cause?: unknown;

  constructor(key: string, cause?: unknown) {
    super(`Save quota exceeded for key '${key}'`);
    this.name = 'SaveQuotaExceededError';
    this.key = key;
    this.cause = cause;
  }
}

/** Thrown when an `expectedRevision` guard fails; no write is published. */
export class SaveRevisionConflictError extends Error {
  readonly key: string;
  readonly expectedRevision: number;
  readonly actualRevision: number;

  constructor(detail: { key: string; expectedRevision: number; actualRevision: number }) {
    super(
      `Save revision conflict on '${detail.key}': expected ${detail.expectedRevision} but current is ${detail.actualRevision}`,
    );
    this.name = 'SaveRevisionConflictError';
    this.key = detail.key;
    this.expectedRevision = detail.expectedRevision;
    this.actualRevision = detail.actualRevision;
  }
}

/** Thrown when a stored save is newer than the provider can migrate down to. */
export class SaveSchemaError extends Error {
  readonly key: string;
  readonly storedSchemaVersion: number;
  readonly supportedSchemaVersion: number;

  constructor(detail: {
    key: string;
    storedSchemaVersion: number;
    supportedSchemaVersion: number;
  }) {
    super(
      `Save schema '${detail.key}' is version ${detail.storedSchemaVersion} but the cartridge only supports up to ${detail.supportedSchemaVersion}`,
    );
    this.name = 'SaveSchemaError';
    this.key = detail.key;
    this.storedSchemaVersion = detail.storedSchemaVersion;
    this.supportedSchemaVersion = detail.supportedSchemaVersion;
  }
}

/** True for the DOMException/Dexie error name reported on quota exhaustion. */
export function isQuotaExceededError(error: unknown): boolean {
  if (!error) {
    return false;
  }
  const name = error instanceof Error ? error.name : undefined;
  if (name === 'QuotaExceededError') {
    return true;
  }
  return safeToString(error).toLowerCase().includes('quota');
}

function safeToString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Error) {
    return value.message;
  }
  return String(value);
}
