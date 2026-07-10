import type { RoccoAudioSystem, RoccoSoundDefinition, RoccoSoundPlayOptions } from './types';

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
  private readonly buffers = new Map<string, Promise<AudioBuffer | null>>();
  private readonly activeSources = new Map<string, Set<ActiveSoundNode>>();
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterVolume = 1;

  registerSound(definition: RoccoSoundDefinition): void {
    this.definitions.set(definition.id, clone(definition));
  }

  unregisterSound(soundId: string): void {
    this.stopSound(soundId);
    this.definitions.delete(soundId);
    this.buffers.delete(soundId);
  }

  async preloadSound(soundId: string): Promise<void> {
    await this.loadBuffer(soundId);
  }

  playSound(soundId: string, options?: RoccoSoundPlayOptions): void {
    void this.playSoundAsync(soundId, options);
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
    this.buffers.clear();
    const context = this.context;
    this.context = null;
    this.masterGain = null;
    if (context) {
      void context.close().catch(() => undefined);
    }
  }

  setVolume(volume: number): void {
    this.masterVolume = clampVolume(volume);
    this.applyMasterGainVolume();
  }

  private async playSoundAsync(soundId: string, options?: RoccoSoundPlayOptions): Promise<void> {
    const definition = this.definitions.get(soundId);
    const context = this.ensureContext();
    if (!definition || !context) {
      return;
    }

    if (options?.restart) {
      this.stopSound(soundId);
    }

    const buffer = await this.loadBuffer(soundId);
    if (!buffer) {
      return;
    }

    if (context.state === 'suspended') {
      await context.resume().catch(() => undefined);
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

  private async loadBuffer(soundId: string): Promise<AudioBuffer | null> {
    const existing = this.buffers.get(soundId);
    if (existing) {
      return existing;
    }

    const pending = this.fetchAndDecode(soundId).then((buffer) => {
      if (!buffer) {
        this.buffers.delete(soundId);
      }

      return buffer;
    });
    this.buffers.set(soundId, pending);
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
    };
  }
}
