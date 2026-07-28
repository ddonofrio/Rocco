export interface RoccoGridMenuItem {
  id: string;
  imageUri?: string;
  label?: string;
  slotIndex?: number;
  enabled?: boolean;
}

export interface RoccoGridMenuButton {
  id: string;
  label: string;
  enabled?: boolean;
  requiresCarriedItem?: boolean;
}

export interface RoccoGridMenuTextDecoration {
  id: string;
  text: string;
  x: number;
  y: number;
  anchor?: {
    x: number;
    y: number;
  };
  align?: 'left' | 'center' | 'right';
  fill?: string;
  alpha?: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter';
  letterSpacing?: number;
}

export interface RoccoGridMenuLineDecoration {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  alpha?: number;
  width?: number;
}

export interface RoccoGridMenuRectDecoration {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  fillAlpha?: number;
}

export type RoccoGridMenuLayout = 'grid' | 'text-list';

export interface RoccoGridMenuDefinition {
  id: string;
  title?: string;
  showTitle?: boolean;
  items: RoccoGridMenuItem[];
  buttons?: RoccoGridMenuButton[];
  blockedSlotIndexes?: number[];
  layout?: RoccoGridMenuLayout;
  columns?: number;
  rows?: number;
  x?: number;
  y?: number;
  slotSize?: number;
  slotWidth?: number;
  slotHeight?: number;
  gap?: number;
  padding?: number;
  headerHeight?: number;
  buttonHeight?: number;
  buttonGap?: number;
  columnOffsets?: number[];
  textDecorations?: RoccoGridMenuTextDecoration[];
  lineDecorations?: RoccoGridMenuLineDecoration[];
  rectDecorations?: RoccoGridMenuRectDecoration[];
  renderLayer?: string;
  zIndex?: number;
  closeOnActivate?: boolean;
  closeOnEmptyClick?: boolean;
  closeOnPointerLeave?: boolean;
  reorderable?: boolean;
  backdropFill?: string;
  backdropAlpha?: number;
  panelFill?: string;
  panelFillAlpha?: number;
  panelStroke?: string;
  panelStrokeAlpha?: number;
  slotFill?: string;
  slotStroke?: string;
  hoverStroke?: string;
}

export interface RoccoGridMenuState {
  definitionId: string;
  hoveredItemId?: string;
  hoveredSlotIndex?: number;
  hoveredButtonId?: string;
  carriedItem?: RoccoGridMenuItem;
}

export interface RoccoGridMenuRenderable {
  definition: RoccoGridMenuDefinition;
  state: RoccoGridMenuState;
}

export type RoccoGridMenuInteraction =
  | 'activate'
  | 'pick'
  | 'place'
  | 'swap'
  | 'carry'
  | 'close'
  | 'button';

export interface RoccoGridMenuActivation {
  kind: 'grid-menu';
  definitionId: string;
  interaction: RoccoGridMenuInteraction;
  itemId?: string;
  buttonId?: string;
  slotIndex?: number;
  fromSlotIndex?: number;
  toSlotIndex?: number;
  carriedItem?: RoccoGridMenuItem;
  replacedItem?: RoccoGridMenuItem;
  items: RoccoGridMenuItem[];
}

export interface RoccoGridMenuCarriedItem {
  definitionId: string;
  item: RoccoGridMenuItem;
}

export interface RoccoGridMenuSystem {
  openMenu(definition: RoccoGridMenuDefinition): void;
  toggleMenu(definition: RoccoGridMenuDefinition): void;
  closeMenu(): void;
  isOpen(definitionId?: string): boolean;
  setHoverAt(x: number, y: number): boolean;
  getHoveredItem(): RoccoGridMenuItem | undefined;
  activateAt(x: number, y: number): RoccoGridMenuActivation | undefined;
  getCarriedItem(): RoccoGridMenuCarriedItem | undefined;
  clearCarriedItem(): void;
  getRenderableMenu(): RoccoGridMenuRenderable | undefined;
}
