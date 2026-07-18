import { describe, expect, it } from 'vitest';

import { RoccoJukeboxSystemImpl } from '../../../src/console/audio/jukebox/jukebox-system';

describe('RoccoJukeboxSystemImpl', () => {
  it('registers a playlist', () => {
    const system = new RoccoJukeboxSystemImpl();
    system.registerPlaylist({
      id: 'playlist-1',
      tracks: [{ id: 'track-1', uri: '/music/track.mp3', volume: 0.5 }],
      mixMode: {
        type: 'auto-mix',
        fadeDurationMs: 1000,
        silenceThreshold: 0.01,
        minSegmentDurationMs: 3000,
      },
    });

    expect(system.isPlaying()).toBe(false);
  });

  it('throws on duplicate playlist id', () => {
    const system = new RoccoJukeboxSystemImpl();
    system.registerPlaylist({
      id: 'playlist-1',
      tracks: [{ id: 'track-1', uri: '/music/track.mp3', volume: 0.5 }],
      mixMode: {
        type: 'auto-mix',
        fadeDurationMs: 1000,
        silenceThreshold: 0.01,
        minSegmentDurationMs: 3000,
      },
    });

    expect(() =>
      system.registerPlaylist({
        id: 'playlist-1',
        tracks: [{ id: 'track-2', uri: '/music/track2.mp3', volume: 0.5 }],
        mixMode: {
          type: 'auto-mix',
          fadeDurationMs: 1000,
          silenceThreshold: 0.01,
          minSegmentDurationMs: 3000,
        },
      }),
    ).toThrow("Duplicate playlist registration 'playlist-1'.");
  });
});
