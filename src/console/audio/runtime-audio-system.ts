import type { RoccoAudioSystem, RoccoSoundDefinition, RoccoSoundPlayOptions, SoundHandle } from './types';

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
}

interface ActiveSoundPlayback {
  playbackId: string;
  soundId: string;
  source: AudioBufferSourceNode | null;
  gain: GainNode | null;
  requestedVolume: number;
  ended: Deferred<void>;
  finished: boolean;
}

function createDeferred<T>(): Deferred<T> {
  let isResolved = false;
  let resolvePromise!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve(value) {
      if (isResolved) {
        return;
      }
      isResolved = true;
      resolvePromise(value);
    },
  };
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(0, Math.min(1, value));
}

export class RoccoRuntimeAudioSystem implements RoccoAudioSystem {
  private readonly definitions = new Map<string, RoccoSoundDefinition>();
  private readonly bufferRevisions = new Map<string, number>();
  private readonly buffers = new Map<string, { revision: number; promise: Promise<AudioBuffer | null> }>();
  private readonly activePlaybacks = new Map<string, ActiveSoundPlayback>();
  private readonly soundPlaybackIds = new Map<string, Set<string>>();
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterVolume = 1;
  private nextPlaybackId = 1;

  registerSound(definition: RoccoSoundDefinition): void {
    if (this.definitions.has(definition.id)) {
      throw new Error(`Duplicate sound registration '${definition.id}'.`);
    }
    this.definitions.set(definition.id, clone(definition));
    const current = this.bufferRevisions.get(definition.id) ?? 0;
    this.bufferRevisions.set(definition.id, current + 1);
  }

  unregisterSound(soundId: string): void {
    this.stopSound(soundId);
    this.definitions.delete(soundId);
    this.bufferRevisions.delete(soundId);
    this.buffers.delete(soundId);
  }

  async preloadSound(soundId: string): Promise<void> {
    const definition = this.definitions.get(soundId);
    if (!definition) {
      return;
    }

    await this.loadBuffer(soundId);
  }

  playSound(soundId: string, options?: RoccoSoundPlayOptions): SoundHandle {
    if (options?.restart) {
      this.stopSound(soundId);
    }

    const playback = this.createPlayback(soundId, options);
    void this.playSoundAsync(playback, options).catch(() => {
      this.finishPlayback(playback.playbackId);
    });
    return this.createSoundHandle(playback);
  }

  setSoundVolume(soundId: string, volume: number): void {
    const playbackIds = this.soundPlaybackIds.get(soundId);
    if (!playbackIds) {
      return;
    }

    const clampedVolume = clampVolume(volume);
    for (const playbackId of playbackIds) {
      const playback = this.activePlaybacks.get(playbackId);
      if (!playback) {
        continue;
      }
      playback.requestedVolume = clampedVolume;
      if (playback.gain) {
        playback.gain.gain.value = clampedVolume;
      }
    }
  }

  stopSound(soundId: string): void {
    const playbackIds = this.soundPlaybackIds.get(soundId);
    if (!playbackIds) {
      return;
    }

    for (const playbackId of playbackIds) {
      this.finishPlayback(playbackId);
    }
  }

  stopAllSounds(): void {
    for (const playbackId of this.activePlaybacks.keys()) {
      this.finishPlayback(playbackId);
    }
  }

  unlock(): void {
    const context = this.ensureContext();
    if (!context || context.state === 'running') {
      return;
    }

    void context.resume().catch(() => {});
  }

  destroy(): void {
    this.stopAllSounds();
    this.definitions.clear();
    this.bufferRevisions.clear();
    this.buffers.clear();
    this.activePlaybacks.clear();
    this.soundPlaybackIds.clear();
    const context = this.context;
    this.context = null;
    this.masterGain = null;
    if (context) {
      void context.close().catch(() => {});
    }
  }

  setVolume(volume: number): void {
    this.masterVolume = clampVolume(volume);
    this.applyMasterGainVolume();
  }

  private createPlayback(
    soundId: string,
    options?: RoccoSoundPlayOptions,
  ): ActiveSoundPlayback {
    const definition = this.definitions.get(soundId);
    const playback: ActiveSoundPlayback = {
      playbackId: `sound-playback-${this.nextPlaybackId++}`,
      soundId,
      source: null,
      gain: null,
      requestedVolume: clampVolume(options?.volume ?? definition?.volume ?? 1),
      ended: createDeferred<void>(),
      finished: false,
    };

    this.activePlaybacks.set(playback.playbackId, playback);
    let playbackIds = this.soundPlaybackIds.get(soundId);
    if (!playbackIds) {
      playbackIds = new Set();
      this.soundPlaybackIds.set(soundId, playbackIds);
    }
    playbackIds.add(playback.playbackId);
    return playback;
  }

  private async playSoundAsync(
    playback: ActiveSoundPlayback,
    options?: RoccoSoundPlayOptions,
  ): Promise<void> {
    const definition = this.definitions.get(playback.soundId);
    const context = this.ensureContext();
    let isStarted = false;

    try {
      if (!definition || !context || playback.finished) {
        return;
      }

      const buffer = await this.loadBuffer(playback.soundId);
      if (!buffer || playback.finished) {
        return;
      }

      if (context.state === 'suspended') {
        await context.resume().catch(() => {});
      }

      if (playback.finished || context.state !== 'running') {
        return;
      }

      const source = context.createBufferSource();
      const gain = context.createGain();
      const masterGain = this.ensureMasterGain();
      playback.source = source;
      playback.gain = gain;
      source.buffer = buffer;
      source.loop = options?.loop ?? definition.loop ?? false;
      gain.gain.value = playback.requestedVolume;
      source.connect(gain);
      gain.connect(masterGain);
      source.addEventListener('ended', () => {
        this.finishPlayback(playback.playbackId);
      });
      source.start();
      isStarted = true;
    } finally {
      if (!isStarted) {
        this.finishPlayback(playback.playbackId);
      }
    }
  }

  private async loadBuffer(soundId: string): Promise<AudioBuffer | null> {
    const expectedRevision = this.bufferRevisions.get(soundId) ?? 0;
    const existing = this.buffers.get(soundId);
    if (existing && existing.revision === expectedRevision) {
      return existing.promise;
    }

    const pending = this.fetchAndDecode(soundId).then((buffer) => {
      if (!buffer) {
        this.buffers.delete(soundId);
      }

      return buffer;
    });
    this.buffers.set(soundId, { revision: expectedRevision, promise: pending });
    return pending;
  }

  private async fetchAndDecode(soundId: string): Promise<AudioBuffer | null> {
    const definition = this.definitions.get(soundId);
    const context = this.ensureContext();
    if (!definition || !context) {
      return null;
    }

    try {
      const response = await fetch(definition.uri);
      if (!response.ok) {
        return null;
      }
      const audioData = await response.arrayBuffer();
      return await context.decodeAudioData(audioData);
    } catch {
      return null;
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }

    if (typeof AudioContext === 'undefined') {
      return null;
    }

    this.context = new AudioContext();
    return this.context;
  }

  private ensureMasterGain(): GainNode {
    const context = this.ensureContext();
    if (!context) {
      throw new Error('AudioContext not available');
    }

    if (this.masterGain) {
      return this.masterGain;
    }

    this.masterGain = context.createGain();
    this.applyMasterGainVolume();
    this.masterGain.connect(context.destination);
    return this.masterGain;
  }

  private applyMasterGainVolume(): void {
    if (!this.masterGain) {
      return;
    }

    this.masterGain.gain.value = this.masterVolume;
  }

  private createSoundHandle(playback: ActiveSoundPlayback): SoundHandle {
    return {
      stop: () => {
        this.finishPlayback(playback.playbackId);
      },
      setVolume: (value: number) => this.setPlaybackVolume(playback.playbackId, value),
      get ended() {
        return playback.ended.promise;
      },
    };
  }

  private setPlaybackVolume(playbackId: string, value: number): void {
    const playback = this.activePlaybacks.get(playbackId);
    if (!playback) {
      return;
    }

    playback.requestedVolume = clampVolume(value);
    if (playback.gain) {
      playback.gain.gain.value = playback.requestedVolume;
    }
  }

  private finishPlayback(playbackId: string): void {
    const playback = this.activePlaybacks.get(playbackId);
    if (!playback || playback.finished) {
      return;
    }

    playback.finished = true;
    this.activePlaybacks.delete(playbackId);

    const playbackIds = this.soundPlaybackIds.get(playback.soundId);
    playbackIds?.delete(playbackId);
    if (playbackIds?.size === 0) {
      this.soundPlaybackIds.delete(playback.soundId);
    }

    if (playback.source) {
      playback.source.onended = null;
      this.stopSource(playback.source);
      playback.source = null;
    }

    if (playback.gain) {
      this.disconnectNode(playback.gain);
      playback.gain = null;
    }

    playback.ended.resolve();
  }

  private stopSource(source: AudioBufferSourceNode): void {
    try {
      source.stop();
    } catch {
      // The source may have already ended naturally.
    }
    this.disconnectNode(source);
  }

  private disconnectNode(
    node: Pick<AudioBufferSourceNode, 'disconnect'> | Pick<GainNode, 'disconnect'>,
  ): void {
    try {
      node.disconnect();
    } catch {
      // Disconnecting an already released node is harmless.
    }
  }
}
