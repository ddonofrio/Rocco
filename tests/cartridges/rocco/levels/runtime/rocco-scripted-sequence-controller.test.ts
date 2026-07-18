import { describe, expect, it, vi } from 'vitest';

import { createRoccoLocalization } from '../../../../../src/cartridges/rocco/localization';
import { RoccoScriptedSequenceController } from '../../../../../src/cartridges/rocco/levels/runtime/rocco-scripted-sequence-controller';

function flushMicrotasks(): Promise<void> {
  return Promise.resolve();
}

function createMockEngine(options: { isMoving?: boolean }) {
  const acquiredLeases: string[] = [];
  const releasedLeases: string[] = [];
  const goTo = vi.fn(() => true);
  const playAction = vi.fn();
  const playAnimation = vi.fn();
  const clearCarriedItem = vi.fn();
  const closeGridMenu = vi.fn();
  const closeActionMenu = vi.fn();
  const playSound = vi.fn();
  const render = vi.fn();

  return {
    engine: {
      acquireInputLease(ownerId: string, mode: 'interactive' | 'advance-only' | 'blocked') {
        acquiredLeases.push(ownerId);
        return {
          ownerId,
          mode,
          acquiredAt: 0,
          dispose() {
            releasedLeases.push(ownerId);
          },
        };
      },
      video: {
        gridMenus: {
          clearCarriedItem,
          closeMenu: closeGridMenu,
        },
        actionMenus: {
          closeMenu: closeActionMenu,
        },
        sprites: {
          cancelMovement: vi.fn(),
          getSprite: vi.fn(() => ({ id: 'rocco' })),
          goTo,
          isMoving: vi.fn(() => options.isMoving ?? false),
          playAction,
          playAnimation,
        },
        messages: {
          clearMessages: vi.fn(),
          say: vi.fn(),
          think: vi.fn(),
        },
        primitives: {
          addPrimitive: vi.fn(),
          removePrimitive: vi.fn(),
        },
        titles: {
          addTitle: vi.fn(),
          removeTitle: vi.fn(),
        },
        render,
      },
      audio: {
        playSound,
        stopSound: vi.fn(),
      },
      log: vi.fn(),
    },
    state: {
      acquiredLeases,
      releasedLeases,
      goTo,
      playAction,
      playAnimation,
      clearCarriedItem,
      closeGridMenu,
      closeActionMenu,
      playSound,
      render,
    },
  };
}

describe('RoccoScriptedSequenceController', () => {
  it('releases the scripted-sequence lease after entering the bait shop through the pier door', async () => {
    const onEnterBaitShopRequested = vi.fn().mockResolvedValue(undefined);
    const controller = new RoccoScriptedSequenceController({
      localization: createRoccoLocalization('es'),
      onEnterBaitShopRequested,
      clearPendingExitIntent: vi.fn(),
      resolvePlayerGroundPoint: () => ({ x: 918, y: 360 }),
      doesPlayerOverlapBaitShopDoor: () => true,
      isStanAwake: () => false,
      baitShopDoorEndGroundX: 918,
    });
    const { engine, state } = createMockEngine({ isMoving: false });

    controller.startBaitShopDoorUse(engine as never, 'pier-start');

    expect(state.acquiredLeases).toContain('scripted-sequence');

    controller.updateBlockingSequence(engine as never, 16);
    await flushMicrotasks();

    expect(onEnterBaitShopRequested).toHaveBeenCalledTimes(1);
    expect(state.releasedLeases).toContain('scripted-sequence');
  });
});
