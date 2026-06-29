import type {
  RoccoGridMenuActivation,
  RoccoGridMenuCarriedItem,
  RoccoGridMenuDefinition,
  RoccoGridMenuItem,
  RoccoGridMenuRenderable,
  RoccoGridMenuState,
  RoccoGridMenuSystem,
} from './types';

const DESIGN_WIDTH = 960;
const DESIGN_HEIGHT = 540;
const DEFAULT_COLUMNS = 3;
const DEFAULT_ROWS = 3;
const DEFAULT_SLOT_SIZE = 72;
const DEFAULT_GAP = 10;
const DEFAULT_PADDING = 18;

interface CarriedGridMenuItem {
  definitionId: string;
  item: RoccoGridMenuItem;
  originSlotIndex: number;
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeDefinition(definition: RoccoGridMenuDefinition): RoccoGridMenuDefinition {
  const columns = Math.max(1, Math.floor(definition.columns ?? DEFAULT_COLUMNS));
  const rows = Math.max(1, Math.floor(definition.rows ?? DEFAULT_ROWS));
  const slotWidth = Math.max(24, definition.slotWidth ?? definition.slotSize ?? DEFAULT_SLOT_SIZE);
  const slotHeight = Math.max(
    24,
    definition.slotHeight ?? definition.slotSize ?? DEFAULT_SLOT_SIZE,
  );
  const gap = Math.max(0, definition.gap ?? DEFAULT_GAP);
  const padding = Math.max(0, definition.padding ?? DEFAULT_PADDING);
  const width = columns * slotWidth + (columns - 1) * gap + padding * 2;
  const titleHeight = definition.title ? 34 : 0;
  const height = rows * slotHeight + (rows - 1) * gap + padding * 2 + titleHeight;

  return {
    ...clone(definition),
    layout: definition.layout ?? 'grid',
    columns,
    rows,
    slotSize: definition.slotSize ?? DEFAULT_SLOT_SIZE,
    slotWidth,
    slotHeight,
    gap,
    padding,
    x: definition.x ?? Math.round((DESIGN_WIDTH - width) / 2),
    y: definition.y ?? Math.round((DESIGN_HEIGHT - height) / 2),
    renderLayer: definition.renderLayer ?? 'ui',
    zIndex: definition.zIndex ?? 100,
    closeOnActivate: definition.closeOnActivate ?? false,
    reorderable: definition.reorderable ?? false,
    panelFill: definition.panelFill ?? '#10170f',
    panelStroke: definition.panelStroke ?? '#d7e6c5',
    slotFill: definition.slotFill ?? '#182317',
    slotStroke: definition.slotStroke ?? '#5b704f',
    hoverStroke: definition.hoverStroke ?? '#8ecf6e',
  };
}

export class RoccoGridMenuSystemSDK implements RoccoGridMenuSystem {
  private activeDefinition: RoccoGridMenuDefinition | undefined;
  private activeState: RoccoGridMenuState | undefined;
  private carriedItem: CarriedGridMenuItem | undefined;

  openMenu(definition: RoccoGridMenuDefinition): void {
    if (!definition.id) {
      throw new Error('Grid menu definition id is required.');
    }

    this.activeDefinition = normalizeDefinition(definition);
    this.activeState = {
      definitionId: definition.id,
      hoveredItemId: undefined,
      hoveredSlotIndex: undefined,
      carriedItem:
        this.carriedItem?.definitionId === definition.id
          ? clone(this.carriedItem.item)
          : undefined,
    };
  }

  toggleMenu(definition: RoccoGridMenuDefinition): void {
    if (this.isOpen(definition.id)) {
      this.closeMenu();
      return;
    }

    this.openMenu(definition);
  }

  closeMenu(): void {
    this.activeDefinition = undefined;
    this.activeState = undefined;
  }

  isOpen(definitionId?: string): boolean {
    if (!this.activeDefinition || !this.activeState) {
      return false;
    }

    return definitionId ? this.activeState.definitionId === definitionId : true;
  }

  setHoverAt(x: number, y: number): boolean {
    if (!this.activeDefinition || !this.activeState) {
      return false;
    }

    const slotIndex = this.findSlotIndexAt(x, y);
    const item = slotIndex === undefined ? undefined : this.findItemInSlot(slotIndex);
    const nextHoveredItemId = item?.id;
    if (
      this.activeState.hoveredItemId === nextHoveredItemId &&
      this.activeState.hoveredSlotIndex === slotIndex
    ) {
      return false;
    }

    this.activeState.hoveredItemId = nextHoveredItemId;
    this.activeState.hoveredSlotIndex = slotIndex;
    return true;
  }

  getHoveredItem(): RoccoGridMenuItem | undefined {
    if (!this.activeDefinition || this.activeState?.hoveredSlotIndex === undefined) {
      return undefined;
    }

    const item = this.findItemInSlot(this.activeState.hoveredSlotIndex);
    return item ? clone(item) : undefined;
  }

  activateAt(x: number, y: number): RoccoGridMenuActivation | undefined {
    if (!this.activeDefinition || !this.activeState) {
      return undefined;
    }

    if (!this.containsPoint(x, y)) {
      if (this.activeDefinition.reorderable && this.carriedItem) {
        return this.carryItemOutsideMenu();
      }

      this.closeMenu();
      return undefined;
    }

    if (this.activeDefinition.reorderable) {
      return this.activateReorderableSlot(x, y);
    }

    return this.activateItem(x, y);
  }

  getCarriedItem(): RoccoGridMenuCarriedItem | undefined {
    if (!this.carriedItem) {
      return undefined;
    }

    return {
      definitionId: this.carriedItem.definitionId,
      item: clone(this.carriedItem.item),
    };
  }

  clearCarriedItem(): void {
    this.carriedItem = undefined;
    if (this.activeState) {
      this.activeState.carriedItem = undefined;
    }
  }

  getRenderableMenu(): RoccoGridMenuRenderable | undefined {
    if (!this.activeDefinition || !this.activeState) {
      return undefined;
    }

    return {
      definition: clone(this.activeDefinition),
      state: clone({
        ...this.activeState,
        carriedItem: this.carriedItem ? this.carriedItem.item : undefined,
      }),
    };
  }

  private activateItem(x: number, y: number): RoccoGridMenuActivation | undefined {
    const item = this.findItemAt(x, y);
    if (!this.activeDefinition || !item || item.enabled === false) {
      return undefined;
    }

    const slotIndex = this.resolveItemSlotIndex(item, this.activeDefinition.items.indexOf(item));
    const activation: RoccoGridMenuActivation = {
      kind: 'grid-menu',
      definitionId: this.activeDefinition.id,
      interaction: 'activate',
      itemId: item.id,
      slotIndex,
      items: this.listActiveItems(),
    };

    if (this.activeDefinition.closeOnActivate) {
      this.closeMenu();
    }

    return activation;
  }

  private activateReorderableSlot(x: number, y: number): RoccoGridMenuActivation | undefined {
    if (!this.activeDefinition) {
      return undefined;
    }

    const slotIndex = this.findSlotIndexAt(x, y);
    if (slotIndex === undefined) {
      return undefined;
    }

    const item = this.findItemInSlot(slotIndex);
    if (!this.carriedItem) {
      if (!item || item.enabled === false) {
        return undefined;
      }

      this.removeItem(item.id);
      this.carriedItem = {
        definitionId: this.activeDefinition.id,
        item: clone(item),
        originSlotIndex: slotIndex,
      };
      this.syncCarriedItemState();

      return {
        kind: 'grid-menu',
        definitionId: this.activeDefinition.id,
        interaction: 'pick',
        itemId: item.id,
        slotIndex,
        fromSlotIndex: slotIndex,
        carriedItem: clone(item),
        items: this.listActiveItems(),
      };
    }

    const placedItem: RoccoGridMenuItem = {
      ...clone(this.carriedItem.item),
      slotIndex,
    };
    const previousCarriedItem = clone(this.carriedItem.item);
    const previousOriginSlotIndex = this.carriedItem.originSlotIndex;

    if (!item) {
      this.activeDefinition.items.push(placedItem);
      this.carriedItem = undefined;
      this.syncCarriedItemState();

      return {
        kind: 'grid-menu',
        definitionId: this.activeDefinition.id,
        interaction: 'place',
        itemId: placedItem.id,
        slotIndex,
        fromSlotIndex: previousOriginSlotIndex,
        toSlotIndex: slotIndex,
        items: this.listActiveItems(),
      };
    }

    if (item.enabled === false) {
      return undefined;
    }

    this.replaceItem(item.id, placedItem);
    this.carriedItem = {
      definitionId: this.activeDefinition.id,
      item: clone(item),
      originSlotIndex: slotIndex,
    };
    this.syncCarriedItemState();

    return {
      kind: 'grid-menu',
      definitionId: this.activeDefinition.id,
      interaction: 'swap',
      itemId: previousCarriedItem.id,
      slotIndex,
      fromSlotIndex: previousOriginSlotIndex,
      toSlotIndex: slotIndex,
      carriedItem: clone(item),
      replacedItem: clone(item),
      items: this.listActiveItems(),
    };
  }

  private carryItemOutsideMenu(): RoccoGridMenuActivation | undefined {
    if (!this.activeDefinition || !this.carriedItem) {
      return undefined;
    }

    const carriedItem = this.restoreCarriedItemToActiveMenu();
    const activation: RoccoGridMenuActivation = {
      kind: 'grid-menu',
      definitionId: this.activeDefinition.id,
      interaction: 'carry',
      itemId: carriedItem.id,
      slotIndex: carriedItem.slotIndex,
      carriedItem: clone(carriedItem),
      items: this.listActiveItems(),
    };

    this.carriedItem = {
      definitionId: this.activeDefinition.id,
      item: clone(carriedItem),
      originSlotIndex: carriedItem.slotIndex ?? 0,
    };
    this.closeMenu();
    return activation;
  }

  private restoreCarriedItemToActiveMenu(): RoccoGridMenuItem {
    if (!this.activeDefinition || !this.carriedItem) {
      throw new Error('Cannot restore a missing carried item.');
    }

    const slotIndex = this.resolveRestoreSlotIndex(this.carriedItem.originSlotIndex);
    const restoredItem: RoccoGridMenuItem = {
      ...clone(this.carriedItem.item),
      slotIndex,
    };
    this.removeItem(restoredItem.id);
    this.activeDefinition.items.push(restoredItem);
    return restoredItem;
  }

  private resolveRestoreSlotIndex(preferredSlotIndex: number): number {
    const slotCount = this.resolveSlotCount();
    const normalizedPreferred = Math.max(0, Math.min(slotCount - 1, Math.floor(preferredSlotIndex)));
    if (!this.findItemInSlot(normalizedPreferred)) {
      return normalizedPreferred;
    }

    for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
      if (!this.findItemInSlot(slotIndex)) {
        return slotIndex;
      }
    }

    return normalizedPreferred;
  }

  private syncCarriedItemState(): void {
    if (this.activeState) {
      this.activeState.carriedItem = this.carriedItem ? clone(this.carriedItem.item) : undefined;
    }
  }

  private removeItem(itemId: string): void {
    if (!this.activeDefinition) {
      return;
    }

    this.activeDefinition.items = this.activeDefinition.items.filter((item) => item.id !== itemId);
  }

  private replaceItem(itemId: string, replacement: RoccoGridMenuItem): void {
    if (!this.activeDefinition) {
      return;
    }

    this.activeDefinition.items = this.activeDefinition.items
      .filter((item) => item.id !== itemId && item.id !== replacement.id)
      .concat(replacement);
  }

  private listActiveItems(): RoccoGridMenuItem[] {
    return this.activeDefinition ? this.activeDefinition.items.map((item) => clone(item)) : [];
  }

  private containsPoint(x: number, y: number): boolean {
    if (!this.activeDefinition) {
      return false;
    }

    const bounds = this.resolvePanelBounds(this.activeDefinition);
    return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
  }

  private findItemAt(x: number, y: number): RoccoGridMenuItem | undefined {
    const slotIndex = this.findSlotIndexAt(x, y);
    return slotIndex === undefined ? undefined : this.findItemInSlot(slotIndex);
  }

  private findItemInSlot(slotIndex: number): RoccoGridMenuItem | undefined {
    if (!this.activeDefinition) {
      return undefined;
    }

    return this.activeDefinition.items.find((item, index) => {
      const itemSlotIndex = this.resolveItemSlotIndex(item, index);
      return itemSlotIndex === slotIndex;
    });
  }

  private findSlotIndexAt(x: number, y: number): number | undefined {
    if (!this.activeDefinition) {
      return undefined;
    }

    const slotCount = this.resolveSlotCount();
    for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
      const slot = this.resolveSlotBounds(this.activeDefinition, slotIndex);
      if (x >= slot.x && x <= slot.x + slot.width && y >= slot.y && y <= slot.y + slot.height) {
        return slotIndex;
      }
    }

    return undefined;
  }

  private resolveSlotCount(): number {
    if (!this.activeDefinition) {
      return 0;
    }

    return (this.activeDefinition.columns ?? DEFAULT_COLUMNS) * (this.activeDefinition.rows ?? DEFAULT_ROWS);
  }

  private resolveItemSlotIndex(item: RoccoGridMenuItem, fallbackIndex: number): number {
    const rawIndex = item.slotIndex ?? fallbackIndex;
    return Number.isFinite(rawIndex) ? Math.max(0, Math.floor(rawIndex)) : fallbackIndex;
  }

  private resolvePanelBounds(definition: RoccoGridMenuDefinition): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const columns = definition.columns ?? DEFAULT_COLUMNS;
    const rows = definition.rows ?? DEFAULT_ROWS;
    const slotWidth = definition.slotWidth ?? definition.slotSize ?? DEFAULT_SLOT_SIZE;
    const slotHeight = definition.slotHeight ?? definition.slotSize ?? DEFAULT_SLOT_SIZE;
    const gap = definition.gap ?? DEFAULT_GAP;
    const padding = definition.padding ?? DEFAULT_PADDING;
    const titleHeight = definition.title ? 34 : 0;

    return {
      x: definition.x ?? 0,
      y: definition.y ?? 0,
      width: columns * slotWidth + (columns - 1) * gap + padding * 2,
      height: rows * slotHeight + (rows - 1) * gap + padding * 2 + titleHeight,
    };
  }

  private resolveSlotBounds(
    definition: RoccoGridMenuDefinition,
    slotIndex: number,
  ): { x: number; y: number; width: number; height: number } {
    const columns = definition.columns ?? DEFAULT_COLUMNS;
    const slotWidth = definition.slotWidth ?? definition.slotSize ?? DEFAULT_SLOT_SIZE;
    const slotHeight = definition.slotHeight ?? definition.slotSize ?? DEFAULT_SLOT_SIZE;
    const gap = definition.gap ?? DEFAULT_GAP;
    const padding = definition.padding ?? DEFAULT_PADDING;
    const titleHeight = definition.title ? 34 : 0;
    const column = slotIndex % columns;
    const row = Math.floor(slotIndex / columns);

    return {
      x: (definition.x ?? 0) + padding + column * (slotWidth + gap),
      y: (definition.y ?? 0) + padding + titleHeight + row * (slotHeight + gap),
      width: slotWidth,
      height: slotHeight,
    };
  }
}
