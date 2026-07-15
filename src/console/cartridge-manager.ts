import type { Application } from 'pixi.js';
import type { RoccoSoundProfile } from './audio';
import { builtinCartridgeConfigs, defaultBuiltinCartridgeId } from '../cartridges';
import {
  RoccoBuiltinCartridgeProvider,
  RoccoDefaultCartridgeLoader,
  assertCartridgeSdkCompatibility,
  createCartridgeSdkV1,
  type RoccoCartridge,
  type RoccoCartridgeBootSetting,
} from './cartridges';
import { RoccoCartridgeMenu } from './cartridge-menu/cartridge-menu';
import type { RoccoConsoleFlags, RoccoEngine } from './engine-sdk';
import { createResourceScope, type ResourceScope } from './lifecycle';

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
  /**
   * Existing cartridge `ResourceScope` owned by the runtime. When omitted the
   * manager creates and owns a fallback scope, which it disposes on `dispose`.
   */
  cartridgeScope?: ResourceScope;
}

interface RoccoCollectedBootSetup {
  consoleFlags: Partial<RoccoConsoleFlags>;
  bootSettings: RoccoCartridgeBootSetting[];
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function combineErrors(message: string, errors: readonly unknown[]): Error | undefined {
  if (errors.length === 0) {
    return undefined;
  }
  if (errors.length === 1) {
    return toError(errors[0]);
  }

  return new AggregateError(errors.map((error) => toError(error)), message);
}

export class RoccoCartridgeManager {
  private activeCartridge: RoccoCartridge | undefined;
  private cartridgeScope: ResourceScope | undefined;

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
        const bootSettings = setupResult?.bootSettings ?? [];

        consoleFlags = {
          ...consoleFlags,
          ...setupResult?.consoleFlags,
        };

        for (const bootSetting of bootSettings) {
          if (bootSettingsById.has(bootSetting.id)) {
            throw new Error(`Duplicate boot setting registration '${bootSetting.id}'.`);
          }
          bootSettingsById.set(bootSetting.id, bootSetting);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        engine.log('System', `Cartridge setup '${config.manifest.id}' failed: ${message}`);
      }
    }

    const bootSettings = bootSettingsById.values();
    return {
      consoleFlags,
      bootSettings: [...bootSettings],
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

  private async cleanupCartridgeResources(
    cartridge: RoccoCartridge | undefined,
    scope: ResourceScope | undefined,
    cartridgeId: string,
  ): Promise<Error | undefined> {
    const failures: unknown[] = [];

    if (cartridge?.stop) {
      try {
        await cartridge.stop();
      } catch (error) {
        failures.push(error);
      }
    }

    if (cartridge?.dispose) {
      try {
        await cartridge.dispose();
      } catch (error) {
        failures.push(error);
      }
    }

    if (scope) {
      try {
        await scope.dispose();
      } catch (error) {
        failures.push(error);
      }
    }

    return combineErrors(`Cartridge '${cartridgeId}' cleanup failed.`, failures);
  }

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
    if (allManifests.length > 0 && !configuredCartridgeId) {
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
    const manifest = selectedConfig?.manifest ?? cartridge.manifest;

    assertCartridgeSdkCompatibility(manifest);

    const scope = options.cartridgeScope ?? createResourceScope(`cartridge:${selectedId}`);
    const sdk = createCartridgeSdkV1({ engine, scope, manifest });
    try {
      await cartridge.mount({ engine, locale: selectedLocale, sdk });
      if (cartridge.start) {
        await cartridge.start();
      }
    } catch (error) {
      const cleanupError = await this.cleanupCartridgeResources(cartridge, scope, selectedId);
      const combinedError = combineErrors(
        `Failed to mount cartridge '${selectedId}' cleanly.`,
        [error, cleanupError].filter((item) => item !== undefined),
      );
      throw combinedError ?? error;
    }

    this.activeCartridge = cartridge;
    this.cartridgeScope = scope;
    return cartridge;
  }

  getActiveCartridge(): RoccoCartridge | undefined {
    return this.activeCartridge;
  }

  getActiveLevelId(): string | undefined {
    return this.activeCartridge?.getActiveLevelId?.() ?? undefined;
  }

  async dispose(): Promise<void> {
    const activeCartridge = this.activeCartridge;
    const cartridgeScope = this.cartridgeScope;
    const cleanupError = await this.cleanupCartridgeResources(
      activeCartridge,
      cartridgeScope,
      activeCartridge?.manifest.id ?? 'unknown',
    );

    this.activeCartridge = undefined;
    this.cartridgeScope = undefined;

    if (cleanupError) {
      throw cleanupError;
    }
  }
}
