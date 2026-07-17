import { describe, expect, it } from 'vitest';

import type { RoccoSoundDefinition, RoccoSoundPlayOptions } from '../../../../../src/console/audio/types';
import type { RoccoEngine } from '../../../../../src/console/engine-sdk';
import type {
  RoccoActionMenuActivation,
  RoccoActionMenuDefinition,
} from '../../../../../src/console/video/action-menu';
import type { RoccoSpriteInstance } from '../../../../../src/console/video/sprites';
import {
  DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID,
} from '../../../../../src/cartridges/rocco/rocco-default-constants';
import { installDefaultBaitBucket } from '../../../../../src/cartridges/rocco/levels/pier/pier-bait-bucket';

interface TestState {
  isSpriteMovingValue: boolean;
  registeredSounds: Map<string, RoccoSoundDefinition>;
  playedSounds: Array<{ soundId: string; options?: RoccoSoundPlayOptions }>;
}

function createState(): TestState {
  return {
    isSpriteMovingValue: false,
    registeredSounds: new Map(),
    playedSounds: [],
  };
}

function makeKickActivation(): RoccoActionMenuActivation {
  return {
    definitionId: 'test-bait-bucket-menu',
    targetInstanceId: DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID,
    targetDefinitionId: 'rocco-bait-bucket',
    itemId: 'kick',
    actionId: 'kick',
  };
}

function createEngineMock(state: TestState): RoccoEngine {
  return {
    video: {
      preloadSpriteDefinition: () => Promise.resolve(),
      render: () => {},
      actionMenus: {
        registerMenu: (_definition: RoccoActionMenuDefinition) => {},
        unregisterMenu: () => {},
        closeMenu: () => {},
      },
      messages: {
        think: () => {},
      } as unknown as RoccoEngine['video']['messages'],
      sprites: {
        loadSpriteDefinition: () => {},
        removeSprite: () => {},
        createSpriteFromDefinition: (definitionId: string, options?: Partial<RoccoSpriteInstance>) =>
          ({
            id: options?.id ?? definitionId,
            definitionId,
            transform: {
              x: options?.transform?.x ?? 0,
              y: options?.transform?.y ?? 0,
              scaleX: options?.transform?.scaleX ?? 1,
              scaleY: options?.transform?.scaleY ?? 1,
              rotation: options?.transform?.rotation ?? 0,
              flipX: false,
              flipY: false,
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
            interactive: true,
            collisionEnabled: true,
            renderLayer: options?.renderLayer ?? 'world.actors',
            zIndex: options?.zIndex ?? 0,
            depthMode: options?.depthMode ?? 'baseline-sort',
            opacity: options?.opacity ?? 1,
            visibleDescription: options?.visibleDescription,
          }) as RoccoSpriteInstance,
        moveTo: () => {},
        isMoving: () => state.isSpriteMovingValue,
        playAction: () => {},
        setPosition: () => {},
        playAnimation: () => {},
      } as unknown as RoccoEngine['video']['sprites'],
    } as unknown as RoccoEngine['video'],
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
    } as unknown as RoccoEngine['audio'],
    setInputEnabled: () => {},
    acquireInputLease: () => ({
      ownerId: 'test',
      mode: 'blocked' as const,
      acquiredAt: 0,
      dispose() {},
    }),
  } as unknown as RoccoEngine;
}

describe('installDefaultBaitBucket', () => {
  it('plays the kick sound at a quarter of the previous volume', async () => {
    const state = createState();
    const engine = createEngineMock(state);
    const controller = await installDefaultBaitBucket(engine);

    expect(state.registeredSounds.get('rocco-bait-bucket-kick-sound')).toMatchObject({
      volume: 0.125,
      loop: false,
    });

    controller.handleAction(makeKickActivation());
    state.isSpriteMovingValue = false;
    controller.update(16);

    expect(state.playedSounds).toContainEqual({
      soundId: 'rocco-bait-bucket-kick-sound',
      options: {
        restart: true,
        volume: 0.125,
      },
    });
  });
});
