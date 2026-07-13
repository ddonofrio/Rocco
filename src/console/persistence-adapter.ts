import type { RoccoPlaneScene, RoccoPlaneSceneRecord } from './video/planes';
import { loadPlaneSceneRecord, savePlaneScene } from './persistence/db';
import type { RoccoEnginePersistence } from './engine-sdk';

export class RoccoPersistenceAdapter implements RoccoEnginePersistence {
  async loadPlaneSceneRecord(cartridgeId: string, sceneId: string): Promise<RoccoPlaneSceneRecord | null> {
    return loadPlaneSceneRecord(cartridgeId, sceneId);
  }

  async savePlaneScene(cartridgeId: string, scene: RoccoPlaneScene): Promise<void> {
    await savePlaneScene(cartridgeId, scene);
  }
}
