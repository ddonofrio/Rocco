import type { Application } from 'pixi.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RoccoBuiltinCartridgeConfig } from '../../src/cartridges';
import type { RoccoCartridge } from '../../src/console/cartridges';
import type { RoccoConsoleFlags } from '../../src/console/engine-sdk';
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

interface TestEngine {
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

function createTestEngine(isDeveloperModeEnabled = false): TestEngine {
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
    const engine = createTestEngine(true);
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
        })),
      createTestConfig('game', () => createTestCartridge('game')),
    ];

    testState.menuShow.mockImplementationOnce((_manifests, options) => {
      const bootSettings = (options as { bootSettings: Array<{ getValueLabel(): string }> }).bootSettings;
      systemSettingsValue = bootSettings[0]?.getValueLabel() ?? '';
      return { selectedId: 'game' };
    });

    const manager = new RoccoCartridgeManager();
    await manager.loadAndMount({
      app: {} as Application,
      engine: engine as never,
    });

    expect(systemSettingsValue).toBe('OFF');
    expect(engine.getConsoleFlags().developerModeEnabled).toBe(false);
  });

  it('mounts the selected cartridge with the latest boot-setting flag value', async () => {
    const engine = createTestEngine(false);
    let mountedDeveloperModeEnabled: boolean | undefined;

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
        })),
      createTestConfig('game', () =>
        createTestCartridge('game', {
          mount: ({ engine: mountEngine }) => {
            mountedDeveloperModeEnabled =
              mountEngine.getConsoleFlags?.().developerModeEnabled;
          },
        })),
    ];

    testState.menuShow.mockImplementationOnce(async (_manifests, options) => {
      const bootSettings = (options as {
        bootSettings: Array<{
          getValueLabel(): string;
          activate?(): Promise<void> | void;
        }>;
      }).bootSettings;
      const setting = bootSettings[0];
      expect(setting?.getValueLabel()).toBe('ON');
      await setting?.activate?.();
      expect(setting?.getValueLabel()).toBe('OFF');
      return { selectedId: 'game' };
    });

    const manager = new RoccoCartridgeManager();
    await manager.loadAndMount({
      app: {} as Application,
      engine: engine as never,
    });

    expect(mountedDeveloperModeEnabled).toBe(false);
    expect(engine.getConsoleFlags().developerModeEnabled).toBe(false);
  });

  it('publishes the active cartridge only after mount and start complete', async () => {
    const engine = createTestEngine(false);
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
        })),
    ];

    const manager = new RoccoCartridgeManager();
    const loadPromise = manager.loadAndMount({
      app: {} as Application,
      engine: engine as never,
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
    const engine = createTestEngine(false);
    const scope = createResourceScope('cartridge:game');
    const order: string[] = [];

    testState.registrations = [
      createTestConfig('game', () =>
        createTestCartridge('game', {
          mount: ({ sdk }) => {
            sdk?.scope.defer(() => {
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
        })),
    ];

    const manager = new RoccoCartridgeManager();

    await expect(
      manager.loadAndMount({
        app: {} as Application,
        engine: engine as never,
        configuredCartridgeId: 'game',
        cartridgeScope: scope,
      }),
    ).rejects.toThrow('mount failed');

    expect(manager.getActiveCartridge()).toBeUndefined();
    expect(order).toEqual(['stop', 'dispose', 'scope']);
  });

  it('continues cleanup and aggregates failures during dispose', async () => {
    const engine = createTestEngine(false);
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
        })),
    ];

    const manager = new RoccoCartridgeManager();
    await manager.loadAndMount({
      app: {} as Application,
      engine: engine as never,
      configuredCartridgeId: 'game',
      cartridgeScope: scope,
    });

    await expect(manager.dispose()).rejects.toBeInstanceOf(AggregateError);
    expect(order).toEqual(['stop', 'dispose', 'scope']);
    expect(manager.getActiveCartridge()).toBeUndefined();
  });
});
