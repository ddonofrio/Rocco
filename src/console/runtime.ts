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
import { ActionDispatcher } from './action-dispatcher';
import { RoccoCartridgeManager } from './cartridge-manager';
import { RoccoPersistenceAdapter } from './persistence-adapter';

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
  private soundProfile: RoccoSoundProfile = { ...defaultSoundProfile };
  private consoleFlags: RoccoConsoleFlags;

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
  }

  async init(): Promise<void> {
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
    });

    app.ticker.add(this.renderTick);
    this.options.onStatusChange?.(this.statusMessage);
    window.addEventListener('resize', this.handleResize);
  }

  async dispose(): Promise<void> {
    window.removeEventListener('resize', this.handleResize);

    await this.cartridgeManager.dispose();

    if (this.app) {
      this.app.ticker.remove(this.renderTick);
      this.video.destroy();
    }
    this.jukebox.destroy();
    this.audio.destroy();
    this.inputHandler?.unmount();
    this.inputHandler = null;
    this.activePlaneSceneId = null;
    this.activePlayerSpriteId = null;
    this.app?.destroy({ removeView: true }, true);
    this.app = null;
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

  setInputEnabled(enabled: boolean): void {
    this.inputHandler?.setInputEnabled(enabled);
  }

  isInputEnabled(): boolean {
    return this.inputHandler?.isInputEnabled() ?? true;
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

  beginComposition(): void {
    if (!this.app || this.compositionOverlay) {
      return;
    }

    this.compositionOverlay = new Container();
    this.compositionOverlay.label = 'composition-overlay';
    this.compositionOverlay.zIndex = 10000;
    this.compositionOverlay.sortableChildren = true;
    const bg = new Graphics().rect(0, 0, 10000, 10000).fill(0x0d110c);
    this.compositionOverlay.addChild(bg);
    this.app.stage.addChild(this.compositionOverlay);
  }

  endComposition(): void {
    if (!this.app || !this.compositionOverlay) {
      return;
    }

    this.app.stage.removeChild(this.compositionOverlay);
    this.compositionOverlay.destroy({ children: true });
    this.compositionOverlay = null;
    this.compositionText = null;
  }

  setCompositionText(text: string | null): void {
    if (!this.app || !this.compositionOverlay) {
      return;
    }

    if (!text) {
      if (this.compositionText) {
        this.compositionOverlay.removeChild(this.compositionText);
        this.compositionText.destroy();
        this.compositionText = null;
      }
      return;
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
      this.compositionText.x = 480;
      this.compositionText.y = 270;
      this.compositionText.anchor.set(0.5);
      this.compositionText.zIndex = 10001;
      this.compositionOverlay.addChild(this.compositionText);
    } else {
      this.compositionText.text = text;
    }

    this.app.render();
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
