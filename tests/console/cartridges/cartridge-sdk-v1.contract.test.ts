import { describe, expect, it, vi } from 'vitest';

import { createResourceScope, type ResourceScope } from '../../../src/console/lifecycle';
import type { ConsoleKernel } from '../../../src/console/console-kernel';
import type { RoccoCartridgeManifest } from '../../../src/console/cartridges/types';
import {
  CARTRIDGE_SDK_VERSION,
  CONSOLE_SUPPORTED_CAPABILITIES,
  CartridgeSdkIncompatibleError,
  assertCartridgeSdkCompatibility,
  checkCartridgeSdkCompatibility,
  createCartridgeSdkV1,
  isSupportedCapability,
  type CartridgeSdkV1,
} from '../../../src/console/cartridges/sdk-v1';

/**
 * Builds a valid cartridge manifest. Every manifest must declare `runtime`;
 * capabilities default to the full supported set unless overridden.
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

/**
 * A fake `ConsoleKernel`. It deliberately implements the host-only members
 * (`video.update`, `video.render`, `video.viewport`, `effects.tick`,
 * `jukebox.unlock`, ...) so the contract proves the adapter *hides* them from
 * the cartridge-facing SDK rather than just never having them.
 */
interface FakeKernelSpies {
  audioPlaySound: ReturnType<typeof vi.fn>;
  effectsAdd: ReturnType<typeof vi.fn>;
  jukeboxRegisterPlaylist: ReturnType<typeof vi.fn>;
  log: ReturnType<typeof vi.fn>;
  beginCompositionSession: ReturnType<typeof vi.fn>;
}

/**
 * A fake `ConsoleKernel`. Spies are returned alongside the kernel so
 * assertions reference bare identifiers.
 */
function createFakeKernel(): { kernel: ConsoleKernel; spies: FakeKernelSpies } {
  const audioPlaySound = vi.fn(() => ({
    stop: vi.fn(),
    setVolume: vi.fn(),
    ended: Promise.resolve(),
  }));
  const effectsAdd = vi.fn();
  const jukeboxRegisterPlaylist = vi.fn();
  const log = vi.fn();
  const beginCompositionSession = vi.fn();

  const audio = {
    registerSound: vi.fn(),
    unregisterSound: vi.fn(),
    preloadSound: vi.fn(),
    playSound: audioPlaySound,
    setSoundVolume: vi.fn(),
    stopSound: vi.fn(),
    stopAllSounds: vi.fn(),
  };

  const video = {
    planes: {
      loadScene: vi.fn(),
      serializeScene: vi.fn(),
      updatePlane: vi.fn(),
      resolvePlane: vi.fn(),
    },
    sprites: {},
    actionMenus: {},
    gridMenus: {},
    messages: {},
    primitives: {},
    titles: {},
    display: { getProfile: vi.fn(), setProfile: vi.fn() },
    viewport: { setHost: vi.fn(), getHost: vi.fn() },
    zoom: { setTransform: vi.fn(), animateTo: vi.fn(), clear: vi.fn() },
    setRenderLayerOrder: vi.fn(),
    getRenderLayerOrder: vi.fn(),
    preloadAssetUrls: vi.fn(),
    preloadPlaneScene: vi.fn(),
    preloadSpriteDefinition: vi.fn(),
    preloadSpriteDefinitions: vi.fn(),
    update: vi.fn(),
    render: vi.fn(),
  };

  const jukebox = {
    registerPlaylist: jukeboxRegisterPlaylist,
    unregisterPlaylist: vi.fn(),
    playPlaylist: vi.fn(() =>
      Promise.resolve({ stop: vi.fn(), setVolume: vi.fn(), ended: Promise.resolve() }),
    ),
    stopPlaylist: vi.fn(),
    isPlaying: vi.fn(() => false),
    setVolume: vi.fn(),
    getCurrentTrack: vi.fn(),
    unlock: vi.fn(),
  };

  const effects = {
    add: effectsAdd,
    remove: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    update: vi.fn(),
    tick: vi.fn(),
  };

  const persistence = {
    loadPlaneSceneRecord: vi.fn(),
    savePlaneScene: vi.fn(),
  };

  const kernel = {
    video: video as never,
    audio: audio as never,
    jukebox: jukebox as never,
    effects: effects as never,
    persistence: persistence as never,
    acquireInputLease: vi.fn(),
    getInputMode: vi.fn(() => 'interactive'),
    setInputEnabled: vi.fn(),
    isInputEnabled: vi.fn(() => true),
    beginCompositionSession,
    beginComposition: vi.fn(),
    endComposition: vi.fn(),
    setCompositionText: vi.fn(),
    setStatus: vi.fn(),
    log,
  } as unknown as ConsoleKernel;

  return {
    kernel,
    spies: { audioPlaySound, effectsAdd, jukeboxRegisterPlaylist, log, beginCompositionSession },
  };
}

function buildSdk(cartridgeManifest: RoccoCartridgeManifest, scope: ResourceScope): CartridgeSdkV1 {
  return createCartridgeSdkV1({
    kernel: createFakeKernel().kernel,
    scope,
    manifest: cartridgeManifest,
  });
}

describe('Cartridge SDK v1 contract', () => {
  it('hides internal video runtime methods from the cartridge', () => {
    const sdk = buildSdk(manifest(), createResourceScope('t'));
    const video = sdk.video as unknown as Record<string, unknown>;

    expect(video.update).toBeUndefined();
    expect(video.render).toBeUndefined();
    expect(video.setRenderLayerOrder).toBeUndefined();
    expect(video.getRenderLayerOrder).toBeUndefined();
    expect(video.viewport).toBeUndefined();
    expect(video.zoom).toBeUndefined();
    expect(video.camera).toBeDefined();
  });

  it('hides effects.tick and jukebox.unlock from the cartridge', () => {
    const sdk = buildSdk(manifest(), createResourceScope('t'));

    expect((sdk.effects as unknown as Record<string, unknown>).tick).toBeUndefined();
    expect((sdk.jukebox as unknown as Record<string, unknown>).unlock).toBeUndefined();
  });

  it('delegates public members to the underlying kernel', () => {
    const { kernel, spies } = createFakeKernel();
    const sdk = createCartridgeSdkV1({
      kernel,
      scope: createResourceScope('t'),
      manifest: manifest(),
    });

    sdk.audio?.playSound('boom');
    sdk.effects?.add({
      id: 'e',
      kind: 'k',
      targetType: 't',
      targetId: 'i',
      params: {},
      enabled: true,
    });
    sdk.jukebox?.registerPlaylist({
      id: 'p',
      tracks: [],
      mixMode: { type: 'auto-mix' },
      globalVolume: 1,
    });
    sdk.logger?.log('System', 'hi');
    sdk.beginCompositionSession?.('owner', { message: 'hi' });

    const { audioPlaySound, effectsAdd, jukeboxRegisterPlaylist, log, beginCompositionSession } =
      spies;
    expect(audioPlaySound).toHaveBeenCalledWith('boom');
    expect(effectsAdd).toHaveBeenCalledOnce();
    expect(jukeboxRegisterPlaylist).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith('System', 'hi');
    expect(beginCompositionSession).toHaveBeenCalledWith('owner', { message: 'hi' });
  });

  it('exposes the negotiated scope, version and capabilities', () => {
    const scope = createResourceScope('cartridge:c');
    const sdk = buildSdk(manifest(), scope);

    expect(sdk.scope).toBe(scope);
    expect(sdk.sdkVersion).toBe(CARTRIDGE_SDK_VERSION);
    expect(sdk.capabilities).toEqual(CONSOLE_SUPPORTED_CAPABILITIES);
  });

  it('reflects explicitly declared capabilities', () => {
    const sdk = buildSdk(
      manifest({ runtime: { sdk: '^1.0.0', capabilities: ['audio.v1'] } }),
      createResourceScope('t'),
    );

    expect(sdk.capabilities).toEqual(['audio.v1']);
  });

  it('filters modules and methods by negotiated capability at runtime', () => {
    const { kernel } = createFakeKernel();
    const sdk = createCartridgeSdkV1({
      kernel,
      scope: createResourceScope('audio-only'),
      manifest: manifest({
        id: 'audio-only',
        title: 'audio-only',
        runtime: { sdk: '^1.0.0', capabilities: ['audio.v1'] },
      }),
    });

    expect(sdk.audio).toBeDefined();
    expect(sdk.video).toBeUndefined();
    expect(sdk.input).toBeUndefined();
    expect(sdk.storage).toBeUndefined();
    expect(sdk.effects).toBeUndefined();
    expect(sdk.beginCompositionSession).toBeUndefined();
  });

  it('returns method facades instead of the kernel subsystem objects', () => {
    const { kernel } = createFakeKernel();
    const sdk = createCartridgeSdkV1({
      kernel,
      scope: createResourceScope('facades'),
      manifest: manifest(),
    });

    expect(sdk.video?.planes).not.toBe(kernel.video.planes);
    expect(sdk.video?.sprites).not.toBe(kernel.video.sprites);
    expect(sdk.video?.camera).not.toBe((kernel.video as unknown as { zoom: unknown }).zoom);
    expect(sdk.audio).not.toBe(kernel.audio);
    expect(sdk.effects).not.toBe(kernel.effects);
    expect(sdk.jukebox).not.toBe(kernel.jukebox);
  });

  it('recognises supported capabilities', () => {
    expect(isSupportedCapability('video.sprites.v1')).toBe(true);
    expect(isSupportedCapability('bogus.cap')).toBe(false);
  });
});

describe('Cartridge SDK compatibility validation', () => {
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

  it('accepts a valid SDK range and supported capabilities', () => {
    const result = checkCartridgeSdkCompatibility(
      manifest({ runtime: { sdk: '^1.0.0', capabilities: ['audio.v1', 'video.sprites.v1'] } }),
    );

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
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

  it('throws from assertCartridgeSdkCompatibility on an incompatible manifest', () => {
    expect(() =>
      assertCartridgeSdkCompatibility(manifest({ runtime: { sdk: '^2.0.0' } })),
    ).toThrow();
  });

  it('validates a minimal-capability cartridge and still builds an SDK', () => {
    const minimalManifest = manifest({
      id: 'mini',
      title: 'mini',
      runtime: { sdk: '^1.0.0', capabilities: ['audio.v1'] },
    });

    expect(checkCartridgeSdkCompatibility(minimalManifest).ok).toBe(true);
    const sdk = buildSdk(minimalManifest, createResourceScope('mini'));
    expect(sdk.audio).toBeDefined();
    expect(sdk.capabilities).toEqual(['audio.v1']);
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

/** Builds untyped runtime-shaped values to exercise the runtime boundary. */
function untypedManifest(runtime: unknown): RoccoCartridgeManifest {
  return {
    id: 'c',
    title: 'c',
    version: '1.0.0',
    runtime: runtime as RoccoCartridgeManifest['runtime'],
  };
}

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

    it('still builds an SDK with the complete v1 capability set when omitted', () => {
      const sdk = buildSdk(untypedManifest({ sdk: '^1.0.0' }), createResourceScope('t'));
      expect(sdk.capabilities).toEqual(CONSOLE_SUPPORTED_CAPABILITIES);
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
});
