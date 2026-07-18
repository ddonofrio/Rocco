import type {
  CartridgeActionContext,
  CartridgeActionDisposition,
  CartridgeContextV1,
  RoccoCartridge,
  RoccoCartridgeAction,
} from '../../console/cartridges/types';
import type { CartridgeSdkV1Runtime } from '../../console/cartridges/sdk-v1';
import { createRoccoDefaultGameDefinition, createRoccoLocalization } from './games/rocco-default';
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

type RoccoCartridgeSdk = CartridgeSdkV1Runtime;

function registerGameMusicPlaylist(sdk: RoccoCartridgeSdk, playlistId: string): void {
  sdk.jukebox.registerPlaylist({
    id: playlistId,
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
}

export class RoccoDefaultCartridge implements RoccoCartridge {
  private static readonly GAME_MUSIC_PLAYLIST_ID = 'rocco-game-music';
  private gameRuntime:
    | RpceGameRuntime<RoccoLevelManagerOptions, RoccoLevelManagerMountResult>
    | undefined = undefined;
  private mountContext: CartridgeContextV1 | undefined = undefined;
  private cancelActiveActions: ((reason: string) => void) | undefined = undefined;
  readonly manifest = roccoDefaultCartridgeManifest;

  private async remountDefaultDemo(mountContext: CartridgeContextV1): Promise<void> {
    try {
      await this.mount(mountContext);
    } catch {
      this.mountContext?.sdk.log?.('System', 'Default cartridge restart failed.');
    }
  }

  private restartDefaultDemo(): void {
    if (!this.mountContext) {
      return;
    }

    const mountContext = { ...this.mountContext };
    this.cancelActiveActions?.('cartridge-restart:rocco-default');
    this.gameRuntime?.unmount();
    this.gameRuntime = undefined;
    const sdk = mountContext.sdk as RoccoCartridgeSdk;
    sdk.jukebox.unregisterPlaylist(RoccoDefaultCartridge.GAME_MUSIC_PLAYLIST_ID);
    void this.remountDefaultDemo(mountContext);
  }

  setActionCancellation(cancelActiveActions: (reason: string) => void): void {
    this.cancelActiveActions = cancelActiveActions;
  }

  async mount(context: CartridgeContextV1): Promise<void> {
    const sdk = context.sdk as RoccoCartridgeSdk;
    this.mountContext = { ...context };
    this.cancelActiveActions?.('cartridge-remount:rocco-default');
    this.gameRuntime?.unmount();
    this.gameRuntime = undefined;
    const composition = sdk.beginCompositionSession('rocco-default-mount', {
      message: 'LOADING 0%',
    });

    const localization = createRoccoLocalization(context.locale);
    const preloader = new RpceAssetPreloader((progress) => {
      const text = `LOADING ${progress.percent}%`;
      composition.report({ completed: progress.percent, total: 100, message: text });
    });

    try {
      registerGameMusicPlaylist(sdk, RoccoDefaultCartridge.GAME_MUSIC_PLAYLIST_ID);

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
          cancelActiveActions: (reason) => this.cancelActiveActions?.(reason),
        },
      });
      this.gameRuntime = gameRuntime;
      await gameRuntime.mount(sdk, preloader);
      try {
        await sdk.jukebox.playPlaylist(RoccoDefaultCartridge.GAME_MUSIC_PLAYLIST_ID);
      } catch {
        sdk.log('System', 'Background music could not start.');
      }
    } finally {
      composition.report({ completed: 100, total: 100, message: 'LOADING 100%' });
      composition.dispose();
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
    this.mountContext?.sdk.jukebox?.unregisterPlaylist(
      RoccoDefaultCartridge.GAME_MUSIC_PLAYLIST_ID,
    );
    this.gameRuntime?.unmount();
    this.gameRuntime = undefined;
    this.mountContext = undefined;
    this.cancelActiveActions = undefined;
  }
}
