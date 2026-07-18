export interface RoccoPrimitiveBase {
  id: string;
  renderLayer: string;
  zIndex: number;
  color: string;
  alpha: number;
  visible: boolean;
}

export interface RoccoPointPrimitive extends RoccoPrimitiveBase {
  kind: 'point';
  x: number;
  y: number;
  size: number;
}

export interface RoccoLinePrimitive extends RoccoPrimitiveBase {
  kind: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth: number;
}

export interface RoccoRectPrimitive extends RoccoPrimitiveBase {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeWidth?: number;
  fill?: boolean;
}

export interface RoccoCirclePrimitive extends RoccoPrimitiveBase {
  kind: 'circle';
  x: number;
  y: number;
  radius: number;
  strokeWidth?: number;
  fill?: boolean;
}

export interface RoccoPolygonPrimitive extends RoccoPrimitiveBase {
  kind: 'polygon';
  points: { x: number; y: number }[];
  strokeWidth?: number;
  fill?: boolean;
}

export type RoccoPrimitive =
  | RoccoPointPrimitive
  | RoccoLinePrimitive
  | RoccoRectPrimitive
  | RoccoCirclePrimitive
  | RoccoPolygonPrimitive;

export interface RoccoPrimitiveSystem {
  addPrimitive(primitive: RoccoPrimitive): void;
  removePrimitive(id: string): void;
  clearPrimitives(): void;
  getPrimitive(id: string): RoccoPrimitive | undefined;
  listPrimitives(): RoccoPrimitive[];
}
