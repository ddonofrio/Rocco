import { describe, expect, it, vi } from 'vitest';

import type { ConsoleKernel } from '../../../../../src/console/console-kernel';
import { asRoccoTestSdk } from '../../test-sdk';
import type { CartridgeSdkV1Runtime } from '../../../../../src/console/cartridges/sdk-v1';
import type { RoccoSoundDefinition } from '../../../../../src/console/audio/types';
import type {
  RoccoSpriteInstance,
  RoccoSpriteWalkMap,
} from '../../../../../src/console/video/sprites';
import { createRoccoLocalization } from '../../../../../src/cartridges/rocco/localization';
import { ROCCO_PLAYER_CONFIG } from '../../../../../src/cartridges/rocco/games/rocco-default/player';
import {
  PIER_PLAYER_LEFT_ENTRY_X,
  PIER_PLAYER_RIGHT_ENTRY_X,
} from '../../../../../src/cartridges/rocco/games/rocco-default/maps/pier/pier-layout';
import { RoccoPierEndLevel } from '../../../../../src/cartridges/rocco/levels/pier/pier-end-level';
import { RoccoPierStartLevel } from '../../../../../src/cartridges/rocco/levels/pier/pier-start-level';

vi.mock('../../../../../src/console/video/sprites', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../src/console/video/sprites')>();
  return {
    ...actual,
    createRoccoSpriteWalkMapFromImageData: vi.fn(
      (options: { id: string; width: number; height: number; alphaThreshold?: number }) =>
        ({
          id: options.id,
          width: options.width,
          height: options.height,
          origin: { x: 0, y: 0 },
          alphaThreshold: options.alphaThreshold ?? 1,
          columns: [],
        }) satisfies RoccoSpriteWalkMap,
    ),
  };
});

vi.mock('../../../../../src/cartridges/rocco/games/rocco-default/maps/pier/pier-scene', () => ({
  loadOrCreatePierScene: vi.fn(() => ({ id: 'mocked-scene', planes: [] })),
}));

vi.mock('../../../../../src/cartridges/rocco/games/rocco-default/maps/pier/pier-walkmap', () => ({
  installDefaultWalkMap: vi.fn(async () => {}),
  uninstallDefaultWalkMap: vi.fn(() => {}),
}));

vi.mock('../../../../../src/cartridges/rocco/games/rocco-default/maps/pier/pier-clouds', () => ({
  installDefaultCloud: vi.fn(() => ({})),
  uninstallDefaultCloud: vi.fn(() => {}),
}));

interface TestState {
  createdSprites: RoccoSpriteInstance[];
  registeredSounds: Map<string, RoccoSoundDefinition>;
}

function createState(): TestState {
  return {
    createdSprites: [],
    registeredSounds: new Map(),
  };
}

function findCreatedSprite(state: TestState, instanceId: string): RoccoSpriteInstance | undefined {
  return state.createdSprites.findLast((sprite) => sprite.id === instanceId);
}

function createEngineMock(state: TestState): CartridgeSdkV1Runtime {
  return asRoccoTestSdk({
    video: {
      preloadAssetUrls: () => Promise.resolve(),
      preloadPlaneScene: () => Promise.resolve(),
      preloadSpriteDefinition: () => Promise.resolve(),
      render: () => {},
      actionMenus: {
        registerMenu: () => {},
        unregisterMenu: () => {},
        closeMenu: () => {},
      },
      messages: {
        think: () => {},
        clearMessages: () => {},
      },
      sceneTargets: {
        registerTarget: () => {},
      } as unknown as ConsoleKernel['video']['sceneTargets'],
      sprites: {
        registerWalkMap: () => {},
        loadSpriteDefinition: () => {},
        removeSprite: () => {},
        getSprite: (instanceId: string) => findCreatedSprite(state, instanceId),
        createSpriteFromDefinition: (
          definitionId: string,
          options?: Partial<RoccoSpriteInstance>,
        ) => {
          const sprite: RoccoSpriteInstance = {
            id: options?.id ?? definitionId,
            definitionId,
            transform: {
              x: options?.transform?.x ?? 0,
              y: options?.transform?.y ?? 0,
              scaleX: options?.transform?.scaleX ?? ROCCO_PLAYER_CONFIG.motion.scale,
              scaleY: options?.transform?.scaleY ?? ROCCO_PLAYER_CONFIG.motion.scale,
            },
            animation: {
              animationId: 'idle',
              frameIndex: 0,
              elapsedMs: 0,
              playing: true,
              playbackRate: 1,
            },
            visible: true,
            enabled: true,
            interactive: true,
            collisionEnabled: true,
            motion: {
              velocityX: 0,
              velocityY: 0,
              accelerationX: 0,
              accelerationY: 0,
              distanceAccumulator: 0,
            },
            renderLayer: options?.renderLayer ?? 'world.actors',
            zIndex: options?.zIndex ?? 0,
            opacity: options?.opacity ?? 1,
          };
          state.createdSprites.push(sprite);
          return sprite;
        },
        bindToWalkMap: () => {},
        playAction: () => {},
      } as unknown as ConsoleKernel['video']['sprites'],
    } as unknown as ConsoleKernel['video'],
    persistence: {
      loadPlaneSceneRecord: () => Promise.resolve(undefined),
      savePlaneScene: () => Promise.resolve(),
    } as unknown as ConsoleKernel['persistence'],
    loadPlaneScene: () => {},
    setInputEnabled: () => {},
    isInputEnabled: () => true,
    getInputMode: () => 'interactive',
    acquireInputLease: () => ({
      ownerId: 'test',
      mode: 'blocked' as const,
      acquiredAt: 0,
      dispose() {},
    }),
    beginCompositionSession: () => ({
      id: 'test',
      ownerId: 'test',
      message: undefined,
      status: 'active' as const,
      report() {},
      fail() {},
      dispose() {},
    }),
    setPlayerSprite: () => {},
    log: () => {},
    audio: {
      registerSound: (definition: RoccoSoundDefinition) => {
        state.registeredSounds.set(definition.id, definition);
      },
      preloadSound: () => Promise.resolve(),
      playSound: () => {},
      stopSound: () => {},
      unregisterSound: () => {},
    } as unknown as ConsoleKernel['audio'],
  } as unknown as ConsoleKernel);
}

describe('RoccoPierStartLevel', () => {
  it('exposes the Pier Beginning identifier and window configuration', () => {
    const localization = createRoccoLocalization();
    const level = new RoccoPierStartLevel({ localization });

    expect(level.id).toBe('pier-start');
    expect(level.title).toBe(localization.text.levels.beginning);
    expect(level.connectors).toHaveLength(2);
    expect(level.connectors[0]).toMatchObject({
      id: 'west',
      entryPoint: {
        x: PIER_PLAYER_LEFT_ENTRY_X,
        y: ROCCO_PLAYER_CONFIG.placement.yValues[0] ?? 180,
      },
      entryFacing: 'right',
    });
    expect(level.connectors[1]).toMatchObject({
      id: 'shop-exit',
      entryPoint: { x: 850, y: (ROCCO_PLAYER_CONFIG.placement.yValues[0] ?? 180) - 30 },
      entryFacing: 'down',
    });
  });

  it('spawns Rocco at the left edge facing right when mounted without an explicit entry connector', async () => {
    const state = createState();
    const engine = createEngineMock(state);
    const level = new RoccoPierStartLevel({ localization: createRoccoLocalization() });

    await level.mount(engine);

    const rocco = findCreatedSprite(state, ROCCO_PLAYER_CONFIG.ids.instance);
    expect(rocco?.transform?.x).toBe(PIER_PLAYER_LEFT_ENTRY_X);
    expect(rocco?.transform?.y).toBe(ROCCO_PLAYER_CONFIG.placement.yValues[0] ?? 180);
  });

  it('uses the shop-exit connector when requested', async () => {
    const state = createState();
    const engine = createEngineMock(state);
    const level = new RoccoPierStartLevel({ localization: createRoccoLocalization() });

    await level.mount(engine, { entryConnectorId: 'shop-exit' });

    const rocco = findCreatedSprite(state, ROCCO_PLAYER_CONFIG.ids.instance);
    expect(rocco?.transform?.x).toBe(850);
    expect(rocco?.transform?.y).toBe((ROCCO_PLAYER_CONFIG.placement.yValues[0] ?? 180) - 30);
  });

  it('registers the bait shop door closing sound at half of the previous volume', async () => {
    const state = createState();
    const engine = createEngineMock(state);
    const level = new RoccoPierStartLevel({ localization: createRoccoLocalization() });

    await level.mount(engine);

    expect(state.registeredSounds.get('rocco-bait-shop-door-closing-sound')).toMatchObject({
      volume: 0.21,
      loop: false,
    });
  });
});

describe('RoccoPierEndLevel', () => {
  it('exposes the Pier End identifier and window configuration', () => {
    const localization = createRoccoLocalization();
    const level = new RoccoPierEndLevel({ localization });

    expect(level.id).toBe('pier-end');
    expect(level.title).toBe(localization.text.levels.end);
    expect(level.connectors).toHaveLength(1);
    expect(level.connectors[0]).toMatchObject({
      id: 'east',
      entryPoint: {
        x: PIER_PLAYER_RIGHT_ENTRY_X,
        y: ROCCO_PLAYER_CONFIG.placement.yValues[0] ?? 180,
      },
      entryFacing: 'left',
    });
  });

  it('spawns Rocco at the right edge facing left when mounted without an explicit entry connector', async () => {
    const state = createState();
    const engine = createEngineMock(state);
    const level = new RoccoPierEndLevel({ localization: createRoccoLocalization() });

    await level.mount(engine);

    const rocco = findCreatedSprite(state, ROCCO_PLAYER_CONFIG.ids.instance);
    expect(rocco?.transform?.x).toBe(PIER_PLAYER_RIGHT_ENTRY_X);
    expect(rocco?.transform?.y).toBe(ROCCO_PLAYER_CONFIG.placement.yValues[0] ?? 180);
  });
});
