import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RoccoEngine } from '../../../../../src/engine/engine-sdk';
import type { RoccoActionMenuDefinition } from '../../../../../src/engine/video/action-menu';
import type { RoccoGridMenuDefinition } from '../../../../../src/engine/video/grid-menu';
import type { RoccoPlaneScene, RoccoPlaneSceneRecord } from '../../../../../src/engine/video/planes';
import type {
  RoccoSpriteDefinition,
  RoccoSpriteInstance,
  RoccoSpriteNavigationBinding,
  RoccoSpriteWalkMap,
} from '../../../../../src/engine/video/sprites';
import { createRoccoLocalization, type RoccoLocalization } from '../../../../../src/cartridges/rocco/localization';
import {
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_WALK_MAP_ID,
} from '../../../../../src/cartridges/rocco/rocco-default-constants';
import { ROCCO_PLAYER_ACTION_MENU_ID } from '../../../../../src/cartridges/rocco/rocco-player-action-menu';
import { BAIT_SHOP_TOILET_SCENE_ID, RoccoBaitShopToiletLevel } from '../../../../../src/cartridges/rocco/levels/bait-shop/bait-shop-toilet-level';

const TOILET_INSTANCE_ID = 'rocco-bait-shop-toilet-main';
const TOILET_ACTION_MENU_ID = 'rocco-bait-shop-toilet-action-menu';
const PORTAL_INSTANCE_ID = 'rocco-bait-shop-toilet-portal-instance';
const PORTAL_LOOP_SOUND_ID = 'rocco-bait-shop-toilet-portal-loop-sound';
const WISH_MENU_ID = 'rocco-bait-shop-toilet-wish-menu';
const WISH_ROOT_CHOICE_ID = 'wish-root';
const POST_WISH_RESPONSE_MENU_ID = 'rocco-bait-shop-toilet-post-wish-response-menu';
const POST_WISH_REPLY_MOMENT_PLEASE_CHOICE_ID = 'post-wish-reply-moment-please';

vi.mock('../../../../../src/engine/video/sprites', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../src/engine/video/sprites')>();
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
    createRoccoSpriteAutoCroppedFrames: vi.fn(
      (options: {
        sources: Array<{ id: string; uri: string; width?: number; height?: number }>;
        frameIdPrefix: string;
        durationMs: number;
      }) =>
        Promise.resolve({
          images: options.sources.map((source) => ({
            id: source.id,
            uri: source.uri,
            width: source.width ?? 64,
            height: source.height ?? 64,
          })),
          frames: options.sources.map((source, index) => ({
            id: `${options.frameIdPrefix}-${index + 1}`,
            imageId: source.id,
            rect: {
              x: 0,
              y: 0,
              width: source.width ?? 64,
              height: source.height ?? 64,
            },
            durationMs: options.durationMs,
            pivot: {
              x: 0,
              y: 0,
            },
          })),
          frameIds: options.sources.map((_, index) => `${options.frameIdPrefix}-${index + 1}`),
        }),
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
  spriteMessages: string[];
  playedSpriteActions: string[];
  playedSpriteAnimations: string[];
  playedSoundIds: string[];
  stoppedSoundIds: string[];
  registeredActionMenuIds: string[];
  openedGridMenuDefinitions: RoccoGridMenuDefinition[];
  closedGridMenuCount: number;
  activeGridMenuDefinitionId: string | undefined;
  sceneTargetsById: Map<string, unknown>;
  unregisteredSceneTargetIds: string[];
  inputEnabled: boolean;
  isSpriteMovingValue: boolean;
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
    spriteMessages: [],
    playedSpriteActions: [],
    playedSpriteAnimations: [],
    playedSoundIds: [],
    stoppedSoundIds: [],
    registeredActionMenuIds: [],
    openedGridMenuDefinitions: [],
    closedGridMenuCount: 0,
    activeGridMenuDefinitionId: undefined,
    sceneTargetsById: new Map(),
    unregisteredSceneTargetIds: [],
    inputEnabled: true,
    isSpriteMovingValue: false,
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
        registerMenu: (definition: RoccoActionMenuDefinition) => {
          if (!state.registeredActionMenuIds.includes(definition.id)) {
            state.registeredActionMenuIds.push(definition.id);
          }
        },
        unregisterMenu: (menuId: string) => {
          state.registeredActionMenuIds = state.registeredActionMenuIds.filter((id) => id !== menuId);
        },
        closeMenu: () => {},
      },
      gridMenus: {
        openMenu: (definition: RoccoGridMenuDefinition) => {
          state.openedGridMenuDefinitions.push(definition);
          state.activeGridMenuDefinitionId = definition.id;
        },
        closeMenu: () => {
          state.closedGridMenuCount += 1;
          state.activeGridMenuDefinitionId = undefined;
        },
        clearCarriedItem: () => {},
      } as unknown as RoccoEngine['video']['gridMenus'],
      messages: {
        think: (instanceId: string, text: string | string[]) => {
          state.spriteMessages.push(
            `${instanceId}:think:${Array.isArray(text) ? text.join('|') : text}`,
          );
        },
        say: (instanceId: string, text: string | string[]) => {
          state.spriteMessages.push(
            `${instanceId}:say:${Array.isArray(text) ? text.join('|') : text}`,
          );
        },
        removeMessage: () => {},
        clearMessages: () => {
          state.spriteMessages.length = 0;
        },
      } as unknown as RoccoEngine['video']['messages'],
      sceneTargets: {
        registerTarget: (definition: { instanceId: string }) => {
          state.sceneTargetsById.set(definition.instanceId, definition);
        },
        unregisterTarget: (instanceId: string) => {
          state.sceneTargetsById.delete(instanceId);
          state.unregisteredSceneTargetIds.push(instanceId);
        },
      } as unknown as RoccoEngine['video']['sceneTargets'],
      planes: {
        updatePlane: () => {},
      } as unknown as RoccoEngine['video']['planes'],
      titles: {
        addTitle: () => {},
        removeTitle: () => {},
      } as unknown as RoccoEngine['video']['titles'],
      primitives: {
        addPrimitive: () => {},
        removePrimitive: () => {},
      } as unknown as RoccoEngine['video']['primitives'],
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
          const sprite = findCreatedSprite(state, instanceId);
          if (sprite) {
            sprite.visible = false;
            sprite.enabled = false;
            sprite.interactive = false;
          }
        },
        getSprite: (instanceId: string) => findCreatedSprite(state, instanceId),
        createSprite: (sprite: RoccoSpriteInstance) => {
          const created = structuredClone(sprite);
          state.createdSprites.push(created);
          return created;
        },
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
          const sprite = findCreatedSprite(state, instanceId);
          if (sprite) {
            sprite.transform.x = x;
            sprite.transform.y = y;
          }
        },
        setVisibleDescription: (
          instanceId: string,
          visibleDescription?: { enabled?: boolean; text?: string },
        ) => {
          const sprite = findCreatedSprite(state, instanceId);
          if (sprite) {
            sprite.visibleDescription = visibleDescription;
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
        goTo: (...args: [string, number, number]) => {
          void args;
          state.isSpriteMovingValue = true;
          return true;
        },
        isMoving: () => state.isSpriteMovingValue,
        playAction: (instanceId: string, actionId: string, options?: { direction?: string }) => {
          state.playedSpriteActions.push(
            `${instanceId}:${actionId}:${options?.direction ?? 'none'}`,
          );
        },
        playAnimation: (instanceId: string, animationId: string) => {
          state.playedSpriteAnimations.push(`${instanceId}:${animationId}`);
          const sprite = findCreatedSprite(state, instanceId);
          if (sprite) {
            sprite.animation.animationId = animationId;
          }
        },
        stopAnimation: () => {},
        setAnimationFrame: (instanceId: string, frameIndex: number) => {
          const sprite = findCreatedSprite(state, instanceId);
          if (sprite) {
            sprite.animation.frameIndex = frameIndex;
          }
        },
      } as unknown as RoccoEngine['video']['sprites'],
    } as unknown as RoccoEngine['video'],
    audio: {
      registerSound: () => {},
      unregisterSound: () => {},
      preloadSound: () => Promise.resolve(),
      playSound: (soundId: string) => {
        state.playedSoundIds.push(soundId);
      },
      stopSound: (soundId: string) => {
        state.stoppedSoundIds.push(soundId);
      },
      stopAllSounds: () => {},
    } as unknown as RoccoEngine['audio'],
    persistence: {
      loadPlaneSceneRecord: () => Promise.resolve(state.restoredRecord),
      savePlaneScene: (scene: RoccoPlaneScene) => {
        state.savedScenes.push(scene);
        return Promise.resolve();
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

function countCoralRelicReadingLines(localization: RoccoLocalization): number {
  return [
    ...localization.text.baitShop.toiletMagazineReadingIntroLines.slice(0, 2),
    localization.text.baitShop.toiletMagazineUnknownStanLine,
    ...localization.text.baitShop.toiletMagazineReadingIntroLines.slice(2),
    ...localization.text.baitShop.toiletMagazineReadingCoralRelicLines,
  ].filter((line) => line.trim().length > 0).length;
}

function finishSitSequence(level: RoccoBaitShopToiletLevel, state: TestState): void {
  level.handleAction({
    definitionId: TOILET_ACTION_MENU_ID,
    targetInstanceId: TOILET_INSTANCE_ID,
    targetDefinitionId: 'rocco-bait-shop-toilet',
    itemId: 'use',
    actionId: 'use',
  });

  state.isSpriteMovingValue = false;
  level.update(16);
  level.update(500);
  level.update(500);
  state.isSpriteMovingValue = false;
  level.update(16);
  level.update(500);
  level.update(500);
  state.isSpriteMovingValue = false;
  level.update(16);
  level.update(500);
}

function advanceCoralRelicReadingToStanding(
  level: RoccoBaitShopToiletLevel,
  state: TestState,
  localization: RoccoLocalization,
): void {
  level.handleAction({
    definitionId: ROCCO_PLAYER_ACTION_MENU_ID,
    targetInstanceId: TOILET_INSTANCE_ID,
    targetDefinitionId: 'rocco-bait-shop-toilet',
    itemId: 'read',
    actionId: 'read',
  });

  for (let index = 0; index < countCoralRelicReadingLines(localization); index += 1) {
    level.handleSceneClick({
      kind: 'scene-click',
      sceneX: 0,
      sceneY: 0,
    });
  }

  level.update(500);
  state.isSpriteMovingValue = false;
  level.update(16);
  level.update(500);
}

function setPlayerVisualOrigin(state: TestState, x: number, y: number): void {
  const player = findCreatedSprite(state, DEFAULT_SPRITE_INSTANCE_ID);
  if (!player) {
    throw new Error('Expected Rocco to exist.');
  }

  player.transform.x = x;
  player.transform.y = y;
}

describe('RoccoBaitShopToiletLevel', () => {
  beforeEach(() => {
    class TestImage {
      src = '';

      decode(): Promise<void> {
        return Promise.resolve();
      }
    }

    const originalCreateElement = document.createElement.bind(document);
    vi.stubGlobal('Image', TestImage);
    vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(
        ((contextId: string) => {
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
        }) as typeof HTMLCanvasElement.prototype.getContext,
      );
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() !== 'canvas') {
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
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps the portal pending until Rocco leaves the overlap zone and then transitions on contact', async () => {
    const localization = createRoccoLocalization('es');
    const state = createState();
    const engine = createEngineMock(state);
    const onConnectorTransitionRequested = vi.fn(() => true);
    const consumeRelic = vi.fn();
    const level = new RoccoBaitShopToiletLevel(localization, {
      hasMagazine: () => true,
      hasCoralRelic: () => true,
    });

    await level.mount(engine, {
      onConnectorTransitionRequested,
    });

    expect(state.loadedScene?.id).toBe(BAIT_SHOP_TOILET_SCENE_ID);
    expect(state.registeredWalkMapIds).toContain(DEFAULT_WALK_MAP_ID);

    finishSitSequence(level, state);
    expect(state.inputEnabled).toBe(true);

    advanceCoralRelicReadingToStanding(level, state, localization);
    expect(level.isEscapeUrgencyActive()).toBe(true);

    level.openCoralRelicWishMenu(
      {
        x: 414,
        y: 367,
      },
      consumeRelic,
    );

    expect(state.activeGridMenuDefinitionId).toBe(WISH_MENU_ID);

    level.handleGridMenu({
      kind: 'grid-menu',
      definitionId: WISH_MENU_ID,
      interaction: 'activate',
      itemId: WISH_ROOT_CHOICE_ID,
      slotIndex: 1,
      items: [],
    });

    state.isSpriteMovingValue = false;
    level.update(16);
    expect(consumeRelic).toHaveBeenCalledOnce();

    level.update(1000);
    expect(state.removedSpriteIds).toContain(TOILET_INSTANCE_ID);
    expect(state.activeGridMenuDefinitionId).toBeUndefined();

    level.update(1000);
    expect(state.activeGridMenuDefinitionId).toBeUndefined();

    level.handleSceneClick({
      kind: 'scene-click',
      sceneX: 12,
      sceneY: 12,
    });
    expect(state.activeGridMenuDefinitionId).toBe(POST_WISH_RESPONSE_MENU_ID);

    level.handleGridMenu({
      kind: 'grid-menu',
      definitionId: POST_WISH_RESPONSE_MENU_ID,
      interaction: 'activate',
      itemId: POST_WISH_REPLY_MOMENT_PLEASE_CHOICE_ID,
      slotIndex: 0,
      items: [],
    });
    expect(state.activeGridMenuDefinitionId).toBeUndefined();

    setPlayerVisualOrigin(state, 400, 300);

    level.handleSceneClick({
      kind: 'scene-click',
      sceneX: 20,
      sceneY: 20,
    });
    expect(getRegisteredSceneTarget(state, PORTAL_INSTANCE_ID)).toBeUndefined();

    level.handleSceneClick({
      kind: 'scene-click',
      sceneX: 24,
      sceneY: 24,
    });
    expect(getRegisteredSceneTarget(state, PORTAL_INSTANCE_ID)).toBeUndefined();
    expect(state.playedSoundIds).not.toContain(PORTAL_LOOP_SOUND_ID);
    expect(onConnectorTransitionRequested).not.toHaveBeenCalled();

    setPlayerVisualOrigin(state, 40, 40);
    level.update(16);

    const portalTarget = getRegisteredSceneTarget<{
      visibleDescription?: { text?: string };
    }>(state, PORTAL_INSTANCE_ID);
    expect(portalTarget).toMatchObject({
      visibleDescription: {
        text: 'Portal al Nether',
      },
    });
    expect(state.playedSoundIds).toContain(PORTAL_LOOP_SOUND_ID);

    const portalSprite = findCreatedSprite(state, PORTAL_INSTANCE_ID);
    expect(portalSprite?.visibleDescription).toMatchObject({
      text: 'Portal al Nether',
    });
    expect(portalSprite?.transform.scaleX).toBeCloseTo(portalSprite?.transform.scaleY ?? 0, 5);

    setPlayerVisualOrigin(state, 400, 300);
    level.update(16);

    expect(onConnectorTransitionRequested).toHaveBeenCalledWith('portal');

    expect(state.playedSpriteAnimations).toContain(
      `${PORTAL_INSTANCE_ID}:bait-shop-toilet-portal-open`,
    );
    expect(state.inputEnabled).toBe(true);
    expect(state.playerSpriteId).toBe(DEFAULT_SPRITE_INSTANCE_ID);
    expect(state.playedSpriteActions).toContain(
      `${DEFAULT_SPRITE_INSTANCE_ID}:${DEFAULT_SPRITE_IDLE_ACTION_ID}:down`,
    );
  });

  it('can keep the toilet action menu available during urgency when the developer event is enabled', async () => {
    const localization = createRoccoLocalization('es');
    const state = createState();
    const engine = createEngineMock(state);
    const level = new RoccoBaitShopToiletLevel(localization, {
      hasMagazine: () => true,
      hasCoralRelic: () => true,
      allowReuseDuringUrgency: () => true,
    });

    await level.mount(engine);

    finishSitSequence(level, state);
    advanceCoralRelicReadingToStanding(level, state, localization);

    expect(level.isEscapeUrgencyActive()).toBe(true);
    expect(state.registeredActionMenuIds).toContain(TOILET_ACTION_MENU_ID);
  });
});
