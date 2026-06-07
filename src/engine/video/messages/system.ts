import type {
  RoccoSpriteMessageOptions,
  RoccoSpriteMessageRenderable,
  RoccoSpriteMessageRequest,
  RoccoSpriteMessageState,
  RoccoSpriteMessageSystem,
  RoccoSpriteMessageText,
} from './types';
import type { RoccoRenderableSprite } from '../sprites';

const DEFAULT_MESSAGE_TTL_MS = 2400;
const DEFAULT_MESSAGE_MAX_WIDTH = 250;
const DEFAULT_MESSAGE_RENDER_LAYER = 'overlay.messages';
const DEFAULT_MESSAGE_Z_INDEX = 0;

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeMessage(message: RoccoSpriteMessageRequest, lines: string[]): RoccoSpriteMessageState {
  if (!message.spriteInstanceId) {
    throw new Error('Sprite message requires a sprite instance id.');
  }
  if (lines.length === 0) {
    throw new Error('Sprite message text cannot be empty.');
  }

  const durationMs = Math.max(1, message.ttlMs ?? DEFAULT_MESSAGE_TTL_MS);
  return {
    id: message.id ?? `${message.spriteInstanceId}:active-message`,
    spriteInstanceId: message.spriteInstanceId,
    mode: message.mode,
    text: lines[0],
    lines,
    lineIndex: 0,
    durationMs,
    ttlMs: durationMs,
    side: message.side ?? 'auto',
    offset: message.offset ?? { x: 0, y: 0 },
    renderLayer: message.renderLayer ?? DEFAULT_MESSAGE_RENDER_LAYER,
    zIndex: message.zIndex ?? DEFAULT_MESSAGE_Z_INDEX,
    maxWidth: message.maxWidth ?? DEFAULT_MESSAGE_MAX_WIDTH,
    style: message.style ? clone(message.style) : undefined,
  };
}

function normalizeLines(text: RoccoSpriteMessageText): string[] {
  const values = Array.isArray(text) ? text : [text];
  return values.map((line) => line.trim()).filter((line) => line.length > 0);
}

export class RoccoSpriteMessageSystemSDK implements RoccoSpriteMessageSystem {
  private readonly messages = new Map<string, RoccoSpriteMessageState>();
  private readonly lastSelectedLineByHistoryKey = new Map<string, string>();

  showMessage(message: RoccoSpriteMessageRequest): void {
    const lines = this.selectLines(normalizeLines(message.text), message.lineSelection);
    const normalized = normalizeMessage(message, lines);
    this.messages.set(normalized.id, normalized);
  }

  say(spriteInstanceId: string, text: RoccoSpriteMessageText, options?: RoccoSpriteMessageOptions): void {
    this.showMessage({
      ...options,
      spriteInstanceId,
      text,
      mode: 'say',
    });
  }

  think(spriteInstanceId: string, text: RoccoSpriteMessageText, options?: RoccoSpriteMessageOptions): void {
    this.showMessage({
      ...options,
      spriteInstanceId,
      text,
      mode: 'think',
    });
  }

  removeMessage(messageId: string): void {
    this.messages.delete(messageId);
  }

  clearMessages(): void {
    this.messages.clear();
  }

  listMessages(): RoccoSpriteMessageState[] {
    return [...this.messages.values()].map((message) => clone(message));
  }

  listRenderableMessages(
    sprites: RoccoRenderableSprite[],
    designSize: { width: number; height: number },
  ): RoccoSpriteMessageRenderable[] {
    const spriteById = new Map(sprites.map((sprite) => [sprite.instance.id, sprite]));
    const renderables: RoccoSpriteMessageRenderable[] = [];

    for (const message of this.messages.values()) {
      const sprite = spriteById.get(message.spriteInstanceId);
      if (!sprite) {
        continue;
      }

      renderables.push({
        message: clone(message),
        sprite: clone(sprite),
        designWidth: designSize.width,
        designHeight: designSize.height,
      });
    }

    return renderables;
  }

  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    for (const message of this.messages.values()) {
      message.ttlMs -= deltaMs;
      while (message.ttlMs <= 0) {
        if (message.lineIndex < message.lines.length - 1) {
          message.lineIndex += 1;
          message.text = message.lines[message.lineIndex];
          message.ttlMs += message.durationMs;
        } else {
          this.messages.delete(message.id);
          break;
        }
      }
    }
  }

  private selectLines(
    lines: string[],
    selection: RoccoSpriteMessageRequest['lineSelection'],
  ): string[] {
    if (!selection || selection.mode !== 'random' || lines.length <= 1) {
      return lines;
    }

    const count = Math.max(1, Math.min(lines.length, Math.floor(selection.count)));
    const historyKey = selection.historyKey;
    const avoidedLine =
      historyKey && selection.avoidImmediateRepeat
        ? this.lastSelectedLineByHistoryKey.get(historyKey)
        : undefined;
    const pool =
      avoidedLine && lines.length > count
        ? lines.filter((line) => line !== avoidedLine)
        : [...lines];
    const picked: string[] = [];

    while (picked.length < count && pool.length > 0) {
      const index = Math.floor(Math.random() * pool.length);
      const [line] = pool.splice(index, 1);
      picked.push(line);
    }

    if (historyKey && picked[0]) {
      this.lastSelectedLineByHistoryKey.set(historyKey, picked[0]);
    }

    return picked;
  }
}
