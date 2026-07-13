export interface SoundHandle {
  stop(): void;
  setVolume(value: number): void;
  readonly ended: Promise<void>;
}

export interface RoccoSoundDefinition {
  id: string;
  uri: string;
  volume?: number;
  loop?: boolean;
}

export interface RoccoSoundPlayOptions {
  volume?: number;
  loop?: boolean;
  restart?: boolean;
}

export interface RoccoAudioSystem {
  registerSound(definition: RoccoSoundDefinition): void;
  unregisterSound(soundId: string): void;
  preloadSound(soundId: string): Promise<void>;
  playSound(soundId: string, options?: RoccoSoundPlayOptions): SoundHandle;
  setSoundVolume(soundId: string, volume: number): void;
  stopSound(soundId: string): void;
  stopAllSounds(): void;
}
