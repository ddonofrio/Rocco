import {
  DEFAULT_BUTTON_GAP,
  DEFAULT_BUTTON_HEIGHT,
  DEFAULT_COLUMNS,
  DEFAULT_GAP,
  DEFAULT_PADDING,
  DEFAULT_ROWS,
  DEFAULT_SLOT_SIZE,
  resolveColumnOffsets,
  resolveContentWidth,
  resolveDefinitionHeaderHeight,
  resolveDefinitionTitleHeight,
  resolveSlotLeft,
} from './definition';
import type { RoccoGridMenuDefinition } from './types';

export interface RoccoGridMenuBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function resolveGridMenuPanelBounds(definition: RoccoGridMenuDefinition): RoccoGridMenuBounds {
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
  const buttonSectionHeight = definition.buttons?.length ? buttonGap + buttonHeight : 0;
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

export function resolveGridMenuButtonBounds(
  definition: RoccoGridMenuDefinition,
  buttonIndex: number,
): RoccoGridMenuBounds {
  const panel = resolveGridMenuPanelBounds(definition);
  const padding = definition.padding ?? DEFAULT_PADDING;
  const buttonGap = definition.buttonGap ?? DEFAULT_BUTTON_GAP;
  const buttonHeight = definition.buttonHeight ?? DEFAULT_BUTTON_HEIGHT;
  const buttonCount = Math.max(1, definition.buttons?.length ?? 0);
  const innerWidth = panel.width - padding * 2;
  const totalGapWidth = Math.max(0, buttonCount - 1) * buttonGap;
  const buttonWidth = Math.max(44, (innerWidth - totalGapWidth) / buttonCount);
  const slotSectionHeight =
    (definition.rows ?? DEFAULT_ROWS) * (definition.slotHeight ?? definition.slotSize ?? DEFAULT_SLOT_SIZE) +
    Math.max(0, (definition.rows ?? DEFAULT_ROWS) - 1) * (definition.gap ?? DEFAULT_GAP);
  const titleHeight = resolveDefinitionTitleHeight(definition);
  const headerHeight = resolveDefinitionHeaderHeight(definition);

  return {
    x: panel.x + padding + buttonIndex * (buttonWidth + buttonGap),
    y: panel.y + padding + headerHeight + titleHeight + slotSectionHeight + buttonGap,
    width: buttonWidth,
    height: buttonHeight,
  };
}

export function resolveGridMenuSlotBounds(
  definition: RoccoGridMenuDefinition,
  slotIndex: number,
): RoccoGridMenuBounds {
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
