import type { ConsoleKernel } from '../../../src/console/console-kernel';
import {
  CARTRIDGE_SDK_V1_CAPABILITIES,
  type CartridgeSdkV1Runtime,
  type CartridgeStorageApi,
} from '../../../src/console/cartridges/sdk-v1';
import type { CartridgeCreateSaveRepoOptions } from '../../../src/console/cartridges/sdk-v1/api';
import type { CartridgeSaveRepo } from '../../../src/console/persistence/types';
import { createResourceScope } from '../../../src/console/lifecycle';

/**
 * Broad kernel-shaped fixture accepted by the test SDK helper. Focused unit
 * tests build partial versions of this and adapt them to an SDK-shaped object.
 */
export type RoccoTestKernelFixture = ConsoleKernel | CartridgeSdkV1Runtime;

/**
 * Adapts a broad kernel-shaped test fixture to the SDK-shaped arguments used by
 * the official cartridge unit tests. Contract tests exercise the real capability
 * facade; these focused fixtures keep their existing subsystem spies.
 *
 * The result is SDK-shaped and must never be used as a production mount
 * fallback.
 */
export function asRoccoTestSdk(fixture: RoccoTestKernelFixture): CartridgeSdkV1Runtime {
  const persistence = (fixture as Partial<ConsoleKernel>).persistence;
  const storage: CartridgeStorageApi = {
    loadPlaneSceneRecord: (sceneId) =>
      persistence?.loadPlaneSceneRecord('rocco-default', sceneId) ?? Promise.resolve(null),
    savePlaneScene: (scene) =>
      persistence?.savePlaneScene('rocco-default', scene) ?? Promise.resolve(),
    createSaveRepository: <TState>(
      _options: CartridgeCreateSaveRepoOptions<TState>,
    ): CartridgeSaveRepo<TState> => {
      throw new Error('The test fixture does not provide save repositories.');
    },
  };
  const scope = createResourceScope('test:rocco-sdk');

  return new Proxy(fixture, {
    get(target, property, receiver) {
      if (property === 'sdkVersion') {
        return '1.0.0';
      }
      if (property === 'capabilities') {
        return CARTRIDGE_SDK_V1_CAPABILITIES;
      }
      if (property === 'storage') {
        return storage;
      }
      if (property === 'video') {
        const video = Reflect.get(target, property, receiver) as
          | (CartridgeSdkV1Runtime['video'] & { zoom?: CartridgeSdkV1Runtime['video']['camera'] })
          | undefined;
        if (video && 'zoom' in video && video.zoom) {
          const { zoom, ...sdkVideo } = video;
          return { ...sdkVideo, camera: zoom };
        }
        return video;
      }
      if (property === 'scope') {
        return scope;
      }
      return Reflect.get(target, property, receiver) as unknown;
    },
  }) as unknown as CartridgeSdkV1Runtime;
}
