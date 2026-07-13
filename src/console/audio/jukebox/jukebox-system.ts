import { AudioAnalyzer, type AudioAnalysisResult } from './audio-analyzer';
import type { PlaylistHandle, RoccoJukeboxPlaylist, RoccoJukeboxSystem, RoccoJukeboxTrack } from './types';

interface TrackState {
  track: RoccoJukeboxTrack;
  buffer: AudioBuffer;
  analysis: AudioAnalysisResult;
  currentSegmentIndex: number;
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
  private currentPlaylistId: string | null = null;
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
  private generation = 0;
  private loadController: AbortController | null = null;

  registerPlaylist(playlist: RoccoJukeboxPlaylist): void {
    this.playlists.set(playlist.id, this.clonePlaylist(playlist));
  }

  unregisterPlaylist(playlistId: string): void {
    if (this.currentPlaylistId === playlistId) {
      this.stopPlaylist();
    }
    this.playlists.delete(playlistId);
  }

  async playPlaylist(playlistId: string): Promise<PlaylistHandle> {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) {
      throw new Error(`Playlist '${playlistId}' not found`);
    }

    if (this.currentPlaylistId === playlistId && this.isPlayingFlag) {
      return this.createPlaylistHandle();
    }

    this.stopPlaylist();

    this.loadController?.abort('superseded');
    this.loadController = new AbortController();
    const currentGeneration = ++this.generation;
    const signal = this.loadController.signal;

    const context = this.ensureContext();
    if (!context) {
      throw new Error('AudioContext not available');
    }

    if (signal.aborted) {
      return this.createPlaylistHandle();
    }

    if (context.state === 'suspended') {
      await context.resume().catch(() => undefined);
    }

    if (signal.aborted || currentGeneration !== this.generation) {
      return this.createPlaylistHandle();
    }

    this.currentPlaylistId = playlistId;
    this.playlistVolume = clampVolume(playlist.globalVolume ?? 1);
    this.applyMasterGainVolume();

    this.trackStates = [];
    for (const track of playlist.tracks) {
      if (signal.aborted || currentGeneration !== this.generation) {
        return this.createPlaylistHandle();
      }

      const buffer = await this.loadTrack(track, context, signal);
      if (!buffer) {
        continue;
      }

      if (signal.aborted || currentGeneration !== this.generation) {
        return this.createPlaylistHandle();
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

    if (this.trackStates.length === 0) {
      throw new Error('No tracks could be loaded');
    }

    this.isPlayingFlag = true;
    this.currentTrackIndex = 0;
    this.scheduleNextSegment(currentGeneration);
    return this.createPlaylistHandle();
  }

  private createPlaylistHandle(): PlaylistHandle {
    const getIsPlaying = (): boolean => this.isPlayingFlag;

    return {
      stop: () => this.stopPlaylist(),
      setVolume: (value: number) => this.setVolume(value),
      get ended() {
        let resolveEnded: (() => void) | undefined;
        const ended = new Promise<void>((resolve) => {
          resolveEnded = resolve;
        });

        const checkEnded = () => {
          if (!getIsPlaying() && resolveEnded) {
            resolveEnded();
          }
        };

        const interval = setInterval(() => {
          checkEnded();
          if (!getIsPlaying() && resolveEnded) {
            clearInterval(interval);
          }
        }, 100);
        checkEnded();

        return ended;
      },
    };
  }

  stopPlaylist(): void {
    this.isPlayingFlag = false;
    this.currentPlaylistId = null;
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
    void context.resume().catch(() => undefined);
  }

  destroy(): void {
    this.stopPlaylist();
    this.playlists.clear();
    const context = this.context;
    this.context = null;
    this.masterGain = null;
    this.loadController = null;
    if (context) {
      void context.close().catch(() => undefined);
    }
  }

  private scheduleNextSegment(currentGeneration: number): void {
    if (!this.isPlayingFlag || !this.context || this.trackStates.length === 0) {
      return;
    }

    const playlist = this.currentPlaylistId ? this.playlists.get(this.currentPlaylistId) : null;
    if (!playlist) {
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

      this.playSegment(trackState, segment, safeFadeDuration);

      const timeUntilNextSchedule = Math.max(0, (segmentDuration - safeFadeDuration) * 1000);
      this.scheduleTimeoutId = window.setTimeout(() => {
        if (currentGeneration !== this.generation) {
          return;
        }
        trackState.currentSegmentIndex++;
        this.scheduleNextSegment(currentGeneration);
      }, timeUntilNextSchedule);
      return;
    }

    this.stopPlaylist();
  }

  private playSegment(
    trackState: TrackState,
    segment: { start: number; end: number },
    fadeDuration: number,
  ): void {
    if (!this.context) {
      return;
    }

    const context = this.context;
    const now = context.currentTime;
    const duration = segment.end - segment.start;

    // Shift current to previous (will fade out)
    const prevSource = this.currentSource;
    const prevGain = this.currentGain;

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
    if (prevSource && prevGain) {
      prevGain.gain.cancelScheduledValues(now);
      prevGain.gain.setValueAtTime(prevGain.gain.value, now);
      prevGain.gain.linearRampToValueAtTime(0, now + fadeDuration);
      
      // Stop and clean up previous source after fade out
      const timeoutId = window.setTimeout(() => {
        this.cleanupTimeoutIds.delete(timeoutId);
        this.stopSource(prevSource);
      }, fadeDuration * 1000);
      this.cleanupTimeoutIds.add(timeoutId);
    }
  }

  private async loadTrack(track: RoccoJukeboxTrack, context: AudioContext, signal: AbortSignal): Promise<AudioBuffer | null> {
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
      source.disconnect();
    } catch {
      // May already be stopped
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
}
