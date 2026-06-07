import { Container, Text } from 'pixi.js';

import type { RoccoTitleMessage } from './types';

interface TitleNode {
  root: Text;
  renderLayer: string;
}

interface PixiRoccoTitleRendererOptions {
  resolveRenderLayerZIndex?: (renderLayer: string) => number;
}

export class PixiRoccoTitleRenderer {
  private readonly nodes = new Map<string, TitleNode>();
  private readonly layerRoots = new Map<string, Container>();
  private readonly resolveRenderLayerZIndex: (renderLayer: string) => number;
  private stage: Container | null = null;

  constructor(options?: PixiRoccoTitleRendererOptions) {
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

  sync(titles: RoccoTitleMessage[]): void {
    if (!this.stage) {
      return;
    }

    const staleIds = new Set(this.nodes.keys());
    for (const title of titles) {
      const layerRoot = this.ensureLayerRoot(title.renderLayer);
      let node = this.nodes.get(title.id);
      if (!node) {
        node = {
          root: new Text({
            text: title.text,
            style: {
              fill: '#f3efe2',
              fontFamily: 'serif',
              fontSize: 28,
            },
          }),
          renderLayer: title.renderLayer,
        };
        this.nodes.set(title.id, node);
        layerRoot.addChild(node.root);
      } else if (node.renderLayer !== title.renderLayer || node.root.parent !== layerRoot) {
        node.root.parent?.removeChild(node.root);
        layerRoot.addChild(node.root);
        node.renderLayer = title.renderLayer;
      }

      this.applyTitle(node.root, title);
      staleIds.delete(title.id);
    }

    for (const staleId of staleIds) {
      const node = this.nodes.get(staleId);
      if (!node) {
        continue;
      }
      node.root.parent?.removeChild(node.root);
      node.root.destroy();
      this.nodes.delete(staleId);
    }
  }

  destroy(): void {
    this.unmount();
  }

  private ensureLayerRoot(renderLayer: string): Container {
    if (!this.stage) {
      throw new Error('Title renderer is not mounted.');
    }

    const existing = this.layerRoots.get(renderLayer);
    if (existing) {
      existing.zIndex = this.resolveRenderLayerZIndex(renderLayer);
      return existing;
    }

    const layerRoot = new Container();
    layerRoot.label = `rocco-title-layer:${renderLayer}`;
    layerRoot.sortableChildren = true;
    layerRoot.zIndex = this.resolveRenderLayerZIndex(renderLayer);
    this.stage.addChild(layerRoot);
    this.layerRoots.set(renderLayer, layerRoot);
    return layerRoot;
  }

  private applyTitle(text: Text, title: RoccoTitleMessage): void {
    text.text = title.text;
    if (title.style) {
      text.style = {
        fill: '#f3efe2',
        fontFamily: 'serif',
        fontSize: 28,
        ...title.style,
      };
    }
    text.anchor.set(title.anchor?.x ?? 0, title.anchor?.y ?? 0);
    text.position.set(title.x, title.y);
    text.visible = title.visible;
    text.zIndex = title.zIndex;
  }
}
