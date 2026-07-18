import type { Application } from 'pixi.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RoccoBuiltinCartridgeConfig } from '../../src/cartridges';
import type { RoccoCartridge } from '../../src/console/cartridges';
import type { RoccoConsoleFlags } from '../../src/console/console-flags';
import { CartridgeSdkIncompatibleError } from '../../src/console/cartridges/sdk-v1';
import { createResourceScope } from '../../src/console/lifecycle';

interface TestMenuResult {
  selectedId: string;
  selectedLocale?: string;
}

interface PromiseWithResolversResult<T> {
  promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
  reject(reason?: unknown): void;
}

type TestMenuShowHandler = (
  manifests: unknown,
  options: unknown,
) => TestMenuResult | Promise<TestMenuResult>;

const promiseConstructor = Promise as PromiseConstructor & {
  withResolvers<T>(): PromiseWithResolversResult<T>;
};

const testState = vi.hoisted(() => ({
  registrations: [] as RoccoBuiltinCartridgeConfig[],
  menuShow: vi.fn<TestMenuShowHandler>(),
}));

vi.mock('../../src/cartridges', () => ({
  get builtinCartridgeConfigs() {
    return testState.registrations;
  },
  get defaultBuiltinCartridgeId() {
    return testState.registrations[0]?.manifest.id ?? 'default';
  },
}));

vi.mock('../../src/console/cartridge-menu/cartridge-menu', () => ({
  RoccoCartridgeMenu: class {
    show(manifests: unknown, options: unknown): Promise<TestMenuResult> {
      return Promise.resolve(testState.menuShow(manifests, options));
    }
  },
}));

import { RoccoCartridgeManager } from '../../src/console/cartridge-manager';

/** Default SDK v1 runtime with no required subsystem facades. */
const DEFAULT_TEST_RUNTIME = { sdk: '^1.0.0', capabilities: [] as string[] } as const;

interface TestKernel {
  video: {
    display: {
      getProfile(): Record<string, never>;
      setProfile: ReturnType<typeof vi.fn>;
    };
  };
  getSoundProfile(): {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
  };
  setSoundProfile: ReturnType<typeof vi.fn>;
  getConsoleFlags(): RoccoConsoleFlags;
  setConsoleFlags(patch: Partial<RoccoConsoleFlags>): void;
  log: ReturnType<typeof vi.fn>;
}

function createTestKernel(isDeveloperModeEnabled = false): TestKernel {
  let consoleFlags: RoccoConsoleFlags = {
    developerModeEnabled: isDeveloperModeEnabled,
  };

  return {
    video: {
      display: {
        getProfile: () => ({}),
        setProfile: vi.fn(),
      },
    },
    getSoundProfile: () => ({
      masterVolume: 1,
      musicVolume: 1,
      sfxVolume: 1,
    }),
    setSoundProfile: vi.fn(),
    getConsoleFlags: () => ({ ...consoleFlags }),
    setConsoleFlags: (patch) => {
      consoleFlags = {
        ...consoleFlags,
        ...patch,
      };
    },
    log: vi.fn(),
  };
}

function createTestCartridge(id: string, overrides: Partial<RoccoCartridge> = {}): RoccoCartridge {
  return {
    manifest: {
      id,
      title: id,
      version: '1.0.0',
      runtime: { ...DEFAULT_TEST_RUNTIME },
    },
    mount() {
      // noop
    },
    ...overrides,
  };
}

function createTestConfig(
  id: string,
  createCartridge: () => RoccoCartridge,
): RoccoBuiltinCartridgeConfig {
  return {
    manifest: {
      id,
      title: id,
      version: '1.0.0',
      runtime: { ...DEFAULT_TEST_RUNTIME },
    },
    createCartridge,
  };
}

describe('RoccoCartridgeManager', () => {
  beforeEach(() => {
    testState.registrations = [];
    testState.menuShow.mockReset();
  });

  it('applies setup console flags before the system settings menu reads them', async () => {
    const kernel = createTestKernel(true);
    let systemSettingsValue = '';

    testState.registrations = [
      createTestConfig('setup-tool', () =>
        createTestCartridge('setup-tool', {
          setup: (context) => ({
            consoleFlags: {
              developerModeEnabled: false,
            },
            bootSettings: [
              {
                id: 'generic-console-flag',
                label: 'GENERIC CONSOLE FLAG',
                description: 'Generic boot-time console flag.',
                getValueLabel: () =>
                  context.console.getFlags().developerModeEnabled ? 'ON' : 'OFF',
              },
            ],
          }),
        }),
      ),
      createTestConfig('game', () => createTestCartridge('game')),
    ];

    testState.menuShow.mockImplementationOnce((_manifests, options) => {
      const bootSettings = (options as { bootSettings: Array<{ getValueLabel(): string }> })
        .bootSettings;
      systemSettingsValue = bootSettings[0]?.getValueLabel() ?? '';
      return { selectedId: 'game' };
    });

    const manager = new RoccoCartridgeManager();
    await manager.loadAndMount({
      app: {} as Application,
      kernel: kernel as never,
    });

    expect(systemSettingsValue).toBe('OFF');
    expect(kernel.getConsoleFlags().developerModeEnabled).toBe(false);
  });

  it('mounts the selected cartridge with an SDK context and never a kernel property', async () => {
    const kernel = createTestKernel(false);
    let mountedDeveloperModeEnabled: boolean | undefined;
    let observedContext: Record<string, unknown> | undefined;

    testState.registrations = [
      createTestConfig('setup-tool', () =>
        createTestCartridge('setup-tool', {
          setup: (context) => ({
            consoleFlags: {
              developerModeEnabled: true,
            },
            bootSettings: [
              {
                id: 'generic-console-flag',
                label: 'GENERIC CONSOLE FLAG',
                description: 'Generic boot-time console flag.',
                getValueLabel: () =>
                  context.console.getFlags().developerModeEnabled ? 'ON' : 'OFF',
                activate: () => {
                  context.console.setFlags({
                    developerModeEnabled: false,
                  });
                },
              },
            ],
          }),
        }),
      ),
      createTestConfig('game', () =>
        createTestCartridge('game', {
          manifest: {
            id: 'game',
            title: 'game',
            version: '1.0.0',
            runtime: { sdk: '^1.0.0', capabilities: ['logger.v1'] },
          },
          mount: (context) => {
            observedContext = context as unknown as Record<string, unknown>;
            expect('engine' in context).toBe(false);
            expect('kernel' in context).toBe(false);
            const mountSdk = context.sdk;
            mountedDeveloperModeEnabled = mountSdk.getConsoleFlags?.()?.developerModeEnabled;
          },
        }),
      ),
    ];

    testState.menuShow.mockImplementationOnce(async (_manifests, options) => {
      const bootSettings = (
        options as {
          bootSettings: Array<{
            getValueLabel(): string;
            activate?(): Promise<void> | void;
          }>;
        }
      ).bootSettings;
      const setting = bootSettings[0];
      expect(setting?.getValueLabel()).toBe('ON');
      await setting?.activate?.();
      expect(setting?.getValueLabel()).toBe('OFF');
      return { selectedId: 'game' };
    });

    const manager = new RoccoCartridgeManager();
    await manager.loadAndMount({
      app: {} as Application,
      kernel: kernel as never,
    });

    expect(mountedDeveloperModeEnabled).toBe(false);
    expect(kernel.getConsoleFlags().developerModeEnabled).toBe(false);
    expect(
      observedContext && Object.keys(observedContext).toSorted((a, b) => a.localeCompare(b)),
    ).toEqual(['locale', 'sdk']);
    expect('engine' in (observedContext ?? {})).toBe(false);
    expect('kernel' in (observedContext ?? {})).toBe(false);
  });

  it.each([
    ['missing runtime', undefined],
    ['incompatible SDK range', { sdk: '^2.0.0' }],
    ['malformed runtime shape', { sdk: 1 }],
  ])(
    'rejects %s before mount and leaves the manager ownership boundary intact',
    async (_label, runtime) => {
      const kernel = createTestKernel(false);
      const mount = vi.fn();
      const start = vi.fn();
      const stop = vi.fn();
      const dispose = vi.fn();
      const cancelActiveActions = vi.fn();
      const scope = createResourceScope('cartridge:game');
      const scopeDisposed = vi.fn();
      scope.defer(scopeDisposed);

      testState.registrations = [
        createTestConfig('game', () =>
          createTestCartridge('game', {
            manifest: {
              id: 'game',
              title: 'game',
              version: '1.0.0',
              runtime: runtime as never,
            },
            mount,
            start,
            stop,
            dispose,
          }),
        ),
      ];

      const manager = new RoccoCartridgeManager();
      await expect(
        manager.loadAndMount({
          app: {} as Application,
          kernel: kernel as never,
          configuredCartridgeId: 'game',
          cartridgeScope: scope,
          cancelActiveActions,
        }),
      ).rejects.toBeInstanceOf(CartridgeSdkIncompatibleError);

      expect(mount).not.toHaveBeenCalled();
      expect(start).not.toHaveBeenCalled();
      expect(stop).not.toHaveBeenCalled();
      expect(dispose).not.toHaveBeenCalled();
      expect(cancelActiveActions).not.toHaveBeenCalled();
      expect(manager.getActiveCartridge()).toBeUndefined();
      expect(scope.isDisposed).toBe(false);
      expect(scopeDisposed).not.toHaveBeenCalled();

      await manager.dispose();

      expect(mount).not.toHaveBeenCalled();
      expect(start).not.toHaveBeenCalled();
      expect(stop).not.toHaveBeenCalled();
      expect(dispose).not.toHaveBeenCalled();
      expect(cancelActiveActions).not.toHaveBeenCalled();
      expect(manager.getActiveCartridge()).toBeUndefined();
      expect(scope.isDisposed).toBe(false);
      expect(scopeDisposed).not.toHaveBeenCalled();
    },
  );

  it('installs the action cancellation hook before mounting an SDK v1 cartridge', async () => {
    const kernel = createTestKernel(false);
    const cancelActiveActions = vi.fn();
    const mountOrder: string[] = [];
    const setActionCancellation = vi.fn(() => {
      mountOrder.push('setActionCancellation');
    });

    testState.registrations = [
      createTestConfig('game', () =>
        createTestCartridge('game', {
          manifest: {
            id: 'game',
            title: 'game',
            version: '1.0.0',
            runtime: { sdk: '^1.0.0', capabilities: ['logger.v1'] },
          },
          setActionCancellation,
          mount: () => {
            mountOrder.push('mount');
          },
        }),
      ),
    ];

    const manager = new RoccoCartridgeManager();
    await manager.loadAndMount({
      app: {} as Application,
      kernel: kernel as never,
      configuredCartridgeId: 'game',
      cancelActiveActions,
    });

    expect(setActionCancellation).toHaveBeenCalledWith(cancelActiveActions);
    expect(mountOrder).toEqual(['setActionCancellation', 'mount']);
  });

  it('publishes the active cartridge only after mount and start complete', async () => {
    const kernel = createTestKernel(false);
    let resolveMount!: () => void;
    let resolveStart!: () => void;
    let notifyMountReached!: () => void;
    let notifyStartReached!: () => void;
    const mountReachedDeferred = promiseConstructor.withResolvers<void>();
    const startReachedDeferred = promiseConstructor.withResolvers<void>();
    const mountReached = mountReachedDeferred.promise;
    const startReached = startReachedDeferred.promise;
    notifyMountReached = () => {
      mountReachedDeferred.resolve();
    };
    notifyStartReached = () => {
      startReachedDeferred.resolve();
    };

    testState.registrations = [
      createTestConfig('game', () =>
        createTestCartridge('game', {
          mount: async () => {
            const mountDeferred = promiseConstructor.withResolvers<void>();
            notifyMountReached();
            resolveMount = () => {
              mountDeferred.resolve();
            };
            await mountDeferred.promise;
          },
          start: async () => {
            const startDeferred = promiseConstructor.withResolvers<void>();
            notifyStartReached();
            resolveStart = () => {
              startDeferred.resolve();
            };
            await startDeferred.promise;
          },
        }),
      ),
    ];

    const manager = new RoccoCartridgeManager();
    const loadPromise = manager.loadAndMount({
      app: {} as Application,
      kernel: kernel as never,
      configuredCartridgeId: 'game',
    });

    expect(manager.getActiveCartridge()).toBeUndefined();

    await mountReached;
    resolveMount();
    await startReached;
    expect(manager.getActiveCartridge()).toBeUndefined();

    resolveStart();
    await loadPromise;

    expect(manager.getActiveCartridge()?.manifest.id).toBe('game');
  });

  it('does not publish a partially mounted cartridge and cleans stop, dispose, and scope in order', async () => {
    const kernel = createTestKernel(false);
    const scope = createResourceScope('cartridge:game');
    const order: string[] = [];

    testState.registrations = [
      createTestConfig('game', () =>
        createTestCartridge('game', {
          mount: (context) => {
            expect('engine' in context).toBe(false);
            expect('sdk' in context).toBe(true);
            scope.defer(() => {
              order.push('scope');
            });
            throw new Error('mount failed');
          },
          stop: () => {
            order.push('stop');
          },
          dispose: () => {
            order.push('dispose');
          },
        }),
      ),
    ];

    const manager = new RoccoCartridgeManager();

    await expect(
      manager.loadAndMount({
        app: {} as Application,
        kernel: kernel as never,
        configuredCartridgeId: 'game',
        cartridgeScope: scope,
      }),
    ).rejects.toThrow('mount failed');

    expect(manager.getActiveCartridge()).toBeUndefined();
    expect(order).toEqual(['stop', 'dispose', 'scope']);
  });

  it('continues cleanup and aggregates failures during dispose', async () => {
    const kernel = createTestKernel(false);
    const scope = createResourceScope('cartridge:game');
    const order: string[] = [];

    scope.defer(() => {
      order.push('scope');
      throw new Error('scope failed');
    });

    testState.registrations = [
      createTestConfig('game', () =>
        createTestCartridge('game', {
          mount() {
            // noop
          },
          stop: () => {
            order.push('stop');
            throw new Error('stop failed');
          },
          dispose: () => {
            order.push('dispose');
            throw new Error('dispose failed');
          },
        }),
      ),
    ];

    const manager = new RoccoCartridgeManager();
    await manager.loadAndMount({
      app: {} as Application,
      kernel: kernel as never,
      configuredCartridgeId: 'game',
      cartridgeScope: scope,
    });

    await expect(manager.dispose()).rejects.toBeInstanceOf(AggregateError);
    expect(order).toEqual(['stop', 'dispose', 'scope']);
    expect(manager.getActiveCartridge()).toBeUndefined();
  });
});
