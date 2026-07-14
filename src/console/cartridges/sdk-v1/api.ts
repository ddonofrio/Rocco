/**
 * Public, version-stamped Cartridge SDK v1 surface.
 *
 * These are the *only* console capabilities a cartridge may rely on. They are
 * composed from the already-narrow neutral subsystem module interfaces, so the
 * host-only runtime methods (`video.update`, `video.render`, `video.viewport`,
 * `video.zoom`, `effects.tick`, `jukebox.unlock`, render-layer ordering) are
 * never part of the contract. See audit SDK-001 / ROCCO-011.
 */

import type { RoccoConsoleFlags } from '../../engine-sdk';
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
import type { ResourceScope } from '../../lifecycle';
import type { CompositionSession } from '../../composition/composition-service';
import type {
  CartridgeSaveRepository as CartridgeSaveRepo,
  CreateSaveRepositoryOptions as CreateSaveRepoOptions,
} from '../../persistence/types';
import type { CartridgeCapability } from './capabilities';

export type CartridgeVideoPlaneApi = Pick<
  RoccoVideoPlaneModule,
  'loadScene' | 'serializeScene' | 'updatePlane' | 'resolvePlane'
>;

export type CartridgeSpriteApi = Pick<
  RoccoSpriteSystem,
  | 'registerWalkMap'
  | 'unregisterWalkMap'
  | 'getWalkMap'
  | 'listWalkMaps'
  | 'registerSpriteDefinition'
  | 'unregisterSpriteDefinition'
  | 'getSpriteDefinition'
  | 'listSpriteDefinitions'
  | 'loadSpriteDefinition'
  | 'loadSpriteDefinitions'
  | 'createSprite'
  | 'createSpriteFromDefinition'
  | 'removeSprite'
  | 'getSprite'
  | 'listSprites'
  | 'playAnimation'
  | 'playAction'
  | 'stopAnimation'
  | 'setAnimationFrame'
  | 'setPlaybackRate'
  | 'bindAnimationToMotion'
  | 'setPosition'
  | 'setScale'
  | 'setFlip'
  | 'setPresentationTransform'
  | 'setVisibleDescription'
  | 'translate'
  | 'setVelocity'
  | 'setAcceleration'
  | 'stopMovement'
  | 'moveTo'
  | 'goTo'
  | 'moveBy'
  | 'followPath'
  | 'cancelMovement'
  | 'isMoving'
  | 'setFacing'
  | 'setRenderLayer'
  | 'setZIndex'
  | 'setDepthMode'
  | 'setContrast'
  | 'setInteractive'
  | 'setCollisionEnabled'
  | 'bindToWalkMap'
  | 'clearWalkMapBinding'
  | 'hitTest'
  | 'hitTestVisiblePixel'
  | 'queryCollisions'
>;

export type CartridgeSceneTargetApi = Pick<
  RoccoSceneTargetSystem,
  | 'registerTarget'
  | 'unregisterTarget'
  | 'clearTargets'
  | 'getTarget'
  | 'listTargets'
  | 'setEnabled'
  | 'setVisibleDescription'
  | 'hitTest'
  | 'hitTestVisible'
>;

export type CartridgeActionMenuApi = Omit<RoccoActionMenuSystem, 'update'>;
export type CartridgeGridMenuApi = Pick<
  RoccoGridMenuSystem,
  | 'openMenu'
  | 'toggleMenu'
  | 'closeMenu'
  | 'isOpen'
  | 'setHoverAt'
  | 'getHoveredItem'
  | 'activateAt'
  | 'getCarriedItem'
  | 'clearCarriedItem'
  | 'getRenderableMenu'
>;
export type CartridgeMessageApi = Omit<RoccoSpriteMessageSystem, 'update'>;
export type CartridgePrimitiveApi = Pick<
  RoccoPrimitiveSystem,
  'addPrimitive' | 'removePrimitive' | 'clearPrimitives' | 'listPrimitives'
>;
export type CartridgeTitleApi = Omit<RoccoTitleSystem, 'update'>;
export type CartridgeDisplayApi = Pick<RoccoVideoDisplayModule, 'getProfile' | 'setProfile'>;

/**
 * Cartridge-facing video API. Excludes `viewport`, `zoom`, `update`,
 * `render`, and the render-layer ordering methods, which are internal
 * `ConsoleKernel` responsibilities.
 */
export interface CartridgeVideoApi {
  readonly planes: CartridgeVideoPlaneApi;
  readonly sprites: CartridgeSpriteApi;
  readonly sceneTargets?: CartridgeSceneTargetApi;
  readonly actionMenus: CartridgeActionMenuApi;
  readonly gridMenus: CartridgeGridMenuApi;
  readonly messages: CartridgeMessageApi;
  readonly primitives: CartridgePrimitiveApi;
  readonly titles: CartridgeTitleApi;
  readonly display: CartridgeDisplayApi;

  preloadAssetUrls(assetUrls: readonly string[]): Promise<void>;
  preloadPlaneScene(scene: RoccoPlaneScene): Promise<void>;
  preloadSpriteDefinition(definition: RoccoSpriteDefinition): Promise<void>;
  preloadSpriteDefinitions(definitions: RoccoSpriteDefinition[]): Promise<void>;
}

export type CartridgeAudioApi = Pick<
  RoccoAudioSystem,
  'registerSound' | 'unregisterSound' | 'preloadSound' | 'playSound' | 'setSoundVolume' | 'stopSound' | 'stopAllSounds'
>;

/**
 * Jukebox API without `unlock()`, which is a runtime/gesture concern owned
 * by the console, not the cartridge.
 */
export type CartridgeJukeboxApi = Pick<
  RoccoJukeboxSystem,
  'registerPlaylist' | 'unregisterPlaylist' | 'playPlaylist' | 'stopPlaylist' | 'isPlaying' | 'setVolume' | 'getCurrentTrack'
>;

/**
 * Effects API without `tick()`, the per-frame internal driven by the render loop.
 */
export type CartridgeEffectsApi = Pick<
  RoccoEffectManager,
  'add' | 'remove' | 'enable' | 'disable' | 'update'
>;

export interface CartridgeInputApi {
  acquireInputLease(ownerId: string, mode: InputMode): InputPolicyLease;
  getInputMode(): InputMode;
}

export type CartridgeCreateSaveRepositoryOptions<TState> = Omit<
  CreateSaveRepoOptions<TState>,
  'cartridgeId' | 'cartridgeVersion'
>;

export interface CartridgeStorageApi {
  loadPlaneSceneRecord(sceneId: string): Promise<import('../../video/planes').RoccoPlaneSceneRecord | null>;
  savePlaneScene(scene: RoccoPlaneScene): Promise<void>;
  createSaveRepository<TState>(
    options: CartridgeCreateSaveRepositoryOptions<TState>,
  ): CartridgeSaveRepo<TState>;
}

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
  loadPlaneScene(scene: RoccoPlaneScene): void;
  serializePlaneScene(sceneId: string): RoccoPlaneScene;
  setPlayerSprite(instanceId: string | undefined): void;
  getPlayerSprite(): string | undefined;
  isDeveloperModeEnabled(): boolean;
  getConsoleFlags(): RoccoConsoleFlags | undefined;
  setConsoleFlags(patch: Partial<RoccoConsoleFlags>): void;
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
