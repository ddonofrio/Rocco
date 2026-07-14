import { describe, expect, it } from 'vitest';

import type { RoccoRuntimeAudioSystem } from '../../src/console/audio';
import type { RoccoJukeboxSystem } from '../../src/console/audio/jukebox';
import type { RoccoCartridge } from '../../src/console/cartridges';
import { ActionDispatcher } from '../../src/console/action-dispatcher';
import type {
  RoccoCursorActionEvent,
  RoccoCursorActionHandler,
} from '../../src/console/video/cursor';
import type { RoccoViewportHost } from '../../src/console/video/viewport';
import { RoccoInputHandler } from '../../src/console/input-handler';

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
        return;
      },
      closeMenu() {
        // noop
      },
      getHoveredItem() {
        return;
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
        return;
      },
      clearCarriedItem() {
        // noop
      },
      getCarriedItem() {
        return;
      },
      getHoveredItem() {
        return;
      },
      getRenderableMenu() {
        return;
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
        return;
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

function makeCartridge(handleAction: RoccoCartridge['handleAction']): RoccoCartridge {
  return {
    manifest: {
      id: 'test-cartridge',
      title: 'Test Cartridge',
      version: '1.0.0',
    },
    mount() {
      // noop
    },
    handleAction,
  };
}

describe('RoccoInputHandler characterization', () => {
  it('CON-001: actions are dispatched through the ActionDispatcher and return a synchronous disposition', () => {
    let isHandleActionCalled = false;

    const cartridge = makeCartridge((_action, _context) => {
      isHandleActionCalled = true;
      return { consumed: true, defaultPlayerMovement: 'allow' };
    });

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
      actionDispatcher: new ActionDispatcher({
        getActiveCartridge: () => cartridge,
        getActiveLevelId: () => null,
        log: () => {},
      }),
      log: () => {},
    });

    handler.mount();

    if (!storedHandler) {
      throw new Error('action handler was not registered');
    }

    storedHandler(makeClickEvent(320, 180));

    expect(isHandleActionCalled).toBe(true);
  });

  it('CON-001: a second click is dropped while an exclusive action completion is still in flight', () => {
    const handledActions: unknown[] = [];
    let resolveCompletion: () => void = () => {};
    const completion = new Promise<void>((resolve) => {
      resolveCompletion = resolve;
    });

    const cartridge = makeCartridge((action) => {
      handledActions.push(action);
      return { consumed: true, defaultPlayerMovement: 'allow', completion };
    });

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
      actionDispatcher: new ActionDispatcher({
        getActiveCartridge: () => cartridge,
        getActiveLevelId: () => null,
        log: () => {},
      }),
      log: () => {},
    });

    handler.mount();

    if (!storedHandler) {
      throw new Error('action handler was not registered');
    }

    storedHandler(makeClickEvent(320, 180));
    storedHandler(makeClickEvent(340, 190));

    expect(handledActions).toHaveLength(1);

    resolveCompletion();
  });
});
