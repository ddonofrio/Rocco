import { describe, expect, it, vi } from 'vitest';

import type { RoccoEngine } from '../../../../../src/console/engine-sdk';
import type { RoccoSpriteInstance, RoccoSpriteWalkMap } from '../../../../../src/console/video/sprites';
import { createRoccoLocalization } from '../../../../../src/cartridges/rocco/localization';
import {
  PIER_PLAYER_LEFT_ENTRY_X,
  PIER_PLAYER_RIGHT_ENTRY_X,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_SCALE,
  DEFAULT_SPRITE_Y_VALUES,
} from '../../../../../src/cartridges/rocco/rocco-default-constants';
import {
  RoccoPierEndLevel,
} from '../../../../../src/cartridges/rocco/levels/pier/pier-end-level';
import {
  RoccoPierStartLevel,
} from '../../../../../src/cartridges/rocco/levels/pier/pier-start-level';

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
}

function createState(): TestState {
  return {
    createdSprites: [],
  };
}

function findCreatedSprite(state: TestState, instanceId: string): RoccoSpriteInstance | undefined {
  return state.createdSprites.findLast((sprite) => sprite.id === instanceId);
}

function createEngineMock(state: TestState): RoccoEngine {
  return {
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
      } as unknown as RoccoEngine['video']['sceneTargets'],
      sprites: {
        registerWalkMap: () => {},
        loadSpriteDefinition: () => {},
        removeSprite: () => {},
        getSprite: (instanceId: string) => findCreatedSprite(state, instanceId),
        createSpriteFromDefinition: (definitionId: string, options?: Partial<RoccoSpriteInstance>) => {
          const sprite: RoccoSpriteInstance = {
            id: options?.id ?? definitionId,
            definitionId,
            transform: {
              x: options?.transform?.x ?? 0,
              y: options?.transform?.y ?? 0,
              scaleX: options?.transform?.scaleX ?? DEFAULT_SPRITE_SCALE,
              scaleY: options?.transform?.scaleY ?? DEFAULT_SPRITE_SCALE,
            },
            animation: { animationId: 'idle', frameIndex: 0, elapsedMs: 0, playing: true, playbackRate: 1 },
            visible: true,
            enabled: true,
            interactive: true,
            collisionEnabled: true,
            motion: { velocityX: 0, velocityY: 0, accelerationX: 0, accelerationY: 0, distanceAccumulator: 0 },
            renderLayer: options?.renderLayer ?? 'world.actors',
            zIndex: options?.zIndex ?? 0,
            opacity: options?.opacity ?? 1,
          };
          state.createdSprites.push(sprite);
          return sprite;
        },
        bindToWalkMap: () => {},
        playAction: () => {},
      } as unknown as RoccoEngine['video']['sprites'],
    } as unknown as RoccoEngine['video'],
    persistence: {
      loadPlaneSceneRecord: () => Promise.resolve(null),
      savePlaneScene: () => Promise.resolve(),
    } as unknown as RoccoEngine['persistence'],
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
      message: null,
      status: 'active' as const,
      report() {},
      fail() {},
      dispose() {},
    }),
    setPlayerSprite: () => {},
    log: () => {},
    audio: {
      registerSound: () => {},
      preloadSound: () => Promise.resolve(),
      playSound: () => {},
      stopSound: () => {},
      unregisterSound: () => {},
    } as unknown as RoccoEngine['audio'],
  } as unknown as RoccoEngine;
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
      entryPoint: { x: PIER_PLAYER_LEFT_ENTRY_X, y: DEFAULT_SPRITE_Y_VALUES[0] ?? 180 },
      entryFacing: 'right',
    });
    expect(level.connectors[1]).toMatchObject({
      id: 'shop-exit',
      entryPoint: { x: 850, y: (DEFAULT_SPRITE_Y_VALUES[0] ?? 180) - 30 },
      entryFacing: 'down',
    });
  });

  it('spawns Rocco at the left edge facing right when mounted without an explicit entry connector', async () => {
    const state = createState();
    const engine = createEngineMock(state);
    const level = new RoccoPierStartLevel({ localization: createRoccoLocalization() });

    await level.mount(engine);

    const rocco = findCreatedSprite(state, DEFAULT_SPRITE_INSTANCE_ID);
    expect(rocco?.transform?.x).toBe(PIER_PLAYER_LEFT_ENTRY_X);
    expect(rocco?.transform?.y).toBe(DEFAULT_SPRITE_Y_VALUES[0] ?? 180);
  });

  it('uses the shop-exit connector when requested', async () => {
    const state = createState();
    const engine = createEngineMock(state);
    const level = new RoccoPierStartLevel({ localization: createRoccoLocalization() });

    await level.mount(engine, { entryConnectorId: 'shop-exit' });

    const rocco = findCreatedSprite(state, DEFAULT_SPRITE_INSTANCE_ID);
    expect(rocco?.transform?.x).toBe(850);
    expect(rocco?.transform?.y).toBe((DEFAULT_SPRITE_Y_VALUES[0] ?? 180) - 30);
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
      entryPoint: { x: PIER_PLAYER_RIGHT_ENTRY_X, y: DEFAULT_SPRITE_Y_VALUES[0] ?? 180 },
      entryFacing: 'left',
    });
  });

  it('spawns Rocco at the right edge facing left when mounted without an explicit entry connector', async () => {
    const state = createState();
    const engine = createEngineMock(state);
    const level = new RoccoPierEndLevel({ localization: createRoccoLocalization() });

    await level.mount(engine);

    const rocco = findCreatedSprite(state, DEFAULT_SPRITE_INSTANCE_ID);
    expect(rocco?.transform?.x).toBe(PIER_PLAYER_RIGHT_ENTRY_X);
    expect(rocco?.transform?.y).toBe(DEFAULT_SPRITE_Y_VALUES[0] ?? 180);
  });
});
