import type { RoccoAudioSystem } from './audio';
import type { RoccoJukeboxSystem } from './audio/jukebox';
import type { RoccoEffectManager } from './effects';
import type { RoccoVideoSystem } from './video';
import type { RoccoPlaneScene, RoccoPlaneSceneRecord } from './video/planes';
import type { InputMode, InputPolicyLease } from './input/input-policy-stack';
import type { CompositionSession } from './composition/composition-service';
import type {
  CartridgeSaveRepository,
  CreateSaveRepositoryOptions,
} from './persistence/types';

export interface RoccoEnginePersistence {
  loadPlaneSceneRecord(cartridgeId: string, sceneId: string): Promise<RoccoPlaneSceneRecord | null>;
  savePlaneScene(cartridgeId: string, scene: RoccoPlaneScene): Promise<void>;

  /**
   * Opens a versioned, slot/profile-scoped save repository bound to a
   * cartridge and its `CartridgeSaveProvider` (audit ROCCO-014 / DAT-001).
   * The returned repository owns transaction, revision guard, migration and
   * quota handling; the cartridge only supplies domain serialization.
   */
  createSaveRepository<TState>(
    options: CreateSaveRepositoryOptions<TState>,
  ): CartridgeSaveRepository<TState>;
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
  /**
   * Acquires a composable input lease. The effective mode is the most
   * restrictive of all active leases. Prefer this over the deprecated
   * `setInputEnabled` boolean. Dispose the returned lease to release the lock.
   */
  acquireInputLease(ownerId: string, mode: InputMode): InputPolicyLease;

  /** Effective composed input mode (most restrictive active lease). */
  getInputMode(): InputMode;

  /**
   * @deprecated Retained for legacy per-level callers until level decomposition
   * (audit Phase 4). Use `acquireInputLease` instead. Backed internally by a
   * ref-counted `'legacy-input'` lease, so it still participates in the composed
   * policy stack.
   */
  setInputEnabled(enabled: boolean): void;

  /**
   * @deprecated Use `getInputMode() === 'interactive'`.
   */
  isInputEnabled(): boolean;

  // Console flags
  isDeveloperModeEnabled?(): boolean;
  getConsoleFlags?(): RoccoConsoleFlags;
  setConsoleFlags?(patch: Partial<RoccoConsoleFlags>): void;

  // Composition control (loading overlay)
  /**
   * Opens an owned composition session. Only the returned session may update or
   * close its overlay. Prefer this over the deprecated `beginComposition`.
   */
  beginCompositionSession(
    ownerId: string,
    options?: { message?: string },
  ): CompositionSession;

  /**
   * @deprecated Retained for legacy callers. Use `beginCompositionSession`.
   */
  beginComposition(): void;

  /**
   * @deprecated Use `CompositionSession.dispose()`.
   */
  endComposition(): void;

  /**
   * @deprecated Use `CompositionSession.report`.
   */
  setCompositionText?(text: string | null): void;

  // Logging and status
  setStatus(status: string): void;
  log(channel: string, message: string): void;
}
