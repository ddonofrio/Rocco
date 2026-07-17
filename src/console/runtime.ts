/* eslint-disable max-lines */

import { Application, Container, Graphics, Text, type Ticker } from 'pixi.js';

import type { RoccoConsoleFlags, RoccoEngine } from './engine-sdk';
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
import { RoccoInputHandler } from './input-handler';
import {
  InputPolicyStackImpl,
  type InputMode,
  type InputPolicyLease,
} from './input/input-policy-stack';
import { CompositionServiceImpl, type CompositionSession } from './composition/composition-service';
import { ActionDispatcher } from './action-dispatcher';
import { RoccoCartridgeManager } from './cartridge-manager';
import { RoccoPersistenceAdapter } from './persistence-adapter';
import {
  createResourceScope,
  LifecycleStateMachine,
  type Disposer,
  type LifecycleState,
  type ResourceScope,
} from './lifecycle';
import type { CompositionSessionInfo } from './composition';

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

  return new AggregateError(errors.map((error) => toError(error)), message);
}

function formatCompositionOverlayText(session: CompositionSessionInfo): string {
  const lines: string[] = [];
  const headline = session.message?.trim() || (session.status === 'failed' ? 'A runtime operation failed.' : 'LOADING');
  lines.push(headline);

  if (session.status === 'failed' && session.error) {
    lines.push(`ERROR: ${session.error.message}`);
    return lines.join('\n');
  }

  if (
    session.completed !== null &&
    session.total !== null &&
    (session.total > 0 || session.completed > 0)
  ) {
    lines.push(`PROGRESS ${session.completed}/${session.total}`);
  }

  return lines.join('\n');
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

export class GameRuntime implements RoccoEngine {
  private readonly options: RuntimeOptions;
  private app: Application | undefined;
  private readonly effectRegistry = new RoccoDefaultEffectRegistry();
  private effectElapsedMs = 0;
  private readonly cartridgeManager = new RoccoCartridgeManager();
  private inputHandler: RoccoInputHandler | undefined;
  private activePlaneSceneId: string | undefined;
  private activePlayerSpriteId: string | undefined;
  private statusMessage = 'Engine bootstrapping cartridge...';
  private compositionOverlay: Container | undefined;
  private compositionBackground: Graphics | undefined;
  private compositionText: Text | undefined;
  private readonly inputPolicy = new InputPolicyStackImpl();
  private readonly compositionService = new CompositionServiceImpl();
  private compositionListener: Disposer | undefined;
  private readonly legacyInputLocks = new Map<string, InputPolicyLease>();
  private readonly legacyInputRefCounts = new Map<string, number>();
  private legacyCompositionSession: CompositionSession | undefined;
  private soundProfile: RoccoSoundProfile = { ...defaultSoundProfile };
  private consoleFlags: RoccoConsoleFlags;

  private readonly lifecycle = new LifecycleStateMachine();
  private rootScope!: ResourceScope;
  private cartridgeScope: ResourceScope | undefined;
  private initPromise: Promise<void> | undefined;
  private disposePromise: Promise<void> | undefined;
  private appInitialized = false;
  private readonly handleResize = (): void => {
    if (this.compositionService.getActiveSessionInfo()) {
      this.syncCompositionOverlay();
    }
    this.video.render(0);
  };
  private readonly renderTick = (ticker: Ticker): void => {
    if (this.lifecycle.current !== 'ready') {
      return;
    }

    this.effectElapsedMs += ticker.deltaMS;
    this.effects.tick({
      deltaMs: ticker.deltaMS,
      deltaSeconds: ticker.deltaMS / 1000,
      elapsedMs: this.effectElapsedMs,
      elapsedSeconds: this.effectElapsedMs / 1000,
    });

    this.video.update(ticker.deltaMS);
    this.cartridgeManager.getActiveCartridge()?.update?.(ticker.deltaMS);
    this.video.render(ticker.deltaTime);
  };
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

    this.effectRegistry.register(roccoAutoScrollRuntime);
    this.applySoundProfile();
    this.createRootScope();
    this.compositionListener = this.compositionService.onChange(() => this.syncCompositionOverlay());
  }

  /**
   * Builds the runtime resource scope and registers every subsystem disposer
   * in reverse of the required stop order. Disposal is LIFO, so the entries
   * below are registered top-to-bottom as last-to-dispose first.
   *
   * Required stop order (first to run): stop ticker + remove resize listener,
   * run cartridge stop/dispose, release cartridge-owned resources, unmount
   * input, destroy video, destroy jukebox, destroy audio, destroy Pixi app.
   */
  private createRootScope(): void {
    const scope = createResourceScope('runtime');

    scope.defer(() => {
      if (this.appInitialized) {
        this.app?.destroy({ removeView: true }, true);
      }
      this.app = undefined;
      this.appInitialized = false;
    });
    scope.defer(() => this.audio.destroy());
    scope.defer(() => this.jukebox.destroy());
    scope.defer(() => this.persistence.dispose());
    scope.defer(() => {
      if (this.appInitialized) {
        this.video.destroy();
      }
    });
    scope.defer(() => this.inputHandler?.unmount());

    const cartridgeScope = scope.createChild('cartridge');
    this.cartridgeScope = cartridgeScope;
    scope.defer(() => {
      const disposeListener = this.compositionListener;
      this.compositionListener = undefined;
      return disposeListener?.();
    });
    scope.defer(() => this.cartridgeManager.dispose());

    scope.defer(() => {
      window.removeEventListener('resize', this.handleResize);
      if (this.appInitialized) {
        this.app?.ticker?.remove?.(this.renderTick);
      }
    });

    this.rootScope = scope;
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
    let disposalError: unknown;
    try {
      await this.rootScope.dispose();
    } catch (error) {
      disposalError = error;
    }

    this.lifecycle.markDisposed();
    this.resetRuntimeReferences();

    if (disposalError) {
      throw toError(disposalError);
    }
  }

  private async disposeRootScope(): Promise<Error | undefined> {
    try {
      await this.rootScope.dispose();
      return undefined;
    } catch (error) {
      return toError(error);
    }
  }

  private resetRuntimeReferences(): void {
    if (this.compositionOverlay) {
      this.compositionOverlay.destroy({ children: true });
    }
    this.compositionOverlay = undefined;
    this.compositionBackground = undefined;
    this.compositionText = undefined;

    this.inputHandler = undefined;
    this.activePlaneSceneId = undefined;
    this.activePlayerSpriteId = undefined;
    this.legacyCompositionSession = undefined;
    this.legacyInputLocks.clear();
    this.legacyInputRefCounts.clear();
    this.cartridgeScope = undefined;
    this.appInitialized = false;
  }

  private async initInternal(): Promise<void> {
    this.lifecycle.markInitializing();
    try {
      const app = new Application();
      this.app = app;
      await app.init({
        preference: 'webgl',
        background: '#0f1610',
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        resizeTo: this.options.mount,
      });
      this.appInitialized = true;

      this.options.mount.replaceChildren(app.canvas);
      app.stage.sortableChildren = true;
      this.video.mount(app.stage);

      this.inputHandler = new RoccoInputHandler({
        videoSystem: this.video,
        audioSystem: this.audio,
        jukeboxSystem: this.jukebox,
        viewportHost: this.options.viewportHost,
        getActiveCartridge: () => this.cartridgeManager.getActiveCartridge(),
        getActivePlayerSpriteId: () => this.activePlayerSpriteId,
        getInputMode: () => this.inputPolicy.getEffectiveMode(),
        actionDispatcher: new ActionDispatcher({
          getActiveCartridge: () => this.cartridgeManager.getActiveCartridge(),
          getActiveLevelId: () => this.cartridgeManager.getActiveLevelId(),
          log: (channel, message) => this.log(channel, message),
        }),
        log: (channel, message) => this.log(channel, message),
      });
      this.inputHandler.mount();

      await this.cartridgeManager.loadAndMount({
        app,
        engine: this,
        configuredCartridgeId: this.options.configuredCartridgeId,
        cartridgeScope: this.cartridgeScope ?? undefined,
      });

      app.ticker.add(this.renderTick);
      this.options.onStatusChange?.(this.statusMessage);
      window.addEventListener('resize', this.handleResize);
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
    if (!this.app) {
      return;
    }
    const session = this.compositionService.getActiveSessionInfo();
    if (!session) {
      this.hideCompositionOverlay();
      return;
    }
    this.showCompositionOverlay(session);
  }

  private showCompositionOverlay(session: CompositionSessionInfo): void {
    if (!this.app) {
      return;
    }
    if (!this.compositionOverlay) {
      this.compositionOverlay = new Container();
      this.compositionOverlay.label = 'composition-overlay';
      this.compositionOverlay.zIndex = 10_000;
      this.compositionOverlay.sortableChildren = true;
      this.compositionBackground = new Graphics();
      this.compositionOverlay.addChild(this.compositionBackground);
      this.app.stage.addChild(this.compositionOverlay);
    }

    const overlayBackgroundColor = session.status === 'failed' ? 0x1a_0b_0b : 0x0d_11_0c;
    this.compositionBackground ??= new Graphics();
    this.compositionBackground
      .clear()
      .rect(0, 0, this.app.screen.width, this.app.screen.height)
      .fill(overlayBackgroundColor);

    const overlayText = formatCompositionOverlayText(session);

    if (this.compositionText) {
      this.compositionText.text = overlayText;
      this.compositionText.style.fill = session.status === 'failed' ? '#fca5a5' : '#9ca3af';
    } else {
      this.compositionText = new Text({
        text: overlayText,
        style: {
          fill: session.status === 'failed' ? '#fca5a5' : '#9ca3af',
          fontFamily: 'Cascadia Mono, Lucida Console, monospace',
          fontSize: 18,
          fontWeight: '700',
          align: 'center',
          letterSpacing: 1,
        },
      });
      this.compositionText.anchor.set(0.5);
      this.compositionText.zIndex = 10_001;
      this.compositionOverlay.addChild(this.compositionText);
    }

    this.compositionText.x = this.app.screen.width / 2;
    this.compositionText.y = this.app.screen.height / 2;
    this.app.render();
  }

  private hideCompositionOverlay(): void {
    if (!this.app || !this.compositionOverlay) {
      return;
    }
    this.compositionOverlay.removeFromParent();
    this.compositionOverlay.destroy({ children: true });
    this.compositionOverlay = undefined;
    this.compositionBackground = undefined;
    this.compositionText = undefined;
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
    return this.rootScope;
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

  /**
   * @deprecated Retained for legacy per-level callers until level decomposition
   * (audit Phase 4). Use `acquireInputLease` instead. Backed internally by
   * per-owner ref-counted leases, so it still participates in the composed
   * policy stack and each caller only releases its own lock.
   */
  setInputEnabled(isEnabled: boolean, ownerId = 'legacy-input'): void {
    if (!isEnabled) {
      const current = this.legacyInputRefCounts.get(ownerId) ?? 0;
      this.legacyInputRefCounts.set(ownerId, current + 1);
      if (current === 0) {
        this.legacyInputLocks.set(
          ownerId,
          this.inputPolicy.acquire({ ownerId, mode: 'blocked' }),
        );
      }
      return;
    }

    const current = this.legacyInputRefCounts.get(ownerId) ?? 0;
    const next = Math.max(0, current - 1);
    if (next === 0) {
      this.legacyInputRefCounts.delete(ownerId);
      const lease = this.legacyInputLocks.get(ownerId);
      if (lease) {
        lease.dispose();
        this.legacyInputLocks.delete(ownerId);
      }
    } else {
      this.legacyInputRefCounts.set(ownerId, next);
    }
  }

  /**
   * @deprecated Use `getInputMode() === 'interactive'`.
   */
  isInputEnabled(): boolean {
    return this.inputPolicy.getEffectiveMode() === 'interactive';
  }

  isDeveloperModeEnabled(): boolean {
    return this.consoleFlags.developerModeEnabled;
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

  beginCompositionSession(
    ownerId: string,
    options: { message?: string } = {},
  ): CompositionSession {
    const session = this.compositionService.begin({ ownerId, message: options.message });
    const scope = this.cartridgeScope ?? this.rootScope;
    try {
      scope.add(session);
    } catch (error) {
      this.log(
        'System',
        `Composition session '${ownerId}' could not be registered with the active scope: ${describeUnknownError(error)}`,
      );
    }
    return session;
  }

  /**
   * @deprecated Retained for legacy callers. Use `beginCompositionSession`.
   */
  beginComposition(): void {
    if (this.legacyCompositionSession) {
      return;
    }
    this.legacyCompositionSession = this.beginCompositionSession('legacy-composition', {
      message: 'LOADING 0%',
    });
  }

  /**
   * @deprecated Use `CompositionSession.dispose()`.
   */
  endComposition(): void {
    this.legacyCompositionSession?.dispose();
    this.legacyCompositionSession = undefined;
  }

  /**
   * @deprecated Use `CompositionSession.report`.
   */
  setCompositionText(text: string | null): void {
    if (!this.legacyCompositionSession) {
      return;
    }
    this.legacyCompositionSession.report({
      completed: this.legacyCompositionSession.completed ?? 0,
      total: this.legacyCompositionSession.total ?? 0,
      message: text ?? '',
    });
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
