import type {
  RoccoGridMenuActivation,
  RoccoGridMenuDefinition,
  RoccoGridMenuItem,
} from '../../../../console/video/grid-menu';
import { RpceInventoryStorage } from './inventory-storage';
import type { RpceInventoryItem } from './types';

export interface RpceInventoryTransferSessionOptions {
  menuId: string;
  leftStorage: RpceInventoryStorage;
  rightStorage: RpceInventoryStorage;
  spacerColumns?: number;
  sectionGapPx?: number;
  slotSize?: number;
  gap?: number;
  padding?: number;
  leftTitle?: string;
  rightTitle?: string;
  backdropFill?: string;
  backdropAlpha?: number;
  panelFill?: string;
  panelFillAlpha?: number;
  panelStroke?: string;
  panelStrokeAlpha?: number;
  slotFill?: string;
  slotStroke?: string;
  hoverStroke?: string;
  renderLayer?: string;
  zIndex?: number;
}

interface RpceInventoryTransferMappedSlot {
  storage: RpceInventoryStorage;
  localSlotIndex: number;
}

const DEFAULT_SPACER_COLUMNS = 0;
const DEFAULT_SECTION_GAP_PX = 3;
const DEFAULT_SLOT_SIZE = 106;
const DEFAULT_GAP = 8;
const DEFAULT_PADDING = 10;
const DEFAULT_HEADER_HEIGHT = 32;

export class RpceInventoryTransferSession {
  readonly menuId: string;
  readonly leftStorageId: string;
  readonly rightStorageId: string;

  private readonly leftStorage: RpceInventoryStorage;
  private readonly rightStorage: RpceInventoryStorage;
  private readonly spacerColumns: number;
  private readonly sectionGapPx: number;
  private readonly slotSize: number;
  private readonly gap: number;
  private readonly padding: number;
  private readonly leftTitle?: string;
  private readonly rightTitle?: string;
  private readonly backdropFill: string;
  private readonly backdropAlpha: number;
  private readonly panelFill: string;
  private readonly panelFillAlpha: number;
  private readonly panelStroke: string;
  private readonly panelStrokeAlpha: number;
  private readonly slotFill?: string;
  private readonly slotStroke?: string;
  private readonly hoverStroke?: string;
  private readonly renderLayer: string;
  private readonly zIndex: number;

  constructor(options: RpceInventoryTransferSessionOptions) {
    this.menuId = options.menuId;
    this.leftStorage = options.leftStorage;
    this.rightStorage = options.rightStorage;
    this.leftStorageId = options.leftStorage.id;
    this.rightStorageId = options.rightStorage.id;
    this.spacerColumns = Math.max(0, Math.floor(options.spacerColumns ?? DEFAULT_SPACER_COLUMNS));
    this.sectionGapPx = Math.max(0, Math.floor(options.sectionGapPx ?? DEFAULT_SECTION_GAP_PX));
    this.slotSize = Math.max(24, Math.floor(options.slotSize ?? DEFAULT_SLOT_SIZE));
    this.gap = Math.max(0, Math.floor(options.gap ?? DEFAULT_GAP));
    this.padding = Math.max(0, Math.floor(options.padding ?? DEFAULT_PADDING));
    this.leftTitle = options.leftTitle;
    this.rightTitle = options.rightTitle;
    this.backdropFill = options.backdropFill ?? '#000000';
    this.backdropAlpha = options.backdropAlpha ?? 0.32;
    this.panelFill = options.panelFill ?? '#10170f';
    this.panelFillAlpha = options.panelFillAlpha ?? 0;
    this.panelStroke = options.panelStroke ?? '#d7e6c5';
    this.panelStrokeAlpha = options.panelStrokeAlpha ?? 0;
    this.slotFill = options.slotFill;
    this.slotStroke = options.slotStroke;
    this.hoverStroke = options.hoverStroke;
    this.renderLayer = options.renderLayer ?? 'ui';
    this.zIndex = options.zIndex ?? 120;
  }

  matchesDefinition(definitionId: string): boolean {
    return definitionId === this.menuId;
  }

  isActivationValid(activation: RoccoGridMenuActivation): boolean {
    if (!this.matchesDefinition(activation.definitionId)) {
      return false;
    }

    if (activation.interaction === 'place' || activation.interaction === 'swap') {
      return this.isPlacementAllowed(activation.itemId, activation.toSlotIndex);
    }

    if (activation.interaction === 'carry') {
      return this.canCommitMenuItems(activation.items);
    }

    return true;
  }

  commitMenuItems(items: readonly RoccoGridMenuItem[]): boolean {
    const committed = this.buildCommittedStorageItems(items);
    if (!committed) {
      return false;
    }

    try {
      this.leftStorage.replaceItems(committed.leftItems);
      this.rightStorage.replaceItems(committed.rightItems);
      return true;
    } catch {
      return false;
    }
  }

  createGridMenuDefinition(): RoccoGridMenuDefinition {
    const headerHeight = this.leftTitle || this.rightTitle ? DEFAULT_HEADER_HEIGHT : 0;

    return {
      id: this.menuId,
      showTitle: false,
      columns: this.resolveTotalColumns(),
      rows: this.resolveTotalRows(),
      slotSize: this.slotSize,
      gap: this.gap,
      padding: this.padding,
      closeOnEmptyClick: true,
      headerHeight,
      columnOffsets: this.createColumnOffsets(),
      textDecorations: this.createTextDecorations(headerHeight),
      lineDecorations: this.createLineDecorations(headerHeight),
      renderLayer: this.renderLayer,
      zIndex: this.zIndex,
      reorderable: true,
      blockedSlotIndexes: this.createBlockedSlotIndexes(),
      backdropFill: this.backdropFill,
      backdropAlpha: this.backdropAlpha,
      panelFill: this.panelFill,
      panelFillAlpha: this.panelFillAlpha,
      panelStroke: this.panelStroke,
      panelStrokeAlpha: this.panelStrokeAlpha,
      slotFill: this.slotFill,
      slotStroke: this.slotStroke,
      hoverStroke: this.hoverStroke,
      items: [
        ...this.projectStorageItems(this.leftStorage, 'left'),
        ...this.projectStorageItems(this.rightStorage, 'right'),
      ],
    };
  }

  private canCommitMenuItems(items: readonly RoccoGridMenuItem[]): boolean {
    return Boolean(this.buildCommittedStorageItems(items));
  }

  private buildCommittedStorageItems(
    items: readonly RoccoGridMenuItem[],
  ): { leftItems: RpceInventoryItem[]; rightItems: RpceInventoryItem[] } | undefined {
    const currentItemsById = new Map<string, RpceInventoryItem>();
    for (const item of this.leftStorage.listItems()) {
      currentItemsById.set(item.id, item);
    }
    for (const item of this.rightStorage.listItems()) {
      currentItemsById.set(item.id, item);
    }

    if (items.length !== currentItemsById.size) {
      return undefined;
    }

    const seenIds = new Set<string>();
    const leftSlotIndexes = new Set<number>();
    const rightSlotIndexes = new Set<number>();
    const leftItems: RpceInventoryItem[] = [];
    const rightItems: RpceInventoryItem[] = [];

    for (const item of items) {
      const currentItem = currentItemsById.get(item.id);
      const mappedSlot =
        item.slotIndex === undefined ? undefined : this.resolveMappedSlot(item.slotIndex);
      if (!currentItem || !mappedSlot || !mappedSlot.storage.canStoreItem(currentItem)) {
        return undefined;
      }

      if (seenIds.has(item.id)) {
        return undefined;
      }

      seenIds.add(item.id);
      const committedItem: RpceInventoryItem = {
        ...currentItem,
        slotIndex: mappedSlot.localSlotIndex,
      };

      if (mappedSlot.storage.id === this.leftStorage.id) {
        if (leftSlotIndexes.has(mappedSlot.localSlotIndex)) {
          return undefined;
        }

        leftSlotIndexes.add(mappedSlot.localSlotIndex);
        leftItems.push(committedItem);
        continue;
      }

      if (rightSlotIndexes.has(mappedSlot.localSlotIndex)) {
        return undefined;
      }

      rightSlotIndexes.add(mappedSlot.localSlotIndex);
      rightItems.push(committedItem);
    }

    return {
      leftItems,
      rightItems,
    };
  }

  private isPlacementAllowed(itemId?: string, slotIndex?: number): boolean {
    if (!itemId || slotIndex === undefined) {
      return false;
    }

    const item = this.leftStorage.getItem(itemId) ?? this.rightStorage.getItem(itemId);
    const mappedSlot = this.resolveMappedSlot(slotIndex);
    if (!item || !mappedSlot) {
      return false;
    }

    return mappedSlot.storage.canStoreItem(item);
  }

  private projectStorageItems(
    storage: RpceInventoryStorage,
    side: 'left' | 'right',
  ): RoccoGridMenuItem[] {
    return storage.listItems().map((item, index) => ({
      id: item.id,
      imageUri: item.imageUri,
      label: item.label,
      slotIndex: this.resolveCombinedSlotIndex(side, item.slotIndex ?? index),
    }));
  }

  private resolveCombinedSlotIndex(side: 'left' | 'right', localSlotIndex: number): number {
    const storage = side === 'left' ? this.leftStorage : this.rightStorage;
    const normalizedSlotIndex = Math.max(
      0,
      Math.min(storage.slotCount - 1, Math.floor(localSlotIndex)),
    );
    const row = Math.floor(normalizedSlotIndex / storage.columns);
    const column = normalizedSlotIndex % storage.columns;
    const columnOffset = side === 'left' ? 0 : this.leftStorage.columns + this.spacerColumns;
    return row * this.resolveTotalColumns() + columnOffset + column;
  }

  private resolveMappedSlot(slotIndex: number): RpceInventoryTransferMappedSlot | undefined {
    const normalizedSlotIndex = Math.max(
      0,
      Math.min(this.resolveTotalSlotCount() - 1, Math.floor(slotIndex)),
    );
    const totalColumns = this.resolveTotalColumns();
    const row = Math.floor(normalizedSlotIndex / totalColumns);
    const column = normalizedSlotIndex % totalColumns;

    if (row < this.leftStorage.rows && column < this.leftStorage.columns) {
      return {
        storage: this.leftStorage,
        localSlotIndex: row * this.leftStorage.columns + column,
      };
    }

    const rightStartColumn = this.leftStorage.columns + this.spacerColumns;
    const rightColumn = column - rightStartColumn;
    if (
      row < this.rightStorage.rows &&
      rightColumn >= 0 &&
      rightColumn < this.rightStorage.columns
    ) {
      return {
        storage: this.rightStorage,
        localSlotIndex: row * this.rightStorage.columns + rightColumn,
      };
    }

    return undefined;
  }

  private createBlockedSlotIndexes(): number[] {
    const blockedSlotIndexes: number[] = [];
    const totalColumns = this.resolveTotalColumns();
    const totalRows = this.resolveTotalRows();
    const rightStartColumn = this.leftStorage.columns + this.spacerColumns;

    for (let row = 0; row < totalRows; row += 1) {
      for (let column = 0; column < totalColumns; column += 1) {
        const isInLeftStorage = row < this.leftStorage.rows && column < this.leftStorage.columns;
        const isInRightStorage =
          row < this.rightStorage.rows &&
          column >= rightStartColumn &&
          column < rightStartColumn + this.rightStorage.columns;
        if (isInLeftStorage || isInRightStorage) {
          continue;
        }

        blockedSlotIndexes.push(row * totalColumns + column);
      }
    }

    return blockedSlotIndexes;
  }

  private createColumnOffsets(): number[] {
    const totalColumns = this.resolveTotalColumns();
    const rightStartColumn = this.leftStorage.columns + this.spacerColumns;

    return Array.from({ length: totalColumns }, (_, column) =>
      column >= rightStartColumn ? this.sectionGapPx : 0,
    );
  }

  private createTextDecorations(headerHeight: number) {
    if (headerHeight <= 0) {
      return [];
    }

    const decorations = [];
    const titleY = this.padding + Math.round(headerHeight / 2);

    if (this.leftTitle) {
      decorations.push({
        id: `${this.menuId}:left-title`,
        text: this.leftTitle,
        x: this.padding + this.resolveStorageCenterX('left'),
        y: titleY,
        fontSize: 18,
      });
    }

    if (this.rightTitle) {
      decorations.push({
        id: `${this.menuId}:right-title`,
        text: this.rightTitle,
        x: this.padding + this.resolveStorageCenterX('right'),
        y: titleY,
        fontSize: 18,
      });
    }

    return decorations;
  }

  private createLineDecorations(headerHeight: number) {
    if (this.sectionGapPx <= 0) {
      return [];
    }

    const dividerX = this.padding + this.resolveDividerCenterX();
    const topY = this.padding + Math.max(4, headerHeight - 10);
    const contentHeight =
      this.resolveTotalRows() * this.slotSize +
      Math.max(0, this.resolveTotalRows() - 1) * this.gap;
    const bottomY = this.padding + headerHeight + contentHeight - 4;

    return [
      {
        id: `${this.menuId}:divider`,
        x1: dividerX,
        y1: topY,
        x2: dividerX,
        y2: bottomY,
        color: '#5b704f',
        alpha: 0.9,
        width: 2,
      },
    ];
  }

  private resolveStorageCenterX(side: 'left' | 'right'): number {
    const startColumn = side === 'left' ? 0 : this.leftStorage.columns + this.spacerColumns;
    const width = side === 'left' ? this.leftStorage.columns : this.rightStorage.columns;
    const firstLeft = this.resolveColumnLeft(startColumn);
    const lastRight = this.resolveColumnLeft(startColumn + width - 1) + this.slotSize;
    return (firstLeft + lastRight) / 2;
  }

  private resolveDividerCenterX(): number {
    const leftLastRight = this.resolveColumnLeft(this.leftStorage.columns - 1) + this.slotSize;
    const rightFirstLeft = this.resolveColumnLeft(this.leftStorage.columns + this.spacerColumns);
    return (leftLastRight + rightFirstLeft) / 2;
  }

  private resolveColumnLeft(column: number): number {
    const base = column * (this.slotSize + this.gap);
    const rightStartColumn = this.leftStorage.columns + this.spacerColumns;
    return base + (column >= rightStartColumn ? this.sectionGapPx : 0);
  }

  private resolveTotalColumns(): number {
    return this.leftStorage.columns + this.spacerColumns + this.rightStorage.columns;
  }

  private resolveTotalRows(): number {
    return Math.max(this.leftStorage.rows, this.rightStorage.rows);
  }

  private resolveTotalSlotCount(): number {
    return this.resolveTotalColumns() * this.resolveTotalRows();
  }
}
