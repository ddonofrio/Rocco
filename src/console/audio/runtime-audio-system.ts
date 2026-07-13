import type { RoccoAudioSystem, RoccoSoundDefinition, RoccoSoundPlayOptions, SoundHandle } from './types';

interface ActiveSoundNode {
  source: AudioBufferSourceNode;
  gain: GainNode;
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
  private readonly activeSources = new Map<string, Set<ActiveSoundNode>>();
  private readonly soundEndedResolvers = new Map<string, (() => void)[]>();
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterVolume = 1;
  private generation = 0;
  private loadController: AbortController | null = null;

  registerSound(definition: RoccoSoundDefinition): void {
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
    this.loadController?.abort('superseded');
    this.loadController = new AbortController();
    const currentGeneration = ++this.generation;
    const signal = this.loadController.signal;

    const definition = this.definitions.get(soundId);
    if (!definition) {
      return;
    }

    if (signal.aborted) {
      return;
    }

    await this.loadBuffer(soundId, signal);

    if (signal.aborted || currentGeneration !== this.generation) {
      return;
    }
  }

  playSound(soundId: string, options?: RoccoSoundPlayOptions): SoundHandle {
    void this.playSoundAsync(soundId, options);
    return this.createSoundHandle(soundId);
  }

  setSoundVolume(soundId: string, volume: number): void {
    const sources = this.activeSources.get(soundId);
    if (!sources) {
      return;
    }

    const clampedVolume = clampVolume(volume);
    for (const entry of sources) {
      entry.gain.gain.value = clampedVolume;
    }
  }

  stopSound(soundId: string): void {
    const sources = this.activeSources.get(soundId);
    if (!sources) {
      return;
    }

    for (const entry of sources) {
      try {
        entry.source.stop();
      } catch {
        // The source may have already ended naturally.
      }
    }
    sources.clear();
    this.activeSources.delete(soundId);
  }

  stopAllSounds(): void {
    this.loadController?.abort('stop');
    this.loadController = null;
    for (const soundId of [...this.activeSources.keys()]) {
      this.stopSound(soundId);
    }
  }

  unlock(): void {
    const context = this.ensureContext();
    if (!context || context.state === 'running') {
      return;
    }

    void context.resume().catch(() => undefined);
  }

  destroy(): void {
    this.stopAllSounds();
    this.definitions.clear();
    this.bufferRevisions.clear();
    this.buffers.clear();
    this.soundEndedResolvers.clear();
    const context = this.context;
    this.context = null;
    this.masterGain = null;
    this.loadController = null;
    if (context) {
      void context.close().catch(() => undefined);
    }
  }

  setVolume(volume: number): void {
    this.masterVolume = clampVolume(volume);
    this.applyMasterGainVolume();
  }

  private async playSoundAsync(soundId: string, options?: RoccoSoundPlayOptions): Promise<void> {
    this.loadController?.abort('superseded');
    this.loadController = new AbortController();
    const currentGeneration = ++this.generation;
    const signal = this.loadController.signal;

    const definition = this.definitions.get(soundId);
    const context = this.ensureContext();
    if (!definition || !context) {
      return;
    }

    if (signal.aborted) {
      return;
    }

    if (options?.restart) {
      this.stopSound(soundId);
    }

    if (signal.aborted || currentGeneration !== this.generation) {
      return;
    }

    const buffer = await this.loadBuffer(soundId, signal);
    if (!buffer) {
      return;
    }

    if (signal.aborted || currentGeneration !== this.generation) {
      return;
    }

    if (context.state === 'suspended') {
      await context.resume().catch(() => undefined);
    }

    if (signal.aborted || currentGeneration !== this.generation) {
      return;
    }

    if (context.state !== 'running') {
      return;
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    const masterGain = this.ensureMasterGain();
    source.buffer = buffer;
    source.loop = options?.loop ?? definition.loop ?? false;
    gain.gain.value = clampVolume(options?.volume ?? definition.volume ?? 1);
    source.connect(gain);
    gain.connect(masterGain);
    this.trackSource(soundId, source, gain);
    source.start();
  }

  private async loadBuffer(soundId: string, signal: AbortSignal): Promise<AudioBuffer | null> {
    const expectedRevision = this.bufferRevisions.get(soundId) ?? 0;
    const existing = this.buffers.get(soundId);
    if (existing && existing.revision === expectedRevision) {
      return existing.promise;
    }

    const pending = this.fetchAndDecode(soundId, signal).then((buffer) => {
      if (!buffer) {
        this.buffers.delete(soundId);
      }

      return buffer;
    });
    this.buffers.set(soundId, { revision: expectedRevision, promise: pending });
    return pending;
  }

  private async fetchAndDecode(soundId: string, signal: AbortSignal): Promise<AudioBuffer | null> {
    const definition = this.definitions.get(soundId);
    const context = this.ensureContext();
    if (!definition || !context) {
      return null;
    }

    try {
      const response = await fetch(definition.uri, { signal });
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

  private trackSource(soundId: string, source: AudioBufferSourceNode, gain: GainNode): void {
    let sources = this.activeSources.get(soundId);
    if (!sources) {
      sources = new Set();
      this.activeSources.set(soundId, sources);
    }
    const entry: ActiveSoundNode = { source, gain };
    sources.add(entry);
    source.onended = () => {
      sources?.delete(entry);
      if (sources?.size === 0) {
        this.activeSources.delete(soundId);
      }
      this.resolveSoundEnded(soundId);
    };
  }

  private createSoundHandle(soundId: string): SoundHandle {
    let resolveEnded: (() => void) | undefined;
    const ended = new Promise<void>((resolve) => {
      resolveEnded = resolve;
    });

    const registerResolver = () => {
      if (!resolveEnded) {
        return;
      }
      const resolvers = this.soundEndedResolvers.get(soundId) ?? [];
      resolvers.push(resolveEnded);
      this.soundEndedResolvers.set(soundId, resolvers);
    };

    registerResolver();

    return {
      stop: () => {
        this.stopSound(soundId);
        this.resolveSoundEnded(soundId);
      },
      setVolume: (value: number) => this.setSoundVolume(soundId, value),
      get ended() {
        return ended;
      },
    };
  }

  private resolveSoundEnded(soundId: string): void {
    const resolvers = this.soundEndedResolvers.get(soundId);
    if (resolvers) {
      for (const resolve of resolvers) {
        resolve();
      }
      this.soundEndedResolvers.delete(soundId);
    }
  }
}
