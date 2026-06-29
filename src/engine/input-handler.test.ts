import { describe, expect, it, vi } from 'vitest';

import type { RoccoCartridge } from './cartridges';
import type {
  RoccoCursorActionEvent,
  RoccoCursorActionHandler,
  RoccoCursorMoveEvent,
  RoccoCursorMoveHandler,
} from './video/cursor';
import { RoccoInputHandler } from './input-handler';

interface InputHandlerTestState {
  actionHandler: RoccoCursorActionHandler | undefined;
  clearMessagesCalls: number;
  handledActions: unknown[];
  audioUnlockCalls: number;
  jukeboxUnlockCalls: number;
  logs: string[];
}

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

function makeMoveEvent(sceneX: number, sceneY: number): RoccoCursorMoveEvent {
  return {
    kind: 'move',
    viewportX: sceneX,
    viewportY: sceneY,
    sceneX,
    sceneY,
    originalEvent: {} as PointerEvent,
  };
}

function createInputHandler(state: InputHandlerTestState): RoccoInputHandler {
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
      state.handledActions.push(action);
    },
  };

  return new RoccoInputHandler({
    videoSystem: {
      messages: {
        clearMessages() {
          state.clearMessagesCalls += 1;
        },
      },
      sprites: {
        hitTestVisiblePixel() {
          return [
            {
              instanceId: 'stan',
              definitionId: 'stan-definition',
              text: 'Stan',
            },
          ];
        },
        hitTest() {
          return [];
        },
      },
    } as any,
    audioSystem: {
      unlock() {
        state.audioUnlockCalls += 1;
      },
    } as any,
    jukeboxSystem: {
      unlock() {
        state.jukeboxUnlockCalls += 1;
      },
    } as any,
    viewportHost: {
      setCursorActionHandler(handler: RoccoCursorActionHandler | undefined) {
        state.actionHandler = handler;
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
    } as any,
    getActiveCartridge: () => cartridge,
    getActivePlayerSpriteId: () => 'rocco',
    showSpriteMessage: vi.fn(),
    log: (channel, message) => {
      state.logs.push(`${channel}:${message}`);
    },
  });
}

describe('RoccoInputHandler', () => {
  it('still dispatches scene clicks while input is disabled so dialogue flows can advance', () => {
    const state: InputHandlerTestState = {
      actionHandler: undefined,
      clearMessagesCalls: 0,
      handledActions: [],
      audioUnlockCalls: 0,
      jukeboxUnlockCalls: 0,
      logs: [],
    };
    const handler = createInputHandler(state);
    handler.mount();
    handler.setInputEnabled(false);

    state.actionHandler?.(makeClickEvent(320, 180));

    expect(state.handledActions).toEqual([
      {
        kind: 'scene-click',
        sceneX: 320,
        sceneY: 180,
        targetInstanceId: 'stan',
        targetDefinitionId: 'stan-definition',
      },
    ]);
    expect(state.clearMessagesCalls).toBe(0);
    expect(state.audioUnlockCalls).toBe(0);
    expect(state.jukeboxUnlockCalls).toBe(0);
    expect(state.logs.at(-1)).toContain("ADVANCE click on sprite 'stan'");
  });

  it('shows hover descriptions for visible scene targets', () => {
    let moveHandler: RoccoCursorMoveHandler | undefined;
    const addedTitles: string[] = [];
    let renderCalls = 0;

    const handler = new RoccoInputHandler({
      videoSystem: {
        render() {
          renderCalls += 1;
        },
        titles: {
          addTitle(title: { text: string }) {
            addedTitles.push(title.text);
          },
          removeTitle() {
            // noop
          },
        },
        gridMenus: {
          isOpen() {
            return false;
          },
        },
        actionMenus: {
          isOpen() {
            return false;
          },
        },
        sprites: {
          hitTestVisiblePixel() {
            return [];
          },
          hitTest() {
            return [];
          },
        },
        sceneTargets: {
          hitTestVisible() {
            return [
              {
                instanceId: 'shell-city-sign-target',
                definitionId: 'shell-city-sign',
                text: 'Shell City',
                priority: 24,
              },
            ];
          },
          hitTest() {
            return [];
          },
        },
      } as any,
      audioSystem: {} as any,
      jukeboxSystem: {} as any,
      viewportHost: {
        setCursorActionHandler() {
          // noop
        },
        setCursorMoveHandler(handler: RoccoCursorMoveHandler | undefined) {
          moveHandler = handler;
        },
        setCursorLeaveHandler() {
          // noop
        },
        setCursorAttachment() {
          // noop
        },
        getMetrics() {
          return {
            designWidth: 960,
            designHeight: 540,
          };
        },
      } as any,
      getActiveCartridge: () => null,
      getActivePlayerSpriteId: () => null,
      showSpriteMessage: vi.fn(),
      log: () => {},
    });

    handler.mount();
    moveHandler?.(makeMoveEvent(320, 180));
    moveHandler?.(makeMoveEvent(320, 180));

    expect(addedTitles).toEqual(['Shell City']);
    expect(renderCalls).toBe(1);
  });
});
