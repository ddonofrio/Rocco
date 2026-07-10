export interface RpceInventoryGroundSpriteDefinition {
  imageUri: string;
  width: number;
  height: number;
  scaleRelativeToRoccoBase: number;
  renderLayer?: string;
  zIndex?: number;
  clickTargetPadding?: {
    x: number;
    y: number;
  };
  pickable: boolean;
}

export interface RpceInventoryItem {
  id: string;
  label: string;
  imageUri: string;
  slotIndex?: number;
  allowedStorageIds?: readonly string[];
  groundSprite?: RpceInventoryGroundSpriteDefinition;
}
