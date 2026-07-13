import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoccoLevelManager } from '../../../../src/cartridges/rocco/levels/rocco-level-manager';
import type { RoccoLevel } from '../../../../src/cartridges/rocco/levels/rocco-level-types';
import { RoccoLevelRegistry } from '../../../../src/cartridges/rocco/levels/runtime/rocco-level-registry';

function createMockLevel(levelId: string): RoccoLevel {
  return {
    id: levelId,
    title: levelId,
    connectors: [],
    mount: vi.fn(),
    unmount: vi.fn(),
    update: vi.fn(),
    handleAction: vi.fn(),
  } satisfies RoccoLevel;
}

function createMockEngine() {
  const setInputEnabledCalls: boolean[] = [];
  const compositionTextCalls: string[] = [];
  const beginCompositionCalls = vi.fn();
  const endCompositionCalls = vi.fn();
  const renderCalls = vi.fn();
  const logCalls: string[] = [];
  const statusCalls: string[] = [];

  const engine = {
    setInputEnabled: (enabled: boolean) => {
      setInputEnabledCalls.push(enabled);
    },
    beginComposition: beginCompositionCalls,
    endComposition: endCompositionCalls,
    setCompositionText: (text: string) => {
      compositionTextCalls.push(text);
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
        getSprite: vi.fn(() => null),
        removeSprite: vi.fn(),
      },
      sceneTargets: {
        unregisterTarget: vi.fn(),
      },
      viewport: {
        getHost: vi.fn(() => null),
      },
      titles: {
        removeTitle: vi.fn(),
      },
    },
    audio: {
      registerSound: vi.fn(),
      stopSound: vi.fn(),
      unregisterSound: vi.fn(),
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
    setInputEnabledCalls,
    compositionTextCalls,
    beginCompositionCalls,
    endCompositionCalls,
    renderCalls,
    logCalls,
    statusCalls,
  };
}

describe('RoccoLevelManager characterization', () => {
  let manager: RoccoLevelManager;
  let mockEngine: ReturnType<typeof createMockEngine>['engine'];
  let mockState: ReturnType<typeof createMockEngine>;
  let levelA: RoccoLevel;
  let levelB: RoccoLevel;

  beforeEach(() => {
    levelA = createMockLevel('level-a');
    levelB = createMockLevel('level-b');
    mockState = createMockEngine();
    mockEngine = mockState.engine;

    vi.spyOn(RoccoLevelRegistry.prototype, 'requireLevel').mockImplementation((levelId: string) => {
      if (levelId === 'level-a') return levelA;
      if (levelId === 'level-b') return levelB;
      throw new Error(`Level '${levelId}' is not registered.`);
    });

    manager = new RoccoLevelManager();
    (manager as unknown as { engine: typeof mockEngine }).engine = mockEngine;
    (manager as unknown as { activeLevel: RoccoLevel | null }).activeLevel = levelA;
    (manager as unknown as { activeSceneId: string | null }).activeSceneId = 'scene-a';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('COR-001: failed target mount leaves activeLevel pointing to a desmounted level', async () => {
    const unmountSpy = vi.spyOn(levelA, 'unmount').mockImplementation(() => {});
    const mountSpy = vi.spyOn(levelA, 'mount').mockRejectedValue(new Error('mount failed'));

    const result = await (manager as unknown as { switchToLevel: (levelId: string) => Promise<boolean> }).switchToLevel('level-b');

    expect(mockState.setInputEnabledCalls).toContain(false);
    expect(result).toBe(false);
    expect((manager as unknown as { activeLevel: RoccoLevel | null }).activeLevel?.id).toBe('level-a');
    expect(unmountSpy).toHaveBeenCalledTimes(1);
    expect(mountSpy).not.toHaveBeenCalled();
  });

  it('COR-001: composition overlay shows 100% even on failed transition', async () => {
    vi.spyOn(levelA, 'unmount').mockImplementation(() => {});
    vi.spyOn(levelA, 'mount').mockRejectedValue(new Error('mount failed'));

    await (manager as unknown as { switchToLevel: (levelId: string) => Promise<boolean> }).switchToLevel('level-b');

    expect(mockState.compositionTextCalls).toContain('LOADING 100%');
  });

  it('COR-001: input is re-enabled after a failed transition', async () => {
    vi.spyOn(levelA, 'unmount').mockImplementation(() => {});
    vi.spyOn(levelA, 'mount').mockRejectedValue(new Error('mount failed'));

    await (manager as unknown as { switchToLevel: (levelId: string) => Promise<boolean> }).switchToLevel('level-b');

    expect(mockState.setInputEnabledCalls).toContain(true);
  });

  it('COR-001: transitioning flag is reset even on failure, allowing a second transition', async () => {
    vi.spyOn(levelA, 'unmount').mockImplementation(() => {});
    vi.spyOn(levelA, 'mount').mockRejectedValue(new Error('mount failed'));
    vi.spyOn(levelB, 'mount').mockResolvedValue({ id: 'scene-b', planes: [] });

    await (manager as unknown as { switchToLevel: (levelId: string) => Promise<boolean> }).switchToLevel('level-b');

    expect((manager as unknown as { transitioning: boolean }).transitioning).toBe(false);
  });
});
