import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  RoccoSoundDefinition,
  RoccoSoundPlayOptions,
} from '../../../../../src/console/audio/types';
import type { ConsoleKernel } from '../../../../../src/console/console-kernel';
import { asRoccoTestSdk } from '../../test-sdk';
import type { CartridgeSdkV1Runtime } from '../../../../../src/console/cartridges/sdk-v1';
import type {
  RoccoPlaneScene,
  RoccoPlaneSceneRecord,
} from '../../../../../src/console/video/planes';
import type {
  RoccoSpriteDefinition,
  RoccoSpriteInstance,
  RoccoSpriteNavigationBinding,
  RoccoSpriteWalkMap,
} from '../../../../../src/console/video/sprites';
import { BAIT_SHOP_SOUVENIR_TABLE_STORAGE_ID } from '../../../../../src/cartridges/rocco/inventory';
import { createRoccoLocalization } from '../../../../../src/cartridges/rocco/localization';
import { ROCCO_PLAYER_CONFIG } from '../../../../../src/cartridges/rocco/games/rocco-default/player';
import { PIER_WALK_MAP_ID } from '../../../../../src/cartridges/rocco/games/rocco-default/maps/pier/pier-layout';
import {
  BAIT_SHOP_SCENE_ID,
  RoccoBaitShopLevel,
} from '../../../../../src/cartridges/rocco/levels/bait-shop/bait-shop-level';

const BAIT_SHOP_BENCH_TARGET_INSTANCE_ID = 'rocco-bait-shop-bench-target';
const BAIT_SHOP_POSTCARD_RACK_TARGET_INSTANCE_ID = 'rocco-bait-shop-postcard-rack-target';
const BAIT_SHOP_HIDDEN_KEYS_TARGET_INSTANCE_ID = 'rocco-bait-shop-hidden-keys-target';
const BAIT_SHOP_SOUVENIR_CLOSEUP_TARGET_INSTANCE_ID = 'rocco-bait-shop-souvenir-closeup-target';
const BAIT_SHOP_SOUVENIR_TABLE_TARGET_INSTANCE_ID = 'rocco-bait-shop-souvenir-table-target';

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
  preloadedPlaneSceneIds: string[];
  preloadedSpriteDefinitionIds: string[];
  loadedSpriteDefinitionIds: string[];
  registeredWalkMapIds: string[];
  unregisteredWalkMapIds: string[];
  createdSprites: RoccoSpriteInstance[];
  removedSpriteIds: string[];
  walkMapBindings: string[];
  playerSpriteId: string | undefined;
  playedSpriteActionDirections: string[];
  sceneTargetsById: Map<string, unknown>;
  unregisteredSceneTargetIds: string[];
  spriteMessages: string[];
  spritePositions: string[];
  goToSprites: string[];
  isSpriteMovingValue: boolean;
  inputEnabled: boolean;
  inputLeases: string[];
  renderCalls: number;
  registeredSounds: Map<string, RoccoSoundDefinition>;
  playedSounds: Array<{ soundId: string; options?: RoccoSoundPlayOptions }>;
}

function createState(overrides: Partial<TestState> = {}): TestState {
  return {
    restoredRecord: undefined,
    loadedScene: undefined,
    savedScenes: [],
    preloadedPlaneSceneIds: [],
    preloadedSpriteDefinitionIds: [],
    loadedSpriteDefinitionIds: [],
    registeredWalkMapIds: [],
    unregisteredWalkMapIds: [],
    createdSprites: [],
    removedSpriteIds: [],
    walkMapBindings: [],
    playerSpriteId: undefined,
    playedSpriteActionDirections: [],
    sceneTargetsById: new Map(),
    unregisteredSceneTargetIds: [],
    spriteMessages: [],
    spritePositions: [],
    goToSprites: [],
    isSpriteMovingValue: false,
    inputEnabled: true,
    inputLeases: [],
    renderCalls: 0,
    registeredSounds: new Map(),
    playedSounds: [],
    ...overrides,
  };
}

function findCreatedSprite(state: TestState, instanceId: string): RoccoSpriteInstance | undefined {
  return state.createdSprites.findLast((sprite) => sprite.id === instanceId);
}

function getRegisteredSceneTarget<T>(state: TestState, instanceId: string): T | undefined {
  return state.sceneTargetsById.get(instanceId) as T | undefined;
}

function createEngineMock(state: TestState): CartridgeSdkV1Runtime {
  return asRoccoTestSdk({
    video: {
      preloadAssetUrls: () => {
        return Promise.resolve();
      },
      preloadPlaneScene: (scene: RoccoPlaneScene) => {
        state.preloadedPlaneSceneIds.push(scene.id);
        return Promise.resolve();
      },
      preloadSpriteDefinition: (definition: RoccoSpriteDefinition) => {
        state.preloadedSpriteDefinitionIds.push(definition.id);
        return Promise.resolve();
      },
      render: () => {
        state.renderCalls += 1;
      },
      actionMenus: {
        registerMenu: () => {},
        unregisterMenu: () => {},
        closeMenu: () => {},
      },
      messages: {
        think: (instanceId: string, text: string | string[]) => {
          state.spriteMessages.push(
            `${instanceId}:think:${Array.isArray(text) ? text.join('|') : text}`,
          );
        },
        clearMessages: () => {},
      },
      sceneTargets: {
        registerTarget: (definition: { instanceId: string }) => {
          state.sceneTargetsById.set(definition.instanceId, definition);
        },
        unregisterTarget: (instanceId: string) => {
          state.sceneTargetsById.delete(instanceId);
          state.unregisteredSceneTargetIds.push(instanceId);
        },
      } as unknown as ConsoleKernel['video']['sceneTargets'],
      sprites: {
        registerWalkMap: (walkMap: RoccoSpriteWalkMap) => {
          state.registeredWalkMapIds.push(walkMap.id);
        },
        unregisterWalkMap: (walkMapId: string) => {
          state.unregisteredWalkMapIds.push(walkMapId);
        },
        loadSpriteDefinition: (definition: RoccoSpriteDefinition) => {
          state.loadedSpriteDefinitionIds.push(definition.id);
        },
        removeSprite: (instanceId: string) => {
          state.removedSpriteIds.push(instanceId);
        },
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
          state.spritePositions.push(`${instanceId}:${x},${y}`);
          const sprite = findCreatedSprite(state, instanceId);
          if (sprite) {
            sprite.transform.x = x;
            sprite.transform.y = y;
          }
        },
        bindToWalkMap: (instanceId: string, binding: RoccoSpriteNavigationBinding) => {
          state.walkMapBindings.push(`${instanceId}:${binding.walkMapId}`);
          const sprite = findCreatedSprite(state, instanceId);
          if (sprite) {
            sprite.navigation = binding;
          }
        },
        stopMovement: () => {
          state.isSpriteMovingValue = false;
        },
        goTo: (instanceId: string, x: number, y: number) => {
          state.goToSprites.push(`${instanceId}:${x},${y}`);
          state.isSpriteMovingValue = true;
          return true;
        },
        isMoving: () => state.isSpriteMovingValue,
        playAction: (instanceId: string, actionId: string, options?: { direction?: string }) => {
          if (options?.direction) {
            state.playedSpriteActionDirections.push(
              `${instanceId}:${actionId}:${options.direction}`,
            );
          }
        },
      } as unknown as ConsoleKernel['video']['sprites'],
    } as unknown as ConsoleKernel['video'],
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
    setPlayerSprite: (instanceId: string | undefined) => {
      state.playerSpriteId = instanceId;
    },
    log: () => {},
    audio: {
      registerSound: (definition: RoccoSoundDefinition) => {
        state.registeredSounds.set(definition.id, definition);
      },
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
      unregisterSound: () => {},
    } as unknown as ConsoleKernel['audio'],
  } as unknown as ConsoleKernel);
}

describe('RoccoBaitShopLevel', () => {
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

  it('mounts the bait shop scene with dynamic foreground depth and a larger Rocco spawn', async () => {
    const state = createState();
    const engine = createEngineMock(state);
    const level = new RoccoBaitShopLevel(createRoccoLocalization('es'));

    const scene = await level.mount(engine);

    expect(scene.id).toBe(BAIT_SHOP_SCENE_ID);
    expect(state.preloadedPlaneSceneIds).toEqual([BAIT_SHOP_SCENE_ID]);
    expect(state.savedScenes).toHaveLength(1);
    expect(state.loadedScene?.planes.map((plane) => plane.id)).toEqual([
      'rocco-bait-shop-backplate',
      'rocco-bait-shop-background',
      'rocco-bait-shop-foreground',
      'rocco-bait-shop-souvenir-closeup',
    ]);
    expect(state.loadedScene?.planes[2]).toMatchObject({
      id: 'rocco-bait-shop-foreground',
      renderLayer: 'world.front',
      depthMode: {
        kind: 'sprite-y-threshold',
        subject: 'active-player',
        samplePoint: 'ground-y',
        thresholdY: 338,
        frontLayer: 'world.front',
        backLayer: 'background.main',
        frontWhen: 'less-than-or-equal',
      },
    });
    expect(state.registeredWalkMapIds).toContain(PIER_WALK_MAP_ID);
    expect(state.preloadedSpriteDefinitionIds).toContain(ROCCO_PLAYER_CONFIG.ids.definition);
    expect(state.loadedSpriteDefinitionIds).toContain(ROCCO_PLAYER_CONFIG.ids.definition);
    expect(state.removedSpriteIds).toContain(ROCCO_PLAYER_CONFIG.ids.instance);
    expect(state.playerSpriteId).toBe(ROCCO_PLAYER_CONFIG.ids.instance);
    expect(state.playedSpriteActionDirections).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:${ROCCO_PLAYER_CONFIG.ids.idleAction}:down-left`,
    );

    const rocco = findCreatedSprite(state, ROCCO_PLAYER_CONFIG.ids.instance);
    expect(rocco?.transform).toMatchObject({
      x: 665,
      y: 110,
      scaleX: ROCCO_PLAYER_CONFIG.motion.scale * 1.2,
      scaleY: ROCCO_PLAYER_CONFIG.motion.scale * 1.2,
    });
    expect(rocco?.navigation).toMatchObject({
      walkMapId: PIER_WALK_MAP_ID,
      groundAnchor: {
        x: ROCCO_PLAYER_CONFIG.frame.groundAnchor.x,
        y: ROCCO_PLAYER_CONFIG.frame.groundAnchor.y,
      },
      constrainMovement: true,
      followSurface: true,
    });
  });

  it('plays the bait shop door closing sound at half of the previous volume on entry', async () => {
    const state = createState();
    const engine = createEngineMock(state);
    const level = new RoccoBaitShopLevel(createRoccoLocalization('es'));

    await level.mount(engine);

    expect(state.registeredSounds.get('rocco-bait-shop-door-closing-sound')).toMatchObject({
      volume: 0.21,
      loop: false,
    });
    expect(state.playedSounds).toContainEqual({
      soundId: 'rocco-bait-shop-door-closing-sound',
      options: {
        restart: true,
        volume: 0.21,
      },
    });
  });

  it('refreshes an outdated saved bait shop scene back to the current default planes', async () => {
    const state = createState({
      restoredRecord: {
        id: BAIT_SHOP_SCENE_ID,
        scene: {
          id: BAIT_SHOP_SCENE_ID,
          clearColor: '#000000',
          planes: [],
        },
        updatedAt: 1,
      },
    });
    const engine = createEngineMock(state);
    const level = new RoccoBaitShopLevel();

    await level.mount(engine);

    expect(state.savedScenes).toHaveLength(1);
    expect(state.loadedScene?.planes.map((plane) => plane.id)).toEqual([
      'rocco-bait-shop-backplate',
      'rocco-bait-shop-background',
      'rocco-bait-shop-foreground',
      'rocco-bait-shop-souvenir-closeup',
    ]);
    expect(state.loadedScene?.planes[2]?.depthMode).toMatchObject({
      kind: 'sprite-y-threshold',
      frontLayer: 'world.front',
      backLayer: 'background.main',
    });
  });

  it('reveals the hidden key from the postcard rack after Rocco climbs onto the bench and collects it without spawning a sprite', async () => {
    const localization = createRoccoLocalization('es');
    const state = createState();
    const engine = createEngineMock(state);
    const onMysteriousKeyCollected = vi.fn();
    const level = new RoccoBaitShopLevel(localization, {
      onMysteriousKeyCollected,
    });

    await level.mount(engine);

    level.handleAction({
      definitionId: 'test-bench',
      targetInstanceId: BAIT_SHOP_BENCH_TARGET_INSTANCE_ID,
      targetDefinitionId: 'rocco-bait-shop-bench',
      itemId: 'kick',
      actionId: 'kick',
    });

    expect(state.inputLeases).toContain('scripted-scene-interaction');
    state.isSpriteMovingValue = false;
    level.update(16);
    level.update(520);

    level.handleAction({
      definitionId: 'test-postcards',
      targetInstanceId: BAIT_SHOP_POSTCARD_RACK_TARGET_INSTANCE_ID,
      targetDefinitionId: 'rocco-bait-shop-postcard-rack',
      itemId: 'look',
      actionId: 'look',
    });

    const hiddenTarget = getRegisteredSceneTarget<{
      interactive?: boolean;
      shape?: { kind: string; x: number; y: number; width: number; height: number };
      visibleDescription?: { text?: string };
    }>(state, BAIT_SHOP_HIDDEN_KEYS_TARGET_INSTANCE_ID);
    expect(hiddenTarget).toMatchObject({
      interactive: true,
      shape: {
        kind: 'rect',
        x: 222,
        y: 111,
        width: 40,
        height: 7,
      },
      visibleDescription: {
        text: localization.text.descriptions.hiddenKeys,
      },
    });
    expect(state.spriteMessages).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:think:${localization.text.baitShop.postcardRackRevealLine}`,
    );

    const createdSpriteCount = state.createdSprites.length;
    level.handleSceneClick({
      kind: 'scene-click',
      sceneX: 230,
      sceneY: 114,
      targetInstanceId: BAIT_SHOP_HIDDEN_KEYS_TARGET_INSTANCE_ID,
      targetDefinitionId: 'rocco-bait-shop-hidden-keys',
    });

    expect(onMysteriousKeyCollected).toHaveBeenCalledTimes(1);
    expect(state.createdSprites).toHaveLength(createdSpriteCount);
    expect(
      getRegisteredSceneTarget(state, BAIT_SHOP_HIDDEN_KEYS_TARGET_INSTANCE_ID),
    ).toBeUndefined();
    expect(state.unregisteredSceneTargetIds).toContain(BAIT_SHOP_HIDDEN_KEYS_TARGET_INSTANCE_ID);
    expect(state.spriteMessages).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:think:${localization.text.baitShop.hiddenKeysCollectedLine}`,
    );
  });

  it('keeps the hidden key target non-interactive after Rocco climbs down from the bench', async () => {
    const localization = createRoccoLocalization('es');
    const state = createState();
    const engine = createEngineMock(state);
    const onMysteriousKeyCollected = vi.fn();
    const level = new RoccoBaitShopLevel(localization, {
      onMysteriousKeyCollected,
    });

    await level.mount(engine);

    level.handleAction({
      definitionId: 'test-bench',
      targetInstanceId: BAIT_SHOP_BENCH_TARGET_INSTANCE_ID,
      targetDefinitionId: 'rocco-bait-shop-bench',
      itemId: 'kick',
      actionId: 'kick',
    });
    state.isSpriteMovingValue = false;
    level.update(16);
    level.update(520);

    level.handleAction({
      definitionId: 'test-postcards',
      targetInstanceId: BAIT_SHOP_POSTCARD_RACK_TARGET_INSTANCE_ID,
      targetDefinitionId: 'rocco-bait-shop-postcard-rack',
      itemId: 'look',
      actionId: 'look',
    });

    level.handleSceneClick({
      kind: 'scene-click',
      sceneX: 500,
      sceneY: 420,
    });
    level.update(520);

    const hiddenTarget = getRegisteredSceneTarget<{ interactive?: boolean }>(
      state,
      BAIT_SHOP_HIDDEN_KEYS_TARGET_INSTANCE_ID,
    );
    expect(hiddenTarget).toMatchObject({
      interactive: false,
    });

    level.handleSceneClick({
      kind: 'scene-click',
      sceneX: 230,
      sceneY: 114,
      targetInstanceId: BAIT_SHOP_HIDDEN_KEYS_TARGET_INSTANCE_ID,
      targetDefinitionId: 'rocco-bait-shop-hidden-keys',
    });

    expect(onMysteriousKeyCollected).not.toHaveBeenCalled();
  });

  it('climbs down from the bench before starting a walk-to-grab souvenir interaction', async () => {
    const localization = createRoccoLocalization('es');
    const state = createState();
    const engine = createEngineMock(state);
    const onOpenStorageInventoryRequested = vi.fn();
    const level = new RoccoBaitShopLevel(localization, {
      onOpenStorageInventoryRequested,
    });

    await level.mount(engine);

    level.handleAction({
      definitionId: 'test-bench',
      targetInstanceId: BAIT_SHOP_BENCH_TARGET_INSTANCE_ID,
      targetDefinitionId: 'rocco-bait-shop-bench',
      itemId: 'kick',
      actionId: 'kick',
    });
    state.isSpriteMovingValue = false;
    level.update(16);
    level.update(520);

    state.goToSprites = [];

    level.handleAction({
      definitionId: 'test-souvenir-table',
      targetInstanceId: BAIT_SHOP_SOUVENIR_TABLE_TARGET_INSTANCE_ID,
      targetDefinitionId: 'rocco-bait-shop-souvenir-table',
      itemId: 'grab',
      actionId: 'grab',
    });

    expect(state.goToSprites).toEqual([]);
    expect(onOpenStorageInventoryRequested).not.toHaveBeenCalled();

    level.update(520);

    expect(state.goToSprites).toEqual([`${ROCCO_PLAYER_CONFIG.ids.instance}:228,365`]);
    expect(onOpenStorageInventoryRequested).not.toHaveBeenCalled();

    const rocco = findCreatedSprite(state, ROCCO_PLAYER_CONFIG.ids.instance);
    expect(rocco?.navigation).toMatchObject({
      walkMapId: PIER_WALK_MAP_ID,
      constrainMovement: true,
      followSurface: true,
    });

    state.isSpriteMovingValue = false;
    level.update(16);

    expect(onOpenStorageInventoryRequested).toHaveBeenCalledOnce();
  });

  it('hides the souvenir closeup as soon as the storage inventory reports that it closed', async () => {
    const localization = createRoccoLocalization('es');
    const state = createState();
    const engine = createEngineMock(state);
    const callbacks: {
      closeInventory?: () => void;
    } = {};
    const onOpenStorageInventoryRequested = vi.fn(
      (storageId: string, onInventoryClosed: () => void) => {
        expect(storageId).toBe(BAIT_SHOP_SOUVENIR_TABLE_STORAGE_ID);
        callbacks.closeInventory = onInventoryClosed;
      },
    );
    const level = new RoccoBaitShopLevel(localization, {
      onOpenStorageInventoryRequested,
    });

    await level.mount(engine);

    level.handleAction({
      definitionId: 'test-souvenir-table',
      targetInstanceId: BAIT_SHOP_SOUVENIR_TABLE_TARGET_INSTANCE_ID,
      targetDefinitionId: 'rocco-bait-shop-souvenir-table',
      itemId: 'grab',
      actionId: 'grab',
    });
    state.isSpriteMovingValue = false;
    level.update(16);

    expect(onOpenStorageInventoryRequested).toHaveBeenCalledOnce();
    expect(callbacks.closeInventory).toBeTypeOf('function');
    expect(
      getRegisteredSceneTarget(state, BAIT_SHOP_SOUVENIR_CLOSEUP_TARGET_INSTANCE_ID),
    ).toBeTruthy();

    const closeInventoryCallback = callbacks.closeInventory;
    if (!closeInventoryCallback) {
      throw new Error('Expected the storage close callback to be captured.');
    }

    closeInventoryCallback();

    expect(
      getRegisteredSceneTarget(state, BAIT_SHOP_SOUVENIR_CLOSEUP_TARGET_INSTANCE_ID),
    ).toBeUndefined();
    expect(state.unregisteredSceneTargetIds).toContain(
      BAIT_SHOP_SOUVENIR_CLOSEUP_TARGET_INSTANCE_ID,
    );
  });
});
