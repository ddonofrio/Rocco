import { describe, expect, it } from 'vitest';

import { RoccoDefaultCartridgeLoader } from '../../../src/console/cartridges/loader';
import { RoccoBuiltinCartridgeProvider } from '../../../src/console/cartridges/providers/builtin-cartridge-provider';
import type {
  RoccoCartridge,
  RoccoCartridgeRegistration,
} from '../../../src/console/cartridges/types';

function makeCartridge(id: string): RoccoCartridge {
  return {
    manifest: {
      id,
      title: `Cartridge ${id}`,
      version: '1.0.0',
      runtime: { sdk: '^1.0.0', capabilities: [] },
    },
    mount() {
      // noop
    },
  };
}

function makeRegistration(id: string): RoccoCartridgeRegistration {
  return {
    manifest: {
      id,
      title: `Cartridge ${id}`,
      version: '1.0.0',
      runtime: { sdk: '^1.0.0', capabilities: [] },
    },
    createCartridge: () => makeCartridge(id),
  };
}

describe('RoccoBuiltinCartridgeProvider', () => {
  it('lists and loads cartridges', async () => {
    const provider = new RoccoBuiltinCartridgeProvider([makeRegistration('alpha')]);

    const listed = await provider.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe('alpha');

    const loaded = await provider.load('alpha');
    expect(loaded?.manifest.id).toBe('alpha');
  });

  it('creates a fresh cartridge instance for each load', async () => {
    const provider = new RoccoBuiltinCartridgeProvider([makeRegistration('alpha')]);

    const first = await provider.load('alpha');
    const second = await provider.load('alpha');

    expect(first).not.toBe(second);
    expect(first?.manifest.id).toBe('alpha');
    expect(second?.manifest.id).toBe('alpha');
  });
});

describe('RoccoDefaultCartridgeLoader', () => {
  it('loads default cartridge when requested', async () => {
    const loader = new RoccoDefaultCartridgeLoader({
      defaultProvider: new RoccoBuiltinCartridgeProvider([makeRegistration('default')]),
      defaultCartridgeId: 'default',
    });

    const loaded = await loader.loadDefault();
    expect(loaded.manifest.id).toBe('default');
  });

  it('loads external cartridge by id when registered in an additional provider', async () => {
    const loader = new RoccoDefaultCartridgeLoader({
      defaultProvider: new RoccoBuiltinCartridgeProvider([makeRegistration('default')]),
      defaultCartridgeId: 'default',
    });
    loader.registerProvider(new RoccoBuiltinCartridgeProvider([makeRegistration('external')]));

    const loaded = await loader.loadById('external');
    expect(loaded?.manifest.id).toBe('external');
  });

  it('falls back to the default provider when a cartridge id is not found externally', async () => {
    const loader = new RoccoDefaultCartridgeLoader({
      defaultProvider: new RoccoBuiltinCartridgeProvider([makeRegistration('default')]),
      defaultCartridgeId: 'default',
    });

    const loaded = await loader.loadById('default');
    expect(loaded?.manifest.id).toBe('default');
  });
});
