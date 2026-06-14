import { describe, expect, it, vi } from 'vitest';

import type { RoccoCartridgeAction } from '../../engine/cartridges';
import type { RoccoEngine } from '../../engine/engine-api';
import type { RoccoPlaneScene, RoccoPlaneSceneRecord } from '../../engine/video/planes';
import type {
  RoccoSpriteInstance,
  RoccoSpriteDefinition,
  RoccoSpriteWalkMap,
  RoccoMoveOptions,
  RoccoSpriteGoToOptions,
  RoccoSpriteNavigationBinding,
  RoccoSpritePresentationTransform,
  RoccoDepthMode,
} from '../../engine/video/sprites';
import type { RoccoSpriteMessageRequest } from '../../engine/video/messages';
import type {
  RoccoActionMenuActivation,
  RoccoActionMenuDefinition,
} from '../../engine/video/action-menu';
import type {
  RoccoGridMenuCarriedItem,
  RoccoGridMenuDefinition,
} from '../../engine/video/grid-menu';
import type { RoccoPrimitive } from '../../engine/video/primitives';
import type { RoccoTitleMessage } from '../../engine/video/titles';
import type { RoccoDisplayProfile } from '../../engine/video/display';
import type { RoccoSoundDefinition } from '../../engine/audio/types';
import type { RoccoEffect } from '../../engine/effects/types';
import { defaultDisplayProfile } from '../../engine/video/display';
import {
  DEFAULT_BACKGROUND_IMAGE_HEIGHT,
  DEFAULT_BACKGROUND_IMAGE_WIDTH,
  DEFAULT_BAIT_BUCKET_DROPPED_ANIMATION_ID,
  DEFAULT_BAIT_BUCKET_RENDER_LAYER,
  DEFAULT_BAIT_BUCKET_SCALE,
  DEFAULT_BAIT_BUCKET_SPRITE_DEFINITION_ID,
  DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID,
  DEFAULT_BAIT_BUCKET_X,
  DEFAULT_BAIT_BUCKET_Y,
  DEFAULT_CLOUD_BASE_Y,
  DEFAULT_CLOUD_SCALE_GROWTH_FACTOR,
  DEFAULT_CLOUD_SPEED_X,
  DEFAULT_CLOUD_SPRITE_DEFINITION_ID,
  DEFAULT_CLOUD_SPRITE_INSTANCE_ID,
  DEFAULT_CLOUD_SPRITE_OPACITY,
  DEFAULT_CLOUD_SPRITE_SCALE,
  DEFAULT_CLOUD_START_X,
  DEFAULT_CLOUD_VERTICAL_AMPLITUDE,
  DEFAULT_CLOUD_VERTICAL_PERIOD_MS,
  DEFAULT_CLOUD_WRAP_RIGHT_X,
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_KEYS_SPRITE_INSTANCE_ID,
  DEFAULT_KEYS_X,
  DEFAULT_KEYS_Y,
  DEFAULT_PELIKAN_FEEDING_ANIMATION_ID,
  DEFAULT_PELIKAN_FEEDING_X,
  DEFAULT_PELIKAN_FEEDING_Y,
  DEFAULT_PELIKAN_FLIGHT_DURATION_MS,
  DEFAULT_PELIKAN_RENDER_LAYER,
  DEFAULT_PELIKAN_PERCH_X,
  DEFAULT_PELIKAN_PERCH_Y,
  DEFAULT_PELIKAN_SPRITE_DEFINITION_ID,
  DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
  DEFAULT_PELIKAN_SPRITE_SCALE,
  DEFAULT_PELIKAN_TURN_DURATION_MS,
  DEFAULT_ROCCO_GREEN_BLACK,
  DEFAULT_SCENE_ID,
  DEFAULT_WATER_EFFECT_COLORS,
  DEFAULT_WATER_EFFECT_TOLERANCE,
  DEFAULT_SPRITE_DEFINITION_ID,
  DEFAULT_SPRITE_GROUND_ANCHOR_X,
  DEFAULT_SPRITE_GROUND_ANCHOR_Y,
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_PAUSE_X,
  DEFAULT_SPRITE_RUN_ACTION_ID,
  DEFAULT_SPRITE_START_X,
  DEFAULT_SPRITE_STANDING_POSE_COUNT,
  DEFAULT_SPRITE_STANDING_SEQUENCE_ANIMATION_ID,
  DEFAULT_SPRITE_STANDING_SEQUENCE_RIGHT_ANIMATION_ID,
  DEFAULT_WALK_MAP_ID,
  DEFAULT_SPRITE_Y_VALUES,
  PIER_BACKGROUND_SCROLL_LEFT_X,
  PIER_BACKGROUND_SCROLL_RIGHT_X,
  PIER_END_SCENE_ID,
  PIER_PLAYER_LEFT_ENTRY_X,
  PIER_PLAYER_RIGHT_ENTRY_X,
  PIER_START_SCENE_ID,
} from './rocco-default-constants';
import { RoccoDefaultCartridge } from './rocco-default-cartridge';
import {
  roccoDefaultRunLeftAssetUrls,
  roccoDefaultRunRightAssetUrls,
  roccoDefaultStandingAssetUrls,
} from './rocco-default-assets';
import { pierBackgroundAssetUrls } from './levels/pier/pier-assets';
import { DEFAULT_FEEDING_LOOK_ACTION_MENU_ID } from './levels/pier/pier-feeding-interactions';
import {
  createDefaultActionMenuDefinition,
  DEFAULT_ACTION_MENU_ID,
} from './levels/pier/pier-pelikan-action-menu';
import { RoccoPierLevelManager } from './levels/pier/pier-level-manager';
import { createRoccoLocalization } from './localization';
import { createDefaultSpriteDefinition } from './rocco-default-sprite-definition';
import { makeDefaultWaterColorEffect } from './levels/pier/pier-video-effects';
import {
  createRoccoKeysInventoryItem,
  RoccoInventory,
  ROCCO_INVENTORY_KEYS_ITEM_ID,
  ROCCO_INVENTORY_MENU_ID,
  ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
} from './inventory';
import {
  ROCCO_PLAYER_ACTION_MENU_ID,
  ROCCO_PLAYER_INVENTORY_ACTION_ID,
} from './rocco-player-action-menu';

vi.mock('pixi.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pixi.js')>();
  return {
    ...actual,
    Assets: {
      ...actual.Assets,
      load: vi.fn(async (uri: string) => uri),
    },
  };
});

vi.mock('../../engine/video/sprites', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../engine/video/sprites')>();
  return {
    ...actual,
    loadRoccoSpriteWalkMapFromImage: vi.fn(
      async (options: {
        id: string;
        origin?: { x: number; y: number };
        alphaThreshold?: number;
      }) => ({
        id: options.id,
        width: 1672,
        height: 941,
        origin: options.origin ?? { x: 0, y: 0 },
        alphaThreshold: options.alphaThreshold ?? 1,
        columns: [{ x: 0, spans: [{ yMin: 0, yMax: 0 }] }],
      }),
    ),
    createRoccoSpriteAutoCroppedFrames: vi.fn(
      async (options: {
        sources: Array<{ id: string; uri: string; width?: number; height?: number }>;
        frameIdPrefix: string;
        durationMs: number;
      }) => ({
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
        })),
        frameIds: options.sources.map((_, index) => `${options.frameIdPrefix}-${index + 1}`),
      }),
    ),
  };
});

const DEFAULT_CENTERED_BACKGROUND_SCROLL = {
  x: (DEFAULT_BACKGROUND_IMAGE_WIDTH - DEFAULT_DESIGN_WIDTH) / 2,
  y: (DEFAULT_BACKGROUND_IMAGE_HEIGHT - DEFAULT_DESIGN_HEIGHT) / 2,
};

function listSpritePositionsFor(state: EngineMockState, instanceId: string): string[] {
  return state.spritePositions.filter((position) => position.startsWith(`${instanceId}:`));
}

function listSpriteScaleUpdatesFor(state: EngineMockState, instanceId: string): string[] {
  return state.spriteScaleUpdates.filter((scale) => scale.startsWith(`${instanceId}:`));
}

function listPlayedSpriteAnimationsFor(state: EngineMockState, instanceId: string): string[] {
  return state.playedSpriteAnimations.filter((animation) => animation.startsWith(`${instanceId}:`));
}

function countPlayedSpriteAnimation(
  state: EngineMockState,
  instanceId: string,
  animationId: string,
): number {
  return listPlayedSpriteAnimationsFor(state, instanceId).filter(
    (animation) => animation === `${instanceId}:${animationId}`,
  ).length;
}

function findLatestSpriteSnapshot(
  state: EngineMockState,
  instanceId: string,
): RoccoSpriteInstance | undefined {
  return state.createdSpriteSnapshots.findLast((sprite) => sprite.id === instanceId);
}

function makeActionActivation(
  targetInstanceId: string,
  actionId: string,
  definitionId = `test-${targetInstanceId}-${actionId}`,
): RoccoActionMenuActivation {
  return {
    definitionId,
    targetInstanceId,
    targetDefinitionId: '',
    itemId: actionId,
    actionId,
  };
}

function createInventoryWithKeys(): RoccoInventory {
  const inventory = new RoccoInventory();
  inventory.addItem(createRoccoKeysInventoryItem(createRoccoLocalization()));
  return inventory;
}

function setCarriedInventoryItem(state: EngineMockState, itemId: string): void {
  state.carriedGridMenuItem = {
    definitionId: ROCCO_INVENTORY_MENU_ID,
    item: {
      id: itemId,
      label: itemId,
    },
  };
}

function makeSceneClickActivation(
  sceneX: number,
  sceneY: number,
  targetInstanceId?: string,
  targetDefinitionId?: string,
): Extract<RoccoCartridgeAction, { kind: 'scene-click' }> {
  return {
    kind: 'scene-click',
    sceneX,
    sceneY,
    targetInstanceId,
    targetDefinitionId,
  };
}

function setPlayerGroundPoint(state: EngineMockState, x: number): void {
  const rocco = findLatestSpriteSnapshot(state, DEFAULT_SPRITE_INSTANCE_ID);
  if (!rocco) {
    throw new Error('Expected Rocco sprite to exist.');
  }

  rocco.transform.x = x - DEFAULT_SPRITE_GROUND_ANCHOR_X * rocco.transform.scaleX;
  rocco.transform.y = DEFAULT_SPRITE_Y_VALUES[0] ?? 180;
}

async function flushAsyncTransition(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function dropBaitBucket(manager: RoccoPierLevelManager, state: EngineMockState): void {
  manager.handleAction(makeActionActivation(DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID, 'kick'));
  state.isSpriteMovingValue = false;
  manager.update(16);
  manager.update(520);
}

function startPelikanFeeding(manager: RoccoPierLevelManager, state: EngineMockState): void {
  dropBaitBucket(manager, state);
  manager.handleAction(makeActionActivation(DEFAULT_PELIKAN_SPRITE_INSTANCE_ID, 'talk'));
  manager.update(DEFAULT_PELIKAN_TURN_DURATION_MS);
  manager.update(DEFAULT_PELIKAN_FLIGHT_DURATION_MS);
}

async function transitionFromMiddleToEndAndBack(
  manager: RoccoPierLevelManager,
  state: EngineMockState,
): Promise<void> {
  setPlayerGroundPoint(state, 0);
  manager.update(16);
  await flushAsyncTransition();
  setPlayerGroundPoint(state, DEFAULT_DESIGN_WIDTH);
  manager.update(500);
  await flushAsyncTransition();
}

async function transitionFromMiddleToStartAndBack(
  manager: RoccoPierLevelManager,
  state: EngineMockState,
): Promise<void> {
  setPlayerGroundPoint(state, DEFAULT_DESIGN_WIDTH);
  manager.update(16);
  await flushAsyncTransition();
  setPlayerGroundPoint(state, 0);
  manager.update(500);
  await flushAsyncTransition();
}

interface EngineMockState {
  restoredRecord: RoccoPlaneSceneRecord | null;
  loadedScene: RoccoPlaneScene | null;
  savedScenes: RoccoPlaneScene[];
  preloadedPlaneSceneIds: string[];
  addedEffectIds: string[];
  removedEffectIds: string[];
  registeredSoundIds: string[];
  unregisteredSoundIds: string[];
  preloadedSoundIds: string[];
  playedSoundIds: string[];
  stoppedSoundIds: string[];
  preloadedSpriteDefinitionIds: string[];
  loadedSpriteDefinitionIds: string[];
  registeredWalkMapIds: string[];
  walkMapBindings: string[];
  playerSpriteId: string | null;
  removedSpriteIds: string[];
  createdSprites: string[];
  createdSpriteSnapshots: RoccoSpriteInstance[];
  spritePositions: string[];
  spriteScaleUpdates: string[];
  spriteFlipUpdates: string[];
  spritePresentationUpdates: string[];
  spriteRenderLayerUpdates: string[];
  spriteZIndexUpdates: string[];
  spriteDepthModeUpdates: string[];
  movedSprites: string[];
  movedSpriteActions: string[];
  goToSprites: string[];
  goToSpriteTargets: string[];
  playedSpriteActions: string[];
  playedSpriteActionDirections: string[];
  playedSpriteAnimations: string[];
  spriteMessages: string[];
  spriteVelocityUpdates: string[];
  registeredActionMenus: string[];
  registeredActionMenuDefinitions: RoccoActionMenuDefinition[];
  unregisteredActionMenus: string[];
  openedGridMenuDefinitions: RoccoGridMenuDefinition[];
  toggledGridMenuDefinitions: RoccoGridMenuDefinition[];
  closedGridMenuCount: number;
  carriedGridMenuItem: RoccoGridMenuCarriedItem | undefined;
  clearedCarriedGridMenuCount: number;
  addedPrimitives: string[];
  removedPrimitives: string[];
  addedTitles: string[];
  removedTitles: string[];
  displayProfileCalls: number;
  statusMessages: string[];
  isSpriteMovingValue: boolean;
  inputEnabled: boolean;
  spriteSnapshot: RoccoSpriteInstance | undefined;
}

function createEngineMock(state: EngineMockState): RoccoEngine {
  return {
    // Video subsystem
    video: {
      sprites: {
        async preloadDefinitionAssets(definition: RoccoSpriteDefinition) {
          state.preloadedSpriteDefinitionIds.push(definition.id);
        },
        registerWalkMap(walkMap: RoccoSpriteWalkMap) {
          state.registeredWalkMapIds.push(walkMap.id);
        },
        unregisterWalkMap() {
          // noop
        },
        getWalkMap() {
          return undefined;
        },
        listWalkMaps() {
          return [];
        },
        registerSpriteDefinition() {
          // noop
        },
        unregisterSpriteDefinition() {
          // noop
        },
        getSpriteDefinition() {
          return undefined;
        },
        listSpriteDefinitions() {
          return [];
        },
        loadSpriteDefinition(definition: RoccoSpriteDefinition) {
          state.loadedSpriteDefinitionIds.push(definition.id);
        },
        loadSpriteDefinitions(definitions: RoccoSpriteDefinition[]) {
          for (const definition of definitions) {
            state.loadedSpriteDefinitionIds.push(definition.id);
          }
        },
        createSprite() {
          // noop
        },
        createSpriteFromDefinition(definitionId: string, options?: Partial<RoccoSpriteInstance>) {
          const id = options?.id ?? `sprite:${definitionId}`;
          state.createdSprites.push(id);
          const created: RoccoSpriteInstance = {
            id,
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
              animationId: 'stand-left',
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
          };
          state.createdSpriteSnapshots.push(created);
          state.spriteSnapshot = created;
          return created;
        },
        removeSprite(instanceId: string) {
          state.removedSpriteIds.push(instanceId);
        },
        getSprite(instanceId: string) {
          return findLatestSpriteSnapshot(state, instanceId);
        },
        listSprites() {
          return [];
        },
        playAnimation(instanceId: string, animationId: string) {
          state.playedSpriteAnimations.push(`${instanceId}:${animationId}`);
        },
        playAction(instanceId: string, actionId: string, options?: { direction?: string }) {
          state.playedSpriteActions.push(`${instanceId}:${actionId}`);
          if (options?.direction) {
            state.playedSpriteActionDirections.push(`${instanceId}:${actionId}:${options.direction}`);
          }
        },
        stopAnimation() {
          // noop
        },
        setAnimationFrame() {
          // noop
        },
        setPlaybackRate() {
          // noop
        },
        bindAnimationToMotion() {
          // noop
        },
        setPosition(instanceId: string, x: number, y: number) {
          state.spritePositions.push(`${instanceId}:${x},${y}`);
          const sprite = findLatestSpriteSnapshot(state, instanceId);
          if (sprite) {
            sprite.transform.x = x;
            sprite.transform.y = y;
          }
        },
        setScale(instanceId: string, scaleX: number, scaleY: number) {
          state.spriteScaleUpdates.push(`${instanceId}:${scaleX},${scaleY}`);
          const sprite = findLatestSpriteSnapshot(state, instanceId);
          if (sprite) {
            sprite.transform.scaleX = scaleX;
            sprite.transform.scaleY = scaleY;
          }
        },
        setFlip(instanceId: string, flipX: boolean, flipY: boolean) {
          state.spriteFlipUpdates.push(`${instanceId}:${flipX},${flipY}`);
          const sprite = findLatestSpriteSnapshot(state, instanceId);
          if (sprite) {
            sprite.transform.flipX = flipX;
            sprite.transform.flipY = flipY;
          }
        },
        setPresentationTransform(
          instanceId: string,
          transform: Partial<RoccoSpritePresentationTransform>,
        ) {
          state.spritePresentationUpdates.push(`${instanceId}:${JSON.stringify(transform)}`);
          const sprite = findLatestSpriteSnapshot(state, instanceId);
          if (sprite) {
            sprite.transform.presentation = {
              ...sprite.transform.presentation,
              ...transform,
            };
          }
        },
        translate() {
          // noop
        },
        setVelocity(instanceId: string, velocityX: number, velocityY: number) {
          state.spriteVelocityUpdates.push(`${instanceId}:${velocityX},${velocityY}`);
        },
        setAcceleration() {
          // noop
        },
        stopMovement() {
          // noop
        },
        moveTo(instanceId: string, x: number, y: number, options?: RoccoMoveOptions) {
          state.movedSprites.push(`${instanceId}:${x},${y}`);
          state.isSpriteMovingValue = true;
          if (options?.action) {
            state.movedSpriteActions.push(options.action);
          }
        },
        goTo(instanceId: string, x: number, y: number, options?: RoccoSpriteGoToOptions) {
          state.goToSprites.push(`${instanceId}:${x},${y}`);
          if (options?.targetInstanceId) {
            state.goToSpriteTargets.push(`${instanceId}:${options.targetInstanceId}`);
          }
        },
        moveBy() {
          // noop
        },
        followPath() {
          // noop
        },
        cancelMovement() {
          // noop
        },
        isMoving() {
          return state.isSpriteMovingValue;
        },
        setFacing() {
          // noop
        },
        setRenderLayer(instanceId: string, renderLayer: string) {
          state.spriteRenderLayerUpdates.push(`${instanceId}:${renderLayer}`);
          const sprite = findLatestSpriteSnapshot(state, instanceId);
          if (sprite) {
            sprite.renderLayer = renderLayer;
          }
        },
        setZIndex(instanceId: string, zIndex: number) {
          state.spriteZIndexUpdates.push(`${instanceId}:${zIndex}`);
          const sprite = findLatestSpriteSnapshot(state, instanceId);
          if (sprite) {
            sprite.zIndex = zIndex;
          }
        },
        setDepthMode(instanceId: string, depthMode: RoccoDepthMode) {
          state.spriteDepthModeUpdates.push(`${instanceId}:${depthMode}`);
          const sprite = findLatestSpriteSnapshot(state, instanceId);
          if (sprite) {
            sprite.depthMode = depthMode;
          }
        },
        setInteractive() {
          // noop
        },
        setCollisionEnabled() {
          // noop
        },
        bindToWalkMap(instanceId: string, binding: RoccoSpriteNavigationBinding) {
          state.walkMapBindings.push(`${instanceId}:${binding.walkMapId}`);
          const sprite = findLatestSpriteSnapshot(state, instanceId);
          if (sprite) {
            sprite.navigation = binding;
          }
        },
        clearWalkMapBinding(instanceId: string) {
          state.walkMapBindings.push(`${instanceId}:clear`);
          const sprite = findLatestSpriteSnapshot(state, instanceId);
          if (sprite) {
            sprite.navigation = undefined;
          }
        },
        hitTest() {
          return [];
        },
        hitTestVisiblePixel() {
          return [];
        },
        queryCollisions() {
          return [];
        },
        update() {
          // noop
        },
        listRenderableSprites() {
          return [];
        },
      } as any,
      messages: {
        showMessage(message: RoccoSpriteMessageRequest) {
          state.spriteMessages.push(`${message.spriteInstanceId}:${message.mode}:${message.text}`);
        },
        say(instanceId: string, text: string) {
          state.spriteMessages.push(`${instanceId}:say:${text}`);
        },
        think(instanceId: string, text: string) {
          state.spriteMessages.push(`${instanceId}:think:${text}`);
        },
        clearMessages() {
          state.spriteMessages.length = 0;
        },
      } as any,
      actionMenus: {
        registerMenu(definition: RoccoActionMenuDefinition) {
          state.registeredActionMenus.push(definition.id);
          state.registeredActionMenuDefinitions.push(definition);
        },
        unregisterMenu(definitionId: string) {
          state.unregisteredActionMenus.push(definitionId);
        },
        listMenus() {
          return [];
        },
        openMenuForTarget() {
          return false;
        },
        closeMenu() {
          // noop
        },
        isOpen() {
          return false;
        },
        setHoverAt() {
          return false;
        },
        getHoveredItem() {
          return undefined;
        },
        activateAt() {
          return undefined;
        },
        getRenderableMenu() {
          return undefined;
        },
        update() {
          // noop
        },
      } as any,
      gridMenus: {
        openMenu(definition: RoccoGridMenuDefinition) {
          state.openedGridMenuDefinitions.push(definition);
        },
        toggleMenu(definition: RoccoGridMenuDefinition) {
          state.toggledGridMenuDefinitions.push(definition);
        },
        closeMenu() {
          state.closedGridMenuCount += 1;
        },
        isOpen() {
          return false;
        },
        setHoverAt() {
          return false;
        },
        getHoveredItem() {
          return undefined;
        },
        activateAt() {
          return undefined;
        },
        getCarriedItem() {
          return state.carriedGridMenuItem;
        },
        clearCarriedItem() {
          state.carriedGridMenuItem = undefined;
          state.clearedCarriedGridMenuCount += 1;
        },
        getRenderableMenu() {
          return undefined;
        },
      } as any,
      primitives: {
        addPrimitive(primitive: RoccoPrimitive) {
          state.addedPrimitives.push(`${primitive.id}:${primitive.alpha}`);
        },
        removePrimitive(primitiveId: string) {
          state.removedPrimitives.push(primitiveId);
        },
        listPrimitives() {
          return [];
        },
      } as any,
      titles: {
        addTitle(message: RoccoTitleMessage) {
          state.addedTitles.push(`${message.id}:${message.text}`);
        },
        removeTitle(titleId: string) {
          state.removedTitles.push(titleId);
        },
        listTitles() {
          return [];
        },
        update() {
          // noop
        },
      } as any,
      display: {
        setProfile(profile: Partial<RoccoDisplayProfile>) {
          if (profile.crtMask && profile.roundedCorners && profile.edgeVignette) {
            state.displayProfileCalls += 1;
          }
        },
        getProfile() {
          return {};
        },
      } as any,
      planes: {
        loadScene(scene: RoccoPlaneScene) {
          state.loadedScene = scene;
        },
        serializeScene() {
          if (!state.loadedScene) {
            throw new Error('No loaded scene in mock state');
          }
          return state.loadedScene;
        },
        updatePlane() {
          // noop
        },
        resolvePlane() {
          return undefined;
        },
      } as any,
      async preloadPlaneScene(scene: RoccoPlaneScene) {
        state.preloadedPlaneSceneIds.push(scene.id);
      },
      async preloadSpriteDefinition(definition: RoccoSpriteDefinition) {
        state.preloadedSpriteDefinitionIds.push(definition.id);
      },
      async preloadSpriteDefinitions(definitions: RoccoSpriteDefinition[]) {
        for (const definition of definitions) {
          state.preloadedSpriteDefinitionIds.push(definition.id);
        }
      },
      render() {
        // noop
      },
      update() {
        // noop
      },
    } as any,

    // Audio subsystem
    audio: {
      registerSound(definition: RoccoSoundDefinition) {
        state.registeredSoundIds.push(definition.id);
      },
      unregisterSound(soundId: string) {
        state.unregisteredSoundIds.push(soundId);
      },
      async preloadSound(soundId: string) {
        state.preloadedSoundIds.push(soundId);
      },
      playSound(soundId: string) {
        state.playedSoundIds.push(soundId);
      },
      stopSound(soundId: string) {
        state.stoppedSoundIds.push(soundId);
      },
      stopAllSounds() {
        // noop
      },
      unlock() {
        // noop
      },
      destroy() {
        // noop
      },
    } as any,

    // Effects subsystem
    effects: {
      add(effect: RoccoEffect) {
        state.addedEffectIds.push(effect.id);
      },
      remove(effectId: string) {
        state.removedEffectIds.push(effectId);
      },
      enable() {
        // noop
      },
      disable() {
        // noop
      },
      update() {
        // noop
      },
      tick() {
        // noop
      },
      list() {
        return [];
      },
    } as any,

    // Persistence subsystem
    persistence: {
      async loadPlaneSceneRecord() {
        return state.restoredRecord;
      },
      async savePlaneScene(scene: RoccoPlaneScene) {
        state.savedScenes.push(scene);
      },
    } as any,

    // Scene management
    loadPlaneScene(scene: RoccoPlaneScene) {
      state.loadedScene = scene;
    },
    serializePlaneScene() {
      if (!state.loadedScene) {
        throw new Error('No loaded scene in mock state');
      }
      return state.loadedScene;
    },

    // Player state
    setPlayerSprite(instanceId: string) {
      state.playerSpriteId = instanceId;
    },
    getPlayerSprite() {
      return state.playerSpriteId;
    },

    // Input control
    setInputEnabled(enabled: boolean) {
      state.inputEnabled = enabled;
      state.isSpriteMovingValue = !enabled; // block movement when input disabled
    },
    isInputEnabled() {
      return state.inputEnabled;
    },

    // Logging and status
    setStatus(status: string) {
      state.statusMessages.push(status);
    },
    log() {
      // noop
    },

    // Composition
    beginComposition() {
      // noop
    },
    endComposition() {
      // noop
    },

    // Jukebox
    jukebox: {
      registerPlaylist() {
        // noop
      },
      unregisterPlaylist() {
        // noop
      },
      async playPlaylist() {
        // noop
      },
      stopPlaylist() {
        // noop
      },
      isPlaying() {
        return false;
      },
      setVolume() {
        // noop
      },
      getCurrentTrack() {
        return undefined;
      },
      unlock() {
        // noop
      },
    } as any,
  };
}

function makeEngineState(overrides?: Partial<EngineMockState>): EngineMockState {
  return {
    restoredRecord: null,
    loadedScene: null,
    savedScenes: [],
    preloadedPlaneSceneIds: [],
    addedEffectIds: [],
    removedEffectIds: [],
    registeredSoundIds: [],
    unregisteredSoundIds: [],
    preloadedSoundIds: [],
    playedSoundIds: [],
    stoppedSoundIds: [],
    preloadedSpriteDefinitionIds: [],
    loadedSpriteDefinitionIds: [],
    registeredWalkMapIds: [],
    walkMapBindings: [],
    playerSpriteId: null,
    removedSpriteIds: [],
    createdSprites: [],
    createdSpriteSnapshots: [],
    spritePositions: [],
    spriteScaleUpdates: [],
    spriteFlipUpdates: [],
    spritePresentationUpdates: [],
    spriteRenderLayerUpdates: [],
    spriteZIndexUpdates: [],
    spriteDepthModeUpdates: [],
    movedSprites: [],
    movedSpriteActions: [],
    goToSprites: [],
    goToSpriteTargets: [],
    playedSpriteActions: [],
    playedSpriteActionDirections: [],
    playedSpriteAnimations: [],
    spriteMessages: [],
    spriteVelocityUpdates: [],
    registeredActionMenus: [],
    registeredActionMenuDefinitions: [],
    unregisteredActionMenus: [],
    openedGridMenuDefinitions: [],
    toggledGridMenuDefinitions: [],
    closedGridMenuCount: 0,
    carriedGridMenuItem: undefined,
    clearedCarriedGridMenuCount: 0,
    addedPrimitives: [],
    removedPrimitives: [],
    addedTitles: [],
    removedTitles: [],
    displayProfileCalls: 0,
    statusMessages: [],
    isSpriteMovingValue: false,
    inputEnabled: true,
    spriteSnapshot: undefined,
    ...overrides,
  };
}

describe('RoccoDefaultCartridge', () => {
  it('exposes a valid manifest', () => {
    const cartridge = new RoccoDefaultCartridge();
    expect(cartridge.manifest.id).toBe('rocco-default');
    expect(cartridge.manifest.title).toBe('ROCCO');
    expect(cartridge.manifest.version.length).toBeGreaterThan(0);
  });

  it('creates the green-black Pier scene and starts Rocco when no saved scene exists', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = new RoccoDefaultCartridge();

    await cartridge.mount({ engine });

    expect(state.loadedScene?.id).toBe(DEFAULT_SCENE_ID);
    expect(state.preloadedPlaneSceneIds).toEqual([DEFAULT_SCENE_ID]);
    expect(state.savedScenes).toHaveLength(1);
    expect(state.loadedScene?.clearColor).toBe(DEFAULT_ROCCO_GREEN_BLACK);
    expect(state.loadedScene?.planes[0]?.source).toEqual({
      kind: 'solid',
      color: DEFAULT_ROCCO_GREEN_BLACK,
    });
    expect(state.loadedScene?.planes.map((plane) => plane.id)).toEqual([
      'rocco-green-black-backplate',
      'rocco-background-back-underlay',
      'rocco-background-back',
      'rocco-background-front',
    ]);
    expect(state.loadedScene?.planes[1]?.source).toEqual({
      kind: 'image',
      uri: pierBackgroundAssetUrls.back,
    });
    expect(state.loadedScene?.planes[1]?.scroll).toEqual(DEFAULT_CENTERED_BACKGROUND_SCROLL);
    expect(state.loadedScene?.planes[1]?.renderLayer).toBe('background.main');
    expect(state.loadedScene?.planes[2]?.source).toEqual({
      kind: 'image',
      uri: pierBackgroundAssetUrls.back,
    });
    expect(state.loadedScene?.planes[2]?.scroll).toEqual(DEFAULT_CENTERED_BACKGROUND_SCROLL);
    expect(state.loadedScene?.planes[2]?.renderLayer).toBe('background.main');
    expect(state.loadedScene?.planes[2]?.metadata?.waterColorEffect).toMatchObject({
      enabled: true,
      colors: [...DEFAULT_WATER_EFFECT_COLORS],
      tolerance: DEFAULT_WATER_EFFECT_TOLERANCE,
    });
    expect(state.loadedScene?.planes[3]?.source).toEqual({
      kind: 'image',
      uri: pierBackgroundAssetUrls.front,
    });
    expect(state.loadedScene?.planes[3]?.scroll).toEqual(DEFAULT_CENTERED_BACKGROUND_SCROLL);
    expect(state.loadedScene?.planes[3]?.renderLayer).toBe('world.front');
    expect(state.addedEffectIds).toEqual([]);
    expect(state.removedEffectIds).toEqual([]);
    expect(state.registeredWalkMapIds).toContain(DEFAULT_WALK_MAP_ID);
    expect(state.preloadedSpriteDefinitionIds).toContain(DEFAULT_SPRITE_DEFINITION_ID);
    expect(state.loadedSpriteDefinitionIds).toContain(DEFAULT_SPRITE_DEFINITION_ID);
    expect(state.removedSpriteIds).toContain(DEFAULT_SPRITE_INSTANCE_ID);
    expect(state.preloadedSpriteDefinitionIds).toContain(DEFAULT_CLOUD_SPRITE_DEFINITION_ID);
    expect(state.loadedSpriteDefinitionIds).toContain(DEFAULT_CLOUD_SPRITE_DEFINITION_ID);
    expect(state.removedSpriteIds).toContain(DEFAULT_CLOUD_SPRITE_INSTANCE_ID);
    expect(state.createdSprites).toContain(DEFAULT_CLOUD_SPRITE_INSTANCE_ID);
    expect(state.preloadedSpriteDefinitionIds).toContain(DEFAULT_BAIT_BUCKET_SPRITE_DEFINITION_ID);
    expect(state.loadedSpriteDefinitionIds).toContain(DEFAULT_BAIT_BUCKET_SPRITE_DEFINITION_ID);
    expect(state.removedSpriteIds).toContain(DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID);
    expect(state.createdSprites).toContain(DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID);
    expect(state.preloadedSpriteDefinitionIds).toContain(DEFAULT_PELIKAN_SPRITE_DEFINITION_ID);
    expect(state.loadedSpriteDefinitionIds).toContain(DEFAULT_PELIKAN_SPRITE_DEFINITION_ID);
    expect(state.removedSpriteIds).toContain(DEFAULT_PELIKAN_SPRITE_INSTANCE_ID);
    expect(state.createdSprites).toContain(DEFAULT_PELIKAN_SPRITE_INSTANCE_ID);
    expect(state.createdSprites).toContain(DEFAULT_SPRITE_INSTANCE_ID);
    expect(state.walkMapBindings).toContain(`${DEFAULT_SPRITE_INSTANCE_ID}:${DEFAULT_WALK_MAP_ID}`);
    expect(state.playerSpriteId).toBe(DEFAULT_SPRITE_INSTANCE_ID);
    expect(state.unregisteredActionMenus).toContain(DEFAULT_ACTION_MENU_ID);
    expect(state.registeredActionMenus).toContain(DEFAULT_ACTION_MENU_ID);
    expect(state.registeredActionMenus).toContain(ROCCO_PLAYER_ACTION_MENU_ID);
    expect(listSpritePositionsFor(state, DEFAULT_CLOUD_SPRITE_INSTANCE_ID)[0]).toBe(
      `${DEFAULT_CLOUD_SPRITE_INSTANCE_ID}:${DEFAULT_CLOUD_START_X},${DEFAULT_CLOUD_BASE_Y}`,
    );
    expect(listSpritePositionsFor(state, DEFAULT_SPRITE_INSTANCE_ID)[0]).toBe(
      `${DEFAULT_SPRITE_INSTANCE_ID}:${DEFAULT_SPRITE_START_X},${DEFAULT_SPRITE_Y_VALUES[0]}`,
    );
    expect(state.movedSprites[0]).toBe(
      `${DEFAULT_SPRITE_INSTANCE_ID}:${DEFAULT_SPRITE_PAUSE_X},${DEFAULT_SPRITE_Y_VALUES[0]}`,
    );
    expect(state.movedSpriteActions).toEqual([DEFAULT_SPRITE_RUN_ACTION_ID]);
    expect(listPlayedSpriteAnimationsFor(state, DEFAULT_SPRITE_INSTANCE_ID)).toEqual([]);
    expect(state.inputEnabled).toBe(true);
    expect(state.displayProfileCalls).toBe(1);
    expect(state.statusMessages[0]?.includes(cartridge.manifest.title)).toBe(true);
  });

  it('mounts Rocco with Spanish localized status and action labels', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = new RoccoDefaultCartridge();

    await cartridge.mount({ engine, locale: 'es' });

    expect(state.statusMessages[0]).toContain('Nivel: Medio del muelle');
    const pelikanMenu = state.registeredActionMenuDefinitions.find(
      (definition) => definition.id === DEFAULT_ACTION_MENU_ID,
    );
    expect(pelikanMenu?.items.map((item) => item.label)).toEqual([
      'Mirar',
      'Hablar',
      'Coger',
      'Patear',
    ]);
    const roccoMenu = state.registeredActionMenuDefinitions.find(
      (definition) => definition.id === ROCCO_PLAYER_ACTION_MENU_ID,
    );
    expect(roccoMenu?.items.map((item) => item.label)).toEqual(['Hablar', 'Inventario']);
  });

  it('places Pelikan on the pier mooring post', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = new RoccoDefaultCartridge();

    await cartridge.mount({ engine });

    expect(state.preloadedSpriteDefinitionIds).toContain(DEFAULT_PELIKAN_SPRITE_DEFINITION_ID);
    expect(state.loadedSpriteDefinitionIds).toContain(DEFAULT_PELIKAN_SPRITE_DEFINITION_ID);
    expect(state.removedSpriteIds).toContain(DEFAULT_PELIKAN_SPRITE_INSTANCE_ID);
    expect(state.createdSprites).toContain(DEFAULT_PELIKAN_SPRITE_INSTANCE_ID);

    const pelikan = state.createdSpriteSnapshots.find(
      (sprite) => sprite.id === DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
    );
    expect(pelikan?.transform).toMatchObject({
      x: DEFAULT_PELIKAN_PERCH_X,
      y: DEFAULT_PELIKAN_PERCH_Y,
      scaleX: DEFAULT_PELIKAN_SPRITE_SCALE,
      scaleY: DEFAULT_PELIKAN_SPRITE_SCALE,
    });
    expect(pelikan?.renderLayer).toBe(DEFAULT_PELIKAN_RENDER_LAYER);
    expect(pelikan?.interactive).toBe(true);
  });

  it('places the bait bucket on the back-left pier area', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = new RoccoDefaultCartridge();

    await cartridge.mount({ engine });

    expect(state.preloadedSpriteDefinitionIds).toContain(DEFAULT_BAIT_BUCKET_SPRITE_DEFINITION_ID);
    expect(state.loadedSpriteDefinitionIds).toContain(DEFAULT_BAIT_BUCKET_SPRITE_DEFINITION_ID);
    expect(state.removedSpriteIds).toContain(DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID);
    expect(state.createdSprites).toContain(DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID);

    const baitBucket = state.createdSpriteSnapshots.find(
      (sprite) => sprite.id === DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID,
    );
    expect(baitBucket?.transform).toMatchObject({
      x: DEFAULT_BAIT_BUCKET_X,
      y: DEFAULT_BAIT_BUCKET_Y,
      scaleX: DEFAULT_BAIT_BUCKET_SCALE,
      scaleY: DEFAULT_BAIT_BUCKET_SCALE,
    });
    expect(baitBucket?.renderLayer).toBe(DEFAULT_BAIT_BUCKET_RENDER_LAYER);
    expect(baitBucket?.depthMode).toBe('baseline-sort');
    expect(baitBucket?.interactive).toBe(true);
  });

  it('refreshes an old saved Pier Middle scene with the current default visual planes', async () => {
    const restoredScene: RoccoPlaneScene = {
      id: DEFAULT_SCENE_ID,
      clearColor: DEFAULT_ROCCO_GREEN_BLACK,
      planes: [],
    };
    const state = makeEngineState({
      restoredRecord: {
        id: restoredScene.id,
        scene: restoredScene,
        updatedAt: 1,
      },
    });
    const engine = createEngineMock(state);
    const cartridge = new RoccoDefaultCartridge();

    await cartridge.mount({ engine });

    expect(state.loadedScene?.planes.map((plane) => plane.id)).toEqual([
      'rocco-green-black-backplate',
      'rocco-background-back-underlay',
      'rocco-background-back',
      'rocco-background-front',
    ]);
    expect(state.loadedScene?.planes[1]?.source).toEqual({
      kind: 'image',
      uri: pierBackgroundAssetUrls.back,
    });
    expect(state.loadedScene?.planes[1]?.scroll).toEqual(DEFAULT_CENTERED_BACKGROUND_SCROLL);
    expect(state.loadedScene?.planes[2]?.source).toEqual({
      kind: 'image',
      uri: pierBackgroundAssetUrls.back,
    });
    expect(state.loadedScene?.planes[2]?.scroll).toEqual(DEFAULT_CENTERED_BACKGROUND_SCROLL);
    expect(state.loadedScene?.planes[2]?.metadata?.waterColorEffect).toMatchObject({
      enabled: true,
      colors: [...DEFAULT_WATER_EFFECT_COLORS],
      tolerance: DEFAULT_WATER_EFFECT_TOLERANCE,
    });
    expect(state.loadedScene?.planes[3]?.source).toEqual({
      kind: 'image',
      uri: pierBackgroundAssetUrls.front,
    });
    expect(state.loadedScene?.planes[3]?.scroll).toEqual(DEFAULT_CENTERED_BACKGROUND_SCROLL);
    expect(state.savedScenes).toHaveLength(1);
    expect(state.savedScenes[0]).toBe(state.loadedScene);
  });

  it('restores a current saved Pier Middle scene without refreshing it', async () => {
    const firstState = makeEngineState();
    const firstEngine = createEngineMock(firstState);
    const firstCartridge = new RoccoDefaultCartridge();
    await firstCartridge.mount({ engine: firstEngine });
    const restoredScene = firstState.savedScenes[0];
    if (!restoredScene) {
      throw new Error('Expected the first mount to create a saved scene');
    }
    const state = makeEngineState({
      restoredRecord: {
        id: restoredScene.id,
        scene: restoredScene,
        updatedAt: 1,
      },
    });
    const engine = createEngineMock(state);
    const cartridge = new RoccoDefaultCartridge();

    await cartridge.mount({ engine });

    expect(state.loadedScene).toBe(restoredScene);
    expect(state.savedScenes).toHaveLength(0);
  });

  it('binds Rocco to the walking path and enters toward the middle of the screen', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = new RoccoDefaultCartridge();

    await cartridge.mount({ engine });

    expect(state.registeredWalkMapIds).toContain(DEFAULT_WALK_MAP_ID);
    expect(state.walkMapBindings).toContain(`${DEFAULT_SPRITE_INSTANCE_ID}:${DEFAULT_WALK_MAP_ID}`);
    expect(state.playerSpriteId).toBe(DEFAULT_SPRITE_INSTANCE_ID);
    expect(state.movedSprites).toEqual([
      `${DEFAULT_SPRITE_INSTANCE_ID}:${DEFAULT_SPRITE_PAUSE_X},${DEFAULT_SPRITE_Y_VALUES[0]}`,
    ]);
    expect(state.movedSpriteActions).toEqual([DEFAULT_SPRITE_RUN_ACTION_ID]);
    const rocco = state.createdSpriteSnapshots.find(
      (sprite) => sprite.id === DEFAULT_SPRITE_INSTANCE_ID,
    );
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

  it('blocks Pier Middle exits before Rocco has the keys', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = new RoccoDefaultCartridge();

    await cartridge.mount({ engine });
    setPlayerGroundPoint(state, DEFAULT_DESIGN_WIDTH);
    cartridge.update(16);
    await flushAsyncTransition();

    expect(state.loadedScene?.id).toBe(DEFAULT_SCENE_ID);
    expect(state.spriteMessages).toEqual([]);
  });

  it('opens a 3x3 Rocco inventory grid from Rocco action menu', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = new RoccoPierLevelManager({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
    });

    await manager.mount(engine);
    manager.handleAction(
      makeActionActivation(
        DEFAULT_SPRITE_INSTANCE_ID,
        ROCCO_PLAYER_INVENTORY_ACTION_ID,
        ROCCO_PLAYER_ACTION_MENU_ID,
      ),
    );

    expect(state.toggledGridMenuDefinitions).toHaveLength(1);
    expect(state.toggledGridMenuDefinitions[0]).toMatchObject({
      id: ROCCO_INVENTORY_MENU_ID,
      title: 'Inventory',
      columns: 3,
      rows: 3,
      reorderable: true,
      items: [
        {
          id: ROCCO_INVENTORY_KEYS_ITEM_ID,
          label: 'Keys',
          slotIndex: 0,
        },
        {
          id: ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
          label: '€20',
          slotIndex: 1,
        },
      ],
    });
  });

  it('persists Rocco inventory slot order after grid placement', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const inventory = createInventoryWithKeys();
    const manager = new RoccoPierLevelManager({
      cartridgeTitle: 'ROCCO',
      inventory,
    });

    await manager.mount(engine);
    manager.handleAction({
      kind: 'grid-menu',
      definitionId: ROCCO_INVENTORY_MENU_ID,
      interaction: 'place',
      itemId: ROCCO_INVENTORY_KEYS_ITEM_ID,
      slotIndex: 4,
      toSlotIndex: 4,
      items: [
        {
          id: ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
          slotIndex: 0,
        },
        {
          id: ROCCO_INVENTORY_KEYS_ITEM_ID,
          slotIndex: 4,
        },
      ],
    });
    manager.handleAction(
      makeActionActivation(
        DEFAULT_SPRITE_INSTANCE_ID,
        ROCCO_PLAYER_INVENTORY_ACTION_ID,
        ROCCO_PLAYER_ACTION_MENU_ID,
      ),
    );

    const definition = state.toggledGridMenuDefinitions.at(-1);
    expect(definition?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
          slotIndex: 0,
        }),
        expect.objectContaining({
          id: ROCCO_INVENTORY_KEYS_ITEM_ID,
          slotIndex: 4,
        }),
      ]),
    );
  });

  it('responds when trying inventory items on unsupported Pier targets', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = new RoccoPierLevelManager({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
    });

    await manager.mount(engine);
    setCarriedInventoryItem(state, ROCCO_INVENTORY_KEYS_ITEM_ID);
    manager.handleAction(
      makeSceneClickActivation(
        320,
        240,
        DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID,
        DEFAULT_BAIT_BUCKET_SPRITE_DEFINITION_ID,
      ),
    );
    setCarriedInventoryItem(state, ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID);
    manager.handleAction(
      makeSceneClickActivation(
        320,
        240,
        DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
        DEFAULT_PELIKAN_SPRITE_DEFINITION_ID,
      ),
    );

    expect(state.spriteMessages.some((message) => message.includes('not locked'))).toBe(true);
    expect(state.spriteMessages.some((message) => message.includes('paying the Pelikan'))).toBe(true);
    expect(state.clearedCarriedGridMenuCount).toBe(2);
  });

  it('transitions from Pier Middle east to Pier Beginning after Rocco has the keys', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = new RoccoPierLevelManager({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
    });

    await manager.mount(engine);
    setPlayerGroundPoint(state, DEFAULT_DESIGN_WIDTH);
    manager.update(16);
    await flushAsyncTransition();

    expect(state.loadedScene?.id).toBe(PIER_START_SCENE_ID);
    expect(state.loadedScene?.planes[1]?.scroll.x).toBe(PIER_BACKGROUND_SCROLL_RIGHT_X);
    expect(findLatestSpriteSnapshot(state, DEFAULT_SPRITE_INSTANCE_ID)?.transform.x).toBe(
      PIER_PLAYER_LEFT_ENTRY_X,
    );
    expect(state.statusMessages.at(-1)).toContain('Pier Beginning');
  });

  it('transitions from Pier Middle west to Pier End after Rocco has the keys', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = new RoccoPierLevelManager({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
    });

    await manager.mount(engine);
    setPlayerGroundPoint(state, 0);
    manager.update(16);
    await flushAsyncTransition();

    expect(state.loadedScene?.id).toBe(PIER_END_SCENE_ID);
    expect(state.loadedScene?.planes[1]?.scroll.x).toBe(PIER_BACKGROUND_SCROLL_LEFT_X);
    expect(findLatestSpriteSnapshot(state, DEFAULT_SPRITE_INSTANCE_ID)?.transform.x).toBe(
      PIER_PLAYER_RIGHT_ENTRY_X,
    );
    expect(state.statusMessages.at(-1)).toContain('Pier End');
  });

  it('keeps the Pier Middle bait bucket dropped after visiting Pier End', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = new RoccoPierLevelManager({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
    });

    await manager.mount(engine);
    dropBaitBucket(manager, state);
    const droppedAnimationCount = countPlayedSpriteAnimation(
      state,
      DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID,
      DEFAULT_BAIT_BUCKET_DROPPED_ANIMATION_ID,
    );

    await transitionFromMiddleToEndAndBack(manager, state);

    expect(state.loadedScene?.id).toBe(DEFAULT_SCENE_ID);
    expect(
      countPlayedSpriteAnimation(
        state,
        DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID,
        DEFAULT_BAIT_BUCKET_DROPPED_ANIMATION_ID,
      ),
    ).toBeGreaterThan(droppedAnimationCount);
    expect(state.registeredActionMenus).toContain('rocco-bait-bucket-dropped-action-menu');
  });

  it('keeps Pier Middle feeding and revealed keys after visiting Pier Beginning', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = new RoccoPierLevelManager({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
    });

    await manager.mount(engine);
    startPelikanFeeding(manager, state);
    const feedingAnimationCount = countPlayedSpriteAnimation(
      state,
      DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
      DEFAULT_PELIKAN_FEEDING_ANIMATION_ID,
    );
    const keysCreationCount = state.createdSprites.filter(
      (id) => id === DEFAULT_KEYS_SPRITE_INSTANCE_ID,
    ).length;

    await transitionFromMiddleToStartAndBack(manager, state);

    expect(state.loadedScene?.id).toBe(DEFAULT_SCENE_ID);
    expect(
      countPlayedSpriteAnimation(
        state,
        DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
        DEFAULT_PELIKAN_FEEDING_ANIMATION_ID,
      ),
    ).toBeGreaterThan(feedingAnimationCount);
    expect(findLatestSpriteSnapshot(state, DEFAULT_PELIKAN_SPRITE_INSTANCE_ID)?.transform).toMatchObject(
      {
        x: DEFAULT_PELIKAN_FEEDING_X,
        y: DEFAULT_PELIKAN_FEEDING_Y,
      },
    );
    expect(
      state.createdSprites.filter((id) => id === DEFAULT_KEYS_SPRITE_INSTANCE_ID).length,
    ).toBeGreaterThan(keysCreationCount);
    expect(findLatestSpriteSnapshot(state, DEFAULT_KEYS_SPRITE_INSTANCE_ID)?.transform).toMatchObject(
      {
        x: DEFAULT_KEYS_X,
        y: DEFAULT_KEYS_Y,
      },
    );
    expect(state.registeredActionMenus).toContain(DEFAULT_FEEDING_LOOK_ACTION_MENU_ID);
  });

  it('plays the full Rocco intro thought and help line when uninterrupted', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = new RoccoDefaultCartridge();

    await cartridge.mount({ engine });
    state.isSpriteMovingValue = false;
    cartridge.update(16);
    cartridge.update(6400);
    cartridge.update(5400);

    expect(state.spriteMessages).toEqual([
      `${DEFAULT_SPRITE_INSTANCE_ID}:think:I think nothing is left for me, and it is deep enough here.`,
      `${DEFAULT_SPRITE_INSTANCE_ID}:say:Maybe you can help me.`,
    ]);
    expect(state.playedSpriteActionDirections).toContain(
      `${DEFAULT_SPRITE_INSTANCE_ID}:${DEFAULT_SPRITE_IDLE_ACTION_ID}:up`,
    );
    expect(state.playedSpriteActionDirections).toContain(
      `${DEFAULT_SPRITE_INSTANCE_ID}:${DEFAULT_SPRITE_IDLE_ACTION_ID}:down`,
    );
    expect(state.inputEnabled).toBe(true);
    expect(state.movedSprites).toEqual([
      `${DEFAULT_SPRITE_INSTANCE_ID}:${DEFAULT_SPRITE_PAUSE_X},${DEFAULT_SPRITE_Y_VALUES[0]}`,
    ]);
    expect(listPlayedSpriteAnimationsFor(state, DEFAULT_SPRITE_INSTANCE_ID)).toEqual([]);
  });

  it('cancels the Rocco intro sequence on scene click before any intro line plays', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = new RoccoDefaultCartridge();

    await cartridge.mount({ engine });
    cartridge.handleAction(makeSceneClickActivation(320, 240));
    state.isSpriteMovingValue = false;
    cartridge.update(16);
    cartridge.update(6400);
    cartridge.update(5400);

    expect(state.spriteMessages).toEqual([]);
    expect(state.playedSpriteActionDirections).toContain(
      `${DEFAULT_SPRITE_INSTANCE_ID}:${DEFAULT_SPRITE_IDLE_ACTION_ID}:down`,
    );
  });

  it('clears the intro thought line and does not continue after a scene click cancellation', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = new RoccoDefaultCartridge();

    await cartridge.mount({ engine });
    state.isSpriteMovingValue = false;
    cartridge.update(16);
    cartridge.handleAction(makeSceneClickActivation(320, 240));
    cartridge.update(6400);
    cartridge.update(5400);

    expect(state.spriteMessages).toEqual([]);
    expect(state.playedSpriteActionDirections).toContain(
      `${DEFAULT_SPRITE_INSTANCE_ID}:${DEFAULT_SPRITE_IDLE_ACTION_ID}:up`,
    );
    expect(state.playedSpriteActionDirections).toContain(
      `${DEFAULT_SPRITE_INSTANCE_ID}:${DEFAULT_SPRITE_IDLE_ACTION_ID}:down`,
    );
  });

  it('moves the default cloud with vertical drift', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = new RoccoDefaultCartridge();

    await cartridge.mount({ engine });
    cartridge.update(DEFAULT_CLOUD_VERTICAL_PERIOD_MS / 4);

    const expectedX =
      DEFAULT_CLOUD_START_X + DEFAULT_CLOUD_SPEED_X * (DEFAULT_CLOUD_VERTICAL_PERIOD_MS / 4 / 1000);
    const expectedY = DEFAULT_CLOUD_BASE_Y + DEFAULT_CLOUD_VERTICAL_AMPLITUDE;
    expect(listSpritePositionsFor(state, DEFAULT_CLOUD_SPRITE_INSTANCE_ID).at(-1)).toBe(
      `${DEFAULT_CLOUD_SPRITE_INSTANCE_ID}:${expectedX},${expectedY}`,
    );
    expect(DEFAULT_CLOUD_SPRITE_SCALE).toBe(0.5);
    expect(DEFAULT_CLOUD_SPRITE_OPACITY).toBe(0.9);
    expect(DEFAULT_CLOUD_SPEED_X).toBeGreaterThan(0);
  });

  it('grows the default cloud linearly as it approaches the right side', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = new RoccoDefaultCartridge();

    await cartridge.mount({ engine });
    const halfTravelMs =
      ((DEFAULT_CLOUD_WRAP_RIGHT_X - DEFAULT_CLOUD_START_X) / DEFAULT_CLOUD_SPEED_X / 2) * 1000;
    cartridge.update(halfTravelMs);

    const latestScale = listSpriteScaleUpdatesFor(state, DEFAULT_CLOUD_SPRITE_INSTANCE_ID).at(-1);
    const [, scalePair = ''] = latestScale?.split(':') ?? [];
    const [scaleX, scaleY] = scalePair.split(',').map(Number);
    const expectedScale = DEFAULT_CLOUD_SPRITE_SCALE * (1 + DEFAULT_CLOUD_SCALE_GROWTH_FACTOR / 2);
    expect(scaleX).toBeCloseTo(expectedScale, 5);
    expect(scaleY).toBeCloseTo(expectedScale, 5);
  });
});

describe('default cartridge helpers', () => {
  it('createDefaultSpriteDefinition keeps Rocco sprite content in the default cartridge', () => {
    const definition = createDefaultSpriteDefinition();
    const imageUris = definition.images.map((image) => image.uri);

    expect(definition.id).toBe(DEFAULT_SPRITE_DEFINITION_ID);
    expect(definition.defaultAnimation).toBe('stand-left');
    expect(definition.defaultIdleAction).toBe('idle');
    expect(definition.defaultMoveAction).toBe(DEFAULT_SPRITE_RUN_ACTION_ID);
    expect(imageUris).toContain(roccoDefaultRunLeftAssetUrls[0]);
    expect(imageUris).toContain(roccoDefaultRunLeftAssetUrls[1]);
    expect(imageUris).toContain(roccoDefaultRunRightAssetUrls[0]);
    expect(imageUris).toContain(roccoDefaultRunRightAssetUrls[1]);
    expect(imageUris).toContain(roccoDefaultStandingAssetUrls.down);
    expect(imageUris).toContain(roccoDefaultStandingAssetUrls['up-right']);
    expect(
      imageUris.some((uri) => uri?.includes('/cartridges/rocco-default/assets/') === true),
    ).toBe(false);
    expect(
      definition.animations[DEFAULT_SPRITE_STANDING_SEQUENCE_ANIMATION_ID]?.frames,
    ).toHaveLength(DEFAULT_SPRITE_STANDING_POSE_COUNT);
    expect(
      definition.animations[DEFAULT_SPRITE_STANDING_SEQUENCE_RIGHT_ANIMATION_ID]?.frames,
    ).toHaveLength(DEFAULT_SPRITE_STANDING_POSE_COUNT);
    expect(definition.actions?.[DEFAULT_SPRITE_RUN_ACTION_ID]?.speed).toBeGreaterThan(0);
    expect(definition.actions?.[DEFAULT_SPRITE_RUN_ACTION_ID]?.directionalAnimations?.left).toBe(
      'run-left',
    );
    expect(definition.actions?.[DEFAULT_SPRITE_RUN_ACTION_ID]?.directionalAnimations?.right).toBe(
      'run-right',
    );
    expect(definition.actions?.idle?.directionalAnimations?.down).toBe('stand-down');
    expect(definition.actions?.idle?.directionalAnimations?.['up-right']).toBe('stand-up-right');
    expect(definition.render?.renderLayer).toBe('world.actors');
    expect(definition.render?.depthMode).toBe('baseline-sort');
    expect(definition.visibleDescription?.text).toBe('Rocco');
    expect(defaultDisplayProfile.crtMask).toBe(true);
  });

  it('makeDefaultWaterColorEffect returns the demo water post-process configuration', () => {
    const effect = makeDefaultWaterColorEffect();

    expect(effect.enabled).toBe(true);
    expect(effect.colors).toEqual([...DEFAULT_WATER_EFFECT_COLORS]);
    expect(effect.tolerance).toBe(DEFAULT_WATER_EFFECT_TOLERANCE);
    expect(effect.amplitude).toBeGreaterThan(0);
    expect(effect.wavelength).toBeGreaterThan(0);
    expect(effect.strength).toBeGreaterThan(0);
  });

  it('localizes the default Pelikan action menu to Spanish', () => {
    const menu = createDefaultActionMenuDefinition(createRoccoLocalization('es'));

    expect(menu.items.map((item) => item.label)).toEqual([
      'Mirar',
      'Hablar',
      'Coger',
      'Patear',
    ]);
    expect(menu.items[0]?.result?.message.text).toContain(
      'Se planta como un sacerdote del mal tiempo.',
    );
  });
});
