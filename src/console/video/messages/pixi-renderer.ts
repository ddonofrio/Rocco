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

interface BubbleLayoutCandidate {
  layout: BubbleLayout;
  preferredX: number;
  preferredY: number;
  preferencePenalty: number;
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
      layerRoot.removeFromParent();
      layerRoot.destroy({ children: true });
    }
    this.layerRoots.clear();
    this.nodes.clear();
    this.stage = null;
  }

  sync(renderables: RoccoSpriteMessageRenderable[], sprites: readonly RoccoRenderableSprite[]): void {
    if (!this.stage) {
      return;
    }

    const spriteBoundsById = new Map<string, SpriteBounds>();
    for (const sprite of sprites) {
      spriteBoundsById.set(sprite.instance.id, this.resolveSpriteBounds(sprite));
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

      this.applyMessage(node, renderable, spriteBoundsById, sprites);
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

  private applyMessage(
    node: MessageNode,
    renderable: RoccoSpriteMessageRenderable,
    spriteBoundsById: ReadonlyMap<string, SpriteBounds>,
    sprites: readonly RoccoRenderableSprite[],
  ): void {
    const message = renderable.message;
    node.text.text = message.text;
    node.text.style = this.resolveTextStyle(message);

    const textWidth = Math.max(1, node.text.width);
    const textHeight = Math.max(1, node.text.height);
    const bubbleWidth = Math.ceil(textWidth + DEFAULT_PADDING_X * 2);
    const bubbleHeight = Math.ceil(textHeight + DEFAULT_PADDING_Y * 2);
    const spriteBounds =
      spriteBoundsById.get(renderable.sprite.instance.id) ?? this.resolveSpriteBounds(renderable.sprite);
    const obstacleBounds = this.resolveObstacleBounds(
      renderable.sprite.instance.id,
      spriteBoundsById,
      sprites,
    );
    const layout = this.resolveBubbleLayout(
      renderable,
      spriteBounds,
      bubbleWidth,
      bubbleHeight,
      obstacleBounds,
    );

    node.root.position.set(layout.x, layout.y);
    node.root.zIndex = message.zIndex;
    node.root.visible = true;
    node.text.position.set(DEFAULT_PADDING_X, DEFAULT_PADDING_Y);

    this.drawBubble(node.bubble, message, layout);
  }

  private resolveObstacleBounds(
    currentSpriteInstanceId: string,
    spriteBoundsById: ReadonlyMap<string, SpriteBounds>,
    sprites: readonly RoccoRenderableSprite[],
  ): SpriteBounds[] {
    const ignoredSpriteIds = new Set(
      sprites
        .filter((sprite) => sprite.instance.ignoreMessages === true)
        .map((sprite) => sprite.instance.id),
    );

    return [...spriteBoundsById]
      .filter(
        ([instanceId]) =>
          instanceId !== currentSpriteInstanceId && !ignoredSpriteIds.has(instanceId),
      )
      .map(([, bounds]) => bounds);
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
      .fill({ color: fill, alpha: 1 })
      .stroke({ color: stroke, width: strokeWidth, alpha: 1 });

    const targetLocalX = layout.targetX - layout.x;
    const targetLocalY = layout.targetY - layout.y;

    if (message.mode === 'think') {
      if (style.showThoughtTrail === false) {
        return;
      }

      const dotX = Math.max(18, Math.min(layout.width - 18, targetLocalX));
      graphics
        .circle(dotX, layout.height + 8, 5)
        .fill({ color: fill, alpha: 1 })
        .stroke({ color: stroke, width: 1.5, alpha: 1 });
      graphics
        .circle((dotX + targetLocalX) / 2, Math.min(targetLocalY - 4, layout.height + 20), 3)
        .fill({ color: fill, alpha: 1 });
      return;
    }

    if (layout.side === 'right') {
      const tailY = Math.max(14, Math.min(layout.height - 14, targetLocalY));
      graphics
        .poly([0, tailY - 8, 0, tailY + 8, Math.min(-14, targetLocalX), targetLocalY], true)
        .fill({ color: fill, alpha: 1 })
        .stroke({ color: stroke, width: strokeWidth, alpha: 1 });
      return;
    }

    if (layout.side === 'left') {
      const tailY = Math.max(14, Math.min(layout.height - 14, targetLocalY));
      graphics
        .poly([layout.width, tailY - 8, layout.width, tailY + 8, Math.max(layout.width + 14, targetLocalX), targetLocalY], true)
        .fill({ color: fill, alpha: 1 })
        .stroke({ color: stroke, width: strokeWidth, alpha: 1 });
      return;
    }

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
      .fill({ color: fill, alpha: 1 })
      .stroke({ color: stroke, width: strokeWidth, alpha: 1 });
  }

  private resolveBubbleLayout(
    renderable: RoccoSpriteMessageRenderable,
    spriteBounds: SpriteBounds,
    width: number,
    height: number,
    obstacleBounds: readonly SpriteBounds[],
  ): BubbleLayout {
    const message = renderable.message;
    const targetX = spriteBounds.x + spriteBounds.width / 2;
    const offsetX = message.offset.x;
    const offsetY = message.offset.y;

    if (message.mode === 'think' || message.side === 'above') {
      return this.chooseBestLayout(
        [
          this.buildAboveCandidate(renderable, spriteBounds, width, height, targetX, offsetX, offsetY, 0),
          this.buildAboveCandidate(
            renderable,
            spriteBounds,
            width,
            height,
            targetX - width * 0.45,
            offsetX,
            offsetY,
            20,
          ),
          this.buildAboveCandidate(
            renderable,
            spriteBounds,
            width,
            height,
            targetX + width * 0.45,
            offsetX,
            offsetY,
            20,
          ),
        ],
        obstacleBounds,
      );
    }

    const preferredSide =
      targetX < renderable.designWidth * 0.56 ? 'right' : 'left';

    if (message.side === 'left' || message.side === 'right') {
      return this.chooseBestLayout(
        [
          this.buildHorizontalCandidate(
            renderable,
            spriteBounds,
            width,
            height,
            message.side,
            offsetX,
            offsetY,
            0,
          ),
          this.buildAboveCandidate(renderable, spriteBounds, width, height, targetX, offsetX, offsetY, 240),
        ],
        obstacleBounds,
      );
    }

    return this.chooseBestLayout(
      [
        this.buildHorizontalCandidate(
          renderable,
          spriteBounds,
          width,
          height,
          preferredSide,
          offsetX,
          offsetY,
          0,
        ),
        this.buildHorizontalCandidate(
          renderable,
          spriteBounds,
          width,
          height,
          preferredSide === 'right' ? 'left' : 'right',
          offsetX,
          offsetY,
          140,
        ),
        this.buildAboveCandidate(renderable, spriteBounds, width, height, targetX, offsetX, offsetY, 420),
      ],
      obstacleBounds,
    );
  }

  private buildHorizontalCandidate(
    renderable: RoccoSpriteMessageRenderable,
    spriteBounds: SpriteBounds,
    width: number,
    height: number,
    side: 'left' | 'right',
    offsetX: number,
    offsetY: number,
    preferencePenalty: number,
  ): BubbleLayoutCandidate {
    const targetY = spriteBounds.y + spriteBounds.height * 0.25;
    const preferredY = targetY - height / 2 + offsetY;
    const y = this.clamp(
      preferredY,
      DEFAULT_MARGIN,
      renderable.designHeight - height - DEFAULT_MARGIN,
    );

    if (side === 'right') {
      const preferredX = spriteBounds.x + spriteBounds.width + DEFAULT_GAP + offsetX;
      return {
        layout: {
          x: this.clamp(
            preferredX,
            DEFAULT_MARGIN,
            renderable.designWidth - width - DEFAULT_MARGIN,
          ),
          y,
          width,
          height,
          targetX: spriteBounds.x + spriteBounds.width * 0.82,
          targetY,
          side,
        },
        preferredX,
        preferredY,
        preferencePenalty,
      };
    }

    const preferredX = spriteBounds.x - width - DEFAULT_GAP + offsetX;
    return {
      layout: {
        x: this.clamp(
          preferredX,
          DEFAULT_MARGIN,
          renderable.designWidth - width - DEFAULT_MARGIN,
        ),
        y,
        width,
        height,
        targetX: spriteBounds.x + spriteBounds.width * 0.18,
        targetY,
        side,
      },
      preferredX,
      preferredY,
      preferencePenalty,
    };
  }

  private buildAboveCandidate(
    renderable: RoccoSpriteMessageRenderable,
    spriteBounds: SpriteBounds,
    width: number,
    height: number,
    anchorX: number,
    offsetX: number,
    offsetY: number,
    preferencePenalty: number,
  ): BubbleLayoutCandidate {
    const preferredX = anchorX - width / 2 + offsetX;
    const preferredY = spriteBounds.y - height - DEFAULT_GAP + offsetY;
    return {
      layout: {
        x: this.clamp(
          preferredX,
          DEFAULT_MARGIN,
          renderable.designWidth - width - DEFAULT_MARGIN,
        ),
        y: this.clamp(
          preferredY,
          DEFAULT_MARGIN,
          renderable.designHeight - height - DEFAULT_MARGIN,
        ),
        width,
        height,
        targetX: spriteBounds.x + spriteBounds.width / 2,
        targetY: spriteBounds.y,
        side: 'above',
      },
      preferredX,
      preferredY,
      preferencePenalty,
    };
  }

  private chooseBestLayout(
    candidates: readonly BubbleLayoutCandidate[],
    obstacleBounds: readonly SpriteBounds[],
  ): BubbleLayout {
    let bestCandidate = candidates[0];
    let bestScore = this.scoreCandidate(bestCandidate, obstacleBounds);

    for (const candidate of candidates.slice(1)) {
      const score = this.scoreCandidate(candidate, obstacleBounds);
      if (score < bestScore) {
        bestCandidate = candidate;
        bestScore = score;
      }
    }

    return bestCandidate.layout;
  }

  private scoreCandidate(
    candidate: BubbleLayoutCandidate,
    obstacleBounds: readonly SpriteBounds[],
  ): number {
    const overlapArea = obstacleBounds.reduce(
      (total, obstacle) => total + this.computeIntersectionArea(candidate.layout, obstacle),
      0,
    );
    const clampPenalty =
      Math.abs(candidate.layout.x - candidate.preferredX) +
      Math.abs(candidate.layout.y - candidate.preferredY);
    return overlapArea * 100_000 + clampPenalty * 20 + candidate.preferencePenalty;
  }

  private computeIntersectionArea(rect: BubbleLayout, obstacle: SpriteBounds): number {
    const left = Math.max(rect.x, obstacle.x);
    const right = Math.min(rect.x + rect.width, obstacle.x + obstacle.width);
    const top = Math.max(rect.y, obstacle.y);
    const bottom = Math.min(rect.y + rect.height, obstacle.y + obstacle.height);
    if (right <= left || bottom <= top) {
      return 0;
    }

    return (right - left) * (bottom - top);
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
