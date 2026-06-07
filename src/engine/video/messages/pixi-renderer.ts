import { Container, Graphics, Text, type TextStyleOptions } from 'pixi.js';

import type { RoccoRenderableSprite } from '../sprites';
import type { RoccoSpriteMessageRenderable, RoccoSpriteMessageState } from './types';

interface MessageNode {
  root: Container;
  bubble: Graphics;
  text: Text;
  renderLayer: string;
}

interface SpriteBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BubbleLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  targetX: number;
  targetY: number;
  side: 'left' | 'right' | 'above';
}

interface PixiRoccoSpriteMessageRendererOptions {
  resolveRenderLayerZIndex?: (renderLayer: string) => number;
}

const DEFAULT_PADDING_X = 14;
const DEFAULT_PADDING_Y = 10;
const DEFAULT_MARGIN = 8;
const DEFAULT_GAP = 18;
const DEFAULT_RADIUS = 14;

export class PixiRoccoSpriteMessageRenderer {
  private readonly nodes = new Map<string, MessageNode>();
  private readonly layerRoots = new Map<string, Container>();
  private readonly resolveRenderLayerZIndex: (renderLayer: string) => number;
  private stage: Container | null = null;

  constructor(options?: PixiRoccoSpriteMessageRendererOptions) {
    this.resolveRenderLayerZIndex = options?.resolveRenderLayerZIndex ?? (() => 0);
  }

  mount(stage: Container): void {
    if (this.stage === stage) {
      return;
    }

    this.unmount();
    this.stage = stage;
  }

  unmount(): void {
    if (!this.stage) {
      return;
    }

    for (const layerRoot of this.layerRoots.values()) {
      this.stage.removeChild(layerRoot);
      layerRoot.destroy({ children: true });
    }
    this.layerRoots.clear();
    this.nodes.clear();
    this.stage = null;
  }

  sync(renderables: RoccoSpriteMessageRenderable[]): void {
    if (!this.stage) {
      return;
    }

    const staleIds = new Set(this.nodes.keys());
    for (const renderable of renderables) {
      const layerRoot = this.ensureLayerRoot(renderable.message.renderLayer);
      let node = this.nodes.get(renderable.message.id);
      if (!node) {
        node = this.createNode(renderable.message);
        this.nodes.set(renderable.message.id, node);
        layerRoot.addChild(node.root);
      } else if (node.renderLayer !== renderable.message.renderLayer || node.root.parent !== layerRoot) {
        node.root.parent?.removeChild(node.root);
        layerRoot.addChild(node.root);
        node.renderLayer = renderable.message.renderLayer;
      }

      this.applyMessage(node, renderable);
      staleIds.delete(renderable.message.id);
    }

    for (const staleId of staleIds) {
      const node = this.nodes.get(staleId);
      if (!node) {
        continue;
      }

      node.root.parent?.removeChild(node.root);
      node.root.destroy({ children: true });
      this.nodes.delete(staleId);
    }
  }

  destroy(): void {
    this.unmount();
  }

  private createNode(message: RoccoSpriteMessageState): MessageNode {
    const root = new Container();
    root.label = `rocco-sprite-message:${message.id}`;
    root.sortableChildren = false;
    root.eventMode = 'none';

    const bubble = new Graphics();
    bubble.eventMode = 'none';

    const text = new Text({
      text: message.text,
      style: this.resolveTextStyle(message),
    });
    text.eventMode = 'none';

    root.addChild(bubble);
    root.addChild(text);

    return {
      root,
      bubble,
      text,
      renderLayer: message.renderLayer,
    };
  }

  private ensureLayerRoot(renderLayer: string): Container {
    if (!this.stage) {
      throw new Error('Sprite message renderer is not mounted.');
    }

    const existing = this.layerRoots.get(renderLayer);
    if (existing) {
      existing.zIndex = this.resolveRenderLayerZIndex(renderLayer);
      return existing;
    }

    const layerRoot = new Container();
    layerRoot.label = `rocco-sprite-message-layer:${renderLayer}`;
    layerRoot.sortableChildren = true;
    layerRoot.zIndex = this.resolveRenderLayerZIndex(renderLayer);
    this.stage.addChild(layerRoot);
    this.layerRoots.set(renderLayer, layerRoot);
    return layerRoot;
  }

  private applyMessage(node: MessageNode, renderable: RoccoSpriteMessageRenderable): void {
    const message = renderable.message;
    node.text.text = message.text;
    node.text.style = this.resolveTextStyle(message);

    const textWidth = Math.max(1, node.text.width);
    const textHeight = Math.max(1, node.text.height);
    const bubbleWidth = Math.ceil(textWidth + DEFAULT_PADDING_X * 2);
    const bubbleHeight = Math.ceil(textHeight + DEFAULT_PADDING_Y * 2);
    const spriteBounds = this.resolveSpriteBounds(renderable.sprite);
    const layout = this.resolveBubbleLayout(renderable, spriteBounds, bubbleWidth, bubbleHeight);

    node.root.position.set(layout.x, layout.y);
    node.root.zIndex = message.zIndex;
    node.root.visible = true;
    node.text.position.set(DEFAULT_PADDING_X, DEFAULT_PADDING_Y);

    this.drawBubble(node.bubble, message, layout);
  }

  private resolveTextStyle(message: RoccoSpriteMessageState): Partial<TextStyleOptions> {
    const style = message.style ?? {};
    return {
      fill: style.fill ?? '#172018',
      fontFamily: style.fontFamily ?? 'Cascadia Mono, Lucida Console, monospace',
      fontSize: style.fontSize ?? 17,
      fontWeight: style.fontWeight ?? '700',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: Math.max(64, message.maxWidth),
      lineHeight: Math.round((style.fontSize ?? 17) * 1.25),
    };
  }

  private drawBubble(
    graphics: Graphics,
    message: RoccoSpriteMessageState,
    layout: BubbleLayout,
  ): void {
    const style = message.style ?? {};
    const fill = style.bubbleFill ?? (message.mode === 'think' ? '#e6ecd6' : '#dce8c7');
    const stroke = style.bubbleStroke ?? '#69735f';
    const strokeWidth = style.bubbleStrokeWidth ?? 2;

    graphics.clear();
    graphics
      .roundRect(0, 0, layout.width, layout.height, DEFAULT_RADIUS)
      .fill({ color: fill, alpha: 0.94 })
      .stroke({ color: stroke, width: strokeWidth, alpha: 0.88 });

    const targetLocalX = layout.targetX - layout.x;
    const targetLocalY = layout.targetY - layout.y;

    if (message.mode === 'think') {
      const dotX = Math.max(18, Math.min(layout.width - 18, targetLocalX));
      graphics
        .circle(dotX, layout.height + 8, 5)
        .fill({ color: fill, alpha: 0.9 })
        .stroke({ color: stroke, width: 1.5, alpha: 0.75 });
      graphics
        .circle((dotX + targetLocalX) / 2, Math.min(targetLocalY - 4, layout.height + 20), 3)
        .fill({ color: fill, alpha: 0.82 });
      return;
    }

    if (layout.side === 'right') {
      const tailY = Math.max(14, Math.min(layout.height - 14, targetLocalY));
      graphics
        .poly([0, tailY - 8, 0, tailY + 8, Math.min(-14, targetLocalX), targetLocalY], true)
        .fill({ color: fill, alpha: 0.94 })
        .stroke({ color: stroke, width: strokeWidth, alpha: 0.88 });
      return;
    }

    if (layout.side === 'left') {
      const tailY = Math.max(14, Math.min(layout.height - 14, targetLocalY));
      graphics
        .poly([layout.width, tailY - 8, layout.width, tailY + 8, Math.max(layout.width + 14, targetLocalX), targetLocalY], true)
        .fill({ color: fill, alpha: 0.94 })
        .stroke({ color: stroke, width: strokeWidth, alpha: 0.88 });
    }
  }

  private resolveBubbleLayout(
    renderable: RoccoSpriteMessageRenderable,
    spriteBounds: SpriteBounds,
    width: number,
    height: number,
  ): BubbleLayout {
    const message = renderable.message;
    const targetX = spriteBounds.x + spriteBounds.width / 2;
    const targetY = spriteBounds.y + spriteBounds.height * 0.25;
    const offsetX = message.offset.x;
    const offsetY = message.offset.y;

    if (message.mode === 'think' || message.side === 'above') {
      const x = this.clamp(targetX - width / 2 + offsetX, DEFAULT_MARGIN, renderable.designWidth - width - DEFAULT_MARGIN);
      const y = this.clamp(spriteBounds.y - height - DEFAULT_GAP + offsetY, DEFAULT_MARGIN, renderable.designHeight - height - DEFAULT_MARGIN);
      return {
        x,
        y,
        width,
        height,
        targetX,
        targetY: spriteBounds.y,
        side: 'above',
      };
    }

    const side = message.side === 'left' || message.side === 'right'
      ? message.side
      : targetX < renderable.designWidth * 0.56
        ? 'right'
        : 'left';

    if (side === 'right') {
      const x = this.clamp(spriteBounds.x + spriteBounds.width + DEFAULT_GAP + offsetX, DEFAULT_MARGIN, renderable.designWidth - width - DEFAULT_MARGIN);
      const y = this.clamp(targetY - height / 2 + offsetY, DEFAULT_MARGIN, renderable.designHeight - height - DEFAULT_MARGIN);
      return {
        x,
        y,
        width,
        height,
        targetX: spriteBounds.x + spriteBounds.width * 0.82,
        targetY,
        side,
      };
    }

    const x = this.clamp(spriteBounds.x - width - DEFAULT_GAP + offsetX, DEFAULT_MARGIN, renderable.designWidth - width - DEFAULT_MARGIN);
    const y = this.clamp(targetY - height / 2 + offsetY, DEFAULT_MARGIN, renderable.designHeight - height - DEFAULT_MARGIN);
    return {
      x,
      y,
      width,
      height,
      targetX: spriteBounds.x + spriteBounds.width * 0.18,
      targetY,
      side,
    };
  }

  private resolveSpriteBounds(renderable: RoccoRenderableSprite): SpriteBounds {
    const image = renderable.definition.images.find((item) => item.id === renderable.frame.imageId);
    const frameWidth = renderable.frame.rect?.width ?? image?.width ?? 64;
    const frameHeight = renderable.frame.rect?.height ?? image?.height ?? 64;
    const anchor = renderable.definition.anchor ?? { x: 0, y: 0 };
    const pivot = renderable.frame.pivot ?? renderable.definition.pivot ?? { x: 0, y: 0 };
    const visualAdjustment = renderable.visualAdjustment ?? {
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0,
    };

    const localLeft = visualAdjustment.offsetX - anchor.x * frameWidth * visualAdjustment.scaleX;
    const localTop = visualAdjustment.offsetY - anchor.y * frameHeight * visualAdjustment.scaleY;
    const localRight = localLeft + frameWidth * visualAdjustment.scaleX;
    const localBottom = localTop + frameHeight * visualAdjustment.scaleY;

    const x1 = renderable.instance.transform.x + (localLeft - pivot.x) * renderable.instance.transform.scaleX;
    const x2 = renderable.instance.transform.x + (localRight - pivot.x) * renderable.instance.transform.scaleX;
    const y1 = renderable.instance.transform.y + (localTop - pivot.y) * renderable.instance.transform.scaleY;
    const y2 = renderable.instance.transform.y + (localBottom - pivot.y) * renderable.instance.transform.scaleY;

    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    };
  }

  private clamp(value: number, min: number, max: number): number {
    if (max < min) {
      return min;
    }

    return Math.min(max, Math.max(min, value));
  }
}
