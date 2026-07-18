import { Graphics } from 'pixi.js';

export interface BubblePanelStyle {
  width: number;
  height: number;
  fill: string | number;
  stroke: string | number;
  strokeWidth: number;
  radius: number;
}

/**
 * Draws a tail-less rounded panel. This is a neutral, reusable video primitive
 * for any rounded-corner bordered surface (speech/thought bubbles, loading
 * panels, HUD cards, and similar overlays).
 *
 * It deliberately omits the speech/thought tail so callers that only need a
 * panel do not depend on sprite anchoring, TTLs, message paging, or dialogue
 * state. Bubble rendering composes this helper before drawing its own tail.
 */
export function drawBubblePanel(graphics: Graphics, style: BubblePanelStyle): void {
  graphics
    .roundRect(0, 0, style.width, style.height, style.radius)
    .fill(style.fill)
    .stroke({ color: style.stroke, width: style.strokeWidth, alpha: 1 });
}
