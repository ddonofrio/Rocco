import type {
  CartridgeActionContext,
  CartridgeActionDisposition,
  RoccoCartridge,
  RoccoCartridgeAction,
} from './cartridges';

export interface ActionDispatcherOptions {
  getActiveCartridge: () => RoccoCartridge | null;
  getActiveLevelId: () => string | null;
  log: (channel: string, message: string) => void;
}

export interface DispatchOptions {
  exclusive?: boolean;
  owner?: string;
}

interface TrackedAction {
  readonly controller: AbortController;
  readonly startedAt: number;
  readonly owner?: string;
}

function createActionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `action-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Central dispatcher for every user action. Resolves the synchronous movement
 * decision, assigns correlation identity, monitors async completion, serializes
 * exclusive actions, and cancels in-flight work on scene change or unmount.
 */
export class ActionDispatcher {
  private readonly getActiveCartridge: () => RoccoCartridge | null;
  private readonly getActiveLevelId: () => string | null;
  private readonly logFn: (channel: string, message: string) => void;
  private generation = 0;
  private disposed = false;
  private readonly tracked = new Map<string, TrackedAction>();
  private lastLevelId: string | null = null;

  constructor(options: ActionDispatcherOptions) {
    this.getActiveCartridge = options.getActiveCartridge;
    this.getActiveLevelId = options.getActiveLevelId;
    this.logFn = options.log;
  }

  dispatch(action: RoccoCartridgeAction, request: DispatchOptions = {}): CartridgeActionDisposition {
    if (this.disposed) {
      return { consumed: true, defaultPlayerMovement: 'suppress' };
    }

    const levelId = this.getActiveLevelId();
    if (levelId !== this.lastLevelId) {
      if (this.tracked.size > 0) {
        this.logFn(
          'ActionDispatcher',
          `Scene change detected (${String(this.lastLevelId)} -> ${String(levelId)}); cancelling ${this.tracked.size} in-flight action(s).`,
        );
      }
      this.cancelActiveActions('scene-change');
      this.lastLevelId = levelId;
    }

    const exclusive = request.exclusive !== false;
    if (exclusive && this.tracked.size > 0) {
      this.logFn(
        'ActionDispatcher',
        `Dropping ${request.owner ?? 'exclusive'} action: another action is still in flight.`,
      );
      return { consumed: true, defaultPlayerMovement: 'suppress' };
    }

    const cartridge = this.getActiveCartridge();
    if (!cartridge || typeof cartridge.handleAction !== 'function') {
      return { consumed: true, defaultPlayerMovement: 'suppress' };
    }

    const actionId = createActionId();
    const controller = new AbortController();
    const context: CartridgeActionContext = {
      signal: controller.signal,
      actionId,
      correlationId: actionId,
      cartridgeId: cartridge.manifest.id,
      levelId,
    };

    let raw: CartridgeActionDisposition | void;
    try {
      raw = cartridge.handleAction(action, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logFn('ActionDispatcher', `handleAction for '${cartridge.manifest.id}' failed: ${message}`);
      return { consumed: true, defaultPlayerMovement: 'suppress' };
    }

    if (!raw) {
      return { consumed: false, defaultPlayerMovement: 'allow' };
    }

    const disposition = raw;

    if (disposition.completion) {
      this.tracked.set(actionId, {
        controller,
        startedAt: Date.now(),
        owner: request.owner,
      });
      disposition.completion.then(
        () => {
          this.tracked.delete(actionId);
        },
        (error: unknown) => {
          this.tracked.delete(actionId);
          if (controller.signal.aborted) {
            return;
          }
          const message = error instanceof Error ? error.message : String(error);
          this.logFn(
            'ActionDispatcher',
            `Action '${actionId}' (${request.owner ?? cartridge.manifest.id}) completion failed: ${message}`,
          );
        },
      );
    }

    return disposition;
  }

  cancelActiveActions(reason?: string): void {
    if (this.tracked.size === 0) {
      return;
    }
    this.generation += 1;
    for (const [, tracked] of this.tracked) {
      tracked.controller.abort(reason);
    }
    this.tracked.clear();
  }

  dispose(): void {
    this.disposed = true;
    this.cancelActiveActions('dispatcher-disposed');
  }
}
