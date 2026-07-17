import type {
  RoccoGridMenuActivation,
  RoccoGridMenuCarriedItem,
  RoccoGridMenuDefinition,
  RoccoGridMenuItem,
  RoccoGridMenuRenderable,
  RoccoGridMenuState,
  RoccoGridMenuSystem,
} from './types';
import {
  DEFAULT_COLUMNS,
  DEFAULT_ROWS,
  normalizeDefinition,
} from './definition';
import {
  resolveGridMenuButtonBounds,
  resolveGridMenuPanelBounds,
  resolveGridMenuSlotBounds,
} from './geometry';

interface CarriedGridMenuItem {
  definitionId: string;
  item: RoccoGridMenuItem;
  originSlotIndex: number;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}


export class RoccoGridMenuSystemSDK implements RoccoGridMenuSystem {
  private activeDefinition: RoccoGridMenuDefinition | undefined;
  private activeState: RoccoGridMenuState | undefined;
  private carriedItem: CarriedGridMenuItem | undefined;

  private activateItem(slotIndex: number): RoccoGridMenuActivation | undefined {
    const item = this.findItemInSlot(slotIndex);
    if (!this.activeDefinition || !item || item.enabled === false) {
      return undefined;
    }

    const activationSlotIndex = this.resolveItemSlotIndex(
      item,
      this.activeDefinition.items.indexOf(item),
    );
    const activation: RoccoGridMenuActivation = {
      kind: 'grid-menu',
      definitionId: this.activeDefinition.id,
      interaction: 'activate',
      itemId: item.id,
      slotIndex: activationSlotIndex,
      items: this.listActiveItems(),
    };

    if (this.activeDefinition.closeOnActivate) {
      this.closeMenu();
    }

    return activation;
  }

  private activateButton(
    button: NonNullable<RoccoGridMenuDefinition['buttons']>[number],
  ): RoccoGridMenuActivation | undefined {
    if (!this.activeDefinition || !this.isButtonEnabled(button)) {
      return undefined;
    }

    return {
      kind: 'grid-menu',
      definitionId: this.activeDefinition.id,
      interaction: 'button',
      buttonId: button.id,
      carriedItem: this.carriedItem ? clone(this.carriedItem.item) : undefined,
      items: this.listActiveItems(),
    };
  }

  private activateReorderableSlot(slotIndex: number): RoccoGridMenuActivation | undefined {
    if (!this.activeDefinition) {
      return undefined;
    }

    const item = this.findItemInSlot(slotIndex);
    if (!this.carriedItem) {
      return this.pickReorderableItem(item, slotIndex);
    }

    return this.placeReorderableItem(item, slotIndex);
  }

  private pickReorderableItem(
    item: RoccoGridMenuItem | undefined,
    slotIndex: number,
  ): RoccoGridMenuActivation | undefined {
    if (!this.activeDefinition || !item || item.enabled === false) {
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

  private placeReorderableItem(
    item: RoccoGridMenuItem | undefined,
    slotIndex: number,
  ): RoccoGridMenuActivation | undefined {
    if (!this.activeDefinition || !this.carriedItem) {
      return undefined;
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

    return this.swapReorderableItem(item, placedItem, previousCarriedItem, previousOriginSlotIndex, slotIndex);
  }

  private swapReorderableItem(
    item: RoccoGridMenuItem,
    placedItem: RoccoGridMenuItem,
    previousCarriedItem: RoccoGridMenuItem,
    previousOriginSlotIndex: number,
    slotIndex: number,
  ): RoccoGridMenuActivation {
    if (!this.activeDefinition) {
      throw new Error('Cannot swap an item without an active grid menu.');
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
    if (!this.isBlockedSlotIndex(normalizedPreferred) && !this.findItemInSlot(normalizedPreferred)) {
      return normalizedPreferred;
    }

    for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
      if (!this.isBlockedSlotIndex(slotIndex) && !this.findItemInSlot(slotIndex)) {
        return slotIndex;
      }
    }

    const fallbackSlotIndex = this.findFirstAvailableSlotIndex();
    return this.isBlockedSlotIndex(normalizedPreferred) ? fallbackSlotIndex : normalizedPreferred;
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

    this.activeDefinition.items = [
      ...this.activeDefinition.items.filter(
        (item) => item.id !== itemId && item.id !== replacement.id,
      ),
      replacement,
    ];
  }

  private listActiveItems(): RoccoGridMenuItem[] {
    return this.activeDefinition ? this.activeDefinition.items.map((item) => clone(item)) : [];
  }

  private containsPoint(x: number, y: number): boolean {
    if (!this.activeDefinition) {
      return false;
    }

    const bounds = resolveGridMenuPanelBounds(this.activeDefinition);
    return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
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

  private findButtonAt(
    x: number,
    y: number,
  ): NonNullable<RoccoGridMenuDefinition['buttons']>[number] | undefined {
    if (!this.activeDefinition || !this.activeDefinition.buttons?.length) {
      return undefined;
    }

    for (let buttonIndex = 0; buttonIndex < this.activeDefinition.buttons.length; buttonIndex += 1) {
      const button = this.activeDefinition.buttons[buttonIndex];
      if (!button || !this.isButtonEnabled(button)) {
        continue;
      }

      const bounds = resolveGridMenuButtonBounds(this.activeDefinition, buttonIndex);
      if (x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height) {
        return button;
      }
    }

    return undefined;
  }

  private isButtonEnabled(
    button: NonNullable<RoccoGridMenuDefinition['buttons']>[number],
  ): boolean {
    if (button.enabled === false) {
      return false;
    }

    if (button.requiresCarriedItem && !this.carriedItem) {
      return false;
    }

    return true;
  }

  private findSlotIndexAt(x: number, y: number): number | undefined {
    if (!this.activeDefinition) {
      return undefined;
    }

    const slotCount = this.resolveSlotCount();
    for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
      if (this.isBlockedSlotIndex(slotIndex)) {
        continue;
      }

      const slot = resolveGridMenuSlotBounds(this.activeDefinition, slotIndex);
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

  private isBlockedSlotIndex(slotIndex: number): boolean {
    return this.activeDefinition?.blockedSlotIndexes?.includes(slotIndex) ?? false;
  }

  private findFirstAvailableSlotIndex(): number {
    const slotCount = this.resolveSlotCount();
    for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
      if (!this.isBlockedSlotIndex(slotIndex)) {
        return slotIndex;
      }
    }

    return 0;
  }

  private resolveItemSlotIndex(item: RoccoGridMenuItem, fallbackIndex: number): number {
    const rawIndex = item.slotIndex ?? fallbackIndex;
    return Number.isFinite(rawIndex) ? Math.max(0, Math.floor(rawIndex)) : fallbackIndex;
  }

  openMenu(definition: RoccoGridMenuDefinition): void {
    if (!definition.id) {
      throw new Error('Grid menu definition id is required.');
    }

    this.activeDefinition = normalizeDefinition(definition);
    this.activeState = {
      definitionId: definition.id,
      hoveredItemId: undefined,
      hoveredSlotIndex: undefined,
      hoveredButtonId: undefined,
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
    const button = slotIndex === undefined ? this.findButtonAt(x, y) : undefined;
    const nextHoveredItemId = item?.id;
    const nextHoveredButtonId = button?.id;
    if (
      this.activeState.hoveredItemId === nextHoveredItemId &&
      this.activeState.hoveredSlotIndex === slotIndex &&
      this.activeState.hoveredButtonId === nextHoveredButtonId
    ) {
      return false;
    }

    this.activeState.hoveredItemId = nextHoveredItemId;
    this.activeState.hoveredSlotIndex = slotIndex;
    this.activeState.hoveredButtonId = nextHoveredButtonId;
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

      const activation: RoccoGridMenuActivation = {
        kind: 'grid-menu',
        definitionId: this.activeDefinition.id,
        interaction: 'close',
        items: this.listActiveItems(),
      };
      this.closeMenu();
      return activation;
    }

    const button = this.findButtonAt(x, y);
    if (button) {
      return this.activateButton(button);
    }

    const slotIndex = this.findSlotIndexAt(x, y);
    if (slotIndex === undefined) {
      if (this.activeDefinition.closeOnEmptyClick) {
        const activation: RoccoGridMenuActivation = {
          kind: 'grid-menu',
          definitionId: this.activeDefinition.id,
          interaction: 'close',
          items: this.listActiveItems(),
        };
        this.closeMenu();
        return activation;
      }

      return undefined;
    }

    if (this.activeDefinition.reorderable) {
      return this.activateReorderableSlot(slotIndex);
    }

    return this.activateItem(slotIndex);
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

}
