import type { Application } from 'pixi.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RoccoBuiltinCartridgeConfig } from '../../src/cartridges';
import type { RoccoCartridge } from '../../src/console/cartridges';
import type { RoccoConsoleFlags } from '../../src/console/engine-sdk';

interface TestMenuResult {
  selectedId: string;
  selectedLocale?: string;
}

type TestMenuShowHandler = (
  manifests: unknown,
  options: unknown,
) => TestMenuResult | Promise<TestMenuResult>;

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

function createTestEngine(initialDeveloperModeEnabled = false): TestEngine {
  let consoleFlags: RoccoConsoleFlags = {
    developerModeEnabled: initialDeveloperModeEnabled,
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
    let mountedDeveloperModeEnabled: boolean | null = null;

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
              mountEngine.getConsoleFlags?.().developerModeEnabled ?? null;
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
});
