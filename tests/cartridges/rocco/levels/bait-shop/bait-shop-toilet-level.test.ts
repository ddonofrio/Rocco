import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  RoccoSoundDefinition,
  RoccoSoundPlayOptions,
} from '../../../../../src/console/audio/types';
import type { ConsoleKernel } from '../../../../../src/console/console-kernel';
import { asRoccoTestSdk } from '../../test-sdk';
import type { CartridgeSdkV1Runtime } from '../../../../../src/console/cartridges/sdk-v1';
import type { RoccoActionMenuDefinition } from '../../../../../src/console/video/action-menu';
import type { RoccoGridMenuDefinition } from '../../../../../src/console/video/grid-menu';
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
import {
  createRoccoLocalization,
  type RoccoLocalization,
} from '../../../../../src/cartridges/rocco/localization';
import {
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_PICK_UP_ACTION_ID,
  DEFAULT_WALK_MAP_ID,
} from '../../../../../src/cartridges/rocco/rocco-default-constants';
import { createRoccoCoralRelicInventoryItem } from '../../../../../src/cartridges/rocco/inventory';
import { ROCCO_PLAYER_ACTION_MENU_ID } from '../../../../../src/cartridges/rocco/rocco-player-action-menu';
import {
  BAIT_SHOP_TOILET_SCENE_ID,
  RoccoBaitShopToiletLevel,
} from '../../../../../src/cartridges/rocco/levels/bait-shop/bait-shop-toilet-level';

const TOILET_INSTANCE_ID = 'rocco-bait-shop-toilet-main';
const TOILET_ACTION_MENU_ID = 'rocco-bait-shop-toilet-action-menu';
const PORTAL_INSTANCE_ID = 'rocco-bait-shop-toilet-portal-instance';
const PORTAL_LOOP_SOUND_ID = 'rocco-bait-shop-toilet-portal-loop-sound';
const WISH_MENU_ID = 'rocco-bait-shop-toilet-wish-menu';
const WISH_ROOT_CHOICE_ID = 'wish-root';
const POST_WISH_RESPONSE_MENU_ID = 'rocco-bait-shop-toilet-post-wish-response-menu';
const POST_WISH_REPLY_MOMENT_PLEASE_CHOICE_ID = 'post-wish-reply-moment-please';

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
  spriteMessages: string[];
  playedSpriteActions: string[];
  playedSpriteAnimations: string[];
  playedSoundIds: string[];
  playedSounds: Array<{ soundId: string; options?: RoccoSoundPlayOptions }>;
  stoppedSoundIds: string[];
  registeredSounds: Map<string, RoccoSoundDefinition>;
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
    spriteMessages: [],
    playedSpriteActions: [],
    playedSpriteAnimations: [],
    playedSoundIds: [],
    playedSounds: [],
    stoppedSoundIds: [],
    registeredSounds: new Map(),
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
        registerMenu: (definition: RoccoActionMenuDefinition) => {
          if (!state.registeredActionMenuIds.includes(definition.id)) {
            state.registeredActionMenuIds.push(definition.id);
          }
        },
        unregisterMenu: (menuId: string) => {
          state.registeredActionMenuIds = state.registeredActionMenuIds.filter(
            (id) => id !== menuId,
          );
        },
        closeMenu: () => {},
      },
      gridMenus: {
        openMenu: (definition: RoccoGridMenuDefinition) => {
          state.openedGridMenuDefinitions.push(definition);
          state.activeGridMenuDefinitionId = definition.id;
        },
        isOpen: (definitionId?: string) =>
          definitionId
            ? state.activeGridMenuDefinitionId === definitionId
            : state.activeGridMenuDefinitionId !== undefined,
        closeMenu: () => {
          state.closedGridMenuCount += 1;
          state.activeGridMenuDefinitionId = undefined;
        },
        clearCarriedItem: () => {},
      } as unknown as ConsoleKernel['video']['gridMenus'],
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
      } as unknown as ConsoleKernel['video']['messages'],
      sceneTargets: {
        registerTarget: (definition: { instanceId: string }) => {
          state.sceneTargetsById.set(definition.instanceId, definition);
        },
        unregisterTarget: (instanceId: string) => {
          state.sceneTargetsById.delete(instanceId);
          state.unregisteredSceneTargetIds.push(instanceId);
        },
      } as unknown as ConsoleKernel['video']['sceneTargets'],
      planes: {
        updatePlane: () => {},
      } as unknown as ConsoleKernel['video']['planes'],
      titles: {
        addTitle: () => {},
        removeTitle: () => {},
      } as unknown as ConsoleKernel['video']['titles'],
      primitives: {
        addPrimitive: () => {},
        removePrimitive: () => {},
      } as unknown as ConsoleKernel['video']['primitives'],
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
        goTo: () => {
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
      } as unknown as ConsoleKernel['video']['sprites'],
    } as unknown as ConsoleKernel['video'],
    audio: {
      registerSound: (definition: RoccoSoundDefinition) => {
        state.registeredSounds.set(definition.id, definition);
      },
      unregisterSound: () => {},
      preloadSound: () => Promise.resolve(),
      playSound: (soundId: string, options?: RoccoSoundPlayOptions) => {
        state.playedSoundIds.push(soundId);
        state.playedSounds.push({ soundId, options });
        return {
          stop() {},
          setVolume() {},
          get ended() {
            return Promise.resolve();
          },
        };
      },
      stopSound: (soundId: string) => {
        state.stoppedSoundIds.push(soundId);
      },
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
    acquireInputLease: () => {
      state.inputEnabled = false;
      return {
        ownerId: 'test',
        mode: 'blocked' as const,
        acquiredAt: 0,
        dispose() {
          state.inputEnabled = true;
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
  } as unknown as ConsoleKernel);
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
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((contextId: string) => {
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
    }) as typeof HTMLCanvasElement.prototype.getContext);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() !== 'canvas') {
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

  it('does not consume seated toilet clicks so the seated action menu can open', async () => {
    const localization = createRoccoLocalization('es');
    const state = createState();
    const engine = createEngineMock(state);
    const level = new RoccoBaitShopToiletLevel(localization, {
      hasMagazine: () => true,
    });

    await level.mount(engine);
    finishSitSequence(level, state);

    expect(state.registeredActionMenuIds).toContain(ROCCO_PLAYER_ACTION_MENU_ID);
    expect(
      level.handleSceneClick({
        kind: 'scene-click',
        sceneX: 0,
        sceneY: 0,
        targetInstanceId: TOILET_INSTANCE_ID,
        targetDefinitionId: 'rocco-bait-shop-toilet',
      }),
    ).toBeUndefined();
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

  it('reopens the post-wish police response menu after an outside click instead of blocking the portal', async () => {
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

    finishSitSequence(level, state);
    advanceCoralRelicReadingToStanding(level, state, localization);
    expect(level.isEscapeUrgencyActive()).toBe(true);

    level.openCoralRelicWishMenu({ x: 414, y: 367 }, consumeRelic);

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
    level.update(1000);

    level.handleSceneClick({ kind: 'scene-click', sceneX: 12, sceneY: 12 });
    expect(state.activeGridMenuDefinitionId).toBe(POST_WISH_RESPONSE_MENU_ID);

    const menuOpensBeforeDismiss = state.openedGridMenuDefinitions.length;

    state.activeGridMenuDefinitionId = undefined;
    level.handleGridMenu({
      kind: 'grid-menu',
      definitionId: POST_WISH_RESPONSE_MENU_ID,
      interaction: 'close',
      items: [],
    });

    expect(state.activeGridMenuDefinitionId).toBe(POST_WISH_RESPONSE_MENU_ID);
    expect(state.openedGridMenuDefinitions).toHaveLength(menuOpensBeforeDismiss + 1);
    expect(getRegisteredSceneTarget(state, PORTAL_INSTANCE_ID)).toBeUndefined();
    expect(state.playedSoundIds).not.toContain(PORTAL_LOOP_SOUND_ID);
    expect(onConnectorTransitionRequested).not.toHaveBeenCalled();

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

    // The portal only activates when the player is NOT over its zone.
    // Leave the zone to allow activation and then return to it.
    setPlayerVisualOrigin(state, 40, 40);
    level.update(16);

    // Position the player inside the portal zone.
    setPlayerVisualOrigin(state, 381, 302);

    // First click inside the portal at a safe in-zone coordinate.
    level.handleSceneClick({
      kind: 'scene-click',
      sceneX: 381,
      sceneY: 302,
      targetInstanceId: PORTAL_INSTANCE_ID,
    });
    expect(getRegisteredSceneTarget(state, PORTAL_INSTANCE_ID)).toBeDefined();

    // Second click near the portal.
    level.handleSceneClick({
      kind: 'scene-click',
      sceneX: 382,
      sceneY: 302,
      targetInstanceId: PORTAL_INSTANCE_ID,
    });
    expect(state.playedSoundIds).toContain(PORTAL_LOOP_SOUND_ID);

    // Click outside the portal to close it.
    setPlayerVisualOrigin(state, 400, 300);
    level.update(16);
    level.handleSceneClick({
      kind: 'scene-click',
      sceneX: 20,
      sceneY: 20,
    });
    expect(getRegisteredSceneTarget(state, PORTAL_INSTANCE_ID)).toBeUndefined();

    setPlayerVisualOrigin(state, 40, 40);
    level.update(16);

    // Verify the final transition.
    expect(onConnectorTransitionRequested).toHaveBeenCalledWith('portal');
  });

  it('does not reopen the post-wish police response menu for a stale close after a response is chosen', async () => {
    const localization = createRoccoLocalization('es');
    const state = createState();
    const engine = createEngineMock(state);
    const consumeRelic = vi.fn();
    const level = new RoccoBaitShopToiletLevel(localization, {
      hasMagazine: () => true,
      hasCoralRelic: () => true,
    });

    await level.mount(engine);

    finishSitSequence(level, state);
    advanceCoralRelicReadingToStanding(level, state, localization);

    level.openCoralRelicWishMenu({ x: 414, y: 367 }, consumeRelic);

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
    level.update(1000);
    level.update(1000);

    level.handleSceneClick({ kind: 'scene-click', sceneX: 12, sceneY: 12 });
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

    state.activeGridMenuDefinitionId = undefined;
    level.handleGridMenu({
      kind: 'grid-menu',
      definitionId: POST_WISH_RESPONSE_MENU_ID,
      interaction: 'close',
      items: [],
    });

    expect(state.activeGridMenuDefinitionId).toBeUndefined();
  });

  it('plays the toilet room door closing sound at half of the previous volume when entering from the shop', async () => {
    const state = createState();
    const engine = createEngineMock(state);
    const level = new RoccoBaitShopToiletLevel(createRoccoLocalization('es'));

    await level.mount(engine, {
      entryConnectorId: 'south',
    });
    level.update(16);

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

  it('throws the coral relic with the scripted sequence when urgency is active', async () => {
    const localization = createRoccoLocalization('es');
    const state = createState();
    const engine = createEngineMock(state);
    const level = new RoccoBaitShopToiletLevel(localization, {
      hasMagazine: () => true,
      hasCoralRelic: () => true,
    });

    await level.mount(engine);

    finishSitSequence(level, state);
    advanceCoralRelicReadingToStanding(level, state, localization);

    expect(level.isEscapeUrgencyActive()).toBe(true);

    const player = findCreatedSprite(state, DEFAULT_SPRITE_INSTANCE_ID);
    expect(player).toBeDefined();
    if (player) {
      player.transform.scaleX = 1;
      player.transform.scaleY = 1;
      player.transform.x = 0;
      player.transform.y = 0;
    }

    const onComplete = vi.fn();
    const relicItem = createRoccoCoralRelicInventoryItem(localization);

    level.startThrowCoralRelicSequence(relicItem, onComplete);

    expect(state.inputEnabled).toBe(false);
    state.isSpriteMovingValue = false;
    level.update(16);

    state.isSpriteMovingValue = false;
    level.update(16);

    expect(state.playedSpriteActions).toContain(
      `${DEFAULT_SPRITE_INSTANCE_ID}:${DEFAULT_SPRITE_PICK_UP_ACTION_ID}:down`,
    );
    expect(
      state.createdSprites.some(
        (sprite) => sprite.id === 'rocco-bait-shop-toilet-throw-relic-instance',
      ),
    ).toBe(true);

    level.update(250);

    expect(state.playedSpriteActions).toContain(
      `${DEFAULT_SPRITE_INSTANCE_ID}:${DEFAULT_SPRITE_IDLE_ACTION_ID}:down`,
    );

    level.update(300);

    expect(onComplete).toHaveBeenCalledOnce();
    expect(state.inputEnabled).toBe(true);
    expect(state.removedSpriteIds).toContain('rocco-bait-shop-toilet-throw-relic-instance');
  });

  it('does not start the throw sequence without urgency or when already running', async () => {
    const localization = createRoccoLocalization('es');
    const state = createState();
    const engine = createEngineMock(state);
    const level = new RoccoBaitShopToiletLevel(localization, {
      hasMagazine: () => true,
      hasCoralRelic: () => true,
    });

    await level.mount(engine);

    const onComplete = vi.fn();
    const relicItem = createRoccoCoralRelicInventoryItem(localization);

    level.startThrowCoralRelicSequence(relicItem, onComplete);
    expect(onComplete).toHaveBeenCalledTimes(1);

    level.isEscapeUrgencyActive = () => true;
    level.startThrowCoralRelicSequence(relicItem, onComplete);
    expect(onComplete).toHaveBeenCalledTimes(1);

    level.startThrowCoralRelicSequence(relicItem, onComplete);
    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  it('blocks interaction during the throw sequence', async () => {
    const localization = createRoccoLocalization('es');
    const state = createState();
    const engine = createEngineMock(state);
    const level = new RoccoBaitShopToiletLevel(localization, {
      hasMagazine: () => true,
      hasCoralRelic: () => true,
    });

    await level.mount(engine);

    finishSitSequence(level, state);
    advanceCoralRelicReadingToStanding(level, state, localization);

    const player = findCreatedSprite(state, DEFAULT_SPRITE_INSTANCE_ID);
    expect(player).toBeDefined();
    if (player) {
      player.transform.scaleX = 1;
      player.transform.scaleY = 1;
      player.transform.x = 0;
      player.transform.y = 0;
    }

    const onComplete = vi.fn();
    const relicItem = createRoccoCoralRelicInventoryItem(localization);
    level.startThrowCoralRelicSequence(relicItem, onComplete);

    expect(
      level.handleAction({
        definitionId: ROCCO_PLAYER_ACTION_MENU_ID,
        targetInstanceId: TOILET_INSTANCE_ID,
        targetDefinitionId: 'rocco-bait-shop-toilet',
        itemId: 'talk',
        actionId: 'talk',
      }),
    ).toBeUndefined();

    expect(level.handleSceneClick({ kind: 'scene-click', sceneX: 0, sceneY: 0 })).toEqual({
      consumed: true,
      defaultPlayerMovement: 'suppress',
    });
  });
});
