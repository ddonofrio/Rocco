export interface RoccoJukeboxTrack {
  id: string;
  uri: string;
  volume?: number;
}

export interface RoccoJukeboxMixMode {
  type: 'auto-mix';
  fadeDurationMs?: number;
  silenceThreshold?: number;
  minSegmentDurationMs?: number;
}

export interface RoccoJukeboxPlaylist {
  id: string;
  tracks: RoccoJukeboxTrack[];
  mixMode: RoccoJukeboxMixMode;
  globalVolume?: number;
}

export interface RoccoJukeboxSystem {
  registerPlaylist(playlist: RoccoJukeboxPlaylist): void;
  unregisterPlaylist(playlistId: string): void;
  playPlaylist(playlistId: string): Promise<void>;
  stopPlaylist(): void;
  isPlaying(): boolean;
  setVolume(volume: number): void;
  getCurrentTrack(): string | undefined;
  unlock(): void;
}
