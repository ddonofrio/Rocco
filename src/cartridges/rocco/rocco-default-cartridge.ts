import type {
  CartridgeActionContext,
  CartridgeActionDisposition,
  CartridgeContextV1,
  RoccoCartridge,
  RoccoCartridgeAction,
} from '../../console/cartridges/types';
import type { CartridgeSdkV1Runtime } from '../../console/cartridges/sdk-v1';
import { createRoccoDefaultGameDefinition, createRoccoLocalization } from './games/rocco-default';
import {
  playRoccoGameMusic,
  registerRoccoGameMusic,
  unregisterRoccoGameMusic,
} from './games/rocco-default/audio';
import type {
  RoccoLevelManagerMountResult,
  RoccoLevelManagerOptions,
} from './levels/rocco-level-manager';
import { RpceAssetPreloader, RpceGameRuntime } from './rpce/core';
import type { RpceAssetPreloaderProgress } from './rpce/core/rpce-asset-preloader';
import { roccoDefaultCartridgeManifest } from './rocco-default-manifest';
import { hasRoccoDeveloperModeOnGameStartRequest } from './rocco-developer-mode';

type RoccoCartridgeSdk = CartridgeSdkV1Runtime;

export class RoccoDefaultCartridge implements RoccoCartridge {
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
    unregisterRoccoGameMusic(sdk);
    void this.remountDefaultDemo(mountContext);
  }

  setActionCancellation(cancelActiveActions: (reason: string) => void): void {
    this.cancelActiveActions = cancelActiveActions;
  }

  async mount(context: CartridgeContextV1): Promise<void> {
    const sdk = context.sdk as RoccoCartridgeSdk;
    if (hasRoccoDeveloperModeOnGameStartRequest()) {
      sdk.setConsoleFlags?.({ developerModeEnabled: true });
    }
    this.mountContext = { ...context };
    this.cancelActiveActions?.('cartridge-remount:rocco-default');
    this.gameRuntime?.unmount();
    this.gameRuntime = undefined;
    const composition = sdk.beginCompositionSession('rocco-default-mount', {
      message: 'LOADING 0%',
    });

    const localization = createRoccoLocalization(context.locale);
    let finalProgress: RpceAssetPreloaderProgress | undefined;
    const preloader = new RpceAssetPreloader((progress) => {
      finalProgress = progress;
      const text = `LOADING ${progress.percent}%`;
      composition.report({ completed: progress.loaded, total: progress.total, message: text });
    });

    try {
      registerRoccoGameMusic(sdk);

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
        await playRoccoGameMusic(sdk);
      } catch {
        sdk.log('System', 'Background music could not start.');
      }
    } finally {
      const total = finalProgress?.total ?? 0;
      composition.report({ completed: total, total, message: 'LOADING 100%' });
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
    if (this.mountContext?.sdk) {
      unregisterRoccoGameMusic(this.mountContext.sdk);
    }
    this.gameRuntime?.unmount();
    this.gameRuntime = undefined;
    this.mountContext = undefined;
    this.cancelActiveActions = undefined;
  }
}
