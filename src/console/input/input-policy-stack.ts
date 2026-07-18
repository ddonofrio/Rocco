import type { DisposableResource, Disposer } from '../lifecycle';

/**
 * Effective input policy modes, ordered from least to most restrictive.
 *
 * Implements the `InputPolicyLease` cross-cutting contract.
 */
export type InputMode = 'interactive' | 'advance-only' | 'blocked';

export interface InputPolicyLease extends DisposableResource {
  readonly ownerId: string;
  readonly mode: InputMode;
  readonly acquiredAt: number;
  dispose(): void;
}

export interface InputPolicyLeaseInfo {
  readonly ownerId: string;
  readonly mode: InputMode;
  readonly acquiredAt: number;
  readonly ageMs: (now?: number) => number;
}

export interface InputPolicyStack {
  /**
   * Acquires a lease that contributes its mode to the effective policy until
   * the returned lease is disposed. Leases from different owners compose: the
   * effective mode is the most restrictive of all active leases.
   */
  acquire(options: { ownerId: string; mode: InputMode }): InputPolicyLease;

  /** Releases every lease currently owned by `ownerId`. */
  releaseAll(ownerId: string): void;

  /** Most restrictive active mode, or `'interactive'` when no lease is held. */
  getEffectiveMode(): InputMode;

  /** Shorthand for `getEffectiveMode() === 'interactive'`. */
  isInteractive(): boolean;

  /** Diagnostic view of every active lease, oldest first. */
  listLeases(): readonly InputPolicyLeaseInfo[];

  /** Notifies when the effective mode changes. Returns an unsubscribe disposer. */
  onChange(listener: (mode: InputMode) => void): Disposer;
}

const MODE_RANK: Record<InputMode, number> = {
  interactive: 0,
  'advance-only': 1,
  blocked: 2,
};

export class InputPolicyStackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputPolicyStackError';
  }
}

class InputPolicyLeaseImpl implements InputPolicyLease {
  private readonly releaseFn: (lease: InputPolicyLeaseImpl) => void;
  private released = false;
  readonly ownerId: string;
  readonly mode: InputMode;
  readonly acquiredAt: number;

  constructor(
    ownerId: string,
    mode: InputMode,
    acquiredAt: number,
    releaseFunction: (lease: InputPolicyLeaseImpl) => void,
  ) {
    this.ownerId = ownerId;
    this.mode = mode;
    this.acquiredAt = acquiredAt;
    this.releaseFn = releaseFunction;
  }

  dispose(): void {
    if (this.released) {
      return;
    }
    this.released = true;
    this.releaseFn(this);
  }
}

export class InputPolicyStackImpl implements InputPolicyStack {
  private readonly leases: InputPolicyLeaseImpl[] = [];
  private readonly listeners = new Set<(mode: InputMode) => void>();
  private effectiveMode: InputMode = 'interactive';
  private readonly now: () => number;

  constructor(now: () => number = () => Date.now()) {
    this.now = now;
  }

  private releaseLease(lease: InputPolicyLeaseImpl): void {
    const index = this.leases.indexOf(lease);
    if (index === -1) {
      return;
    }
    this.leases.splice(index, 1);
    this.recompute();
  }

  private recompute(): void {
    let next: InputMode = 'interactive';
    for (const lease of this.leases) {
      if (MODE_RANK[lease.mode] > MODE_RANK[next]) {
        next = lease.mode;
      }
    }
    if (next === this.effectiveMode) {
      return;
    }
    this.effectiveMode = next;
    for (const listener of this.listeners) {
      listener(next);
    }
  }

  acquire({ ownerId, mode }: { ownerId: string; mode: InputMode }): InputPolicyLease {
    const lease = new InputPolicyLeaseImpl(ownerId, mode, this.now(), (released) =>
      this.releaseLease(released),
    );
    this.leases.push(lease);
    this.recompute();
    return lease;
  }

  releaseAll(ownerId: string): void {
    let isChanged = false;
    for (let index = this.leases.length - 1; index >= 0; index -= 1) {
      if (this.leases[index]?.ownerId !== ownerId) {
        continue;
      }

      this.leases.splice(index, 1);
      isChanged = true;
    }
    if (isChanged) {
      this.recompute();
    }
  }

  getEffectiveMode(): InputMode {
    return this.effectiveMode;
  }

  isInteractive(): boolean {
    return this.effectiveMode === 'interactive';
  }

  listLeases(): readonly InputPolicyLeaseInfo[] {
    const now = this.now();
    return this.leases.map((lease) => ({
      ownerId: lease.ownerId,
      mode: lease.mode,
      acquiredAt: lease.acquiredAt,
      ageMs: (snapshot: number = now) => snapshot - lease.acquiredAt,
    }));
  }

  onChange(listener: (mode: InputMode) => void): Disposer {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
