import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoccoRuntimeAudioSystem } from './runtime-audio-system';

class FakeGainNode {
  readonly gain = { value: 1 };

  connect(): void {}
}

class FakeAudioBufferSourceNode {
  buffer: AudioBuffer | null = null;
  loop = false;
  onended: (() => void) | null = null;

  connect(): void {}

  start(): void {}

  stop(): void {
    this.onended?.();
  }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

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

describe('RoccoRuntimeAudioSystem', () => {
  beforeEach(() => {
    FakeAudioContext.instances = [];
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

  it('updates the gain of active sound instances without restarting playback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      } as Response),
    );

    const system = new RoccoRuntimeAudioSystem();
    system.registerSound({
      id: 'steam-loop',
      uri: '/sounds/steam-loop.mp3',
      volume: 0.2,
      loop: true,
    });

    system.playSound('steam-loop', { loop: true });

    await vi.waitFor(() => {
      expect(FakeAudioContext.instances[0]?.createdGains).toHaveLength(2);
    });

    const context = FakeAudioContext.instances[0];
    const soundGain = context?.createdGains[0];
    expect(soundGain?.gain.value).toBeCloseTo(0.2, 4);

    system.setSoundVolume('steam-loop', 0.27);

    expect(soundGain?.gain.value).toBeCloseTo(0.27, 4);
    expect(context?.createdSources).toHaveLength(1);
  });
});
