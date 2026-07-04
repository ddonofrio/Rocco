import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';

import type { RoccoActionMenuItem, RoccoActionMenuRenderable } from './types';

interface ActionMenuItemNode {
  root: Container;
  circle: Graphics;
  icon: Sprite;
  imageUri: string;
}

interface PixiRoccoActionMenuRendererOptions {
  resolveRenderLayerZIndex?: (renderLayer: string) => number;
}

export class PixiRoccoActionMenuRenderer {
  private readonly nodes = new Map<string, ActionMenuItemNode>();
  private readonly textures = new Map<string, Texture>();
  private readonly pendingTextureLoads = new Map<string, Promise<Texture>>();
  private readonly resolveRenderLayerZIndex: (renderLayer: string) => number;
  private layerRoot: Container | null = null;
  private stage: Container | null = null;
  private renderLayer = 'ui';

  constructor(options?: PixiRoccoActionMenuRendererOptions) {
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
    if (this.layerRoot) {
      this.layerRoot.parent?.removeChild(this.layerRoot);
      this.layerRoot.destroy({ children: true });
      this.layerRoot = null;
    }
    this.nodes.clear();
    this.stage = null;
  }

  sync(renderable: RoccoActionMenuRenderable | undefined): void {
    if (!this.stage) {
      return;
    }

    if (!renderable) {
      this.clearNodes();
      return;
    }

    this.renderLayer = renderable.definition.renderLayer ?? 'ui';
    const layerRoot = this.ensureLayerRoot();
    const staleIds = new Set(this.nodes.keys());

    renderable.definition.items.forEach((item, index) => {
      const node = this.ensureNode(item);
      if (node.root.parent !== layerRoot) {
        node.root.parent?.removeChild(node.root);
        layerRoot.addChild(node.root);
      }

      this.applyItemNode(node, renderable, item, index);
      staleIds.delete(item.id);
    });

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
    for (const texture of this.textures.values()) {
      texture.destroy(false);
    }
    this.textures.clear();
    this.pendingTextureLoads.clear();
  }

  async preload(renderable: RoccoActionMenuRenderable | undefined): Promise<void> {
    if (!renderable) {
      return;
    }

    await Promise.all(renderable.definition.items.map((item) => this.queueTextureLoad(item.imageUri)));
  }

  private ensureLayerRoot(): Container {
    if (!this.stage) {
      throw new Error('Action menu renderer is not mounted.');
    }

    if (this.layerRoot) {
      this.layerRoot.zIndex = this.resolveRenderLayerZIndex(this.renderLayer);
      return this.layerRoot;
    }

    const layerRoot = new Container();
    layerRoot.label = `rocco-action-menu-layer:${this.renderLayer}`;
    layerRoot.sortableChildren = true;
    layerRoot.zIndex = this.resolveRenderLayerZIndex(this.renderLayer);
    this.stage.addChild(layerRoot);
    this.layerRoot = layerRoot;
    return layerRoot;
  }

  private clearNodes(): void {
    for (const node of this.nodes.values()) {
      node.root.parent?.removeChild(node.root);
      node.root.destroy({ children: true });
    }
    this.nodes.clear();
  }

  private ensureNode(item: RoccoActionMenuItem): ActionMenuItemNode {
    const existing = this.nodes.get(item.id);
    if (existing) {
      return existing;
    }

    const root = new Container();
    root.label = `rocco-action-menu-item:${item.id}`;
    root.eventMode = 'none';

    const circle = new Graphics();
    const icon = new Sprite(Texture.EMPTY);
    icon.anchor.set(0.5);

    root.addChild(circle);
    root.addChild(icon);

    const node = {
      root,
      circle,
      icon,
      imageUri: '',
    };
    this.nodes.set(item.id, node);
    return node;
  }

  private applyItemNode(
    node: ActionMenuItemNode,
    renderable: RoccoActionMenuRenderable,
    item: RoccoActionMenuItem,
    index: number,
  ): void {
    const definition = renderable.definition;
    const state = renderable.state;
    const itemSize = definition.itemSize ?? 44;
    const hovered = state.hoveredItemId === item.id;
    const scale = hovered ? definition.hoverScale ?? 1.14 : 1;
    const position = this.resolveItemPosition(renderable, index);

    node.root.position.set(position.x, position.y);
    node.root.scale.set(scale, scale);
    node.root.alpha = 0.96;
    node.root.zIndex = hovered ? 10 : index;

    node.circle.clear();
    node.circle
      .circle(0, 0, itemSize / 2)
      .fill({ color: definition.circleFill ?? '#0f1610', alpha: 0.9 })
      .stroke({
        width: definition.circleStrokeWidth ?? 2,
        color: definition.circleStroke ?? '#d7e6c5',
        alpha: hovered ? 1 : 0.78,
      });

    if (node.imageUri !== item.imageUri) {
      node.icon.texture = this.resolveTexture(item.imageUri);
      node.imageUri = item.imageUri;
    } else {
      node.icon.texture = this.resolveTexture(item.imageUri);
    }
    node.icon.width = itemSize;
    node.icon.height = itemSize;
  }

  private resolveItemPosition(
    renderable: RoccoActionMenuRenderable,
    index: number,
  ): { x: number; y: number } {
    const definition = renderable.definition;
    const state = renderable.state;
    const count = Math.max(1, definition.items.length);
    const radius = definition.orbitRadius ?? 54;
    const speed = definition.orbitSpeedRadiansPerSecond ?? 0.35;
    const elapsedSeconds = state.elapsedMs / 1000;
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2 + elapsedSeconds * speed;
    return {
      x: state.x + Math.cos(angle) * radius,
      y: state.y + Math.sin(angle) * radius,
    };
  }

  private resolveTexture(imageUri: string): Texture {
    const cached = this.textures.get(imageUri);
    if (cached) {
      return cached;
    }

    const assetTexture = Assets.get<Texture>(imageUri);
    if (assetTexture) {
      this.textures.set(imageUri, assetTexture);
      return assetTexture;
    }

    void this.queueTextureLoad(imageUri);
    return Texture.EMPTY;
  }

  private queueTextureLoad(imageUri: string): Promise<Texture> {
    const cached = this.textures.get(imageUri);
    if (cached) {
      return Promise.resolve(cached);
    }

    const assetTexture = Assets.get<Texture>(imageUri);
    if (assetTexture) {
      this.textures.set(imageUri, assetTexture);
      return Promise.resolve(assetTexture);
    }

    const pending = this.pendingTextureLoads.get(imageUri);
    if (pending) {
      return pending;
    }

    const load = Assets.load<Texture>(imageUri)
      .then((texture) => {
        this.textures.set(imageUri, texture);
        return texture;
      })
      .catch(() => Texture.EMPTY)
      .finally(() => {
        this.pendingTextureLoads.delete(imageUri);
      });
    this.pendingTextureLoads.set(imageUri, load);
    return load;
  }
}
