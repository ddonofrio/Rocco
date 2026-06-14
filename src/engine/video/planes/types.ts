export type RoccoColor = string;

export type RoccoPixelFormat =
  | 'native'
  | 'indexed1'
  | 'indexed2'
  | 'indexed4'
  | 'indexed8'
  | 'rgba';

export interface RoccoPlaneTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation?: number;
}

export interface RoccoPlaneScroll {
  x: number;
  y: number;
}

export interface RoccoPlaneWrap {
  x: boolean;
  y: boolean;
}

export interface RoccoPlaneParallax {
  x: number;
  y: number;
}

export interface RoccoRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoccoTileCell {
  tileId: string;
  paletteId?: string;
  flipX?: boolean;
  flipY?: boolean;
  rotate?: 0 | 90 | 180 | 270;
  priority?: number;
  attributes?: Record<string, unknown>;
}

export interface RoccoAttributeEntry {
  paletteId?: string;
  colorRegisterSetId?: string;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export interface RoccoAttributeMap {
  id: string;
  width: number;
  height: number;
  blockWidth: number;
  blockHeight: number;
  entries: RoccoAttributeEntry[];
}

export interface RoccoPalette {
  id: string;
  colors: RoccoColor[];
  transparentIndex?: number;
}

export interface RoccoColorRegisterSet {
  id: string;
  colors: Record<string, RoccoColor>;
}

export type RoccoPlaneSourceKind =
  | 'solid'
  | 'image'
  | 'bitmap'
  | 'tileset'
  | 'tilemap'
  | 'procedural';

export interface RoccoSolidSource {
  kind: 'solid';
  color: RoccoColor;
}

export interface RoccoImageSource {
  kind: 'image';
  uri: string;
  width?: number;
  height?: number;
}

export interface RoccoBitmapSource {
  /**
   * Reserved for future renderer support.
   * The current Pixi runtime does not render bitmap sources directly.
   */
  kind: 'bitmap';
  bitmapId: string;
  width: number;
  height: number;
  format: RoccoPixelFormat;
  dataRef?: string;
}

export interface RoccoTilesetSource {
  /**
   * Reserved for future renderer support.
   * The current Pixi runtime does not render tileset sources directly.
   */
  kind: 'tileset';
  tilesetId: string;
  imageUri: string;
  tileWidth: number;
  tileHeight: number;
  spacing?: number;
  margin?: number;
}

export interface RoccoTilemapSource {
  kind: 'tilemap';
  tilemapId: string;
  tilesetId: string;
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  cells: RoccoTileCell[];
  attributeMapId?: string;
}

export interface RoccoProceduralSource {
  kind: 'procedural';
  generatorId: string;
  params?: Record<string, unknown>;
}

export type RoccoPlaneSource =
  | RoccoSolidSource
  | RoccoImageSource
  | RoccoBitmapSource
  | RoccoTilesetSource
  | RoccoTilemapSource
  | RoccoProceduralSource;

export interface RoccoNativeColorModel {
  kind: 'native';
}

export interface RoccoIndexedColorModel {
  kind: 'indexed';
  paletteId: string;
}

export interface RoccoPaletteRemapColorModel {
  kind: 'palette-remap';
  fromPaletteId?: string;
  toPaletteId: string;
}

export interface RoccoColorRegistersModel {
  kind: 'color-registers';
  registerSetId: string;
}

export interface RoccoTintColorModel {
  kind: 'tint';
  color: RoccoColor;
  strength: number;
}

export type RoccoColorModel =
  | RoccoNativeColorModel
  | RoccoIndexedColorModel
  | RoccoPaletteRemapColorModel
  | RoccoColorRegistersModel
  | RoccoTintColorModel;

export interface RoccoGraphicPlane {
  id: string;
  name?: string;
  enabled: boolean;

  source: RoccoPlaneSource;
  colorModel: RoccoColorModel;

  transform: RoccoPlaneTransform;
  scroll: RoccoPlaneScroll;
  wrap: RoccoPlaneWrap;
  parallax?: RoccoPlaneParallax;
  viewport?: RoccoRect;

  opacity: number;
  priority: number;
  renderLayer?: string;
  visible: boolean;

  metadata?: Record<string, unknown>;
}

export interface RoccoPlaneScene {
  id: string;
  planes: RoccoGraphicPlane[];

  palettes?: RoccoPalette[];
  colorRegisterSets?: RoccoColorRegisterSet[];
  attributeMaps?: RoccoAttributeMap[];

  clearColor?: RoccoColor;
}

export interface RoccoPlaneSceneRecord {
  id: string;
  scene: RoccoPlaneScene;
  updatedAt: number;
}

export interface RoccoPlaneSDK {
  createScene(id: string): RoccoPlaneScene;
  loadScene(scene: RoccoPlaneScene): void;
  serializeScene(sceneId: string): RoccoPlaneScene;

  addPlane(sceneId: string, plane: RoccoGraphicPlane): void;
  updatePlane(sceneId: string, planeId: string, patch: Partial<RoccoGraphicPlane>): void;
  removePlane(sceneId: string, planeId: string): void;

  setPlaneSource(sceneId: string, planeId: string, source: RoccoPlaneSource): void;
  setPlaneColorModel(sceneId: string, planeId: string, colorModel: RoccoColorModel): void;

  setTile(sceneId: string, tilemapId: string, x: number, y: number, cell: RoccoTileCell): void;
  getTile(sceneId: string, tilemapId: string, x: number, y: number): RoccoTileCell | undefined;

  registerPalette(sceneId: string, palette: RoccoPalette): void;
  updatePalette(sceneId: string, paletteId: string, colors: RoccoColor[]): void;

  registerColorRegisterSet(sceneId: string, registerSet: RoccoColorRegisterSet): void;
  updateColorRegister(sceneId: string, registerSetId: string, key: string, color: RoccoColor): void;

  registerAttributeMap(sceneId: string, attributeMap: RoccoAttributeMap): void;
  setAttribute(
    sceneId: string,
    attributeMapId: string,
    x: number,
    y: number,
    entry: RoccoAttributeEntry,
  ): void;
}
