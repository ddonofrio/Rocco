/**
 * Lifecycle and resource-ownership contracts for the ROCCO console runtime.
 *
 * These types implement the `Lifecycle` and `ResourceScope` cross-cutting
 * contracts and back the runtime state machine and hierarchical scopes.
 */

export type LifecycleState =
  | 'new'
  | 'initializing'
  | 'ready'
  | 'stopping'
  | 'stopped'
  | 'disposing'
  | 'disposed'
  | 'failed';

export interface Lifecycle {
  readonly state: LifecycleState;

  initialize(signal: AbortSignal): Promise<void>;
  stop(signal: AbortSignal): Promise<void>;
  dispose(): Promise<void>;
}

export type Disposer = () => void | Promise<void>;

export interface DisposableResource {
  dispose(): void | Promise<void>;
}

export interface ResourceScope extends DisposableResource {
  readonly id: string;
  readonly signal: AbortSignal;
  readonly parent: ResourceScope | null;
  readonly isDisposed: boolean;
  dispose(): Promise<void>;

  /**
   * Registers a disposable resource. The resource is disposed in LIFO order
   * when the scope closes. Returns the resource unchanged for chaining.
   * Throws once the scope is disposed.
   */
  add<T extends DisposableResource>(resource: T): T;

  /**
   * Registers a bare disposer. Runs in LIFO order on close.
   * Throws once the scope is disposed.
   */
  defer(disposer: Disposer): void;

  /**
   * Creates a child scope owned by this scope. Disposing the parent cascades
   * to the child; disposing the child first detaches it from the parent.
   */
  createChild(id: string): ResourceScope;
}

/**
 * Explicit, reusable lifecycle state machine. It only guards transitions; the
 * actual async work (Pixi init, cartridge mount, subsystem teardown) lives in
 * the owner. Keeping it separate makes the transition rules unit-testable
 * without a browser runtime.
 */
export class LifecycleStateMachine {
  private state: LifecycleState = 'new';

  private transition(
    allowed: readonly LifecycleState[],
    next: LifecycleState,
    action: string,
  ): void {
    if (!allowed.includes(this.state)) {
      throw new Error(`Cannot ${action} lifecycle in state '${this.state}'`);
    }

    this.state = next;
  }

  get current(): LifecycleState {
    return this.state;
  }

  /** A fresh instance can initialize exactly once. */
  canInitialize(): boolean {
    return this.state === 'new';
  }

  /** Failed and disposed runtimes are terminal; create a new instance. */
  isTerminal(): boolean {
    return this.state === 'disposed' || this.state === 'failed';
  }

  markInitializing(): void {
    this.transition(['new'], 'initializing', 'initialize');
  }

  markReady(): void {
    this.transition(['initializing'], 'ready', 'mark ready');
  }

  markFailed(): void {
    this.transition(['initializing', 'ready', 'stopping'], 'failed', 'fail');
  }

  markStopping(): void {
    this.transition(['ready'], 'stopping', 'stop');
  }

  markStopped(): void {
    this.transition(['stopping'], 'stopped', 'mark stopped');
  }

  markDisposing(): void {
    this.transition(['new', 'initializing', 'ready', 'stopped'], 'disposing', 'dispose');
  }

  markDisposed(): void {
    this.transition(['disposing'], 'disposed', 'mark disposed');
  }
}
