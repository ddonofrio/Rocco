# Persistence

Persistence stores plane scenes in IndexedDB through Dexie.

## Files

- `db.ts` - Database schema, tables, and exported persistence functions.

## Tables

| Table         | Key  | Description                         |
| ------------- | ---- | ----------------------------------- |
| `scenes`      | `id` | Persisted `RoccoPlaneScene` records |

## Exported Functions

- `loadPlaneSceneRecord(sceneId)` loads a scene record or returns `null`.
- `savePlaneScene(scene)` upserts a scene.

## Notes

- Cartridges use persistence through `engine.persistence` on the `RoccoEngine` SDK surface.
- Cartridges do not access Dexie directly.
- Plane scenes are stored as plain JSON.
- The engine normalizes restored scenes on boot so missing default planes can be repaired.
