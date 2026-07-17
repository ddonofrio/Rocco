import type { Application, Ticker } from 'pixi.js';

import type { RoccoRuntimeAudioSystem } from './audio';
import type { RoccoJukeboxSystemImpl } from './audio/jukebox';
import type { ActionDispatcher } from './action-dispatcher';
import type { RoccoCartridgeManager } from './cartridge-manager';
import type { CompositionSession } from './composition/composition-service';
import type { RoccoInputHandler } from './input-handler';
import { createResourceScope, type Disposer, type ResourceScope } from './lifecycle';
import type { RoccoPersistenceAdapter } from './persistence-adapter';
import type { RuntimeCompositionPresenter } from './runtime-composition-presenter';
import type { RoccoRuntimeVideoSystem } from './video';

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export interface RuntimeResourceOwnerOptions {
  audio: Pick<RoccoRuntimeAudioSystem, 'destroy'>;
  jukebox: Pick<RoccoJukeboxSystemImpl, 'destroy'>;
  persistence: Pick<RoccoPersistenceAdapter, 'dispose'>;
  video: Pick<RoccoRuntimeVideoSystem, 'destroy'>;
  cartridgeManager: Pick<RoccoCartridgeManager, 'dispose'>;
  getInputHandler: () => Pick<RoccoInputHandler, 'unmount'> | undefined;
  getActionDispatcher: () => Pick<ActionDispatcher, 'cancelActiveActions'> | undefined;
  onCompositionChange: (listener: () => void) => Disposer;
  syncCompositionOverlay: () => void;
  compositionPresenter: RuntimeCompositionPresenter;
  handleResize: () => void;
  renderTick: (ticker: Ticker) => void;
}

export class RuntimeResourceOwner {
  private readonly options: RuntimeResourceOwnerOptions;
  private readonly rootScope: ResourceScope;
  private cartridgeScope: ResourceScope | undefined;
  private compositionListener: Disposer | undefined;
  private app: Application | undefined;
  private appInitialized = false;

  constructor(options: RuntimeResourceOwnerOptions) {
    this.options = options;
    const scope = createResourceScope('runtime');

    scope.defer(() => {
      if (this.appInitialized) {
        this.app?.destroy({ removeView: true }, true);
      }
      this.app = undefined;
      this.appInitialized = false;
    });
    scope.defer(() => this.options.audio.destroy());
    scope.defer(() => this.options.jukebox.destroy());
    scope.defer(() => this.options.persistence.dispose());
    scope.defer(() => {
      if (this.appInitialized) {
        this.options.video.destroy();
      }
    });
    scope.defer(() => this.options.getInputHandler()?.unmount());

    this.cartridgeScope = scope.createChild('cartridge');
    this.compositionListener = this.options.onCompositionChange(
      this.options.syncCompositionOverlay,
    );
    scope.defer(() => {
      const disposeListener = this.compositionListener;
      this.compositionListener = undefined;
      return disposeListener?.();
    });
    scope.defer(() => this.options.cartridgeManager.dispose());
    scope.defer(() => this.options.getActionDispatcher()?.cancelActiveActions('runtime-dispose'));

    scope.defer(() => {
      window.removeEventListener('resize', this.options.handleResize);
      if (this.appInitialized) {
        this.app?.ticker?.remove?.(this.options.renderTick);
      }
    });

    this.rootScope = scope;
  }

  get scope(): ResourceScope {
    return this.rootScope;
  }

  get cartridge(): ResourceScope | undefined {
    return this.cartridgeScope;
  }

  get application(): Application | undefined {
    return this.app;
  }

  setApplication(app: Application): void {
    this.app = app;
  }

  markApplicationInitialized(): void {
    this.appInitialized = true;
  }

  adoptCompositionSession(session: CompositionSession, ownerId: string): CompositionSession {
    const scope = this.cartridgeScope ?? this.rootScope;
    try {
      return scope.add(session);
    } catch (error) {
      try {
        session.dispose();
      } catch (disposeError) {
        throw new AggregateError(
          [error, disposeError],
          `Composition session '${ownerId}' could not be adopted and cleanup failed.`,
          { cause: disposeError },
        );
      }
      throw error;
    }
  }

  async dispose(): Promise<Error | undefined> {
    try {
      await this.rootScope.dispose();
      return undefined;
    } catch (error) {
      return toError(error);
    }
  }

  reset(): void {
    this.options.compositionPresenter.dispose();
    this.app = undefined;
    this.appInitialized = false;
    this.cartridgeScope = undefined;
  }
}
