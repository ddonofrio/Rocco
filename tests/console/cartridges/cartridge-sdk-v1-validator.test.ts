import { describe, expect, it } from 'vitest';

import type { RoccoCartridgeManifest } from '../../../src/console/cartridges/types';
import {
  CARTRIDGE_SDK_VERSION,
  CONSOLE_SUPPORTED_CAPABILITIES,
  CartridgeSdkIncompatibleError,
  assertCartridgeSdkCompatibility,
  checkCartridgeSdkCompatibility,
  isSupportedCapability,
} from '../../../src/console/cartridges/sdk-v1';

/**
 * Validator-ownership test file. It owns malformed runtime values, SDK-range
 * compatibility, unsupported capabilities, error result contents, and the
 * `CartridgeSdkIncompatibleError` shape. It never asserts SDK runtime shape or
 * delegation; that belongs to `cartridge-sdk-v1-adapter.contract.test.ts`.
 */

function manifest(overrides: Partial<RoccoCartridgeManifest> = {}): RoccoCartridgeManifest {
  return {
    id: 'c',
    title: 'c',
    version: '1.0.0',
    runtime: { sdk: '^1.0.0' },
    ...overrides,
  };
}

/** Builds untyped runtime-shaped values to exercise the runtime boundary. */
function untypedManifest(runtime: unknown): RoccoCartridgeManifest {
  return {
    id: 'c',
    title: 'c',
    version: '1.0.0',
    runtime: runtime as RoccoCartridgeManifest['runtime'],
  };
}

describe('Cartridge SDK compatibility validation — shape', () => {
  it('accepts a valid SDK range and supported capabilities', () => {
    const result = checkCartridgeSdkCompatibility(
      manifest({ runtime: { sdk: '^1.0.0', capabilities: ['audio.v1', 'video.sprites.v1'] } }),
    );

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects a malformed manifest missing runtime', () => {
    const malformedManifest = {
      id: 'legacy',
      title: 'Legacy',
      version: '1.0.0',
    } as unknown as RoccoCartridgeManifest;

    const result = checkCartridgeSdkCompatibility(malformedManifest);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/runtime/i);
  });

  it('rejects an incompatible SDK range', () => {
    const result = checkCartridgeSdkCompatibility(manifest({ runtime: { sdk: '^2.0.0' } }));

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/sdk/i);
  });

  it('rejects an unknown capability', () => {
    const result = checkCartridgeSdkCompatibility(
      manifest({ runtime: { sdk: '^1.0.0', capabilities: ['video.sprites.v1', 'unknown.cap'] } }),
    );

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/unknown\.cap/);
  });

  it('rejects an SDK runtime without its required SDK range', () => {
    const result = checkCartridgeSdkCompatibility(
      manifest({
        runtime: { capabilities: ['audio.v1'] } as unknown as RoccoCartridgeManifest['runtime'],
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/runtime\.sdk/);
  });

  it('recognises supported capabilities', () => {
    expect(isSupportedCapability('video.sprites.v1')).toBe(true);
    expect(isSupportedCapability('bogus.cap')).toBe(false);
  });

  it('requires runtime at the type level', () => {
    // @ts-expect-error runtime is mandatory for every cartridge manifest
    const invalidManifest: RoccoCartridgeManifest = {
      id: 'invalid',
      title: 'Invalid',
      version: '1.0.0',
    };

    expect(invalidManifest.id).toBe('invalid');
  });
});

describe('Cartridge SDK malformed runtime validation', () => {
  describe('invalid runtime value', () => {
    const cases: Array<[string, unknown]> = [
      ['undefined', undefined],
      ['null', null],
      ['string', 'sdk-v1'],
      ['number', 1],
      ['array', []],
    ];

    it.each(cases)('rejects runtime: %s', (_label, runtime) => {
      const result = checkCartridgeSdkCompatibility(untypedManifest(runtime));
      expect(result.ok).toBe(false);
      expect(result.errors.join(' ')).toMatch(/manifest\.runtime must be an object/);
      expect(() => assertCartridgeSdkCompatibility(untypedManifest(runtime))).toThrow(
        CartridgeSdkIncompatibleError,
      );
    });
  });

  describe('invalid runtime.sdk value', () => {
    const cases: Array<[string, unknown]> = [
      ['empty object', {}],
      ['sdk undefined', { sdk: undefined }],
      ['sdk null', { sdk: null }],
      ['sdk number', { sdk: 1 }],
      ['sdk object', { sdk: {} }],
      ['sdk empty string', { sdk: '' }],
      ['sdk whitespace', { sdk: ' '.repeat(3) }],
    ];

    it.each(cases)('rejects runtime: %s', (_label, runtime) => {
      const result = checkCartridgeSdkCompatibility(untypedManifest(runtime));
      expect(result.ok).toBe(false);
      expect(result.errors.join(' ')).toMatch(/manifest\.runtime\.sdk must be a non-empty string/);
      expect(() => assertCartridgeSdkCompatibility(untypedManifest(runtime))).toThrow(
        CartridgeSdkIncompatibleError,
      );
    });
  });

  describe('invalid runtime.capabilities value', () => {
    const cases: Array<[string, unknown]> = [
      ['capabilities null', { sdk: '^1.0.0', capabilities: null }],
      ['capabilities object', { sdk: '^1.0.0', capabilities: {} }],
      ['capabilities string', { sdk: '^1.0.0', capabilities: 'audio.v1' }],
      ['capabilities number element', { sdk: '^1.0.0', capabilities: [1] }],
      ['capabilities null element', { sdk: '^1.0.0', capabilities: ['audio.v1', null] }],
      ['capabilities object element', { sdk: '^1.0.0', capabilities: ['audio.v1', {}] }],
    ];

    it.each(cases)('rejects runtime: %s', (_label, runtime) => {
      const result = checkCartridgeSdkCompatibility(untypedManifest(runtime));
      expect(result.ok).toBe(false);
      expect(result.errors.join(' ')).toMatch(/manifest\.runtime\.capabilities/);
      expect(() => assertCartridgeSdkCompatibility(untypedManifest(runtime))).toThrow(
        CartridgeSdkIncompatibleError,
      );
    });

    it('identifies the index of a non-string capability element', () => {
      const result = checkCartridgeSdkCompatibility(
        untypedManifest({ sdk: '^1.0.0', capabilities: ['audio.v1', 1] }),
      );
      expect(result.ok).toBe(false);
      expect(result.errors.join(' ')).toMatch(
        /manifest\.runtime\.capabilities\[1\] must be a string/,
      );
    });
  });

  describe('valid regression cases remain compatible', () => {
    it('accepts runtime with omitted capabilities', () => {
      const result = checkCartridgeSdkCompatibility(untypedManifest({ sdk: '^1.0.0' }));
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts runtime with an empty capability array', () => {
      const result = checkCartridgeSdkCompatibility(
        untypedManifest({ sdk: '^1.0.0', capabilities: [] }),
      );
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts runtime with supported capabilities', () => {
      const result = checkCartridgeSdkCompatibility(
        untypedManifest({ sdk: '^1.0.0', capabilities: ['audio.v1'] }),
      );
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('compatibility (not shape) errors remain distinct', () => {
    it('rejects an incompatible but well-formed SDK range', () => {
      const result = checkCartridgeSdkCompatibility(untypedManifest({ sdk: '^2.0.0' }));
      expect(result.ok).toBe(false);
      expect(result.errors.join(' ')).toMatch(/runtime\.sdk/);
      expect(result.errors.join(' ')).not.toMatch(/must be an object|must be a non-empty string/);
    });

    it('rejects a well-formed array with an unsupported capability string', () => {
      const result = checkCartridgeSdkCompatibility(
        untypedManifest({ sdk: '^1.0.0', capabilities: ['audio.v1', 'unknown.cap'] }),
      );
      expect(result.ok).toBe(false);
      expect(result.errors.join(' ')).toMatch(/unknown\.cap/);
    });
  });

  describe('multiple simultaneous compatibility errors are preserved', () => {
    it('collects SDK-range and capability errors together', () => {
      const result = checkCartridgeSdkCompatibility(
        untypedManifest({ sdk: '^2.0.0', capabilities: ['audio.v1', 'unknown.cap'] }),
      );
      expect(result.ok).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.join(' ')).toMatch(/runtime\.sdk/);
      expect(result.errors.join(' ')).toMatch(/unknown\.cap/);
    });

    it('collects multiple non-string capability index errors', () => {
      const result = checkCartridgeSdkCompatibility(
        untypedManifest({ sdk: '^1.0.0', capabilities: [1, {}, 'audio.v1', null] }),
      );
      expect(result.ok).toBe(false);
      expect(result.errors.join(' ')).toMatch(/capabilities\[0\] must be a string/);
      expect(result.errors.join(' ')).toMatch(/capabilities\[1\] must be a string/);
      expect(result.errors.join(' ')).toMatch(/capabilities\[3\] must be a string/);
    });
  });
});

describe('CartridgeSdkIncompatibleError', () => {
  it('exposes the result as its name, message and .result', () => {
    const result = checkCartridgeSdkCompatibility(untypedManifest({ sdk: '^2.0.0' }));
    expect(result.ok).toBe(false);

    let thrown: CartridgeSdkIncompatibleError | undefined;
    try {
      assertCartridgeSdkCompatibility(untypedManifest({ sdk: '^2.0.0' }));
    } catch (error) {
      thrown = error as CartridgeSdkIncompatibleError;
    }

    expect(thrown).toBeInstanceOf(CartridgeSdkIncompatibleError);
    expect(thrown?.name).toBe('CartridgeSdkIncompatibleError');
    expect(thrown?.message).toMatch(/runtime\.sdk/);
    expect(thrown?.result).toStrictEqual(result);
    expect(thrown?.result.errors).toEqual(result.errors);
  });

  it('preserves multiple simultaneous errors in the thrown result', () => {
    const result = checkCartridgeSdkCompatibility(
      untypedManifest({ sdk: '^2.0.0', capabilities: ['unknown.cap'] }),
    );

    let thrown: CartridgeSdkIncompatibleError | undefined;
    try {
      assertCartridgeSdkCompatibility(
        untypedManifest({ sdk: '^2.0.0', capabilities: ['unknown.cap'] }),
      );
    } catch (error) {
      thrown = error as CartridgeSdkIncompatibleError;
    }

    expect(thrown?.result.errors).toEqual(result.errors);
    expect(thrown?.result.errors).toHaveLength(2);
  });
});

describe('Cartridge SDK version helper', () => {
  it('exposes the implemented console SDK version', () => {
    expect(CARTRIDGE_SDK_VERSION).toBe('1.0.0');
  });

  it('lists every console-supported capability', () => {
    expect(CONSOLE_SUPPORTED_CAPABILITIES).toContain('video.planes.v1');
    expect(CONSOLE_SUPPORTED_CAPABILITIES).toContain('video.sprites.v1');
    expect(CONSOLE_SUPPORTED_CAPABILITIES).toContain('video.menus.v1');
  });
});
