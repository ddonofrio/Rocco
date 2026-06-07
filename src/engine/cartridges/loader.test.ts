import { describe, expect, it } from 'vitest';

import { RoccoDefaultCartridgeLoader } from './loader';
import { RoccoBuiltinCartridgeProvider } from './providers/builtin-cartridge-provider';
import type { RoccoCartridge } from './types';

function makeCartridge(id: string): RoccoCartridge {
  return {
    manifest: {
      id,
      title: `Cartridge ${id}`,
      version: '1.0.0',
    },
    mount() {
      // noop
    },
  };
}

describe('RoccoBuiltinCartridgeProvider', () => {
  it('lists and loads cartridges', async () => {
    const alpha = makeCartridge('alpha');
    const provider = new RoccoBuiltinCartridgeProvider([alpha]);

    const listed = await provider.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe('alpha');

    const loaded = await provider.load('alpha');
    expect(loaded?.manifest.id).toBe('alpha');
  });
});

describe('RoccoDefaultCartridgeLoader', () => {
  it('loads default cartridge when no external cartridges are registered', async () => {
    const defaultCartridge = makeCartridge('default');
    const loader = new RoccoDefaultCartridgeLoader({
      defaultProvider: new RoccoBuiltinCartridgeProvider([defaultCartridge]),
      defaultCartridgeId: 'default',
    });

    const loaded = await loader.boot();
    expect(loaded.manifest.id).toBe('default');
  });

  it('loads external cartridge when exactly one provider cartridge exists', async () => {
    const defaultCartridge = makeCartridge('default');
    const externalCartridge = makeCartridge('external');
    const loader = new RoccoDefaultCartridgeLoader({
      defaultProvider: new RoccoBuiltinCartridgeProvider([defaultCartridge]),
      defaultCartridgeId: 'default',
    });
    loader.registerProvider(new RoccoBuiltinCartridgeProvider([externalCartridge]));

    const loaded = await loader.boot();
    expect(loaded.manifest.id).toBe('external');
  });

  it('loads configured cartridge id when available', async () => {
    const defaultCartridge = makeCartridge('default');
    const configured = makeCartridge('configured');
    const loader = new RoccoDefaultCartridgeLoader({
      defaultProvider: new RoccoBuiltinCartridgeProvider([defaultCartridge]),
      defaultCartridgeId: 'default',
      configuredCartridgeId: 'configured',
    });
    loader.registerProvider(new RoccoBuiltinCartridgeProvider([configured]));

    const loaded = await loader.boot();
    expect(loaded.manifest.id).toBe('configured');
  });
});

