# Persistence

Persistence stores both a technical scene cache and versioned cartridge
saves in IndexedDB through Dexie.

## Files

- `database.ts` - Database schema, tables, lazy/disposable connection, and the
  scene-cache functions.
- `types.ts` - Persistence domain contracts: save envelope, metadata,
  `CartridgeSaveProvider`, `CartridgeSaveRepo`, `SaveStore`, and the
  typed errors (`SaveQuotaExceededError`, `SaveRevisionConflictError`,
  `SaveSchemaError`).
- `store.ts` - Dexie-backed `SaveStore` adapter.
- `save-repo.ts` - Versioned, slot/profile-scoped save repository.
- `README.md` - This file.

## Tables

| Table       | Key                              | Description                    |
| ----------- | -------------------------------- | ------------------------------ |
| `scenes_v4` | `[cartridgeId+sceneId]`          | Recreatable visual scene cache |
| `saves`     | `[cartridgeId+profileId+slotId]` | Versioned domain saves (v5)    |

`legacy_saves` is a temporary migration store. It exists only while a v2
database is upgrading and is removed after the v5 save envelope is restored.

## Historical schema policy

- v2 stores saves with an auto-increment key and stores scenes and plane assets.
- v2.5 stages valid v2 save rows before the v3 schema removes the old `saves`
  store.
- v3 intentionally removes saves. A database that is already at v3 has no save
  data available for recovery; the upgrade proceeds without inventing it.
- v4 adds the compound-key `scenes_v4` cache.
- v4.5 creates the current `saves` envelope and restores staged v2 rows before
  v5 removes the temporary `legacy_saves` store.
- v5 keeps the current save indexes and removes the temporary `legacy_saves`
  store.

The v2 policy is conservative preservation: valid legacy metadata and
timestamps are retained, missing dimensions receive documented defaults, and
re-running or reopening the migration does not duplicate rows. IndexedDB
upgrade transactions roll back all staged writes if a row fails to normalize;
repairing the source row allows the upgrade to be retried.

## Scene cache

- `loadPlaneSceneRecord(cartridgeId, sceneId)` loads a scene record or
  returns `null`.
- `savePlaneScene(cartridgeId, scene)` upserts a scene.

The engine normalizes restored scenes on boot so missing default planes can be
repaired. This is a _technical, recreatable_ cache and is intentionally
separate from domain saves.

## Versioned saves (audit DAT-001 / ROCCO-014)

A cartridge obtains a `CartridgeSaveRepo` bound to its `cartridgeId`
and a `CartridgeSaveProvider`:

```ts
const saves = sdk.storage.createSaveRepository<MyState>({
  cartridgeId: manifest.id,
  cartridgeVersion: manifest.version,
  provider: {
    schemaVersion: 2,
    serializeState: () => /* domain state */,
    migrateState: (from, payload) => /* migrate from -> 2 */,
  },
});

await saves.save(profileId, slotId);          // transactional, revision + 1
const state = await saves.load(profileId, slotId); // undefined if absent
```

The console owns the envelope, key, transaction, revision guard and quota
handling; the cartridge owns how `payload` is produced and migrated. The
console never imports game-internal fields.

### Save envelope

```ts
interface SaveEnvelope<TPayload> {
  cartridgeId: string;
  cartridgeVersion: string;
  schemaVersion: number;
  profileId: string;
  slotId: string;
  revision: number;
  createdAt: number;
  updatedAt: number;
  payload: TPayload;
}
```

Key `[cartridgeId + profileId + slotId]` guarantees two cartridges,
profiles, or slots never collide.

### Guarantees

- **Transactional**: every `save` runs inside a Dexie `rw` transaction; a
  failed write rolls back and publishes no partial row.
- **Revision guard**: `save(profileId, slotId, { expectedRevision })`
  rejects with `SaveRevisionConflictError` when the stored slot has a
  different revision, preventing a stale in-flight write from overwriting a
  newer committed save.
- **Migration**: on `load`, a stored envelope whose `schemaVersion`
  is older than the provider's is migrated forward through
  `provider.migrateState` and the migrated envelope is persisted. A stored
  schema newer than the provider can handle throws `SaveSchemaError`
  (explainable, recoverable) instead of corrupting state.
- **Quota**: an IndexedDB `QuotaExceededError` is surfaced as the typed
  `SaveQuotaExceededError`.
- **Backup/recovery**: `exportSave` returns a portable envelope and
  `importSave` writes it into another store/repository.

## Notes

- Cartridges use persistence through `sdk.storage`.
- Cartridges do not access Dexie directly.
- Plane scenes are stored as plain JSON.
- The database connection is lazily opened and released by
  `RoccoPersistenceAdapter.dispose()` (wired into the runtime scope), so
  the resource is closed on runtime dispose and reopened transparently.
