import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoccoJukeboxSystemImpl } from '../../../../src/console/audio/jukebox/jukebox-system';

interface PromiseWithResolversResult<T> {
  promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
  reject(reason?: unknown): void;
}

const promiseConstructor = Promise as PromiseConstructor & {
  withResolvers<T>(): PromiseWithResolversResult<T>;
};

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
  buffer: AudioBuffer | undefined;
  loop = false;
  onended: (() => void) | undefined;

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

async function createFetchResponse(arrayBufferPromise: Promise<ArrayBuffer>): Promise<Response> {
  const arrayBuffer = await arrayBufferPromise;
  return {
    ok: true,
    arrayBuffer: () => Promise.resolve(arrayBuffer),
  } as Response;
}

function createPromiseWithResolvers<T>(): PromiseWithResolversResult<T> {
  return promiseConstructor.withResolvers<T>();
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
      sampleRate: 44_100,
      getChannelData: () => new Float32Array(44_100).fill(0.5),
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
      sampleRate: 44_100,
      getChannelData: () => new Float32Array(88_200).fill(0.5),
    } as unknown as AudioBuffer);
  }
}

class SilentAudioContext extends FakeAudioContext {
  decodeAudioData(): Promise<AudioBuffer> {
    return Promise.resolve({
      duration: 12,
      sampleRate: 44_100,
      getChannelData: () => new Float32Array(44_100).fill(0),
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

  it('AUD-001: stops playback when no playlist has valid segments', async () => {
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

    const handle = await system.playPlaylist('broken-playlist');
    expect((handle as { stop: unknown }).stop).toBeTypeOf('function');
    expect(system.isPlaying()).toBe(false);
  });

  it('AUD-001: stops playback when all segments are shorter than minSegmentDurationMs', async () => {
    vi.stubGlobal('AudioContext', ShortSegmentAudioContext);

    const system = new RoccoJukeboxSystemImpl();
    system.registerPlaylist({
      id: 'short-playlist',
      tracks: [{ id: 'track-a', uri: '/music/a.mp3', volume: 0.8 }],
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

    const handle = await system.playPlaylist('short-playlist');
    expect((handle as { stop: unknown }).stop).toBeTypeOf('function');
    expect(system.isPlaying()).toBe(false);
  });

  it('AUD-002: stopPlaylist prevents a pending loadTrack from resuming playback after fetch resolves', async () => {
    const system = new RoccoJukeboxSystemImpl();
    system.registerPlaylist({
      id: 'late-playlist',
      tracks: [{ id: 'track-a', uri: '/music/a.mp3', volume: 0.8 }],
      mixMode: {
        type: 'auto-mix',
        fadeDurationMs: 1000,
        minSegmentDurationMs: 3000,
      },
      globalVolume: 0.4,
    });

    const fetchDeferred = createPromiseWithResolvers<ArrayBuffer>();
    const fetchPromise = fetchDeferred.promise;

    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockReturnValue(createFetchResponse(fetchPromise)),
    );

    const playPromise = system.playPlaylist('late-playlist');
    system.stopPlaylist();
    fetchDeferred.resolve(new ArrayBuffer(8));

    await playPromise;

    expect(system.isPlaying()).toBe(false);
  });
});
