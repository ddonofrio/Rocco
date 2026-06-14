import { AudioAnalyzer, type AudioAnalysisResult } from './audio-analyzer';
import type { RoccoJukeboxPlaylist, RoccoJukeboxSystem, RoccoJukeboxTrack } from './types';

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

  registerPlaylist(playlist: RoccoJukeboxPlaylist): void {
    this.playlists.set(playlist.id, this.clonePlaylist(playlist));
  }

  unregisterPlaylist(playlistId: string): void {
    if (this.currentPlaylistId === playlistId) {
      this.stopPlaylist();
    }
    this.playlists.delete(playlistId);
  }

  async playPlaylist(playlistId: string): Promise<void> {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) {
      throw new Error(`Playlist '${playlistId}' not found`);
    }

    if (this.currentPlaylistId === playlistId && this.isPlayingFlag) {
      return; // Already playing
    }

    this.stopPlaylist();
    
    const context = this.ensureContext();
    if (!context) {
      throw new Error('AudioContext not available');
    }

    if (context.state === 'suspended') {
      await context.resume();
    }

    this.currentPlaylistId = playlistId;
    this.playlistVolume = clampVolume(playlist.globalVolume ?? 1);
    this.applyMasterGainVolume();

    // Load and analyze all tracks
    this.trackStates = [];
    for (const track of playlist.tracks) {
      const buffer = await this.loadTrack(track, context);
      if (!buffer) {
        continue;
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
    this.scheduleNextSegment();
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
    if (context) {
      void context.close().catch(() => undefined);
    }
  }

  private scheduleNextSegment(): void {
    if (!this.isPlayingFlag || !this.context || this.trackStates.length === 0) {
      return;
    }

    const playlist = this.currentPlaylistId ? this.playlists.get(this.currentPlaylistId) : null;
    if (!playlist) {
      return;
    }

    const trackState = this.trackStates[this.currentTrackIndex];
    const segment = trackState.analysis.audioSegments[trackState.currentSegmentIndex];

    if (!segment) {
      // Move to next track's first segment
      trackState.currentSegmentIndex = 0;
      this.currentTrackIndex = (this.currentTrackIndex + 1) % this.trackStates.length;
      this.scheduleNextSegment();
      return;
    }

    const fadeDuration = (playlist.mixMode.fadeDurationMs ?? 1000) / 1000;
    const minSegmentDuration = (playlist.mixMode.minSegmentDurationMs ?? 3000) / 1000;
    const segmentDuration = segment.end - segment.start;

    // Skip very short segments
    if (segmentDuration < minSegmentDuration) {
      trackState.currentSegmentIndex++;
      this.scheduleNextSegment();
      return;
    }

    this.playSegment(trackState, segment, fadeDuration);

    // Schedule next segment before this one ends
    const timeUntilNextSchedule = (segmentDuration - fadeDuration) * 1000;
    this.scheduleTimeoutId = window.setTimeout(() => {
      trackState.currentSegmentIndex++;
      this.scheduleNextSegment();
    }, Math.max(0, timeUntilNextSchedule));
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

  private async loadTrack(track: RoccoJukeboxTrack, context: AudioContext): Promise<AudioBuffer | null> {
    try {
      const response = await fetch(track.uri);
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
