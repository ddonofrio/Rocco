import type { RoccoEngine } from '../../engine/engine-sdk';
import type {
  RoccoCartridge,
  RoccoCartridgeAction,
  RoccoCartridgeActionResult,
  RoccoCartridgeContext,
} from '../../engine/cartridges/types';
import { RoccoAssetPreloader } from './levels/rocco-asset-preloader';
import { RoccoLevelManager } from './levels/rocco-level-manager';
import { createRoccoLocalization } from './localization';
import { roccoDefaultCartridgeManifest } from './rocco-default-manifest';

const roccoDefaultGameMusicTrackUrls = [
  `${import.meta.env.BASE_URL}cartridges/rocco/music/game-music-1.mp3`,
  `${import.meta.env.BASE_URL}cartridges/rocco/music/game-music-2.mp3`,
] as const;

export class RoccoDefaultCartridge implements RoccoCartridge {
  readonly manifest = roccoDefaultCartridgeManifest;
  private levelManager: RoccoLevelManager | null = null;
  private engine: RoccoEngine | null = null;
  private mountContext: RoccoCartridgeContext | null = null;
  private static readonly GAME_MUSIC_PLAYLIST_ID = 'rocco-game-music';

  async mount(context: RoccoCartridgeContext): Promise<void> {
    this.engine = context.engine;
    this.mountContext = { ...context };
    this.levelManager?.unmount();
    this.levelManager = null;
    context.engine.beginComposition();

    const preloader = new RoccoAssetPreloader((progress) => {
      const text = `LOADING ${progress.percent}%`;
      context.engine.setCompositionText?.(text);
    });

    try {
      context.engine.jukebox.registerPlaylist({
        id: RoccoDefaultCartridge.GAME_MUSIC_PLAYLIST_ID,
        tracks: [
          {
            id: 'game-music-1',
            uri: roccoDefaultGameMusicTrackUrls[0],
            volume: 0.5,
          },
          {
            id: 'game-music-2',
            uri: roccoDefaultGameMusicTrackUrls[1],
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

      this.levelManager = new RoccoLevelManager({
        cartridgeTitle: this.manifest.title,
        localization: createRoccoLocalization(context.locale),
        onRestartRequested: () => {
          this.restartDefaultDemo();
        },
      });
      await this.levelManager.mount(context.engine, preloader);
      await context.engine.jukebox
        .playPlaylist(RoccoDefaultCartridge.GAME_MUSIC_PLAYLIST_ID)
        .catch(() => {
          context.engine.log('System', 'Background music could not start.');
        });
    } finally {
      context.engine.setCompositionText?.('LOADING 100%');
      context.engine.endComposition();
    }
  }

  update(deltaMs: number): void {
    this.levelManager?.update(deltaMs);
  }

  handleAction(activation: RoccoCartridgeAction): RoccoCartridgeActionResult | void {
    return this.levelManager?.handleAction(activation);
  }

  stop(): void {
    this.engine?.jukebox.unregisterPlaylist(RoccoDefaultCartridge.GAME_MUSIC_PLAYLIST_ID);
    this.levelManager?.unmount();
    this.levelManager = null;
    this.engine = null;
    this.mountContext = null;
  }

  private restartDefaultDemo(): void {
    if (!this.engine || !this.mountContext) {
      return;
    }

    const engine = this.engine;
    const mountContext = { ...this.mountContext };
    this.levelManager?.unmount();
    this.levelManager = null;
    void this.mount(mountContext).catch(() => {
      engine.log('System', 'Default cartridge restart failed.');
    });
  }
}
