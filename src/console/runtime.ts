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

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
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
  private app: Application | null = null;
  private readonly effectRegistry = new RoccoDefaultEffectRegistry();
  private effectElapsedMs = 0;
  private readonly cartridgeManager = new RoccoCartridgeManager();
  private inputHandler: RoccoInputHandler | null = null;
  private activePlaneSceneId: string | null = null;
  private activePlayerSpriteId: string | null = null;
  private statusMessage = 'Engine bootstrapping cartridge...';
  private compositionOverlay: Container | null = null;
  private compositionText: Text | null = null;
  private readonly inputPolicy = new InputPolicyStackImpl();
  private readonly compositionService = new CompositionServiceImpl();
  private compositionListener: Disposer | null = null;
  private legacyInputLockCount = 0;
  private legacyInputLease: InputPolicyLease | null = null;
  private legacyCompositionSession: CompositionSession | null = null;
  private soundProfile: RoccoSoundProfile = { ...defaultSoundProfile };
  private consoleFlags: RoccoConsoleFlags;

  private readonly lifecycle = new LifecycleStateMachine();
  private rootScope!: ResourceScope;
  private cartridgeScope: ResourceScope | null = null;

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
   * deactivate/unmount cartridge, unmount input, destroy video, destroy
   * jukebox, destroy audio, destroy Pixi app.
   */
  private createRootScope(): void {
    const scope = createResourceScope('runtime');

    scope.defer(() => {
      this.app?.destroy({ removeView: true }, true);
      this.app = null;
    });
    scope.defer(() => this.audio.destroy());
    scope.defer(() => this.jukebox.destroy());
    scope.defer(() => void this.persistence.dispose());
    scope.defer(() => {
      if (this.app) {
        this.video.destroy();
      }
    });
    scope.defer(() => this.inputHandler?.unmount());

    const cartridgeScope = scope.createChild('cartridge');
    this.cartridgeScope = cartridgeScope;
    cartridgeScope.defer(() => this.cartridgeManager.dispose());

    scope.defer(() => {
      window.removeEventListener('resize', this.handleResize);
      if (this.app) {
        this.app.ticker.remove(this.renderTick);
      }
    });

    this.rootScope = scope;
  }

  async init(): Promise<void> {
    if (this.lifecycle.current === 'ready') {
      return;
    }
    if (this.lifecycle.isTerminal()) {
      throw new Error('GameRuntime has been disposed; create a new instance to run again');
    }
    if (this.lifecycle.current !== 'new') {
      this.createRootScope();
    }

    this.lifecycle.markInitializing();
    try {
      const app = new Application();
      await app.init({
        preference: 'webgl',
        background: '#0f1610',
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        resizeTo: this.options.mount,
      });

      this.options.mount.replaceChildren(app.canvas);
      this.app = app;
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
      await this.rootScope.dispose();
      throw error;
    }
  }

  async dispose(): Promise<void> {
    if (this.lifecycle.current === 'disposing' || this.lifecycle.current === 'disposed') {
      return;
    }
    this.lifecycle.markDisposing();
    try {
      await this.rootScope.dispose();
      this.lifecycle.markDisposed();
    } catch (error) {
      this.lifecycle.markFailed();
      throw error;
    }

    void this.compositionListener?.();
    this.compositionListener = null;

    this.inputHandler = null;
    this.activePlaneSceneId = null;
    this.activePlayerSpriteId = null;
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

  setPlayerSprite(instanceId: string | null): void {
    this.activePlayerSpriteId = instanceId;
    this.video.setActivePlayerSprite(instanceId);
    if (instanceId && this.activePlayerSpriteId === instanceId) {
      const sprite = this.video.sprites.getSprite(instanceId);
      if (sprite) {
        this.video.render(0);
      }
    }
  }

  getPlayerSprite(): string | null {
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
   * (audit Phase 4). Backed by a ref-counted `'legacy-input'` lease so it still
   * composes with `acquireInputLease` callers. Use `acquireInputLease` instead.
   */
  setInputEnabled(enabled: boolean): void {
    if (!enabled) {
      this.legacyInputLockCount += 1;
      if (this.legacyInputLockCount === 1 && !this.legacyInputLease) {
        this.legacyInputLease = this.inputPolicy.acquire({ ownerId: 'legacy-input', mode: 'blocked' });
      }
      return;
    }
    this.legacyInputLockCount = Math.max(0, this.legacyInputLockCount - 1);
    if (this.legacyInputLockCount === 0 && this.legacyInputLease) {
      this.legacyInputLease.dispose();
      this.legacyInputLease = null;
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
    return this.compositionService.begin({ ownerId, message: options.message });
  }

  private syncCompositionOverlay(): void {
    if (!this.app) {
      return;
    }
    const message = this.compositionService.getActiveMessage();
    if (message === null) {
      this.hideCompositionOverlay();
      return;
    }
    this.showCompositionOverlay(message);
  }

  private showCompositionOverlay(text: string): void {
    if (!this.app) {
      return;
    }
    if (!this.compositionOverlay) {
      this.compositionOverlay = new Container();
      this.compositionOverlay.label = 'composition-overlay';
      this.compositionOverlay.zIndex = 10000;
      this.compositionOverlay.sortableChildren = true;
      const bg = new Graphics()
        .rect(0, 0, this.app.screen.width, this.app.screen.height)
        .fill(0x0d110c);
      this.compositionOverlay.addChild(bg);
      this.app.stage.addChild(this.compositionOverlay);
    }

    if (!this.compositionText) {
      this.compositionText = new Text({
        text,
        style: {
          fill: '#9ca3af',
          fontFamily: 'Cascadia Mono, Lucida Console, monospace',
          fontSize: 18,
          fontWeight: '700',
          letterSpacing: 1,
        },
      });
      this.compositionText.anchor.set(0.5);
      this.compositionText.zIndex = 10001;
      this.compositionOverlay.addChild(this.compositionText);
    } else {
      this.compositionText.text = text;
    }

    this.compositionText.x = this.app.screen.width / 2;
    this.compositionText.y = this.app.screen.height / 2;
    this.app.render();
  }

  private hideCompositionOverlay(): void {
    if (!this.app || !this.compositionOverlay) {
      return;
    }
    this.app.stage.removeChild(this.compositionOverlay);
    this.compositionOverlay.destroy({ children: true });
    this.compositionOverlay = null;
    this.compositionText = null;
  }

  /**
   * @deprecated Retained for legacy callers. Use `beginCompositionSession`.
   */
  beginComposition(): void {
    if (this.legacyCompositionSession) {
      return;
    }
    this.legacyCompositionSession = this.compositionService.begin({
      ownerId: 'legacy-composition',
      message: 'LOADING 0%',
    });
  }

  /**
   * @deprecated Use `CompositionSession.dispose()`.
   */
  endComposition(): void {
    this.legacyCompositionSession?.dispose();
    this.legacyCompositionSession = null;
  }

  /**
   * @deprecated Use `CompositionSession.report`.
   */
  setCompositionText(text: string | null): void {
    if (!this.legacyCompositionSession) {
      return;
    }
    this.legacyCompositionSession.report({ completed: 0, total: 0, message: text ?? '' });
  }

  setStatus(status: string): void {
    this.statusMessage = status;
    this.options.onStatusChange?.(status);
  }

  log(channel: string, message: string): void {
    this.options.onLog?.(channel, message);
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

  private handleResize = (): void => {
    this.video.render(0);
  };

  private renderTick = (ticker: Ticker): void => {
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
      return undefined;
    }

    if (targetType === 'graphic-plane') {
      return this.video.planes.resolvePlane(this.activePlaneSceneId, targetId);
    }
    return undefined;
  };

  private applySoundProfile(): void {
    this.audio.setVolume(getEffectiveSfxVolume(this.soundProfile));
    this.jukebox.setVolume(getEffectiveMusicVolume(this.soundProfile));
  }
}
