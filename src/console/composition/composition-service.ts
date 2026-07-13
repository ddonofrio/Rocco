import type { DisposableResource, Disposer } from '../lifecycle';

export type CompositionMode = 'exclusive' | 'shared';

export type CompositionStatus = 'active' | 'failed' | 'disposed';

export interface CompositionProgress {
  completed: number;
  total: number;
  message?: string;
}

export interface CompositionSession extends DisposableResource {
  readonly id: string;
  readonly ownerId: string;
  readonly message: string | null;
  readonly status: CompositionStatus;

  report(progress: CompositionProgress): void;
  fail(error: unknown): void;
  dispose(): void;
}

export interface CompositionSessionInfo {
  readonly id: string;
  readonly ownerId: string;
  readonly message: string | null;
  readonly status: CompositionStatus;
}

export interface CompositionService {
  /**
   * Opens a composition session owned by `ownerId`. Only the returned session
   * may update or close its own overlay. When several sessions are open the
   * most recently begun one drives the visible overlay.
   */
  begin(options: {
    ownerId: string;
    mode?: CompositionMode;
    message?: string;
  }): CompositionSession;

  /** Message of the active (most recent) session, or `null` when none is open. */
  getActiveMessage(): string | null;

  getActiveStatus(): CompositionStatus | null;

  listSessions(): readonly CompositionSessionInfo[];

  onChange(listener: () => void): Disposer;
}

export class CompositionOwnershipError extends Error {
  constructor(sessionOwnerId: string, callerOwnerId: string) {
    super(
      `Composition session owned by '${sessionOwnerId}' cannot be mutated by '${callerOwnerId}'`,
    );
    this.name = 'CompositionOwnershipError';
  }
}

interface SessionState {
  readonly id: string;
  readonly ownerId: string;
  message: string | null;
  status: CompositionStatus;
}

class CompositionSessionImpl implements CompositionSession {
  readonly id: string;
  readonly ownerId: string;
  private readonly service: CompositionServiceImpl;

  constructor(id: string, ownerId: string, service: CompositionServiceImpl) {
    this.id = id;
    this.ownerId = ownerId;
    this.service = service;
  }

  get message(): string | null {
    return this.service.getSession(this.id)?.message ?? null;
  }

  get status(): CompositionStatus {
    return this.service.getSession(this.id)?.status ?? 'disposed';
  }

  report(progress: CompositionProgress): void {
    this.service.report(this.ownerId, this.id, progress);
  }

  fail(error: unknown): void {
    this.service.fail(this.ownerId, this.id, error);
  }

  dispose(): void {
    this.service.disposeSession(this.ownerId, this.id);
  }
}

export class CompositionServiceImpl implements CompositionService {
  private readonly sessions = new Map<string, SessionState>();
  private readonly order: string[] = [];
  private readonly listeners = new Set<() => void>();
  private nextId = 0;

  begin(options: {
    ownerId: string;
    mode?: CompositionMode;
    message?: string;
  }): CompositionSession {
    this.nextId += 1;
    const id = `composition-${this.nextId}`;
    const state: SessionState = {
      id,
      ownerId: options.ownerId,
      message: options.message ?? null,
      status: 'active',
    };
    this.sessions.set(id, state);
    this.order.push(id);
    this.emit();
    return new CompositionSessionImpl(id, options.ownerId, this);
  }

  getSession(id: string): SessionState | undefined {
    return this.sessions.get(id);
  }

  report(ownerId: string, id: string, progress: CompositionProgress): void {
    const state = this.sessions.get(id);
    if (!state || state.status !== 'active') {
      return;
    }
    if (state.ownerId !== ownerId) {
      throw new CompositionOwnershipError(state.ownerId, ownerId);
    }
    state.message = progress.message ?? state.message;
    this.emit();
  }

  fail(ownerId: string, id: string, error: unknown): void {
    const state = this.sessions.get(id);
    if (!state || state.status !== 'active') {
      return;
    }
    if (state.ownerId !== ownerId) {
      throw new CompositionOwnershipError(state.ownerId, ownerId);
    }
    state.status = 'failed';
    void error;
    this.emit();
  }

  disposeSession(ownerId: string, id: string): void {
    const state = this.sessions.get(id);
    if (!state || state.status === 'disposed') {
      return;
    }
    if (state.ownerId !== ownerId) {
      throw new CompositionOwnershipError(state.ownerId, ownerId);
    }
    state.status = 'disposed';
    this.sessions.delete(id);
    const index = this.order.indexOf(id);
    if (index !== -1) {
      this.order.splice(index, 1);
    }
    this.emit();
  }

  getActiveMessage(): string | null {
    const active = this.activeSession();
    return active ? active.message : null;
  }

  getActiveStatus(): CompositionStatus | null {
    const active = this.activeSession();
    return active ? active.status : null;
  }

  listSessions(): readonly CompositionSessionInfo[] {
    return [...this.order]
      .map((id) => this.sessions.get(id))
      .filter((state): state is SessionState => state !== undefined)
      .map((state) => ({
        id: state.id,
        ownerId: state.ownerId,
        message: state.message,
        status: state.status,
      }));
  }

  onChange(listener: () => void): Disposer {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private activeSession(): SessionState | undefined {
    for (let index = this.order.length - 1; index >= 0; index -= 1) {
      const state = this.sessions.get(this.order[index] ?? '');
      if (state) {
        return state;
      }
    }
    return undefined;
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
