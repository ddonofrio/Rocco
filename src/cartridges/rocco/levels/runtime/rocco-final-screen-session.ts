export type RoccoFinalScreenInvocation =
  | { kind: 'developer-preview' }
  | { kind: 'game-superpowers' }
  | { kind: 'game-console-missing' };

interface ActiveFinalScreenSession {
  id: string;
  invocation: RoccoFinalScreenInvocation;
  onCompleted: () => void;
}

export interface RoccoFinalScreenSessionStart {
  id: string;
  invocation: RoccoFinalScreenInvocation;
}

export class RoccoFinalScreenSession {
  private nextId = 1;
  private activeSession: ActiveFinalScreenSession | undefined;

  begin(
    invocation: RoccoFinalScreenInvocation,
    onCompleted: () => void,
  ): RoccoFinalScreenSessionStart | undefined {
    if (this.activeSession) {
      return undefined;
    }

    const id = `rocco-final-screen-session-${this.nextId}`;
    this.nextId += 1;
    this.activeSession = { id, invocation, onCompleted };
    return { id, invocation };
  }

  resolve(
    id: string | undefined,
    invocation: RoccoFinalScreenInvocation | undefined,
  ): RoccoFinalScreenSessionStart | undefined {
    if (!id || !invocation || !this.activeSession) {
      return undefined;
    }
    if (this.activeSession.id !== id || this.activeSession.invocation.kind !== invocation.kind) {
      return undefined;
    }
    return { id, invocation };
  }

  complete(id: string): boolean {
    if (!this.activeSession || this.activeSession.id !== id) {
      return false;
    }

    const onCompleted = this.activeSession.onCompleted;
    this.activeSession = undefined;
    onCompleted();
    return true;
  }

  cancel(id?: string): void {
    if (!id || this.activeSession?.id === id) {
      this.activeSession = undefined;
    }
  }

  get isActive(): boolean {
    return this.activeSession !== undefined;
  }
}
