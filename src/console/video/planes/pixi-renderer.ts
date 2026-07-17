import {
  Assets,
  Color,
  ColorMatrixFilter,
  Container,
  Graphics,
  Sprite,
  TilingSprite,
  type FederatedPointerEvent,
} from 'pixi.js';

import type { RoccoPlaneRenderer } from './renderer';
import {
  resolvePlaneWaterColorEffect,
  type WaterColorPlaneAnimation,
  updateWaterColorPlaneAnimation,
} from './pixi-water-color-animation';
import { createPixiImageNode } from './image-node';
import type {
  RoccoColorModel,
  RoccoGraphicPlane,
  RoccoImageSource,
  RoccoPlaneScene,
  RoccoProceduralSource,
  RoccoSolidSource,
  RoccoTilemapSource,
} from './types';
import { wrapValue } from './wrap';

interface PlaneNode {
  root: Container;
  content: Container;
  contrastFilter: ColorMatrixFilter | undefined;
  contrastValue: number;
  sourceKey: string;
  viewportMask?: Graphics;
  mode: PlaneRenderMode;
  wrapSpanX: number;
  wrapSpanY: number;
  waterAnimation?: WaterColorPlaneAnimation;
}

interface MountedScene {
  sceneId: string;
  host: Container;
  layerRoots: Map<string, Container>;
  planeNodes: Map<string, PlaneNode>;
}

export type RoccoProceduralGenerator = (source: RoccoProceduralSource) => Container;

interface PixiPlaneRendererOptions {
  proceduralGenerators?: Record<string, RoccoProceduralGenerator>;
  resolveRenderLayerZIndex?: (renderLayer: string) => number;
}

type PlaneRenderMode = 'static' | 'tiling' | 'wrapped-grid';

interface SourceContainerBuild {
  content: Container;
  mode: PlaneRenderMode;
  wrapSpanX: number;
  wrapSpanY: number;
  waterAnimation?: WaterColorPlaneAnimation;
}

const DEFAULT_PLANE_SIZE = { width: 960, height: 540 };

export class PixiRoccoPlaneRenderer implements RoccoPlaneRenderer {
  private readonly mountedScenes = new Map<string, MountedScene>();
  private readonly proceduralGenerators: Record<string, RoccoProceduralGenerator>;
  private readonly resolveRenderLayerZIndex: (renderLayer: string) => number;

  constructor(options?: PixiPlaneRendererOptions) {
    this.proceduralGenerators = options?.proceduralGenerators ?? {};
    this.resolveRenderLayerZIndex = options?.resolveRenderLayerZIndex ?? (() => 0);
  }

  private createPlaneNode(plane: RoccoGraphicPlane): PlaneNode {
    const root = new Container();
    const build = this.createSourceContainer(plane);
    root.addChild(build.content);
    return {
      root,
      contrastFilter: undefined,
      contrastValue: 1,
      sourceKey: this.makeSourceKey(plane),
      ...build,
    };
  }

  private ensureLayerRoot(mounted: MountedScene, renderLayer: string): Container {
    const existing = mounted.layerRoots.get(renderLayer);
    if (existing) {
      existing.zIndex = this.resolveRenderLayerZIndex(renderLayer);
      return existing;
    }

    const layerRoot = new Container();
    layerRoot.label = `rocco-plane-layer:${renderLayer}`;
    layerRoot.sortableChildren = true;
    layerRoot.zIndex = this.resolveRenderLayerZIndex(renderLayer);
    mounted.host.addChild(layerRoot);
    mounted.layerRoots.set(renderLayer, layerRoot);
    return layerRoot;
  }

  private isCompatible(node: PlaneNode, plane: RoccoGraphicPlane): boolean {
    const expected = this.expectedContentLabel(plane);
    const current = node.content.label ?? '';
    return current === expected && node.sourceKey === this.makeSourceKey(plane);
  }

  private makeSourceKey(plane: RoccoGraphicPlane): string {
    return JSON.stringify({
      source: plane.source,
      wrap: plane.wrap,
      waterColorEffect: resolvePlaneWaterColorEffect(plane)?.enabled
        ? plane.metadata?.waterColorEffect
        : undefined,
    });
  }

  private createSourceContainer(plane: RoccoGraphicPlane): SourceContainerBuild {
    switch (plane.source.kind) {
      case 'solid': {
        return this.createSolidNode(plane, plane.source);
      }
      case 'image': {
        return createPixiImageNode(plane, plane.source, {
          resolvePlaneSize: (currentPlane) => this.resolvePlaneSize(currentPlane),
          applyImageSourceSize: (sprite, currentSource) =>
            this.applyImageSourceSize(sprite, currentSource),
        });
      }
      case 'tilemap': {
        return this.createTilemapNode(plane, plane.source);
      }
      case 'procedural': {
        return this.createProceduralNode(plane, plane.source);
      }
      default: {
        return {
          content: this.createPlaceholderNode(plane.source.kind),
          mode: 'static',
          wrapSpanX: 0,
          wrapSpanY: 0,
        };
      }
    }
  }

  private createSolidNode(
    plane: RoccoGraphicPlane,
    source: RoccoSolidSource,
  ): SourceContainerBuild {
    const size = this.resolvePlaneSize(plane);
    const graphics = new Graphics().rect(0, 0, size.width, size.height).fill(source.color);
    graphics.label = 'solid';
    const container = new Container();
    container.label = 'solid';
    container.addChild(graphics);
    return {
      content: container,
      mode: 'static',
      wrapSpanX: 0,
      wrapSpanY: 0,
    };
  }

  private createTilemapNode(
    plane: RoccoGraphicPlane,
    tilemap: RoccoTilemapSource,
  ): SourceContainerBuild {
    const mapWidth = tilemap.width * tilemap.tileWidth;
    const mapHeight = tilemap.height * tilemap.tileHeight;
    const shouldWrap = plane.wrap.x || plane.wrap.y;
    const container = shouldWrap
      ? this.createRepeatedPatternContainer(
          () => this.buildTilemapPattern(tilemap),
          mapWidth,
          mapHeight,
        )
      : this.buildTilemapPattern(tilemap);
    container.label = shouldWrap ? 'tilemap-wrap' : 'tilemap';

    return {
      content: container,
      mode: shouldWrap ? 'wrapped-grid' : 'static',
      wrapSpanX: mapWidth,
      wrapSpanY: mapHeight,
    };
  }

  private createProceduralNode(
    plane: RoccoGraphicPlane,
    source: RoccoProceduralSource,
  ): SourceContainerBuild {
    const spanX = this.resolveProceduralSpan(source, 'x');
    const spanY = this.resolveProceduralSpan(source, 'y');
    const shouldWrap = plane.wrap.x || plane.wrap.y;

    const content = shouldWrap
      ? this.createRepeatedPatternContainer(() => this.buildProceduralPattern(source), spanX, spanY)
      : this.buildProceduralPattern(source);
    content.label = shouldWrap ? 'procedural-wrap' : 'procedural';

    return {
      content,
      mode: shouldWrap ? 'wrapped-grid' : 'static',
      wrapSpanX: spanX,
      wrapSpanY: spanY,
    };
  }

  private createPlaceholderNode(kind: string): Container {
    const container = new Container();
    container.label = kind;
    const placeholder = new Graphics()
      .roundRect(0, 0, 220, 120, 10)
      .fill('#532d2f')
      .stroke({ width: 2, color: '#d4645f' });
    container.addChild(placeholder);
    return container;
  }

  private applyPlaneNode(plane: RoccoGraphicPlane, node: PlaneNode): void {
    const { root, content } = node;
    root.visible = plane.enabled && plane.visible;
    root.alpha = Math.max(0, Math.min(1, plane.opacity));
    root.zIndex = plane.priority;
    content.blendMode = plane.blendMode ?? 'normal';

    root.position.set(plane.transform.x, plane.transform.y);
    root.scale.set(plane.transform.scaleX, plane.transform.scaleY);
    root.rotation = plane.transform.rotation ?? 0;

    const parallaxX = plane.parallax?.x ?? 1;
    const parallaxY = plane.parallax?.y ?? 1;
    const rawScrollX = plane.scroll.x * parallaxX;
    const rawScrollY = plane.scroll.y * parallaxY;
    const wrappedScrollX = plane.wrap.x ? wrapValue(rawScrollX, node.wrapSpanX) : rawScrollX;
    const wrappedScrollY = plane.wrap.y ? wrapValue(rawScrollY, node.wrapSpanY) : rawScrollY;

    if (node.mode === 'tiling') {
      content.position.set(0, 0);
    } else if (node.mode === 'wrapped-grid') {
      content.position.set(-wrappedScrollX, -wrappedScrollY);
    } else {
      content.position.set(-rawScrollX, -rawScrollY);
    }

    this.applyColorModel(content, plane.colorModel);
    this.applyContrast(node, plane.contrast);
    this.applyViewport(root, node, plane);

    const firstChild = content.children.at(0);
    if (node.mode === 'tiling' && firstChild instanceof TilingSprite) {
      firstChild.tilePosition.set(wrappedScrollX, wrappedScrollY);
    }
  }

  private applyColorModel(container: Container, colorModel: RoccoColorModel): void {
    container.tint = 0xff_ff_ff;
    container.alpha = 1;
    if (colorModel.kind !== 'tint') {
      return;
    }

    container.tint = this.toColorNumber(colorModel.color);
    container.alpha *= Math.max(0, Math.min(1, colorModel.strength));
  }

  private applyContrast(node: PlaneNode, contrast?: number): void {
    if (!Number.isFinite(contrast) || Math.abs((contrast ?? 1) - 1) < 0.001) {
      node.content.filters = undefined;
      node.contrastFilter = undefined;
      node.contrastValue = 1;
      return;
    }

    const resolvedContrast = contrast as number;
    const filter = node.contrastFilter ?? new ColorMatrixFilter();
    if (!node.contrastFilter || Math.abs(node.contrastValue - resolvedContrast) >= 0.001) {
      filter.contrast(resolvedContrast - 1, false);
      node.contrastFilter = filter;
      node.contrastValue = resolvedContrast;
    }

    if (node.content.filters?.[0] !== filter || node.content.filters.length !== 1) {
      node.content.filters = [filter];
    }
  }

  private applyViewport(root: Container, node: PlaneNode, plane: RoccoGraphicPlane): void {
    if (!plane.viewport) {
      if (node.viewportMask) {
        node.viewportMask.removeFromParent();
        node.viewportMask.destroy();
        node.viewportMask = undefined;
      }
      // Pixi uses `null` to clear a container mask.
      root.mask = null;
      return;
    }

    const mask = node.viewportMask ?? new Graphics();
    mask
      .clear()
      .rect(plane.viewport.x, plane.viewport.y, plane.viewport.width, plane.viewport.height)
      .fill('white');
    node.viewportMask = mask;
    if (!mask.parent) {
      root.addChild(mask);
    }
    root.mask = mask;
  }

  private resolvePlaneSize(plane: RoccoGraphicPlane): { width: number; height: number } {
    if (plane.viewport) {
      return { width: plane.viewport.width, height: plane.viewport.height };
    }

    if (plane.source.kind === 'image') {
      return {
        width: plane.source.width ?? DEFAULT_PLANE_SIZE.width,
        height: plane.source.height ?? DEFAULT_PLANE_SIZE.height,
      };
    }

    if (plane.source.kind === 'bitmap') {
      return { width: plane.source.width, height: plane.source.height };
    }

    return { ...DEFAULT_PLANE_SIZE };
  }

  private expectedContentLabel(plane: RoccoGraphicPlane): string {
    if (
      plane.source.kind === 'image' &&
      resolvePlaneWaterColorEffect(plane) &&
      !plane.wrap.x &&
      !plane.wrap.y
    ) {
      return 'image-water-color';
    }
    if (plane.source.kind === 'image' && (plane.wrap.x || plane.wrap.y)) {
      return 'image-wrap';
    }
    if (plane.source.kind === 'tilemap' && (plane.wrap.x || plane.wrap.y)) {
      return 'tilemap-wrap';
    }
    if (plane.source.kind === 'procedural' && (plane.wrap.x || plane.wrap.y)) {
      return 'procedural-wrap';
    }
    return plane.source.kind;
  }

  private buildTilemapPattern(tilemap: RoccoTilemapSource): Container {
    const container = new Container();
    container.label = 'tilemap-pattern';

    const base = new Graphics()
      .rect(0, 0, tilemap.width * tilemap.tileWidth, tilemap.height * tilemap.tileHeight)
      .fill('#0f1715')
      .stroke({ width: 1, color: '#415a44' });
    container.addChild(base);

    for (let y = 0; y < tilemap.height; y += 1) {
      this.addTilemapPatternRow(container, tilemap, y);
    }

    return container;
  }

  private addTilemapPatternRow(container: Container, tilemap: RoccoTilemapSource, y: number): void {
    for (let x = 0; x < tilemap.width; x += 1) {
      const cell = tilemap.cells[y * tilemap.width + x];
      if (!cell) {
        continue;
      }

      const tile = new Graphics()
        .rect(x * tilemap.tileWidth, y * tilemap.tileHeight, tilemap.tileWidth, tilemap.tileHeight)
        .fill('#8a6841')
        .stroke({ width: 1, color: '#2f2417' });
      tile.alpha = cell.priority === undefined ? 0.85 : Math.min(1, 0.5 + cell.priority * 0.05);
      container.addChild(tile);
    }
  }

  private buildProceduralPattern(source: RoccoProceduralSource): Container {
    const generator = this.proceduralGenerators[source.generatorId];
    if (!generator) {
      return this.createPlaceholderNode('procedural');
    }
    return generator(source);
  }

  private resolveProceduralSpan(source: RoccoProceduralSource, axis: 'x' | 'y'): number {
    const key = axis === 'x' ? 'width' : 'height';
    const fallback = axis === 'x' ? DEFAULT_PLANE_SIZE.width : DEFAULT_PLANE_SIZE.height;
    const value = Number(source.params?.[key] ?? fallback);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private createRepeatedPatternContainer(
    createPattern: () => Container,
    spanX: number,
    spanY: number,
  ): Container {
    if (spanX <= 0 || spanY <= 0) {
      return createPattern();
    }

    const container = new Container();
    for (let iy = -1; iy <= 1; iy += 1) {
      for (let ix = -1; ix <= 1; ix += 1) {
        const pattern = createPattern();
        pattern.position.set(ix * spanX, iy * spanY);
        container.addChild(pattern);
      }
    }
    return container;
  }

  private toColorNumber(value: string): number {
    try {
      return new Color(value).toNumber();
    } catch {
      return 0xff_ff_ff;
    }
  }

  private applyImageSourceSize(sprite: Sprite, source: RoccoImageSource): void {
    if (source.width) {
      sprite.width = source.width;
    }
    if (source.height) {
      sprite.height = source.height;
    }
  }

  async preloadScene(scene: RoccoPlaneScene): Promise<void> {
    const uris = new Set<string>();
    for (const plane of scene.planes) {
      if (plane.source.kind === 'image') {
        uris.add(plane.source.uri);
      } else if (plane.source.kind === 'tileset') {
        uris.add(plane.source.imageUri);
      }
    }

    await Promise.all([...uris].map((uri) => Assets.load(uri)));
  }

  mount(sceneId: string, container: Container): void {
    this.unmount(sceneId);

    this.mountedScenes.set(sceneId, {
      sceneId,
      host: container,
      layerRoots: new Map(),
      planeNodes: new Map(),
    });
  }

  unmount(sceneId: string): void {
    const mounted = this.mountedScenes.get(sceneId);
    if (!mounted) {
      return;
    }

    for (const layerRoot of mounted.layerRoots.values()) {
      layerRoot.removeFromParent();
      layerRoot.destroy({ children: true });
    }
    this.mountedScenes.delete(sceneId);
  }

  sync(scene: RoccoPlaneScene): void {
    const mounted = this.mountedScenes.get(scene.id);
    if (!mounted) {
      return;
    }

    const stalePlaneIds = new Set(mounted.planeNodes.keys());
    for (const plane of scene.planes) {
      let node = mounted.planeNodes.get(plane.id);
      const layerRoot = this.ensureLayerRoot(mounted, plane.renderLayer ?? 'background.main');
      if (!node) {
        node = this.createPlaneNode(plane);
        mounted.planeNodes.set(plane.id, node);
        layerRoot.addChild(node.root);
      } else if (!this.isCompatible(node, plane)) {
        node.root.removeFromParent();
        node.root.destroy({ children: true });
        node = this.createPlaneNode(plane);
        mounted.planeNodes.set(plane.id, node);
        layerRoot.addChild(node.root);
      } else if (node.root.parent !== layerRoot) {
        node.root.removeFromParent();
        layerRoot.addChild(node.root);
      }

      this.applyPlaneNode(plane, node);
      stalePlaneIds.delete(plane.id);
    }

    for (const staleId of stalePlaneIds) {
      const staleNode = mounted.planeNodes.get(staleId);
      if (!staleNode) {
        continue;
      }
      staleNode.root.removeFromParent();
      staleNode.root.destroy({ children: true });
      mounted.planeNodes.delete(staleId);
    }
  }

  render(delta: number): void {
    const deltaMs = Math.max(0, delta) * (1000 / 60);
    for (const mounted of this.mountedScenes.values()) {
      for (const node of mounted.planeNodes.values()) {
        updateWaterColorPlaneAnimation(node.waterAnimation, deltaMs);
      }
    }
  }

  destroy(): void {
    for (const sceneId of this.mountedScenes.keys()) {
      this.unmount(sceneId);
    }
  }
}

export function createProceduralStarField(source: RoccoProceduralSource): Container {
  const container = new Container();
  container.label = 'procedural';

  const seed = Number(source.params?.seed ?? 1);
  const starCount = Number(source.params?.starCount ?? 80);
  const width = Number(source.params?.width ?? 960);
  const height = Number(source.params?.height ?? 540);

  const random = mulberry32(seed);
  const stars = new Graphics();
  for (let index = 0; index < starCount; index += 1) {
    const x = Math.floor(random() * width);
    const y = Math.floor(random() * height);
    const radius = Math.max(1, Math.floor(random() * 2));
    stars.circle(x, y, radius).fill('#dce5ef');
  }

  container.addChild(stars);
  return container;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d_2b_79_f5;
    let value = Math.imul(t ^ (t >>> 15), t | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function makeDraggablePlaneRoot(root: Container): void {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  root.eventMode = 'static';

  root.on('pointerdown', (event: FederatedPointerEvent) => {
    isDragging = true;
    offsetX = event.global.x - root.x;
    offsetY = event.global.y - root.y;
  });

  root.on('pointermove', (event: FederatedPointerEvent) => {
    if (!isDragging) {
      return;
    }

    root.position.set(event.global.x - offsetX, event.global.y - offsetY);
  });

  root.on('pointerup', () => {
    isDragging = false;
  });
  root.on('pointerupoutside', () => {
    isDragging = false;
  });
}
