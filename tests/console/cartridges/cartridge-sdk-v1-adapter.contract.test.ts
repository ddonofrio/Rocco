import { describe, expect, it, vi } from 'vitest';

import { createResourceScope, type ResourceScope } from '../../../src/console/lifecycle';
import type { ConsoleKernel } from '../../../src/console/console-kernel';
import type { RoccoCartridgeManifest } from '../../../src/console/cartridges/types';
import {
  CARTRIDGE_SDK_VERSION,
  CONSOLE_SUPPORTED_CAPABILITIES,
  createCartridgeSdkV1,
  type CartridgeSdkV1,
} from '../../../src/console/cartridges/sdk-v1';

/**
 * Adapter-ownership test file. It owns runtime shape, capability filtering,
 * delegation, receiver binding, storage namespacing, aliases, and host-member
 * exclusion. The expected member lists are derived independently from
 * `api.ts`, never from private adapter arrays or `Object.keys()` of the SDK.
 *
 * The fake kernel deliberately implements host-only members (`video.update`,
 * `video.render`, `video.viewport`, `effects.tick`, `jukebox.unlock`, …) so the
 * contract proves the adapter hides them, and every public facade method is
 * backed by a callable spy.
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

type Spies = Record<string, ReturnType<typeof vi.fn>>;

interface FakeKernel {
  kernel: ConsoleKernel;
  spies: Spies;
}

/**
 * Builds a fake `ConsoleKernel` whose every public subsystem method is a spy.
 * Unavoidable fixture casts are isolated to this single builder. Host-only
 * members are present so exclusion tests can prove the adapter hides them.
 */
function createFakeKernel(options: { sceneTargets?: boolean } = {}): FakeKernel {
  const spies: Spies = {};
  const spy = (name: string): ReturnType<typeof vi.fn> => {
    const function_ = vi.fn();
    spies[name] = function_;
    return function_;
  };

  const planes = {
    loadScene: spy('planes.loadScene'),
    serializeScene: spy('planes.serializeScene'),
    updatePlane: spy('planes.updatePlane'),
    resolvePlane: spy('planes.resolvePlane'),
  };
  const sprites = {
    registerWalkMap: spy('sprites.registerWalkMap'),
    unregisterWalkMap: spy('sprites.unregisterWalkMap'),
    getWalkMap: spy('sprites.getWalkMap'),
    listWalkMaps: spy('sprites.listWalkMaps'),
    registerSpriteDefinition: spy('sprites.registerSpriteDefinition'),
    unregisterSpriteDefinition: spy('sprites.unregisterSpriteDefinition'),
    getSpriteDefinition: spy('sprites.getSpriteDefinition'),
    listSpriteDefinitions: spy('sprites.listSpriteDefinitions'),
    loadSpriteDefinition: spy('sprites.loadSpriteDefinition'),
    loadSpriteDefinitions: spy('sprites.loadSpriteDefinitions'),
    createSprite: spy('sprites.createSprite'),
    createSpriteFromDefinition: spy('sprites.createSpriteFromDefinition'),
    removeSprite: spy('sprites.removeSprite'),
    getSprite: spy('sprites.getSprite'),
    listSprites: spy('sprites.listSprites'),
    playAnimation: spy('sprites.playAnimation'),
    playAction: spy('sprites.playAction'),
    stopAnimation: spy('sprites.stopAnimation'),
    setAnimationFrame: spy('sprites.setAnimationFrame'),
    setPlaybackRate: spy('sprites.setPlaybackRate'),
    bindAnimationToMotion: spy('sprites.bindAnimationToMotion'),
    setPosition: spy('sprites.setPosition'),
    setScale: spy('sprites.setScale'),
    setFlip: spy('sprites.setFlip'),
    setPresentationTransform: spy('sprites.setPresentationTransform'),
    setVisibleDescription: spy('sprites.setVisibleDescription'),
    translate: spy('sprites.translate'),
    setVelocity: spy('sprites.setVelocity'),
    setAcceleration: spy('sprites.setAcceleration'),
    stopMovement: spy('sprites.stopMovement'),
    moveTo: spy('sprites.moveTo'),
    goTo: spy('sprites.goTo'),
    moveBy: spy('sprites.moveBy'),
    followPath: spy('sprites.followPath'),
    cancelMovement: spy('sprites.cancelMovement'),
    isMoving: spy('sprites.isMoving'),
    setFacing: spy('sprites.setFacing'),
    setRenderLayer: spy('sprites.setRenderLayer'),
    setZIndex: spy('sprites.setZIndex'),
    setDepthMode: spy('sprites.setDepthMode'),
    setContrast: spy('sprites.setContrast'),
    setInteractive: spy('sprites.setInteractive'),
    setCollisionEnabled: spy('sprites.setCollisionEnabled'),
    bindToWalkMap: spy('sprites.bindToWalkMap'),
    clearWalkMapBinding: spy('sprites.clearWalkMapBinding'),
    hitTest: spy('sprites.hitTest'),
    hitTestVisiblePixel: spy('sprites.hitTestVisiblePixel'),
    queryCollisions: spy('sprites.queryCollisions'),
  };
  const sceneTargets = {
    registerTarget: spy('sceneTargets.registerTarget'),
    unregisterTarget: spy('sceneTargets.unregisterTarget'),
    clearTargets: spy('sceneTargets.clearTargets'),
    getTarget: spy('sceneTargets.getTarget'),
    listTargets: spy('sceneTargets.listTargets'),
    setEnabled: spy('sceneTargets.setEnabled'),
    setVisibleDescription: spy('sceneTargets.setVisibleDescription'),
    hitTest: spy('sceneTargets.hitTest'),
    hitTestVisible: spy('sceneTargets.hitTestVisible'),
  };
  const actionMenus = {
    registerMenu: spy('actionMenus.registerMenu'),
    unregisterMenu: spy('actionMenus.unregisterMenu'),
    listMenus: spy('actionMenus.listMenus'),
    openMenuForTarget: spy('actionMenus.openMenuForTarget'),
    closeMenu: spy('actionMenus.closeMenu'),
    isOpen: spy('actionMenus.isOpen'),
    setHoverAt: spy('actionMenus.setHoverAt'),
    getHoveredItem: spy('actionMenus.getHoveredItem'),
    activateAt: spy('actionMenus.activateAt'),
    getRenderableMenu: spy('actionMenus.getRenderableMenu'),
  };
  const gridMenus = {
    openMenu: spy('gridMenus.openMenu'),
    toggleMenu: spy('gridMenus.toggleMenu'),
    closeMenu: spy('gridMenus.closeMenu'),
    isOpen: spy('gridMenus.isOpen'),
    setHoverAt: spy('gridMenus.setHoverAt'),
    getHoveredItem: spy('gridMenus.getHoveredItem'),
    activateAt: spy('gridMenus.activateAt'),
    getCarriedItem: spy('gridMenus.getCarriedItem'),
    clearCarriedItem: spy('gridMenus.clearCarriedItem'),
    getRenderableMenu: spy('gridMenus.getRenderableMenu'),
  };
  const messages = {
    showMessage: spy('messages.showMessage'),
    say: spy('messages.say'),
    think: spy('messages.think'),
    removeMessage: spy('messages.removeMessage'),
    clearMessages: spy('messages.clearMessages'),
    listMessages: spy('messages.listMessages'),
    listRenderableMessages: spy('messages.listRenderableMessages'),
  };
  const primitives = {
    addPrimitive: spy('primitives.addPrimitive'),
    removePrimitive: spy('primitives.removePrimitive'),
    clearPrimitives: spy('primitives.clearPrimitives'),
    listPrimitives: spy('primitives.listPrimitives'),
  };
  const titles = {
    addTitle: spy('titles.addTitle'),
    removeTitle: spy('titles.removeTitle'),
    clearTitles: spy('titles.clearTitles'),
    getTitle: spy('titles.getTitle'),
    listTitles: spy('titles.listTitles'),
  };
  const display = {
    getProfile: spy('display.getProfile'),
    setProfile: spy('display.setProfile'),
  };
  const zoom = {
    setTransform: spy('zoom.setTransform'),
    animateTo: spy('zoom.animateTo'),
    clear: spy('zoom.clear'),
  };
  const audio = {
    registerSound: spy('audio.registerSound'),
    unregisterSound: spy('audio.unregisterSound'),
    preloadSound: spy('audio.preloadSound'),
    playSound: spy('audio.playSound'),
    setSoundVolume: spy('audio.setSoundVolume'),
    stopSound: spy('audio.stopSound'),
    stopAllSounds: spy('audio.stopAllSounds'),
  };
  const jukebox = {
    registerPlaylist: spy('jukebox.registerPlaylist'),
    unregisterPlaylist: spy('jukebox.unregisterPlaylist'),
    playPlaylist: spy('jukebox.playPlaylist'),
    stopPlaylist: spy('jukebox.stopPlaylist'),
    isPlaying: spy('jukebox.isPlaying'),
    setVolume: spy('jukebox.setVolume'),
    getCurrentTrack: spy('jukebox.getCurrentTrack'),
    unlock: spy('jukebox.unlock'),
  };
  const effects = {
    add: spy('effects.add'),
    remove: spy('effects.remove'),
    enable: spy('effects.enable'),
    disable: spy('effects.disable'),
    update: spy('effects.update'),
    tick: spy('effects.tick'),
  };

  const video = {
    planes,
    sprites,
    sceneTargets: options.sceneTargets ? sceneTargets : undefined,
    actionMenus,
    gridMenus,
    messages,
    primitives,
    titles,
    display,
    viewport: { setHost: spy('viewport.setHost'), getHost: spy('viewport.getHost') },
    zoom,
    setRenderLayerOrder: spy('video.setRenderLayerOrder'),
    getRenderLayerOrder: spy('video.getRenderLayerOrder'),
    preloadAssetUrls: spy('video.preloadAssetUrls'),
    preloadPlaneScene: spy('video.preloadPlaneScene'),
    preloadSpriteDefinition: spy('video.preloadSpriteDefinition'),
    preloadSpriteDefinitions: spy('video.preloadSpriteDefinitions'),
    update: spy('video.update'),
    render: spy('video.render'),
  };

  const persistence = {
    loadPlaneSceneRecord: spy('persistence.loadPlaneSceneRecord'),
    savePlaneScene: spy('persistence.savePlaneScene'),
    createSaveRepository: spy('persistence.createSaveRepository'),
  };

  const kernel = {
    video: video as never,
    audio: audio as never,
    jukebox: jukebox as never,
    effects: effects as never,
    persistence: persistence as never,
    loadPlaneScene: spy('kernel.loadPlaneScene'),
    serializePlaneScene: spy('kernel.serializePlaneScene'),
    setPlayerSprite: spy('kernel.setPlayerSprite'),
    getPlayerSprite: spy('kernel.getPlayerSprite'),
    acquireInputLease: spy('kernel.acquireInputLease'),
    getInputMode: spy('kernel.getInputMode'),
    setInputEnabled: spy('kernel.setInputEnabled'),
    isInputEnabled: spy('kernel.isInputEnabled'),
    isDeveloperModeEnabled: spy('kernel.isDeveloperModeEnabled'),
    getConsoleFlags: spy('kernel.getConsoleFlags'),
    setConsoleFlags: spy('kernel.setConsoleFlags'),
    beginCompositionSession: spy('kernel.beginCompositionSession'),
    beginComposition: spy('kernel.beginComposition'),
    endComposition: spy('kernel.endComposition'),
    setCompositionText: spy('kernel.setCompositionText'),
    setStatus: spy('kernel.setStatus'),
    log: spy('kernel.log'),
  } as unknown as ConsoleKernel;

  return { kernel, spies };
}

interface BuildResult {
  sdk: CartridgeSdkV1;
  spies: Spies;
}

function build(
  cartridgeManifest: RoccoCartridgeManifest,
  scope: ResourceScope,
  options: { sceneTargets?: boolean } = {},
): BuildResult {
  const { kernel, spies } = createFakeKernel(options);
  const sdk = createCartridgeSdkV1({ kernel, scope, manifest: cartridgeManifest });
  return { sdk, spies };
}

/** Independent oracle: exact public members declared by `api.ts`. */
const EXPECTED_FACADE_KEYS = {
  'video.planes': ['loadScene', 'serializeScene', 'updatePlane', 'resolvePlane'],
  'video.sprites': [
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
  ],
  'video.sceneTargets': [
    'registerTarget',
    'unregisterTarget',
    'clearTargets',
    'getTarget',
    'listTargets',
    'setEnabled',
    'setVisibleDescription',
    'hitTest',
    'hitTestVisible',
  ],
  'video.actionMenus': [
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
  ],
  'video.gridMenus': [
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
  ],
  'video.messages': [
    'showMessage',
    'say',
    'think',
    'removeMessage',
    'clearMessages',
    'listMessages',
    'listRenderableMessages',
  ],
  'video.primitives': ['addPrimitive', 'removePrimitive', 'clearPrimitives', 'listPrimitives'],
  'video.titles': ['addTitle', 'removeTitle', 'clearTitles', 'getTitle', 'listTitles'],
  'video.display': ['getProfile', 'setProfile'],
  'video.camera': ['setTransform', 'animateTo', 'clear'],
  audio: [
    'registerSound',
    'unregisterSound',
    'preloadSound',
    'playSound',
    'setSoundVolume',
    'stopSound',
    'stopAllSounds',
  ],
  jukebox: [
    'registerPlaylist',
    'unregisterPlaylist',
    'playPlaylist',
    'stopPlaylist',
    'isPlaying',
    'setVolume',
    'getCurrentTrack',
  ],
  effects: ['add', 'remove', 'enable', 'disable', 'update'],
  logger: ['log', 'setStatus'],
  input: ['acquireInputLease', 'getInputMode'],
  storage: ['loadPlaneSceneRecord', 'savePlaneScene', 'createSaveRepository'],
} as const;

function sortedKeys(value: Record<string, unknown>): string[] {
  return Object.keys(value).toSorted((a, b) => a.localeCompare(b));
}

describe('Cartridge SDK v1 adapter — version, scope and capabilities', () => {
  it('exposes the negotiated scope, version and capabilities for the full set', () => {
    const scope = createResourceScope('cartridge:c');
    const { sdk } = build(manifest(), scope);

    expect(sdk.scope).toBe(scope);
    expect(sdk.sdkVersion).toBe(CARTRIDGE_SDK_VERSION);
    expect(sdk.capabilities).toEqual(CONSOLE_SUPPORTED_CAPABILITIES);
  });

  it('reflects explicitly declared capabilities', () => {
    const { sdk } = build(
      manifest({ runtime: { sdk: '^1.0.0', capabilities: ['audio.v1'] } }),
      createResourceScope('t'),
    );

    expect(sdk.capabilities).toEqual(['audio.v1']);
  });

  it('never exposes an engine or kernel host property', () => {
    const { sdk } = build(manifest(), createResourceScope('t'));
    const record = sdk as unknown as Record<string, unknown>;

    expect(record.engine).toBeUndefined();
    expect(record.kernel).toBeUndefined();
  });
});

describe('Cartridge SDK v1 adapter — exact root runtime surface (fully negotiated)', () => {
  it('exposes exactly the declared root members for a fully negotiated SDK', () => {
    const { sdk } = build(manifest(), createResourceScope('t'), { sceneTargets: true });
    const record = sdk as unknown as Record<string, unknown>;

    // Oracle derived from `CartridgeSdkV1` / `CartridgeSdkV1Runtime` in `api.ts`.
    const expectedRootKeys = [
      'sdkVersion',
      'capabilities',
      'video',
      'audio',
      'jukebox',
      'effects',
      'input',
      'acquireInputLease',
      'getInputMode',
      'storage',
      'logger',
      'log',
      'setStatus',
      'scope',
      'loadPlaneScene',
      'serializePlaneScene',
      'setPlayerSprite',
      'getPlayerSprite',
      'isDeveloperModeEnabled',
      'getConsoleFlags',
      'setConsoleFlags',
      'requestReset',
      'beginCompositionSession',
    ].toSorted((a, b) => a.localeCompare(b));

    expect(sortedKeys(record)).toEqual(expectedRootKeys);
  });

  it('does not expose unexpected kernel or host properties on the root', () => {
    const { sdk } = build(manifest(), createResourceScope('t'), { sceneTargets: true });
    const record = sdk as unknown as Record<string, unknown>;

    for (const unexpected of ['engine', 'kernel', 'zoom', 'viewport', 'beginComposition']) {
      expect(record[unexpected]).toBeUndefined();
    }
  });
});

describe('Cartridge SDK v1 adapter — independent facade surface registry', () => {
  const { sdk } = build(manifest(), createResourceScope('t'), { sceneTargets: true });
  const video = sdk.video as unknown as Record<string, Record<string, unknown>>;

  it('matches video.planes enumerable keys exactly', () => {
    expect(sortedKeys(video.planes)).toEqual(
      [...EXPECTED_FACADE_KEYS['video.planes']].toSorted((a, b) => a.localeCompare(b)),
    );
  });

  it('matches video.sprites enumerable keys exactly', () => {
    expect(sortedKeys(video.sprites)).toEqual(
      [...EXPECTED_FACADE_KEYS['video.sprites']].toSorted((a, b) => a.localeCompare(b)),
    );
  });

  it('matches video.sceneTargets enumerable keys exactly', () => {
    expect(sortedKeys(video.sceneTargets)).toEqual(
      [...EXPECTED_FACADE_KEYS['video.sceneTargets']].toSorted((a, b) => a.localeCompare(b)),
    );
  });

  it('matches video.actionMenus enumerable keys exactly', () => {
    expect(sortedKeys(video.actionMenus)).toEqual(
      [...EXPECTED_FACADE_KEYS['video.actionMenus']].toSorted((a, b) => a.localeCompare(b)),
    );
  });

  it('matches video.gridMenus enumerable keys exactly', () => {
    expect(sortedKeys(video.gridMenus)).toEqual(
      [...EXPECTED_FACADE_KEYS['video.gridMenus']].toSorted((a, b) => a.localeCompare(b)),
    );
  });

  it('matches video.messages enumerable keys exactly', () => {
    expect(sortedKeys(video.messages)).toEqual(
      [...EXPECTED_FACADE_KEYS['video.messages']].toSorted((a, b) => a.localeCompare(b)),
    );
  });

  it('matches video.primitives enumerable keys exactly', () => {
    expect(sortedKeys(video.primitives)).toEqual(
      [...EXPECTED_FACADE_KEYS['video.primitives']].toSorted((a, b) => a.localeCompare(b)),
    );
  });

  it('matches video.titles enumerable keys exactly', () => {
    expect(sortedKeys(video.titles)).toEqual(
      [...EXPECTED_FACADE_KEYS['video.titles']].toSorted((a, b) => a.localeCompare(b)),
    );
  });

  it('matches video.display enumerable keys exactly', () => {
    expect(sortedKeys(video.display)).toEqual(
      [...EXPECTED_FACADE_KEYS['video.display']].toSorted((a, b) => a.localeCompare(b)),
    );
  });

  it('matches video.camera enumerable keys exactly', () => {
    expect(sortedKeys(video.camera)).toEqual(
      [...EXPECTED_FACADE_KEYS['video.camera']].toSorted((a, b) => a.localeCompare(b)),
    );
  });

  it('matches audio enumerable keys exactly', () => {
    expect(sortedKeys(sdk.audio as unknown as Record<string, unknown>)).toEqual(
      [...EXPECTED_FACADE_KEYS.audio].toSorted((a, b) => a.localeCompare(b)),
    );
  });

  it('matches jukebox enumerable keys exactly', () => {
    expect(sortedKeys(sdk.jukebox as unknown as Record<string, unknown>)).toEqual(
      [...EXPECTED_FACADE_KEYS.jukebox].toSorted((a, b) => a.localeCompare(b)),
    );
  });

  it('matches effects enumerable keys exactly', () => {
    expect(sortedKeys(sdk.effects as unknown as Record<string, unknown>)).toEqual(
      [...EXPECTED_FACADE_KEYS.effects].toSorted((a, b) => a.localeCompare(b)),
    );
  });

  it('matches logger enumerable keys exactly', () => {
    expect(sortedKeys(sdk.logger as unknown as Record<string, unknown>)).toEqual(
      [...EXPECTED_FACADE_KEYS.logger].toSorted((a, b) => a.localeCompare(b)),
    );
  });

  it('matches input enumerable keys exactly', () => {
    expect(sortedKeys(sdk.input as unknown as Record<string, unknown>)).toEqual(
      [...EXPECTED_FACADE_KEYS.input].toSorted((a, b) => a.localeCompare(b)),
    );
  });

  it('matches storage enumerable keys exactly', () => {
    expect(sortedKeys(sdk.storage as unknown as Record<string, unknown>)).toEqual(
      [...EXPECTED_FACADE_KEYS.storage].toSorted((a, b) => a.localeCompare(b)),
    );
  });
});

describe('Cartridge SDK v1 adapter — confirmed primitive facade leak', () => {
  it('does not expose getPrimitive on video.primitives', () => {
    const { sdk } = build(manifest(), createResourceScope('t'));
    const primitives = sdk.video?.primitives as unknown as Record<string, unknown>;

    expect(primitives.getPrimitive).toBeUndefined();
    expect(Object.keys(primitives)).not.toContain('getPrimitive');
  });
});

describe('Cartridge SDK v1 adapter — host-member exclusion is systematic', () => {
  const { sdk } = build(manifest(), createResourceScope('t'));
  const video = sdk.video as unknown as Record<string, Record<string, unknown>>;

  const hostExclusions: Array<[string, string]> = [
    ['video', 'update'],
    ['video', 'render'],
    ['video', 'viewport'],
    ['video', 'zoom'],
    ['video', 'setRenderLayerOrder'],
    ['video', 'getRenderLayerOrder'],
    ['video.actionMenus', 'update'],
    ['video.messages', 'update'],
    ['video.titles', 'update'],
    ['effects', 'tick'],
    ['jukebox', 'unlock'],
  ];

  it.each(hostExclusions)('hides %s.%s from the cartridge', (facadePath, member) => {
    const record = sdk as unknown as Record<string, Record<string, unknown>>;
    const target = facadePath.startsWith('video.')
      ? video[facadePath.slice('video.'.length)]
      : record[facadePath];
    expect(target[member]).toBeUndefined();
  });
});

describe('Cartridge SDK v1 adapter — distinct facade objects, not kernel subsystems', () => {
  it('returns method facades instead of the kernel subsystem objects', () => {
    const { kernel } = createFakeKernel();
    const sdk = createCartridgeSdkV1({
      kernel,
      scope: createResourceScope('facades'),
      manifest: manifest(),
    });

    const video = kernel.video as unknown as Record<string, Record<string, unknown>>;
    expect(sdk.video?.planes).not.toBe(video.planes);
    expect(sdk.video?.sprites).not.toBe(video.sprites);
    expect(sdk.video?.camera).not.toBe(video.zoom);
    expect(sdk.audio).not.toBe(kernel.audio);
    expect(sdk.effects).not.toBe(kernel.effects);
    expect(sdk.jukebox).not.toBe(kernel.jukebox);
  });
});

describe('Cartridge SDK v1 adapter — capability matrix (single capability)', () => {
  it('video.planes.v1 exposes only the planes surface', async () => {
    const { sdk, spies } = build(
      manifest({ runtime: { sdk: '^1.0.0', capabilities: ['video.planes.v1'] } }),
      createResourceScope('planes'),
    );

    expect(sdk.capabilities).toEqual(['video.planes.v1']);
    expect(typeof sdk.video?.preloadAssetUrls).toBe('function');
    expect(sdk.video?.camera).toBeDefined();
    expect(sdk.video?.planes).toBeDefined();
    expect(sdk.video?.display).toBeDefined();
    expect(typeof sdk.video?.preloadPlaneScene).toBe('function');
    expect(sdk.video?.sprites).toBeUndefined();
    expect(sdk.video?.actionMenus).toBeUndefined();
    expect(sdk.video?.gridMenus).toBeUndefined();
    expect(sdk.video?.messages).toBeUndefined();
    expect(sdk.video?.primitives).toBeUndefined();
    expect(sdk.video?.titles).toBeUndefined();
    expect(sdk.audio).toBeUndefined();
    expect(sdk.jukebox).toBeUndefined();
    expect(sdk.effects).toBeUndefined();
    expect(sdk.input).toBeUndefined();
    expect(sdk.storage).toBeUndefined();

    const record = sdk as unknown as Record<string, unknown>;
    expect(record.engine).toBeUndefined();
    expect(record.kernel).toBeUndefined();
    expect(record.zoom).toBeUndefined();

    await sdk.video?.preloadAssetUrls(['a']);
    expect(spies['video.preloadAssetUrls']).toHaveBeenCalledWith(['a']);
  });

  it('video.sprites.v1 exposes the sprites surface and sceneTargets only when supplied', () => {
    const withTargets = build(
      manifest({ runtime: { sdk: '^1.0.0', capabilities: ['video.sprites.v1'] } }),
      createResourceScope('sprites-t'),
      { sceneTargets: true },
    );
    expect(withTargets.sdk.video?.sceneTargets).toBeDefined();
    expect(withTargets.sdk.video?.planes).toBeUndefined();
    expect(withTargets.sdk.video?.actionMenus).toBeUndefined();
    expect(withTargets.sdk.video?.gridMenus).toBeUndefined();

    const withoutTargets = build(
      manifest({ runtime: { sdk: '^1.0.0', capabilities: ['video.sprites.v1'] } }),
      createResourceScope('sprites-n'),
      { sceneTargets: false },
    );
    expect(withoutTargets.sdk.video?.sceneTargets).toBeUndefined();
    expect(withoutTargets.sdk.video?.sprites).toBeDefined();
    expect(typeof withoutTargets.sdk.video?.preloadSpriteDefinition).toBe('function');
    expect(typeof withoutTargets.sdk.video?.preloadSpriteDefinitions).toBe('function');
  });

  it('video.menus.v1 exposes the menus surface only', () => {
    const { sdk } = build(
      manifest({ runtime: { sdk: '^1.0.0', capabilities: ['video.menus.v1'] } }),
      createResourceScope('menus'),
    );

    expect(sdk.capabilities).toEqual(['video.menus.v1']);
    expect(typeof sdk.video?.preloadAssetUrls).toBe('function');
    expect(sdk.video?.camera).toBeDefined();
    expect(sdk.video?.actionMenus).toBeDefined();
    expect(sdk.video?.gridMenus).toBeDefined();
    expect(sdk.video?.messages).toBeDefined();
    expect(sdk.video?.primitives).toBeDefined();
    expect(sdk.video?.titles).toBeDefined();
    expect(sdk.video?.display).toBeDefined();
    expect(sdk.video?.planes).toBeUndefined();
    expect(sdk.video?.sprites).toBeUndefined();
    expect(sdk.audio).toBeUndefined();
  });

  const singleCapabilities: Array<{ capability: string; flatAlias?: keyof CartridgeSdkV1 }> = [
    { capability: 'audio.v1' },
    { capability: 'jukebox.v1' },
    { capability: 'effects.v1' },
    { capability: 'input.v1', flatAlias: 'acquireInputLease' },
    { capability: 'storage.v1' },
    { capability: 'logger.v1', flatAlias: 'log' },
    { capability: 'scope.v1' },
    { capability: 'composition.v1', flatAlias: 'beginCompositionSession' },
  ];

  it.each(singleCapabilities)(
    'single capability %s exposes its facade and hides unrelated ones',
    ({ capability, flatAlias }) => {
      const { sdk } = build(
        manifest({ runtime: { sdk: '^1.0.0', capabilities: [capability] } }),
        createResourceScope('single'),
      );
      expect(sdk.capabilities).toEqual([capability]);

      assertCapabilityFacadePresence(sdk, capability);

      expect(sdk.video).toBeUndefined();
      if (flatAlias) {
        expect(sdk[flatAlias]).toBeDefined();
      }
      const record = sdk as unknown as Record<string, unknown>;
      expect(record.engine).toBeUndefined();
      expect(record.kernel).toBeUndefined();
    },
  );
});

function assertCapabilityFacadePresence(sdk: CartridgeSdkV1, capability: string): void {
  const isPresent = (cap: string): boolean => capability === cap;
  const presence: Array<[unknown, boolean]> = [
    [sdk.audio, isPresent('audio.v1')],
    [sdk.jukebox, isPresent('jukebox.v1')],
    [sdk.effects, isPresent('effects.v1')],
    [sdk.input, isPresent('input.v1')],
    [sdk.storage, isPresent('storage.v1')],
    [sdk.logger, isPresent('logger.v1')],
    [sdk.scope, isPresent('scope.v1')],
    [sdk.beginCompositionSession, isPresent('composition.v1')],
  ];

  for (const [value, shouldBeDefined] of presence) {
    expect(value).toEqual(shouldBeDefined ? expect.anything() : undefined);
  }

  if (capability === 'input.v1') {
    expect(sdk.acquireInputLease).toBeTypeOf('function');
    expect(sdk.getInputMode).toBeTypeOf('function');
  } else if (capability === 'logger.v1') {
    expect(sdk.log).toBeTypeOf('function');
    expect(sdk.setStatus).toBeTypeOf('function');
  }
}

/**
 * Independent oracle: the kernel subsystem whose spies back each facade group.
 * Derived from `api.ts` method groupings, never from private adapter arrays.
 */
const FACADE_SPY_PREFIX: Record<string, string> = {
  'video.planes': 'planes',
  'video.sprites': 'sprites',
  'video.sceneTargets': 'sceneTargets',
  'video.actionMenus': 'actionMenus',
  'video.gridMenus': 'gridMenus',
  'video.messages': 'messages',
  'video.primitives': 'primitives',
  'video.titles': 'titles',
  'video.display': 'display',
  'video.camera': 'zoom',
  audio: 'audio',
  jukebox: 'jukebox',
  effects: 'effects',
};

/** Video-level methods declared directly on `CartridgeVideoApi` (not facades). */
const VIDEO_LEVEL_METHODS: Array<{ member: string; spy: string }> = [
  { member: 'preloadAssetUrls', spy: 'video.preloadAssetUrls' },
  { member: 'preloadPlaneScene', spy: 'video.preloadPlaneScene' },
  { member: 'preloadSpriteDefinition', spy: 'video.preloadSpriteDefinition' },
  { member: 'preloadSpriteDefinitions', spy: 'video.preloadSpriteDefinitions' },
];

const sentinelFor = (key: string): unknown => Symbol(`arg-${key}`);

// Non-createMethodFacade signatures: the adapter forwards the caller's
// arguments verbatim, so each entry declares the exact argument list it
// supplies and expects the kernel spy to receive.
const ARG_SHAPES: Record<string, Record<string, unknown[]>> = {
  logger: {
    log: [sentinelFor('logger.log'), sentinelFor('logger.log')],
    setStatus: [sentinelFor('logger.setStatus')],
  },
  input: {
    acquireInputLease: [
      sentinelFor('input.acquireInputLease'),
      sentinelFor('input.acquireInputLease'),
    ],
    getInputMode: [],
  },
};

function getVideoChild(video: unknown, childKey: string): Record<string, unknown> {
  return (video as Record<string, Record<string, unknown>>)[childKey];
}

function getFacadeTarget(sdk: CartridgeSdkV1, facadeKey: string): Record<string, unknown> {
  if (facadeKey === 'video') {
    return sdk.video as unknown as Record<string, unknown>;
  }
  if (facadeKey.startsWith('video.')) {
    return getVideoChild(sdk.video, facadeKey.slice('video.'.length));
  }
  return sdk[facadeKey as keyof CartridgeSdkV1] as Record<string, unknown>;
}

interface MatrixEntry {
  facadeKey: string;
  member: string;
  spy: string;
  args: unknown[];
}

function addFacadeMethods(
  matrix: MatrixEntry[],
  facadeKey: string,
  methods: readonly string[],
): void {
  // Storage is owned by its own boundary tests (ownership injection).
  if (facadeKey === 'storage') {
    return;
  }
  const prefix = FACADE_SPY_PREFIX[facadeKey];
  const shapeArguments = ARG_SHAPES[facadeKey];
  for (const member of methods) {
    if (shapeArguments && Object.hasOwn(shapeArguments, member)) {
      matrix.push({ facadeKey, member, spy: `kernel.${member}`, args: shapeArguments[member] });
      continue;
    }
    if (prefix) {
      matrix.push({
        facadeKey,
        member,
        spy: `${prefix}.${member}`,
        args: [sentinelFor(`${facadeKey}.${member}`)],
      });
    }
  }
}

describe('Cartridge SDK v1 adapter — every facade method is callable and delegates', () => {
  const { sdk, spies } = build(manifest(), createResourceScope('t'), { sceneTargets: true });

  const matrix: MatrixEntry[] = [];

  for (const [facadeKey, methods] of Object.entries(EXPECTED_FACADE_KEYS)) {
    addFacadeMethods(matrix, facadeKey, methods);
  }
  for (const entry of VIDEO_LEVEL_METHODS) {
    matrix.push({
      facadeKey: 'video',
      member: entry.member,
      spy: entry.spy,
      args: [sentinelFor(`video.${entry.member}`)],
    });
  }

  it.each(matrix)(
    'calls $facadeKey.$member through the facade and delegates to the kernel spy',
    ({ facadeKey, member, spy, args }) => {
      const target = getFacadeTarget(sdk, facadeKey);
      expect(typeof target[member]).toBe('function');

      (target[member] as (...a: unknown[]) => unknown)(...args);
      expect(spies[spy]).toHaveBeenCalledTimes(1);
      expect(spies[spy]).toHaveBeenCalledWith(...args);
    },
  );

  // Receiver binding: prove createMethodFacade preserves the source receiver
  // by exercising a real kernel subsystem whose method reads `this` state.
  it('preserves the source receiver through the facade', () => {
    class TaggedAudio {
      tag = 'kernel-audio';
      playSound(id: string): string {
        return `${this.tag}:${id}`;
      }
    }

    const { kernel } = createFakeKernel();
    (kernel.audio as unknown as TaggedAudio) = new TaggedAudio();

    const sdk = createCartridgeSdkV1({
      kernel,
      scope: createResourceScope('receiver'),
      manifest: manifest(),
    });

    const result = (sdk.audio as unknown as { playSound: (id: string) => string }).playSound(
      'boom',
    );
    expect(result).toBe('kernel-audio:boom');
  });
});

describe('Cartridge SDK v1 adapter — storage boundary ownership', () => {
  it('delegates loadPlaneSceneRecord as (manifest.id, sceneId)', async () => {
    const { sdk, spies } = build(
      manifest({ id: 'cart-a', version: '2.3.0' }),
      createResourceScope('t'),
    );

    await sdk.storage?.loadPlaneSceneRecord('scene-9');
    expect(spies['persistence.loadPlaneSceneRecord']).toHaveBeenCalledWith('cart-a', 'scene-9');
  });

  it('delegates savePlaneScene as (manifest.id, scene)', async () => {
    const { sdk, spies } = build(
      manifest({ id: 'cart-a', version: '2.3.0' }),
      createResourceScope('t'),
    );

    const scene = { id: 's' } as never;
    await sdk.storage?.savePlaneScene(scene);
    expect(spies['persistence.savePlaneScene']).toHaveBeenCalledWith('cart-a', scene);
  });

  it('supplies cartridgeId and cartridgeVersion to createSaveRepository and preserves caller options', () => {
    const { sdk, spies } = build(
      manifest({ id: 'cart-a', version: '2.3.0' }),
      createResourceScope('t'),
    );

    const repoOptions = { provider: { id: 'local' } as never };
    sdk.storage?.createSaveRepository(repoOptions);
    expect(spies['persistence.createSaveRepository']).toHaveBeenCalledWith(
      expect.objectContaining({
        cartridgeId: 'cart-a',
        cartridgeVersion: '2.3.0',
        provider: { id: 'local' },
      }),
    );
  });

  it('prevents caller-provided identity from replacing cartridge ownership', () => {
    const { sdk, spies } = build(
      manifest({ id: 'cart-a', version: '2.3.0' }),
      createResourceScope('t'),
    );

    // Untyped runtime-shaped caller attempt to override cartridgeId/Version.
    const hostileOptions = {
      cartridgeId: 'attacker',
      cartridgeVersion: '9.9.9',
      provider: { id: 'local' },
    } as unknown as { provider: never };
    sdk.storage?.createSaveRepository(hostileOptions);
    const passed = spies['persistence.createSaveRepository'].mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(passed.cartridgeId).toBe('cart-a');
    expect(passed.cartridgeVersion).toBe('2.3.0');
    expect(passed.provider).toEqual({ id: 'local' });
  });
});

describe('Cartridge SDK v1 adapter — flat alias consistency', () => {
  it('acquireInputLease and input.acquireInputLease delegate to the same kernel method', () => {
    const { sdk, spies } = build(manifest(), createResourceScope('t'));

    sdk.acquireInputLease?.('owner', 'interactive');
    sdk.input?.acquireInputLease('owner', 'interactive');
    expect(spies['kernel.acquireInputLease']).toHaveBeenCalledTimes(2);
  });

  it('getInputMode and input.getInputMode delegate to the same kernel method', () => {
    const { sdk, spies } = build(manifest(), createResourceScope('t'));

    sdk.getInputMode?.();
    sdk.input?.getInputMode();
    expect(spies['kernel.getInputMode']).toHaveBeenCalledTimes(2);
  });

  it('log and logger.log delegate to the same kernel method', () => {
    const { sdk, spies } = build(manifest(), createResourceScope('t'));

    sdk.log?.('Channel', 'msg');
    sdk.logger?.log('Channel', 'msg');
    expect(spies['kernel.log']).toHaveBeenCalledTimes(2);
  });

  it('setStatus and logger.setStatus delegate to the same kernel method', () => {
    const { sdk, spies } = build(manifest(), createResourceScope('t'));

    sdk.setStatus?.('ready');
    sdk.logger?.setStatus('ready');
    expect(spies['kernel.setStatus']).toHaveBeenCalledTimes(2);
  });

  it('absent capability disables both the nested facade and flat aliases', () => {
    const { sdk } = build(
      manifest({ runtime: { sdk: '^1.0.0', capabilities: ['audio.v1'] } }),
      createResourceScope('t'),
    );

    expect(sdk.input).toBeUndefined();
    expect(sdk.acquireInputLease).toBeUndefined();
    expect(sdk.getInputMode).toBeUndefined();
    expect(sdk.logger).toBeUndefined();
    expect(sdk.log).toBeUndefined();
    expect(sdk.setStatus).toBeUndefined();
  });
});

describe('Cartridge SDK v1 adapter — non-capability compatibility helpers', () => {
  it('delegates isDeveloperModeEnabled when the kernel method exists', () => {
    const { sdk, spies } = build(manifest(), createResourceScope('t'));
    spies['kernel.isDeveloperModeEnabled'].mockReturnValue(true);

    expect(sdk.isDeveloperModeEnabled?.()).toBe(true);
    expect(spies['kernel.isDeveloperModeEnabled']).toHaveBeenCalledOnce();
  });

  it('returns false from isDeveloperModeEnabled when the kernel method is absent', () => {
    const { kernel } = createFakeKernel();
    delete (kernel as unknown as Record<string, unknown>).isDeveloperModeEnabled;
    const sdk = createCartridgeSdkV1({
      kernel,
      scope: createResourceScope('t'),
      manifest: manifest(),
    });
    expect(sdk.isDeveloperModeEnabled?.()).toBe(false);
  });

  it('delegates getConsoleFlags when the kernel method exists', () => {
    const { sdk, spies } = build(manifest(), createResourceScope('t'));
    spies['kernel.getConsoleFlags'].mockReturnValue({ developerModeEnabled: true });

    expect(sdk.getConsoleFlags?.()).toEqual({ developerModeEnabled: true });
  });

  it('returns undefined from getConsoleFlags when the kernel method is absent', () => {
    const { kernel } = createFakeKernel();
    delete (kernel as unknown as Record<string, unknown>).getConsoleFlags;
    const sdk = createCartridgeSdkV1({
      kernel,
      scope: createResourceScope('t'),
      manifest: manifest(),
    });
    expect(sdk.getConsoleFlags?.()).toBeUndefined();
  });

  it('delegates setConsoleFlags when the kernel method exists', () => {
    const { sdk, spies } = build(manifest(), createResourceScope('t'));
    sdk.setConsoleFlags?.({ developerModeEnabled: true });
    expect(spies['kernel.setConsoleFlags']).toHaveBeenCalledWith({ developerModeEnabled: true });
  });

  it('is a safe no-op from setConsoleFlags when the kernel method is absent', () => {
    const { kernel } = createFakeKernel();
    delete (kernel as unknown as Record<string, unknown>).setConsoleFlags;
    const sdk = createCartridgeSdkV1({
      kernel,
      scope: createResourceScope('t'),
      manifest: manifest(),
    });
    expect(() => sdk.setConsoleFlags?.({ developerModeEnabled: true })).not.toThrow();
  });
});
