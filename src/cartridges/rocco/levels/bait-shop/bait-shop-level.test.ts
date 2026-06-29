import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RoccoEngine } from '../../../../engine/engine-sdk';
import type { RoccoPlaneScene, RoccoPlaneSceneRecord } from '../../../../engine/video/planes';
import type {
  RoccoSpriteDefinition,
  RoccoSpriteInstance,
  RoccoSpriteNavigationBinding,
  RoccoSpriteWalkMap,
} from '../../../../engine/video/sprites';
import { createRoccoLocalization } from '../../localization';
import {
  DEFAULT_SPRITE_DEFINITION_ID,
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_SCALE,
  DEFAULT_WALK_MAP_ID,
} from '../../rocco-default-constants';
import { BAIT_SHOP_SCENE_ID, RoccoBaitShopLevel } from './bait-shop-level';

const BAIT_SHOP_BENCH_TARGET_INSTANCE_ID = 'rocco-bait-shop-bench-target';
const BAIT_SHOP_POSTCARD_RACK_TARGET_INSTANCE_ID = 'rocco-bait-shop-postcard-rack-target';
const BAIT_SHOP_HIDDEN_KEYS_TARGET_INSTANCE_ID = 'rocco-bait-shop-hidden-keys-target';

vi.mock('../../../../engine/video/sprites', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../engine/video/sprites')>();
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
  restoredRecord: RoccoPlaneSceneRecord | null;
  loadedScene: RoccoPlaneScene | null;
  savedScenes: RoccoPlaneScene[];
  preloadedPlaneSceneIds: string[];
  preloadedSpriteDefinitionIds: string[];
  loadedSpriteDefinitionIds: string[];
  registeredWalkMapIds: string[];
  unregisteredWalkMapIds: string[];
  createdSprites: RoccoSpriteInstance[];
  removedSpriteIds: string[];
  walkMapBindings: string[];
  playerSpriteId: string | null;
  playedSpriteActionDirections: string[];
  sceneTargetsById: Map<string, unknown>;
  unregisteredSceneTargetIds: string[];
  spriteMessages: string[];
  spritePositions: string[];
  goToSprites: string[];
  isSpriteMovingValue: boolean;
  inputEnabled: boolean;
  renderCalls: number;
}

function createState(overrides: Partial<TestState> = {}): TestState {
  return {
    restoredRecord: null,
    loadedScene: null,
    savedScenes: [],
    preloadedPlaneSceneIds: [],
    preloadedSpriteDefinitionIds: [],
    loadedSpriteDefinitionIds: [],
    registeredWalkMapIds: [],
    unregisteredWalkMapIds: [],
    createdSprites: [],
    removedSpriteIds: [],
    walkMapBindings: [],
    playerSpriteId: null,
    playedSpriteActionDirections: [],
    sceneTargetsById: new Map(),
    unregisteredSceneTargetIds: [],
    spriteMessages: [],
    spritePositions: [],
    goToSprites: [],
    isSpriteMovingValue: false,
    inputEnabled: true,
    renderCalls: 0,
    ...overrides,
  };
}

function findCreatedSprite(state: TestState, instanceId: string): RoccoSpriteInstance | undefined {
  return state.createdSprites.findLast((sprite) => sprite.id === instanceId);
}

function getRegisteredSceneTarget<T>(state: TestState, instanceId: string): T | undefined {
  return state.sceneTargetsById.get(instanceId) as T | undefined;
}

function createEngineMock(state: TestState): RoccoEngine {
  return {
    video: {
      preloadPlaneScene: async (scene: RoccoPlaneScene) => {
        state.preloadedPlaneSceneIds.push(scene.id);
      },
      preloadSpriteDefinition: async (definition: RoccoSpriteDefinition) => {
        state.preloadedSpriteDefinitionIds.push(definition.id);
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
      } as unknown as RoccoEngine['video']['sceneTargets'],
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
        createSpriteFromDefinition: (definitionId: string, options?: Partial<RoccoSpriteInstance>) => {
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
            state.playedSpriteActionDirections.push(`${instanceId}:${actionId}:${options.direction}`);
          }
        },
      } as unknown as RoccoEngine['video']['sprites'],
    } as unknown as RoccoEngine['video'],
    persistence: {
      loadPlaneSceneRecord: async () => state.restoredRecord,
      savePlaneScene: async (scene: RoccoPlaneScene) => {
        state.savedScenes.push(scene);
      },
    } as unknown as RoccoEngine['persistence'],
    loadPlaneScene: (scene: RoccoPlaneScene) => {
      state.loadedScene = scene;
    },
    setInputEnabled: (enabled: boolean) => {
      state.inputEnabled = enabled;
    },
    isInputEnabled: () => state.inputEnabled,
    setPlayerSprite: (instanceId: string | null) => {
      state.playerSpriteId = instanceId;
    },
    log: () => {},
  } as unknown as RoccoEngine;
}

describe('RoccoBaitShopLevel', () => {
  beforeEach(() => {
    class TestImage {
      src = '';

      async decode(): Promise<void> {}
    }

    const originalCreateElement = document.createElement.bind(document);
    vi.stubGlobal('Image', TestImage);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName !== 'canvas') {
        return originalCreateElement(tagName);
      }

      return {
        width: 0,
        height: 0,
        getContext: (contextId: string) => {
          if (contextId !== '2d') {
            return null;
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
    }) as typeof document.createElement);
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
    expect(state.registeredWalkMapIds).toContain(DEFAULT_WALK_MAP_ID);
    expect(state.preloadedSpriteDefinitionIds).toContain(DEFAULT_SPRITE_DEFINITION_ID);
    expect(state.loadedSpriteDefinitionIds).toContain(DEFAULT_SPRITE_DEFINITION_ID);
    expect(state.removedSpriteIds).toContain(DEFAULT_SPRITE_INSTANCE_ID);
    expect(state.playerSpriteId).toBe(DEFAULT_SPRITE_INSTANCE_ID);
    expect(state.playedSpriteActionDirections).toContain(
      `${DEFAULT_SPRITE_INSTANCE_ID}:${DEFAULT_SPRITE_IDLE_ACTION_ID}:down-left`,
    );

    const rocco = findCreatedSprite(state, DEFAULT_SPRITE_INSTANCE_ID);
    expect(rocco?.transform).toMatchObject({
      x: 665,
      y: 110,
      scaleX: DEFAULT_SPRITE_SCALE * 1.2,
      scaleY: DEFAULT_SPRITE_SCALE * 1.2,
    });
    expect(rocco?.navigation).toMatchObject({
      walkMapId: DEFAULT_WALK_MAP_ID,
      groundAnchor: {
        x: DEFAULT_SPRITE_GROUND_ANCHOR_X,
        y: DEFAULT_SPRITE_GROUND_ANCHOR_Y,
      },
      constrainMovement: true,
      followSurface: true,
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

    expect(state.inputEnabled).toBe(false);
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
      `${DEFAULT_SPRITE_INSTANCE_ID}:think:${localization.text.baitShop.postcardRackRevealLine}`,
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
    expect(getRegisteredSceneTarget(state, BAIT_SHOP_HIDDEN_KEYS_TARGET_INSTANCE_ID)).toBeUndefined();
    expect(state.unregisteredSceneTargetIds).toContain(BAIT_SHOP_HIDDEN_KEYS_TARGET_INSTANCE_ID);
    expect(state.spriteMessages).toContain(
      `${DEFAULT_SPRITE_INSTANCE_ID}:think:${localization.text.baitShop.hiddenKeysCollectedLine}`,
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
});
