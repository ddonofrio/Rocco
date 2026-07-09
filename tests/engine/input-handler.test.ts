import { describe, expect, it } from 'vitest';

import type { RoccoRuntimeAudioSystem } from '../../src/engine/audio';
import type { RoccoJukeboxSystem } from '../../src/engine/audio/jukebox';
import type { RoccoCartridge } from '../../src/engine/cartridges';
import type {
  RoccoCursorActionEvent,
  RoccoCursorActionHandler,
  RoccoCursorMoveEvent,
  RoccoCursorLeaveHandler,
  RoccoCursorMoveHandler,
} from '../../src/engine/video/cursor';
import type { RoccoViewportHost } from '../../src/engine/video/viewport';
import { RoccoInputHandler } from '../../src/engine/input-handler';

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
    videoSystem: createVideoSystemMock({
      resolveSceneTargets() {
        return {
          visibleTarget: {
            kind: 'sprite',
            instanceId: 'stan',
            definitionId: 'stan-definition',
            text: 'Stan',
          },
          target: undefined,
        };
      },
      messages: {
        listMessages() {
          state.messageListCalls += 1;
          return [];
        },
        removeMessage() {
          // noop
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
      messageListCalls: 0,
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
    expect(state.messageListCalls).toBe(0);
    expect(state.audioUnlockCalls).toBe(0);
    expect(state.jukeboxUnlockCalls).toBe(0);
    expect(state.logs.at(-1)).toContain("ADVANCE click on sprite 'stan'");
  });

  it('shows hover descriptions for visible scene targets', () => {
    let moveHandler: RoccoCursorMoveHandler | undefined;
    const addedTitles: string[] = [];
    let renderCalls = 0;

    const handler = new RoccoInputHandler({
      videoSystem: createVideoSystemMock({
        render() {
          renderCalls += 1;
        },
        resolveSceneTargets() {
          return {
            visibleTarget: {
              kind: 'scene-target',
              instanceId: 'shell-city-sign-target',
              definitionId: 'shell-city-sign',
              text: 'Shell City',
            },
            target: undefined,
          };
        },
        titles: {
          addTitle(title: { text: string }) {
            addedTitles.push(title.text);
          },
          removeTitle() {
            // noop
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
    const cursorAttachments: unknown[] = [];
    let carriedItem:
      | {
          definitionId: string;
          item: {
            id: string;
            label: string;
            imageUri: string;
          };
        }
      | undefined = {
      definitionId: 'rocco-storage-transfer-menu:test',
      item: {
        id: 'souvenir-sea-dollar',
        label: 'Sea Dollar',
        imageUri: '/test/sea-dollar.png',
      },
    };

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
      videoSystem: createVideoSystemMock({
        render() {
          renderCalls += 1;
        },
        gridMenus: {
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
            carriedItem = undefined;
          },
          getCarriedItem() {
            return carriedItem;
          },
          getHoveredItem() {
            return undefined;
          },
          getRenderableMenu() {
            return undefined;
          },
          isOpen() {
            return true;
          },
          setHoverAt() {
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
        setCursorAttachment(attachment: unknown) {
          cursorAttachments.push(attachment);
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
    expect(cursorAttachments).toEqual([undefined]);
    expect(renderCalls).toBe(1);
  });

  it('syncs carried grid items into the viewport cursor attachment after grid-menu actions', () => {
    let actionHandler: RoccoCursorActionHandler | undefined;
    const cursorAttachments: unknown[] = [];

    const handler = new RoccoInputHandler({
      videoSystem: createVideoSystemMock({
        gridMenus: {
          activateAt() {
            return {
              kind: 'grid-menu',
              definitionId: 'rocco-storage-transfer-menu:test',
              interaction: 'activate',
              itemId: 'souvenir-sea-dollar',
              items: [],
            };
          },
          clearCarriedItem() {
            // noop
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
          getHoveredItem() {
            return undefined;
          },
          getRenderableMenu() {
            return undefined;
          },
          isOpen() {
            return true;
          },
          setHoverAt() {
            return false;
          },
        },
      }),
      audioSystem: asAudioSystem({}),
      jukeboxSystem: asJukeboxSystem({}),
      viewportHost: asViewportHost({
        setCursorActionHandler(handler: RoccoCursorActionHandler | undefined) {
          actionHandler = handler;
        },
        setCursorMoveHandler() {
          // noop
        },
        setCursorLeaveHandler() {
          // noop
        },
        setCursorAttachment(attachment: unknown) {
          cursorAttachments.push(attachment);
        },
      }),
      getActiveCartridge: () => null,
      getActivePlayerSpriteId: () => null,
      log: () => {},
    });

    handler.mount();
    actionHandler?.(makeClickEvent(320, 180));

    expect(cursorAttachments).toEqual([
      {
        imageUri: '/test/sea-dollar.png',
        label: 'Sea Dollar',
        size: 46,
      },
    ]);
  });

  it('suppresses default player movement through the runtime policy seam when a scene target opts out', () => {
    let actionHandler: RoccoCursorActionHandler | undefined;
    const goToCalls: Array<{
      instanceId: string;
      sceneX: number;
      sceneY: number;
      options: unknown;
    }> = [];
    const handledActions: unknown[] = [];

    const handler = new RoccoInputHandler({
      videoSystem: createVideoSystemMock({
        resolveSceneTargets() {
          return {
            visibleTarget: {
              kind: 'scene-target',
              instanceId: 'bait-shop-door-target',
              definitionId: 'bait-shop-door',
              text: 'Door',
            },
            target: undefined,
          };
        },
        actionMenus: {
          ...createVideoSystemMock().actionMenus,
          openMenuForTarget() {
            return true;
          },
        },
        sceneTargets: {
          getTarget() {
            return {
              instanceId: 'bait-shop-door-target',
              definitionId: 'bait-shop-door',
              shape: {
                kind: 'rect',
                x: 280,
                y: 140,
                width: 100,
                height: 180,
              },
              suppressDefaultPlayerMove: true,
            };
          },
        },
        sprites: {
          goTo(instanceId, sceneX, sceneY, options) {
            goToCalls.push({ instanceId, sceneX, sceneY, options });
            return true;
          },
        },
      }),
      audioSystem: asAudioSystem({ unlock() {} }),
      jukeboxSystem: asJukeboxSystem({ unlock() {} }),
      viewportHost: asViewportHost({
        setCursorActionHandler(handler: RoccoCursorActionHandler | undefined) {
          actionHandler = handler;
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
      getActiveCartridge: () => ({
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
      }),
      getActivePlayerSpriteId: () => 'rocco',
      log: () => {},
    });

    handler.mount();
    actionHandler?.(makeClickEvent(320, 180));

    expect(handledActions).toEqual([
      {
        kind: 'scene-click',
        sceneX: 320,
        sceneY: 180,
        targetInstanceId: 'bait-shop-door-target',
        targetDefinitionId: 'bait-shop-door',
      },
    ]);
    expect(goToCalls).toEqual([]);
  });

  it('suppresses default player movement through the same runtime policy seam when a cartridge returns a synchronous result', () => {
    let actionHandler: RoccoCursorActionHandler | undefined;
    const goToCalls: Array<{
      instanceId: string;
      sceneX: number;
      sceneY: number;
      options: unknown;
    }> = [];
    const handledActions: unknown[] = [];

    const handler = new RoccoInputHandler({
      videoSystem: createVideoSystemMock({
        resolveSceneTargets() {
          return {
            visibleTarget: undefined,
            target: {
              kind: 'sprite',
              instanceId: 'stan',
              definitionId: 'stan-definition',
            },
          };
        },
        sprites: {
          goTo(instanceId, sceneX, sceneY, options) {
            goToCalls.push({ instanceId, sceneX, sceneY, options });
            return true;
          },
        },
      }),
      audioSystem: asAudioSystem({ unlock() {} }),
      jukeboxSystem: asJukeboxSystem({ unlock() {} }),
      viewportHost: asViewportHost({
        setCursorActionHandler(handler: RoccoCursorActionHandler | undefined) {
          actionHandler = handler;
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
      getActiveCartridge: () => ({
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
      }),
      getActivePlayerSpriteId: () => 'rocco',
      log: () => {},
    });

    handler.mount();
    actionHandler?.(makeClickEvent(320, 180));

    expect(handledActions).toEqual([
      {
        kind: 'scene-click',
        sceneX: 320,
        sceneY: 180,
        targetInstanceId: 'stan',
        targetDefinitionId: 'stan-definition',
      },
    ]);
    expect(goToCalls).toEqual([]);
  });

  it('uses a carried grid item on the visible target by dispatching a scene click alongside the carry activation', () => {
    let actionHandler: RoccoCursorActionHandler | undefined;
    const handledActions: unknown[] = [];
    const carriedItem = {
      definitionId: 'rocco-player-inventory',
      item: {
        id: 'rocco-bata',
        label: 'Lab coat',
        imageUri: '/test/lab-coat.png',
      },
    };

    const handler = new RoccoInputHandler({
      videoSystem: createVideoSystemMock({
        resolveSceneTargets() {
          return {
            visibleTarget: {
              kind: 'sprite',
              instanceId: 'stan',
              definitionId: 'stan-definition',
              text: 'Stan',
            },
            target: undefined,
          };
        },
        gridMenus: {
          ...createVideoSystemMock().gridMenus,
          activateAt() {
            return {
              kind: 'grid-menu',
              definitionId: 'rocco-player-inventory',
              interaction: 'carry',
              items: [],
            };
          },
          getCarriedItem() {
            return carriedItem;
          },
          isOpen() {
            return true;
          },
          setHoverAt() {
            return false;
          },
        },
      }),
      audioSystem: asAudioSystem({}),
      jukeboxSystem: asJukeboxSystem({}),
      viewportHost: asViewportHost({
        setCursorActionHandler(handler: RoccoCursorActionHandler | undefined) {
          actionHandler = handler;
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
      getActiveCartridge: () => ({
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
      }),
      getActivePlayerSpriteId: () => 'rocco',
      log: () => {},
    });

    handler.mount();
    actionHandler?.(makeClickEvent(320, 180));

    expect(handledActions).toEqual([
      {
        kind: 'grid-menu',
        definitionId: 'rocco-player-inventory',
        interaction: 'carry',
        items: [],
      },
      {
        kind: 'scene-click',
        sceneX: 320,
        sceneY: 180,
        targetInstanceId: 'stan',
        targetDefinitionId: 'stan-definition',
      },
    ]);
  });
});
