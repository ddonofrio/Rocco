# Jukebox

The jukebox manages continuous background music and ambient playlists through `jukebox`.

## Files

- `types.ts` - Track, playlist, and mix-mode types.
- `audio-analyzer.ts` - Silence and segment analysis.
- `jukebox-system.ts` - Playlist registration, analysis, playback, crossfade, and volume control.
- `index.ts` - Barrel export.

## Features

- Continuous playlist playback.
- Auto-mix mode that detects non-silent segments.
- Crossfades between segments.
- Master volume, playlist volume, and per-track volume.
- Runtime helpers for `isPlaying()` and `getCurrentTrack()`.

## Cartridge Usage

```typescript
jukebox.registerPlaylist({
  id: 'pier-ambient',
  tracks: [
    { id: 'track-1', uri: '/music/pier-1.mp3', volume: 0.8 },
    { id: 'track-2', uri: '/music/pier-2.mp3', volume: 0.8 },
  ],
  mixMode: {
    type: 'auto-mix',
    fadeDurationMs: 1000,
    silenceThreshold: 0.01,
    minSegmentDurationMs: 3000,
  },
  globalVolume: 0.6,
});

await jukebox.playPlaylist('pier-ambient');
jukebox.setVolume(0.5);
jukebox.stopPlaylist();
```

`jukebox.unregisterPlaylist(id)` removes a playlist, `jukebox.isPlaying()` reports current playback state, and `jukebox.getCurrentTrack()` returns the active track id when one is playing.

## Auto-Mix

Auto-mix analyzes each track, finds non-silent audio segments, skips segments shorter than the configured minimum, and schedules crossfaded playback between usable segments.

`auto-mix` is the only supported mix mode in the current implementation.

## Configuration

- `fadeDurationMs` controls fade length.
- `silenceThreshold` controls silence detection.
- `minSegmentDurationMs` filters short segments.
- Track `volume` controls individual track loudness.
- Playlist `globalVolume` sets the playlist mix level.
- `jukebox.setVolume()` multiplies that playlist mix level as the master jukebox volume.

## Runtime Notes

- The jukebox keeps its own browser `AudioContext`.
- Input routing unlocks the jukebox and the one-shot sound system separately on first pointer interaction.
