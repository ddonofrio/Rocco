# Persistence

Persistence stores plane scenes and plane assets in IndexedDB through Dexie.

## Files

- `db.ts` - Database schema, tables, and exported persistence functions.

## Tables

| Table         | Key  | Description                         |
| ------------- | ---- | ----------------------------------- |
| `scenes`      | `id` | Persisted `RoccoPlaneScene` records |
| `planeAssets` | `id` | Persisted plane asset records       |

## Exported Functions

- `loadPlaneSceneRecord(sceneId)` loads a scene record or returns `null`.
- `savePlaneScene(scene)` upserts a scene.
- `listPlaneScenes()` lists scene records with newest records first.
- `savePlaneAsset(asset)` upserts a plane asset record.

## Notes

- Cartridges use persistence through `engine.persistence` on the `RoccoEngine` interface.
- Cartridges do not access Dexie directly.
- Plane scenes are stored as plain JSON.
- The engine normalizes restored scenes on boot so missing default planes can be repaired.
