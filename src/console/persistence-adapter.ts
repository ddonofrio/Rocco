import type { RoccoPlaneScene, RoccoPlaneSceneRecord } from './video/planes';
import { loadPlaneSceneRecord, savePlaneScene, closeRoccoDatabase } from './persistence/database';
import { createSaveRepository as createSaveRepo } from './persistence/save-repository';
import type {
  CartridgeSaveRepository as CartridgeSaveRepo,
  CreateSaveRepositoryOptions as CreateSaveRepoOptions,
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
    options: CreateSaveRepoOptions<TState>,
  ): CartridgeSaveRepo<TState> {
    return createSaveRepo(options);
  }

  /** Releases the IndexedDB connection. Idempotent. */
  dispose(): void {
    closeRoccoDatabase();
  }
}
