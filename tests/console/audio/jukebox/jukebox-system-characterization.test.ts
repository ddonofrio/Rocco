import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoccoJukeboxSystemImpl } from '../../../../src/console/audio/jukebox/jukebox-system';

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

class ShortSegmentAudioContext extends FakeAudioContext {
  decodeAudioData(): Promise<AudioBuffer> {
    return Promise.resolve({
      duration: 2,
      sampleRate: 44100,
      getChannelData: () => new Float32Array(88200).fill(0.5),
    } as unknown as AudioBuffer);
  }
}

class SilentAudioContext extends FakeAudioContext {
  decodeAudioData(): Promise<AudioBuffer> {
    return Promise.resolve({
      duration: 12,
      sampleRate: 44100,
      getChannelData: () => new Float32Array(44100).fill(0),
    } as unknown as AudioBuffer);
  }
}

describe('RoccoJukeboxSystemImpl characterization', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('AUD-001: recurses synchronously until stack overflow when no playlist has valid segments', async () => {
    vi.stubGlobal('AudioContext', SilentAudioContext);

    const system = new RoccoJukeboxSystemImpl();
    system.registerPlaylist({
      id: 'broken-playlist',
      tracks: [
        { id: 'track-a', uri: '/music/a.mp3', volume: 0.8 },
        { id: 'track-b', uri: '/music/b.mp3', volume: 0.8 },
      ],
      mixMode: {
        type: 'auto-mix',
        fadeDurationMs: 1000,
        minSegmentDurationMs: 3000,
      },
      globalVolume: 0.4,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      } as Response),
    );

    await expect(system.playPlaylist('broken-playlist')).rejects.toThrow(RangeError);
  });

  it('AUD-001: recurses synchronously until stack overflow when all segments are shorter than minSegmentDurationMs', async () => {
    vi.stubGlobal('AudioContext', ShortSegmentAudioContext);

    const system = new RoccoJukeboxSystemImpl();
    system.registerPlaylist({
      id: 'short-playlist',
      tracks: [
        { id: 'track-a', uri: '/music/a.mp3', volume: 0.8 },
      ],
      mixMode: {
        type: 'auto-mix',
        fadeDurationMs: 1000,
        minSegmentDurationMs: 3000,
      },
      globalVolume: 0.4,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      } as Response),
    );

    await expect(system.playPlaylist('short-playlist')).rejects.toThrow(RangeError);
  });

  it('AUD-002: stopPlaylist does not prevent a pending loadTrack from resuming playback after fetch resolves', async () => {
    const system = new RoccoJukeboxSystemImpl();
    system.registerPlaylist({
      id: 'late-playlist',
      tracks: [
        { id: 'track-a', uri: '/music/a.mp3', volume: 0.8 },
      ],
      mixMode: {
        type: 'auto-mix',
        fadeDurationMs: 1000,
        minSegmentDurationMs: 3000,
      },
      globalVolume: 0.4,
    });

    let resolveFetch!: (value: ArrayBuffer) => void;
    const fetchPromise = new Promise<ArrayBuffer>((resolve) => {
      resolveFetch = resolve;
    });

    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockReturnValue(
        new Promise<Response>((resolve) => {
          fetchPromise.then((arrayBuffer) => {
            resolve({
              ok: true,
              arrayBuffer: () => Promise.resolve(arrayBuffer),
            } as Response);
          }).catch(() => {});
        }),
      ),
    );

    const playPromise = system.playPlaylist('late-playlist');
    system.stopPlaylist();
    resolveFetch(new ArrayBuffer(8));

    await playPromise.catch(() => {});

    expect(system.isPlaying()).toBe(true);
  });
});
