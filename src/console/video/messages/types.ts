import type { RoccoPoint, RoccoRenderableSprite } from '../sprites';

export type RoccoSpriteMessageMode = 'say' | 'think';
export type RoccoSpriteMessageSide = 'auto' | 'left' | 'right' | 'above';
export type RoccoSpriteMessageText = string | string[];

export interface RoccoSpriteMessageStyle {
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
  bubbleFill?: string;
  bubbleStroke?: string;
  bubbleStrokeWidth?: number;
  showThoughtTrail?: boolean;
}

export interface RoccoSpriteMessageRequest {
  id?: string;
  spriteInstanceId: string;
  mode: RoccoSpriteMessageMode;
  text: RoccoSpriteMessageText;
  background?: boolean;
  ttlMs?: number;
  side?: RoccoSpriteMessageSide;
  offset?: RoccoPoint;
  renderLayer?: string;
  zIndex?: number;
  maxWidth?: number;
  style?: Partial<RoccoSpriteMessageStyle>;
}

export type RoccoSpriteMessageOptions = Omit<
  RoccoSpriteMessageRequest,
  'spriteInstanceId' | 'mode' | 'text'
>;

export interface RoccoSpriteMessageState {
  id: string;
  spriteInstanceId: string;
  mode: RoccoSpriteMessageMode;
  text: string;
  lines: string[];
  lineIndex: number;
  background: boolean;
  durationMs: number;
  ttlMs: number;
  side: RoccoSpriteMessageSide;
  offset: RoccoPoint;
  renderLayer: string;
  zIndex: number;
  maxWidth: number;
  style?: Partial<RoccoSpriteMessageStyle>;
}

export interface RoccoSpriteMessageRenderable {
  message: RoccoSpriteMessageState;
  sprite: RoccoRenderableSprite;
  designWidth: number;
  designHeight: number;
}

export interface RoccoSpriteMessageSystem {
  showMessage(message: RoccoSpriteMessageRequest): void;
  say(spriteInstanceId: string, text: RoccoSpriteMessageText, options?: RoccoSpriteMessageOptions): void;
  think(spriteInstanceId: string, text: RoccoSpriteMessageText, options?: RoccoSpriteMessageOptions): void;
  removeMessage(messageId: string): void;
  clearMessages(): void;
  listMessages(): RoccoSpriteMessageState[];
  listRenderableMessages(
    sprites: RoccoRenderableSprite[],
    designSize: { width: number; height: number },
  ): RoccoSpriteMessageRenderable[];
  update(deltaMs: number): void;
}
