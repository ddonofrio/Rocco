import type { RoccoAudioSystem } from './audio';
import type { RoccoJukeboxSystem } from './audio/jukebox';
import type { RoccoEffectManager } from './effects';
import type { RoccoVideoSystem } from './video';
import type { RoccoPlaneScene, RoccoPlaneSceneRecord } from './video/planes';
import type { InputMode, InputPolicyLease } from './input/input-policy-stack';
import type { CompositionSession } from './composition/composition-service';
import type { CartridgeSaveRepo, CreateSaveRepoOptions } from './persistence/types';
import type { RoccoConsoleFlags } from './console-flags';

export interface ConsolePersistence {
  loadPlaneSceneRecord(cartridgeId: string, sceneId: string): Promise<RoccoPlaneSceneRecord | null>;
  savePlaneScene(cartridgeId: string, scene: RoccoPlaneScene): Promise<void>;

  /**
   * Opens a versioned, slot/profile-scoped save repository bound to a
   * cartridge and its `CartridgeSaveProvider` (audit ROCCO-014 / DAT-001).
   * The returned repository owns transaction, revision guard, migration and
   * quota handling; the cartridge only supplies domain serialization.
   */
  createSaveRepository<TState>(options: CreateSaveRepoOptions<TState>): CartridgeSaveRepo<TState>;
}

/**
 * Internal host contract implemented by `GameRuntime`. The kernel owns host
 * runtime infrastructure and is never handed to a cartridge; cartridges receive
 * the capability-filtered `CartridgeSdkV1` produced by `createCartridgeSdkV1`.
 */
export interface ConsoleKernel {
  // Direct subsystem access
  readonly video: RoccoVideoSystem;
  readonly audio: RoccoAudioSystem;
  readonly jukebox: RoccoJukeboxSystem;
  readonly effects: RoccoEffectManager;
  readonly persistence: ConsolePersistence;

  // Scene management
  loadPlaneScene(scene: RoccoPlaneScene): void;
  serializePlaneScene(sceneId: string): RoccoPlaneScene;

  // Player state
  setPlayerSprite(instanceId: string | undefined): void;
  getPlayerSprite(): string | undefined;

  // Input control
  /**
   * Acquires a composable input lease. The effective mode is the most
   * restrictive of all active leases. Dispose the returned lease to release
   * the lock.
   */
  acquireInputLease(ownerId: string, mode: InputMode): InputPolicyLease;

  /** Effective composed input mode (most restrictive active lease). */
  getInputMode(): InputMode;

  /** Cancels action completions before a level is unpublished or the cartridge stops. */
  cancelActiveActions?(reason: string): void;

  // Console flags
  isDeveloperModeEnabled?(): boolean;
  getConsoleFlags?(): RoccoConsoleFlags;
  setConsoleFlags?(patch: Partial<RoccoConsoleFlags>): void;

  // Composition control (loading overlay)
  /**
   * Opens an owned composition session. Only the returned session may update or
   * close its overlay.
   */
  beginCompositionSession(ownerId: string, options?: { message?: string }): CompositionSession;

  // Logging and status
  setStatus(status: string): void;
  log(channel: string, message: string): void;
}
