import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoccoJukeboxSystemImpl } from './jukebox-system';

class FakeGainNode {
  readonly gain = {
    value: 1,
    setValueAtTime: (value: number) => {
      this.gain.value = value;
    },
    linearRampToValueAtTime: (value: number) => {
      this.gain.value = value;
    },
    cancelScheduledValues: () => {
      return;
    },
  };

  connect(): void {
    return;
  }
}

class FakeAudioBufferSourceNode {
  buffer: AudioBuffer | null = null;
  loop = false;
  onended: (() => void) | null = null;

  connect(): void {
    return;
  }

  disconnect(): void {
    return;
  }

  start(): void {
    return;
  }

  stop(): void {
    this.onended?.();
  }
}

class FakeAudioContext {
  state: 'running' | 'suspended' | 'closed' = 'running';
  currentTime = 0;
  readonly destination = {};
  readonly gains: FakeGainNode[] = [];
  readonly sources: FakeAudioBufferSourceNode[] = [];

  createGain(): GainNode {
    const gain = new FakeGainNode();
    this.gains.push(gain);
    return gain as unknown as GainNode;
  }

  createBufferSource(): AudioBufferSourceNode {
    const source = new FakeAudioBufferSourceNode();
    this.sources.push(source);
    return source as unknown as AudioBufferSourceNode;
  }

  decodeAudioData(): Promise<AudioBuffer> {
    return Promise.resolve({
      duration: 12,
      sampleRate: 44100,
      getChannelData: () => new Float32Array(44100).fill(0.5),
    } as unknown as AudioBuffer);
  }

  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.state = 'closed';
    return Promise.resolve();
  }
}

describe('RoccoJukeboxSystemImpl', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      } as Response),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('multiplies playlist volume with the master jukebox volume', async () => {
    const system = new RoccoJukeboxSystemImpl();
    system.registerPlaylist({
      id: 'pier-music',
      tracks: [{ id: 'track-a', uri: '/music/a.mp3', volume: 0.8 }],
      mixMode: {
        type: 'auto-mix',
        fadeDurationMs: 1000,
        minSegmentDurationMs: 3000,
      },
      globalVolume: 0.4,
    });

    await system.playPlaylist('pier-music');

    const context = (system as unknown as { context: FakeAudioContext | null }).context;
    const masterGain = context?.gains.at(-1);
    expect(masterGain?.gain.value).toBeCloseTo(0.4);

    system.setVolume(0.5);

    expect(masterGain?.gain.value).toBeCloseTo(0.2);
  });
});
