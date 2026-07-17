import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

import type {
  RoccoGridMenuDefinition,
  RoccoGridMenuItem,
  RoccoGridMenuRenderable,
} from './types';

export interface GridMenuSlotNode {
  root: Container;
  frame: Graphics;
  icon: Sprite;
  label: Text;
  imageUri: string;
}

interface GridMenuPanelSlotsOptions {
  panelRoot: Container;
  renderable: RoccoGridMenuRenderable;
  columns: number;
  columnOffsets: readonly number[];
  slotCount: number;
  padding: number;
  headerHeight: number;
  titleHeight: number;
  slotWidth: number;
  slotHeight: number;
  gap: number;
  layout: string;
  slotNodes: Map<number, GridMenuSlotNode>;
  ensureSlotNode: (panelRoot: Container, slotIndex: number) => GridMenuSlotNode;
  resolveTexture: (imageUri: string) => Texture;
}

function resolveSlotFillAlpha(
  item: RoccoGridMenuItem | undefined,
  isHovered: boolean,
  hasCarriedItem: boolean,
): number {
  if (item) {
    return 0.95;
  }

  if (isHovered && hasCarriedItem) {
    return 0.78;
  }

  return 0.55;
}

function applyGridMenuSlotLabel(
  label: Text,
  isTextList: boolean,
  slotWidth: number,
  slotHeight: number,
): void {
  if (isTextList) {
    label.anchor.set(0, 0.5);
    label.x = 16;
    label.y = slotHeight / 2;
    label.style.align = 'left';
    label.style.fontSize = 18;
    label.style.wordWrap = true;
    label.style.wordWrapWidth = Math.max(80, slotWidth - 32);
    return;
  }

  label.anchor.set(0.5, 0);
  label.x = slotWidth / 2;
  label.y = slotHeight - 17;
  label.style.align = 'center';
  label.style.fontSize = 10;
  label.style.wordWrap = false;
  label.style.wordWrapWidth = 0;
}

export function applyGridMenuPanelSlots(options: GridMenuPanelSlotsOptions): void {
  const { renderable, slotNodes } = options;
  const itemsBySlot = new Map<number, RoccoGridMenuItem>();
  for (const [index, item] of renderable.definition.items.entries()) {
    const slotIndex = Math.max(0, Math.floor(item.slotIndex ?? index));
    itemsBySlot.set(slotIndex, item);
  }

  const blockedSlotIndexes = new Set(renderable.definition.blockedSlotIndexes);
  const staleSlots = new Set(slotNodes.keys());
  for (let slotIndex = 0; slotIndex < options.slotCount; slotIndex += 1) {
    if (blockedSlotIndexes.has(slotIndex)) {
      continue;
    }

    const node = options.ensureSlotNode(options.panelRoot, slotIndex);
    const item = itemsBySlot.get(slotIndex);
    const column = slotIndex % options.columns;
    const row = Math.floor(slotIndex / options.columns);
    const x =
      options.padding +
      column * (options.slotWidth + options.gap) +
      (options.columnOffsets[column] ?? 0);
    const y =
      options.padding +
      options.headerHeight +
      options.titleHeight +
      row * (options.slotHeight + options.gap);
    applyGridMenuSlotNode(
      node,
      renderable,
      item,
      slotIndex,
      x,
      y,
      options.slotWidth,
      options.slotHeight,
      options.layout,
      options.resolveTexture,
    );
    staleSlots.delete(slotIndex);
  }

  for (const staleSlot of staleSlots) {
    const node = slotNodes.get(staleSlot);
    node?.root.removeFromParent();
    node?.root.destroy({ children: true });
    slotNodes.delete(staleSlot);
  }
}

export function applyGridMenuSlotNode(
  node: GridMenuSlotNode,
  renderable: RoccoGridMenuRenderable,
  item: RoccoGridMenuItem | undefined,
  slotIndex: number,
  x: number,
  y: number,
  slotWidth: number,
  slotHeight: number,
  layout: string,
  resolveTexture: (imageUri: string) => Texture,
): void {
  const definition: RoccoGridMenuDefinition = renderable.definition;
  const isHovered = renderable.state.hoveredSlotIndex === slotIndex;
  const hasCarriedItem = Boolean(renderable.state.carriedItem);
  const isTextList = layout === 'text-list';
  const slotFillAlpha = resolveSlotFillAlpha(item, isHovered, hasCarriedItem);
  node.root.position.set(x, y);

  node.frame.clear();
  node.frame
    .roundRect(0, 0, slotWidth, slotHeight, 6)
    .fill(Object.assign({}, {
      color: definition.slotFill ?? '#182317',
      alpha: slotFillAlpha,
    }))
    .stroke({
      color: isHovered ? definition.hoverStroke ?? '#8ecf6e' : definition.slotStroke ?? '#5b704f',
      width: isHovered ? 3 : 1,
      alpha: isHovered ? 1 : 0.82,
    });

  node.icon.visible = Boolean(item?.imageUri) && !isTextList;
  if (item?.imageUri && !isTextList) {
    node.icon.texture = resolveTexture(item.imageUri);
    node.imageUri = item.imageUri;
    const iconSize = Math.round(Math.min(slotWidth, slotHeight) * 0.72);
    node.icon.position.set(slotWidth / 2, slotHeight / 2 - 4);
    node.icon.width = iconSize;
    node.icon.height = iconSize;
    node.icon.alpha = item.enabled === false ? 0.45 : 1;
  } else {
    node.imageUri = '';
  }

  node.label.text = item?.label ?? '';
  node.label.visible = Boolean(item?.label);
  node.label.alpha = item?.enabled === false ? 0.5 : 1;
  applyGridMenuSlotLabel(node.label, isTextList, slotWidth, slotHeight);
}
