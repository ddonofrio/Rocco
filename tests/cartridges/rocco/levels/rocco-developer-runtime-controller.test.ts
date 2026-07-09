import { describe, expect, it, vi } from 'vitest';

import { createRoccoLocalization } from '../../../../src/cartridges/rocco/localization';
import { RoccoInventory } from '../../../../src/cartridges/rocco/inventory';
import {
  ROCCO_DEVELOPER_CYCLE_SPRITE_CHOICE_ID,
  ROCCO_DEVELOPER_ROOT_MENU_ID,
  ROCCO_DEVELOPER_SCREEN_MENU_ID,
} from '../../../../src/cartridges/rocco/rocco-developer-mode';
import {
  ROCCO_PLAYER_ACTION_MENU_ID,
  ROCCO_PLAYER_DEVELOPER_ACTION_ID,
} from '../../../../src/cartridges/rocco/rocco-player-action-menu';
import { RoccoDeveloperRuntimeController } from '../../../../src/cartridges/rocco/levels/runtime/rocco-developer-runtime-controller';
import { ROCCO_NETHER_RESET_OFFICE_LEVEL_ID } from '../../../../src/cartridges/rocco/levels/nether/nether-reset-office-level';
import { DEFAULT_SPRITE_INSTANCE_ID } from '../../../../src/cartridges/rocco/rocco-default-constants';
import type { RoccoEngine } from '../../../../src/engine/engine-sdk';
import type {
  RoccoSpriteDefinition,
  RoccoSpriteInstance,
} from '../../../../src/engine/video/sprites';

interface DeveloperEngineState {
  cursorAttachment: { imageUri: string } | undefined;
  inputEnabledChanges: boolean[];
  openedGridMenuIds: string[];
  closedGridMenuCount: number;
  renderCalls: number;
  titleRemovals: string[];
  playAnimationCalls: Array<{ instanceId: string; animationId: string }>;
  playActionCalls: Array<{ instanceId: string; actionId: string }>;
  setAnimationFrameCalls: Array<{ instanceId: string; frameIndex: number }>;
}

function createSpriteDefinition(definitionId = 'test-sprite-definition'): RoccoSpriteDefinition {
  return {
    id: definitionId,
    images: [
      {
        id: `${definitionId}:image-0`,
        width: 16,
        height: 24,
      },
      {
        id: `${definitionId}:image-1`,
        width: 18,
        height: 24,
      },
    ],
    frames: [
      {
        id: `${definitionId}:frame-0`,
        imageId: `${definitionId}:image-0`,
        durationMs: 1000,
        pivot: { x: 8, y: 24 },
      },
    ],
    animations: {
      idle: {
        id: 'idle',
        loop: true,
        playbackRate: 1,
        frames: [
          {
            frameId: `${definitionId}:frame-0`,
            durationMs: 1000,
          },
        ],
      },
    },
    defaultAnimation: 'idle',
    pivot: { x: 8, y: 24 },
    hitbox: {
      kind: 'rect',
      x: 0,
      y: 0,
      width: 16,
      height: 24,
    },
  };
}

function createSprite(
  definitionId = 'test-sprite-definition',
  instanceId = DEFAULT_SPRITE_INSTANCE_ID,
): RoccoSpriteInstance {
  return {
    id: instanceId,
    definitionId,
    transform: {
      x: 120,
      y: 220,
      scaleX: 1,
      scaleY: 1,
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
      frameIndex: 2,
      elapsedMs: 0,
      playing: false,
      playbackRate: 1,
    },
    facing: 'left',
    visible: true,
    enabled: true,
    interactive: true,
    collisionEnabled: false,
    renderLayer: 'world.main',
    zIndex: 1,
    opacity: 1,
  };
}

function createDeveloperEngine(
  sprite = createSprite(),
  definition = createSpriteDefinition(sprite.definitionId),
): { engine: RoccoEngine; state: DeveloperEngineState } {
  const sprites = new Map([[sprite.id, sprite]]);
  const definitions = new Map([[definition.id, definition]]);
  const state: DeveloperEngineState = {
    cursorAttachment: { imageUri: 'cursor-before-cycle.png' },
    inputEnabledChanges: [],
    openedGridMenuIds: [],
    closedGridMenuCount: 0,
    renderCalls: 0,
    titleRemovals: [],
    playAnimationCalls: [],
    playActionCalls: [],
    setAnimationFrameCalls: [],
  };

  const engine = {
    video: {
      actionMenus: {
        closeMenu: () => {},
      },
      gridMenus: {
        openMenu: (definitionArg: { id: string }) => {
          state.openedGridMenuIds.push(definitionArg.id);
        },
        closeMenu: () => {
          state.closedGridMenuCount += 1;
        },
      },
      messages: {
        clearMessages: () => {},
      },
      viewport: {
        getHost: () => ({
          getCursorAttachment: () => state.cursorAttachment,
          setCursorAttachment: (attachment?: { imageUri: string }) => {
            state.cursorAttachment = attachment;
          },
        }),
      },
      titles: {
        addTitle: () => {},
        removeTitle: (titleId: string) => {
          state.titleRemovals.push(titleId);
        },
      },
      sprites: {
        getSprite: (instanceId: string) => sprites.get(instanceId),
        getSpriteDefinition: (definitionId: string) => definitions.get(definitionId),
        loadSpriteDefinition: (nextDefinition: RoccoSpriteDefinition) => {
          definitions.set(nextDefinition.id, nextDefinition);
        },
        playAnimation: (instanceId: string, animationId: string, options?: { playbackRate?: number }) => {
          const target = sprites.get(instanceId);
          if (!target) {
            return;
          }

          target.animation.animationId = animationId;
          target.animation.playing = true;
          if (options?.playbackRate) {
            target.animation.playbackRate = options.playbackRate;
          }
          state.playAnimationCalls.push({ instanceId, animationId });
        },
        playAction: (instanceId: string, actionId: string) => {
          const target = sprites.get(instanceId);
          if (!target) {
            return;
          }

          target.action = {
            actionId,
            direction: 'left',
          };
          state.playActionCalls.push({ instanceId, actionId });
        },
        setAnimationFrame: (instanceId: string, frameIndex: number) => {
          const target = sprites.get(instanceId);
          if (!target) {
            return;
          }

          target.animation.frameIndex = frameIndex;
          state.setAnimationFrameCalls.push({ instanceId, frameIndex });
        },
        stopAnimation: (instanceId: string) => {
          const target = sprites.get(instanceId);
          if (target) {
            target.animation.playing = false;
          }
        },
        setFacing: (instanceId: string, facing: RoccoSpriteInstance['facing']) => {
          const target = sprites.get(instanceId);
          if (target) {
            target.facing = facing;
          }
        },
        stopMovement: () => {},
        setPosition: (instanceId: string, x: number, y: number) => {
          const target = sprites.get(instanceId);
          if (target) {
            target.transform.x = x;
            target.transform.y = y;
          }
        },
      },
      render: () => {
        state.renderCalls += 1;
      },
    },
    setInputEnabled: (enabled: boolean) => {
      state.inputEnabledChanges.push(enabled);
    },
    isDeveloperModeEnabled: () => true,
    log: vi.fn(),
  } as unknown as RoccoEngine;

  return { engine, state };
}

function createController(overrides?: Partial<ConstructorParameters<typeof RoccoDeveloperRuntimeController>[0]>) {
  const localization = createRoccoLocalization('en');
  return new RoccoDeveloperRuntimeController({
    localization,
    inventory: new RoccoInventory(),
    resolveLevelTitle: (levelId) => levelId,
    switchToLevel: () => Promise.resolve(true),
    canCollectInventoryItem: () => true,
    refreshStatus: () => {},
    ...overrides,
  });
}

describe('RoccoDeveloperRuntimeController', () => {
  it('opens the developer root menu from the player action', () => {
    const controller = createController();
    const { engine, state } = createDeveloperEngine();

    const handled = controller.handlePlayerAction(engine, {
      definitionId: ROCCO_PLAYER_ACTION_MENU_ID,
      targetInstanceId: DEFAULT_SPRITE_INSTANCE_ID,
      targetDefinitionId: 'rocco-player',
      itemId: 'developer-mode',
      actionId: ROCCO_PLAYER_DEVELOPER_ACTION_ID,
    });

    expect(handled).toBe(true);
    expect(state.openedGridMenuIds).toEqual([ROCCO_DEVELOPER_ROOT_MENU_ID]);
  });

  it('keeps jump placement pending after switching to Reset Office', async () => {
    const switchToLevel = vi.fn(() => Promise.resolve(true));
    const controller = createController({
      switchToLevel,
    });
    const { engine, state } = createDeveloperEngine();

    const handled = controller.handleGridMenuAction(engine, {
      kind: 'grid-menu',
      definitionId: ROCCO_DEVELOPER_SCREEN_MENU_ID,
      interaction: 'activate',
      itemId: ROCCO_NETHER_RESET_OFFICE_LEVEL_ID,
      items: [],
    });

    expect(handled).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(switchToLevel).toHaveBeenCalledWith(ROCCO_NETHER_RESET_OFFICE_LEVEL_ID);
    expect(controller.isJumpPending).toBe(true);
    expect(state.inputEnabledChanges.at(-1)).toBe(false);
  });

  it('restores the original sprite animation state when cycle-sprite mode is cancelled', () => {
    const controller = createController();
    const sprite = createSprite('cycle-target-definition', 'cycle-target');
    const definition = createSpriteDefinition(sprite.definitionId);
    const { engine, state } = createDeveloperEngine(sprite, definition);

    controller.handleGridMenuAction(engine, {
      kind: 'grid-menu',
      definitionId: ROCCO_DEVELOPER_ROOT_MENU_ID,
      interaction: 'activate',
      itemId: ROCCO_DEVELOPER_CYCLE_SPRITE_CHOICE_ID,
      items: [],
    });

    expect(controller.isSpriteCycleActive).toBe(true);

    controller.handleSceneClick(engine, {
      kind: 'scene-click',
      sceneX: 140,
      sceneY: 200,
      targetInstanceId: sprite.id,
    });

    expect(state.playAnimationCalls.some((call) => call.animationId === '__rocco-developer-sprite-cycle__')).toBe(true);
    expect(state.cursorAttachment?.imageUri).not.toBe('cursor-before-cycle.png');

    controller.handleSceneClick(engine, {
      kind: 'scene-click',
      sceneX: 12,
      sceneY: 14,
    });

    expect(controller.isSpriteCycleActive).toBe(false);
    expect(state.cursorAttachment).toEqual({ imageUri: 'cursor-before-cycle.png' });
    expect(state.playAnimationCalls.at(-1)).toEqual({
      instanceId: sprite.id,
      animationId: 'idle',
    });
    expect(state.setAnimationFrameCalls.at(-1)).toEqual({
      instanceId: sprite.id,
      frameIndex: 2,
    });
    expect(state.titleRemovals).toEqual(
      expect.arrayContaining([
        'rocco-developer-sprite-cycle-top-title',
        'rocco-developer-sprite-cycle-sprite-title',
      ]),
    );
  });
});
