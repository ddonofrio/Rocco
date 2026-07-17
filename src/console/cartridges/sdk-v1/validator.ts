import type { RoccoCartridgeManifest } from '../types';
import { CONSOLE_SUPPORTED_CAPABILITIES, isSupportedCapability } from './capabilities';
import { CARTRIDGE_SDK_VERSION, satisfies } from './version';

export interface SdkCompatibilityResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}

export class CartridgeSdkIncompatibleError extends Error {
  readonly result: SdkCompatibilityResult;

  constructor(result: SdkCompatibilityResult) {
    super(`Cartridge SDK is incompatible: ${result.errors.join('; ')}`);
    this.name = 'CartridgeSdkIncompatibleError';
    this.result = result;
  }
}

/**
 * Validates a cartridge manifest's `runtime` requirements against what the
 * console implements for SDK v1.
 *
 * - A manifest without `runtime` is implicitly compatible (legacy cartridges
 *   keep mounting).
 * - `runtime.sdk` is required and must satisfy the console's implemented SDK
 *   version.
 * - Every `runtime.capabilities` entry must be a capability the console
 *   actually exposes.
 */
export function checkCartridgeSdkCompatibility(
  manifest: RoccoCartridgeManifest,
): SdkCompatibilityResult {
  const errors: string[] = [];
  const runtime = manifest.runtime;

  if (!runtime) {
    return { ok: true, errors: Object.freeze([]) };
  }

  if (!runtime.sdk || !satisfies(runtime.sdk, CARTRIDGE_SDK_VERSION)) {
    errors.push(
      `runtime.sdk '${runtime.sdk ?? ''}' is not satisfied by console SDK '${CARTRIDGE_SDK_VERSION}'`,
    );
  }

  if (runtime.capabilities) {
    for (const capability of runtime.capabilities) {
      if (!isSupportedCapability(capability)) {
        errors.push(
          `unsupported capability '${capability}' (supported: ${CONSOLE_SUPPORTED_CAPABILITIES.join(', ')})`,
        );
      }
    }
  }

  return { ok: errors.length === 0, errors: Object.freeze(errors) };
}

/** Throws `CartridgeSdkIncompatibleError` when the manifest is incompatible. */
export function assertCartridgeSdkCompatibility(manifest: RoccoCartridgeManifest): void {
  const result = checkCartridgeSdkCompatibility(manifest);
  if (!result.ok) {
    throw new CartridgeSdkIncompatibleError(result);
  }
}
