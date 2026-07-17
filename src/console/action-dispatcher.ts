import type {
  CartridgeActionContext,
  CartridgeActionDisposition,
  RoccoCartridge,
  RoccoCartridgeAction,
} from './cartridges';

export interface ActionDispatcherOptions {
  getActiveCartridge: () => RoccoCartridge | null | undefined;
  getActiveLevelId: () => string | null | undefined;
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
  const highResolutionNow = globalThis.performance?.now().toFixed(3) ?? '0';
  return `action-${Date.now()}-${highResolutionNow}`;
}

/**
 * Central dispatcher for every user action. Resolves the synchronous movement
 * decision, assigns correlation identity, monitors async completion, serializes
 * exclusive actions, and cancels in-flight work on scene change or unmount.
 */
export class ActionDispatcher {
  private readonly getActiveCartridge: () => RoccoCartridge | null | undefined;
  private readonly getActiveLevelId: () => string | null | undefined;
  private readonly logFn: (channel: string, message: string) => void;
  private generation = 0;
  private disposed = false;
  private readonly tracked = new Map<string, TrackedAction>();
  private lastLevelId: string | undefined;

  constructor(options: ActionDispatcherOptions) {
    this.getActiveCartridge = options.getActiveCartridge;
    this.getActiveLevelId = options.getActiveLevelId;
    this.logFn = options.log;
  }

  private async watchCompletion(
    actionId: string,
    completion: Promise<void>,
    controller: AbortController,
    ownerLabel: string,
  ): Promise<void> {
    try {
      await completion;
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logFn(
        'ActionDispatcher',
        `Action '${actionId}' (${ownerLabel}) completion failed: ${message}`,
      );
    } finally {
      this.tracked.delete(actionId);
    }
  }

  private syncActiveLevel(levelId: string | undefined): void {
    if (levelId === this.lastLevelId) {
      return;
    }

    if (this.tracked.size > 0) {
      this.logFn(
        'ActionDispatcher',
        `Scene change detected (${String(this.lastLevelId)} -> ${String(levelId)}); cancelling ${this.tracked.size} in-flight action(s).`,
      );
    }
    this.cancelActiveActions('scene-change');
    this.lastLevelId = levelId;
  }

  private rejectExclusiveAction(request: DispatchOptions): CartridgeActionDisposition | undefined {
    if (request.exclusive === false || this.tracked.size === 0) {
      return undefined;
    }

    this.logFn(
      'ActionDispatcher',
      `Dropping ${request.owner ?? 'exclusive'} action: another action is still in flight.`,
    );
    return { consumed: true, defaultPlayerMovement: 'suppress' };
  }

  dispatch(action: RoccoCartridgeAction, request: DispatchOptions = {}): CartridgeActionDisposition {
    if (this.disposed) {
      return { consumed: true, defaultPlayerMovement: 'suppress' };
    }

    const levelId = this.getActiveLevelId() ?? undefined;
    this.syncActiveLevel(levelId);

    const exclusiveDisposition = this.rejectExclusiveAction(request);
    if (exclusiveDisposition) {
      return exclusiveDisposition;
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
      void this.watchCompletion(
        actionId,
        disposition.completion,
        controller,
        request.owner ?? cartridge.manifest.id,
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
