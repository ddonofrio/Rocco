import type { Application } from 'pixi.js';
import { builtinCartridgeConfigs, defaultBuiltinCartridgeId } from '../cartridges';
import { RoccoBuiltinCartridgeProvider, RoccoDefaultCartridgeLoader, type RoccoCartridge } from './cartridges';
import { RoccoCartridgeMenu } from './cartridge-menu/cartridge-menu';
import type { RoccoEngine } from './engine-sdk';

interface CartridgeManagerOptions {
  app: Application;
  engine: RoccoEngine;
  configuredCartridgeId?: string;
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
    let selectedId: string;
    let selectedLocale: string | undefined;
    if (allManifests.length > 1 && !configuredCartridgeId) {
      const menu = new RoccoCartridgeMenu(app);
      const result = await menu.show(allManifests, {
        initialLocales: this.loadInitialLocales(configById),
        initialDisplayProfile: engine.video.display.getProfile(),
        onDisplayProfileChange: (profile) => {
          engine.video.display.setProfile(profile);
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
