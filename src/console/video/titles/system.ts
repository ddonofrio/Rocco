import type { RoccoTitleMessage, RoccoTitleSystem } from './types';

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class RoccoTitleSystemSDK implements RoccoTitleSystem {
  private readonly titles = new Map<string, RoccoTitleMessage>();

  addTitle(message: RoccoTitleMessage): void {
    this.titles.set(message.id, clone(message));
  }

  removeTitle(id: string): void {
    this.titles.delete(id);
  }

  clearTitles(): void {
    this.titles.clear();
  }

  getTitle(id: string): RoccoTitleMessage | undefined {
    const message = this.titles.get(id);
    return message ? clone(message) : undefined;
  }

  listTitles(): RoccoTitleMessage[] {
    return this.titles.values().map((message) => clone(message)).toArray();
  }

  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    const expiredTitleIds: string[] = [];
    for (const message of this.titles.values()) {
      if (message.ttlMs === undefined) {
        continue;
      }

      message.ttlMs -= deltaMs;
      if (message.ttlMs <= 0) {
        expiredTitleIds.push(message.id);
      }
    }

    for (const titleId of expiredTitleIds) {
      this.titles.delete(titleId);
    }
  }
}
