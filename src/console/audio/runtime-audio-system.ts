import type { RoccoAudioSystem, RoccoSoundDefinition, RoccoSoundPlayOptions, SoundHandle } from './types';

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
}

interface PromiseWithResolversResult<T> {
  promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
  reject(reason?: unknown): void;
}

const promiseConstructor = Promise as PromiseConstructor & {
  withResolvers<T>(): PromiseWithResolversResult<T>;
};

interface ActiveSoundPlayback {
  playbackId: string;
  soundId: string;
  source: AudioBufferSourceNode | undefined;
  gain: GainNode | undefined;
  requestedVolume: number;
  ended: Deferred<void>;
  endedListener: (() => void) | undefined;
  finished: boolean;
}

function createDeferred<T>(): Deferred<T> {
  const deferred = promiseConstructor.withResolvers<T>();

  return {
    promise: deferred.promise,
    resolve(value) {
      deferred.resolve(value);
    },
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
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
  private readonly buffers = new Map<string, { revision: number; promise: Promise<AudioBuffer | undefined> }>();
  private readonly activePlaybacks = new Map<string, ActiveSoundPlayback>();
  private readonly soundPlaybackIds = new Map<string, Set<string>>();
  private context: AudioContext | undefined;
  private masterGain: GainNode | undefined;
  private masterVolume = 1;
  private nextPlaybackId = 1;

  private createPlayback(
    soundId: string,
    options?: RoccoSoundPlayOptions,
  ): ActiveSoundPlayback {
    const definition = this.definitions.get(soundId);
    const playback: ActiveSoundPlayback = {
      playbackId: `sound-playback-${this.nextPlaybackId++}`,
      soundId,
      source: undefined,
      gain: undefined,
      requestedVolume: clampVolume(options?.volume ?? definition?.volume ?? 1),
      ended: createDeferred<void>(),
      endedListener: undefined,
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

  private async startPlayback(
    playback: ActiveSoundPlayback,
    options?: RoccoSoundPlayOptions,
  ): Promise<void> {
    try {
      await this.playSoundAsync(playback, options);
    } catch {
      this.finishPlayback(playback.playbackId);
    }
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

      await this.resumeContext(context);
      if (playback.finished || context.state !== 'running') {
        return;
      }

      const source = context.createBufferSource();
      const gain = context.createGain();
      const masterGain = this.ensureMasterGain();
      const endedListener = () => {
        this.finishPlayback(playback.playbackId);
      };
      playback.source = source;
      playback.gain = gain;
      playback.endedListener = endedListener;
      source.buffer = buffer;
      source.loop = options?.loop ?? definition.loop ?? false;
      gain.gain.value = playback.requestedVolume;
      source.connect(gain);
      gain.connect(masterGain);
      source.addEventListener('ended', endedListener);
      source.start();
      isStarted = true;
    } finally {
      if (!isStarted) {
        this.finishPlayback(playback.playbackId);
      }
    }
  }

  private async loadBuffer(soundId: string): Promise<AudioBuffer | undefined> {
    const expectedRevision = this.bufferRevisions.get(soundId) ?? 0;
    const existing = this.buffers.get(soundId);
    if (existing && existing.revision === expectedRevision) {
      return existing.promise;
    }

    const pending = (async (): Promise<AudioBuffer | undefined> => {
      const buffer = await this.fetchAndDecode(soundId);
      if (!buffer) {
        this.buffers.delete(soundId);
      }

      return buffer;
    })();
    this.buffers.set(soundId, { revision: expectedRevision, promise: pending });
    return pending;
  }

  private async fetchAndDecode(soundId: string): Promise<AudioBuffer | undefined> {
    const definition = this.definitions.get(soundId);
    const context = this.ensureContext();
    if (!definition || !context) {
      return undefined;
    }

    try {
      const response = await fetch(definition.uri);
      if (!response.ok) {
        return undefined;
      }
      const audioData = await response.arrayBuffer();
      return await context.decodeAudioData(audioData);
    } catch {
      return undefined;
    }
  }

  private ensureContext(): AudioContext | undefined {
    if (this.context) {
      return this.context;
    }

    if (typeof AudioContext === 'undefined') {
      return undefined;
    }

    this.context = new AudioContext();
    return this.context;
  }

  private async resumeContext(context: AudioContext): Promise<void> {
    if (context.state === 'running') {
      return;
    }

    try {
      await context.resume();
    } catch {
      // Ignore browsers that keep the context suspended until explicit user input.
    }
  }

  private async closeContext(context: AudioContext): Promise<void> {
    try {
      await context.close();
    } catch {
      // Closing an already released audio context is harmless.
    }
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

    if (playback.source && playback.endedListener) {
      playback.source.removeEventListener('ended', playback.endedListener);
      playback.endedListener = undefined;
    }

    if (playback.source) {
      this.stopSource(playback.source);
      playback.source = undefined;
    }

    if (playback.gain) {
      this.disconnectNode(playback.gain);
      playback.gain = undefined;
    }

    playback.ended.resolve();
  }

  private stopSource(source: AudioBufferSourceNode | undefined): void {
    if (!source) {
      return;
    }

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
    void this.startPlayback(playback, options);
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
    if (!context) {
      return;
    }

    void this.resumeContext(context);
  }

  destroy(): void {
    this.stopAllSounds();
    this.definitions.clear();
    this.bufferRevisions.clear();
    this.buffers.clear();
    this.activePlaybacks.clear();
    this.soundPlaybackIds.clear();
    const context = this.context;
    this.context = undefined;
    this.masterGain = undefined;
    if (context) {
      void this.closeContext(context);
    }
  }

  setVolume(volume: number): void {
    this.masterVolume = clampVolume(volume);
    this.applyMasterGainVolume();
  }
}
