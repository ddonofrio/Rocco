import type { ResourceScope } from '../../lifecycle';
import type { RoccoCartridgeManifest } from '../types';
import type { RoccoEngine } from '../../engine-sdk';
import type { CartridgeSdkV1 } from './api';
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
    video: {
      planes: engine.video.planes,
      sprites: engine.video.sprites,
      sceneTargets: engine.video.sceneTargets,
      actionMenus: engine.video.actionMenus,
      gridMenus: engine.video.gridMenus,
      messages: engine.video.messages,
      primitives: engine.video.primitives,
      titles: engine.video.titles,
      display: engine.video.display,
      preloadAssetUrls: (urls) => engine.video.preloadAssetUrls(urls),
      preloadPlaneScene: (scene) => engine.video.preloadPlaneScene(scene),
      preloadSpriteDefinition: (definition) =>
        engine.video.preloadSpriteDefinition(definition),
      preloadSpriteDefinitions: (definitions) =>
        engine.video.preloadSpriteDefinitions(definitions),
    },
    audio: engine.audio,
    jukebox: {
      registerPlaylist: (playlist) => engine.jukebox.registerPlaylist(playlist),
      unregisterPlaylist: (playlistId) =>
        engine.jukebox.unregisterPlaylist(playlistId),
      playPlaylist: (playlistId) => engine.jukebox.playPlaylist(playlistId),
      stopPlaylist: () => engine.jukebox.stopPlaylist(),
      isPlaying: () => engine.jukebox.isPlaying(),
      setVolume: (volume) => engine.jukebox.setVolume(volume),
      getCurrentTrack: () => engine.jukebox.getCurrentTrack(),
    },
    effects: {
      add: (effect) => engine.effects.add(effect),
      remove: (effectId) => engine.effects.remove(effectId),
      enable: (effectId) => engine.effects.enable(effectId),
      disable: (effectId) => engine.effects.disable(effectId),
      update: (effectId, patch) => engine.effects.update(effectId, patch),
    },
    input: {
      acquireInputLease: (ownerId, mode) =>
        engine.acquireInputLease(ownerId, mode),
      getInputMode: () => engine.getInputMode(),
    },
    storage: {
      loadPlaneSceneRecord: (sceneId) =>
        engine.persistence.loadPlaneSceneRecord(manifest.id, sceneId),
      savePlaneScene: (scene) => engine.persistence.savePlaneScene(manifest.id, scene),
      createSaveRepository: (repositoryOptions) =>
        engine.persistence.createSaveRepository({
          ...repositoryOptions,
          cartridgeId: manifest.id,
          cartridgeVersion: manifest.version,
        }),
    },
    logger: {
      log: (channel, message) => engine.log(channel, message),
      setStatus: (status) => engine.setStatus(status),
    },
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
