import type { RoccoGridMenuItem } from '../../../../console/video/grid-menu';
import type { RpceInventoryItem } from './types';

export interface RpceInventoryStorageOptions {
  id: string;
  columns: number;
  rows: number;
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export class RpceInventoryStorage {
  readonly id: string;
  readonly columns: number;
  readonly rows: number;

  private readonly items = new Map<string, RpceInventoryItem>();

  constructor(options: RpceInventoryStorageOptions) {
    this.id = options.id;
    this.columns = Math.max(1, Math.floor(options.columns));
    this.rows = Math.max(1, Math.floor(options.rows));
  }

  get slotCount(): number {
    return this.columns * this.rows;
  }

  addItem(item: RpceInventoryItem): void {
    if (!this.canStoreItem(item)) {
      throw new Error(`Item '${item.id}' cannot be stored in '${this.id}'.`);
    }

    const existingItem = this.items.get(item.id);
    const requestedSlotIndex = item.slotIndex ?? existingItem?.slotIndex;
    const slotIndex =
      requestedSlotIndex !== undefined &&
      !this.isSlotOccupiedByOtherItem(requestedSlotIndex, item.id)
        ? this.normalizeSlotIndex(requestedSlotIndex)
        : this.findFirstOpenSlot(item.id);
    if (slotIndex === undefined) {
      throw new Error(`Storage '${this.id}' is full.`);
    }

    this.items.set(item.id, {
      ...clone(item),
      slotIndex,
    });
  }

  removeItem(itemId: string): void {
    this.items.delete(itemId);
  }

  clear(): void {
    this.items.clear();
  }

  replaceItems(items: readonly RpceInventoryItem[]): void {
    const previousItems = this.listItems();
    this.items.clear();
    try {
      for (const item of items) {
        this.addItem(item);
      }
    } catch (error) {
      this.items.clear();
      for (const item of previousItems) {
        this.addItem(item);
      }
      throw error;
    }
  }

  hasItem(itemId: string): boolean {
    return this.items.has(itemId);
  }

  getItem(itemId: string): RpceInventoryItem | undefined {
    const item = this.items.get(itemId);
    return item ? clone(item) : undefined;
  }

  listItems(): RpceInventoryItem[] {
    return [...this.items.values()]
      .sort((left, right) => (left.slotIndex ?? 0) - (right.slotIndex ?? 0))
      .map((item) => clone(item));
  }

  createGridMenuItems(): RoccoGridMenuItem[] {
    return this.listItems().map((item, index) => ({
      id: item.id,
      imageUri: item.imageUri,
      label: item.label,
      slotIndex: item.slotIndex ?? index,
      enabled: true,
    }));
  }

  applyGridMenuItems(items: readonly { id: string; slotIndex?: number }[]): void {
    for (const gridItem of items) {
      const item = this.items.get(gridItem.id);
      if (!item || gridItem.slotIndex === undefined) {
        continue;
      }

      item.slotIndex = this.normalizeSlotIndex(gridItem.slotIndex);
    }
  }

  canStoreItem(item: RpceInventoryItem): boolean {
    return !item.allowedStorageIds || item.allowedStorageIds.includes(this.id);
  }

  hasOpenSlot(excludingItemId?: string): boolean {
    return this.findFirstOpenSlot(excludingItemId) !== undefined;
  }

  isFull(excludingItemId?: string): boolean {
    return !this.hasOpenSlot(excludingItemId);
  }

  private findFirstOpenSlot(excludingItemId?: string): number | undefined {
    const occupiedSlots = new Set<number>();
    for (const item of this.items.values()) {
      if (item.id === excludingItemId || item.slotIndex === undefined) {
        continue;
      }

      occupiedSlots.add(this.normalizeSlotIndex(item.slotIndex));
    }

    for (let slotIndex = 0; slotIndex < this.slotCount; slotIndex += 1) {
      if (!occupiedSlots.has(slotIndex)) {
        return slotIndex;
      }
    }

    return undefined;
  }

  private isSlotOccupiedByOtherItem(slotIndex: number, excludingItemId?: string): boolean {
    const normalizedSlotIndex = this.normalizeSlotIndex(slotIndex);
    for (const item of this.items.values()) {
      if (item.id === excludingItemId || item.slotIndex === undefined) {
        continue;
      }

      if (this.normalizeSlotIndex(item.slotIndex) === normalizedSlotIndex) {
        return true;
      }
    }

    return false;
  }

  private normalizeSlotIndex(slotIndex: number): number {
    if (!Number.isFinite(slotIndex)) {
      return 0;
    }

    return Math.max(0, Math.min(this.slotCount - 1, Math.floor(slotIndex)));
  }
}
