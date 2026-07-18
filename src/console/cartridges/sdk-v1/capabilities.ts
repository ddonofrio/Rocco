/**
 * Capability ids negotiated between the console and a cartridge through the
 * `runtime.capabilities` manifest field.
 *
 * These are the stable, version-stamped surfaces that `CartridgeSdkV1`
 * exposes. A cartridge that declares a capability it does not use still works
 * (the SDK always exposes the full v1 set); the declaration lets the console
 * reject manifests that ask for something it does not implement.
 */

export type CartridgeCapability =
  | 'video.sprites.v1'
  | 'video.planes.v1'
  | 'video.menus.v1'
  | 'audio.v1'
  | 'jukebox.v1'
  | 'effects.v1'
  | 'input.v1'
  | 'storage.v1'
  | 'composition.v1'
  | 'logger.v1'
  | 'scope.v1';

/** Capabilities the console currently implements for SDK v1. */
export const CONSOLE_SUPPORTED_CAPABILITIES: readonly CartridgeCapability[] = [
  'video.sprites.v1',
  'video.planes.v1',
  'video.menus.v1',
  'audio.v1',
  'jukebox.v1',
  'effects.v1',
  'input.v1',
  'storage.v1',
  'composition.v1',
  'logger.v1',
  'scope.v1',
];

/** The full v1 capability set, used when a manifest omits `runtime`. */
export const CARTRIDGE_SDK_V1_CAPABILITIES: readonly CartridgeCapability[] =
  CONSOLE_SUPPORTED_CAPABILITIES;

export function isSupportedCapability(value: string): value is CartridgeCapability {
  return (CONSOLE_SUPPORTED_CAPABILITIES as readonly string[]).includes(value);
}
