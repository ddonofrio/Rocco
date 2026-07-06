import type { Application } from 'pixi.js';
import type { RoccoSoundProfile } from './audio';
import { builtinCartridgeConfigs, defaultBuiltinCartridgeId } from '../cartridges';
import {
  RoccoBuiltinCartridgeProvider,
  RoccoDefaultCartridgeLoader,
  type RoccoCartridge,
  type RoccoCartridgeBootSetting,
} from './cartridges';
import { RoccoCartridgeMenu } from './cartridge-menu/cartridge-menu';
import type { RoccoConsoleFlags, RoccoEngine } from './engine-sdk';

interface RoccoMenuSettingsEngine extends RoccoEngine {
  getSoundProfile(): RoccoSoundProfile;
  setSoundProfile(profile: Partial<RoccoSoundProfile>): void;
  getConsoleFlags(): RoccoConsoleFlags;
  setConsoleFlags(patch: Partial<RoccoConsoleFlags>): void;
}

interface CartridgeManagerOptions {
  app: Application;
  engine: RoccoMenuSettingsEngine;
  configuredCartridgeId?: string;
}

interface RoccoCollectedBootSetup {
  consoleFlags: Partial<RoccoConsoleFlags>;
  bootSettings: RoccoCartridgeBootSetting[];
}

export class RoccoCartridgeManager {
  private activeCartridge: RoccoCartridge | null = null;

  async loadAndMount(options: CartridgeManagerOptions): Promise<RoccoCartridge> {
    const { app, engine, configuredCartridgeId } = options;

    const defaultProvider = new RoccoBuiltinCartridgeProvider(builtinCartridgeConfigs);
    const loader = new RoccoDefaultCartridgeLoader({
      defaultProvider,
      defaultCartridgeId: defaultBuiltinCartridgeId,
    });

    const allManifests = await defaultProvider.list();
    const configById = new Map(
      builtinCartridgeConfigs.map((config) => [config.manifest.id, config] as const),
    );
    const bootSetup = await this.collectBootSetup(builtinCartridgeConfigs, engine);
    engine.setConsoleFlags(bootSetup.consoleFlags);
    let selectedId: string;
    let selectedLocale: string | undefined;
    if (allManifests.length > 1 && !configuredCartridgeId) {
      const menu = new RoccoCartridgeMenu(app);
      const result = await menu.show(allManifests, {
        initialLocales: this.loadInitialLocales(configById),
        initialDisplayProfile: engine.video.display.getProfile(),
        initialSoundProfile: engine.getSoundProfile(),
        bootSettings: bootSetup.bootSettings,
        onDisplayProfileChange: (profile) => {
          engine.video.display.setProfile(profile);
        },
        onSoundProfileChange: (profile) => {
          engine.setSoundProfile(profile);
        },
      });
      selectedId = result.selectedId;
      selectedLocale = result.selectedLocale;
    } else {
      selectedId = configuredCartridgeId ?? defaultBuiltinCartridgeId;
      selectedLocale = this.loadStoredLocale(configById.get(selectedId));
    }

    const selectedConfig = configById.get(selectedId);
    if (selectedLocale) {
      this.saveStoredLocale(selectedConfig, selectedLocale);
    }

    const cartridge = (await loader.loadById(selectedId)) ?? (await loader.loadDefault());
    this.activeCartridge = cartridge;
    await cartridge.mount({ engine, locale: selectedLocale });
    if (cartridge.start) {
      await cartridge.start();
    }

    return cartridge;
  }

  getActiveCartridge(): RoccoCartridge | null {
    return this.activeCartridge;
  }

  async dispose(): Promise<void> {
    if (this.activeCartridge?.stop) {
      await this.activeCartridge.stop();
    }
    if (this.activeCartridge?.dispose) {
      await this.activeCartridge.dispose();
    }
    this.activeCartridge = null;
  }

  private loadInitialLocales(
    configById: ReadonlyMap<string, (typeof builtinCartridgeConfigs)[number]>,
  ): Record<string, string> {
    const locales: Record<string, string> = {};
    for (const [cartridgeId, config] of configById) {
      const locale = this.loadStoredLocale(config);
      if (locale) {
        locales[cartridgeId] = locale;
      }
    }

    return locales;
  }

  private loadStoredLocale(
    config:
      | (typeof builtinCartridgeConfigs)[number]
      | undefined,
  ): string | undefined {
    if (!config?.preferredLocaleStorageKey) {
      return undefined;
    }

    try {
      return (
        globalThis.localStorage?.getItem(config.preferredLocaleStorageKey) ??
        config.defaultLocale
      );
    } catch {
      return config.defaultLocale;
    }
  }

  private async collectBootSetup(
    configs: readonly (typeof builtinCartridgeConfigs)[number][],
    engine: RoccoMenuSettingsEngine,
  ): Promise<RoccoCollectedBootSetup> {
    const bootSettingsById = new Map<string, RoccoCartridgeBootSetting>();
    let consoleFlags: Partial<RoccoConsoleFlags> = {};

    for (const config of configs) {
      try {
        const cartridge = config.createCartridge();
        const setupResult = await cartridge.setup?.({
          console: {
            getFlags: () => engine.getConsoleFlags(),
            setFlags: (patch) => {
              engine.setConsoleFlags(patch);
            },
          },
        });

        consoleFlags = {
          ...consoleFlags,
          ...setupResult?.consoleFlags,
        };

        for (const bootSetting of setupResult?.bootSettings ?? []) {
          bootSettingsById.set(bootSetting.id, bootSetting);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        engine.log('System', `Cartridge setup '${config.manifest.id}' failed: ${message}`);
      }
    }

    return {
      consoleFlags,
      bootSettings: [...bootSettingsById.values()],
    };
  }

  private saveStoredLocale(
    config:
      | (typeof builtinCartridgeConfigs)[number]
      | undefined,
    locale: string,
  ): void {
    if (!config?.preferredLocaleStorageKey) {
      return;
    }

    try {
      globalThis.localStorage?.setItem(config.preferredLocaleStorageKey, locale);
    } catch {
      return;
    }
  }
}
