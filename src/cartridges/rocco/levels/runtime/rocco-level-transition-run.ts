import type { CartridgeSdkV1Runtime } from '../../../../console/cartridges/sdk-v1';

interface PromiseWithResolversResult<T> {
  promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
  reject(reason?: unknown): void;
}

const promiseConstructor = Promise as PromiseConstructor & {
  withResolvers<T>(): PromiseWithResolversResult<T>;
};

export interface RoccoLevelTransitionAbortReason {
  readonly kind: 'superseded' | 'invalidated';
  readonly mode: 'rollback' | 'abandon';
  readonly requestedBy?: string;
}

export class RoccoLevelTransitionCancelledError extends Error {
  readonly abortReason: RoccoLevelTransitionAbortReason | undefined;

  constructor(message: string, abortReason: RoccoLevelTransitionAbortReason | undefined) {
    super(message);
    this.name = 'RoccoLevelTransitionCancelledError';
    this.abortReason = abortReason;
  }
}

export interface ActiveTransitionRun {
  readonly id: string;
  readonly controller: AbortController;
  readonly settled: Promise<void>;
  readonly resolveSettled: () => void;
  published: boolean;
}

export function createActiveTransitionRun(id: string): ActiveTransitionRun {
  const deferred = promiseConstructor.withResolvers<void>();

  return {
    id,
    controller: new AbortController(),
    published: false,
    settled: deferred.promise,
    resolveSettled: () => deferred.resolve(),
  };
}

export function normalizeAbortReason(reason: unknown): RoccoLevelTransitionAbortReason | undefined {
  if (!reason || typeof reason !== 'object') {
    return undefined;
  }

  const candidate = reason as Partial<RoccoLevelTransitionAbortReason>;
  if (
    (candidate.kind === 'superseded' || candidate.kind === 'invalidated') &&
    (candidate.mode === 'rollback' || candidate.mode === 'abandon')
  ) {
    return {
      kind: candidate.kind,
      mode: candidate.mode,
      requestedBy: candidate.requestedBy,
    };
  }

  return undefined;
}

export function cancelActiveTransition(
  run: ActiveTransitionRun | undefined,
  reason: RoccoLevelTransitionAbortReason,
): void {
  if (!run || run.controller.signal.aborted) {
    return;
  }

  run.controller.abort(reason);
}

export function assertTransitionNotAborted(signal: AbortSignal, message: string): void {
  if (signal.aborted) {
    throw new RoccoLevelTransitionCancelledError(message, normalizeAbortReason(signal.reason));
  }
}

export type TransitionInputLease = ReturnType<CartridgeSdkV1Runtime['acquireInputLease']>;
export type TransitionComposition = ReturnType<CartridgeSdkV1Runtime['beginCompositionSession']>;
