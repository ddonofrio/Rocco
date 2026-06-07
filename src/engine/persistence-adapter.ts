import type { RoccoPlaneScene, RoccoPlaneSceneRecord } from './video/planes';
import { loadPlaneSceneRecord, savePlaneScene } from './persistence/db';
import type { RoccoEnginePersistence } from './engine-api';

export class RoccoPersistenceAdapter implements RoccoEnginePersistence {
  async loadPlaneSceneRecord(sceneId: string): Promise<RoccoPlaneSceneRecord | null> {
    return loadPlaneSceneRecord(sceneId);
  }

  async savePlaneScene(scene: RoccoPlaneScene): Promise<void> {
    await savePlaneScene(scene);
  }
}
