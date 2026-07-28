import { Graphics } from 'pixi.js';

import { drawBubblePanel } from '../bubble-panel';
import type { RoccoSpriteMessageState } from './types';

export interface BubbleLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  targetX: number;
  targetY: number;
  side: 'left' | 'right' | 'above';
}

const DEFAULT_RADIUS = 14;

function drawThoughtTail(
  graphics: Graphics,
  layout: BubbleLayout,
  fill: string,
  stroke: string,
  targetLocalX: number,
  targetLocalY: number,
): void {
  const dotX = Math.max(18, Math.min(layout.width - 18, targetLocalX));
  graphics
    .circle(dotX, layout.height + 8, 5)
    .fill(fill)
    .stroke({ color: stroke, width: 1.5, alpha: 1 });
  graphics
    .circle((dotX + targetLocalX) / 2, Math.min(targetLocalY - 4, layout.height + 20), 3)
    .fill(fill);
}

function drawSideTail(
  graphics: Graphics,
  layout: BubbleLayout,
  fill: string,
  stroke: string,
  strokeWidth: number,
  side: 'left' | 'right',
  targetLocalX: number,
  targetLocalY: number,
): void {
  const tailY = Math.max(14, Math.min(layout.height - 14, targetLocalY));
  const points =
    side === 'right'
      ? [0, tailY - 8, 0, tailY + 8, Math.min(-14, targetLocalX), targetLocalY]
      : [
          layout.width,
          tailY - 8,
          layout.width,
          tailY + 8,
          Math.max(layout.width + 14, targetLocalX),
          targetLocalY,
        ];
  graphics.poly(points, true).fill(fill).stroke({ color: stroke, width: strokeWidth, alpha: 1 });
}

function drawAboveTail(
  graphics: Graphics,
  layout: BubbleLayout,
  fill: string,
  stroke: string,
  strokeWidth: number,
  targetLocalX: number,
  targetLocalY: number,
): void {
  const tailX = Math.max(18, Math.min(layout.width - 18, targetLocalX));
  graphics
    .poly(
      [
        tailX - 10,
        layout.height,
        tailX + 10,
        layout.height,
        targetLocalX,
        Math.max(layout.height + 14, targetLocalY),
      ],
      true,
    )
    .fill(fill)
    .stroke({ color: stroke, width: strokeWidth, alpha: 1 });
}

function drawSpeechTail(
  graphics: Graphics,
  message: RoccoSpriteMessageState,
  layout: BubbleLayout,
  fill: string,
  stroke: string,
  strokeWidth: number,
  targetLocalX: number,
  targetLocalY: number,
): void {
  if (message.style?.showSpeechTail === false) {
    return;
  }

  if (message.mode === 'think') {
    if (message.style?.showThoughtTrail === false) {
      return;
    }
    drawThoughtTail(graphics, layout, fill, stroke, targetLocalX, targetLocalY);
    return;
  }

  if (layout.side === 'right' || layout.side === 'left') {
    drawSideTail(
      graphics,
      layout,
      fill,
      stroke,
      strokeWidth,
      layout.side,
      targetLocalX,
      targetLocalY,
    );
    return;
  }

  drawAboveTail(graphics, layout, fill, stroke, strokeWidth, targetLocalX, targetLocalY);
}

export function drawBubble(
  graphics: Graphics,
  message: RoccoSpriteMessageState,
  layout: BubbleLayout,
): void {
  const style = message.style ?? {};
  const fill = style.bubbleFill ?? (message.mode === 'think' ? '#e6ecd6' : '#dce8c7');
  const stroke = style.bubbleStroke ?? '#69735f';
  const strokeWidth = style.bubbleStrokeWidth ?? 2;
  graphics.clear();
  drawBubblePanel(graphics, {
    width: layout.width,
    height: layout.height,
    fill,
    stroke,
    strokeWidth,
    radius: DEFAULT_RADIUS,
  });
  drawSpeechTail(
    graphics,
    message,
    layout,
    fill,
    stroke,
    strokeWidth,
    layout.targetX - layout.x,
    layout.targetY - layout.y,
  );
}
