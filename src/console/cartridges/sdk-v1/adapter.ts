import type { ResourceScope } from '../../lifecycle';
import type { RoccoCartridgeManifest } from '../types';
import type { RoccoEngine } from '../../engine-sdk';
import type { CartridgeCreateSaveRepoOptions, CartridgeSdkV1 } from './api';
import {
  CARTRIDGE_SDK_V1_CAPABILITIES,
  type CartridgeCapability,
} from './capabilities';
import { CARTRIDGE_SDK_VERSION } from './version';

export interface CreateCartridgeSdkV1Options {
  engine: RoccoEngine;
  scope: ResourceScope;
  manifest: RoccoCartridgeManifest;
}

function createVideoSdk(engine: RoccoEngine) {
  return {
    planes: engine.video.planes,
    sprites: engine.video.sprites,
    sceneTargets: engine.video.sceneTargets,
    actionMenus: engine.video.actionMenus,
    gridMenus: engine.video.gridMenus,
    messages: engine.video.messages,
    primitives: engine.video.primitives,
    titles: engine.video.titles,
    display: engine.video.display,
    preloadAssetUrls: (urls: Parameters<typeof engine.video.preloadAssetUrls>[0]) =>
      engine.video.preloadAssetUrls(urls),
    preloadPlaneScene: (scene: Parameters<typeof engine.video.preloadPlaneScene>[0]) =>
      engine.video.preloadPlaneScene(scene),
    preloadSpriteDefinition: (
      definition: Parameters<typeof engine.video.preloadSpriteDefinition>[0],
    ) => engine.video.preloadSpriteDefinition(definition),
    preloadSpriteDefinitions: (
      definitions: Parameters<typeof engine.video.preloadSpriteDefinitions>[0],
    ) => engine.video.preloadSpriteDefinitions(definitions),
  };
}

function createJukeboxSdk(engine: RoccoEngine) {
  return {
    registerPlaylist: (playlist: Parameters<typeof engine.jukebox.registerPlaylist>[0]) =>
      engine.jukebox.registerPlaylist(playlist),
    unregisterPlaylist: (playlistId: string) => engine.jukebox.unregisterPlaylist(playlistId),
    playPlaylist: (playlistId: string) => engine.jukebox.playPlaylist(playlistId),
    stopPlaylist: () => engine.jukebox.stopPlaylist(),
    isPlaying: () => engine.jukebox.isPlaying(),
    setVolume: (volume: number) => engine.jukebox.setVolume(volume),
    getCurrentTrack: () => engine.jukebox.getCurrentTrack(),
  };
}

function createEffectsSdk(engine: RoccoEngine) {
  return {
    add: (effect: Parameters<typeof engine.effects.add>[0]) => engine.effects.add(effect),
    remove: (effectId: string) => engine.effects.remove(effectId),
    enable: (effectId: string) => engine.effects.enable(effectId),
    disable: (effectId: string) => engine.effects.disable(effectId),
    update: (effectId: string, patch: Parameters<typeof engine.effects.update>[1]) =>
      engine.effects.update(effectId, patch),
  };
}

function createStorageSdk(engine: RoccoEngine, manifest: RoccoCartridgeManifest) {
  return {
    loadPlaneSceneRecord: (sceneId: string) =>
      engine.persistence.loadPlaneSceneRecord(manifest.id, sceneId),
    savePlaneScene: (scene: Parameters<typeof engine.persistence.savePlaneScene>[1]) =>
      engine.persistence.savePlaneScene(manifest.id, scene),
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
 * Wraps the full `RoccoEngine` kernel into the narrow, version-stamped
 * `CartridgeSdkV1` surface. Internal-only members (`video.update`,
 * `video.render`, `video.viewport`, `video.zoom`, render-layer ordering,
 * `effects.tick`, `jukebox.unlock`) are *not* present on the returned
 * object, so a cartridge cannot reach them even at runtime.
 *
 * Callers must have already validated the manifest with
 * `assertCartridgeSdkCompatibility`, so the `capabilities` list is safe to
 * treat as the supported set.
 */
export function createCartridgeSdkV1(
  options: CreateCartridgeSdkV1Options,
): CartridgeSdkV1 {
  const { engine, scope, manifest } = options;
  const capabilities = (
    manifest.runtime?.capabilities ?? CARTRIDGE_SDK_V1_CAPABILITIES
  ) as readonly CartridgeCapability[];

  return {
    video: createVideoSdk(engine),
    audio: engine.audio,
    jukebox: createJukeboxSdk(engine),
    effects: createEffectsSdk(engine),
    input: {
      acquireInputLease: (ownerId, mode) =>
        engine.acquireInputLease(ownerId, mode),
      getInputMode: () => engine.getInputMode(),
    },
    storage: createStorageSdk(engine, manifest),
    logger: createLoggerSdk(engine),
    loadPlaneScene: (scene) => engine.loadPlaneScene(scene),
    serializePlaneScene: (sceneId) => engine.serializePlaneScene(sceneId),
    setPlayerSprite: (instanceId) => engine.setPlayerSprite(instanceId),
    getPlayerSprite: () => engine.getPlayerSprite(),
    isDeveloperModeEnabled: () => engine.isDeveloperModeEnabled?.() ?? false,
    getConsoleFlags: () => engine.getConsoleFlags?.(),
    setConsoleFlags: (patch) => engine.setConsoleFlags?.(patch),
    beginCompositionSession: (ownerId, options) =>
      engine.beginCompositionSession(ownerId, options),
    scope,
    sdkVersion: CARTRIDGE_SDK_VERSION,
    capabilities,
  };
}
