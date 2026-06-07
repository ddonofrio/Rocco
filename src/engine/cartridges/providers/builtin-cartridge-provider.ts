import type { RoccoCartridge, RoccoCartridgeManifest, RoccoCartridgeProvider } from '../types';

export class RoccoBuiltinCartridgeProvider implements RoccoCartridgeProvider {
  private readonly cartridges = new Map<string, RoccoCartridge>();

  constructor(cartridges: RoccoCartridge[]) {
    for (const cartridge of cartridges) {
      this.cartridges.set(cartridge.manifest.id, cartridge);
    }
  }

  async list(): Promise<RoccoCartridgeManifest[]> {
    return [...this.cartridges.values()].map((cartridge) => ({ ...cartridge.manifest }));
  }

  async load(id: string): Promise<RoccoCartridge | undefined> {
    return this.cartridges.get(id);
  }
}

