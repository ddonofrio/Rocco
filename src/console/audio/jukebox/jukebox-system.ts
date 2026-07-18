import { AudioAnalyzer, type AudioAnalysisResult } from './audio-analyzer';
import type {
  PlaylistHandle,
  RoccoJukeboxPlaylist,
  RoccoJukeboxSystem,
  RoccoJukeboxTrack,
} from './types';

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
  const deferred = promiseConstructor.withResolvers<T>();

  return {
    promise: deferred.promise,
    resolve(value) {
      deferred.resolve(value);
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
  private context: AudioContext | undefined;
  private activePlayback: ActivePlaylistPlayback | undefined;
  private trackStates: TrackState[] = [];
  private currentTrackIndex = 0;
  private isPlayingFlag = false;
  private masterGain: GainNode | undefined;
  private currentSource: AudioBufferSourceNode | undefined;
  private currentGain: GainNode | undefined;
  private scheduleTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private readonly cleanupTimeoutIds = new Set<ReturnType<typeof setTimeout>>();
  private masterVolume = 1;
  private playlistVolume = 1;
  private loadController: AbortController | undefined;
  private nextPlaybackGeneration = 1;
  private nextPlaybackId = 1;

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

  private isActivePlayback(playback: ActivePlaylistPlayback): boolean {
    return this.activePlayback?.playbackId === playback.playbackId && !playback.finished;
  }

  private shouldAbortPlayback(playback: ActivePlaylistPlayback, signal: AbortSignal): boolean {
    return signal.aborted || !this.isActivePlayback(playback);
  }

  private async resumeContext(context: AudioContext): Promise<void> {
    if (context.state === 'running') {
      return;
    }

    try {
      await context.resume();
    } catch {
      // Ignore browsers that keep the context suspended until user input.
    }
  }

  private async closeContext(context: AudioContext): Promise<void> {
    try {
      await context.close();
    } catch {
      // Closing an already released audio context is harmless.
    }
  }

  private clearScheduleTimeout(): void {
    if (this.scheduleTimeoutId === undefined) {
      return;
    }

    clearTimeout(this.scheduleTimeoutId);
    this.scheduleTimeoutId = undefined;
  }

  private clearCleanupTimeouts(): void {
    for (const timeoutId of this.cleanupTimeoutIds) {
      clearTimeout(timeoutId);
    }
    this.cleanupTimeoutIds.clear();
  }

  private stopSource(source: AudioBufferSourceNode | undefined): void {
    if (!source) {
      return;
    }

    try {
      source.stop();
    } catch {
      // May already be stopped.
    }
    try {
      source.disconnect();
    } catch {
      // Disconnecting an already released source is harmless.
    }
  }

  private disconnectGain(gain: GainNode | undefined): void {
    if (!gain) {
      return;
    }

    try {
      gain.disconnect();
    } catch {
      // Disconnecting an already released gain is harmless.
    }
  }

  private clearCurrentPlaybackResources(): void {
    this.isPlayingFlag = false;
    this.trackStates = [];
    this.currentTrackIndex = 0;
    this.clearScheduleTimeout();
    this.clearCleanupTimeouts();
    this.stopSource(this.currentSource);
    this.currentSource = undefined;
    this.disconnectGain(this.currentGain);
    this.currentGain = undefined;
    this.playlistVolume = 1;
    this.applyMasterGainVolume();
    this.loadController?.abort('stop');
    this.loadController = undefined;
  }

  private endPlayback(playback: ActivePlaylistPlayback): void {
    if (!this.isActivePlayback(playback)) {
      playback.finished = true;
      playback.ended.resolve();
      return;
    }

    playback.finished = true;
    this.activePlayback = undefined;
    this.clearCurrentPlaybackResources();
    playback.ended.resolve();
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

  private async loadTrackStates(
    playlist: RoccoJukeboxPlaylist,
    context: AudioContext,
    signal: AbortSignal,
    playback: ActivePlaylistPlayback,
  ): Promise<void> {
    this.trackStates = [];

    for (const track of playlist.tracks) {
      if (this.shouldAbortPlayback(playback, signal)) {
        return;
      }

      const buffer = await this.loadTrack(track, context, signal);
      if (!buffer) {
        continue;
      }

      if (this.shouldAbortPlayback(playback, signal)) {
        return;
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

    const maxAttempts =
      this.trackStates.reduce(
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
      this.scheduleTimeoutId = setTimeout(() => {
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
    const previousSource = this.currentSource;
    const previousGain = this.currentGain;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const masterGain = this.ensureMasterGain();
    const trackVolume = clampVolume(trackState.track.volume ?? 1);

    source.buffer = trackState.buffer;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(trackVolume, now + fadeDuration);
    gain.gain.setValueAtTime(trackVolume, now + duration - fadeDuration);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    source.connect(gain);
    gain.connect(masterGain);
    source.start(now, segment.start, duration);

    this.currentSource = source;
    this.currentGain = gain;

    if (previousSource && previousGain) {
      previousGain.gain.cancelScheduledValues(now);
      previousGain.gain.setValueAtTime(previousGain.gain.value, now);
      previousGain.gain.linearRampToValueAtTime(0, now + fadeDuration);

      const timeoutId = setTimeout(() => {
        this.cleanupTimeoutIds.delete(timeoutId);
        this.disconnectGain(previousGain);
        this.stopSource(previousSource);
      }, fadeDuration * 1000);
      this.cleanupTimeoutIds.add(timeoutId);
    }
  }

  private async loadTrack(
    track: RoccoJukeboxTrack,
    context: AudioContext,
    signal: AbortSignal,
  ): Promise<AudioBuffer | undefined> {
    try {
      const response = await fetch(track.uri, { signal });
      if (!response.ok) {
        return undefined;
      }
      const audioData = await response.arrayBuffer();
      return await context.decodeAudioData(audioData);
    } catch {
      return undefined;
    }
  }

  private clonePlaylist(playlist: RoccoJukeboxPlaylist): RoccoJukeboxPlaylist {
    return {
      id: playlist.id,
      tracks: playlist.tracks.map((track) => ({ ...track })),
      mixMode: { ...playlist.mixMode },
      globalVolume: playlist.globalVolume,
    };
  }

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

    if (this.shouldAbortPlayback(playback, signal)) {
      return this.createPlaylistHandle(playback);
    }

    await this.resumeContext(context);
    if (this.shouldAbortPlayback(playback, signal)) {
      return this.createPlaylistHandle(playback);
    }

    if (context.state !== 'running') {
      this.endPlayback(playback);
      return this.createPlaylistHandle(playback);
    }

    this.playlistVolume = clampVolume(playlist.globalVolume ?? 1);
    this.applyMasterGainVolume();
    await this.loadTrackStates(playlist, context, signal, playback);

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

  stopPlaylist(): void {
    if (this.activePlayback) {
      this.endPlayback(this.activePlayback);
      return;
    }

    this.clearCurrentPlaybackResources();
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
    if (!context) {
      return;
    }
    void this.resumeContext(context);
  }

  destroy(): void {
    this.stopPlaylist();
    this.playlists.clear();
    const context = this.context;
    this.context = undefined;
    this.masterGain = undefined;
    this.loadController = undefined;
    if (context) {
      void this.closeContext(context);
    }
  }
}
