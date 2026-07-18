import { Container, Graphics } from 'pixi.js';

import type { RoccoPrimitive } from './types';

interface PrimitiveNode {
  root: Graphics;
  renderLayer: string;
}

interface PixiRoccoPrimitiveRendererOptions {
  resolveRenderLayerZIndex?: (renderLayer: string) => number;
}

export class PixiRoccoPrimitiveRenderer {
  private readonly nodes = new Map<string, PrimitiveNode>();
  private readonly layerRoots = new Map<string, Container>();
  private readonly resolveRenderLayerZIndex: (renderLayer: string) => number;
  private stage: Container | undefined;

  constructor(options?: PixiRoccoPrimitiveRendererOptions) {
    this.resolveRenderLayerZIndex = options?.resolveRenderLayerZIndex ?? (() => 0);
  }

  private ensureLayerRoot(renderLayer: string): Container {
    if (!this.stage) {
      throw new Error('Primitive renderer is not mounted.');
    }

    const existing = this.layerRoots.get(renderLayer);
    if (existing) {
      existing.zIndex = this.resolveRenderLayerZIndex(renderLayer);
      return existing;
    }

    const layerRoot = new Container();
    layerRoot.label = `rocco-primitive-layer:${renderLayer}`;
    layerRoot.sortableChildren = true;
    layerRoot.zIndex = this.resolveRenderLayerZIndex(renderLayer);
    this.stage.addChild(layerRoot);
    this.layerRoots.set(renderLayer, layerRoot);
    return layerRoot;
  }

  private applyPrimitive(graphics: Graphics, primitive: RoccoPrimitive): void {
    graphics.clear();
    graphics.visible = primitive.visible;
    graphics.alpha = primitive.alpha;
    graphics.zIndex = primitive.zIndex;

    switch (primitive.kind) {
      case 'point': {
        graphics.circle(primitive.x, primitive.y, primitive.size).fill(primitive.color);
        break;
      }
      case 'line': {
        graphics
          .moveTo(primitive.x1, primitive.y1)
          .lineTo(primitive.x2, primitive.y2)
          .stroke({ width: primitive.strokeWidth, color: primitive.color });
        break;
      }
      case 'rect': {
        graphics.rect(primitive.x, primitive.y, primitive.width, primitive.height);
        this.applyFillOrStroke(graphics, primitive.color, primitive.fill, primitive.strokeWidth);
        break;
      }
      case 'circle': {
        graphics.circle(primitive.x, primitive.y, primitive.radius);
        this.applyFillOrStroke(graphics, primitive.color, primitive.fill, primitive.strokeWidth);
        break;
      }
      case 'polygon': {
        if (primitive.points.length > 0) {
          graphics.poly(primitive.points);
          this.applyFillOrStroke(graphics, primitive.color, primitive.fill, primitive.strokeWidth);
        }
        break;
      }
    }
  }

  private applyFillOrStroke(
    graphics: Graphics,
    color: string,
    fill: boolean | undefined,
    strokeWidth: number | undefined,
  ): void {
    if (fill) {
      graphics.fill(color);
      return;
    }

    graphics.stroke({ width: strokeWidth ?? 1, color });
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
    this.stage = undefined;
  }

  sync(primitives: RoccoPrimitive[]): void {
    if (!this.stage) {
      return;
    }

    const staleIds = new Set(this.nodes.keys());
    for (const primitive of primitives) {
      const layerRoot = this.ensureLayerRoot(primitive.renderLayer);
      let node = this.nodes.get(primitive.id);
      if (!node) {
        node = {
          root: new Graphics(),
          renderLayer: primitive.renderLayer,
        };
        this.nodes.set(primitive.id, node);
        layerRoot.addChild(node.root);
      } else if (node.renderLayer !== primitive.renderLayer || node.root.parent !== layerRoot) {
        node.root.removeFromParent();
        layerRoot.addChild(node.root);
        node.renderLayer = primitive.renderLayer;
      }

      this.applyPrimitive(node.root, primitive);
      staleIds.delete(primitive.id);
    }

    for (const staleId of staleIds) {
      const node = this.nodes.get(staleId);
      if (!node) {
        continue;
      }
      node.root.removeFromParent();
      node.root.destroy();
      this.nodes.delete(staleId);
    }
  }

  destroy(): void {
    this.unmount();
  }
}
