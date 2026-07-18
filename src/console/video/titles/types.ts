import type { RoccoPoint } from '../sprites';

export interface RoccoTitleStyle {
  fill?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?:
    | 'normal'
    | 'bold'
    | 'bolder'
    | 'lighter'
    | '100'
    | '200'
    | '300'
    | '400'
    | '500'
    | '600'
    | '700'
    | '800'
    | '900';
  align?: 'left' | 'center' | 'right';
  stroke?:
    | string
    | {
        color: string | number;
        width: number;
        alpha?: number;
        alignment?: number;
      };
}

export interface RoccoTitleMessage {
  id: string;
  text: string;
  renderLayer: string;
  zIndex: number;
  x: number;
  y: number;
  anchor?: RoccoPoint;
  style?: RoccoTitleStyle;
  visible: boolean;
  ttlMs?: number;
}

export interface RoccoTitleSystem {
  addTitle(message: RoccoTitleMessage): void;
  removeTitle(id: string): void;
  clearTitles(): void;
  getTitle(id: string): RoccoTitleMessage | undefined;
  listTitles(): RoccoTitleMessage[];
  update(deltaMs: number): void;
}
