export interface RoccoActionMenuItem {
  id: string;
  actionId: string;
  imageUri: string;
  label?: string;
}

export interface RoccoActionMenuDefinition {
  id: string;
  targetInstanceIds?: string[];
  targetDefinitionIds?: string[];
  items: RoccoActionMenuItem[];
  renderLayer?: string;
  orbitRadius?: number;
  orbitSpeedRadiansPerSecond?: number;
  itemSize?: number;
  hoverScale?: number;
  circleFill?: string;
  circleStroke?: string;
  circleStrokeWidth?: number;
}

export interface RoccoActionMenuState {
  definitionId: string;
  targetInstanceId: string;
  targetDefinitionId: string;
  x: number;
  y: number;
  elapsedMs: number;
  hoveredItemId?: string;
}

export interface RoccoActionMenuActivation {
  definitionId: string;
  targetInstanceId: string;
  targetDefinitionId: string;
  itemId: string;
  actionId: string;
}

export interface RoccoActionMenuRenderable {
  definition: RoccoActionMenuDefinition;
  state: RoccoActionMenuState;
}

export interface RoccoActionMenuSystem {
  registerMenu(definition: RoccoActionMenuDefinition): void;
  unregisterMenu(definitionId: string): void;
  listMenus(): RoccoActionMenuDefinition[];
  openMenuForTarget(targetInstanceId: string, targetDefinitionId: string, x: number, y: number): boolean;
  closeMenu(): void;
  isOpen(): boolean;
  setHoverAt(x: number, y: number): boolean;
  getHoveredItem(): RoccoActionMenuItem | undefined;
  activateAt(x: number, y: number): RoccoActionMenuActivation | undefined;
  getRenderableMenu(): RoccoActionMenuRenderable | undefined;
  update(deltaMs: number): void;
}
