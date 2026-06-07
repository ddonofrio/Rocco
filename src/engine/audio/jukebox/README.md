# Jukebox

The jukebox manages continuous background music and ambient playlists.

## Files

- `types.ts` - Track, playlist, and mix-mode types.
- `audio-analyzer.ts` - Silence and segment analysis.
- `jukebox-system.ts` - Playlist registration, analysis, playback, crossfade, and volume control.
- `index.ts` - Barrel export.

## Features

- Continuous playlist playback.
- Auto-mix mode that detects non-silent segments.
- Crossfades between segments.
- Master volume and per-track volume.
- Shared browser audio context with the sound system.

## Cartridge Usage

```typescript
engine.jukebox.registerPlaylist({
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

await engine.jukebox.playPlaylist('pier-ambient');
engine.jukebox.setVolume(0.5);
engine.jukebox.stopPlaylist();
```

## Auto-Mix

Auto-mix analyzes each track, finds non-silent audio segments, skips segments shorter than the configured minimum, and schedules crossfaded playback between usable segments.

## Configuration

- `fadeDurationMs` controls fade length.
- `silenceThreshold` controls silence detection.
- `minSegmentDurationMs` filters short segments.
- Track `volume` controls individual track loudness.
- Playlist `globalVolume` controls the whole playlist.
