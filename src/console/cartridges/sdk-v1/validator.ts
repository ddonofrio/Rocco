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

/** Narrowing guard: an unknown value is a plain object record, not an array. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

/**
 * Validates a cartridge manifest's `runtime` requirements against what the
 * console implements for SDK v1.
 *
 * - `runtime` is required and must be a non-array object; a manifest without a
 *   valid `runtime` is incompatible.
 * - `runtime.sdk` is required, must be a non-empty string, and must satisfy the
 *   console's implemented SDK version.
 * - Every `runtime.capabilities` entry must be a capability the console
 *   actually exposes.
 *
 * The validator never assumes the incoming manifest satisfies the TypeScript
 * `RoccoCartridgeManifest` contract. It guards each nested value so malformed
 * runtime data (from untyped JavaScript, deserialized input, or dynamically
 * loaded modules) is rejected through the compatibility result instead of
 * throwing an incidental `TypeError`.
 */
export function checkCartridgeSdkCompatibility(
  manifest: RoccoCartridgeManifest,
): SdkCompatibilityResult {
  const errors: string[] = [];
  const runtime = manifest.runtime;

  if (!isRecord(runtime)) {
    return {
      ok: false,
      errors: Object.freeze(['manifest.runtime must be an object']),
    };
  }

  const sdk = runtime.sdk;
  if (typeof sdk !== 'string' || sdk.trim() === '') {
    return {
      ok: false,
      errors: Object.freeze(['manifest.runtime.sdk must be a non-empty string']),
    };
  }

  if (!satisfies(sdk, CARTRIDGE_SDK_VERSION)) {
    errors.push(`runtime.sdk '${sdk}' is not satisfied by console SDK '${CARTRIDGE_SDK_VERSION}'`);
  }

  const capabilities = runtime.capabilities;
  if (capabilities !== undefined) {
    if (!isStringArray(capabilities)) {
      return {
        ok: false,
        errors: Object.freeze(['manifest.runtime.capabilities must be an array when provided']),
      };
    }

    for (const [index, capability] of capabilities.entries()) {
      if (typeof capability !== 'string') {
        errors.push(`manifest.runtime.capabilities[${index}] must be a string`);
        continue;
      }
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
