import { describe, expect, it, vi } from 'vitest';

import { drawBubblePanel } from '../../../src/console/video/bubble-panel';
import { drawBubble } from '../../../src/console/video/messages/bubble-renderer';
import type { RoccoSpriteMessageState } from '../../../src/console/video/messages/types';

function createLayout(width: number, height: number) {
  return {
    x: 0,
    y: 0,
    width,
    height,
    targetX: width / 2,
    targetY: height + 20,
    side: 'above' as const,
  };
}

function createMessage(overrides: Partial<RoccoSpriteMessageState> = {}): RoccoSpriteMessageState {
  return {
    id: 'message',
    spriteInstanceId: 'rocco',
    mode: 'say',
    text: 'Hello',
    lines: ['Hello'],
    lineIndex: 0,
    background: false,
    durationMs: 0,
    ttlMs: 0,
    side: 'auto',
    offset: { x: 0, y: 0 },
    renderLayer: 'overlay.messages',
    zIndex: 0,
    maxWidth: 240,
    ...overrides,
  };
}

describe('bubble-panel', () => {
  it('draws a rounded frame with the provided style', () => {
    const roundRect = vi.fn().mockReturnThis();
    const fill = vi.fn().mockReturnThis();
    const stroke = vi.fn().mockReturnThis();
    const graphics = {
      roundRect,
      fill,
      stroke,
      clear: vi.fn().mockReturnThis(),
      circle: vi.fn().mockReturnThis(),
      poly: vi.fn().mockReturnThis(),
    } as unknown as import('pixi.js').Graphics;

    drawBubblePanel(graphics, {
      width: 120,
      height: 60,
      fill: '#dce8c7',
      stroke: '#69735f',
      strokeWidth: 2,
      radius: 14,
    });

    expect(roundRect).toHaveBeenCalledWith(0, 0, 120, 60, 14);
    expect(fill).toHaveBeenCalledWith('#dce8c7');
    expect(stroke).toHaveBeenCalledWith({ color: '#69735f', width: 2, alpha: 1 });
  });

  it('drawBubble uses the tail-less panel and adds its tail', () => {
    const roundRectSpy = vi.fn().mockReturnThis();
    const graphics = {
      roundRect: roundRectSpy,
      fill: vi.fn().mockReturnThis(),
      stroke: vi.fn().mockReturnThis(),
      clear: vi.fn().mockReturnThis(),
      circle: vi.fn().mockReturnThis(),
      poly: vi.fn().mockReturnThis(),
    } as unknown as import('pixi.js').Graphics;

    drawBubble(graphics, createMessage(), createLayout(120, 60));

    expect(roundRectSpy).toHaveBeenCalledTimes(1);
    expect(roundRectSpy).toHaveBeenCalledWith(0, 0, 120, 60, 14);
  });
});
