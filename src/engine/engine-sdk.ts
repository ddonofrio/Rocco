import type { RoccoAudioSystem } from './audio';
import type { RoccoJukeboxSystem } from './audio/jukebox';
import type { RoccoEffectManager } from './effects';
import type { RoccoVideoSystem } from './video';
import type { RoccoPlaneScene, RoccoPlaneSceneRecord } from './video/planes';

export interface RoccoEnginePersistence {
  loadPlaneSceneRecord(sceneId: string): Promise<RoccoPlaneSceneRecord | null>;
  savePlaneScene(scene: RoccoPlaneScene): Promise<void>;
}

export interface RoccoConsoleFlags {
  developerModeEnabled: boolean;
}

export interface RoccoEngine {
  // Direct subsystem access
  readonly video: RoccoVideoSystem;
  readonly audio: RoccoAudioSystem;
  readonly jukebox: RoccoJukeboxSystem;
  readonly effects: RoccoEffectManager;
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

  // Console flags
  isDeveloperModeEnabled?(): boolean;
  getConsoleFlags?(): RoccoConsoleFlags;
  setConsoleFlags?(patch: Partial<RoccoConsoleFlags>): void;

  // Composition control (loading overlay)
  beginComposition(): void;
  endComposition(): void;
  setCompositionText?(text: string | null): void;

  // Logging and status
  setStatus(status: string): void;
  log(channel: string, message: string): void;
}
