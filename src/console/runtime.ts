import type { Ticker } from 'pixi.js';

import type { ConsoleKernel } from './console-kernel';
import type { RoccoConsoleFlags } from './console-flags';
import {
  defaultSoundProfile,
  getEffectiveMusicVolume,
  getEffectiveSfxVolume,
  resolveRoccoSoundProfile,
  RoccoRuntimeAudioSystem,
  type RoccoSoundProfile,
} from './audio';
import { RoccoJukeboxSystemImpl } from './audio/jukebox';
import {
  RoccoDefaultEffectManager,
  RoccoDefaultEffectRegistry,
  roccoAutoScrollRuntime,
  type RoccoEffectTargetResolver,
} from './effects';
import { createProceduralStarField, type RoccoPlaneScene } from './video/planes';
import { RoccoRuntimeVideoSystem } from './video';
import type { RoccoDisplayProfile } from './video/display';
import type { RoccoViewportHost } from './video/viewport';
import type { RoccoInputHandler } from './input-handler';
import {
  InputPolicyStackImpl,
  type InputMode,
  type InputPolicyLease,
} from './input/input-policy-stack';
import { CompositionServiceImpl, type CompositionSession } from './composition/composition-service';
import type { ActionDispatcher } from './action-dispatcher';
import { RoccoCartridgeManager } from './cartridge-manager';
import { RoccoPersistenceAdapter } from './persistence-adapter';
import { LifecycleStateMachine, type LifecycleState, type ResourceScope } from './lifecycle';
import { RuntimeCompositionPresenter } from './runtime-composition-presenter';
import { RuntimeRenderLoop } from './runtime-render-loop';
import { RuntimeBootstrap } from './runtime-bootstrap';
import { RuntimeResourceOwner } from './runtime-resource-owner';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function describeUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function combineErrors(message: string, errors: readonly unknown[]): Error | undefined {
  if (errors.length === 0) {
    return undefined;
  }
  if (errors.length === 1) {
    return toError(errors[0]);
  }

  return new AggregateError(
    errors.map((error) => toError(error)),
    message,
  );
}

function writeDefaultRuntimeLog(channel: string, message: string): void {
  const formattedMessage = `[ROCCO:${channel}] ${message}`;
  if (/error|fatal|fail/i.test(channel) || /error|fatal|fail/i.test(message)) {
    console.error(formattedMessage);
    return;
  }

  console.info(formattedMessage);
}

interface RuntimeOptions {
  mount: HTMLElement;
  configuredCartridgeId?: string;
  developerModeEnabled?: boolean;
  onStatusChange?: (status: string) => void;
  onLog?: (channel: string, message: string) => void;
  onDisplayProfileChange?: (profile: Partial<RoccoDisplayProfile>) => void;
  viewportHost?: RoccoViewportHost;
}

export class GameRuntime implements ConsoleKernel {
  private readonly options: RuntimeOptions;
  private readonly effectRegistry = new RoccoDefaultEffectRegistry();
  private readonly cartridgeManager = new RoccoCartridgeManager();
  private inputHandler: RoccoInputHandler | undefined;
  private actionDispatcher: ActionDispatcher | undefined;
  private activePlaneSceneId: string | undefined;
  private activePlayerSpriteId: string | undefined;
  private statusMessage = 'Bootstrapping cartridge...';
  private readonly compositionPresenter = new RuntimeCompositionPresenter();
  private readonly inputPolicy = new InputPolicyStackImpl();
  private readonly compositionService = new CompositionServiceImpl();
  private soundProfile: RoccoSoundProfile = { ...defaultSoundProfile };
  private consoleFlags: RoccoConsoleFlags;

  private readonly lifecycle = new LifecycleStateMachine();
  private readonly resourceOwner: RuntimeResourceOwner;
  private initPromise: Promise<void> | undefined;
  private disposePromise: Promise<void> | undefined;
  private readonly handleResize = (): void => {
    if (this.compositionService.getActiveSessionInfo()) {
      this.syncCompositionOverlay();
    }
    this.video.render(0);
  };
  private readonly renderLoop: RuntimeRenderLoop;
  private readonly renderTick = (ticker: Ticker): void => this.renderLoop.tick(ticker);
  private readonly bootstrap: RuntimeBootstrap;
  private readonly resolveEffectTarget: RoccoEffectTargetResolver = (targetType, targetId) => {
    if (!this.activePlaneSceneId) {
      return;
    }

    if (targetType === 'graphic-plane') {
      return this.video.planes.resolvePlane(this.activePlaneSceneId, targetId);
    }
  };

  // Public subsystem access
  readonly video: RoccoRuntimeVideoSystem;
  readonly audio: RoccoRuntimeAudioSystem;
  readonly jukebox: RoccoJukeboxSystemImpl;
  readonly effects: RoccoDefaultEffectManager;
  readonly persistence: RoccoPersistenceAdapter;

  constructor(options: RuntimeOptions) {
    this.options = options;
    this.consoleFlags = {
      developerModeEnabled: options.developerModeEnabled ?? false,
    };

    this.audio = new RoccoRuntimeAudioSystem();
    this.jukebox = new RoccoJukeboxSystemImpl();
    this.video = new RoccoRuntimeVideoSystem({
      proceduralGenerators: {
        'star-field': createProceduralStarField,
      },
      viewportHost: options.viewportHost,
      onDisplayProfileChange: options.onDisplayProfileChange,
    });
    this.effects = new RoccoDefaultEffectManager({
      registry: this.effectRegistry,
      resolveTarget: this.resolveEffectTarget,
      onError: () => {
        this.log('System', 'An effect failed and was skipped for this tick.');
      },
    });
    this.persistence = new RoccoPersistenceAdapter();
    this.renderLoop = new RuntimeRenderLoop({
      isReady: () => this.lifecycle.current === 'ready',
      effects: this.effects,
      video: this.video,
      getActiveCartridge: () => this.cartridgeManager.getActiveCartridge(),
    });
    this.effectRegistry.register(roccoAutoScrollRuntime);
    this.applySoundProfile();
    this.resourceOwner = new RuntimeResourceOwner({
      audio: this.audio,
      jukebox: this.jukebox,
      persistence: this.persistence,
      video: this.video,
      cartridgeManager: this.cartridgeManager,
      getInputHandler: () => this.inputHandler,
      getActionDispatcher: () => this.actionDispatcher,
      onCompositionChange: (listener) => this.compositionService.onChange(listener),
      syncCompositionOverlay: () => this.syncCompositionOverlay(),
      compositionPresenter: this.compositionPresenter,
      handleResize: this.handleResize,
      renderTick: this.renderTick,
    });
    this.bootstrap = this.createBootstrap(options);
  }

  private createBootstrap(options: RuntimeOptions): RuntimeBootstrap {
    return new RuntimeBootstrap({
      mount: options.mount,
      configuredCartridgeId: options.configuredCartridgeId,
      viewportHost: options.viewportHost,
      video: this.video,
      audio: this.audio,
      jukebox: this.jukebox,
      cartridgeManager: this.cartridgeManager,
      cartridgeScope: this.resourceOwner.cartridge,
      kernel: this,
      getActiveCartridge: () => this.cartridgeManager.getActiveCartridge(),
      getActiveLevelId: () => this.cartridgeManager.getActiveLevelId(),
      getActivePlayerSpriteId: () => this.activePlayerSpriteId,
      getInputMode: () => this.inputPolicy.getEffectiveMode(),
      log: (channel, message) => this.log(channel, message),
      cancelActiveActions: (reason) => this.actionDispatcher?.cancelActiveActions(reason),
      renderTick: this.renderTick,
      handleResize: this.handleResize,
      statusMessage: () => this.statusMessage,
      onApplicationCreated: (app) => {
        this.resourceOwner.setApplication(app);
      },
      onApplicationInitialized: () => {
        this.resourceOwner.markApplicationInitialized();
      },
      onActionDispatcherCreated: (dispatcher) => {
        this.actionDispatcher = dispatcher;
      },
      onInputHandlerCreated: (handler) => {
        this.inputHandler = handler;
      },
      onStatusChange: options.onStatusChange,
    });
  }

  private async trackInitPromise(initPromise: Promise<void>): Promise<void> {
    try {
      await initPromise;
    } finally {
      this.initPromise = undefined;
    }
  }

  private async disposeInternal(): Promise<void> {
    this.lifecycle.markDisposing();
    const disposalError = await this.resourceOwner.dispose();

    this.lifecycle.markDisposed();
    this.resetRuntimeReferences();

    if (disposalError) {
      throw disposalError;
    }
  }

  private async disposeRootScope(): Promise<Error | undefined> {
    return this.resourceOwner.dispose();
  }

  private resetRuntimeReferences(): void {
    this.resourceOwner.reset();

    this.inputHandler = undefined;
    this.activePlaneSceneId = undefined;
    this.activePlayerSpriteId = undefined;
  }

  private async initInternal(): Promise<void> {
    this.lifecycle.markInitializing();
    try {
      await this.bootstrap.initialize();
      this.lifecycle.markReady();
    } catch (error) {
      this.lifecycle.markFailed();
      const cleanupError = await this.disposeRootScope();
      this.resetRuntimeReferences();
      const combinedError = combineErrors(
        `GameRuntime init failed: ${describeUnknownError(error)}`,
        [error, cleanupError].filter((item) => item !== undefined),
      );
      throw combinedError ?? toError(error);
    }
  }

  private applySoundProfile(): void {
    this.audio.setVolume(getEffectiveSfxVolume(this.soundProfile));
    this.jukebox.setVolume(getEffectiveMusicVolume(this.soundProfile));
  }

  private syncCompositionOverlay(): void {
    const session = this.compositionService.getActiveSessionInfo();
    this.compositionPresenter.sync(this.resourceOwner.application, session);
  }

  init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }
    if (this.lifecycle.current === 'ready') {
      return Promise.resolve();
    }
    if (this.lifecycle.current === 'failed') {
      return Promise.reject(
        new Error('GameRuntime init failed previously; create a new instance to run again'),
      );
    }
    if (this.lifecycle.isTerminal()) {
      return Promise.reject(
        new Error('GameRuntime has been disposed; create a new instance to run again'),
      );
    }

    const initPromise = this.initInternal();
    this.initPromise = this.trackInitPromise(initPromise);
    return this.initPromise;
  }

  dispose(): Promise<void> {
    if (this.disposePromise) {
      return this.disposePromise;
    }
    if (this.lifecycle.current === 'disposed' || this.lifecycle.current === 'failed') {
      return Promise.resolve();
    }
    if (this.lifecycle.current === 'initializing' && this.initPromise) {
      this.disposePromise = (async () => {
        await this.initPromise;
        await this.disposeInternal();
      })();
      return this.disposePromise;
    }

    this.disposePromise = this.disposeInternal();
    return this.disposePromise;
  }

  get lifecycleState(): LifecycleState {
    return this.lifecycle.current;
  }

  get scope(): ResourceScope {
    return this.resourceOwner.scope;
  }

  loadPlaneScene(scene: RoccoPlaneScene): void {
    this.video.planes.loadScene(scene);
    this.activePlaneSceneId = scene.id;
  }

  serializePlaneScene(sceneId: string): RoccoPlaneScene {
    return this.video.planes.serializeScene(sceneId);
  }

  setPlayerSprite(instanceId: string | undefined): void {
    this.activePlayerSpriteId = instanceId;
    this.video.setActivePlayerSprite(instanceId);
    if (instanceId && this.activePlayerSpriteId === instanceId) {
      const sprite = this.video.sprites.getSprite(instanceId);
      if (sprite) {
        this.video.render(0);
      }
    }
  }

  getPlayerSprite(): string | undefined {
    return this.activePlayerSpriteId;
  }

  acquireInputLease(ownerId: string, mode: InputMode): InputPolicyLease {
    return this.inputPolicy.acquire({ ownerId, mode });
  }

  getInputMode(): InputMode {
    return this.inputPolicy.getEffectiveMode();
  }

  isDeveloperModeEnabled(): boolean {
    return this.consoleFlags.developerModeEnabled;
  }

  cancelActiveActions(reason: string): void {
    this.actionDispatcher?.cancelActiveActions(reason);
  }

  getConsoleFlags(): RoccoConsoleFlags {
    return clone(this.consoleFlags);
  }

  setConsoleFlags(patch: Partial<RoccoConsoleFlags>): void {
    this.consoleFlags = {
      ...this.consoleFlags,
      ...patch,
    };
  }

  beginCompositionSession(ownerId: string, options: { message?: string } = {}): CompositionSession {
    const session = this.compositionService.begin({ ownerId, message: options.message });
    return this.resourceOwner.adoptCompositionSession(session, ownerId);
  }

  setStatus(status: string): void {
    this.statusMessage = status;
    this.options.onStatusChange?.(status);
  }

  log(channel: string, message: string): void {
    if (this.options.onLog) {
      this.options.onLog(channel, message);
      return;
    }

    writeDefaultRuntimeLog(channel, message);
  }

  getSoundProfile(): RoccoSoundProfile {
    return clone(this.soundProfile);
  }

  setSoundProfile(profile: Partial<RoccoSoundProfile>): void {
    this.soundProfile = resolveRoccoSoundProfile({
      ...this.soundProfile,
      ...profile,
    });
    this.applySoundProfile();
  }
}
