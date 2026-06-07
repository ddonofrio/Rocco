import { defaultDisplayProfile } from '../../engine/video/display';
import type { RoccoEngine } from '../../engine/engine-api';
import type {
  RoccoCartridge,
  RoccoCartridgeAction,
  RoccoCartridgeContext,
} from '../../engine/cartridges/types';
import { RoccoPierLevelManager } from './levels/pier/pier-level-manager';
import { createRoccoLocalization } from './localization';
import { roccoDefaultCartridgeManifest } from './rocco-default-manifest';

export class RoccoDefaultCartridge implements RoccoCartridge {
  readonly manifest = roccoDefaultCartridgeManifest;
  private pierLevelManager: RoccoPierLevelManager | null = null;
  private engine: RoccoEngine | null = null;
  private static readonly GAME_MUSIC_PLAYLIST_ID = 'rocco-game-music';

  async mount(context: RoccoCartridgeContext): Promise<void> {
    this.engine = context.engine;
    this.pierLevelManager?.unmount();
    this.pierLevelManager = null;
    context.engine.beginComposition();

    try {
      context.engine.jukebox.registerPlaylist({
        id: RoccoDefaultCartridge.GAME_MUSIC_PLAYLIST_ID,
        tracks: [
          {
            id: 'game-music-1',
            uri: '/cartridges/rocco/music/game-music-1.mp3',
            volume: 0.5,
          },
          {
            id: 'game-music-2',
            uri: '/cartridges/rocco/music/game-music-2.mp3',
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

      context.engine.video.display.setProfile(defaultDisplayProfile);
      this.pierLevelManager = new RoccoPierLevelManager({
        cartridgeTitle: this.manifest.title,
        localization: createRoccoLocalization(context.locale),
        onRestartRequested: () => {
          this.restartDefaultDemo();
        },
      });
      await this.pierLevelManager.mount(context.engine);
      await context.engine.jukebox.playPlaylist(RoccoDefaultCartridge.GAME_MUSIC_PLAYLIST_ID);
    } finally {
      context.engine.endComposition();
    }
  }

  update(deltaMs: number): void {
    this.pierLevelManager?.update(deltaMs);
  }

  handleAction(activation: RoccoCartridgeAction): void {
    this.pierLevelManager?.handleAction(activation);
  }

  stop(): void {
    this.pierLevelManager?.unmount();
    this.pierLevelManager = null;
  }

  private restartDefaultDemo(): void {
    if (!this.engine) {
      return;
    }

    const engine = this.engine;
    this.pierLevelManager?.unmount();
    this.pierLevelManager = null;
    void this.mount({ engine }).catch(() => {
      engine.log('System', 'Default cartridge restart failed.');
    });
  }
}
