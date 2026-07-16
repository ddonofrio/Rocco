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
const DEFAULT_BUTTON_HEIGHT = 40;
const DEFAULT_BUTTON_GAP = 14;

interface CarriedGridMenuItem {
  definitionId: string;
  item: RoccoGridMenuItem;
  originSlotIndex: number;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function resolveDefinitionTitleHeight(definition: RoccoGridMenuDefinition): number {
  return definition.title && definition.showTitle !== false ? 34 : 0;
}

function resolveDefinitionHeaderHeight(definition: RoccoGridMenuDefinition): number {
  return Math.max(0, definition.headerHeight ?? 0);
}

function resolveColumnOffsets(
  columns: number,
  columnOffsets: readonly number[] | undefined,
): number[] {
  return Array.from({ length: columns }, (_, index) => {
    const offset = columnOffsets?.[index];
    return Number.isFinite(offset) ? Number(offset) : 0;
  });
}

function resolveSlotLeft(
  column: number,
  slotWidth: number,
  gap: number,
  columnOffsets: readonly number[],
): number {
  return column * (slotWidth + gap) + (columnOffsets[column] ?? 0);
}

function resolveContentWidth(
  columns: number,
  slotWidth: number,
  gap: number,
  columnOffsets: readonly number[],
): number {
  let maxRight = 0;

  for (let column = 0; column < columns; column += 1) {
    const right = resolveSlotLeft(column, slotWidth, gap, columnOffsets) + slotWidth;
    maxRight = Math.max(maxRight, right);
  }

  return maxRight;
}

function normalizeDefinition(definition: RoccoGridMenuDefinition): RoccoGridMenuDefinition {
  const columns = Math.max(1, Math.floor(definition.columns ?? DEFAULT_COLUMNS));
  const rows = Math.max(1, Math.floor(definition.rows ?? DEFAULT_ROWS));
  const slotCount = columns * rows;
  const slotWidth = Math.max(24, definition.slotWidth ?? definition.slotSize ?? DEFAULT_SLOT_SIZE);
  const slotHeight = Math.max(
    24,
    definition.slotHeight ?? definition.slotSize ?? DEFAULT_SLOT_SIZE,
  );
  const gap = Math.max(0, definition.gap ?? DEFAULT_GAP);
  const padding = Math.max(0, definition.padding ?? DEFAULT_PADDING);
  const headerHeight = resolveDefinitionHeaderHeight(definition);
  const buttonHeight = Math.max(24, definition.buttonHeight ?? DEFAULT_BUTTON_HEIGHT);
  const buttonGap = Math.max(0, definition.buttonGap ?? DEFAULT_BUTTON_GAP);
  const columnOffsets = resolveColumnOffsets(columns, definition.columnOffsets);
  const contentWidth = resolveContentWidth(columns, slotWidth, gap, columnOffsets);
  const width = contentWidth + padding * 2;
  const titleHeight = resolveDefinitionTitleHeight(definition);
  const buttonSectionHeight =
    definition.buttons && definition.buttons.length > 0 ? buttonGap + buttonHeight : 0;
  const height =
    rows * slotHeight +
    (rows - 1) * gap +
    padding * 2 +
    headerHeight +
    titleHeight +
    buttonSectionHeight;

  return {
    ...clone(definition),
    layout: definition.layout ?? 'grid',
    showTitle: definition.showTitle ?? true,
    columns,
    rows,
    slotSize: definition.slotSize ?? DEFAULT_SLOT_SIZE,
    slotWidth,
    slotHeight,
    gap,
    padding,
    headerHeight,
    buttonHeight,
    buttonGap,
    columnOffsets,
    x: definition.x ?? Math.round((DESIGN_WIDTH - width) / 2),
    y: definition.y ?? Math.round((DESIGN_HEIGHT - height) / 2),
    renderLayer: definition.renderLayer ?? 'ui',
    zIndex: definition.zIndex ?? 100,
    closeOnActivate: definition.closeOnActivate ?? false,
    closeOnEmptyClick: definition.closeOnEmptyClick ?? false,
    reorderable: definition.reorderable ?? false,
    buttons: definition.buttons?.map((button) => clone(button)) ?? [],
    blockedSlotIndexes: [
      ...new Set(
        (definition.blockedSlotIndexes ?? [])
          .filter((slotIndex) => Number.isFinite(slotIndex))
          .map((slotIndex) => Math.max(0, Math.min(slotCount - 1, Math.floor(slotIndex)))),
      ),
    ],
    backdropFill: definition.backdropFill ?? '#000000',
    backdropAlpha: definition.backdropAlpha ?? 0,
    panelFill: definition.panelFill ?? '#10170f',
    panelFillAlpha: definition.panelFillAlpha ?? 0.94,
    panelStroke: definition.panelStroke ?? '#d7e6c5',
    panelStrokeAlpha: definition.panelStrokeAlpha ?? 0.9,
    slotFill: definition.slotFill ?? '#182317',
    slotStroke: definition.slotStroke ?? '#5b704f',
    hoverStroke: definition.hoverStroke ?? '#8ecf6e',
    textDecorations: definition.textDecorations?.map((decoration) => clone(decoration)) ?? [],
    lineDecorations: definition.lineDecorations?.map((decoration) => clone(decoration)) ?? [],
  };
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

    const bounds = this.resolvePanelBounds(this.activeDefinition);
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

      const bounds = this.resolveButtonBounds(this.activeDefinition, buttonIndex);
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
    const headerHeight = resolveDefinitionHeaderHeight(definition);
    const buttonHeight = definition.buttonHeight ?? DEFAULT_BUTTON_HEIGHT;
    const buttonGap = definition.buttonGap ?? DEFAULT_BUTTON_GAP;
    const titleHeight = resolveDefinitionTitleHeight(definition);
    const buttonSectionHeight =
      definition.buttons && definition.buttons.length > 0 ? buttonGap + buttonHeight : 0;
    const columnOffsets = resolveColumnOffsets(columns, definition.columnOffsets);

    return {
      x: definition.x ?? 0,
      y: definition.y ?? 0,
      width: resolveContentWidth(columns, slotWidth, gap, columnOffsets) + padding * 2,
      height:
        rows * slotHeight +
        (rows - 1) * gap +
        padding * 2 +
        headerHeight +
        titleHeight +
        buttonSectionHeight,
    };
  }

  private resolveButtonBounds(
    definition: RoccoGridMenuDefinition,
    buttonIndex: number,
  ): { x: number; y: number; width: number; height: number } {
    const panel = this.resolvePanelBounds(definition);
    const padding = definition.padding ?? DEFAULT_PADDING;
    const buttonGap = definition.buttonGap ?? DEFAULT_BUTTON_GAP;
    const buttonHeight = definition.buttonHeight ?? DEFAULT_BUTTON_HEIGHT;
    const buttonCount = Math.max(1, definition.buttons?.length ?? 0);
    const innerWidth = panel.width - padding * 2;
    const totalGapWidth = Math.max(0, buttonCount - 1) * buttonGap;
    const buttonWidth = Math.max(44, (innerWidth - totalGapWidth) / buttonCount);
    const slotSectionHeight =
      (definition.rows ?? DEFAULT_ROWS) * (definition.slotHeight ?? definition.slotSize ?? DEFAULT_SLOT_SIZE) +
      (Math.max(0, (definition.rows ?? DEFAULT_ROWS) - 1) * (definition.gap ?? DEFAULT_GAP));
    const titleHeight = resolveDefinitionTitleHeight(definition);
    const headerHeight = resolveDefinitionHeaderHeight(definition);

    return {
      x: panel.x + padding + buttonIndex * (buttonWidth + buttonGap),
      y: panel.y + padding + headerHeight + titleHeight + slotSectionHeight + buttonGap,
      width: buttonWidth,
      height: buttonHeight,
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
    const titleHeight = resolveDefinitionTitleHeight(definition);
    const headerHeight = resolveDefinitionHeaderHeight(definition);
    const columnOffsets = resolveColumnOffsets(columns, definition.columnOffsets);
    const column = slotIndex % columns;
    const row = Math.floor(slotIndex / columns);

    return {
      x: (definition.x ?? 0) + padding + resolveSlotLeft(column, slotWidth, gap, columnOffsets),
      y: (definition.y ?? 0) + padding + headerHeight + titleHeight + row * (slotHeight + gap),
      width: slotWidth,
      height: slotHeight,
    };
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
