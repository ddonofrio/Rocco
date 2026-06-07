import type { RoccoCartridge, RoccoCartridgeLoader, RoccoCartridgeProvider } from './types';

interface RoccoDefaultCartridgeLoaderOptions {
  defaultProvider: RoccoCartridgeProvider;
  defaultCartridgeId: string;
  configuredCartridgeId?: string;
}

export class RoccoDefaultCartridgeLoader implements RoccoCartridgeLoader {
  private readonly defaultProvider: RoccoCartridgeProvider;
  private readonly defaultCartridgeId: string;
  private readonly configuredCartridgeId: string | undefined;
  private readonly providers: RoccoCartridgeProvider[] = [];

  constructor(options: RoccoDefaultCartridgeLoaderOptions) {
    this.defaultProvider = options.defaultProvider;
    this.defaultCartridgeId = options.defaultCartridgeId;
    this.configuredCartridgeId = options.configuredCartridgeId;
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

  async boot(): Promise<RoccoCartridge> {
    if (this.configuredCartridgeId) {
      const configured = await this.loadById(this.configuredCartridgeId);
      if (configured) {
        return configured;
      }
    }

    const available = await this.listAvailableCartridges();
    if (available.length === 0) {
      return this.loadDefault();
    }

    if (available.length > 1) {
      // TODO: add a cartridge selection flow when more than one playable cartridge exists.
    }

    const selected = await this.loadById(available[0].id);
    return selected ?? this.loadDefault();
  }

  private async listAvailableCartridges(): Promise<Array<{ id: string }>> {
    const manifests: Array<{ id: string }> = [];
    for (const provider of this.providers) {
      const listed = await provider.list();
      for (const manifest of listed) {
        manifests.push({ id: manifest.id });
      }
    }

    return manifests;
  }
}

