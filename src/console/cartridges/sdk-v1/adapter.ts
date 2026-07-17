import type { ResourceScope } from '../../lifecycle';
import type { RoccoCartridgeManifest } from '../types';
import type { RoccoEngine } from '../../engine-sdk';
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
  engine: RoccoEngine;
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
  'getPrimitive',
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

function createVideoSdk(
  engine: RoccoEngine,
  capabilities: readonly CartridgeCapability[],
): CartridgeVideoApi | undefined {
  const hasPlanes = hasCapability(capabilities, 'video.planes.v1');
  const hasSprites = hasCapability(capabilities, 'video.sprites.v1');
  const hasMenus = hasCapability(capabilities, 'video.menus.v1');
  if (!hasPlanes && !hasSprites && !hasMenus) {
    return undefined;
  }

  const video: MutableCartridgeVideoApi = {
    preloadAssetUrls: (assetUrls) => engine.video.preloadAssetUrls(assetUrls),
    camera: createMethodFacade(engine.video.zoom, CAMERA_METHODS),
  };
  if (hasPlanes) {
    video.planes = createMethodFacade(engine.video.planes, PLANE_METHODS);
    video.display = createMethodFacade(engine.video.display, DISPLAY_METHODS);
    video.preloadPlaneScene = (scene) => engine.video.preloadPlaneScene(scene);
  }
  if (hasSprites) {
    video.sprites = createMethodFacade(engine.video.sprites, SPRITE_METHODS);
    video.sceneTargets = engine.video.sceneTargets
      ? createMethodFacade(engine.video.sceneTargets, SCENE_TARGET_METHODS)
      : undefined;
    video.preloadSpriteDefinition = (definition) =>
      engine.video.preloadSpriteDefinition(definition);
    video.preloadSpriteDefinitions = (definitions) =>
      engine.video.preloadSpriteDefinitions(definitions);
  }
  if (hasMenus) {
    video.actionMenus = createMethodFacade(engine.video.actionMenus, ACTION_MENU_METHODS);
    video.gridMenus = createMethodFacade(engine.video.gridMenus, GRID_MENU_METHODS);
    video.messages = createMethodFacade(engine.video.messages, MESSAGE_METHODS);
    video.primitives = createMethodFacade(engine.video.primitives, PRIMITIVE_METHODS);
    video.titles = createMethodFacade(engine.video.titles, TITLE_METHODS);
    video.display = createMethodFacade(engine.video.display, DISPLAY_METHODS);
  }

  return video;
}

function createAudioSdk(engine: RoccoEngine): CartridgeAudioApi {
  return createMethodFacade(engine.audio, AUDIO_METHODS);
}

function createJukeboxSdk(engine: RoccoEngine): CartridgeJukeboxApi {
  return createMethodFacade(engine.jukebox, JUKEBOX_METHODS);
}

function createEffectsSdk(engine: RoccoEngine): CartridgeEffectsApi {
  return createMethodFacade(engine.effects, EFFECT_METHODS);
}

function createStorageSdk(
  engine: RoccoEngine,
  manifest: RoccoCartridgeManifest,
): CartridgeStorageApi {
  return {
    loadPlaneSceneRecord: (sceneId) =>
      engine.persistence.loadPlaneSceneRecord(manifest.id, sceneId),
    savePlaneScene: (scene) => engine.persistence.savePlaneScene(manifest.id, scene),
    createSaveRepository: <TState>(repoOptions: CartridgeCreateSaveRepoOptions<TState>) =>
      engine.persistence.createSaveRepository<TState>({
        ...repoOptions,
        cartridgeId: manifest.id,
        cartridgeVersion: manifest.version,
      }),
  };
}

function createLoggerSdk(engine: RoccoEngine) {
  return {
    log: (channel: string, message: string) => engine.log(channel, message),
    setStatus: (status: string) => engine.setStatus(status),
  };
}

/**
 * Wraps the kernel in a capability-filtered SDK v1 surface. Every exposed
 * subsystem is a method facade; no engine subsystem object is returned.
 */
export function createCartridgeSdkV1(options: CreateCartridgeSdkV1Options): CartridgeSdkV1 {
  const { engine, scope, manifest } = options;
  const capabilities = (manifest.runtime?.capabilities ??
    CARTRIDGE_SDK_V1_CAPABILITIES) as readonly CartridgeCapability[];
  const logger = createForCapability(capabilities, 'logger.v1', () => createLoggerSdk(engine));
  const input = createForCapability(capabilities, 'input.v1', () => ({
    acquireInputLease: (ownerId: string, mode: Parameters<RoccoEngine['acquireInputLease']>[1]) =>
      engine.acquireInputLease(ownerId, mode),
    getInputMode: () => engine.getInputMode(),
  }));
  const sdk: MutableCartridgeSdkV1 = {
    sdkVersion: CARTRIDGE_SDK_VERSION,
    capabilities,
    video: createVideoSdk(engine, capabilities),
    audio: createForCapability(capabilities, 'audio.v1', () => createAudioSdk(engine)),
    jukebox: createForCapability(capabilities, 'jukebox.v1', () => createJukeboxSdk(engine)),
    effects: createForCapability(capabilities, 'effects.v1', () => createEffectsSdk(engine)),
    input,
    acquireInputLease: input?.acquireInputLease,
    getInputMode: input?.getInputMode,
    storage: createForCapability(capabilities, 'storage.v1', () =>
      createStorageSdk(engine, manifest),
    ),
    logger,
    log: logger?.log,
    setStatus: logger?.setStatus,
    scope: createForCapability(capabilities, 'scope.v1', () => scope),
    loadPlaneScene: selectForCapability(
      capabilities,
      'video.planes.v1',
      engine.loadPlaneScene?.bind(engine),
    ),
    serializePlaneScene: selectForCapability(
      capabilities,
      'video.planes.v1',
      engine.serializePlaneScene?.bind(engine),
    ),
    setPlayerSprite: selectForCapability(
      capabilities,
      'video.sprites.v1',
      engine.setPlayerSprite?.bind(engine),
    ),
    getPlayerSprite: selectForCapability(
      capabilities,
      'video.sprites.v1',
      engine.getPlayerSprite?.bind(engine),
    ),
    isDeveloperModeEnabled: () => engine.isDeveloperModeEnabled?.() ?? false,
    getConsoleFlags: () => engine.getConsoleFlags?.(),
    setConsoleFlags: (patch) => engine.setConsoleFlags?.(patch),
    beginCompositionSession: selectForCapability(
      capabilities,
      'composition.v1',
      engine.beginCompositionSession?.bind(engine),
    ),
  };

  return sdk;
}
