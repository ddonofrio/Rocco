import { AudioAnalyzer, type AudioAnalysisResult } from './audio-analyzer';
import type { PlaylistHandle, RoccoJukeboxPlaylist, RoccoJukeboxSystem, RoccoJukeboxTrack } from './types';

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
}

interface ActivePlaylistPlayback {
  playbackId: string;
  playlistId: string;
  generation: number;
  ended: Deferred<void>;
  finished: boolean;
}

interface TrackState {
  track: RoccoJukeboxTrack;
  buffer: AudioBuffer;
  analysis: AudioAnalysisResult;
  currentSegmentIndex: number;
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

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(0, Math.min(1, value));
}

export class RoccoJukeboxSystemImpl implements RoccoJukeboxSystem {
  private readonly playlists = new Map<string, RoccoJukeboxPlaylist>();
  private context: AudioContext | null = null;
  private activePlayback: ActivePlaylistPlayback | null = null;
  private trackStates: TrackState[] = [];
  private currentTrackIndex = 0;
  private isPlayingFlag = false;
  private masterGain: GainNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGain: GainNode | null = null;
  private scheduleTimeoutId: number | null = null;
  private readonly cleanupTimeoutIds = new Set<number>();
  private masterVolume = 1;
  private playlistVolume = 1;
  private loadController: AbortController | null = null;
  private nextPlaybackGeneration = 1;
  private nextPlaybackId = 1;

  registerPlaylist(playlist: RoccoJukeboxPlaylist): void {
    if (this.playlists.has(playlist.id)) {
      throw new Error(`Duplicate playlist registration '${playlist.id}'.`);
    }
    this.playlists.set(playlist.id, this.clonePlaylist(playlist));
  }

  unregisterPlaylist(playlistId: string): void {
    if (this.activePlayback?.playlistId === playlistId) {
      this.stopPlaylist();
    }
    this.playlists.delete(playlistId);
  }

  async playPlaylist(playlistId: string): Promise<PlaylistHandle> {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) {
      throw new Error(`Playlist '${playlistId}' not found`);
    }

    if (this.activePlayback?.playlistId === playlistId && this.isPlayingFlag) {
      return this.createPlaylistHandle(this.activePlayback);
    }

    this.stopPlaylist();

    const context = this.ensureContext();
    if (!context) {
      throw new Error('AudioContext not available');
    }

    const playback = this.createPlayback(playlistId);
    this.activePlayback = playback;
    this.loadController = new AbortController();
    const signal = this.loadController.signal;

    if (signal.aborted || !this.isActivePlayback(playback)) {
      return this.createPlaylistHandle(playback);
    }

    if (context.state === 'suspended') {
      await context.resume().catch(() => {});
    }

    if (signal.aborted || !this.isActivePlayback(playback)) {
      return this.createPlaylistHandle(playback);
    }

    if (context.state !== 'running') {
      this.endPlayback(playback);
      return this.createPlaylistHandle(playback);
    }

    this.playlistVolume = clampVolume(playlist.globalVolume ?? 1);
    this.applyMasterGainVolume();

    this.trackStates = [];
    for (const track of playlist.tracks) {
      if (signal.aborted || !this.isActivePlayback(playback)) {
        return this.createPlaylistHandle(playback);
      }

      const buffer = await this.loadTrack(track, context, signal);
      if (!buffer) {
        continue;
      }

      if (signal.aborted || !this.isActivePlayback(playback)) {
        return this.createPlaylistHandle(playback);
      }

      const analysis = AudioAnalyzer.analyzeBuffer(
        buffer,
        playlist.mixMode.silenceThreshold ?? 0.01,
        200,
      );

      this.trackStates.push({
        track,
        buffer,
        analysis,
        currentSegmentIndex: 0,
      });
    }

    if (!this.isActivePlayback(playback)) {
      return this.createPlaylistHandle(playback);
    }

    if (this.trackStates.length === 0) {
      this.endPlayback(playback);
      return this.createPlaylistHandle(playback);
    }

    this.isPlayingFlag = true;
    this.currentTrackIndex = 0;
    this.scheduleNextSegment(playback);
    return this.createPlaylistHandle(playback);
  }

  private createPlayback(playlistId: string): ActivePlaylistPlayback {
    return {
      playbackId: `jukebox-playback-${this.nextPlaybackId++}`,
      playlistId,
      generation: this.nextPlaybackGeneration++,
      ended: createDeferred<void>(),
      finished: false,
    };
  }

  private createPlaylistHandle(playback: ActivePlaylistPlayback): PlaylistHandle {
    return {
      stop: () => {
        if (this.isActivePlayback(playback)) {
          this.stopPlaylist();
        }
      },
      setVolume: (value: number) => {
        if (this.isActivePlayback(playback)) {
          this.setVolume(value);
        }
      },
      get ended() {
        return playback.ended.promise;
      },
    };
  }

  stopPlaylist(): void {
    if (this.activePlayback) {
      this.endPlayback(this.activePlayback);
      return;
    }

    this.isPlayingFlag = false;
    this.trackStates = [];
    this.currentTrackIndex = 0;

    if (this.scheduleTimeoutId !== null) {
      clearTimeout(this.scheduleTimeoutId);
      this.scheduleTimeoutId = null;
    }
    this.clearCleanupTimeouts();

    this.stopSource(this.currentSource);
    this.currentSource = null;
    this.currentGain = null;
    this.playlistVolume = 1;
    this.applyMasterGainVolume();

    this.loadController?.abort('stop');
    this.loadController = null;
  }

  isPlaying(): boolean {
    return this.isPlayingFlag;
  }

  setVolume(volume: number): void {
    this.masterVolume = clampVolume(volume);
    this.applyMasterGainVolume();
  }

  getCurrentTrack(): string | undefined {
    if (this.currentTrackIndex < 0 || this.currentTrackIndex >= this.trackStates.length) {
      return undefined;
    }
    return this.trackStates[this.currentTrackIndex].track.id;
  }

  unlock(): void {
    const context = this.ensureContext();
    if (!context || context.state === 'running') {
      return;
    }
    void context.resume().catch(() => {});
  }

  destroy(): void {
    this.stopPlaylist();
    this.playlists.clear();
    const context = this.context;
    this.context = null;
    this.masterGain = null;
    this.loadController = null;
    if (context) {
      void context.close().catch(() => {});
    }
  }

  private scheduleNextSegment(playback: ActivePlaylistPlayback): void {
    if (!this.isActivePlayback(playback) || !this.context || this.trackStates.length === 0) {
      return;
    }

    const playlist = this.playlists.get(playback.playlistId);
    if (!playlist) {
      this.endPlayback(playback);
      return;
    }

    const maxAttempts = this.trackStates.reduce(
      (sum, trackState) => sum + trackState.analysis.audioSegments.length,
      0,
    ) + this.trackStates.length;

    for (let attempts = 0; attempts < maxAttempts; attempts += 1) {
      const trackState = this.trackStates[this.currentTrackIndex];
      const segment = trackState.analysis.audioSegments[trackState.currentSegmentIndex];

      if (!segment) {
        trackState.currentSegmentIndex = 0;
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.trackStates.length;
        continue;
      }

      const fadeDurationMs = playlist.mixMode.fadeDurationMs ?? 1000;
      const minSegmentDurationMs = playlist.mixMode.minSegmentDurationMs ?? 3000;
      const segmentDuration = segment.end - segment.start;
      const safeFadeDuration = Math.min(fadeDurationMs / 1000, segmentDuration);
      const minSegmentDuration = minSegmentDurationMs / 1000;

      if (segmentDuration < minSegmentDuration) {
        trackState.currentSegmentIndex++;
        continue;
      }

      this.playSegment(playback, trackState, segment, safeFadeDuration);

      const timeUntilNextSchedule = Math.max(0, (segmentDuration - safeFadeDuration) * 1000);
      this.scheduleTimeoutId = globalThis.setTimeout(() => {
        if (!this.isActivePlayback(playback)) {
          return;
        }
        trackState.currentSegmentIndex++;
        this.scheduleNextSegment(playback);
      }, timeUntilNextSchedule);
      return;
    }

    this.endPlayback(playback);
  }

  private playSegment(
    playback: ActivePlaylistPlayback,
    trackState: TrackState,
    segment: { start: number; end: number },
    fadeDuration: number,
  ): void {
    if (!this.context || !this.isActivePlayback(playback)) {
      return;
    }

    const context = this.context;
    const now = context.currentTime;
    const duration = segment.end - segment.start;

    // Shift current to previous (will fade out)
    const previousSource = this.currentSource;
    const previousGain = this.currentGain;

    // Create new source and gain for this segment
    const source = context.createBufferSource();
    const gain = context.createGain();
    const masterGain = this.ensureMasterGain();

    source.buffer = trackState.buffer;
    
    const trackVolume = clampVolume(trackState.track.volume ?? 1);
    
    // Start with volume 0 for fade in
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(trackVolume, now + fadeDuration);
    
    // Fade out at the end
    gain.gain.setValueAtTime(trackVolume, now + duration - fadeDuration);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    source.connect(gain);
    gain.connect(masterGain);

    source.start(now, segment.start, duration);

    this.currentSource = source;
    this.currentGain = gain;

    // Fade out previous source if exists
    if (previousSource && previousGain) {
      previousGain.gain.cancelScheduledValues(now);
      previousGain.gain.setValueAtTime(previousGain.gain.value, now);
      previousGain.gain.linearRampToValueAtTime(0, now + fadeDuration);
      
      // Stop and clean up previous source after fade out
      const timeoutId = globalThis.setTimeout(() => {
        this.cleanupTimeoutIds.delete(timeoutId);
        this.stopSource(previousSource);
      }, fadeDuration * 1000);
      this.cleanupTimeoutIds.add(timeoutId);
    }
  }

  private async loadTrack(
    track: RoccoJukeboxTrack,
    context: AudioContext,
    signal: AbortSignal,
  ): Promise<AudioBuffer | null> {
    try {
      const response = await fetch(track.uri, { signal });
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
    const context = this.context;
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

    this.masterGain.gain.value = clampVolume(this.masterVolume * this.playlistVolume);
  }

  private clearCleanupTimeouts(): void {
    for (const timeoutId of this.cleanupTimeoutIds) {
      clearTimeout(timeoutId);
    }
    this.cleanupTimeoutIds.clear();
  }

  private stopSource(source: AudioBufferSourceNode | null): void {
    if (!source) {
      return;
    }
    try {
      source.stop();
    } catch {
      // May already be stopped
    }
    try {
      source.disconnect();
    } catch {
      // Disconnecting an already released source is harmless.
    }
  }

  private isActivePlayback(playback: ActivePlaylistPlayback): boolean {
    return this.activePlayback?.playbackId === playback.playbackId && !playback.finished;
  }

  private endPlayback(playback: ActivePlaylistPlayback): void {
    if (!this.isActivePlayback(playback)) {
      playback.finished = true;
      playback.ended.resolve();
      return;
    }

    playback.finished = true;
    this.activePlayback = null;
    this.isPlayingFlag = false;
    this.trackStates = [];
    this.currentTrackIndex = 0;

    if (this.scheduleTimeoutId !== null) {
      clearTimeout(this.scheduleTimeoutId);
      this.scheduleTimeoutId = null;
    }
    this.clearCleanupTimeouts();

    this.stopSource(this.currentSource);
    this.currentSource = null;
    if (this.currentGain) {
      try {
        this.currentGain.disconnect();
      } catch {
        // Disconnecting an already released gain is harmless.
      }
    }
    this.currentGain = null;
    this.playlistVolume = 1;
    this.applyMasterGainVolume();

    this.loadController?.abort('stop');
    this.loadController = null;
    playback.ended.resolve();
  }

  private clonePlaylist(playlist: RoccoJukeboxPlaylist): RoccoJukeboxPlaylist {
    return {
      id: playlist.id,
      tracks: playlist.tracks.map((track) => ({ ...track })),
      mixMode: { ...playlist.mixMode },
      globalVolume: playlist.globalVolume,
    };
  }
}
