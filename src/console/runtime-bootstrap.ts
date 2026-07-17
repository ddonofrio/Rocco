import { Application, type Ticker } from 'pixi.js';

import type { RoccoCartridge } from './cartridges';
import { ActionDispatcher } from './action-dispatcher';
import { RoccoCartridgeManager } from './cartridge-manager';
import { RoccoInputHandler } from './input-handler';
import type { InputMode } from './input/input-policy-stack';
import type { ResourceScope } from './lifecycle';
import type { RoccoRuntimeAudioSystem } from './audio';
import type { RoccoJukeboxSystemImpl } from './audio/jukebox';
import type { RoccoRuntimeVideoSystem } from './video';
import type { RoccoViewportHost } from './video/viewport';

type CartridgeLoadOptions = Parameters<RoccoCartridgeManager['loadAndMount']>[0];

export interface RuntimeBootstrapOptions {
  mount: HTMLElement;
  configuredCartridgeId?: string;
  viewportHost?: RoccoViewportHost;
  video: RoccoRuntimeVideoSystem;
  audio: RoccoRuntimeAudioSystem;
  jukebox: RoccoJukeboxSystemImpl;
  cartridgeManager: RoccoCartridgeManager;
  cartridgeScope?: ResourceScope;
  engine: CartridgeLoadOptions['engine'];
  getActiveCartridge: () => RoccoCartridge | null | undefined;
  getActiveLevelId: () => string | null | undefined;
  getActivePlayerSpriteId: () => string | undefined;
  getInputMode: () => InputMode;
  log: (channel: string, message: string) => void;
  cancelActiveActions: (reason: string) => void;
  renderTick: (ticker: Ticker) => void;
  handleResize: () => void;
  statusMessage: () => string;
  onApplicationCreated: (app: Application) => void;
  onApplicationInitialized: () => void;
  onActionDispatcherCreated: (dispatcher: ActionDispatcher) => void;
  onInputHandlerCreated: (handler: RoccoInputHandler) => void;
  onStatusChange?: (status: string) => void;
}

export class RuntimeBootstrap {
  private readonly options: RuntimeBootstrapOptions;

  constructor(options: RuntimeBootstrapOptions) {
    this.options = options;
  }

  async initialize(): Promise<void> {
    const app = new Application();
    this.options.onApplicationCreated(app);
    await app.init({
      preference: 'webgl',
      background: '#0f1610',
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      resizeTo: this.options.mount,
    });
    this.options.onApplicationInitialized();

    this.options.mount.replaceChildren(app.canvas);
    app.stage.sortableChildren = true;
    this.options.video.mount(app.stage);

    const actionDispatcher = new ActionDispatcher({
      getActiveCartridge: this.options.getActiveCartridge,
      getActiveLevelId: this.options.getActiveLevelId,
      log: this.options.log,
    });
    this.options.onActionDispatcherCreated(actionDispatcher);

    const inputHandler = new RoccoInputHandler({
      videoSystem: this.options.video,
      audioSystem: this.options.audio,
      jukeboxSystem: this.options.jukebox,
      viewportHost: this.options.viewportHost,
      getActiveCartridge: this.options.getActiveCartridge,
      getActivePlayerSpriteId: this.options.getActivePlayerSpriteId,
      getInputMode: this.options.getInputMode,
      actionDispatcher,
      log: this.options.log,
    });
    this.options.onInputHandlerCreated(inputHandler);
    inputHandler.mount();

    await this.options.cartridgeManager.loadAndMount({
      app,
      engine: this.options.engine,
      configuredCartridgeId: this.options.configuredCartridgeId,
      cartridgeScope: this.options.cartridgeScope,
      cancelActiveActions: this.options.cancelActiveActions,
    });

    app.ticker.add(this.options.renderTick);
    this.options.onStatusChange?.(this.options.statusMessage());
    window.addEventListener('resize', this.options.handleResize);
  }
}
