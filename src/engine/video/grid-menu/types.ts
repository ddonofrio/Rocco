export interface RoccoGridMenuItem {
  id: string;
  imageUri?: string;
  label?: string;
  slotIndex?: number;
  enabled?: boolean;
}

export interface RoccoGridMenuDefinition {
  id: string;
  title?: string;
  items: RoccoGridMenuItem[];
  columns?: number;
  rows?: number;
  x?: number;
  y?: number;
  slotSize?: number;
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

export interface RoccoGridMenuItemUseActivation {
  kind: 'grid-menu-item-use';
  definitionId: string;
  itemId: string;
  item: RoccoGridMenuItem;
  targetInstanceId: string;
  targetDefinitionId: string;
}

export interface RoccoGridMenuSystem {
  openMenu(definition: RoccoGridMenuDefinition): void;
  toggleMenu(definition: RoccoGridMenuDefinition): void;
  closeMenu(): void;
  isOpen(definitionId?: string): boolean;
  setHoverAt(x: number, y: number): boolean;
  getHoveredItem(): RoccoGridMenuItem | undefined;
  activateAt(x: number, y: number): RoccoGridMenuActivation | undefined;
  getCarriedItem(): RoccoGridMenuItem | undefined;
  clearCarriedItem(): void;
  useCarriedItemOnTarget(
    targetInstanceId: string,
    targetDefinitionId: string,
  ): RoccoGridMenuItemUseActivation | undefined;
  getRenderableMenu(): RoccoGridMenuRenderable | undefined;
}
