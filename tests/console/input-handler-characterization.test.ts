import { describe, expect, it, vi } from 'vitest';

import type { RoccoRuntimeAudioSystem } from '../../src/console/audio';
import type { RoccoJukeboxSystem } from '../../src/console/audio/jukebox';
import type { RoccoCartridge } from '../../src/console/cartridges';
import type {
  RoccoCursorActionEvent,
  RoccoCursorActionHandler,
} from '../../src/console/video/cursor';
import type { RoccoViewportHost } from '../../src/console/viewport';
import { RoccoInputHandler } from '../../src/console/input-handler';

interface InputHandlerTestState {
  actionHandler: RoccoCursorActionHandler | undefined;
  messageListCalls: number;
  handledActions: unknown[];
  audioUnlockCalls: number;
  jukeboxUnlockCalls: number;
  logs: string[];
}

type InputHandlerVideoSystem = ConstructorParameters<typeof RoccoInputHandler>[0]['videoSystem'];

function makeClickEvent(sceneX: number, sceneY: number): RoccoCursorActionEvent {
  return {
    kind: 'click',
    button: 0,
    viewportX: sceneX,
    viewportY: sceneY,
    sceneX,
    sceneY,
    originalEvent: {} as PointerEvent,
  };
}

function createVideoSystemMock(overrides: Partial<InputHandlerVideoSystem> = {}): InputHandlerVideoSystem {
  return {
    render() {
      // noop
    },
    resolveSceneTargets() {
      return {
        visibleTarget: undefined,
        target: undefined,
      };
    },
    actionMenus: {
      activateAt() {
        return undefined;
      },
      closeMenu() {
        // noop
      },
      getHoveredItem() {
        return undefined;
      },
      isOpen() {
        return false;
      },
      openMenuForTarget() {
        return false;
      },
      setHoverAt() {
        return false;
      },
    },
    gridMenus: {
      activateAt() {
        return undefined;
      },
      clearCarriedItem() {
        // noop
      },
      getCarriedItem() {
        return undefined;
      },
      getHoveredItem() {
        return undefined;
      },
      getRenderableMenu() {
        return undefined;
      },
      isOpen() {
        return false;
      },
      setHoverAt() {
        return false;
      },
    },
    messages: {
      listMessages() {
        return [];
      },
      removeMessage() {
        // noop
      },
    },
    sceneTargets: {
      getTarget() {
        return undefined;
      },
    },
    sprites: {
      goTo() {
        return false;
      },
    },
    titles: {
      addTitle() {
        // noop
      },
      removeTitle() {
        // noop
      },
    },
    ...overrides,
  };
}

function asAudioSystem(mock: unknown): RoccoRuntimeAudioSystem {
  return mock as RoccoRuntimeAudioSystem;
}

function asJukeboxSystem(mock: unknown): RoccoJukeboxSystem {
  return mock as RoccoJukeboxSystem;
}

function asViewportHost(mock: unknown): RoccoViewportHost {
  return mock as RoccoViewportHost;
}

describe('RoccoInputHandler characterization', () => {
  it('CON-001: handleAction is dispatched synchronously and its promise return value is discarded', () => {
    let handleActionCalled = false;
    let returnedPromise: Promise<void> | undefined;

    const cartridge: RoccoCartridge = {
      manifest: {
        id: 'test-cartridge',
        title: 'Test Cartridge',
        version: '1.0.0',
      },
      mount() {
        // noop
      },
      handleAction(action) {
        handleActionCalled = true;
        returnedPromise = Promise.resolve();
        return returnedPromise;
      },
    };

    let storedHandler: RoccoCursorActionHandler | undefined;

    const handler = new RoccoInputHandler({
      videoSystem: createVideoSystemMock(),
      audioSystem: asAudioSystem({ unlock() {} }),
      jukeboxSystem: asJukeboxSystem({ unlock() {} }),
      viewportHost: asViewportHost({
        setCursorActionHandler(h: RoccoCursorActionHandler | undefined) {
          storedHandler = h;
        },
        setCursorMoveHandler() {
          // noop
        },
        setCursorLeaveHandler() {
          // noop
        },
        setCursorAttachment() {
          // noop
        },
      }),
      getActiveCartridge: () => cartridge,
      getActivePlayerSpriteId: () => null,
      log: () => {},
    });

    handler.mount();

    if (!storedHandler) {
      throw new Error('action handler was not registered');
    }

    storedHandler(makeClickEvent(320, 180));

    expect(handleActionCalled).toBe(true);
    expect(returnedPromise).toBeInstanceOf(Promise);
  });

  it('CON-001: two rapid clicks dispatch both actions without serialization', () => {
    const handledActions: unknown[] = [];

    const cartridge: RoccoCartridge = {
      manifest: {
        id: 'test-cartridge',
        title: 'Test Cartridge',
        version: '1.0.0',
      },
      mount() {
        // noop
      },
      handleAction(action) {
        handledActions.push(action);
        return { suppressDefaultPlayerMove: true };
      },
    };

    let storedHandler: RoccoCursorActionHandler | undefined;

    const handler = new RoccoInputHandler({
      videoSystem: createVideoSystemMock(),
      audioSystem: asAudioSystem({ unlock() {} }),
      jukeboxSystem: asJukeboxSystem({ unlock() {} }),
      viewportHost: asViewportHost({
        setCursorActionHandler(h: RoccoCursorActionHandler | undefined) {
          storedHandler = h;
        },
        setCursorMoveHandler() {
          // noop
        },
        setCursorLeaveHandler() {
          // noop
        },
        setCursorAttachment() {
          // noop
        },
      }),
      getActiveCartridge: () => cartridge,
      getActivePlayerSpriteId: () => null,
      log: () => {},
    });

    handler.mount();

    if (!storedHandler) {
      throw new Error('action handler was not registered');
    }

    storedHandler(makeClickEvent(320, 180));
    storedHandler(makeClickEvent(340, 190));

    expect(handledActions).toHaveLength(2);
  });
});
