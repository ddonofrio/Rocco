import { describe, expect, it, vi } from 'vitest';

import { createResourceScope, type ResourceScope } from '../../../src/console/lifecycle';
import type { RoccoEngine } from '../../../src/console/engine-sdk';
import type { RoccoCartridgeManifest } from '../../../src/console/cartridges/types';
import {
  CARTRIDGE_SDK_VERSION,
  CONSOLE_SUPPORTED_CAPABILITIES,
  assertCartridgeSdkCompatibility,
  checkCartridgeSdkCompatibility,
  createCartridgeSdkV1,
  isSupportedCapability,
  type CartridgeSdkV1,
} from '../../../src/console/cartridges/sdk-v1';

/**
 * A fake full `RoccoEngine` kernel. It deliberately implements the host-only
 * members (`video.update`, `video.render`, `video.viewport`, `effects.tick`,
 * `jukebox.unlock`, ...) so the contract proves the adapter *hides* them from
 * the cartridge-facing SDK rather than just never having them.
 */
interface FakeEngineSpies {
  audioPlaySound: ReturnType<typeof vi.fn>;
  effectsAdd: ReturnType<typeof vi.fn>;
  jukeboxRegisterPlaylist: ReturnType<typeof vi.fn>;
  log: ReturnType<typeof vi.fn>;
  beginCompositionSession: ReturnType<typeof vi.fn>;
}

/**
 * A fake full `RoccoEngine` kernel. It deliberately implements the host-only
 * members (`video.update`, `video.render`, `video.viewport`, `effects.tick`,
 * `jukebox.unlock`, ...) so the contract proves the adapter *hides* them from
 * the cartridge-facing SDK rather than just never having them. Spies are
 * returned alongside the engine so assertions reference bare identifiers.
 */
function createFakeEngine(): { engine: RoccoEngine; spies: FakeEngineSpies } {
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

  const engine = {
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
  } as unknown as RoccoEngine;

  return {
    engine,
    spies: { audioPlaySound, effectsAdd, jukeboxRegisterPlaylist, log, beginCompositionSession },
  };
}

function buildSdk(manifest: RoccoCartridgeManifest, scope: ResourceScope): CartridgeSdkV1 {
  return createCartridgeSdkV1({ engine: createFakeEngine().engine, scope, manifest });
}

describe('Cartridge SDK v1 contract', () => {
  it('hides internal video runtime methods from the cartridge', () => {
    const sdk = buildSdk({ id: 'c', title: 'c', version: '1.0.0' }, createResourceScope('t'));
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
    const sdk = buildSdk({ id: 'c', title: 'c', version: '1.0.0' }, createResourceScope('t'));

    expect((sdk.effects as unknown as Record<string, unknown>).tick).toBeUndefined();
    expect((sdk.jukebox as unknown as Record<string, unknown>).unlock).toBeUndefined();
  });

  it('delegates public members to the underlying engine', () => {
    const { engine, spies } = createFakeEngine();
    const sdk = createCartridgeSdkV1({
      engine,
      scope: createResourceScope('t'),
      manifest: { id: 'c', title: 'c', version: '1.0.0' },
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
    const sdk = buildSdk({ id: 'c', title: 'c', version: '1.0.0' }, scope);

    expect(sdk.scope).toBe(scope);
    expect(sdk.sdkVersion).toBe(CARTRIDGE_SDK_VERSION);
    expect(sdk.capabilities).toEqual(CONSOLE_SUPPORTED_CAPABILITIES);
  });

  it('reflects explicitly declared capabilities', () => {
    const sdk = buildSdk(
      {
        id: 'c',
        title: 'c',
        version: '1.0.0',
        runtime: { sdk: '^1.0.0', capabilities: ['audio.v1'] },
      },
      createResourceScope('t'),
    );

    expect(sdk.capabilities).toEqual(['audio.v1']);
  });

  it('filters modules and methods by negotiated capability at runtime', () => {
    const { engine } = createFakeEngine();
    const sdk = createCartridgeSdkV1({
      engine,
      scope: createResourceScope('audio-only'),
      manifest: {
        id: 'audio-only',
        title: 'audio-only',
        version: '1.0.0',
        runtime: { sdk: '^1.0.0', capabilities: ['audio.v1'] },
      },
    });

    expect(sdk.audio).toBeDefined();
    expect(sdk.video).toBeUndefined();
    expect(sdk.input).toBeUndefined();
    expect(sdk.storage).toBeUndefined();
    expect(sdk.effects).toBeUndefined();
    expect(sdk.beginCompositionSession).toBeUndefined();
  });

  it('returns method facades instead of the kernel subsystem objects', () => {
    const { engine } = createFakeEngine();
    const sdk = buildSdk({ id: 'c', title: 'c', version: '1.0.0' }, createResourceScope('facades'));

    expect(sdk.video?.planes).not.toBe(engine.video.planes);
    expect(sdk.video?.sprites).not.toBe(engine.video.sprites);
    expect(sdk.video?.camera).not.toBe(engine.video.zoom);
    expect(sdk.audio).not.toBe(engine.audio);
    expect(sdk.effects).not.toBe(engine.effects);
    expect(sdk.jukebox).not.toBe(engine.jukebox);
  });

  it('recognises supported capabilities', () => {
    expect(isSupportedCapability('video.sprites.v1')).toBe(true);
    expect(isSupportedCapability('bogus.cap')).toBe(false);
  });
});

describe('Cartridge SDK compatibility validation', () => {
  it('accepts a manifest without runtime (legacy cartridge)', () => {
    const result = checkCartridgeSdkCompatibility({ id: 'c', title: 'c', version: '1.0.0' });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('accepts a valid SDK range and supported capabilities', () => {
    const result = checkCartridgeSdkCompatibility({
      id: 'c',
      title: 'c',
      version: '1.0.0',
      runtime: { sdk: '^1.0.0', capabilities: ['audio.v1', 'video.sprites.v1'] },
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects an incompatible SDK range', () => {
    const result = checkCartridgeSdkCompatibility({
      id: 'c',
      title: 'c',
      version: '1.0.0',
      runtime: { sdk: '^2.0.0' },
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/sdk/i);
  });

  it('rejects an unknown capability', () => {
    const result = checkCartridgeSdkCompatibility({
      id: 'c',
      title: 'c',
      version: '1.0.0',
      runtime: { sdk: '^1.0.0', capabilities: ['video.sprites.v1', 'unknown.cap'] },
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/unknown\.cap/);
  });

  it('rejects an SDK runtime without its required SDK range', () => {
    const result = checkCartridgeSdkCompatibility({
      id: 'c',
      title: 'c',
      version: '1.0.0',
      runtime: { capabilities: ['audio.v1'] } as unknown as RoccoCartridgeManifest['runtime'],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/runtime\.sdk/);
  });

  it('throws from assertCartridgeSdkCompatibility on an incompatible manifest', () => {
    expect(() =>
      assertCartridgeSdkCompatibility({
        id: 'c',
        title: 'c',
        version: '1.0.0',
        runtime: { sdk: '^2.0.0' },
      }),
    ).toThrow();
  });

  it('validates a minimal-capability cartridge and still builds an SDK', () => {
    const manifest: RoccoCartridgeManifest = {
      id: 'mini',
      title: 'mini',
      version: '1.0.0',
      runtime: { sdk: '^1.0.0', capabilities: ['audio.v1'] },
    };

    expect(checkCartridgeSdkCompatibility(manifest).ok).toBe(true);
    const sdk = buildSdk(manifest, createResourceScope('mini'));
    expect(sdk.audio).toBeDefined();
    expect(sdk.capabilities).toEqual(['audio.v1']);
  });
});
