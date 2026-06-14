import type { RoccoCartridge, RoccoCartridgeLoader, RoccoCartridgeProvider } from './types';

interface RoccoDefaultCartridgeLoaderOptions {
  defaultProvider: RoccoCartridgeProvider;
  defaultCartridgeId: string;
}

export class RoccoDefaultCartridgeLoader implements RoccoCartridgeLoader {
  private readonly defaultProvider: RoccoCartridgeProvider;
  private readonly defaultCartridgeId: string;
  private readonly providers: RoccoCartridgeProvider[] = [];

  constructor(options: RoccoDefaultCartridgeLoaderOptions) {
    this.defaultProvider = options.defaultProvider;
    this.defaultCartridgeId = options.defaultCartridgeId;
  }

  registerProvider(provider: RoccoCartridgeProvider): void {
    this.providers.push(provider);
  }

  async loadDefault(): Promise<RoccoCartridge> {
    const defaultCartridge = await this.defaultProvider.load(this.defaultCartridgeId);
    if (!defaultCartridge) {
      throw new Error(`Default cartridge '${this.defaultCartridgeId}' could not be loaded.`);
    }

    return defaultCartridge;
  }

  async loadById(id: string): Promise<RoccoCartridge | undefined> {
    for (const provider of this.providers) {
      const cartridge = await provider.load(id);
      if (cartridge) {
        return cartridge;
      }
    }

    return this.defaultProvider.load(id);
  }
}
