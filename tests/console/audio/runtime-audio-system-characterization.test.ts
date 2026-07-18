import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoccoRuntimeAudioSystem } from '../../../src/console/audio/runtime-audio-system';

class FakeGainNode {
  readonly gain = { value: 1 };

  connect(): void {}
}

class FakeAudioBufferSourceNode {
  buffer: AudioBuffer | undefined;
  loop = false;
  onended: (() => void) | undefined;

  connect(): void {}

  start(): void {}

  stop(): void {
    this.onended?.();
  }
}

class FakeAudioContext {
  static readonly instances: FakeAudioContext[] = [];

  state: 'running' | 'suspended' | 'closed' = 'running';
  readonly destination = {};
  readonly createdGains: FakeGainNode[] = [];
  readonly createdSources: FakeAudioBufferSourceNode[] = [];

  constructor() {
    FakeAudioContext.instances.push(this);
  }

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

  createBufferSource(): FakeAudioBufferSourceNode {
    const source = new FakeAudioBufferSourceNode();
    this.createdSources.push(source);
    return source;
  }

  createGain(): FakeGainNode {
    const gain = new FakeGainNode();
    this.createdGains.push(gain);
    return gain;
  }
}

describe('RoccoRuntimeAudioSystem characterization', () => {
  beforeEach(() => {
    FakeAudioContext.instances.length = 0;
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('AUD-002: re-registering a sound invalidates a previously cached buffer', async () => {
    const fetchMock = vi.fn<typeof fetch>();

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(16)),
      } as Response);

    vi.stubGlobal('fetch', fetchMock);

    const system = new RoccoRuntimeAudioSystem();
    system.registerSound({
      id: 'pier-bell',
      uri: '/sounds/pier-bell-v1.mp3',
    });

    await system.preloadSound('pier-bell');

    expect(() =>
      system.registerSound({
        id: 'pier-bell',
        uri: '/sounds/pier-bell-v2.mp3',
      }),
    ).toThrow("Duplicate sound registration 'pier-bell'.");

    system.unregisterSound('pier-bell');
    system.registerSound({
      id: 'pier-bell',
      uri: '/sounds/pier-bell-v2.mp3',
    });

    await system.preloadSound('pier-bell');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe('/sounds/pier-bell-v2.mp3');
  });
});
