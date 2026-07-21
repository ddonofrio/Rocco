import type { CartridgeSdkV1 } from '../../../../../console/cartridges/sdk-v1';

const ROCCO_GAME_MUSIC_TRACK_URLS = [
  `${import.meta.env.BASE_URL}cartridges/rocco/music/game-music-1.mp3`,
  `${import.meta.env.BASE_URL}cartridges/rocco/music/game-music-2.mp3`,
] as const;

export const ROCCO_GAME_MUSIC_PLAYLIST_ID = 'rocco-game-music';

export function registerRoccoGameMusic(sdk: CartridgeSdkV1): void {
  sdk.jukebox?.registerPlaylist({
    id: ROCCO_GAME_MUSIC_PLAYLIST_ID,
    tracks: [
      {
        id: 'game-music-1',
        uri: ROCCO_GAME_MUSIC_TRACK_URLS[0],
        volume: 0.5,
      },
      {
        id: 'game-music-2',
        uri: ROCCO_GAME_MUSIC_TRACK_URLS[1],
        volume: 0.5,
      },
    ],
    mixMode: {
      type: 'auto-mix',
      fadeDurationMs: 1500,
      silenceThreshold: 0.01,
      minSegmentDurationMs: 3000,
    },
    globalVolume: 0.2,
  });
}

export function unregisterRoccoGameMusic(sdk: CartridgeSdkV1): void {
  sdk.jukebox?.unregisterPlaylist(ROCCO_GAME_MUSIC_PLAYLIST_ID);
}

export async function playRoccoGameMusic(sdk: CartridgeSdkV1): Promise<void> {
  await sdk.jukebox?.playPlaylist(ROCCO_GAME_MUSIC_PLAYLIST_ID);
}
