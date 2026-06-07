import type { Application } from 'pixi.js';
import {
  RoccoBuiltinCartridgeProvider,
  RoccoDefaultCartridgeLoader,
  type RoccoCartridge,
} from './cartridges';
import { RoccoDefaultCartridge } from '../cartridges/rocco/rocco-default-cartridge';
import { RoccoTerminalWorkInProgressCartridge } from '../cartridges/terminal/terminal-work-in-progress-cartridge';
import { RoccoCartridgeMenu } from './cartridge-menu/cartridge-menu';
import type { RoccoEngine } from './engine-api';

const ROCCO_DEFAULT_CARTRIDGE_ID = 'rocco-default';
const ROCCO_LOCALE_STORAGE_KEY = 'rocco.default.locale';

interface CartridgeManagerOptions {
  app: Application;
  engine: RoccoEngine;
  configuredCartridgeId?: string;
}

export class RoccoCartridgeManager {
  private activeCartridge: RoccoCartridge | null = null;

  async loadAndMount(options: CartridgeManagerOptions): Promise<RoccoCartridge> {
    const { app, engine, configuredCartridgeId } = options;

    const defaultCartridge = new RoccoDefaultCartridge();
    const terminalWorkInProgressCartridge = new RoccoTerminalWorkInProgressCartridge();
    const defaultProvider = new RoccoBuiltinCartridgeProvider([
      defaultCartridge,
      terminalWorkInProgressCartridge,
    ]);
    const loader = new RoccoDefaultCartridgeLoader({
      defaultProvider,
      defaultCartridgeId: defaultCartridge.manifest.id,
      configuredCartridgeId,
    });

    const allManifests = await defaultProvider.list();
    let selectedId: string;
    let selectedLocale: string | undefined;
    if (allManifests.length > 1 && !configuredCartridgeId) {
      const menu = new RoccoCartridgeMenu(app);
      const result = await menu.show(allManifests, {
        initialLocales: {
          [ROCCO_DEFAULT_CARTRIDGE_ID]: loadStoredRoccoLocale() ?? 'en',
        },
      });
      selectedId = result.selectedId;
      selectedLocale = result.selectedLocale;
    } else {
      selectedId = configuredCartridgeId ?? defaultCartridge.manifest.id;
      selectedLocale =
        selectedId === ROCCO_DEFAULT_CARTRIDGE_ID ? loadStoredRoccoLocale() : undefined;
    }

    if (selectedId === ROCCO_DEFAULT_CARTRIDGE_ID && selectedLocale) {
      saveStoredRoccoLocale(selectedLocale);
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
}

function loadStoredRoccoLocale(): string | undefined {
  try {
    return globalThis.localStorage?.getItem(ROCCO_LOCALE_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function saveStoredRoccoLocale(locale: string): void {
  try {
    globalThis.localStorage?.setItem(ROCCO_LOCALE_STORAGE_KEY, locale);
  } catch {
    return;
  }
}
