import type { ResourceScope } from '../../lifecycle';
import type { RoccoCartridgeManifest } from '../types';
import type { ConsoleKernel } from '../../console-kernel';
import type {
  CartridgeAudioApi,
  CartridgeCreateSaveRepoOptions,
  CartridgeEffectsApi,
  CartridgeJukeboxApi,
  CartridgeSdkV1,
  CartridgeStorageApi,
  CartridgeVideoApi,
} from './api';
import { CARTRIDGE_SDK_V1_CAPABILITIES, type CartridgeCapability } from './capabilities';
import { CARTRIDGE_SDK_VERSION } from './version';

export interface CreateCartridgeSdkV1Options {
  kernel: ConsoleKernel;
  scope: ResourceScope;
  manifest: RoccoCartridgeManifest;
}

type FacadeMethod = (...arguments_: never[]) => unknown;
type MutableCartridgeVideoApi = {
  -readonly [Key in keyof CartridgeVideoApi]: CartridgeVideoApi[Key];
};
type MutableCartridgeSdkV1 = {
  -readonly [Key in keyof CartridgeSdkV1]: CartridgeSdkV1[Key];
};

const PLANE_METHODS = ['loadScene', 'serializeScene', 'updatePlane', 'resolvePlane'] as const;
const SPRITE_METHODS = [
  'registerWalkMap',
  'unregisterWalkMap',
  'getWalkMap',
  'listWalkMaps',
  'registerSpriteDefinition',
  'unregisterSpriteDefinition',
  'getSpriteDefinition',
  'listSpriteDefinitions',
  'loadSpriteDefinition',
  'loadSpriteDefinitions',
  'createSprite',
  'createSpriteFromDefinition',
  'removeSprite',
  'getSprite',
  'listSprites',
  'playAnimation',
  'playAction',
  'stopAnimation',
  'setAnimationFrame',
  'setPlaybackRate',
  'bindAnimationToMotion',
  'setPosition',
  'setScale',
  'setFlip',
  'setPresentationTransform',
  'setVisibleDescription',
  'translate',
  'setVelocity',
  'setAcceleration',
  'stopMovement',
  'moveTo',
  'goTo',
  'moveBy',
  'followPath',
  'cancelMovement',
  'isMoving',
  'setFacing',
  'setRenderLayer',
  'setZIndex',
  'setDepthMode',
  'setContrast',
  'setInteractive',
  'setCollisionEnabled',
  'bindToWalkMap',
  'clearWalkMapBinding',
  'hitTest',
  'hitTestVisiblePixel',
  'queryCollisions',
] as const;
const SCENE_TARGET_METHODS = [
  'registerTarget',
  'unregisterTarget',
  'clearTargets',
  'getTarget',
  'listTargets',
  'setEnabled',
  'setVisibleDescription',
  'hitTest',
  'hitTestVisible',
] as const;
const ACTION_MENU_METHODS = [
  'registerMenu',
  'unregisterMenu',
  'listMenus',
  'openMenuForTarget',
  'closeMenu',
  'isOpen',
  'setHoverAt',
  'getHoveredItem',
  'activateAt',
  'getRenderableMenu',
] as const;
const GRID_MENU_METHODS = [
  'openMenu',
  'toggleMenu',
  'closeMenu',
  'isOpen',
  'setHoverAt',
  'getHoveredItem',
  'activateAt',
  'getCarriedItem',
  'clearCarriedItem',
  'getRenderableMenu',
] as const;
const MESSAGE_METHODS = [
  'showMessage',
  'say',
  'think',
  'removeMessage',
  'clearMessages',
  'listMessages',
  'listRenderableMessages',
] as const;
const PRIMITIVE_METHODS = [
  'addPrimitive',
  'removePrimitive',
  'clearPrimitives',
  'listPrimitives',
] as const;
const TITLE_METHODS = ['addTitle', 'removeTitle', 'clearTitles', 'getTitle', 'listTitles'] as const;
const DISPLAY_METHODS = ['getProfile', 'setProfile'] as const;
const CAMERA_METHODS = ['setTransform', 'animateTo', 'clear'] as const;
const AUDIO_METHODS = [
  'registerSound',
  'unregisterSound',
  'preloadSound',
  'playSound',
  'setSoundVolume',
  'stopSound',
  'stopAllSounds',
] as const;
const JUKEBOX_METHODS = [
  'registerPlaylist',
  'unregisterPlaylist',
  'playPlaylist',
  'stopPlaylist',
  'isPlaying',
  'setVolume',
  'getCurrentTrack',
] as const;
const EFFECT_METHODS = ['add', 'remove', 'enable', 'disable', 'update'] as const;

function createMethodFacade<T extends object, K extends keyof T>(
  source: T,
  methodNames: readonly K[],
): Pick<T, K> {
  const facade = {} as Pick<T, K>;
  for (const methodName of methodNames) {
    const method = source[methodName] as FacadeMethod;
    Object.defineProperty(facade, methodName, {
      enumerable: true,
      value: (...arguments_: never[]) => Reflect.apply(method, source, arguments_) as unknown,
    });
  }

  return facade;
}

function hasCapability(
  capabilities: readonly CartridgeCapability[],
  capability: CartridgeCapability,
): boolean {
  return capabilities.includes(capability);
}

function createForCapability<T>(
  capabilities: readonly CartridgeCapability[],
  capability: CartridgeCapability,
  factory: () => T,
): T | undefined {
  return hasCapability(capabilities, capability) ? factory() : undefined;
}

function selectForCapability<T>(
  capabilities: readonly CartridgeCapability[],
  capability: CartridgeCapability,
  value: T,
): T | undefined {
  return hasCapability(capabilities, capability) ? value : undefined;
}

function createResetSdk(
  capabilities: readonly CartridgeCapability[],
  kernel: ConsoleKernel,
): (() => void) | undefined {
  return selectForCapability(capabilities, 'console.reset.v1', kernel.requestReset?.bind(kernel));
}

function createVideoSdk(
  kernel: ConsoleKernel,
  capabilities: readonly CartridgeCapability[],
): CartridgeVideoApi | undefined {
  const hasPlanes = hasCapability(capabilities, 'video.planes.v1');
  const hasSprites = hasCapability(capabilities, 'video.sprites.v1');
  const hasMenus = hasCapability(capabilities, 'video.menus.v1');
  if (!hasPlanes && !hasSprites && !hasMenus) {
    return undefined;
  }

  const video: MutableCartridgeVideoApi = {
    preloadAssetUrls: (assetUrls) => kernel.video.preloadAssetUrls(assetUrls),
    camera: createMethodFacade(kernel.video.zoom, CAMERA_METHODS),
  };
  if (hasPlanes) {
    video.planes = createMethodFacade(kernel.video.planes, PLANE_METHODS);
    video.display = createMethodFacade(kernel.video.display, DISPLAY_METHODS);
    video.preloadPlaneScene = (scene) => kernel.video.preloadPlaneScene(scene);
  }
  if (hasSprites) {
    video.sprites = createMethodFacade(kernel.video.sprites, SPRITE_METHODS);
    video.sceneTargets = kernel.video.sceneTargets
      ? createMethodFacade(kernel.video.sceneTargets, SCENE_TARGET_METHODS)
      : undefined;
    video.preloadSpriteDefinition = (definition) =>
      kernel.video.preloadSpriteDefinition(definition);
    video.preloadSpriteDefinitions = (definitions) =>
      kernel.video.preloadSpriteDefinitions(definitions);
  }
  if (hasMenus) {
    video.actionMenus = createMethodFacade(kernel.video.actionMenus, ACTION_MENU_METHODS);
    video.gridMenus = createMethodFacade(kernel.video.gridMenus, GRID_MENU_METHODS);
    video.messages = createMethodFacade(kernel.video.messages, MESSAGE_METHODS);
    video.primitives = createMethodFacade(kernel.video.primitives, PRIMITIVE_METHODS);
    video.titles = createMethodFacade(kernel.video.titles, TITLE_METHODS);
    video.display = createMethodFacade(kernel.video.display, DISPLAY_METHODS);
  }

  return video;
}

function createAudioSdk(kernel: ConsoleKernel): CartridgeAudioApi {
  return createMethodFacade(kernel.audio, AUDIO_METHODS);
}

function createJukeboxSdk(kernel: ConsoleKernel): CartridgeJukeboxApi {
  return createMethodFacade(kernel.jukebox, JUKEBOX_METHODS);
}

function createEffectsSdk(kernel: ConsoleKernel): CartridgeEffectsApi {
  return createMethodFacade(kernel.effects, EFFECT_METHODS);
}

function createStorageSdk(
  kernel: ConsoleKernel,
  manifest: RoccoCartridgeManifest,
): CartridgeStorageApi {
  return {
    loadPlaneSceneRecord: (sceneId) =>
      kernel.persistence.loadPlaneSceneRecord(manifest.id, sceneId),
    savePlaneScene: (scene) => kernel.persistence.savePlaneScene(manifest.id, scene),
    createSaveRepository: <TState>(repoOptions: CartridgeCreateSaveRepoOptions<TState>) =>
      kernel.persistence.createSaveRepository<TState>({
        ...repoOptions,
        cartridgeId: manifest.id,
        cartridgeVersion: manifest.version,
      }),
  };
}

function createLoggerSdk(kernel: ConsoleKernel) {
  return {
    log: (channel: string, message: string) => kernel.log(channel, message),
    setStatus: (status: string) => kernel.setStatus(status),
  };
}

/**
 * Wraps the console kernel in a capability-filtered SDK v1 surface. Every
 * exposed subsystem is a method facade; no kernel subsystem object is returned.
 */
export function createCartridgeSdkV1(options: CreateCartridgeSdkV1Options): CartridgeSdkV1 {
  const { kernel, scope, manifest } = options;
  const capabilities = (manifest.runtime.capabilities ??
    CARTRIDGE_SDK_V1_CAPABILITIES) as readonly CartridgeCapability[];
  const logger = createForCapability(capabilities, 'logger.v1', () => createLoggerSdk(kernel));
  const input = createForCapability(capabilities, 'input.v1', () => ({
    acquireInputLease: (ownerId: string, mode: Parameters<ConsoleKernel['acquireInputLease']>[1]) =>
      kernel.acquireInputLease(ownerId, mode),
    getInputMode: () => kernel.getInputMode(),
  }));
  const sdk: MutableCartridgeSdkV1 = {
    sdkVersion: CARTRIDGE_SDK_VERSION,
    capabilities,
    video: createVideoSdk(kernel, capabilities),
    audio: createForCapability(capabilities, 'audio.v1', () => createAudioSdk(kernel)),
    jukebox: createForCapability(capabilities, 'jukebox.v1', () => createJukeboxSdk(kernel)),
    effects: createForCapability(capabilities, 'effects.v1', () => createEffectsSdk(kernel)),
    input,
    acquireInputLease: input?.acquireInputLease,
    getInputMode: input?.getInputMode,
    storage: createForCapability(capabilities, 'storage.v1', () =>
      createStorageSdk(kernel, manifest),
    ),
    logger,
    log: logger?.log,
    setStatus: logger?.setStatus,
    scope: createForCapability(capabilities, 'scope.v1', () => scope),
    loadPlaneScene: selectForCapability(
      capabilities,
      'video.planes.v1',
      kernel.loadPlaneScene?.bind(kernel),
    ),
    serializePlaneScene: selectForCapability(
      capabilities,
      'video.planes.v1',
      kernel.serializePlaneScene?.bind(kernel),
    ),
    setPlayerSprite: selectForCapability(
      capabilities,
      'video.sprites.v1',
      kernel.setPlayerSprite?.bind(kernel),
    ),
    getPlayerSprite: selectForCapability(
      capabilities,
      'video.sprites.v1',
      kernel.getPlayerSprite?.bind(kernel),
    ),
    isDeveloperModeEnabled: () => kernel.isDeveloperModeEnabled?.() ?? false,
    getConsoleFlags: () => kernel.getConsoleFlags?.(),
    setConsoleFlags: (patch) => kernel.setConsoleFlags?.(patch),
    beginCompositionSession: selectForCapability(
      capabilities,
      'composition.v1',
      kernel.beginCompositionSession?.bind(kernel),
    ),
    requestReset: createResetSdk(capabilities, kernel),
  };

  return sdk;
}
