import { afterEach, describe, expect, it, vi } from 'vitest';

import { RoccoLevelManager } from '../../../../src/cartridges/rocco/levels/rocco-level-manager';
import type { RoccoLevel } from '../../../../src/cartridges/rocco/levels/rocco-level-types';
import { RoccoLevelRegistry } from '../../../../src/cartridges/rocco/levels/runtime/rocco-level-registry';
import type { RoccoPlaneScene } from '../../../../src/console/video/planes';

declare global {
  interface PromiseConstructor {
    withResolvers<T>(): {
      promise: Promise<T>;
      resolve: (value: T | PromiseLike<T>) => void;
      reject: (reason?: unknown) => void;
    };
  }
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  const { promise, resolve, reject } = Promise.withResolvers<T>();
  return { promise, resolve, reject };
}

function createMockLevel(levelId: string): RoccoLevel {
  return {
    id: levelId,
    title: levelId,
    connectors: [],
    mount: vi.fn().mockResolvedValue({ id: `scene-${levelId}`, planes: [] }),
    unmount: vi.fn(),
    update: vi.fn(),
    handleAction: vi.fn(),
  } satisfies RoccoLevel;
}

function createMockEngine() {
  let isInputEnabled = true;
  const inputEnabledCalls: boolean[] = [];
  const compositionTextCalls: string[] = [];
  const beginCompositionCalls = vi.fn();
  const endCompositionCalls = vi.fn();
  const inputLeaseOwners: string[] = [];
  const releasedInputLeaseOwners: string[] = [];
  const beginCompositionSessionCalls = vi.fn();
  const compositionSessions: { ownerId: string; messages: string[]; disposed: boolean }[] = [];
  const renderCalls = vi.fn();
  const logCalls: string[] = [];
  const statusCalls: string[] = [];
  const playSoundCalls: Array<{ soundId: string; options?: unknown }> = [];

  const engine = {
    acquireInputLease(ownerId: string, mode: 'interactive' | 'advance-only' | 'blocked') {
      inputLeaseOwners.push(ownerId);
      return {
        ownerId,
        mode,
        acquiredAt: 0,
        dispose() {
          releasedInputLeaseOwners.push(ownerId);
        },
      };
    },
    getInputMode: () => (isInputEnabled ? 'interactive' : 'blocked'),
    setInputEnabled(isEnabled: boolean) {
      isInputEnabled = isEnabled;
      inputEnabledCalls.push(isEnabled);
    },
    isInputEnabled: () => isInputEnabled,
    beginCompositionSession(ownerId: string) {
      beginCompositionSessionCalls(ownerId);
      const session = { ownerId, messages: [] as string[], disposed: false };
      compositionSessions.push(session);
      return {
        id: `composition-${compositionSessions.length}`,
        ownerId,
        get message() {
          return session.messages.at(-1);
        },
        get status() {
          return session.disposed ? 'disposed' : 'active';
        },
        report(progress: { completed: number; total: number; message?: string }) {
          if (progress.message) {
            session.messages.push(progress.message);
          }
        },
        fail() {
          session.disposed = true;
        },
        dispose() {
          session.disposed = true;
        },
      };
    },
    beginComposition: beginCompositionCalls,
    endComposition: endCompositionCalls,
    setCompositionText(text: string | null) {
      if (!text) {
      	return;
      }

      compositionTextCalls.push(text);
      compositionSessions.at(-1)?.messages.push(text);
    },
    video: {
      render: renderCalls,
      gridMenus: {
        closeMenu: vi.fn(),
        clearCarriedItem: vi.fn(),
      },
      actionMenus: {
        closeMenu: vi.fn(),
        unregisterMenu: vi.fn(),
      },
      messages: {
        clearMessages: vi.fn(),
      },
      sprites: {
        getSprite: vi.fn(() => {}),
        removeSprite: vi.fn(),
        createSprite: vi.fn(),
      },
      primitives: {
        removePrimitive: vi.fn(),
      },
      sceneTargets: {
        unregisterTarget: vi.fn(),
      },
      viewport: {
        getHost: vi.fn(() => {}),
      },
      titles: {
        removeTitle: vi.fn(),
      },
    },
    audio: {
      registerSound: vi.fn(),
      unregisterSound: vi.fn(),
      stopSound: vi.fn(),
      playSound: vi.fn((soundId: string, options?: unknown) => {
        playSoundCalls.push({ soundId, options });
        return {
          stop() {},
          setVolume() {},
          get ended() {
            return Promise.resolve();
          },
        };
      }),
    },
    log: (channel: string, message: string) => {
      logCalls.push(`${channel}:${message}`);
    },
    setStatus: (status: string) => {
      statusCalls.push(status);
    },
  };

  return {
    engine,
    state: {
      inputEnabledCalls,
      compositionTextCalls,
      beginCompositionCalls,
      endCompositionCalls,
      inputLeaseOwners,
      releasedInputLeaseOwners,
      beginCompositionSessionCalls,
      compositionSessions,
      renderCalls,
      logCalls,
      statusCalls,
      playSoundCalls,
    },
  };
}

interface ManagerHarness {
  manager: RoccoLevelManager;
  engine: ReturnType<typeof createMockEngine>['engine'];
  state: ReturnType<typeof createMockEngine>['state'];
  levelA: RoccoLevel;
  levelB: RoccoLevel;
}

function getManager(): ManagerHarness {
  const levelA = createMockLevel('level-a');
  const levelB = createMockLevel('level-b');
  const { engine, state } = createMockEngine();
  const manager = new RoccoLevelManager({
    onRestartRequested: vi.fn(),
  });
  (manager as unknown as { engine: typeof engine }).engine = engine;
  (manager as unknown as { activeLevel: RoccoLevel | null }).activeLevel = levelA;
  (manager as unknown as { activeSceneId: string | null }).activeSceneId = 'scene-a';
  vi.spyOn(RoccoLevelRegistry.prototype, 'requireLevel').mockImplementation((levelId: string) => {
    if (levelId === 'level-a') return levelA;
    if (levelId === 'level-b') return levelB;
    throw new Error(`Level '${levelId}' is not registered.`);
  });
  return { manager, engine, state, levelA, levelB };
}

function asManager(manager: RoccoLevelManager): {
  switchToLevel: (levelId: string, entryConnectorId?: string) => Promise<boolean>;
  transitionThrough: (transition: unknown) => Promise<void>;
  restartFromCheckpoint: (request: unknown) => Promise<void>;
  enterBaitShop: () => Promise<void>;
  isTransitioning: boolean;
} {
  return manager as unknown as {
    switchToLevel: (levelId: string, entryConnectorId?: string) => Promise<boolean>;
    transitionThrough: (transition: unknown) => Promise<void>;
    restartFromCheckpoint: (request: unknown) => Promise<void>;
    enterBaitShop: () => Promise<void>;
    isTransitioning: boolean;
  };
}

function activeLevelId(manager: RoccoLevelManager): string | undefined {
  return (manager as unknown as { activeLevel: RoccoLevel | null }).activeLevel?.id;
}

function mockScene(id: string): RoccoPlaneScene {
  return { id, planes: [] };
}

describe('RoccoLevelManager COR-001 level transitions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('COR-001: a successful switch mounts the target and ends composition with input restored', async () => {
    const { manager, state } = getManager();

    const isResult = await asManager(manager).switchToLevel('level-b');

    expect(isResult).toBe(true);
    expect(activeLevelId(manager)).toBe('level-b');
    expect(state.beginCompositionSessionCalls).toHaveBeenCalledTimes(1);
    expect(state.compositionSessions.at(-1)?.disposed).toBe(true);
    expect(state.inputLeaseOwners.at(-1)).toBe('level-transition');
    expect(state.releasedInputLeaseOwners).toContain('level-transition');
    expect(state.compositionSessions.at(-1)?.messages).toContain('LOADING 100%');
  });

  it('plays the bait shop door closing sound at half volume when switching back to Pier Beginning', async () => {
    const { manager, levelA, levelB, state } = getManager();
    vi.spyOn(RoccoLevelRegistry.prototype, 'requireLevel').mockImplementation((levelId: string) => {
      if (levelId === 'level-a') return levelA;
      if (levelId === 'pier-start') return levelB;
      if (levelId === 'level-b') return levelB;
      throw new Error(`Level '${levelId}' is not registered.`);
    });

    const isResult = await asManager(manager).switchToLevel('pier-start', 'shop-exit');

    expect(isResult).toBe(true);
    expect(state.playSoundCalls).toContainEqual({
      soundId: 'rocco-bait-shop-door-closing-sound',
      options: {
        restart: true,
        volume: 0.21,
      },
    });
  });

  it('plays the bait shop door closing sound at half volume on a connector return to Pier Beginning', async () => {
    const { manager, levelA, levelB, state } = getManager();
    vi.spyOn(RoccoLevelRegistry.prototype, 'requireLevel').mockImplementation((levelId: string) => {
      if (levelId === 'level-a') return levelA;
      if (levelId === 'pier-start') return levelB;
      if (levelId === 'level-b') return levelB;
      throw new Error(`Level '${levelId}' is not registered.`);
    });

    await asManager(manager).transitionThrough({
      connector: {
        id: 'return',
        preservePlayerPosition: false,
      },
      targetEndpoint: {
        levelId: 'pier-start',
        connectorId: 'shop-exit',
      },
    });

    expect(state.playSoundCalls).toContainEqual({
      soundId: 'rocco-bait-shop-door-closing-sound',
      options: {
        restart: true,
        volume: 0.21,
      },
    });
  });

  it('COR-001: a failed target mount leaves the previous level active and interactive (rollback re-mounts it)', async () => {
    const { manager, state, levelB } = getManager();
    vi.spyOn(levelB, 'mount').mockRejectedValue(new Error('mount failed'));

    const isResult = await asManager(manager).switchToLevel('level-b');

    expect(isResult).toBe(false);
    expect(activeLevelId(manager)).toBe('level-a');
    expect(state.beginCompositionSessionCalls).toHaveBeenCalledTimes(1);
    expect(state.compositionSessions.at(-1)?.disposed).toBe(true);
    expect(state.releasedInputLeaseOwners).toContain('level-transition');
    expect(state.compositionSessions.at(-1)?.messages).not.toContain('LOADING 100%');
  });

  it('COR-001: validation failure before asset load keeps the current level untouched', async () => {
    const { manager, levelA } = getManager();
    const unmountSpy = vi.spyOn(levelA, 'unmount');
    const mountSpy = vi.spyOn(levelA, 'mount');

    const isResult = await asManager(manager).switchToLevel('level-unknown');

    expect(isResult).toBe(false);
    expect(activeLevelId(manager)).toBe('level-a');
    expect(unmountSpy).not.toHaveBeenCalled();
    expect(mountSpy).not.toHaveBeenCalled();
  });

  it('COR-001: the overlay only shows 100% after success, not on failure', async () => {
    const ok = getManager();
    await asManager(ok.manager).switchToLevel('level-b');
    expect(ok.state.compositionSessions.at(-1)?.messages).toContain('LOADING 100%');

    const fail = getManager();
    vi.spyOn(fail.levelB, 'mount').mockRejectedValue(new Error('mount failed'));
    await asManager(fail.manager).switchToLevel('level-b');
    expect(fail.state.compositionSessions.at(-1)?.messages).not.toContain('LOADING 100%');
  });

  it('COR-001: the transition releases its own lease without forcing input on or off', async () => {
    const { manager, state } = getManager();

    await asManager(manager).switchToLevel('level-b');

    expect(state.inputLeaseOwners).toContain('level-transition');
    expect(state.releasedInputLeaseOwners).toContain('level-transition');
    expect(state.releasedInputLeaseOwners.filter((o) => o === 'level-transition')).toHaveLength(
      state.inputLeaseOwners.filter((o) => o === 'level-transition').length,
    );
  });

  it('COR-001: a failed target mount cleans up the partial target resources', async () => {
    const { manager, levelB } = getManager();
    const unmountSpy = vi.spyOn(levelB, 'unmount');
    vi.spyOn(levelB, 'mount').mockImplementation((eng) => {
      eng.audio.registerSound({ id: 'leak', uri: 'leak', volume: 1, loop: false });
      return Promise.reject(new Error('mount failed after audio'));
    });

    await asManager(manager).switchToLevel('level-b');

    expect(unmountSpy).toHaveBeenCalledTimes(1);
    expect(activeLevelId(manager)).toBe('level-a');
  });

  it('COR-001: a second concurrent transition is rejected (no parallel mounts)', async () => {
    const { manager, state, levelB } = getManager();
    const blocked = deferred<RoccoPlaneScene>();
    const mountSpy = vi.spyOn(levelB, 'mount').mockReturnValue(blocked.promise);

    const first = asManager(manager).switchToLevel('level-b');
    const second = asManager(manager).switchToLevel('level-b');

    expect(await second).toBe(false);
    expect(mountSpy).toHaveBeenCalledTimes(1);

    blocked.resolve(mockScene('scene-b'));
    await first;
    expect(state.releasedInputLeaseOwners).toContain('level-transition');
  });

  it('COR-001: two transition requests in the same frame run only one mount', async () => {
    const { manager, levelB } = getManager();
    const mountSpy = vi.spyOn(levelB, 'mount');

    const p1 = asManager(manager).switchToLevel('level-b');
    const p2 = asManager(manager).switchToLevel('level-b');
    await Promise.all([p1, p2]);

    expect(mountSpy).toHaveBeenCalledTimes(1);
  });

  it('COR-001: restart while a transition is in progress is ignored safely', async () => {
    const { manager, levelA, levelB } = getManager();
    const unmountSpy = vi.spyOn(levelA, 'unmount');
    const blocked = deferred<RoccoPlaneScene>();
    vi.spyOn(levelB, 'mount').mockReturnValue(blocked.promise);

    const first = asManager(manager).switchToLevel('level-b');
    await asManager(manager).restartFromCheckpoint({ levelId: 'level-a' });

    expect(unmountSpy).not.toHaveBeenCalled();

    blocked.resolve(mockScene('scene-b'));
    await first;
  });

  it('COR-001: cartridge unmount during a transition does not throw', async () => {
    const { manager, levelB } = getManager();
    const blocked = deferred<RoccoPlaneScene>();
    vi.spyOn(levelB, 'mount').mockReturnValue(blocked.promise);

    const first = asManager(manager).switchToLevel('level-b');
    expect(() => manager.unmount()).not.toThrow();

    blocked.resolve(mockScene('scene-b'));
    await expect(first).resolves.not.toThrow();
  });
});
