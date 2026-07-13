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
  return {
    acquireInputLease() {
      return {
        ownerId: 'level-transition',
        mode: 'blocked' as const,
        acquiredAt: 0,
        dispose() {
          // noop
        },
      };
    },
    beginCompositionSession() {
      return {
        id: 'composition-1',
        ownerId: 'level-transition',
        message: 'LOADING 0%',
        status: 'active' as const,
        report() {
          // noop
        },
        fail() {
          // noop
        },
        dispose() {
          // noop
        },
      };
    },
    log() {
      // noop
    },
  };
}

describe('RoccoLevelTransitionService', () => {
  it('resolves the target after preCommit so reset flows can mount a fresh level instance', async () => {
    const engine = createMockEngine();
    const currentLevel = createMockLevel('current-level');
    const staleTarget = createMockLevel('restart-target');
    const freshTarget = createMockLevel('restart-target');
    let activeLevel: RoccoLevel | null = currentLevel.level;
    let resolvedTarget = staleTarget.level;

    const service = new RoccoLevelTransitionService({
      getEngine: () => engine as never,
      getActiveLevel: () => activeLevel,
      setActiveLevel: (level) => {
        activeLevel = level;
      },
      createMountOptions: () => ({}),
    });

    const preCommit = vi.fn(() => {
      resolvedTarget = freshTarget.level;
    });
    const resolveTarget = vi.fn(() => resolvedTarget);

    const result = await service.run({
      id: 'restart-target',
      resolveTarget,
      buildMountOptions: () => ({}),
      preCommit,
      onCommitted: vi.fn(),
    });

    expect(result).toBe(true);
    expect(preCommit).toHaveBeenCalledTimes(1);
    expect(resolveTarget).toHaveBeenCalledTimes(1);
    expect(preCommit.mock.invocationCallOrder[0]).toBeLessThan(
      resolveTarget.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
    expect(staleTarget.mount).not.toHaveBeenCalled();
    expect(freshTarget.mount).toHaveBeenCalledTimes(1);
    expect(activeLevel).toBe(freshTarget.level);
  });
});
