import { describe, expect, it, vi } from 'vitest';

import type { RoccoCartridgeAction } from '../../../src/console/cartridges';
import type { ConsolePersistence } from '../../../src/console/console-kernel';
import { asRoccoTestSdk } from './test-sdk';
import type { CartridgeSdkV1Runtime } from '../../../src/console/cartridges/sdk-v1';
import type { RoccoAudioSystem } from '../../../src/console/audio';
import type { RoccoJukeboxSystem } from '../../../src/console/audio/jukebox';
import { CompositionServiceImpl } from '../../../src/console/composition/composition-service';
import type { RoccoEffect, RoccoEffectManager } from '../../../src/console/effects';
import type { RoccoActionMenuSystem } from '../../../src/console/video/action-menu';
import type {
  RoccoVideoDisplayModule,
  RoccoVideoPlaneModule,
  RoccoVideoSystem,
} from '../../../src/console/video';
import type {
  RoccoVideoZoomAnimationOptions,
  RoccoVideoZoomModule,
  RoccoVideoZoomTransform,
} from '../../../src/console/video/zoom';
import type { RoccoGridMenuSystem } from '../../../src/console/video/grid-menu';
import type {
  RoccoSpriteMessageSystem,
  RoccoSpriteMessageText,
} from '../../../src/console/video/messages';
import type { RoccoPlaneScene, RoccoPlaneSceneRecord } from '../../../src/console/video/planes';
import type { RoccoPrimitiveSystem } from '../../../src/console/video/primitives';
import type { RoccoRenderLayer } from '../../../src/console/video/render-layers';
import type {
  RoccoSpriteInstance,
  RoccoSpriteDefinition,
  RoccoSpriteSystem,
  RoccoSpriteWalkMap,
  RoccoMoveOptions,
  RoccoSpriteGoToOptions,
  RoccoSpriteNavigationBinding,
  RoccoSpritePresentationTransform,
  RoccoDepthMode,
} from '../../../src/console/video/sprites';
import type { RoccoTitleSystem } from '../../../src/console/video/titles';
import type { RoccoSpriteMessageRequest } from '../../../src/console/video/messages';
import type {
  RoccoActionMenuActivation,
  RoccoActionMenuDefinition,
} from '../../../src/console/video/action-menu';
import type {
  RoccoGridMenuCarriedItem,
  RoccoGridMenuDefinition,
} from '../../../src/console/video/grid-menu';
import type { RoccoPrimitive } from '../../../src/console/video/primitives';
import type { RoccoTitleMessage } from '../../../src/console/video/titles';
import type { RoccoDisplayProfile } from '../../../src/console/video/display';
import type { RoccoSoundDefinition } from '../../../src/console/audio/types';
import { defaultDisplayProfile } from '../../../src/console/video/display';
import {
  PIER_BACKGROUND_SCROLL_LEFT_X,
  PIER_BACKGROUND_SCROLL_RIGHT_X,
  PIER_BACKGROUND_IMAGE_WIDTH,
  PIER_BACKGROUND_IMAGE_HEIGHT,
  PIER_PLAYER_LEFT_ENTRY_X,
  PIER_PLAYER_RIGHT_ENTRY_X,
} from '../../../src/cartridges/rocco/games/rocco-default/maps/pier/pier-layout';
import { ROCCO_ACTIVE_WALK_MAP_ID } from '../../../src/cartridges/rocco/levels/rocco-level-runtime-ids';
import {
  ROCCO_DESIGN_WIDTH,
  ROCCO_DESIGN_HEIGHT,
  ROCCO_BACKGROUND_COLOR,
} from '../../../src/cartridges/rocco/games/rocco-default/game-design';
import { ROCCO_PLAYER_CONFIG } from '../../../src/cartridges/rocco/games/rocco-default/player';
import { PIER_PELIKAN_CONFIG } from '../../../src/cartridges/rocco/games/rocco-default/maps/pier/pier-pelikan-config';
import { PIER_KEYS_CONFIG } from '../../../src/cartridges/rocco/games/rocco-default/maps/pier/pier-keys-config';
import { PIER_BAIT_BUCKET_CONFIG } from '../../../src/cartridges/rocco/games/rocco-default/maps/pier/pier-bait-bucket-config';
import { PIER_STAN_CONFIG } from '../../../src/cartridges/rocco/games/rocco-default/maps/pier/pier-stan-config';
import { PIER_CLOUD_CONFIG } from '../../../src/cartridges/rocco/games/rocco-default/maps/pier/pier-cloud-config';
import {
  PIER_WATER_EFFECT_COLORS,
  PIER_WATER_EFFECT_TOLERANCE,
} from '../../../src/cartridges/rocco/games/rocco-default/maps/pier/pier-video-effects';
import {
  PIER_MIDDLE_SCENE_ID,
  PIER_START_SCENE_ID,
  PIER_END_SCENE_ID,
} from '../../../src/cartridges/rocco/games/rocco-default/maps/pier/pier-level-ids';
import { PIER_BAIT_SHOP_DOOR_CONFIG } from '../../../src/cartridges/rocco/games/rocco-default/maps/pier/pier-bait-shop-door-config';
import { RoccoDefaultCartridge } from '../../../src/cartridges/rocco/rocco-default-cartridge';
import { resolveRoccoPlayerAppearanceAssetUrls } from '../../../src/cartridges/rocco/games/rocco-default/player';
import { pierBackgroundAssetUrls } from '../../../src/cartridges/rocco/levels/pier/pier-assets';
import { DEFAULT_FEEDING_LOOK_ACTION_MENU_ID } from '../../../src/cartridges/rocco/levels/pier/pier-feeding-interactions';
import { DEFAULT_PELIKAN_FEEDING_LINE_TTL_MS } from '../../../src/cartridges/rocco/levels/pier/pier-middle-level';
import {
  createDefaultActionMenuDefinition,
  DEFAULT_ACTION_MENU_ID,
  showDefaultPelikanSimpleReaction,
} from '../../../src/cartridges/rocco/levels/pier/pier-pelikan-action-menu';
import { RoccoLevelManager } from '../../../src/cartridges/rocco/levels/rocco-level-manager';
import {
  BAIT_SHOP_SCENE_ID,
  RoccoBaitShopLevel,
  ROCCO_BAIT_SHOP_LEVEL_ID,
} from '../../../src/cartridges/rocco/levels/bait-shop/bait-shop-level';
import { BAIT_SHOP_DOOR_OPENING_SOUND_ID } from '../../../src/cartridges/rocco/levels/pier/pier-bait-shop-door';
import { DEFAULT_STAN_ACTION_MENU_ID } from '../../../src/cartridges/rocco/levels/pier/pier-stan-action-menu';
import { DEFAULT_STAN_DIALOGUE_MENU_ID } from '../../../src/cartridges/rocco/levels/pier/pier-stan';
import type {
  RoccoDialogueChoiceNode,
  RoccoDialogueLine,
} from '../../../src/cartridges/rocco/rpce/dialogue';
import { createRoccoLocalization } from '../../../src/cartridges/rocco/localization';
import { RoccoNetherConsoleHardwareSpawnLevel } from '../../../src/cartridges/rocco/games/rocco-default/maps/nether/nether-console-hardware-spawn-level';
import { createRoccoPlayerSpriteDefinition } from '../../../src/cartridges/rocco/games/rocco-default/player';
import { makeDefaultWaterColorEffect } from '../../../src/cartridges/rocco/levels/pier/pier-video-effects';
import {
  createRoccoKeysInventoryItem,
  RoccoInventory,
  ROCCO_INVENTORY_KEYS_ITEM_ID,
  ROCCO_INVENTORY_MENU_ID,
  ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
} from '../../../src/cartridges/rocco/inventory';
import {
  ROCCO_PLAYER_ACTION_MENU_ID,
  ROCCO_PLAYER_INVENTORY_ACTION_ID,
} from '../../../src/cartridges/rocco/games/rocco-default/player';

vi.mock('pixi.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pixi.js')>();
  return {
    ...actual,
    Assets: {
      ...actual.Assets,
      load: vi.fn((uri: string) => Promise.resolve(uri)),
    },
  };
});

vi.mock('../../../src/console/video/sprites', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/console/video/sprites')>();
  return {
    ...actual,
    loadRoccoSpriteWalkMapFromImage: vi.fn(
      (options: { id: string; origin?: { x: number; y: number }; alphaThreshold?: number }) =>
        Promise.resolve({
          id: options.id,
          width: 1672,
          height: 941,
          origin: options.origin ?? { x: 0, y: 0 },
          alphaThreshold: options.alphaThreshold ?? 1,
          columns: [{ x: 0, spans: [{ yMin: 0, yMax: 0 }] }],
        }),
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
          })),
          frameIds: options.sources.map((_, index) => `${options.frameIdPrefix}-${index + 1}`),
        }),
    ),
  };
});

const DEFAULT_CENTERED_BACKGROUND_SCROLL = {
  x: (PIER_BACKGROUND_IMAGE_WIDTH - ROCCO_DESIGN_WIDTH) / 2,
  y: (PIER_BACKGROUND_IMAGE_HEIGHT - ROCCO_DESIGN_HEIGHT) / 2,
};

function serializeMessageText(text: RoccoSpriteMessageText): string {
  return Array.isArray(text) ? text.join('|') : text;
}

function serializeDialogueLine(line: RoccoDialogueLine): string {
  return typeof line === 'string' ? line : line.join('|');
}

function expectLatestDialogueMenu(
  state: EngineMockState,
  choices: readonly RoccoDialogueChoiceNode[],
): void {
  expect(state.openedGridMenuDefinitions.at(-1)).toMatchObject({
    id: DEFAULT_STAN_DIALOGUE_MENU_ID,
    layout: 'text-list',
    items: choices.map((choice, index) => ({
      id: choice.id,
      label: serializeDialogueLine(choice.playerLine).replaceAll('|', ' '),
      slotIndex: index,
    })),
  });
}

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
  inventory.addItem(createRoccoKeysInventoryItem(createRoccoLocalization('en')));
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
  setPlayerSpritePosition(state, x, ROCCO_PLAYER_CONFIG.placement.yValues[0] ?? 180);
}

function setPlayerSpritePosition(state: EngineMockState, groundX: number, spriteY: number): void {
  const rocco = findLatestSpriteSnapshot(state, ROCCO_PLAYER_CONFIG.ids.instance);
  if (!rocco) {
    throw new Error('Expected Rocco sprite to exist.');
  }

  rocco.transform.x = groundX - ROCCO_PLAYER_CONFIG.frame.groundAnchor.x * rocco.transform.scaleX;
  rocco.transform.y = spriteY;
}

function completeLatestPlayerGoTo(state: EngineMockState): void {
  const latestGoTo = state.goToSprites.findLast((entry) =>
    entry.startsWith(`${ROCCO_PLAYER_CONFIG.ids.instance}:`),
  );
  if (!latestGoTo) {
    throw new Error('Expected Rocco goTo movement to exist.');
  }

  const [, coordinates] = latestGoTo.split(':');
  const [groundXText] = coordinates.split(',');
  const rocco = findLatestSpriteSnapshot(state, ROCCO_PLAYER_CONFIG.ids.instance);
  if (!rocco) {
    throw new Error('Expected Rocco sprite to exist.');
  }

  setPlayerSpritePosition(state, Number(groundXText), rocco.transform.y);
  state.isSpriteMovingValue = false;
}

async function flushAsyncTransition(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function createDefaultCartridgeForPierTests(): RoccoDefaultCartridge {
  return new RoccoDefaultCartridge();
}

function createLevelManagerForTests(
  options: ConstructorParameters<typeof RoccoLevelManager>[0] = {},
): RoccoLevelManager {
  return new RoccoLevelManager(options);
}

function dropBaitBucket(manager: RoccoLevelManager, state: EngineMockState): void {
  manager.handleAction(makeActionActivation(PIER_BAIT_BUCKET_CONFIG.spriteInstanceId, 'kick'));
  state.isSpriteMovingValue = false;
  manager.update(16);
  manager.update(520);
}

function startPelikanFeeding(manager: RoccoLevelManager, state: EngineMockState): void {
  dropBaitBucket(manager, state);
  manager.handleAction(makeActionActivation(PIER_PELIKAN_CONFIG.spriteInstanceId, 'talk'));
  manager.update(DEFAULT_PELIKAN_FEEDING_LINE_TTL_MS);
  manager.update(PIER_PELIKAN_CONFIG.turnDurationMs);
  manager.update(PIER_PELIKAN_CONFIG.flightDurationMs);
}

async function transitionFromMiddleToEndAndBack(
  manager: RoccoLevelManager,
  state: EngineMockState,
): Promise<void> {
  manager.handleAction(makeSceneClickActivation(0, ROCCO_DESIGN_HEIGHT / 2));
  setPlayerGroundPoint(state, 0);
  manager.update(16);
  await flushAsyncTransition();
  manager.handleAction(makeSceneClickActivation(ROCCO_DESIGN_WIDTH - 1, ROCCO_DESIGN_HEIGHT / 2));
  setPlayerGroundPoint(state, ROCCO_DESIGN_WIDTH);
  manager.update(500);
  await flushAsyncTransition();
}

async function transitionToPierBeginning(
  manager: RoccoLevelManager,
  state: EngineMockState,
): Promise<void> {
  manager.handleAction(makeSceneClickActivation(ROCCO_DESIGN_WIDTH - 1, ROCCO_DESIGN_HEIGHT / 2));
  setPlayerGroundPoint(state, ROCCO_DESIGN_WIDTH);
  manager.update(16);
  await flushAsyncTransition();
}

async function transitionFromMiddleToStartAndBack(
  manager: RoccoLevelManager,
  state: EngineMockState,
): Promise<void> {
  manager.handleAction(makeSceneClickActivation(ROCCO_DESIGN_WIDTH - 1, ROCCO_DESIGN_HEIGHT / 2));
  setPlayerGroundPoint(state, ROCCO_DESIGN_WIDTH);
  manager.update(16);
  await flushAsyncTransition();
  manager.handleAction(makeSceneClickActivation(0, ROCCO_DESIGN_HEIGHT / 2));
  setPlayerGroundPoint(state, 0);
  manager.update(500);
  await flushAsyncTransition();
}

function wakeStanToRootDialogue(manager: RoccoLevelManager): void {
  manager.handleAction(
    makeActionActivation(PIER_STAN_CONFIG.spriteInstanceId, 'talk', DEFAULT_STAN_ACTION_MENU_ID),
  );
}

function chooseStanDialogue(manager: RoccoLevelManager, itemId: string, slotIndex = 0): void {
  manager.handleAction({
    kind: 'grid-menu',
    definitionId: DEFAULT_STAN_DIALOGUE_MENU_ID,
    interaction: 'activate',
    itemId,
    slotIndex,
    items: [],
  });
}

function advanceStanConversationToFollowUpMenu(manager: RoccoLevelManager): void {
  manager.update(4800);
  manager.update(5600);
}

interface EngineMockState {
  restoredRecord: RoccoPlaneSceneRecord | undefined;
  loadedScene: RoccoPlaneScene | undefined;
  savedScenes: RoccoPlaneScene[];
  preloadedPlaneSceneIds: string[];
  addedEffectIds: string[];
  removedEffectIds: string[];
  registeredSoundIds: string[];
  unregisteredSoundIds: string[];
  preloadedSoundIds: string[];
  playedSoundIds: string[];
  stoppedSoundIds: string[];
  registeredPlaylistIds: string[];
  unregisteredPlaylistIds: string[];
  playedPlaylistIds: string[];
  preloadedSpriteDefinitionIds: string[];
  loadedSpriteDefinitionIds: string[];
  registeredWalkMapIds: string[];
  walkMapBindings: string[];
  playerSpriteId: string | undefined;
  removedSpriteIds: string[];
  createdSprites: string[];
  createdSpriteSnapshots: RoccoSpriteInstance[];
  spritePositions: string[];
  spriteScaleUpdates: string[];
  spriteFlipUpdates: string[];
  spritePresentationUpdates: string[];
  spriteVisibleDescriptionUpdates: string[];
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
  activeGridMenuDefinitionId: string | undefined;
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
  inputLeases: InputLeaseRecord[];
  compositionSessions: string[];
  spriteSnapshot: RoccoSpriteInstance | undefined;
  zoomTransforms: RoccoVideoZoomTransform[];
  zoomAnimations: {
    transform: RoccoVideoZoomTransform;
    durationMs: number;
    options: RoccoVideoZoomAnimationOptions | undefined;
  }[];
  zoomClearCount: number;
}

type InputLeaseMode = 'interactive' | 'advance-only' | 'blocked';

interface InputLeaseRecord {
  ownerId: string;
  mode: InputLeaseMode;
}

function createEngineMock(state: EngineMockState): CartridgeSdkV1Runtime {
  const isBaseInputEnabled = state.inputEnabled;
  const activeInputLeases: InputLeaseRecord[] = [];

  const recomputeInputMode = (): InputLeaseMode => {
    if (!isBaseInputEnabled) {
      return 'blocked';
    }

    if (activeInputLeases.some((lease) => lease.mode === 'blocked')) {
      return 'blocked';
    }

    if (activeInputLeases.some((lease) => lease.mode === 'advance-only')) {
      return 'advance-only';
    }

    return 'interactive';
  };

  const syncInputState = (): void => {
    state.inputEnabled = recomputeInputMode() === 'interactive';
    state.isSpriteMovingValue = !state.inputEnabled;
  };

  const sprites: RoccoSpriteSystem = {
    registerWalkMap(walkMap: RoccoSpriteWalkMap) {
      state.registeredWalkMapIds.push(walkMap.id);
    },
    unregisterWalkMap() {
      // noop
    },
    getWalkMap() {
      return;
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
      return;
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
        visibleDescription: options?.visibleDescription,
      };
      state.createdSpriteSnapshots.push(created);
      state.spriteSnapshot = created;
      return created;
    },
    removeSprite(instanceId: string) {
      state.removedSpriteIds.push(instanceId);
      const sprite = findLatestSpriteSnapshot(state, instanceId);
      if (sprite) {
        sprite.visible = false;
        sprite.enabled = false;
        sprite.interactive = false;
      }
    },
    getSprite(instanceId: string) {
      return findLatestSpriteSnapshot(state, instanceId);
    },
    listSprites() {
      return [];
    },
    playAnimation(instanceId: string, animationId: string) {
      state.playedSpriteAnimations.push(`${instanceId}:${animationId}`);
      const sprite = findLatestSpriteSnapshot(state, instanceId);
      if (sprite) {
        sprite.animation.animationId = animationId;
      }
    },
    playAction(instanceId: string, actionId: string, options) {
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
    setFlip(instanceId: string, isFlippedX: boolean, isFlippedY: boolean) {
      state.spriteFlipUpdates.push(`${instanceId}:${isFlippedX},${isFlippedY}`);
      const sprite = findLatestSpriteSnapshot(state, instanceId);
      if (sprite) {
        sprite.transform.flipX = isFlippedX;
        sprite.transform.flipY = isFlippedY;
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
    setVisibleDescription(
      instanceId: string,
      visibleDescription?: { enabled?: boolean; text?: string; textKey?: string },
    ) {
      state.spriteVisibleDescriptionUpdates.push(
        `${instanceId}:${visibleDescription?.text ?? ''}:${visibleDescription?.enabled ?? ''}`,
      );
      const sprite = findLatestSpriteSnapshot(state, instanceId);
      if (sprite) {
        sprite.visibleDescription = visibleDescription;
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
      state.isSpriteMovingValue = true;
      if (options?.targetInstanceId) {
        state.goToSpriteTargets.push(`${instanceId}:${options.targetInstanceId}`);
      }
      return true;
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
    setContrast(instanceId: string, contrast?: number) {
      const sprite = findLatestSpriteSnapshot(state, instanceId);
      if (sprite) {
        sprite.contrast = contrast;
      }
    },
    setInteractive(instanceId: string, isInteractive: boolean) {
      const sprite = findLatestSpriteSnapshot(state, instanceId);
      if (sprite) {
        sprite.interactive = isInteractive;
      }
    },
    setCollisionEnabled(instanceId: string, isCollisionEnabled: boolean) {
      const sprite = findLatestSpriteSnapshot(state, instanceId);
      if (sprite) {
        sprite.collisionEnabled = isCollisionEnabled;
      }
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
  };

  const messages: RoccoSpriteMessageSystem = {
    showMessage(message: RoccoSpriteMessageRequest) {
      state.spriteMessages.push(
        `${message.spriteInstanceId}:${message.mode}:${serializeMessageText(message.text)}`,
      );
    },
    say(instanceId: string, text: RoccoSpriteMessageText) {
      state.spriteMessages.push(`${instanceId}:say:${serializeMessageText(text)}`);
    },
    think(instanceId: string, text: RoccoSpriteMessageText) {
      state.spriteMessages.push(`${instanceId}:think:${serializeMessageText(text)}`);
    },
    removeMessage() {
      // noop
    },
    clearMessages() {
      state.spriteMessages.length = 0;
    },
    listMessages() {
      return [];
    },
    listRenderableMessages() {
      return [];
    },
    update() {
      // noop
    },
  };

  const actionMenus: RoccoActionMenuSystem = {
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
      return;
    },
    activateAt() {
      return;
    },
    getRenderableMenu() {
      return;
    },
    update() {
      // noop
    },
  };

  const gridMenus: RoccoGridMenuSystem = {
    openMenu(definition: RoccoGridMenuDefinition) {
      state.openedGridMenuDefinitions.push(definition);
      state.activeGridMenuDefinitionId = definition.id;
    },
    toggleMenu(definition: RoccoGridMenuDefinition) {
      state.toggledGridMenuDefinitions.push(definition);
      state.activeGridMenuDefinitionId =
        state.activeGridMenuDefinitionId === definition.id ? undefined : definition.id;
    },
    closeMenu() {
      state.closedGridMenuCount += 1;
      state.activeGridMenuDefinitionId = undefined;
    },
    isOpen(definitionId?: string) {
      return definitionId
        ? state.activeGridMenuDefinitionId === definitionId
        : state.activeGridMenuDefinitionId !== undefined;
    },
    setHoverAt() {
      return false;
    },
    getHoveredItem() {
      return;
    },
    activateAt() {
      return;
    },
    getCarriedItem() {
      return state.carriedGridMenuItem;
    },
    clearCarriedItem() {
      state.carriedGridMenuItem = undefined;
      state.clearedCarriedGridMenuCount += 1;
    },
    getRenderableMenu() {
      return;
    },
  };

  const primitives: RoccoPrimitiveSystem = {
    addPrimitive(primitive: RoccoPrimitive) {
      state.addedPrimitives.push(`${primitive.id}:${primitive.alpha}`);
    },
    removePrimitive(primitiveId: string) {
      state.removedPrimitives.push(primitiveId);
    },
    clearPrimitives() {
      // noop
    },
    getPrimitive() {
      return;
    },
    listPrimitives() {
      return [];
    },
  };

  const titles: RoccoTitleSystem = {
    addTitle(message: RoccoTitleMessage) {
      state.addedTitles.push(`${message.id}:${message.text}`);
    },
    removeTitle(titleId: string) {
      state.removedTitles.push(titleId);
    },
    clearTitles() {
      // noop
    },
    getTitle() {
      return;
    },
    listTitles() {
      return [];
    },
    update() {
      // noop
    },
  };

  const display: RoccoVideoDisplayModule = {
    setProfile(profile: Partial<RoccoDisplayProfile>) {
      if (profile.crtMask && profile.roundedCorners && profile.edgeVignette) {
        state.displayProfileCalls += 1;
      }
    },
    getProfile() {
      return {};
    },
  };

  const planes: RoccoVideoPlaneModule = {
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
      return;
    },
  };

  const zoom: RoccoVideoZoomModule = {
    getTransform() {
      return { factor: 1, focusX: 0, focusY: 0, anchorX: 0, anchorY: 0 };
    },
    setTransform(transform) {
      state.zoomTransforms.push(transform);
    },
    animateTo(transform, durationMs, options) {
      state.zoomAnimations.push({ transform, durationMs, options });
    },
    clear() {
      state.zoomClearCount += 1;
    },
    isEnabled() {
      return false;
    },
    isAnimating() {
      return false;
    },
  };

  const video: RoccoVideoSystem = {
    sprites,
    messages,
    actionMenus,
    gridMenus,
    primitives,
    titles,
    display,
    viewport: {
      setHost() {
        // noop
      },
      getHost() {
        return;
      },
    },
    zoom,
    planes,
    setRenderLayerOrder(_renderLayers: RoccoRenderLayer[]) {
      // noop
    },
    getRenderLayerOrder() {
      return [];
    },
    preloadAssetUrls(_assetUrls: readonly string[]) {
      return Promise.resolve();
    },
    preloadPlaneScene(scene: RoccoPlaneScene) {
      state.preloadedPlaneSceneIds.push(scene.id);
      return Promise.resolve();
    },
    preloadSpriteDefinition(definition: RoccoSpriteDefinition) {
      state.preloadedSpriteDefinitionIds.push(definition.id);
      return Promise.resolve();
    },
    preloadSpriteDefinitions(definitions: RoccoSpriteDefinition[]) {
      for (const definition of definitions) {
        state.preloadedSpriteDefinitionIds.push(definition.id);
      }
      return Promise.resolve();
    },
    render() {
      // noop
    },
    update() {
      // noop
    },
  };

  const audio: RoccoAudioSystem = {
    registerSound(definition: RoccoSoundDefinition) {
      state.registeredSoundIds.push(definition.id);
    },
    unregisterSound(soundId: string) {
      state.unregisteredSoundIds.push(soundId);
    },
    preloadSound(soundId: string) {
      state.preloadedSoundIds.push(soundId);
      return Promise.resolve();
    },
    playSound(soundId: string) {
      state.playedSoundIds.push(soundId);
      return {
        stop() {},
        setVolume() {},
        get ended() {
          return Promise.resolve();
        },
      };
    },
    setSoundVolume() {
      // noop
    },
    stopSound(soundId: string) {
      state.stoppedSoundIds.push(soundId);
    },
    stopAllSounds() {
      // noop
    },
  };

  const effects: RoccoEffectManager = {
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
  };

  const persistence: ConsolePersistence = {
    loadPlaneSceneRecord(_cartridgeId: string, _sceneId: string) {
      return Promise.resolve(state.restoredRecord as RoccoPlaneSceneRecord | null);
    },
    savePlaneScene(_cartridgeId: string, scene: RoccoPlaneScene) {
      state.savedScenes.push(scene);
      return Promise.resolve();
    },
    createSaveRepository(): never {
      throw new Error('createSaveRepository is not used by this test');
    },
  };

  const jukebox: RoccoJukeboxSystem = {
    registerPlaylist(playlist) {
      state.registeredPlaylistIds.push(playlist.id);
    },
    unregisterPlaylist(playlistId: string) {
      state.unregisteredPlaylistIds.push(playlistId);
    },
    playPlaylist(playlistId: string) {
      state.playedPlaylistIds.push(playlistId);
      return Promise.resolve({
        stop() {},
        setVolume() {},
        get ended() {
          return Promise.resolve();
        },
      });
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
      return;
    },
    unlock() {
      // noop
    },
  };

  return asRoccoTestSdk({
    video,
    audio,
    effects,
    persistence,

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
    setPlayerSprite(instanceId: string | undefined) {
      state.playerSpriteId = instanceId;
    },
    getPlayerSprite() {
      return state.playerSpriteId;
    },

    // Input control
    isDeveloperModeEnabled() {
      return true;
    },
    acquireInputLease(ownerId: string, mode: 'interactive' | 'advance-only' | 'blocked') {
      const leaseRecord = { ownerId, mode };
      activeInputLeases.push(leaseRecord);
      state.inputLeases.push(leaseRecord);
      syncInputState();
      return {
        ownerId,
        mode,
        acquiredAt: 0,
        dispose() {
          const activeIndex = activeInputLeases.indexOf(leaseRecord);
          if (activeIndex !== -1) {
            activeInputLeases.splice(activeIndex, 1);
          }
          const stateIndex = state.inputLeases.indexOf(leaseRecord);
          if (stateIndex !== -1) {
            state.inputLeases.splice(stateIndex, 1);
          }
          syncInputState();
        },
      };
    },
    getInputMode() {
      return recomputeInputMode();
    },

    // Logging and status
    setStatus(status: string) {
      state.statusMessages.push(status);
    },
    log() {
      // noop
    },

    // Composition
    beginCompositionSession(ownerId: string) {
      state.compositionSessions.push(ownerId);
      return new CompositionServiceImpl().begin({ ownerId });
    },
    jukebox,
  });
}

function createEngineMockWithStrictSoundRegistration(
  state: EngineMockState,
): CartridgeSdkV1Runtime {
  const engine = createEngineMock(state);
  const registeredSoundIds = new Set<string>();
  const audio = engine.audio;

  return asRoccoTestSdk({
    ...engine,
    audio: {
      ...audio,
      registerSound(definition: RoccoSoundDefinition) {
        if (registeredSoundIds.has(definition.id)) {
          throw new Error(`Duplicate sound registration '${definition.id}'.`);
        }

        registeredSoundIds.add(definition.id);
        audio.registerSound(definition);
      },
      unregisterSound(soundId: string) {
        registeredSoundIds.delete(soundId);
        audio.unregisterSound(soundId);
      },
    },
  });
}

function createEngineMockWithStrictPlaylistRegistration(
  state: EngineMockState,
): CartridgeSdkV1Runtime {
  const engine = createEngineMock(state);
  const registeredPlaylistIds = new Set<string>();
  const jukebox = engine.jukebox;

  return asRoccoTestSdk({
    ...engine,
    jukebox: {
      ...jukebox,
      registerPlaylist(playlist: Parameters<RoccoJukeboxSystem['registerPlaylist']>[0]) {
        if (registeredPlaylistIds.has(playlist.id)) {
          throw new Error(`Duplicate playlist registration '${playlist.id}'.`);
        }

        registeredPlaylistIds.add(playlist.id);
        jukebox.registerPlaylist(playlist);
      },
      unregisterPlaylist(playlistId: string) {
        registeredPlaylistIds.delete(playlistId);
        jukebox.unregisterPlaylist(playlistId);
      },
      unlock() {
        // noop
      },
    },
  });
}

function makeEngineState(overrides?: Partial<EngineMockState>): EngineMockState {
  return {
    restoredRecord: undefined,
    loadedScene: undefined,
    savedScenes: [],
    preloadedPlaneSceneIds: [],
    addedEffectIds: [],
    removedEffectIds: [],
    registeredSoundIds: [],
    unregisteredSoundIds: [],
    preloadedSoundIds: [],
    playedSoundIds: [],
    stoppedSoundIds: [],
    registeredPlaylistIds: [],
    unregisteredPlaylistIds: [],
    playedPlaylistIds: [],
    preloadedSpriteDefinitionIds: [],
    loadedSpriteDefinitionIds: [],
    registeredWalkMapIds: [],
    walkMapBindings: [],
    playerSpriteId: undefined,
    removedSpriteIds: [],
    createdSprites: [],
    createdSpriteSnapshots: [],
    spritePositions: [],
    spriteScaleUpdates: [],
    spriteFlipUpdates: [],
    spritePresentationUpdates: [],
    spriteVisibleDescriptionUpdates: [],
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
    activeGridMenuDefinitionId: undefined,
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
    inputLeases: [],
    compositionSessions: [],
    spriteSnapshot: undefined,
    zoomTransforms: [],
    zoomAnimations: [],
    zoomClearCount: 0,
    ...overrides,
  };
}

describe('RoccoDefaultCartridge', () => {
  it('preserves the Nether arrival zoom hold and ease-out sequence', () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const level = new RoccoNetherConsoleHardwareSpawnLevel(createRoccoLocalization('en'));
    const internals = level as unknown as {
      engine: CartridgeSdkV1Runtime | undefined;
      startArrivalZoomIntro(engine: CartridgeSdkV1Runtime): void;
      updateArrivalZoomIntro(deltaMs: number): void;
    };

    internals.engine = engine;
    internals.startArrivalZoomIntro(engine);

    expect(state.zoomTransforms).toEqual([
      {
        factor: 3,
        focusX: ROCCO_DESIGN_WIDTH,
        focusY: 0,
        anchorX: ROCCO_DESIGN_WIDTH,
        anchorY: 0,
      },
    ]);
    expect(state.zoomAnimations).toHaveLength(0);

    internals.updateArrivalZoomIntro(1999);
    expect(state.zoomAnimations).toHaveLength(0);

    internals.updateArrivalZoomIntro(1);
    expect(state.zoomAnimations).toHaveLength(1);
    expect(state.zoomAnimations[0]).toMatchObject({
      transform: {
        factor: 1,
        focusX: ROCCO_DESIGN_WIDTH / 2,
        focusY: ROCCO_DESIGN_HEIGHT / 2,
        anchorX: ROCCO_DESIGN_WIDTH / 2,
        anchorY: ROCCO_DESIGN_HEIGHT / 2,
      },
      durationMs: 1000,
      options: { easing: 'ease-in-out' },
    });

    state.zoomAnimations[0]?.options?.onComplete?.();
    expect(state.zoomClearCount).toBe(1);
    expect(state.createdSprites).toContain('rocco-nether-arrival-portal-instance');
  });

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

    await cartridge.mount({ sdk: engine });

    expect(state.loadedScene?.id).toBe(PIER_MIDDLE_SCENE_ID);
    expect(state.preloadedPlaneSceneIds).toEqual([PIER_MIDDLE_SCENE_ID]);
    expect(state.savedScenes).toHaveLength(1);
    expect(state.loadedScene?.clearColor).toBe(ROCCO_BACKGROUND_COLOR);
    expect(state.loadedScene?.planes[0]?.source).toEqual({
      kind: 'solid',
      color: ROCCO_BACKGROUND_COLOR,
    });
    expect(state.loadedScene?.planes.map((plane) => plane.id)).toEqual([
      'rocco-green-black-backplate',
      'rocco-background-back-underlay',
      'rocco-background-back',
      'rocco-background-back-mid',
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
      colors: [...PIER_WATER_EFFECT_COLORS],
      tolerance: PIER_WATER_EFFECT_TOLERANCE,
    });
    expect(state.loadedScene?.planes[4]?.source).toEqual({
      kind: 'image',
      uri: pierBackgroundAssetUrls.front,
    });
    expect(state.loadedScene?.planes[3]?.scroll).toEqual(DEFAULT_CENTERED_BACKGROUND_SCROLL);
    expect(state.loadedScene?.planes[3]?.renderLayer).toBe('world.mid');
    expect(state.addedEffectIds).toEqual([]);
    expect(state.removedEffectIds).toEqual([]);
    expect(state.registeredWalkMapIds).toContain(ROCCO_ACTIVE_WALK_MAP_ID);
    expect(state.preloadedSpriteDefinitionIds).toContain(ROCCO_PLAYER_CONFIG.ids.definition);
    expect(state.loadedSpriteDefinitionIds).toContain(ROCCO_PLAYER_CONFIG.ids.definition);
    expect(state.removedSpriteIds).toContain(ROCCO_PLAYER_CONFIG.ids.instance);
    expect(state.preloadedSpriteDefinitionIds).toContain(PIER_CLOUD_CONFIG.definitionId);
    expect(state.loadedSpriteDefinitionIds).toContain(PIER_CLOUD_CONFIG.definitionId);
    expect(state.removedSpriteIds).toContain(PIER_CLOUD_CONFIG.instanceId);
    expect(state.createdSprites).toContain(PIER_CLOUD_CONFIG.instanceId);
    expect(state.preloadedSpriteDefinitionIds).toContain(
      PIER_BAIT_BUCKET_CONFIG.spriteDefinitionId,
    );
    expect(state.loadedSpriteDefinitionIds).toContain(PIER_BAIT_BUCKET_CONFIG.spriteDefinitionId);
    expect(state.removedSpriteIds).toContain(PIER_BAIT_BUCKET_CONFIG.spriteInstanceId);
    expect(state.createdSprites).toContain(PIER_BAIT_BUCKET_CONFIG.spriteInstanceId);
    expect(state.preloadedSpriteDefinitionIds).toContain(PIER_PELIKAN_CONFIG.spriteDefinitionId);
    expect(state.loadedSpriteDefinitionIds).toContain(PIER_PELIKAN_CONFIG.spriteDefinitionId);
    expect(state.removedSpriteIds).toContain(PIER_PELIKAN_CONFIG.spriteInstanceId);
    expect(state.createdSprites).toContain(PIER_PELIKAN_CONFIG.spriteInstanceId);
    expect(state.createdSprites).toContain(ROCCO_PLAYER_CONFIG.ids.instance);
    expect(state.walkMapBindings).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:${ROCCO_ACTIVE_WALK_MAP_ID}`,
    );
    expect(state.playerSpriteId).toBe(ROCCO_PLAYER_CONFIG.ids.instance);
    expect(state.unregisteredActionMenus).toContain(DEFAULT_ACTION_MENU_ID);
    expect(state.registeredActionMenus).toContain(DEFAULT_ACTION_MENU_ID);
    expect(state.registeredActionMenus).toContain(ROCCO_PLAYER_ACTION_MENU_ID);
    expect(listSpritePositionsFor(state, PIER_CLOUD_CONFIG.instanceId)[0]).toBe(
      `${PIER_CLOUD_CONFIG.instanceId}:${PIER_CLOUD_CONFIG.startX},${PIER_CLOUD_CONFIG.baseY}`,
    );
    expect(listSpritePositionsFor(state, ROCCO_PLAYER_CONFIG.ids.instance)[0]).toBe(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:${ROCCO_PLAYER_CONFIG.placement.startX},${ROCCO_PLAYER_CONFIG.placement.yValues[0]}`,
    );
    expect(state.movedSprites[0]).toBe(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:${ROCCO_PLAYER_CONFIG.placement.pauseX},${ROCCO_PLAYER_CONFIG.placement.yValues[0]}`,
    );
    expect(state.movedSpriteActions).toEqual([ROCCO_PLAYER_CONFIG.ids.runAction]);
    expect(listPlayedSpriteAnimationsFor(state, ROCCO_PLAYER_CONFIG.ids.instance)).toEqual([]);
    expect(state.inputEnabled).toBe(true);
    expect(state.displayProfileCalls).toBe(0);
    expect(state.statusMessages[0]?.includes(cartridge.manifest.title)).toBe(true);
    expect(state.registeredPlaylistIds).toEqual(['rocco-game-music']);
    expect(state.playedPlaylistIds).toEqual(['rocco-game-music']);
  });

  it('mounts Rocco with Spanish localized status and action labels', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = createDefaultCartridgeForPierTests();

    await cartridge.mount({ sdk: engine, locale: 'es' });

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
    expect(roccoMenu?.items.map((item) => item.label)).toEqual([
      'Hablar',
      'Inventario',
      'Modo desarrollador',
    ]);
  });

  it('preserves the selected locale when the cartridge restarts itself', async () => {
    const state = makeEngineState();
    const engine = createEngineMockWithStrictPlaylistRegistration(state);
    const cartridge = createDefaultCartridgeForPierTests();

    await cartridge.mount({ sdk: engine, locale: 'es' });

    state.statusMessages.length = 0;
    state.registeredActionMenuDefinitions.length = 0;

    (cartridge as unknown as { restartDefaultDemo(): void }).restartDefaultDemo();
    await flushAsyncTransition();

    expect(state.statusMessages[0]).toContain('Nivel: Medio del muelle');
    const pelikanMenu = state.registeredActionMenuDefinitions.findLast(
      (definition) => definition.id === DEFAULT_ACTION_MENU_ID,
    );
    expect(pelikanMenu?.items.map((item) => item.label)).toEqual([
      'Mirar',
      'Hablar',
      'Coger',
      'Patear',
    ]);
    expect(state.unregisteredPlaylistIds).toEqual(['rocco-game-music']);
    expect(state.playedPlaylistIds).toEqual(['rocco-game-music', 'rocco-game-music']);
  });

  it('unregisters the game music playlist on stop', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = createDefaultCartridgeForPierTests();

    await cartridge.mount({ sdk: engine });
    cartridge.stop();

    expect(state.unregisteredPlaylistIds).toEqual(['rocco-game-music']);
  });

  it('places Pelikan on the pier mooring post', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = createDefaultCartridgeForPierTests();

    await cartridge.mount({ sdk: engine });

    expect(state.preloadedSpriteDefinitionIds).toContain(PIER_PELIKAN_CONFIG.spriteDefinitionId);
    expect(state.loadedSpriteDefinitionIds).toContain(PIER_PELIKAN_CONFIG.spriteDefinitionId);
    expect(state.removedSpriteIds).toContain(PIER_PELIKAN_CONFIG.spriteInstanceId);
    expect(state.createdSprites).toContain(PIER_PELIKAN_CONFIG.spriteInstanceId);

    const pelikan = state.createdSpriteSnapshots.find(
      (sprite) => sprite.id === PIER_PELIKAN_CONFIG.spriteInstanceId,
    );
    expect(pelikan?.transform).toMatchObject({
      x: PIER_PELIKAN_CONFIG.perchX,
      y: PIER_PELIKAN_CONFIG.perchY,
      scaleX: PIER_PELIKAN_CONFIG.spriteScale,
      scaleY: PIER_PELIKAN_CONFIG.spriteScale,
    });
    expect(pelikan?.renderLayer).toBe(PIER_PELIKAN_CONFIG.renderLayer);
    expect(pelikan?.interactive).toBe(true);
  });

  it('places the bait bucket on the back-left pier area', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = createDefaultCartridgeForPierTests();

    await cartridge.mount({ sdk: engine });

    expect(state.preloadedSpriteDefinitionIds).toContain(
      PIER_BAIT_BUCKET_CONFIG.spriteDefinitionId,
    );
    expect(state.loadedSpriteDefinitionIds).toContain(PIER_BAIT_BUCKET_CONFIG.spriteDefinitionId);
    expect(state.removedSpriteIds).toContain(PIER_BAIT_BUCKET_CONFIG.spriteInstanceId);
    expect(state.createdSprites).toContain(PIER_BAIT_BUCKET_CONFIG.spriteInstanceId);

    const baitBucket = state.createdSpriteSnapshots.find(
      (sprite) => sprite.id === PIER_BAIT_BUCKET_CONFIG.spriteInstanceId,
    );
    expect(baitBucket?.transform).toMatchObject({
      x: PIER_BAIT_BUCKET_CONFIG.x,
      y: PIER_BAIT_BUCKET_CONFIG.y,
      scaleX: PIER_BAIT_BUCKET_CONFIG.scale,
      scaleY: PIER_BAIT_BUCKET_CONFIG.scale,
    });
    expect(baitBucket?.renderLayer).toBe(PIER_BAIT_BUCKET_CONFIG.renderLayer);
    expect(baitBucket?.depthMode).toBe('baseline-sort');
    expect(baitBucket?.interactive).toBe(true);
  });

  it('refreshes an old saved Pier Middle scene with the current default visual planes', async () => {
    const restoredScene: RoccoPlaneScene = {
      id: PIER_MIDDLE_SCENE_ID,
      clearColor: ROCCO_BACKGROUND_COLOR,
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
    const cartridge = createDefaultCartridgeForPierTests();

    await cartridge.mount({ sdk: engine });

    expect(state.loadedScene?.planes.map((plane) => plane.id)).toEqual([
      'rocco-green-black-backplate',
      'rocco-background-back-underlay',
      'rocco-background-back',
      'rocco-background-back-mid',
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
      colors: [...PIER_WATER_EFFECT_COLORS],
      tolerance: PIER_WATER_EFFECT_TOLERANCE,
    });
    expect(state.loadedScene?.planes[4]?.source).toEqual({
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
    const firstCartridge = createDefaultCartridgeForPierTests();
    await firstCartridge.mount({ sdk: firstEngine });
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
    const cartridge = createDefaultCartridgeForPierTests();

    await cartridge.mount({ sdk: engine });

    expect(state.loadedScene).toBe(restoredScene);
    expect(state.savedScenes).toHaveLength(0);
  });

  it('binds Rocco to the walking path and enters toward the middle of the screen', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = createDefaultCartridgeForPierTests();

    await cartridge.mount({ sdk: engine });

    expect(state.registeredWalkMapIds).toContain(ROCCO_ACTIVE_WALK_MAP_ID);
    expect(state.walkMapBindings).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:${ROCCO_ACTIVE_WALK_MAP_ID}`,
    );
    expect(state.playerSpriteId).toBe(ROCCO_PLAYER_CONFIG.ids.instance);
    expect(state.movedSprites).toEqual([
      `${ROCCO_PLAYER_CONFIG.ids.instance}:${ROCCO_PLAYER_CONFIG.placement.pauseX},${ROCCO_PLAYER_CONFIG.placement.yValues[0]}`,
    ]);
    expect(state.movedSpriteActions).toEqual([ROCCO_PLAYER_CONFIG.ids.runAction]);
    const rocco = state.createdSpriteSnapshots.find(
      (sprite) => sprite.id === ROCCO_PLAYER_CONFIG.ids.instance,
    );
    expect(rocco?.navigation).toMatchObject({
      walkMapId: ROCCO_ACTIVE_WALK_MAP_ID,
      groundAnchor: {
        x: ROCCO_PLAYER_CONFIG.frame.groundAnchor.x,
        y: ROCCO_PLAYER_CONFIG.frame.groundAnchor.y,
      },
      constrainMovement: true,
      followSurface: true,
    });
  });

  it('transitions from Pier Middle east to Pier Beginning before Rocco has the keys', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = createDefaultCartridgeForPierTests();

    await cartridge.mount({ sdk: engine });
    cartridge.handleAction(
      makeSceneClickActivation(ROCCO_DESIGN_WIDTH - 1, ROCCO_DESIGN_HEIGHT / 2),
    );
    setPlayerGroundPoint(state, ROCCO_DESIGN_WIDTH);
    cartridge.update(16);
    await flushAsyncTransition();

    expect(state.loadedScene?.id).toBe(PIER_START_SCENE_ID);
    expect(state.spriteMessages).toEqual([]);
  });

  it('opens a 3x3 Rocco inventory grid from Rocco action menu', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const localization = createRoccoLocalization('en');
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization,
    });

    await manager.mount(engine);
    manager.handleAction(
      makeActionActivation(
        ROCCO_PLAYER_CONFIG.ids.instance,
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
          label: '\u{20AC}20',
          slotIndex: 1,
        },
      ],
    });
  });

  it('persists Rocco inventory slot order after grid placement', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const inventory = createInventoryWithKeys();
    const manager = createLevelManagerForTests({
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
        ROCCO_PLAYER_CONFIG.ids.instance,
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
    const localization = createRoccoLocalization();
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization,
    });

    await manager.mount(engine);
    setCarriedInventoryItem(state, ROCCO_INVENTORY_KEYS_ITEM_ID);
    manager.handleAction(
      makeSceneClickActivation(
        320,
        240,
        PIER_BAIT_BUCKET_CONFIG.spriteInstanceId,
        PIER_BAIT_BUCKET_CONFIG.spriteDefinitionId,
      ),
    );
    setCarriedInventoryItem(state, ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID);
    manager.handleAction(
      makeSceneClickActivation(
        320,
        240,
        PIER_PELIKAN_CONFIG.spriteInstanceId,
        PIER_PELIKAN_CONFIG.spriteDefinitionId,
      ),
    );

    expect(
      localization.text.inventory.keysOnBaitBucketLines.some((line) =>
        state.spriteMessages.some((message) => message.includes(line)),
      ),
    ).toBe(true);
    expect(
      localization.text.inventory.moneyOnPelikanLines.some((line) =>
        state.spriteMessages.some((message) => message.includes(line)),
      ),
    ).toBe(true);
    expect(state.clearedCarriedGridMenuCount).toBe(2);
  });

  it('does not hand the keys to Stan while he is asleep', async () => {
    const localization = createRoccoLocalization('es');
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization,
    });

    await manager.mount(engine);
    await transitionToPierBeginning(manager, state);

    setCarriedInventoryItem(state, ROCCO_INVENTORY_KEYS_ITEM_ID);
    manager.handleAction(
      makeSceneClickActivation(
        320,
        240,
        PIER_STAN_CONFIG.spriteInstanceId,
        PIER_STAN_CONFIG.spriteDefinitionId,
      ),
    );

    expect(state.inputEnabled).toBe(true);
    expect(state.clearedCarriedGridMenuCount).toBe(1);
    expect(
      localization.text.inventory.keysOnStanSleepingLines.some((line) =>
        state.spriteMessages.includes(`${ROCCO_PLAYER_CONFIG.ids.instance}:think:${line}`),
      ),
    ).toBe(true);
    expect(listPlayedSpriteAnimationsFor(state, PIER_STAN_CONFIG.spriteInstanceId)).not.toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:stan-look-right`,
    );
    expect(state.playedSoundIds).not.toContain('rocco-stan-police-whistle-sound');
  });

  it('transitions from Pier Middle east to Pier Beginning after Rocco has the keys', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const localization = createRoccoLocalization('en');
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization,
    });

    await manager.mount(engine);
    await transitionToPierBeginning(manager, state);

    expect(state.loadedScene?.id).toBe(PIER_START_SCENE_ID);
    expect(state.loadedScene?.planes[1]?.scroll.x).toBe(PIER_BACKGROUND_SCROLL_RIGHT_X);
    expect(findLatestSpriteSnapshot(state, ROCCO_PLAYER_CONFIG.ids.instance)?.transform.x).toBe(
      PIER_PLAYER_LEFT_ENTRY_X,
    );
    expect(state.statusMessages.at(-1)).toContain('Pier Beginning');
  });

  it('installs Stan asleep on Pier Beginning', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
    });

    await manager.mount(engine);
    await transitionToPierBeginning(manager, state);

    expect(state.preloadedSpriteDefinitionIds).toContain(PIER_STAN_CONFIG.spriteDefinitionId);
    expect(state.loadedSpriteDefinitionIds).toContain(PIER_STAN_CONFIG.spriteDefinitionId);
    expect(state.createdSprites).toContain(PIER_STAN_CONFIG.spriteInstanceId);

    const stan = findLatestSpriteSnapshot(state, PIER_STAN_CONFIG.spriteInstanceId);
    expect(stan?.transform).toMatchObject({
      x: PIER_STAN_CONFIG.x,
      y: PIER_STAN_CONFIG.y,
      scaleX: PIER_STAN_CONFIG.spriteScale,
      scaleY: PIER_STAN_CONFIG.spriteScale,
    });
    expect(stan?.renderLayer).toBe(PIER_STAN_CONFIG.renderLayer);
    expect(stan?.interactive).toBe(true);
    expect(state.registeredActionMenus).toContain(DEFAULT_STAN_ACTION_MENU_ID);
  });

  it('installs the bait shop door visible on Pier Beginning before Stan is engaged', async () => {
    const localization = createRoccoLocalization('es');
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization,
    });

    await manager.mount(engine);
    await transitionToPierBeginning(manager, state);

    expect(state.preloadedSpriteDefinitionIds).toContain(
      PIER_BAIT_SHOP_DOOR_CONFIG.spriteDefinitionId,
    );
    expect(state.loadedSpriteDefinitionIds).toContain(
      PIER_BAIT_SHOP_DOOR_CONFIG.spriteDefinitionId,
    );
    expect(state.createdSprites).toContain(PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId);

    const door = findLatestSpriteSnapshot(state, PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId);
    expect(door?.interactive).toBe(true);
    expect(door?.visibleDescription).toMatchObject({
      enabled: true,
      text: localization.text.descriptions.baitShopDoor,
    });
    expect(
      listPlayedSpriteAnimationsFor(state, PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId),
    ).toContain(
      `${PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId}:${PIER_BAIT_SHOP_DOOR_CONFIG.closedAnimationId}`,
    );
  });

  it('opens localized Stan dialogue choices immediately while Stan stays asleep', async () => {
    const localization = createRoccoLocalization('es');
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization,
    });

    await manager.mount(engine);
    await transitionToPierBeginning(manager, state);

    const stanMenu = state.registeredActionMenuDefinitions.find(
      (definition) => definition.id === DEFAULT_STAN_ACTION_MENU_ID,
    );
    expect(stanMenu?.items.map((item) => item.actionId)).toEqual(['look', 'talk', 'grab', 'kick']);
    manager.handleAction(
      makeActionActivation(PIER_STAN_CONFIG.spriteInstanceId, 'grab', DEFAULT_STAN_ACTION_MENU_ID),
    );
    expect(
      localization.text.stan.grabLines.some((line) =>
        state.spriteMessages.includes(`${ROCCO_PLAYER_CONFIG.ids.instance}:think:${line}`),
      ),
    ).toBe(true);

    manager.handleAction(
      makeActionActivation(PIER_STAN_CONFIG.spriteInstanceId, 'kick', DEFAULT_STAN_ACTION_MENU_ID),
    );
    expect(
      localization.text.stan.kickLines.some((line) =>
        state.spriteMessages.includes(`${ROCCO_PLAYER_CONFIG.ids.instance}:think:${line}`),
      ),
    ).toBe(true);

    state.spriteMessages.length = 0;
    manager.handleAction(
      makeActionActivation(PIER_STAN_CONFIG.spriteInstanceId, 'talk', DEFAULT_STAN_ACTION_MENU_ID),
    );

    expectLatestDialogueMenu(state, localization.text.stan.rootChoices);
    expect(state.inputEnabled).toBe(true);
    expect(state.spriteMessages).toEqual([]);
    expect(listPlayedSpriteAnimationsFor(state, PIER_STAN_CONFIG.spriteInstanceId)).not.toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:stan-waking`,
    );
  });

  it('starts waking Stan when Rocco says the first line and reveals his short name after the introduction', async () => {
    const localization = createRoccoLocalization('es');
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization,
    });

    const introduceSelfChoice = localization.text.stan.rootChoices.find(
      (choice) => choice.id === 'introduce-self',
    );
    expect(introduceSelfChoice).toBeDefined();

    await manager.mount(engine);
    await transitionToPierBeginning(manager, state);
    wakeStanToRootDialogue(manager);

    manager.handleAction({
      kind: 'grid-menu',
      definitionId: DEFAULT_STAN_DIALOGUE_MENU_ID,
      interaction: 'activate',
      itemId: 'introduce-self',
      slotIndex: 0,
      items: [],
    });

    expect(state.spriteMessages).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:say:${serializeDialogueLine(introduceSelfChoice?.playerLine ?? '')}`,
    );
    expect(listPlayedSpriteAnimationsFor(state, PIER_STAN_CONFIG.spriteInstanceId)).toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:stan-waking`,
    );

    manager.update(1000);

    expect(listPlayedSpriteAnimationsFor(state, PIER_STAN_CONFIG.spriteInstanceId)).toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:stan-look-left`,
    );
    expect(state.spriteMessages).not.toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:say:${serializeDialogueLine(introduceSelfChoice?.npcLine ?? '')}`,
    );

    manager.update(3799);

    expect(state.spriteMessages).not.toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:say:${serializeDialogueLine(introduceSelfChoice?.npcLine ?? '')}`,
    );

    manager.update(1);

    expect(state.spriteMessages).toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:say:${serializeDialogueLine(introduceSelfChoice?.npcLine ?? '')}`,
    );

    manager.update(5600);

    expect(state.spriteVisibleDescriptionUpdates).toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:${localization.text.descriptions.stan}:true`,
    );
  });

  it('advances the Stan conversation with scene clicks while the dialogue is blocking input', async () => {
    const localization = createRoccoLocalization('es');
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization,
    });

    const introduceSelfChoice = localization.text.stan.rootChoices.find(
      (choice) => choice.id === 'introduce-self',
    );
    expect(introduceSelfChoice?.choices).toBeDefined();

    await manager.mount(engine);
    await transitionToPierBeginning(manager, state);
    wakeStanToRootDialogue(manager);
    chooseStanDialogue(manager, 'introduce-self', 0);

    expect(state.inputEnabled).toBe(false);

    manager.handleAction(
      makeSceneClickActivation(
        PIER_STAN_CONFIG.x,
        PIER_STAN_CONFIG.y,
        PIER_STAN_CONFIG.spriteInstanceId,
        PIER_STAN_CONFIG.spriteDefinitionId,
      ),
    );

    expect(state.spriteMessages).toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:say:${serializeDialogueLine(introduceSelfChoice?.npcLine ?? '')}`,
    );
    expect(state.inputEnabled).toBe(false);

    manager.handleAction(
      makeSceneClickActivation(
        PIER_STAN_CONFIG.x,
        PIER_STAN_CONFIG.y,
        PIER_STAN_CONFIG.spriteInstanceId,
        PIER_STAN_CONFIG.spriteDefinitionId,
      ),
    );

    expectLatestDialogueMenu(state, introduceSelfChoice?.choices ?? []);
    expect(state.inputEnabled).toBe(true);
  });

  it('keeps the bait shop door visible after Rocco says something to Stan', async () => {
    const localization = createRoccoLocalization('es');
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization,
    });

    await manager.mount(engine);
    await transitionToPierBeginning(manager, state);

    const initialDoor = findLatestSpriteSnapshot(
      state,
      PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId,
    );
    expect(initialDoor?.interactive).toBe(true);

    wakeStanToRootDialogue(manager);
    chooseStanDialogue(manager, 'introduce-self', 0);

    const door = findLatestSpriteSnapshot(state, PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId);
    expect(door?.interactive).toBe(true);
    expect(door?.visibleDescription).toMatchObject({
      enabled: true,
      text: localization.text.descriptions.baitShopDoor,
    });
    expect(state.spriteVisibleDescriptionUpdates).not.toContain(
      `${PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId}:${localization.text.descriptions.baitShopDoor}:true`,
    );
  });

  it('plays the Stan boo branch and exposes the bathroom clue dialogue path', async () => {
    const localization = createRoccoLocalization('es');
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization,
    });

    const booChoice = localization.text.stan.rootChoices.find((choice) => choice.id === 'boo');
    const bathroomChoice = booChoice?.choices?.find((choice) => choice.id === 'boo-bathroom');
    const clueChoice = bathroomChoice?.choices?.find(
      (choice) => choice.id === 'boo-bathroom-please',
    );
    expect(booChoice?.choices).toBeDefined();
    expect(bathroomChoice?.choices).toBeDefined();
    expect(clueChoice).toBeDefined();

    await manager.mount(engine);
    await transitionToPierBeginning(manager, state);
    wakeStanToRootDialogue(manager);

    manager.handleAction({
      kind: 'grid-menu',
      definitionId: DEFAULT_STAN_DIALOGUE_MENU_ID,
      interaction: 'activate',
      itemId: 'boo',
      slotIndex: 3,
      items: [],
    });

    expect(state.spriteMessages).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:say:${serializeDialogueLine(booChoice?.playerLine ?? '')}`,
    );
    expect(state.inputEnabled).toBe(false);
    expect(listPlayedSpriteAnimationsFor(state, PIER_STAN_CONFIG.spriteInstanceId)).toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:stan-waking`,
    );

    manager.update(1000);

    expect(listPlayedSpriteAnimationsFor(state, PIER_STAN_CONFIG.spriteInstanceId)).toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:stan-look-left`,
    );

    manager.update(1000);

    expect(state.spriteMessages).not.toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:say:${serializeDialogueLine(booChoice?.npcLine ?? '')}`,
    );
    expect(listPlayedSpriteAnimationsFor(state, PIER_STAN_CONFIG.spriteInstanceId)).toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:stan-look-left`,
    );

    manager.update(1000);

    expect(listPlayedSpriteAnimationsFor(state, PIER_STAN_CONFIG.spriteInstanceId)).toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:stan-look-right`,
    );

    manager.update(1799);

    expect(state.spriteMessages).not.toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:say:${serializeDialogueLine(booChoice?.npcLine ?? '')}`,
    );

    manager.update(1);

    expect(state.spriteMessages).toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:say:${serializeDialogueLine(booChoice?.npcLine ?? '')}`,
    );

    manager.update(5600);

    expectLatestDialogueMenu(state, booChoice?.choices ?? []);

    manager.handleAction({
      kind: 'grid-menu',
      definitionId: DEFAULT_STAN_DIALOGUE_MENU_ID,
      interaction: 'activate',
      itemId: 'boo-bathroom',
      slotIndex: 0,
      items: [],
    });

    expect(state.spriteMessages).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:say:${serializeDialogueLine(bathroomChoice?.playerLine ?? '')}`,
    );

    manager.update(4800);

    expect(state.spriteMessages).toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:say:${serializeDialogueLine(bathroomChoice?.npcLine ?? '')}`,
    );

    manager.update(5600);

    expectLatestDialogueMenu(state, bathroomChoice?.choices ?? []);

    manager.handleAction({
      kind: 'grid-menu',
      definitionId: DEFAULT_STAN_DIALOGUE_MENU_ID,
      interaction: 'activate',
      itemId: 'boo-bathroom-please',
      slotIndex: 1,
      items: [],
    });

    expect(state.spriteMessages).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:say:${serializeDialogueLine(clueChoice?.playerLine ?? '')}`,
    );

    manager.update(4800);

    expect(state.spriteMessages).toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:say:${serializeDialogueLine(clueChoice?.npcLine ?? '')}`,
    );

    manager.update(5600);

    expect(state.inputEnabled).toBe(true);
  });

  it('starts the pelikan takeoff only after the feeding line closes', async () => {
    const localization = createRoccoLocalization('es');
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization,
    });

    await manager.mount(engine);
    dropBaitBucket(manager, state);

    manager.handleAction(makeActionActivation(PIER_PELIKAN_CONFIG.spriteInstanceId, 'talk'));

    expect(state.spriteMessages).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:say:${localization.text.middleLevel.pelikanFeedingLine}`,
    );
    expect(
      listPlayedSpriteAnimationsFor(state, PIER_PELIKAN_CONFIG.spriteInstanceId),
    ).not.toContain(
      `${PIER_PELIKAN_CONFIG.spriteInstanceId}:${PIER_PELIKAN_CONFIG.flightAnimationId}`,
    );

    manager.update(DEFAULT_PELIKAN_FEEDING_LINE_TTL_MS - 1);

    expect(
      listPlayedSpriteAnimationsFor(state, PIER_PELIKAN_CONFIG.spriteInstanceId),
    ).not.toContain(
      `${PIER_PELIKAN_CONFIG.spriteInstanceId}:${PIER_PELIKAN_CONFIG.flightAnimationId}`,
    );

    manager.update(1);
    manager.update(PIER_PELIKAN_CONFIG.turnDurationMs);

    expect(listPlayedSpriteAnimationsFor(state, PIER_PELIKAN_CONFIG.spriteInstanceId)).toContain(
      `${PIER_PELIKAN_CONFIG.spriteInstanceId}:${PIER_PELIKAN_CONFIG.flightAnimationId}`,
    );
  });

  it('opens the bait shop door and transitions into the bait shop with the same inventory when Stan is asleep', async () => {
    const localization = createRoccoLocalization('es');
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization,
    });
    const baitShopScene: RoccoPlaneScene = {
      id: BAIT_SHOP_SCENE_ID,
      planes: [],
      clearColor: ROCCO_BACKGROUND_COLOR,
      palettes: [],
      colorRegisterSets: [],
      attributeMaps: [],
    };
    const mountSpy = vi
      .spyOn(RoccoBaitShopLevel.prototype, 'mount')
      .mockImplementation((mountEngine) => {
        mountEngine.loadPlaneScene(baitShopScene);
        return Promise.resolve(baitShopScene);
      });
    const unmountSpy = vi
      .spyOn(RoccoBaitShopLevel.prototype, 'unmount')
      .mockImplementation(() => {});

    try {
      await manager.mount(engine);
      await transitionToPierBeginning(manager, state);
      wakeStanToRootDialogue(manager);
      chooseStanDialogue(manager, 'introduce-self', 0);
      advanceStanConversationToFollowUpMenu(manager);
      manager.update(12_000);

      setCarriedInventoryItem(state, ROCCO_INVENTORY_KEYS_ITEM_ID);
      manager.handleAction(
        makeSceneClickActivation(
          918,
          360,
          PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId,
          PIER_BAIT_SHOP_DOOR_CONFIG.spriteDefinitionId,
        ),
      );

      expect(state.playedSoundIds).not.toContain(BAIT_SHOP_DOOR_OPENING_SOUND_ID);
      completeLatestPlayerGoTo(state);
      manager.update(16);

      expect(state.playedSoundIds).toContain(BAIT_SHOP_DOOR_OPENING_SOUND_ID);
      expect(
        listPlayedSpriteAnimationsFor(state, PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId),
      ).toContain(
        `${PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId}:${PIER_BAIT_SHOP_DOOR_CONFIG.openAnimationId}`,
      );

      expect(state.playedSpriteActionDirections).toContain(
        `${ROCCO_PLAYER_CONFIG.ids.instance}:${ROCCO_PLAYER_CONFIG.ids.idleAction}:up`,
      );

      manager.update(999);

      expect(state.loadedScene?.id).not.toBe(BAIT_SHOP_SCENE_ID);
      expect(state.addedPrimitives).not.toContain('rocco-bait-shop-placeholder-fade:1');
      expect(state.addedTitles).not.toContain(
        `rocco-bait-shop-placeholder-title:${localization.text.levels.baitShopPlaceholderTitle}`,
      );

      completeLatestPlayerGoTo(state);
      manager.update(1);
      await flushAsyncTransition();

      expect(mountSpy).toHaveBeenCalledOnce();
      expect(manager.getActiveLevel()?.id).toBe(ROCCO_BAIT_SHOP_LEVEL_ID);
      expect(state.loadedScene?.id).toBe(BAIT_SHOP_SCENE_ID);
      expect(state.statusMessages.at(-1)).toContain(
        localization.text.levels.baitShopPlaceholderTitle,
      );

      manager.handleAction(
        makeActionActivation(
          ROCCO_PLAYER_CONFIG.ids.instance,
          ROCCO_PLAYER_INVENTORY_ACTION_ID,
          ROCCO_PLAYER_ACTION_MENU_ID,
        ),
      );

      expect(state.toggledGridMenuDefinitions.at(-1)).toMatchObject({
        id: ROCCO_INVENTORY_MENU_ID,
      });
      expect(state.toggledGridMenuDefinitions.at(-1)?.items.map((item) => item.id)).toEqual(
        expect.arrayContaining([
          ROCCO_INVENTORY_KEYS_ITEM_ID,
          ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
        ]),
      );
    } finally {
      mountSpy.mockRestore();
      unmountSpy.mockRestore();
    }
  });

  it('calls the police after Rocco reaches the bait shop door while Stan is awake', async () => {
    const localization = createRoccoLocalization('es');
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization,
    });

    await manager.mount(engine);
    await transitionToPierBeginning(manager, state);
    wakeStanToRootDialogue(manager);
    chooseStanDialogue(manager, 'introduce-self', 0);
    advanceStanConversationToFollowUpMenu(manager);
    engine.video.gridMenus.closeMenu();

    setCarriedInventoryItem(state, ROCCO_INVENTORY_KEYS_ITEM_ID);
    manager.handleAction(
      makeSceneClickActivation(
        918,
        360,
        PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId,
        PIER_BAIT_SHOP_DOOR_CONFIG.spriteDefinitionId,
      ),
    );

    expect(state.playedSoundIds).not.toContain(BAIT_SHOP_DOOR_OPENING_SOUND_ID);
    expect(
      listPlayedSpriteAnimationsFor(state, PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId),
    ).not.toContain(
      `${PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId}:${PIER_BAIT_SHOP_DOOR_CONFIG.openAnimationId}`,
    );

    completeLatestPlayerGoTo(state);
    manager.update(16);

    expect(state.playedSoundIds).toContain(BAIT_SHOP_DOOR_OPENING_SOUND_ID);
    expect(
      listPlayedSpriteAnimationsFor(state, PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId),
    ).toContain(
      `${PIER_BAIT_SHOP_DOOR_CONFIG.spriteInstanceId}:${PIER_BAIT_SHOP_DOOR_CONFIG.openAnimationId}`,
    );
    expect(state.spriteMessages).toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:say:${localization.text.inventory.keysOnStanArrestLine}`,
    );
  });

  it('puts Stan back to sleep after the dialogue menu idles for a while', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization: createRoccoLocalization('es'),
    });

    await manager.mount(engine);
    await transitionToPierBeginning(manager, state);
    wakeStanToRootDialogue(manager);

    expect(state.activeGridMenuDefinitionId).toBe(DEFAULT_STAN_DIALOGUE_MENU_ID);

    manager.update(11_999);

    expect(state.closedGridMenuCount).toBe(0);

    manager.update(1);

    expect(state.closedGridMenuCount).toBe(1);
    expect(
      countPlayedSpriteAnimation(
        state,
        PIER_STAN_CONFIG.spriteInstanceId,
        PIER_STAN_CONFIG.sleepingAnimationId,
      ),
    ).toBeGreaterThan(1);
    expect(state.activeGridMenuDefinitionId).toBeUndefined();
    expect(state.inputEnabled).toBe(true);
  });

  it('reopens Stan dialogue choices when the menu was dismissed with an outside click', async () => {
    const localization = createRoccoLocalization('es');
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization,
    });

    await manager.mount(engine);
    await transitionToPierBeginning(manager, state);
    wakeStanToRootDialogue(manager);

    expect(state.activeGridMenuDefinitionId).toBe(DEFAULT_STAN_DIALOGUE_MENU_ID);

    engine.video.gridMenus.closeMenu();

    expect(state.activeGridMenuDefinitionId).toBeUndefined();

    wakeStanToRootDialogue(manager);

    expect(state.activeGridMenuDefinitionId).toBe(DEFAULT_STAN_DIALOGUE_MENU_ID);
    expectLatestDialogueMenu(state, localization.text.stan.rootChoices);
    expect(state.closedGridMenuCount).toBe(1);
  });

  it('wakes Stan when Rocco walks behind him and keeps him awake while Rocco stays there', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization: createRoccoLocalization('es'),
    });

    await manager.mount(engine);
    await transitionToPierBeginning(manager, state);

    const sleepingAnimationCount = countPlayedSpriteAnimation(
      state,
      PIER_STAN_CONFIG.spriteInstanceId,
      PIER_STAN_CONFIG.sleepingAnimationId,
    );

    setPlayerSpritePosition(
      state,
      PIER_STAN_CONFIG.x,
      ROCCO_PLAYER_CONFIG.placement.yValues[2] ?? ROCCO_PLAYER_CONFIG.placement.yValues[0] ?? 180,
    );

    manager.update(16);

    expect(listPlayedSpriteAnimationsFor(state, PIER_STAN_CONFIG.spriteInstanceId)).toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:stan-waking`,
    );

    manager.update(1000);

    expect(listPlayedSpriteAnimationsFor(state, PIER_STAN_CONFIG.spriteInstanceId)).toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:stan-look-right`,
    );

    manager.update(12_000);

    expect(
      countPlayedSpriteAnimation(
        state,
        PIER_STAN_CONFIG.spriteInstanceId,
        PIER_STAN_CONFIG.sleepingAnimationId,
      ),
    ).toBe(sleepingAnimationCount);
  });

  it('makes Stan look to his right when Rocco talks from that side', async () => {
    const localization = createRoccoLocalization('es');
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization,
    });

    await manager.mount(engine);
    await transitionToPierBeginning(manager, state);
    setPlayerSpritePosition(
      state,
      PIER_STAN_CONFIG.x + 120,
      ROCCO_PLAYER_CONFIG.placement.yValues[3] ?? ROCCO_PLAYER_CONFIG.placement.yValues[0] ?? 180,
    );
    wakeStanToRootDialogue(manager);

    manager.handleAction({
      kind: 'grid-menu',
      definitionId: DEFAULT_STAN_DIALOGUE_MENU_ID,
      interaction: 'activate',
      itemId: 'introduce-self',
      slotIndex: 0,
      items: [],
    });

    manager.update(1000);

    expect(listPlayedSpriteAnimationsFor(state, PIER_STAN_CONFIG.spriteInstanceId)).toContain(
      `${PIER_STAN_CONFIG.spriteInstanceId}:stan-look-right`,
    );
  });

  it('keeps Stan facing Rocco while he is awake', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization: createRoccoLocalization('es'),
    });

    await manager.mount(engine);
    await transitionToPierBeginning(manager, state);
    setPlayerSpritePosition(
      state,
      PIER_STAN_CONFIG.x,
      ROCCO_PLAYER_CONFIG.placement.yValues[2] ?? ROCCO_PLAYER_CONFIG.placement.yValues[0] ?? 180,
    );

    manager.update(16);
    manager.update(1984);

    const stan = findLatestSpriteSnapshot(state, PIER_STAN_CONFIG.spriteInstanceId);
    expect(stan?.animation.animationId).toBe('stan-look-right');

    setPlayerSpritePosition(
      state,
      PIER_STAN_CONFIG.x - 120,
      ROCCO_PLAYER_CONFIG.placement.yValues[3] ?? ROCCO_PLAYER_CONFIG.placement.yValues[0] ?? 180,
    );

    manager.update(16);

    expect(stan?.animation.animationId).toBe('stan-look-left');

    setPlayerSpritePosition(
      state,
      PIER_STAN_CONFIG.x + 120,
      ROCCO_PLAYER_CONFIG.placement.yValues[3] ?? ROCCO_PLAYER_CONFIG.placement.yValues[0] ?? 180,
    );

    manager.update(16);

    expect(stan?.animation.animationId).toBe('stan-look-right');
  });

  it('transitions from Pier Middle west to Pier End after Rocco has the keys', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const localization = createRoccoLocalization('en');
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization,
    });

    await manager.mount(engine);
    manager.handleAction(makeSceneClickActivation(0, ROCCO_DESIGN_HEIGHT / 2));
    setPlayerGroundPoint(state, 0);
    manager.update(16);
    await flushAsyncTransition();

    expect(state.loadedScene?.id).toBe(PIER_END_SCENE_ID);
    expect(state.loadedScene?.planes[1]?.scroll.x).toBe(PIER_BACKGROUND_SCROLL_LEFT_X);
    expect(findLatestSpriteSnapshot(state, ROCCO_PLAYER_CONFIG.ids.instance)?.transform.x).toBe(
      PIER_PLAYER_RIGHT_ENTRY_X,
    );
    expect(state.statusMessages.at(-1)).toContain('Pier End');
  });

  it('keeps the Pier Middle bait bucket dropped after visiting Pier End', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
    });

    await manager.mount(engine);
    dropBaitBucket(manager, state);
    const droppedAnimationCount = countPlayedSpriteAnimation(
      state,
      PIER_BAIT_BUCKET_CONFIG.spriteInstanceId,
      PIER_BAIT_BUCKET_CONFIG.droppedAnimationId,
    );

    await transitionFromMiddleToEndAndBack(manager, state);

    expect(state.loadedScene?.id).toBe(PIER_MIDDLE_SCENE_ID);
    expect(
      countPlayedSpriteAnimation(
        state,
        PIER_BAIT_BUCKET_CONFIG.spriteInstanceId,
        PIER_BAIT_BUCKET_CONFIG.droppedAnimationId,
      ),
    ).toBeGreaterThan(droppedAnimationCount);
    expect(state.registeredActionMenus).toContain('rocco-bait-bucket-dropped-action-menu');
  });

  it('keeps Pier Middle feeding and revealed keys after visiting Pier Beginning', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
    });

    await manager.mount(engine);
    startPelikanFeeding(manager, state);
    const feedingAnimationCount = countPlayedSpriteAnimation(
      state,
      PIER_PELIKAN_CONFIG.spriteInstanceId,
      PIER_PELIKAN_CONFIG.feedingAnimationId,
    );
    const keysCreationCount = state.createdSprites.filter(
      (id) => id === PIER_KEYS_CONFIG.spriteInstanceId,
    ).length;

    await transitionFromMiddleToStartAndBack(manager, state);

    expect(state.loadedScene?.id).toBe(PIER_MIDDLE_SCENE_ID);
    expect(
      countPlayedSpriteAnimation(
        state,
        PIER_PELIKAN_CONFIG.spriteInstanceId,
        PIER_PELIKAN_CONFIG.feedingAnimationId,
      ),
    ).toBeGreaterThan(feedingAnimationCount);
    expect(
      findLatestSpriteSnapshot(state, PIER_PELIKAN_CONFIG.spriteInstanceId)?.transform,
    ).toMatchObject({
      x: PIER_PELIKAN_CONFIG.feedingX,
      y: PIER_PELIKAN_CONFIG.feedingY,
    });
    expect(
      state.createdSprites.filter((id) => id === PIER_KEYS_CONFIG.spriteInstanceId).length,
    ).toBeGreaterThan(keysCreationCount);
    expect(
      findLatestSpriteSnapshot(state, PIER_KEYS_CONFIG.spriteInstanceId)?.transform,
    ).toMatchObject({
      x: PIER_KEYS_CONFIG.x,
      y: PIER_KEYS_CONFIG.y,
    });
    expect(state.registeredActionMenus).toContain(DEFAULT_FEEDING_LOOK_ACTION_MENU_ID);
  });

  it('remounts Pier Middle cleanly after visiting Pier Beginning when audio registrations are strict', async () => {
    const state = makeEngineState();
    const engine = createEngineMockWithStrictSoundRegistration(state);
    const localization = createRoccoLocalization('en');
    const manager = createLevelManagerForTests({
      cartridgeTitle: 'ROCCO',
      inventory: createInventoryWithKeys(),
      localization,
    });

    await manager.mount(engine);
    startPelikanFeeding(manager, state);

    await transitionFromMiddleToStartAndBack(manager, state);

    expect(state.loadedScene?.id).toBe(PIER_MIDDLE_SCENE_ID);
    expect(state.statusMessages.at(-1)).toContain('Pier Middle');
  });

  it('plays the full Rocco intro thought and help line when uninterrupted', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = createDefaultCartridgeForPierTests();

    await cartridge.mount({ sdk: engine });
    state.isSpriteMovingValue = false;
    cartridge.update(16);
    cartridge.update(6400);
    cartridge.update(5400);

    const localization = createRoccoLocalization();
    expect(state.spriteMessages).toEqual([
      `${ROCCO_PLAYER_CONFIG.ids.instance}:think:${serializeDialogueLine(localization.text.rocco.introThoughtLine)}`,
      `${ROCCO_PLAYER_CONFIG.ids.instance}:say:${serializeDialogueLine(localization.text.rocco.introHelpLine)}`,
    ]);
    expect(state.playedSpriteActionDirections).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:${ROCCO_PLAYER_CONFIG.ids.idleAction}:up`,
    );
    expect(state.playedSpriteActionDirections).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:${ROCCO_PLAYER_CONFIG.ids.idleAction}:down`,
    );
    expect(state.inputEnabled).toBe(true);
    expect(state.movedSprites).toEqual([
      `${ROCCO_PLAYER_CONFIG.ids.instance}:${ROCCO_PLAYER_CONFIG.placement.pauseX},${ROCCO_PLAYER_CONFIG.placement.yValues[0]}`,
    ]);
    expect(listPlayedSpriteAnimationsFor(state, ROCCO_PLAYER_CONFIG.ids.instance)).toEqual([]);
  });

  it('cancels the Rocco intro sequence on scene click before any intro line plays', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = createDefaultCartridgeForPierTests();

    await cartridge.mount({ sdk: engine });
    cartridge.handleAction(makeSceneClickActivation(320, 240));
    state.isSpriteMovingValue = false;
    cartridge.update(16);
    cartridge.update(6400);
    cartridge.update(5400);

    expect(state.spriteMessages).toEqual([]);
    expect(state.playedSpriteActionDirections).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:${ROCCO_PLAYER_CONFIG.ids.idleAction}:down`,
    );
  });

  it('advances to the intro help line immediately on a scene click while Rocco is speaking the thought', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = createDefaultCartridgeForPierTests();
    const localization = createRoccoLocalization();

    await cartridge.mount({ sdk: engine });
    state.isSpriteMovingValue = false;
    cartridge.update(16);

    const result = cartridge.handleAction(makeSceneClickActivation(320, 240));

    expect(state.spriteMessages).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:think:${serializeDialogueLine(localization.text.rocco.introThoughtLine)}`,
    );
    expect(state.spriteMessages).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:say:${serializeDialogueLine(localization.text.rocco.introHelpLine)}`,
    );
    expect(state.playedSpriteActionDirections).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:${ROCCO_PLAYER_CONFIG.ids.idleAction}:up`,
    );
    expect(state.playedSpriteActionDirections).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:${ROCCO_PLAYER_CONFIG.ids.idleAction}:down`,
    );
    expect(state.inputEnabled).toBe(true);
    expect(result).toMatchObject({ defaultPlayerMovement: 'suppress' });
  });

  it('keeps the intro help line and does not cancel after a scene click while speaking the thought', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = createDefaultCartridgeForPierTests();
    const localization = createRoccoLocalization();

    await cartridge.mount({ sdk: engine });
    state.isSpriteMovingValue = false;
    cartridge.update(16);
    cartridge.handleAction(makeSceneClickActivation(320, 240));

    expect(state.spriteMessages).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:say:${serializeDialogueLine(localization.text.rocco.introHelpLine)}`,
    );

    cartridge.update(6400);
    cartridge.update(5400);

    expect(state.spriteMessages).toEqual([
      `${ROCCO_PLAYER_CONFIG.ids.instance}:think:${serializeDialogueLine(localization.text.rocco.introThoughtLine)}`,
      `${ROCCO_PLAYER_CONFIG.ids.instance}:say:${serializeDialogueLine(localization.text.rocco.introHelpLine)}`,
    ]);
  });

  it('finishes the intro and clears the help line on a scene click while Rocco is speaking the help line', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = createDefaultCartridgeForPierTests();
    const localization = createRoccoLocalization();

    await cartridge.mount({ sdk: engine });
    state.isSpriteMovingValue = false;
    cartridge.update(16);
    cartridge.update(6400);
    expect(state.spriteMessages).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:say:${serializeDialogueLine(localization.text.rocco.introHelpLine)}`,
    );

    const result = cartridge.handleAction(makeSceneClickActivation(320, 240));

    expect(state.spriteMessages).toEqual([]);
    expect(state.playedSpriteActionDirections).toContain(
      `${ROCCO_PLAYER_CONFIG.ids.instance}:${ROCCO_PLAYER_CONFIG.ids.idleAction}:down`,
    );
    expect(result).toMatchObject({ defaultPlayerMovement: 'suppress' });
  });

  it('moves the default cloud with vertical drift', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = createDefaultCartridgeForPierTests();

    await cartridge.mount({ sdk: engine });
    cartridge.update(PIER_CLOUD_CONFIG.verticalPeriodMs / 4);

    const expectedX =
      PIER_CLOUD_CONFIG.startX +
      PIER_CLOUD_CONFIG.speedX * (PIER_CLOUD_CONFIG.verticalPeriodMs / 4 / 1000);
    const expectedY = PIER_CLOUD_CONFIG.baseY + PIER_CLOUD_CONFIG.verticalAmplitude;
    expect(listSpritePositionsFor(state, PIER_CLOUD_CONFIG.instanceId).at(-1)).toBe(
      `${PIER_CLOUD_CONFIG.instanceId}:${expectedX},${expectedY}`,
    );
    expect(PIER_CLOUD_CONFIG.scale).toBe(0.5);
    expect(PIER_CLOUD_CONFIG.opacity).toBeCloseTo(0.9);
    expect(PIER_CLOUD_CONFIG.speedX).toBeGreaterThan(0);
  });

  it('grows the default cloud linearly as it approaches the right side', async () => {
    const state = makeEngineState();
    const engine = createEngineMock(state);
    const cartridge = createDefaultCartridgeForPierTests();

    await cartridge.mount({ sdk: engine });
    const halfTravelMs =
      ((PIER_CLOUD_CONFIG.wrapRightX - PIER_CLOUD_CONFIG.startX) / PIER_CLOUD_CONFIG.speedX / 2) *
      1000;
    cartridge.update(halfTravelMs);

    const latestScale = listSpriteScaleUpdatesFor(state, PIER_CLOUD_CONFIG.instanceId).at(-1);
    const [, scalePair = ''] = latestScale?.split(':') ?? [];
    const [scaleX, scaleY] = scalePair.split(',').map(Number);
    const expectedScale = PIER_CLOUD_CONFIG.scale * (1 + PIER_CLOUD_CONFIG.scaleGrowthFactor / 2);
    expect(scaleX).toBeCloseTo(expectedScale, 5);
    expect(scaleY).toBeCloseTo(expectedScale, 5);
  });
});

describe('default cartridge helpers', () => {
  it('createRoccoPlayerSpriteDefinition keeps Rocco sprite content in the default cartridge', () => {
    const definition = createRoccoPlayerSpriteDefinition();
    const imageUris = definition.images.map((image) => image.uri);

    expect(definition.id).toBe(ROCCO_PLAYER_CONFIG.ids.definition);
    expect(definition.defaultAnimation).toBe('rocco-stand-left');
    expect(definition.defaultIdleAction).toBe('idle');
    expect(definition.defaultMoveAction).toBe(ROCCO_PLAYER_CONFIG.ids.runAction);
    expect(imageUris).toContain(resolveRoccoPlayerAppearanceAssetUrls().runLeft[0]);
    expect(imageUris).toContain(resolveRoccoPlayerAppearanceAssetUrls().runRight[1]);
    expect(imageUris).toContain(resolveRoccoPlayerAppearanceAssetUrls().runLeft[0]);
    expect(imageUris).toContain(resolveRoccoPlayerAppearanceAssetUrls().runRight[1]);
    expect(imageUris).toContain(resolveRoccoPlayerAppearanceAssetUrls().standing.down);
    expect(imageUris).toContain(resolveRoccoPlayerAppearanceAssetUrls().standing['up-right']);
    expect(
      imageUris.some((uri) => uri?.includes('/cartridges/rocco-default/assets/') === true),
    ).toBe(false);
    expect(
      definition.animations[ROCCO_PLAYER_CONFIG.standing.standingSequenceAnimationId]?.frames,
    ).toHaveLength(ROCCO_PLAYER_CONFIG.standing.poseCount);
    expect(
      definition.animations[ROCCO_PLAYER_CONFIG.standing.standingSequenceRightAnimationId]?.frames,
    ).toHaveLength(ROCCO_PLAYER_CONFIG.standing.poseCount);
    expect(definition.actions?.[ROCCO_PLAYER_CONFIG.ids.runAction]?.speed).toBeGreaterThan(0);
    expect(
      definition.actions?.[ROCCO_PLAYER_CONFIG.ids.runAction]?.directionalAnimations?.left,
    ).toBe('rocco-run-left');
    expect(
      definition.actions?.[ROCCO_PLAYER_CONFIG.ids.runAction]?.directionalAnimations?.right,
    ).toBe('rocco-run-right');
    expect(definition.actions?.idle?.directionalAnimations?.down).toBe('rocco-stand-down');
    expect(definition.actions?.idle?.directionalAnimations?.['up-right']).toBe(
      'rocco-stand-up-right',
    );
    expect(definition.render?.renderLayer).toBe('world.actors');
    expect(definition.render?.depthMode).toBe('baseline-sort');
    expect(definition.visibleDescription?.text).toBe('Rocco');
    expect(defaultDisplayProfile.crtMask).toBe(true);
  });

  it('makeDefaultWaterColorEffect returns the demo water post-process configuration', () => {
    const effect = makeDefaultWaterColorEffect();

    expect(effect.enabled).toBe(true);
    expect(effect.colors).toEqual([...PIER_WATER_EFFECT_COLORS]);
    expect(effect.tolerance).toBe(PIER_WATER_EFFECT_TOLERANCE);
    expect(effect.amplitude).toBeGreaterThan(0);
    expect(effect.wavelength).toBeGreaterThan(0);
    expect(effect.strength).toBeGreaterThan(0);
  });

  it('localizes the default Pelikan action menu to Spanish', () => {
    const localization = createRoccoLocalization('es');
    const menu = createDefaultActionMenuDefinition(localization);
    const state = makeEngineState();
    const engine = createEngineMock(state);

    expect(menu.items.map((item) => item.label)).toEqual(['Mirar', 'Hablar', 'Coger', 'Patear']);

    showDefaultPelikanSimpleReaction(engine, 'look', localization);

    expect(
      localization.text.pelikan.lookLines.some((line) =>
        state.spriteMessages.some((message) => message.includes(line)),
      ),
    ).toBe(true);
  });
});
