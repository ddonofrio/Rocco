import { Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

import type { RoccoGridMenuDefinition, RoccoGridMenuItem, RoccoGridMenuRenderable } from './types';

interface GridMenuSlotNode {
  root: Container;
  frame: Graphics;
  icon: Sprite;
  label: Text;
  imageUri: string;
}

interface PixiRoccoGridMenuRendererOptions {
  resolveRenderLayerZIndex?: (renderLayer: string) => number;
}

const DEFAULT_COLUMNS = 3;
const DEFAULT_ROWS = 3;
const DEFAULT_SLOT_SIZE = 72;
const DEFAULT_GAP = 10;
const DEFAULT_PADDING = 18;

export class PixiRoccoGridMenuRenderer {
  private readonly slotNodes = new Map<number, GridMenuSlotNode>();
  private readonly textures = new Map<string, Texture>();
  private readonly pendingTextureLoads = new Map<string, Promise<Texture>>();
  private readonly resolveRenderLayerZIndex: (renderLayer: string) => number;
  private stage: Container | null = null;
  private layerRoot: Container | null = null;
  private panelRoot: Container | null = null;
  private panelBackground: Graphics | null = null;
  private title: Text | null = null;
  private renderLayer = 'ui';

  constructor(options?: PixiRoccoGridMenuRendererOptions) {
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
    this.clearPanel();
    this.layerRoot?.parent?.removeChild(this.layerRoot);
    this.layerRoot?.destroy({ children: true });
    this.layerRoot = null;
    this.stage = null;
  }

  sync(renderable: RoccoGridMenuRenderable | undefined): void {
    if (!this.stage) {
      return;
    }

    if (!renderable) {
      this.clearPanel();
      return;
    }

    this.renderLayer = renderable.definition.renderLayer ?? 'ui';
    const layerRoot = this.ensureLayerRoot();
    const panelRoot = this.ensurePanelRoot(layerRoot);
    this.applyPanel(panelRoot, renderable);
  }

  destroy(): void {
    this.unmount();
    for (const texture of this.textures.values()) {
      texture.destroy(false);
    }
    this.textures.clear();
    this.pendingTextureLoads.clear();
  }

  private ensureLayerRoot(): Container {
    if (!this.stage) {
      throw new Error('Grid menu renderer is not mounted.');
    }

    if (this.layerRoot) {
      this.layerRoot.zIndex = this.resolveRenderLayerZIndex(this.renderLayer);
      return this.layerRoot;
    }

    const layerRoot = new Container();
    layerRoot.label = `rocco-grid-menu-layer:${this.renderLayer}`;
    layerRoot.sortableChildren = true;
    layerRoot.zIndex = this.resolveRenderLayerZIndex(this.renderLayer);
    this.stage.addChild(layerRoot);
    this.layerRoot = layerRoot;
    return layerRoot;
  }

  private ensurePanelRoot(layerRoot: Container): Container {
    if (this.panelRoot) {
      if (this.panelRoot.parent !== layerRoot) {
        this.panelRoot.parent?.removeChild(this.panelRoot);
        layerRoot.addChild(this.panelRoot);
      }
      return this.panelRoot;
    }

    const panelRoot = new Container();
    panelRoot.label = 'rocco-grid-menu-panel';
    panelRoot.eventMode = 'none';
    layerRoot.addChild(panelRoot);
    this.panelRoot = panelRoot;

    this.panelBackground = new Graphics();
    panelRoot.addChild(this.panelBackground);
    return panelRoot;
  }

  private applyPanel(panelRoot: Container, renderable: RoccoGridMenuRenderable): void {
    const definition = renderable.definition;
    const layout = definition.layout ?? 'grid';
    const columns = definition.columns ?? DEFAULT_COLUMNS;
    const rows = definition.rows ?? DEFAULT_ROWS;
    const slotWidth = definition.slotWidth ?? definition.slotSize ?? DEFAULT_SLOT_SIZE;
    const slotHeight = definition.slotHeight ?? definition.slotSize ?? DEFAULT_SLOT_SIZE;
    const gap = definition.gap ?? DEFAULT_GAP;
    const padding = definition.padding ?? DEFAULT_PADDING;
    const titleHeight = definition.title ? 34 : 0;
    const width = columns * slotWidth + (columns - 1) * gap + padding * 2;
    const height = rows * slotHeight + (rows - 1) * gap + padding * 2 + titleHeight;

    panelRoot.position.set(definition.x ?? 0, definition.y ?? 0);
    panelRoot.zIndex = definition.zIndex ?? 100;

    this.panelBackground?.clear();
    this.panelBackground
      ?.roundRect(0, 0, width, height, 10)
      .fill({ color: definition.panelFill ?? '#10170f', alpha: 0.94 })
      .stroke({ color: definition.panelStroke ?? '#d7e6c5', width: 2, alpha: 0.9 });

    this.applyTitle(panelRoot, definition);

    const itemsBySlot = new Map<number, RoccoGridMenuItem>();
    definition.items.forEach((item, index) => {
      const slotIndex = Math.max(0, Math.floor(item.slotIndex ?? index));
      itemsBySlot.set(slotIndex, item);
    });

    const staleSlots = new Set(this.slotNodes.keys());
    const slotCount = columns * rows;
    for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
      const node = this.ensureSlotNode(panelRoot, slotIndex);
      const item = itemsBySlot.get(slotIndex);
      const column = slotIndex % columns;
      const row = Math.floor(slotIndex / columns);
      const x = padding + column * (slotWidth + gap);
      const y = padding + titleHeight + row * (slotHeight + gap);
      this.applySlotNode(node, renderable, item, slotIndex, x, y, slotWidth, slotHeight, layout);
      staleSlots.delete(slotIndex);
    }

    for (const staleSlot of staleSlots) {
      const node = this.slotNodes.get(staleSlot);
      node?.root.parent?.removeChild(node.root);
      node?.root.destroy({ children: true });
      this.slotNodes.delete(staleSlot);
    }
  }

  private applyTitle(panelRoot: Container, definition: RoccoGridMenuDefinition): void {
    if (!definition.title) {
      this.title?.parent?.removeChild(this.title);
      this.title?.destroy();
      this.title = null;
      return;
    }

    if (!this.title) {
      this.title = new Text({
        text: definition.title,
        style: {
          fill: '#d7e6c5',
          fontFamily: 'Cascadia Mono, Lucida Console, monospace',
          fontSize: 16,
          fontWeight: '700',
          letterSpacing: 2,
        },
      });
      panelRoot.addChild(this.title);
    }

    this.title.text = definition.title;
    this.title.x = definition.padding ?? DEFAULT_PADDING;
    this.title.y = 12;
  }

  private ensureSlotNode(panelRoot: Container, slotIndex: number): GridMenuSlotNode {
    const existing = this.slotNodes.get(slotIndex);
    if (existing) {
      return existing;
    }

    const root = new Container();
    root.label = `rocco-grid-menu-slot:${slotIndex}`;
    root.eventMode = 'none';
    const frame = new Graphics();
    const icon = new Sprite(Texture.WHITE);
    icon.anchor.set(0.5);
    const label = new Text({
      text: '',
      style: {
        fill: '#cbd6c0',
        fontFamily: 'Cascadia Mono, Lucida Console, monospace',
        fontSize: 10,
        align: 'center',
      },
    });
    label.anchor.set(0.5, 0);
    root.addChild(frame);
    root.addChild(icon);
    root.addChild(label);
    panelRoot.addChild(root);

    const node = {
      root,
      frame,
      icon,
      label,
      imageUri: '',
    };
    this.slotNodes.set(slotIndex, node);
    return node;
  }

  private applySlotNode(
    node: GridMenuSlotNode,
    renderable: RoccoGridMenuRenderable,
    item: RoccoGridMenuItem | undefined,
    slotIndex: number,
    x: number,
    y: number,
    slotWidth: number,
    slotHeight: number,
    layout: string,
  ): void {
    const definition = renderable.definition;
    const hovered = renderable.state.hoveredSlotIndex === slotIndex;
    const hasCarriedItem = Boolean(renderable.state.carriedItem);
    const isTextList = layout === 'text-list';
    node.root.position.set(x, y);

    node.frame.clear();
    node.frame
      .roundRect(0, 0, slotWidth, slotHeight, 6)
      .fill({
        color: definition.slotFill ?? '#182317',
        alpha: item ? 0.95 : hovered && hasCarriedItem ? 0.78 : 0.55,
      })
      .stroke({
        color: hovered ? definition.hoverStroke ?? '#8ecf6e' : definition.slotStroke ?? '#5b704f',
        width: hovered ? 3 : 1,
        alpha: hovered ? 1 : 0.82,
      });

    node.icon.visible = Boolean(item?.imageUri) && !isTextList;
    if (item?.imageUri && !isTextList) {
      node.icon.texture = this.resolveTexture(item.imageUri);
      node.imageUri = item.imageUri;
      const iconSize = Math.round(Math.min(slotWidth, slotHeight) * 0.72);
      node.icon.position.set(slotWidth / 2, slotHeight / 2 - 4);
      node.icon.width = iconSize;
      node.icon.height = iconSize;
      node.icon.alpha = item.enabled === false ? 0.45 : 1;
    } else {
      node.imageUri = '';
    }

    node.label.text = item?.label ?? '';
    node.label.visible = Boolean(item?.label);
    node.label.alpha = item?.enabled === false ? 0.5 : 1;
    if (isTextList) {
      node.label.anchor.set(0, 0.5);
      node.label.x = 16;
      node.label.y = slotHeight / 2;
      node.label.style.align = 'left';
      node.label.style.fontSize = 18;
      node.label.style.wordWrap = true;
      node.label.style.wordWrapWidth = Math.max(80, slotWidth - 32);
    } else {
      node.label.anchor.set(0.5, 0);
      node.label.x = slotWidth / 2;
      node.label.y = slotHeight - 17;
      node.label.style.align = 'center';
      node.label.style.fontSize = 10;
      node.label.style.wordWrap = false;
      node.label.style.wordWrapWidth = 0;
    }
  }

  private clearPanel(): void {
    this.panelRoot?.parent?.removeChild(this.panelRoot);
    this.panelRoot?.destroy({ children: true });
    this.panelRoot = null;
    this.panelBackground = null;
    this.title = null;
    this.slotNodes.clear();
  }

  private resolveTexture(imageUri: string): Texture {
    const cached = this.textures.get(imageUri);
    if (cached) {
      return cached;
    }

    void this.queueTextureLoad(imageUri);
    return Texture.WHITE;
  }

  private queueTextureLoad(imageUri: string): Promise<Texture> {
    const cached = this.textures.get(imageUri);
    if (cached) {
      return Promise.resolve(cached);
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
      .catch(() => Texture.WHITE)
      .finally(() => {
        this.pendingTextureLoads.delete(imageUri);
      });
    this.pendingTextureLoads.set(imageUri, load);
    return load;
  }
}
