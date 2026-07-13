import type { RoccoPlaneScene, RoccoPlaneSceneRecord } from './video/planes';
import { loadPlaneSceneRecord, savePlaneScene, closeRoccoDatabase } from './persistence/db';
import { createSaveRepository } from './persistence/save-repository';
import type {
  CartridgeSaveRepository,
  CreateSaveRepositoryOptions,
} from './persistence/types';
import type { RoccoEnginePersistence } from './engine-sdk';

export class RoccoPersistenceAdapter implements RoccoEnginePersistence {
  async loadPlaneSceneRecord(cartridgeId: string, sceneId: string): Promise<RoccoPlaneSceneRecord | null> {
    return loadPlaneSceneRecord(cartridgeId, sceneId);
  }

  async savePlaneScene(cartridgeId: string, scene: RoccoPlaneScene): Promise<void> {
    await savePlaneScene(cartridgeId, scene);
  }

  createSaveRepository<TState>(
    options: CreateSaveRepositoryOptions<TState>,
  ): CartridgeSaveRepository<TState> {
    return createSaveRepository(options);
  }

  /** Releases the IndexedDB connection. Idempotent. */
  dispose(): void {
    closeRoccoDatabase();
  }
}
