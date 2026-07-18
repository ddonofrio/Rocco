import type { RoccoGridMenuDefinition } from './types';

export const DESIGN_WIDTH = 960;
export const DESIGN_HEIGHT = 540;
export const DEFAULT_COLUMNS = 3;
export const DEFAULT_ROWS = 3;
export const DEFAULT_SLOT_SIZE = 72;
export const DEFAULT_GAP = 10;
export const DEFAULT_PADDING = 18;
export const DEFAULT_BUTTON_HEIGHT = 40;
export const DEFAULT_BUTTON_GAP = 14;

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function resolveDefinitionTitleHeight(definition: RoccoGridMenuDefinition): number {
  return definition.title && definition.showTitle !== false ? 34 : 0;
}

export function resolveDefinitionHeaderHeight(definition: RoccoGridMenuDefinition): number {
  return Math.max(0, definition.headerHeight ?? 0);
}

export function resolveColumnOffsets(
  columns: number,
  columnOffsets: readonly number[] | undefined,
): number[] {
  return Array.from({ length: columns }, (_, index) => {
    const offset = columnOffsets?.[index];
    return Number.isFinite(offset) ? Number(offset) : 0;
  });
}

export function resolveSlotLeft(
  column: number,
  slotWidth: number,
  gap: number,
  columnOffsets: readonly number[],
): number {
  return column * (slotWidth + gap) + (columnOffsets[column] ?? 0);
}

export function resolveContentWidth(
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

interface NormalizedDefinitionMetrics {
  columns: number;
  rows: number;
  slotCount: number;
  slotWidth: number;
  slotHeight: number;
  gap: number;
  padding: number;
  headerHeight: number;
  buttonHeight: number;
  buttonGap: number;
  columnOffsets: number[];
  width: number;
  titleHeight: number;
  buttonSectionHeight: number;
  height: number;
}

function resolveNormalizedDefinitionMetrics(
  definition: RoccoGridMenuDefinition,
): NormalizedDefinitionMetrics {
  const columns = Math.max(1, Math.floor(definition.columns ?? DEFAULT_COLUMNS));
  const rows = Math.max(1, Math.floor(definition.rows ?? DEFAULT_ROWS));
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
  const buttonSectionHeight = definition.buttons?.length ? buttonGap + buttonHeight : 0;
  const height =
    rows * slotHeight +
    (rows - 1) * gap +
    padding * 2 +
    headerHeight +
    titleHeight +
    buttonSectionHeight;

  return {
    columns,
    rows,
    slotCount: columns * rows,
    slotWidth,
    slotHeight,
    gap,
    padding,
    headerHeight,
    buttonHeight,
    buttonGap,
    columnOffsets,
    width,
    titleHeight,
    buttonSectionHeight,
    height,
  };
}

export function normalizeDefinition(definition: RoccoGridMenuDefinition): RoccoGridMenuDefinition {
  const metrics = resolveNormalizedDefinitionMetrics(definition);

  return {
    ...clone(definition),
    layout: definition.layout ?? 'grid',
    showTitle: definition.showTitle ?? true,
    columns: metrics.columns,
    rows: metrics.rows,
    slotSize: definition.slotSize ?? DEFAULT_SLOT_SIZE,
    slotWidth: metrics.slotWidth,
    slotHeight: metrics.slotHeight,
    gap: metrics.gap,
    padding: metrics.padding,
    headerHeight: metrics.headerHeight,
    buttonHeight: metrics.buttonHeight,
    buttonGap: metrics.buttonGap,
    columnOffsets: metrics.columnOffsets,
    x: definition.x ?? Math.round((DESIGN_WIDTH - metrics.width) / 2),
    y: definition.y ?? Math.round((DESIGN_HEIGHT - metrics.height) / 2),
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
          .map((slotIndex) => Math.max(0, Math.min(metrics.slotCount - 1, Math.floor(slotIndex)))),
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
