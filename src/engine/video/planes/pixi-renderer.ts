import {
  Assets,
  Color,
  Container,
  Graphics,
  Sprite,
  Texture,
  TilingSprite,
  type FederatedPointerEvent,
} from 'pixi.js';

import type { RoccoPlaneRenderer } from './renderer';
import {
  loadRoccoImageElement,
  matchesRoccoColorKey,
  resolveRoccoWaterColorEffect,
  type RoccoResolvedWaterColorEffect,
  type RoccoWaterColorRgb,
} from '../post-processing';
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
const WATER_ROW_SLICE_HEIGHT = 2;

interface WaterColorPlaneAnimation {
  ready: boolean;
  elapsedMs: number;
  effect: RoccoResolvedWaterColorEffect;
  width: number;
  height: number;
  sourceCanvas?: HTMLCanvasElement;
  frameCanvas?: HTMLCanvasElement;
  frameContext?: CanvasRenderingContext2D;
  texture?: Texture;
}

export class PixiRoccoPlaneRenderer implements RoccoPlaneRenderer {
  private readonly mountedScenes = new Map<string, MountedScene>();
  private readonly proceduralGenerators: Record<string, RoccoProceduralGenerator>;
  private readonly resolveRenderLayerZIndex: (renderLayer: string) => number;

  constructor(options?: PixiPlaneRendererOptions) {
    this.proceduralGenerators = options?.proceduralGenerators ?? {};
    this.resolveRenderLayerZIndex = options?.resolveRenderLayerZIndex ?? (() => 0);
  }

  async preloadScene(scene: RoccoPlaneScene): Promise<void> {
    const uris = new Set<string>();
    for (const plane of scene.planes) {
      if (plane.source.kind === 'image') {
        uris.add(plane.source.uri);
      }
      if (plane.source.kind === 'tileset') {
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
      mounted.host.removeChild(layerRoot);
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
        node.root.parent?.removeChild(node.root);
        node.root.destroy({ children: true });
        node = this.createPlaneNode(plane);
        mounted.planeNodes.set(plane.id, node);
        layerRoot.addChild(node.root);
      } else if (node.root.parent !== layerRoot) {
        node.root.parent?.removeChild(node.root);
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
      staleNode.root.parent?.removeChild(staleNode.root);
      staleNode.root.destroy({ children: true });
      mounted.planeNodes.delete(staleId);
    }
  }

  render(delta: number): void {
    const deltaMs = Math.max(0, delta) * (1000 / 60);
    for (const mounted of this.mountedScenes.values()) {
      for (const node of mounted.planeNodes.values()) {
        this.updateWaterAnimation(node.waterAnimation, deltaMs);
      }
    }
  }

  destroy(): void {
    const ids = [...this.mountedScenes.keys()];
    for (const sceneId of ids) {
      this.unmount(sceneId);
    }
  }

  private createPlaneNode(plane: RoccoGraphicPlane): PlaneNode {
    const root = new Container();
    const build = this.createSourceContainer(plane);
    root.addChild(build.content);
    return { root, sourceKey: this.makeSourceKey(plane), ...build };
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
      waterColorEffect: this.resolveWaterColorEffect(plane)?.enabled
        ? plane.metadata?.waterColorEffect
        : null,
    });
  }

  private createSourceContainer(plane: RoccoGraphicPlane): SourceContainerBuild {
    switch (plane.source.kind) {
      case 'solid':
        return this.createSolidNode(plane, plane.source);
      case 'image':
        return this.createImageNode(plane, plane.source);
      case 'tilemap':
        return this.createTilemapNode(plane, plane.source);
      case 'procedural':
        return this.createProceduralNode(plane, plane.source);
      case 'bitmap':
      case 'tileset':
      default:
        return {
          content: this.createPlaceholderNode(plane.source.kind),
          mode: 'static',
          wrapSpanX: 0,
          wrapSpanY: 0,
        };
    }
  }

  private createSolidNode(plane: RoccoGraphicPlane, source: RoccoSolidSource): SourceContainerBuild {
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

  private createImageNode(plane: RoccoGraphicPlane, source: RoccoImageSource): SourceContainerBuild {
    const size = this.resolvePlaneSize(plane);
    const waterEffect = this.resolveWaterColorEffect(plane);
    const container = new Container();

    if (waterEffect && !plane.wrap.x && !plane.wrap.y) {
      container.label = 'image-water-color';
      const original = Sprite.from(source.uri);
      this.applyImageSourceSize(original, source);
      container.addChild(original);

      const waterAnimation: WaterColorPlaneAnimation = {
        ready: false,
        elapsedMs: 0,
        effect: waterEffect,
        width: source.width ?? 0,
        height: source.height ?? 0,
      };

      void this.prepareWaterColorImageNode(source, waterEffect).then((prepared) => {
        if (container.destroyed) {
          return;
        }

        waterAnimation.ready = true;
        waterAnimation.width = prepared.width;
        waterAnimation.height = prepared.height;
        waterAnimation.sourceCanvas = prepared.waterSourceCanvas;
        waterAnimation.frameCanvas = prepared.waterFrameCanvas;
        waterAnimation.frameContext = prepared.waterFrameContext;
        waterAnimation.texture = prepared.waterTexture;

        original.parent?.removeChild(original);
        container.addChild(prepared.baseSprite);
        container.addChild(prepared.waterSprite);
      });

      return {
        content: container,
        mode: 'static',
        wrapSpanX: 0,
        wrapSpanY: 0,
        waterAnimation,
      };
    }

    if (plane.wrap.x || plane.wrap.y) {
      container.label = 'image-wrap';
      const tiling = new TilingSprite({
        texture: Texture.from(source.uri),
        width: size.width,
        height: size.height,
      });
      tiling.label = 'image-wrap';
      container.addChild(tiling);
      return {
        content: container,
        mode: 'tiling',
        wrapSpanX: source.width ?? size.width,
        wrapSpanY: source.height ?? size.height,
      };
    }

    container.label = 'image';
    const sprite = Sprite.from(source.uri);
    this.applyImageSourceSize(sprite, source);
    sprite.label = 'image';
    container.addChild(sprite);
    return {
      content: container,
      mode: 'static',
      wrapSpanX: 0,
      wrapSpanY: 0,
    };
  }

  private createTilemapNode(plane: RoccoGraphicPlane, tilemap: RoccoTilemapSource): SourceContainerBuild {
    const mapWidth = tilemap.width * tilemap.tileWidth;
    const mapHeight = tilemap.height * tilemap.tileHeight;
    const shouldWrap = plane.wrap.x || plane.wrap.y;
    const container = shouldWrap
      ? this.createRepeatedPatternContainer(() => this.buildTilemapPattern(tilemap), mapWidth, mapHeight)
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
    this.applyViewport(root, node, plane);

    if (node.mode === 'tiling' && content.children[0] instanceof TilingSprite) {
      const tiling = content.children[0] as TilingSprite;
      tiling.tilePosition.set(wrappedScrollX, wrappedScrollY);
    }
  }

  private applyColorModel(container: Container, colorModel: RoccoColorModel): void {
    container.tint = 0xffffff;
    container.alpha = 1;
    if (colorModel.kind !== 'tint') {
      return;
    }

    container.tint = this.toColorNumber(colorModel.color);
    container.alpha *= Math.max(0, Math.min(1, colorModel.strength));
  }

  private applyViewport(root: Container, node: PlaneNode, plane: RoccoGraphicPlane): void {
    if (!plane.viewport) {
      if (node.viewportMask) {
        root.removeChild(node.viewportMask);
        node.viewportMask.destroy();
        node.viewportMask = undefined;
      }
      root.mask = null;
      return;
    }

    const mask = node.viewportMask ?? new Graphics();
    mask.clear().rect(plane.viewport.x, plane.viewport.y, plane.viewport.width, plane.viewport.height).fill('white');
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
    if (plane.source.kind === 'image' && this.resolveWaterColorEffect(plane) && !plane.wrap.x && !plane.wrap.y) {
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
      for (let x = 0; x < tilemap.width; x += 1) {
        const cell = tilemap.cells[y * tilemap.width + x];
        if (!cell) {
          continue;
        }

        const tile = new Graphics()
          .rect(x * tilemap.tileWidth, y * tilemap.tileHeight, tilemap.tileWidth, tilemap.tileHeight)
          .fill('#8a6841')
          .stroke({ width: 1, color: '#2f2417' });
        tile.alpha = cell.priority !== undefined ? Math.min(1, 0.5 + cell.priority * 0.05) : 0.85;
        container.addChild(tile);
      }
    }

    return container;
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
      return 0xffffff;
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

  private resolveWaterColorEffect(plane: RoccoGraphicPlane): RoccoResolvedWaterColorEffect | null {
    const rawEffect = plane.metadata?.waterColorEffect;
    if (!rawEffect || typeof rawEffect !== 'object') {
      return null;
    }

    const resolved = resolveRoccoWaterColorEffect(rawEffect);
    return resolved.enabled ? resolved : null;
  }

  private async prepareWaterColorImageNode(
    source: RoccoImageSource,
    effect: RoccoResolvedWaterColorEffect,
  ): Promise<{
    width: number;
    height: number;
    baseSprite: Sprite;
    waterSprite: Sprite;
    waterSourceCanvas: HTMLCanvasElement;
    waterFrameCanvas: HTMLCanvasElement;
    waterFrameContext: CanvasRenderingContext2D;
    waterTexture: Texture;
  }> {
    const image = await loadRoccoImageElement(source.uri);
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const baseCanvas = document.createElement('canvas');
    const waterSourceCanvas = document.createElement('canvas');
    const waterFrameCanvas = document.createElement('canvas');
    baseCanvas.width = width;
    baseCanvas.height = height;
    waterSourceCanvas.width = width;
    waterSourceCanvas.height = height;
    waterFrameCanvas.width = width;
    waterFrameCanvas.height = height;

    const baseContext = baseCanvas.getContext('2d', { willReadFrequently: true });
    const waterSourceContext = waterSourceCanvas.getContext('2d', { willReadFrequently: true });
    const waterFrameContext = waterFrameCanvas.getContext('2d');
    if (!baseContext || !waterSourceContext || !waterFrameContext) {
      const fallbackSprite = Sprite.from(source.uri);
      this.applyImageSourceSize(fallbackSprite, source);
      return {
        width,
        height,
        baseSprite: fallbackSprite,
        waterSprite: new Sprite(Texture.EMPTY),
        waterSourceCanvas,
        waterFrameCanvas,
        waterFrameContext: waterFrameContext ?? document.createElement('canvas').getContext('2d')!,
        waterTexture: Texture.EMPTY,
      };
    }

    baseContext.drawImage(image, 0, 0);
    waterSourceContext.drawImage(image, 0, 0);

    const baseImageData = baseContext.getImageData(0, 0, width, height);
    const waterImageData = waterSourceContext.getImageData(0, 0, width, height);
    this.splitWaterColorImageData(baseImageData, waterImageData, effect.colors, effect.tolerance);
    baseContext.putImageData(baseImageData, 0, 0);
    waterSourceContext.putImageData(waterImageData, 0, 0);
    waterFrameContext.clearRect(0, 0, width, height);
    waterFrameContext.drawImage(waterSourceCanvas, 0, 0);

    const baseTexture = Texture.from(baseCanvas);
    const waterTexture = Texture.from(waterFrameCanvas);
    const baseSprite = new Sprite(baseTexture);
    const waterSprite = new Sprite(waterTexture);
    this.applyImageSourceSize(baseSprite, source);
    this.applyImageSourceSize(waterSprite, source);
    baseSprite.label = 'image-water-color-base';
    waterSprite.label = 'image-water-color-water';

    return {
      width,
      height,
      baseSprite,
      waterSprite,
      waterSourceCanvas,
      waterFrameCanvas,
      waterFrameContext,
      waterTexture,
    };
  }

  private splitWaterColorImageData(
    baseImageData: ImageData,
    waterImageData: ImageData,
    colors: RoccoWaterColorRgb[],
    tolerance: number,
  ): void {
    const base = baseImageData.data;
    const water = waterImageData.data;
    for (let index = 0; index < base.length; index += 4) {
      const alpha = base[index + 3] ?? 0;
      if (alpha <= 0) {
        continue;
      }

      const sample: RoccoWaterColorRgb = [
        (base[index] ?? 0) / 255,
        (base[index + 1] ?? 0) / 255,
        (base[index + 2] ?? 0) / 255,
      ];
      if (matchesRoccoColorKey(sample, colors, tolerance)) {
        base[index + 3] = 0;
      } else {
        water[index + 3] = 0;
      }
    }
  }

  private updateWaterAnimation(animation: WaterColorPlaneAnimation | undefined, deltaMs: number): void {
    if (!animation?.ready || !animation.sourceCanvas || !animation.frameContext || !animation.texture) {
      return;
    }

    animation.elapsedMs += deltaMs;
    const elapsedSeconds = animation.elapsedMs / 1000;
    const { width, height, sourceCanvas, frameContext, effect } = animation;
    frameContext.clearRect(0, 0, width, height);
    for (let y = 0; y < height; y += WATER_ROW_SLICE_HEIGHT) {
      const sliceHeight = Math.min(WATER_ROW_SLICE_HEIGHT, height - y);
      const wave =
        Math.sin((y / Math.max(1, effect.wavelength)) * Math.PI * 2 + elapsedSeconds * effect.speed) *
        effect.amplitude *
        effect.strength;
      const offsetX = Math.round(wave);
      frameContext.drawImage(sourceCanvas, 0, y, width, sliceHeight, offsetX, y, width, sliceHeight);
      if (offsetX > 0) {
        frameContext.drawImage(sourceCanvas, 0, y, width, sliceHeight, offsetX - width, y, width, sliceHeight);
      } else if (offsetX < 0) {
        frameContext.drawImage(sourceCanvas, 0, y, width, sliceHeight, offsetX + width, y, width, sliceHeight);
      }
    }

    const previousCompositeOperation = frameContext.globalCompositeOperation;
    frameContext.globalCompositeOperation = 'destination-in';
    frameContext.drawImage(sourceCanvas, 0, 0);
    frameContext.globalCompositeOperation = previousCompositeOperation;

    animation.texture.source.update();
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
  for (let i = 0; i < starCount; i += 1) {
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
    t += 0x6d2b79f5;
    let value = Math.imul(t ^ (t >>> 15), t | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeDraggablePlaneRoot(root: Container): void {
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  root.eventMode = 'static';

  root.on('pointerdown', (event: FederatedPointerEvent) => {
    dragging = true;
    offsetX = event.global.x - root.x;
    offsetY = event.global.y - root.y;
  });

  root.on('pointermove', (event: FederatedPointerEvent) => {
    if (!dragging) {
      return;
    }

    root.position.set(event.global.x - offsetX, event.global.y - offsetY);
  });

  root.on('pointerup', () => {
    dragging = false;
  });
  root.on('pointerupoutside', () => {
    dragging = false;
  });
}
