import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoccoRuntimeAudioSystem } from './runtime-audio-system';

class FakeAudioContext {
  state: 'running' | 'suspended' | 'closed' = 'running';
  readonly destination = {};

  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.state = 'closed';
    return Promise.resolve();
  }

  decodeAudioData(): Promise<AudioBuffer> {
    return Promise.resolve({} as AudioBuffer);
  }
}

describe('RoccoRuntimeAudioSystem', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('retries a sound load after a previous fetch failure', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce({
        ok: false,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      } as Response);
    vi.stubGlobal('fetch', fetchMock);

    const system = new RoccoRuntimeAudioSystem();
    system.registerSound({
      id: 'pier-bell',
      uri: '/sounds/pier-bell.mp3',
    });

    await system.preloadSound('pier-bell');
    await system.preloadSound('pier-bell');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
