import type {
  CartridgeActionContext,
  CartridgeActionDisposition,
  RoccoCartridge,
  RoccoCartridgeAction,
  RoccoCartridgeContext,
} from '../../console/cartridges/types';
import {
  createRoccoDefaultGameDefinition,
  createRoccoLocalization,
} from './games/rocco-default';
import type {
  RoccoLevelManagerMountResult,
  RoccoLevelManagerOptions,
} from './levels/rocco-level-manager';
import { RpceAssetPreloader, RpceGameRuntime } from './rpce/core';
import { roccoDefaultCartridgeManifest } from './rocco-default-manifest';

const roccoDefaultGameMusicTrackUrls = [
  `${import.meta.env.BASE_URL}cartridges/rocco/music/game-music-1.mp3`,
  `${import.meta.env.BASE_URL}cartridges/rocco/music/game-music-2.mp3`,
] as const;

export class RoccoDefaultCartridge implements RoccoCartridge {
  readonly manifest = roccoDefaultCartridgeManifest;
  private gameRuntime: RpceGameRuntime<
    RoccoLevelManagerOptions,
    RoccoLevelManagerMountResult
  > | null = null;
  private mountContext: RoccoCartridgeContext | null = null;
  private static readonly GAME_MUSIC_PLAYLIST_ID = 'rocco-game-music';

  async mount(context: RoccoCartridgeContext): Promise<void> {
    this.mountContext = { ...context };
    this.gameRuntime?.unmount();
    this.gameRuntime = null;
    context.engine.beginComposition();

    const localization = createRoccoLocalization(context.locale);
    const preloader = new RpceAssetPreloader((progress) => {
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

      const gameRuntime = new RpceGameRuntime<
        RoccoLevelManagerOptions,
        RoccoLevelManagerMountResult
      >({
        game: createRoccoDefaultGameDefinition(localization),
        controllerOptions: {
          cartridgeTitle: this.manifest.title,
          localization,
          onRestartRequested: () => {
            this.restartDefaultDemo();
          },
        },
      });
      this.gameRuntime = gameRuntime;
      await gameRuntime.mount(context.engine, preloader);
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
    this.gameRuntime?.update(deltaMs);
  }

  handleAction(
    activation: RoccoCartridgeAction,
    context?: CartridgeActionContext,
  ): CartridgeActionDisposition | void {
    return this.gameRuntime?.handleAction(activation, context);
  }

  getActiveLevelId(): string | null {
    return this.gameRuntime?.getActiveLevelId() ?? null;
  }

  stop(): void {
    this.mountContext?.engine.jukebox.unregisterPlaylist(RoccoDefaultCartridge.GAME_MUSIC_PLAYLIST_ID);
    this.gameRuntime?.unmount();
    this.gameRuntime = null;
    this.mountContext = null;
  }

  private restartDefaultDemo(): void {
    if (!this.mountContext) {
      return;
    }

    const engine = this.mountContext.engine;
    const mountContext = { ...this.mountContext };
    this.gameRuntime?.unmount();
    this.gameRuntime = null;
    void this.mount(mountContext).catch(() => {
      engine.log('System', 'Default cartridge restart failed.');
    });
  }
}
