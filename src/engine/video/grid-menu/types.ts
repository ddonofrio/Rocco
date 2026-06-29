export interface RoccoGridMenuItem {
  id: string;
  imageUri?: string;
  label?: string;
  slotIndex?: number;
  enabled?: boolean;
}

export type RoccoGridMenuLayout = 'grid' | 'text-list';

export interface RoccoGridMenuDefinition {
  id: string;
  title?: string;
  items: RoccoGridMenuItem[];
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
  renderLayer?: string;
  zIndex?: number;
  closeOnActivate?: boolean;
  reorderable?: boolean;
  panelFill?: string;
  panelStroke?: string;
  slotFill?: string;
  slotStroke?: string;
  hoverStroke?: string;
}

export interface RoccoGridMenuState {
  definitionId: string;
  hoveredItemId?: string;
  hoveredSlotIndex?: number;
  carriedItem?: RoccoGridMenuItem;
}

export interface RoccoGridMenuRenderable {
  definition: RoccoGridMenuDefinition;
  state: RoccoGridMenuState;
}

export type RoccoGridMenuInteraction = 'activate' | 'pick' | 'place' | 'swap' | 'carry';

export interface RoccoGridMenuActivation {
  kind: 'grid-menu';
  definitionId: string;
  interaction: RoccoGridMenuInteraction;
  itemId?: string;
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
