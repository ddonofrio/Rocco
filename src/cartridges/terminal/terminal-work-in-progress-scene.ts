import type { RoccoEngine } from '../../console/engine-sdk';
import { createDefaultPlaneScene, type RoccoPlaneScene } from '../../console/video/planes';
import { normalizeDefaultScene } from './terminal-work-in-progress-compatibility';
import { DEFAULT_SCENE_ID } from './terminal-work-in-progress-constants';

export async function loadOrCreateDefaultScene(engine: RoccoEngine): Promise<RoccoPlaneScene> {
  const restoredRecord = await engine.persistence.loadPlaneSceneRecord(DEFAULT_SCENE_ID);
  if (!restoredRecord) {
    const created = createDefaultPlaneScene(DEFAULT_SCENE_ID);
    await engine.persistence.savePlaneScene(created);
    engine.log('System', 'Rocco Graphic Plane System initialized.');
    return created;
  }

  const normalized = normalizeDefaultScene(restoredRecord.scene);
  engine.log('System', 'Graphic plane scene restored from IndexedDB.');
  if (normalized.changed) {
    await engine.persistence.savePlaneScene(normalized.scene);
    engine.log('System', 'Scene compatibility patches applied.');
  }

  return normalized.scene;
}
