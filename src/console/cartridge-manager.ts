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
  type RoccoCartridgeManifest,
} from './cartridges';
import { RoccoCartridgeMenu } from './cartridge-menu/cartridge-menu';
import type { ConsoleKernel } from './console-kernel';
import type { RoccoConsoleFlags } from './console-flags';
import { createResourceScope, type ResourceScope } from './lifecycle';

interface CartridgeManagerKernel extends ConsoleKernel {
  getSoundProfile(): RoccoSoundProfile;
  setSoundProfile(profile: Partial<RoccoSoundProfile>): void;
  getConsoleFlags(): RoccoConsoleFlags;
  setConsoleFlags(patch: Partial<RoccoConsoleFlags>): void;
}

interface CartridgeManagerOptions {
  app: Application;
  kernel: CartridgeManagerKernel;
  cancelActiveActions?: (reason: string) => void;
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

interface RoccoCartridgeSelection {
  selectedId: string;
  selectedLocale: string | undefined;
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

  return new AggregateError(
    errors.map((error) => toError(error)),
    message,
  );
}

export class RoccoCartridgeManager {
  private activeCartridge: RoccoCartridge | undefined;
  private cartridgeScope: ResourceScope | undefined;
  private cancelActiveActions: ((reason: string) => void) | undefined;

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
    config: (typeof builtinCartridgeConfigs)[number] | undefined,
  ): string | undefined {
    if (!config?.preferredLocaleStorageKey) {
      return undefined;
    }

    try {
      return (
        globalThis.localStorage?.getItem(config.preferredLocaleStorageKey) ?? config.defaultLocale
      );
    } catch {
      return config.defaultLocale;
    }
  }

  private async collectBootSetup(
    configs: readonly (typeof builtinCartridgeConfigs)[number][],
    kernel: CartridgeManagerKernel,
  ): Promise<RoccoCollectedBootSetup> {
    const bootSettingsById = new Map<string, RoccoCartridgeBootSetting>();
    let consoleFlags: Partial<RoccoConsoleFlags> = {};

    for (const config of configs) {
      try {
        const cartridge = config.createCartridge();
        const setupResult = await cartridge.setup?.({
          console: {
            getFlags: () => kernel.getConsoleFlags(),
            setFlags: (patch) => {
              kernel.setConsoleFlags(patch);
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
        kernel.log('System', `Cartridge setup '${config.manifest.id}' failed: ${message}`);
      }
    }

    const bootSettings = bootSettingsById.values();
    return {
      consoleFlags,
      bootSettings: [...bootSettings],
    };
  }

  private saveStoredLocale(
    config: (typeof builtinCartridgeConfigs)[number] | undefined,
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
    cancelActiveActions?: (reason: string) => void,
  ): Promise<Error | undefined> {
    const failures: unknown[] = [];

    cancelActiveActions?.('cartridge-unmount:' + cartridgeId);

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

  private validateCartridgeCompatibility(manifest: RoccoCartridgeManifest): void {
    assertCartridgeSdkCompatibility(manifest);
  }

  private async mountSelectedCartridge(
    cartridge: RoccoCartridge,
    kernel: CartridgeManagerKernel,
    scope: ResourceScope,
    selectedLocale: string | undefined,
  ): Promise<void> {
    const sdk = createCartridgeSdkV1({
      kernel,
      scope,
      manifest: cartridge.manifest,
    });
    await cartridge.mount({ sdk, locale: selectedLocale });
  }

  private async selectCartridge(
    app: Application,
    kernel: CartridgeManagerKernel,
    allManifests: RoccoCartridgeManifest[],
    configById: ReadonlyMap<string, (typeof builtinCartridgeConfigs)[number]>,
    configuredCartridgeId: string | undefined,
    bootSetup: RoccoCollectedBootSetup,
  ): Promise<RoccoCartridgeSelection> {
    if (allManifests.length > 0 && !configuredCartridgeId) {
      const menu = new RoccoCartridgeMenu(app);
      const result = await menu.show(allManifests, {
        initialLocales: this.loadInitialLocales(configById),
        initialDisplayProfile: kernel.video.display.getProfile(),
        initialSoundProfile: kernel.getSoundProfile(),
        bootSettings: bootSetup.bootSettings,
        onDisplayProfileChange: (profile) => {
          kernel.video.display.setProfile(profile);
        },
        onSoundProfileChange: (profile) => {
          kernel.setSoundProfile(profile);
        },
      });
      return {
        selectedId: result.selectedId,
        selectedLocale: result.selectedLocale,
      };
    }

    const selectedId = configuredCartridgeId ?? defaultBuiltinCartridgeId;
    return {
      selectedId,
      selectedLocale: this.loadStoredLocale(configById.get(selectedId)),
    };
  }

  async loadAndMount(options: CartridgeManagerOptions): Promise<RoccoCartridge> {
    const { app, kernel, configuredCartridgeId } = options;

    const defaultProvider = new RoccoBuiltinCartridgeProvider(builtinCartridgeConfigs);
    const loader = new RoccoDefaultCartridgeLoader({
      defaultProvider,
      defaultCartridgeId: defaultBuiltinCartridgeId,
    });

    const allManifests = await defaultProvider.list();
    const configById = new Map(
      builtinCartridgeConfigs.map((config) => [config.manifest.id, config] as const),
    );
    const bootSetup = await this.collectBootSetup(builtinCartridgeConfigs, kernel);
    kernel.setConsoleFlags(bootSetup.consoleFlags);
    const { selectedId, selectedLocale } = await this.selectCartridge(
      app,
      kernel,
      allManifests,
      configById,
      configuredCartridgeId,
      bootSetup,
    );

    const selectedConfig = configById.get(selectedId);
    if (selectedLocale) {
      this.saveStoredLocale(selectedConfig, selectedLocale);
    }

    const cartridge = (await loader.loadById(selectedId)) ?? (await loader.loadDefault());
    const manifest = cartridge.manifest;
    this.validateCartridgeCompatibility(manifest);

    const scope = options.cartridgeScope ?? createResourceScope(`cartridge:${selectedId}`);
    this.cancelActiveActions = options.cancelActiveActions;
    try {
      if (options.cancelActiveActions) {
        cartridge.setActionCancellation?.(options.cancelActiveActions);
      }
      await this.mountSelectedCartridge(cartridge, kernel, scope, selectedLocale);
      if (cartridge.start) {
        await cartridge.start();
      }
    } catch (error) {
      const cleanupError = await this.cleanupCartridgeResources(
        cartridge,
        scope,
        selectedId,
        this.cancelActiveActions,
      );
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
      this.cancelActiveActions,
    );

    this.activeCartridge = undefined;
    this.cartridgeScope = undefined;
    this.cancelActiveActions = undefined;

    if (cleanupError) {
      throw cleanupError;
    }
  }
}
