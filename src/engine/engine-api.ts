import type { RoccoRuntimeVideoSystem } from './video';
import type { RoccoRuntimeAudioSystem } from './audio';
import type { RoccoJukeboxSystem } from './audio/jukebox';
import type { RoccoDefaultEffectManager } from './effects';
import type { RoccoPlaneScene, RoccoPlaneSceneRecord } from './video/planes';

export interface RoccoEnginePersistence {
  loadPlaneSceneRecord(sceneId: string): Promise<RoccoPlaneSceneRecord | null>;
  savePlaneScene(scene: RoccoPlaneScene): Promise<void>;
}

export interface RoccoEngine {
  // Direct subsystem access
  readonly video: RoccoRuntimeVideoSystem;
  readonly audio: RoccoRuntimeAudioSystem;
  readonly jukebox: RoccoJukeboxSystem;
  readonly effects: RoccoDefaultEffectManager;
  readonly persistence: RoccoEnginePersistence;

  // Scene management
  loadPlaneScene(scene: RoccoPlaneScene): void;
  serializePlaneScene(sceneId: string): RoccoPlaneScene;

  // Player state
  setPlayerSprite(instanceId: string | null): void;
  getPlayerSprite(): string | null;

  // Input control
  setInputEnabled(enabled: boolean): void;
  isInputEnabled(): boolean;

  // Composition control (loading overlay)
  beginComposition(): void;
  endComposition(): void;

  // Logging and status
  setStatus(status: string): void;
  log(channel: string, message: string): void;
}
