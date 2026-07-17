import { describe, expect, it, vi } from 'vitest';

import { RoccoLevelTransitionService } from '../../../../../src/cartridges/rocco/levels/runtime/rocco-level-transition-service';
import type { RoccoLevel } from '../../../../../src/cartridges/rocco/levels/rocco-level-types';

function createMockLevel(levelId: string): {
  level: RoccoLevel;
  mount: ReturnType<typeof vi.fn>;
  unmount: ReturnType<typeof vi.fn>;
} {
  const mount = vi.fn().mockResolvedValue({ id: `scene-${levelId}`, planes: [] });
  const unmount = vi.fn();
  return {
    level: {
      id: levelId,
      title: levelId,
      connectors: [],
      mount,
      unmount,
      update: vi.fn(),
      handleAction: vi.fn(),
    } satisfies RoccoLevel,
    mount,
    unmount,
  };
}

function createMockEngine() {
  const failedCompositions: unknown[] = [];
  const disposedCompositions: string[] = [];
  const releasedLeases: string[] = [];
  const logCalls: string[] = [];
  return {
    engine: {
      acquireInputLease(ownerId: string) {
        return {
          ownerId,
          mode: 'blocked' as const,
          acquiredAt: 0,
          dispose() {
            releasedLeases.push(ownerId);
          },
        };
      },
      beginCompositionSession(ownerId: string) {
        return {
          id: 'composition-1',
          ownerId,
          message: 'LOADING 0%',
          status: 'active' as const,
          report() {
            // noop
          },
          fail(error: unknown) {
            failedCompositions.push(error);
          },
          dispose() {
            disposedCompositions.push(ownerId);
          },
        };
      },
      log(_channel: string, message: string) {
        logCalls.push(message);
      },
    },
    state: {
      failedCompositions,
      disposedCompositions,
      releasedLeases,
      logCalls,
    },
  };
}

describe('RoccoLevelTransitionService', () => {
  it('prepares the target before commit so reset flows can mount a fresh level instance', async () => {
    const { engine } = createMockEngine();
    const currentLevel = createMockLevel('current-level');
    const staleTarget = createMockLevel('restart-target');
    const freshTarget = createMockLevel('restart-target');
    let activeLevel: RoccoLevel | null = currentLevel.level;
    let preparedTarget = staleTarget.level;

    const service = new RoccoLevelTransitionService({
      getEngine: () => engine as never,
      getActiveLevel: () => activeLevel,
      setActiveLevel: (level) => {
        activeLevel = level;
      },
      cancelActiveActions: vi.fn(),
      createMountOptions: () => ({}),
    });

    const commit = vi.fn();
    const isResult = await service.run({
      id: 'restart-target',
      prepare: () => {
        preparedTarget = freshTarget.level;
        return {
          targetLevel: preparedTarget,
          mountOptions: {},
          commit,
          rollback: vi.fn(),
          onCommitted: vi.fn(),
        };
      },
    });

    expect(isResult).toBe(true);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(staleTarget.mount).not.toHaveBeenCalled();
    expect(freshTarget.mount).toHaveBeenCalledTimes(1);
    expect(activeLevel).toBe(freshTarget.level);
  });

  it('cancels active actions before unmounting and publishing the target level', async () => {
    const { engine } = createMockEngine();
    const currentLevel = createMockLevel('current-level');
    const targetLevel = createMockLevel('target-level');
    const order: string[] = [];
    const cancelActiveActions = vi.fn((reason: string) => {
      order.push(`cancel:${reason}`);
    });
    currentLevel.unmount.mockImplementation(() => {
      order.push('unmount-current');
    });
    targetLevel.mount.mockResolvedValue({ id: 'scene-target-level', planes: [] });
    targetLevel.mount.mockImplementationOnce(() => {
      order.push('mount-target');
    });
    let activeLevel: RoccoLevel | null = currentLevel.level;

    const service = new RoccoLevelTransitionService({
      getEngine: () => engine as never,
      getActiveLevel: () => activeLevel,
      setActiveLevel: (level) => {
        activeLevel = level;
        order.push('publish-target');
      },
      cancelActiveActions,
      createMountOptions: () => ({}),
    });

    const isResult = await service.run({
      id: 'target-level',
      prepare: () => ({
        targetLevel: targetLevel.level,
        mountOptions: {},
        commit: vi.fn(),
        rollback: vi.fn(),
      }),
    });

    expect(isResult).toBe(true);
    expect(cancelActiveActions).toHaveBeenCalledWith('level-transition:target-level');
    expect(order).toEqual([
      'cancel:level-transition:target-level',
      'unmount-current',
      'mount-target',
      'publish-target',
    ]);
  });

  it('keeps the current level untouched when prepare fails before commit', async () => {
    const { engine } = createMockEngine();
    const currentLevel = createMockLevel('current-level');
    let activeLevel: RoccoLevel | null = currentLevel.level;

    const service = new RoccoLevelTransitionService({
      getEngine: () => engine as never,
      getActiveLevel: () => activeLevel,
      setActiveLevel: (level) => {
        activeLevel = level;
      },
      cancelActiveActions: vi.fn(),
      createMountOptions: () => ({}),
    });

    const isResult = await service.run({
      id: 'broken-prepare',
      prepare: () => {
        throw new Error('prepare failed');
      },
    });

    expect(isResult).toBe(false);
    expect(activeLevel).toBe(currentLevel.level);
    expect(currentLevel.unmount).not.toHaveBeenCalled();
    expect(currentLevel.mount).not.toHaveBeenCalled();
  });

  it('rolls back and remounts the current level when the target mount fails', async () => {
    const { engine } = createMockEngine();
    const currentLevel = createMockLevel('current-level');
    const targetLevel = createMockLevel('target-level');
    targetLevel.mount.mockRejectedValue(new Error('mount failed'));
    let activeLevel: RoccoLevel | null = currentLevel.level;

    const service = new RoccoLevelTransitionService({
      getEngine: () => engine as never,
      getActiveLevel: () => activeLevel,
      setActiveLevel: (level) => {
        activeLevel = level;
      },
      cancelActiveActions: vi.fn(),
      createMountOptions: () => ({}),
    });

    const rollback = vi.fn();
    const onRolledBack = vi.fn();
    const isResult = await service.run({
      id: 'target-failure',
      prepare: () => ({
        targetLevel: targetLevel.level,
        mountOptions: {},
        commit: vi.fn(),
        rollback,
        onCommitted: vi.fn(),
        onRolledBack,
      }),
    });

    expect(isResult).toBe(false);
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(targetLevel.unmount).toHaveBeenCalledTimes(1);
    expect(currentLevel.mount).toHaveBeenCalledTimes(1);
    expect(onRolledBack).toHaveBeenCalledTimes(1);
    expect(activeLevel).toBe(currentLevel.level);
  });

  it('enters a fatal state when rollback cannot restore the previous level', async () => {
    const { engine, state } = createMockEngine();
    const currentLevel = createMockLevel('current-level');
    const targetLevel = createMockLevel('target-level');
    targetLevel.mount.mockRejectedValue(new Error('mount failed'));
    currentLevel.mount.mockRejectedValue(new Error('restore failed'));
    let activeLevel: RoccoLevel | null = currentLevel.level;

    const service = new RoccoLevelTransitionService({
      getEngine: () => engine as never,
      getActiveLevel: () => activeLevel,
      setActiveLevel: (level) => {
        activeLevel = level;
      },
      cancelActiveActions: vi.fn(),
      createMountOptions: () => ({}),
    });

    const isResult = await service.run({
      id: 'fatal-rollback',
      prepare: () => ({
        targetLevel: targetLevel.level,
        mountOptions: {},
        commit: vi.fn(),
        rollback: vi.fn(),
        onCommitted: vi.fn(),
      }),
    });

    expect(isResult).toBe(false);
    expect(service.currentPhase).toBe('fatal');
    expect(activeLevel).toBeNull();
    expect(state.failedCompositions).toHaveLength(1);
    expect(state.releasedLeases).toHaveLength(0);
    expect(state.disposedCompositions).toHaveLength(0);
  });
});
