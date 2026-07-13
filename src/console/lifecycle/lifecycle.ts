/**
 * Lifecycle and resource-ownership contracts for the ROCCO console runtime.
 *
 * These types implement the `Lifecycle` (§6.1) and `ResourceScope` (§6.2)
 * cross-cutting contracts from the architecture audit and back the runtime
 * state machine (ROCCO-007) and hierarchical scopes (ROCCO-008).
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

  get current(): LifecycleState {
    return this.state;
  }

  /** A fresh instance can initialize, as can one that previously failed. */
  canInitialize(): boolean {
    return this.state === 'new' || this.state === 'failed';
  }

  /** A disposed runtime is terminal; a new instance must be created. */
  isTerminal(): boolean {
    return this.state === 'disposed';
  }

  markInitializing(): void {
    if (this.state === 'initializing') {
      throw new Error('Lifecycle is already initializing');
    }
    if (!this.canInitialize()) {
      throw new Error(`Cannot initialize lifecycle in state '${this.state}'`);
    }
    this.state = 'initializing';
  }

  markReady(): void {
    this.state = 'ready';
  }

  markFailed(): void {
    this.state = 'failed';
  }

  markStopping(): void {
    this.state = 'stopping';
  }

  markStopped(): void {
    this.state = 'stopped';
  }

  markDisposing(): void {
    if (this.state === 'disposed' || this.state === 'disposing') {
      throw new Error(`Cannot begin disposal in state '${this.state}'`);
    }
    this.state = 'disposing';
  }

  markDisposed(): void {
    this.state = 'disposed';
  }
}
