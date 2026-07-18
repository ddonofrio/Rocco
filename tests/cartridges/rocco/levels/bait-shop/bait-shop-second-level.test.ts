import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  RoccoSoundDefinition,
  RoccoSoundPlayOptions,
} from '../../../../../src/console/audio/types';
import type { ConsoleKernel } from '../../../../../src/console/console-kernel';
import { asRoccoTestSdk } from '../../test-sdk';
import type { CartridgeSdkV1Runtime } from '../../../../../src/console/cartridges/sdk-v1';
import type { RoccoActionMenuDefinition } from '../../../../../src/console/video/action-menu';
import type {
  RoccoPlaneScene,
  RoccoPlaneSceneRecord,
} from '../../../../../src/console/video/planes';
import type {
  RoccoSpriteInstance,
  RoccoSpriteNavigationBinding,
  RoccoSpriteWalkMap,
} from '../../../../../src/console/video/sprites';
import { createRoccoLocalization } from '../../../../../src/cartridges/rocco/localization';
import {
  BAIT_SHOP_SECOND_SCENE_ID,
  RoccoBaitShopSecondLevel,
} from '../../../../../src/cartridges/rocco/levels/bait-shop/bait-shop-second-level';
import { BAIT_SHOP_DOOR_OPENING_SOUND_ID } from '../../../../../src/cartridges/rocco/levels/pier/pier-bait-shop-door';

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

interface TestState {
  restoredRecord: RoccoPlaneSceneRecord | undefined;
  loadedScene: RoccoPlaneScene | undefined;
  savedScenes: RoccoPlaneScene[];
  createdSprites: RoccoSpriteInstance[];
  registeredSounds: Map<string, RoccoSoundDefinition>;
  playedSounds: Array<{ soundId: string; options?: RoccoSoundPlayOptions }>;
  inputEnabled: boolean;
  inputLeases: string[];
  isSpriteMovingValue: boolean;
}

function createState(overrides: Partial<TestState> = {}): TestState {
  return {
    restoredRecord: undefined,
    loadedScene: undefined,
    savedScenes: [],
    createdSprites: [],
    registeredSounds: new Map(),
    playedSounds: [],
    inputEnabled: true,
    inputLeases: [],
    isSpriteMovingValue: false,
    ...overrides,
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
        registerMenu: (_definition: RoccoActionMenuDefinition) => {},
        unregisterMenu: () => {},
        closeMenu: () => {},
      },
      gridMenus: {
        clearCarriedItem: () => {},
        closeMenu: () => {},
      } as unknown as ConsoleKernel['video']['gridMenus'],
      messages: {
        clearMessages: () => {},
        think: () => {},
      } as unknown as ConsoleKernel['video']['messages'],
      sceneTargets: {
        registerTarget: () => {},
        unregisterTarget: () => {},
      } as unknown as ConsoleKernel['video']['sceneTargets'],
      planes: {
        updatePlane: () => {},
      } as unknown as ConsoleKernel['video']['planes'],
      sprites: {
        registerWalkMap: () => {},
        unregisterWalkMap: () => {},
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
              scaleX: options?.transform?.scaleX ?? 1,
              scaleY: options?.transform?.scaleY ?? 1,
              rotation: options?.transform?.rotation ?? 0,
              flipX: options?.transform?.flipX ?? false,
              flipY: options?.transform?.flipY ?? false,
              presentation: options?.transform?.presentation,
            },
            motion: {
              velocityX: 0,
              velocityY: 0,
              accelerationX: 0,
              accelerationY: 0,
              distanceAccumulator: 0,
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
            interactive: options?.interactive ?? false,
            collisionEnabled: options?.collisionEnabled ?? true,
            renderLayer: options?.renderLayer ?? 'world.actors',
            zIndex: options?.zIndex ?? 0,
            depthMode: options?.depthMode ?? 'fixed',
            opacity: options?.opacity ?? 1,
            visibleDescription: options?.visibleDescription,
          };
          state.createdSprites.push(sprite);
          return sprite;
        },
        setPosition: (instanceId: string, x: number, y: number) => {
          const sprite = findCreatedSprite(state, instanceId);
          if (sprite) {
            sprite.transform.x = x;
            sprite.transform.y = y;
          }
        },
        bindToWalkMap: (instanceId: string, binding: RoccoSpriteNavigationBinding) => {
          const sprite = findCreatedSprite(state, instanceId);
          if (sprite) {
            sprite.navigation = binding;
          }
        },
        stopMovement: () => {
          state.isSpriteMovingValue = false;
        },
        goTo: () => {
          state.isSpriteMovingValue = true;
          return true;
        },
        isMoving: () => state.isSpriteMovingValue,
        playAction: (instanceId: string, actionId: string, options?: { direction?: string }) => {
          const sprite = findCreatedSprite(state, instanceId);
          if (sprite) {
            sprite.animation.animationId = `${actionId}:${options?.direction ?? 'none'}`;
          }
        },
      } as unknown as ConsoleKernel['video']['sprites'],
    } as unknown as ConsoleKernel['video'],
    audio: {
      registerSound: (definition: RoccoSoundDefinition) => {
        state.registeredSounds.set(definition.id, definition);
      },
      unregisterSound: () => {},
      preloadSound: () => Promise.resolve(),
      playSound: (soundId: string, options?: RoccoSoundPlayOptions) => {
        state.playedSounds.push({ soundId, options });
        return {
          stop() {},
          setVolume() {},
          get ended() {
            return Promise.resolve();
          },
        };
      },
      stopSound: () => {},
      stopAllSounds: () => {},
    } as unknown as ConsoleKernel['audio'],
    persistence: {
      loadPlaneSceneRecord: () => Promise.resolve(state.restoredRecord),
      savePlaneScene: (scene: RoccoPlaneScene) => {
        state.savedScenes.push(scene);
        return Promise.resolve();
      },
    } as unknown as ConsoleKernel['persistence'],
    loadPlaneScene: (scene: RoccoPlaneScene) => {
      state.loadedScene = scene;
    },
    setInputEnabled: (isEnabled: boolean) => {
      state.inputEnabled = isEnabled;
    },
    isInputEnabled: () => state.inputEnabled,
    getInputMode: () => (state.inputEnabled ? 'interactive' : 'blocked'),
    acquireInputLease: (ownerId: string) => {
      state.inputLeases.push(ownerId);
      return {
        ownerId,
        mode: 'blocked' as const,
        acquiredAt: 0,
        dispose() {
          const index = state.inputLeases.indexOf(ownerId);
          if (index !== -1) {
            state.inputLeases.splice(index, 1);
          }
        },
      };
    },
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
  } as unknown as ConsoleKernel);
}

describe('RoccoBaitShopSecondLevel', () => {
  beforeEach(() => {
    class TestImage {
      src = '';

      decode(): Promise<void> {
        return Promise.resolve();
      }
    }

    const originalCreateElement = document.createElement.bind(document);
    vi.stubGlobal('Image', TestImage);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName !== 'canvas') {
        return originalCreateElement(tagName);
      }

      return {
        width: 0,
        height: 0,
        getContext: (contextId: string) => {
          if (contextId !== '2d') {
            return;
          }

          return {
            imageSmoothingEnabled: false,
            clearRect: () => {},
            drawImage: () => {},
            getImageData: () => ({
              width: 960,
              height: 540,
              data: new Uint8ClampedArray(960 * 540 * 4),
            }),
          } as unknown as CanvasRenderingContext2D;
        },
      } as unknown as HTMLCanvasElement;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps the toilet door opening sound louder than the closing sound', async () => {
    const state = createState();
    const engine = createEngineMock(state);
    const level = new RoccoBaitShopSecondLevel(createRoccoLocalization('es'));

    const scene = await level.mount(engine);

    expect(scene.id).toBe(BAIT_SHOP_SECOND_SCENE_ID);
    expect(state.registeredSounds.get(BAIT_SHOP_DOOR_OPENING_SOUND_ID)).toMatchObject({
      volume: 0.42,
      loop: false,
    });
    expect(state.registeredSounds.get('rocco-bait-shop-door-closing-sound')).toMatchObject({
      volume: 0.21,
      loop: false,
    });
  });

  it('plays the door closing sound at half of the previous volume when returning from the toilet', async () => {
    const state = createState();
    const engine = createEngineMock(state);
    const level = new RoccoBaitShopSecondLevel(createRoccoLocalization('es'));

    await level.mount(engine, {
      entryConnectorId: 'toilet-door',
    });
    level.update(16);

    expect(state.playedSounds).toContainEqual({
      soundId: 'rocco-bait-shop-door-closing-sound',
      options: {
        restart: true,
        volume: 0.21,
      },
    });
  });

  it('releases the scripted interaction lease after walking into the toilet transition', async () => {
    const state = createState();
    const engine = createEngineMock(state);
    const onConnectorTransitionRequested = vi.fn(() => true);
    const level = new RoccoBaitShopSecondLevel(createRoccoLocalization('es'));

    await level.mount(engine, {
      onConnectorTransitionRequested,
    });

    (level as unknown as { walkIntoToilet: () => void }).walkIntoToilet();

    expect(state.inputLeases).toContain('scripted-scene-interaction');

    state.isSpriteMovingValue = false;
    level.update(16);

    expect(onConnectorTransitionRequested).toHaveBeenCalledWith('toilet-door');
    expect(state.inputLeases).not.toContain('scripted-scene-interaction');
  });
});
