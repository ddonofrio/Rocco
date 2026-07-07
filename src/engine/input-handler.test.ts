import { describe, expect, it } from 'vitest';

import type { RoccoRuntimeAudioSystem } from './audio';
import type { RoccoJukeboxSystem } from './audio/jukebox';
import type { RoccoCartridge } from './cartridges';
import type { RoccoRuntimeVideoSystem } from './video';
import type {
  RoccoCursorActionEvent,
  RoccoCursorActionHandler,
  RoccoCursorMoveEvent,
  RoccoCursorLeaveHandler,
  RoccoCursorMoveHandler,
} from './video/cursor';
import type { RoccoViewportHost } from './video/viewport';
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

function asVideoSystem(mock: unknown): RoccoRuntimeVideoSystem {
  return mock as RoccoRuntimeVideoSystem;
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
    videoSystem: asVideoSystem({
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
    }),
    audioSystem: asAudioSystem({
      unlock() {
        state.audioUnlockCalls += 1;
      },
    }),
    jukeboxSystem: asJukeboxSystem({
      unlock() {
        state.jukeboxUnlockCalls += 1;
      },
    }),
    viewportHost: asViewportHost({
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
    }),
    getActiveCartridge: () => cartridge,
    getActivePlayerSpriteId: () => 'rocco',
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
      videoSystem: asVideoSystem({
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
      }),
      audioSystem: asAudioSystem({}),
      jukeboxSystem: asJukeboxSystem({}),
      viewportHost: asViewportHost({
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
            viewportWidth: 960,
            viewportHeight: 540,
            designWidth: 960,
            designHeight: 540,
            scale: 1,
            renderWidth: 960,
            renderHeight: 540,
            offsetX: 0,
            offsetY: 0,
          };
        },
      }),
      getActiveCartridge: () => null,
      getActivePlayerSpriteId: () => null,
      log: () => {},
    });

    handler.mount();
    moveHandler?.(makeMoveEvent(320, 180));
    moveHandler?.(makeMoveEvent(320, 180));

    expect(addedTitles).toEqual(['Shell City']);
    expect(renderCalls).toBe(1);
  });

  it('dispatches a grid-menu close activation on cursor leave before clearing the carried item', () => {
    let leaveHandler: RoccoCursorLeaveHandler | undefined;
    let clearCarriedItemCalls = 0;
    let renderCalls = 0;
    const handledActions: unknown[] = [];
    const activationCalls: Array<[number, number]> = [];

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
      },
    };

    const handler = new RoccoInputHandler({
      videoSystem: asVideoSystem({
        render() {
          renderCalls += 1;
        },
        gridMenus: {
          isOpen() {
            return true;
          },
          activateAt(x: number, y: number) {
            activationCalls.push([x, y]);
            return {
              kind: 'grid-menu',
              definitionId: 'rocco-storage-transfer-menu:test',
              interaction: 'close',
              items: [],
            };
          },
          clearCarriedItem() {
            clearCarriedItemCalls += 1;
          },
          getCarriedItem() {
            return {
              definitionId: 'rocco-storage-transfer-menu:test',
              item: {
                id: 'souvenir-sea-dollar',
                label: 'Sea Dollar',
                imageUri: '/test/sea-dollar.png',
              },
            };
          },
        },
        actionMenus: {
          isOpen() {
            return false;
          },
        },
      }),
      audioSystem: asAudioSystem({}),
      jukeboxSystem: asJukeboxSystem({}),
      viewportHost: asViewportHost({
        setCursorActionHandler() {
          // noop
        },
        setCursorMoveHandler() {
          // noop
        },
        setCursorLeaveHandler(handler: RoccoCursorLeaveHandler | undefined) {
          leaveHandler = handler;
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
    leaveHandler?.();

    expect(activationCalls).toEqual([[-1, -1]]);
    expect(handledActions).toEqual([
      {
        kind: 'grid-menu',
        definitionId: 'rocco-storage-transfer-menu:test',
        interaction: 'close',
        items: [],
      },
    ]);
    expect(clearCarriedItemCalls).toBe(1);
    expect(renderCalls).toBe(1);
  });
});
