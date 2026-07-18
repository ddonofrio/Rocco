import { Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

import type {
  RoccoGridMenuButton,
  RoccoGridMenuDefinition,
  RoccoGridMenuLineDecoration,
  RoccoGridMenuRenderable,
  RoccoGridMenuTextDecoration,
} from './types';
import {
  DEFAULT_BUTTON_GAP,
  DEFAULT_BUTTON_HEIGHT,
  DEFAULT_COLUMNS,
  DEFAULT_GAP,
  DEFAULT_PADDING,
  DEFAULT_ROWS,
  DEFAULT_SLOT_SIZE,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  resolveColumnOffsets,
  resolveDefinitionHeaderHeight,
  resolveDefinitionTitleHeight,
} from './definition';
import { resolveGridMenuPanelBounds } from './geometry';
import { applyGridMenuPanelSlots, type GridMenuSlotNode } from './slot-renderer';

interface GridMenuButtonNode {
  root: Container;
  frame: Graphics;
  label: Text;
}

interface PixiRoccoGridMenuRendererOptions {
  resolveRenderLayerZIndex?: (renderLayer: string) => number;
}

export class PixiRoccoGridMenuRenderer {
  private readonly slotNodes = new Map<number, GridMenuSlotNode>();
  private readonly buttonNodes = new Map<number, GridMenuButtonNode>();
  private readonly textures = new Map<string, Texture>();
  private readonly pendingTextureLoads = new Map<string, Promise<Texture>>();
  private readonly resolveRenderLayerZIndex: (renderLayer: string) => number;
  private stage: Container | undefined;
  private layerRoot: Container | undefined;
  private backdrop: Graphics | undefined;
  private panelRoot: Container | undefined;
  private panelBackground: Graphics | undefined;
  private decorationRoot: Container | undefined;
  private title: Text | undefined;
  private renderLayer = 'ui';

  constructor(options?: PixiRoccoGridMenuRendererOptions) {
    this.resolveRenderLayerZIndex = options?.resolveRenderLayerZIndex ?? (() => 0);
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
        this.panelRoot.removeFromParent();
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
    this.decorationRoot = new Container();
    this.decorationRoot.label = 'rocco-grid-menu-decorations';
    panelRoot.addChild(this.decorationRoot);
    return panelRoot;
  }

  private applyBackdrop(layerRoot: Container, renderable: RoccoGridMenuRenderable): void {
    const definition = renderable.definition;
    if (!this.backdrop) {
      this.backdrop = new Graphics();
      this.backdrop.label = 'rocco-grid-menu-backdrop';
      this.backdrop.zIndex = 0;
      layerRoot.addChild(this.backdrop);
    } else if (this.backdrop.parent !== layerRoot) {
      this.backdrop.removeFromParent();
      layerRoot.addChild(this.backdrop);
    }

    this.backdrop.clear();
    const alpha = definition.backdropAlpha ?? 0;
    if (alpha <= 0) {
      return;
    }

    this.backdrop
      .rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
      .fill(Object.assign({}, { color: definition.backdropFill ?? '#000000', alpha }));
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
    const buttonHeight = definition.buttonHeight ?? DEFAULT_BUTTON_HEIGHT;
    const buttonGap = definition.buttonGap ?? DEFAULT_BUTTON_GAP;
    const headerHeight = resolveDefinitionHeaderHeight(definition);
    const titleHeight = resolveDefinitionTitleHeight(definition);
    const columnOffsets = resolveColumnOffsets(columns, definition.columnOffsets);
    const slotSectionHeight = rows * slotHeight + (rows - 1) * gap;
    const panelBounds = resolveGridMenuPanelBounds(definition);

    panelRoot.position.set(definition.x ?? 0, definition.y ?? 0);
    panelRoot.zIndex = definition.zIndex ?? 100;

    this.applyPanelBackground(definition, panelBounds.width, panelBounds.height);

    this.applyTitle(panelRoot, definition);
    this.applyDecorations(definition);

    applyGridMenuPanelSlots({
      panelRoot,
      renderable,
      columns,
      columnOffsets,
      slotCount: columns * rows,
      padding,
      headerHeight,
      titleHeight,
      slotWidth,
      slotHeight,
      gap,
      layout,
      slotNodes: this.slotNodes,
      ensureSlotNode: (root, slotIndex) => this.ensureSlotNode(root, slotIndex),
      resolveTexture: (imageUri) => this.resolveTexture(imageUri),
    });

    this.applyButtons(
      panelRoot,
      renderable,
      panelBounds.width,
      slotSectionHeight,
      titleHeight,
      padding,
      buttonHeight,
      buttonGap,
    );
  }

  private applyPanelBackground(
    definition: RoccoGridMenuDefinition,
    width: number,
    height: number,
  ): void {
    this.panelBackground?.clear();
    const panelFillAlpha = definition.panelFillAlpha ?? 0.94;
    const panelStrokeAlpha = definition.panelStrokeAlpha ?? 0.9;
    if (panelFillAlpha <= 0 && panelStrokeAlpha <= 0) {
      return;
    }

    const background = this.panelBackground?.roundRect(0, 0, width, height, 10);
    if (panelFillAlpha > 0) {
      background?.fill({ color: definition.panelFill ?? '#10170f', alpha: panelFillAlpha });
    }
    if (panelStrokeAlpha > 0) {
      background?.stroke({
        color: definition.panelStroke ?? '#d7e6c5',
        width: 2,
        alpha: panelStrokeAlpha,
      });
    }
  }

  private applyTitle(panelRoot: Container, definition: RoccoGridMenuDefinition): void {
    if (!definition.title || definition.showTitle === false) {
      this.title?.removeFromParent();
      this.title?.destroy();
      this.title = undefined;
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

  private applyDecorations(definition: RoccoGridMenuDefinition): void {
    if (!this.decorationRoot) {
      return;
    }

    const children = this.decorationRoot.removeChildren();
    for (const child of children) {
      child.destroy({ children: true });
    }

    const lineDecorations = definition.lineDecorations ?? [];
    for (const line of lineDecorations) {
      this.decorationRoot.addChild(this.createLineDecorationNode(line));
    }

    const textDecorations = definition.textDecorations ?? [];
    for (const decoration of textDecorations) {
      this.decorationRoot.addChild(this.createTextDecorationNode(decoration));
    }
  }

  private createLineDecorationNode(decoration: RoccoGridMenuLineDecoration): Graphics {
    const node = new Graphics();
    node.label = decoration.id;
    node
      .moveTo(decoration.x1, decoration.y1)
      .lineTo(decoration.x2, decoration.y2)
      .stroke({
        color: decoration.color ?? '#5b704f',
        width: decoration.width ?? 1,
        alpha: decoration.alpha ?? 0.9,
      });
    return node;
  }

  private createTextDecorationNode(decoration: RoccoGridMenuTextDecoration): Text {
    const node = new Text({
      text: decoration.text,
      style: {
        fill: decoration.fill ?? '#d7e6c5',
        fontFamily: 'Cascadia Mono, Lucida Console, monospace',
        fontSize: decoration.fontSize ?? 16,
        fontWeight: decoration.fontWeight ?? 'bold',
        align: decoration.align ?? 'center',
        letterSpacing: decoration.letterSpacing ?? 1,
      },
    });
    node.label = decoration.id;
    node.alpha = decoration.alpha ?? 1;
    node.anchor.set(decoration.anchor?.x ?? 0.5, decoration.anchor?.y ?? 0.5);
    node.position.set(decoration.x, decoration.y);
    return node;
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
    const icon = new Sprite(Texture.EMPTY);
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

  private ensureButtonNode(panelRoot: Container, buttonIndex: number): GridMenuButtonNode {
    const existing = this.buttonNodes.get(buttonIndex);
    if (existing) {
      return existing;
    }

    const root = new Container();
    root.label = `rocco-grid-menu-button:${buttonIndex}`;
    root.eventMode = 'none';
    const frame = new Graphics();
    const label = new Text({
      text: '',
      style: {
        fill: '#d7e6c5',
        fontFamily: 'Cascadia Mono, Lucida Console, monospace',
        fontSize: 16,
        fontWeight: '700',
        align: 'center',
      },
    });
    label.anchor.set(0.5);
    root.addChild(frame);
    root.addChild(label);
    panelRoot.addChild(root);

    const node = {
      root,
      frame,
      label,
    };
    this.buttonNodes.set(buttonIndex, node);
    return node;
  }

  private applyButtons(
    panelRoot: Container,
    renderable: RoccoGridMenuRenderable,
    panelWidth: number,
    slotSectionHeight: number,
    titleHeight: number,
    padding: number,
    buttonHeight: number,
    buttonGap: number,
  ): void {
    const buttons = renderable.definition.buttons ?? [];
    const staleButtons = new Set(this.buttonNodes.keys());

    if (buttons.length === 0) {
      this.clearButtonNodes(staleButtons);
      return;
    }

    const innerWidth = panelWidth - padding * 2;
    const totalGapWidth = Math.max(0, buttons.length - 1) * buttonGap;
    const buttonWidth = Math.max(44, (innerWidth - totalGapWidth) / buttons.length);
    const buttonY = padding + titleHeight + slotSectionHeight + buttonGap;

    for (const [index, button] of buttons.entries()) {
      const node = this.ensureButtonNode(panelRoot, index);
      const buttonX = padding + index * (buttonWidth + buttonGap);
      this.applyButtonNode(node, renderable, button, buttonX, buttonY, buttonWidth, buttonHeight);
      staleButtons.delete(index);
    }

    this.clearButtonNodes(staleButtons);
  }

  private applyButtonNode(
    node: GridMenuButtonNode,
    renderable: RoccoGridMenuRenderable,
    button: RoccoGridMenuButton,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const isHovered = renderable.state.hoveredButtonId === button.id;
    const isEnabled = this.isButtonEnabled(button, renderable);
    node.root.position.set(x, y);

    node.frame.clear();
    node.frame
      .roundRect(0, 0, width, height, 8)
      .fill(
        Object.assign(
          {},
          {
            color: '#101810',
            alpha: isEnabled ? 0.9 : 0.42,
          },
        ),
      )
      .stroke({
        color: isHovered && isEnabled ? '#8ecf6e' : '#d7e6c5',
        width: isHovered && isEnabled ? 3 : 2,
        alpha: isEnabled ? 0.95 : 0.45,
      });

    node.label.text = button.label;
    node.label.x = width / 2;
    node.label.y = height / 2;
    node.label.alpha = isEnabled ? 1 : 0.45;
  }

  private isButtonEnabled(
    button: RoccoGridMenuButton,
    renderable: RoccoGridMenuRenderable,
  ): boolean {
    if (button.enabled === false) {
      return false;
    }

    if (button.requiresCarriedItem && !renderable.state.carriedItem) {
      return false;
    }

    return true;
  }

  private clearButtonNodes(buttonIndexes: Set<number>): void {
    for (const buttonIndex of buttonIndexes) {
      const node = this.buttonNodes.get(buttonIndex);
      node?.root.removeFromParent();
      node?.root.destroy({ children: true });
      this.buttonNodes.delete(buttonIndex);
    }
  }

  private clearPanel(): void {
    this.backdrop?.removeFromParent();
    this.backdrop?.destroy();
    this.backdrop = undefined;
    this.panelRoot?.removeFromParent();
    this.panelRoot?.destroy({ children: true });
    this.panelRoot = undefined;
    this.panelBackground = undefined;
    this.decorationRoot = undefined;
    this.title = undefined;
    this.slotNodes.clear();
    this.buttonNodes.clear();
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

    const load = (async (): Promise<Texture> => {
      try {
        const texture = await Assets.load<Texture>(imageUri);
        this.textures.set(imageUri, texture);
        return texture;
      } catch {
        return Texture.EMPTY;
      } finally {
        this.pendingTextureLoads.delete(imageUri);
      }
    })();
    this.pendingTextureLoads.set(imageUri, load);
    return load;
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
    this.layerRoot?.removeFromParent();
    this.layerRoot?.destroy({ children: true });
    this.layerRoot = undefined;
    this.stage = undefined;
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
    this.applyBackdrop(layerRoot, renderable);
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
}
