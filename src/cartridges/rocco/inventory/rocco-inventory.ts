import type { RoccoGridMenuDefinition } from '../../../engine/video/grid-menu';
import {
  roccoDefaultKeysAssetUrl,
  roccoDefaultMicromaniaInventoryAssetUrl,
  roccoDefaultMysteriousKeyAssetUrl,
  roccoDefaultTwentyEurosAssetUrl,
} from '../rocco-default-assets';
import type { RoccoLocalization } from '../localization';
import type { RoccoInventoryItem } from './types';

export const ROCCO_INVENTORY_MENU_ID = 'rocco-inventory-menu';
export const ROCCO_INVENTORY_KEYS_ITEM_ID = 'rocco-keys';
export const ROCCO_INVENTORY_MAGAZINE_ITEM_ID = 'rocco-magazine';
export const ROCCO_INVENTORY_MYSTERIOUS_KEY_ITEM_ID = 'rocco-mysterious-key';
export const ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID = 'rocco-twenty-euros';
const ROCCO_INVENTORY_SLOT_COUNT = 9;

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export class RoccoInventory {
  private readonly items = new Map<string, RoccoInventoryItem>();

  addItem(item: RoccoInventoryItem): void {
    const existingItem = this.items.get(item.id);
    const slotIndex = item.slotIndex ?? existingItem?.slotIndex ?? this.findFirstOpenSlot(item.id);
    this.items.set(item.id, {
      ...clone(item),
      slotIndex,
    });
  }

  removeItem(itemId: string): void {
    this.items.delete(itemId);
  }

  hasItem(itemId: string): boolean {
    return this.items.has(itemId);
  }

  listItems(): RoccoInventoryItem[] {
    return [...this.items.values()]
      .sort((left, right) => (left.slotIndex ?? 0) - (right.slotIndex ?? 0))
      .map((item) => clone(item));
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

  createGridMenuDefinition(localization: RoccoLocalization): RoccoGridMenuDefinition {
    return {
      id: ROCCO_INVENTORY_MENU_ID,
      title: localization.text.inventory.title,
      columns: 3,
      rows: 3,
      slotSize: 74,
      gap: 10,
      padding: 18,
      renderLayer: 'ui',
      zIndex: 120,
      reorderable: true,
      items: this.listItems().map((item, index) => ({
        id: item.id,
        imageUri: item.imageUri,
        label: item.label,
        slotIndex: item.slotIndex ?? index,
      })),
    };
  }

  private findFirstOpenSlot(excludingItemId?: string): number {
    const occupiedSlots = new Set<number>();
    for (const item of this.items.values()) {
      if (item.id === excludingItemId || item.slotIndex === undefined) {
        continue;
      }
      occupiedSlots.add(this.normalizeSlotIndex(item.slotIndex));
    }

    for (let slotIndex = 0; slotIndex < ROCCO_INVENTORY_SLOT_COUNT; slotIndex += 1) {
      if (!occupiedSlots.has(slotIndex)) {
        return slotIndex;
      }
    }

    return Math.max(0, this.items.size);
  }

  private normalizeSlotIndex(slotIndex: number): number {
    return Number.isFinite(slotIndex) ? Math.max(0, Math.floor(slotIndex)) : 0;
  }
}

export function createRoccoKeysInventoryItem(
  localization: RoccoLocalization,
): RoccoInventoryItem {
  return {
    id: ROCCO_INVENTORY_KEYS_ITEM_ID,
    label: localization.text.inventory.keysLabel,
    imageUri: roccoDefaultKeysAssetUrl,
  };
}

export function createRoccoMysteriousKeyInventoryItem(
  localization: RoccoLocalization,
): RoccoInventoryItem {
  return {
    id: ROCCO_INVENTORY_MYSTERIOUS_KEY_ITEM_ID,
    label: localization.text.inventory.mysteriousKeyLabel,
    imageUri: roccoDefaultMysteriousKeyAssetUrl,
  };
}

export function createRoccoTwentyEurosInventoryItem(
  localization: RoccoLocalization,
): RoccoInventoryItem {
  return {
    id: ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID,
    label: localization.text.inventory.twentyEurosLabel,
    imageUri: roccoDefaultTwentyEurosAssetUrl,
  };
}

export function createRoccoMagazineInventoryItem(
  localization: RoccoLocalization,
  known: boolean,
): RoccoInventoryItem {
  return {
    id: ROCCO_INVENTORY_MAGAZINE_ITEM_ID,
    label: known
      ? localization.text.inventory.micromaniaLabel
      : localization.text.inventory.magazineLabel,
    imageUri: roccoDefaultMicromaniaInventoryAssetUrl,
  };
}
