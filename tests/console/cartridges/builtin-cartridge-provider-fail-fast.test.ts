import { describe, expect, it } from 'vitest';

import type { RoccoCartridge, RoccoCartridgeRegistration } from '../../../src/console/cartridges';
import { RoccoBuiltinCartridgeProvider } from '../../../src/console/cartridges/providers/builtin-cartridge-provider';

function makeRegistration(id: string): RoccoCartridgeRegistration {
  return {
    manifest: {
      id,
      title: id,
      version: '0.1.0',
    },
    createCartridge: () =>
      ({
        manifest: { id },
        mount: async () => {},
      }) as unknown as RoccoCartridge,
  };
}

describe('RoccoBuiltinCartridgeProvider', () => {
  it('registers multiple cartridges', async () => {
    const provider = new RoccoBuiltinCartridgeProvider([
      makeRegistration('alpha'),
      makeRegistration('beta'),
    ]);

    const manifests = await provider.list();
    expect(manifests).toHaveLength(2);
  });

  it('throws on duplicate cartridge id', () => {
    expect(() =>
      new RoccoBuiltinCartridgeProvider([makeRegistration('alpha'), makeRegistration('alpha')]),
    ).toThrow("Duplicate cartridge registration 'alpha'.");
  });

  it('loads a cartridge by id', async () => {
    const provider = new RoccoBuiltinCartridgeProvider([makeRegistration('alpha')]);

    const cartridge = await provider.load('alpha');
    expect(cartridge).toBeDefined();
    expect(cartridge?.manifest.id).toBe('alpha');
  });
});
