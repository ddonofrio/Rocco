/**
 * Public, version-stamped Cartridge SDK v1 surface.
 *
 * These are the *only* console capabilities a cartridge may rely on. They are
 * composed from the already-narrow neutral subsystem module interfaces, so the
 * host-only runtime methods (`video.update`, `video.render`, `video.viewport`,
 * `video.zoom`, `effects.tick`, `jukebox.unlock`, render-layer ordering) are
 * never part of the contract. See audit SDK-001 / ROCCO-011.
 */

import type { RoccoVideoPlaneModule, RoccoVideoDisplayModule } from '../../video/types';
import type { RoccoSpriteSystem } from '../../video/sprites/types';
import type { RoccoSceneTargetSystem } from '../../video/scene-targets/types';
import type { RoccoActionMenuSystem } from '../../video/action-menu/types';
import type { RoccoGridMenuSystem } from '../../video/grid-menu/types';
import type { RoccoSpriteMessageSystem } from '../../video/messages/types';
import type { RoccoPrimitiveSystem } from '../../video/primitives/types';
import type { RoccoTitleSystem } from '../../video/titles/types';
import type { RoccoSpriteDefinition } from '../../video/sprites/types';
import type { RoccoPlaneScene } from '../../video/planes';
import type { RoccoAudioSystem } from '../../audio/types';
import type { RoccoJukeboxSystem } from '../../audio/jukebox/types';
import type { RoccoEffectManager } from '../../effects/types';
import type { InputMode, InputPolicyLease } from '../../input/input-policy-stack';
import type { RoccoEnginePersistence } from '../../engine-sdk';
import type { ResourceScope } from '../../lifecycle';
import type { CompositionSession } from '../../composition/composition-service';
import type { CartridgeCapability } from './capabilities';

/**
 * Cartridge-facing video API. Excludes `viewport`, `zoom`, `update`,
 * `render`, and the render-layer ordering methods, which are internal
 * `ConsoleKernel` responsibilities.
 */
export interface CartridgeVideoApi {
  readonly planes: RoccoVideoPlaneModule;
  readonly sprites: RoccoSpriteSystem;
  readonly sceneTargets?: RoccoSceneTargetSystem;
  readonly actionMenus: RoccoActionMenuSystem;
  readonly gridMenus: RoccoGridMenuSystem;
  readonly messages: RoccoSpriteMessageSystem;
  readonly primitives: RoccoPrimitiveSystem;
  readonly titles: RoccoTitleSystem;
  readonly display: RoccoVideoDisplayModule;

  preloadAssetUrls(assetUrls: readonly string[]): Promise<void>;
  preloadPlaneScene(scene: RoccoPlaneScene): Promise<void>;
  preloadSpriteDefinition(definition: RoccoSpriteDefinition): Promise<void>;
  preloadSpriteDefinitions(definitions: RoccoSpriteDefinition[]): Promise<void>;
}

/** Audio API is already cartridge-safe; it returns `SoundHandle`. */
export type CartridgeAudioApi = RoccoAudioSystem;

/**
 * Jukebox API without `unlock()`, which is a runtime/gesture concern owned
 * by the console, not the cartridge.
 */
export type CartridgeJukeboxApi = Omit<RoccoJukeboxSystem, 'unlock'>;

/**
 * Effects API without `tick()`, the per-frame internal driven by the render loop.
 */
export type CartridgeEffectsApi = Omit<RoccoEffectManager, 'tick'>;

export interface CartridgeInputApi {
  acquireInputLease(ownerId: string, mode: InputMode): InputPolicyLease;
  getInputMode(): InputMode;
}

/** Narrower persistence surface already exposed by `RoccoEngine`. */
export type CartridgeStorageApi = RoccoEnginePersistence;

export interface CartridgeLoggerApi {
  log(channel: string, message: string): void;
  setStatus(status: string): void;
}

/**
 * The stable, version-stamped SDK a cartridge receives at `mount`.
 *
 * It never exposes internal runtime methods, carries its own `ResourceScope`
 * (so the cartridge can register disposers cleaned up with the cartridge), and
 * advertises the negotiated `capabilities`.
 */
export interface CartridgeSdkV1 {
  readonly video: CartridgeVideoApi;
  readonly audio: CartridgeAudioApi;
  readonly jukebox: CartridgeJukeboxApi;
  readonly effects: CartridgeEffectsApi;
  readonly input: CartridgeInputApi;
  readonly storage: CartridgeStorageApi;
  readonly logger: CartridgeLoggerApi;
  readonly scope: ResourceScope;
  readonly sdkVersion: string;
  readonly capabilities: readonly CartridgeCapability[];
  /**
   * Opens an owned composition/loading session. Exposed flat (like
   * `RoccoEngine`) so fallback to the raw engine kernel in tests/legacy paths
   * keeps working. See capability `composition.v1`.
   */
  beginCompositionSession(
    ownerId: string,
    options?: { message?: string },
  ): CompositionSession;
}
