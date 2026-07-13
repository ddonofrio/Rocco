# Persistence

Persistence stores both a technical scene cache and versioned cartridge
saves in IndexedDB through Dexie.

## Files

- `db.ts` - Database schema, tables, lazy/disposable connection, and the
  scene-cache functions.
- `types.ts` - Persistence domain contracts: save envelope, metadata,
  `CartridgeSaveProvider`, `CartridgeSaveRepository`, `SaveStore`, and the
  typed errors (`SaveQuotaExceededError`, `SaveRevisionConflictError`,
  `SaveSchemaError`).
- `store.ts` - Dexie-backed `SaveStore` adapter.
- `save-repository.ts` - Versioned, slot/profile-scoped save repository.
- `README.md` - This file.

## Tables

| Table | Key | Description |
| --- | --- | --- |
| `scenes_v4` | `[cartridgeId+sceneId]` | Recreatable visual scene cache |
| `saves` | `[cartridgeId+profileId+slotId]` | Versioned domain saves (v5) |

## Scene cache

- `loadPlaneSceneRecord(cartridgeId, sceneId)` loads a scene record or
  returns `null`.
- `savePlaneScene(cartridgeId, scene)` upserts a scene.

The engine normalizes restored scenes on boot so missing default planes can be
repaired. This is a *technical, recreatable* cache and is intentionally
separate from domain saves.

## Versioned saves (audit DAT-001 / ROCCO-014)

A cartridge obtains a `CartridgeSaveRepository` bound to its `cartridgeId`
and a `CartridgeSaveProvider`:

```ts
const saves = engine.persistence.createSaveRepository<MyState>({
  cartridgeId: manifest.id,
  cartridgeVersion: manifest.version,
  provider: {
    schemaVersion: 2,
    serializeState: () => /* domain state */,
    migrateState: (from, payload) => /* migrate from -> 2 */,
  },
});

await saves.save(profileId, slotId);          // transactional, revision + 1
const state = await saves.load(profileId, slotId); // null if absent
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

- Cartridges use persistence through `engine.persistence` on the `RoccoEngine`
  SDK surface (and therefore `CartridgeSdkV1.storage`).
- Cartridges do not access Dexie directly.
- Plane scenes are stored as plain JSON.
- The database connection is lazily opened and released by
  `RoccoPersistenceAdapter.dispose()` (wired into the runtime scope), so
  the resource is closed on runtime dispose and reopened transparently.
