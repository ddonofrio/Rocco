import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoccoRuntimeAudioSystem } from '../../../src/console/audio/runtime-audio-system';

interface PromiseWithResolversResult<T> {
  promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
  reject(reason?: unknown): void;
}

const promiseConstructor = Promise as PromiseConstructor & {
  withResolvers<T>(): PromiseWithResolversResult<T>;
};

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

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
}

async function createFetchResponse(
  arrayBufferPromise: Promise<ArrayBuffer>,
): Promise<Response> {
  const arrayBuffer = await arrayBufferPromise;
  return {
    ok: true,
    arrayBuffer: () => Promise.resolve(arrayBuffer),
  } as Response;
}

function createPromiseWithResolvers<T>(): PromiseWithResolversResult<T> {
  return promiseConstructor.withResolvers<T>();
}

describe('RoccoRuntimeAudioSystem', () => {
  beforeEach(() => {
    FakeAudioContext.instances.length = 0;
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

  it('keeps a pending sound playback alive while another sound preloads', async () => {
    const fetchResolvers = new Map<string, () => void>();
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockImplementation((input: RequestInfo | URL) => {
        const url = resolveRequestUrl(input);
        return new Promise<Response>((resolve) => {
          fetchResolvers.set(url, () => {
            resolve({
              ok: true,
              arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
            } as Response);
          });
        });
      }),
    );

    const system = new RoccoRuntimeAudioSystem();
    system.registerSound({
      id: 'ambient-loop',
      uri: '/sounds/ambient-loop.mp3',
      volume: 0.2,
      loop: true,
    });
    system.registerSound({
      id: 'portal-loop',
      uri: '/sounds/portal-loop.mp3',
      volume: 0.4,
      loop: true,
    });

    system.playSound('ambient-loop', { loop: true });
    const portalPreload = system.preloadSound('portal-loop');

    fetchResolvers.get('/sounds/ambient-loop.mp3')?.();
    fetchResolvers.get('/sounds/portal-loop.mp3')?.();

    await portalPreload;

    await vi.waitFor(() => {
      expect(FakeAudioContext.instances[0]?.createdSources).toHaveLength(1);
    });

    const context = FakeAudioContext.instances[0];
    expect(context?.createdSources[0]?.loop).toBe(true);
  });

  it('playSound returns a handle that can stop the sound', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      } as Response),
    );

    const system = new RoccoRuntimeAudioSystem();
    system.registerSound({
      id: 'click',
      uri: '/sounds/click.mp3',
    });

    const handle = system.playSound('click');

    await vi.waitFor(() => {
      expect(FakeAudioContext.instances[0]?.createdSources).toHaveLength(1);
    });

    const ended = handle.ended;
    handle.stop();

    const context = FakeAudioContext.instances[0];
    await expect(ended).resolves.toBeUndefined();
    expect(context?.createdSources[0].onended).toBeNull();
  });

  it('re-registering a sound invalidates a previously cached buffer', async () => {
    const fetchMock = vi.fn<typeof fetch>();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    } as Response).mockResolvedValueOnce({
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

  it('stopAllSounds aborts a pending load', async () => {
    const fetchDeferred = createPromiseWithResolvers<ArrayBuffer>();
    const fetchPromise = fetchDeferred.promise;

    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockReturnValue(
        createFetchResponse(fetchPromise),
      ),
    );

    const system = new RoccoRuntimeAudioSystem();
    system.registerSound({
      id: 'delayed-sound',
      uri: '/sounds/delayed.mp3',
    });

    system.playSound('delayed-sound');
    system.stopAllSounds();
    fetchDeferred.resolve(new ArrayBuffer(8));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(FakeAudioContext.instances[0]?.createdSources).toHaveLength(0);
  });
});
