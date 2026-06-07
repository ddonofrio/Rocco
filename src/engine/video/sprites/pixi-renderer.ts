import { Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js';

import type { RoccoRenderableSprite } from './system';
import type { RoccoSpriteDefinition, RoccoSpriteImage, RoccoSpritePresentationTransform } from './types';

interface SpriteNode {
  root: Container;
  sprite: Sprite;
  frameKey: string;
  renderLayer: string;
}

interface PixiRoccoSpriteRendererOptions {
  resolveRenderLayerZIndex?: (renderLayer: string) => number;
}

const MIN_PRESENTATION_PROJECTION_SCALE = 0.0001;

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolvePresentationScale(transform?: RoccoSpritePresentationTransform): { x: number; y: number } {
  const yawDegrees = clamp(transform?.yawDegrees ?? 0, -89.9, 89.9);
  const pitchDegrees = clamp(transform?.pitchDegrees ?? 0, -89.9, 89.9);
  return {
    x: Math.max(MIN_PRESENTATION_PROJECTION_SCALE, Math.cos(degreesToRadians(yawDegrees))),
    y: Math.max(MIN_PRESENTATION_PROJECTION_SCALE, Math.cos(degreesToRadians(pitchDegrees))),
  };
}

export class PixiRoccoSpriteRenderer {
  private readonly nodes = new Map<string, SpriteNode>();
  private readonly layerRoots = new Map<string, Container>();
  private readonly baseTextures = new Map<string, Texture>();
  private readonly frameTextures = new Map<string, Texture>();
  private readonly pendingTextureLoads = new Map<string, Promise<Texture>>();
  private readonly resolveRenderLayerZIndex: (renderLayer: string) => number;
  private stage: Container | null = null;

  constructor(options?: PixiRoccoSpriteRendererOptions) {
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
    this.stage = null;
    this.nodes.clear();
  }

  sync(renderables: RoccoRenderableSprite[]): void {
    if (!this.stage) {
      return;
    }

    const staleIds = new Set(this.nodes.keys());
    renderables.forEach((renderable, index) => {
      const layerRoot = this.ensureLayerRoot(renderable.instance.renderLayer);
      let node = this.nodes.get(renderable.instance.id);
      if (!node) {
        node = this.createNode();
        this.nodes.set(renderable.instance.id, node);
        layerRoot.addChild(node.root);
      } else if (node.renderLayer !== renderable.instance.renderLayer || node.root.parent !== layerRoot) {
        node.root.parent?.removeChild(node.root);
        layerRoot.addChild(node.root);
        node.renderLayer = renderable.instance.renderLayer;
      }

      this.applyRenderable(node, renderable, index);
      staleIds.delete(renderable.instance.id);
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
    for (const texture of this.frameTextures.values()) {
      texture.destroy(false);
    }
    this.frameTextures.clear();
    this.baseTextures.clear();
  }

  async preloadDefinition(definition: RoccoSpriteDefinition): Promise<void> {
    const loads = definition.images
      .filter((image) => Boolean(image.uri))
      .map((image) => {
        const key = this.resolveImageSourceKey(image, definition.id);
        return this.queueUriTextureLoad(key, image.uri as string);
      });

    await Promise.all(loads);
  }

  private createNode(): SpriteNode {
    const root = new Container();
    root.sortableChildren = false;
    root.eventMode = 'none';

    const sprite = new Sprite(Texture.WHITE);
    sprite.label = 'rocco-sprite';
    root.addChild(sprite);

    return {
      root,
      sprite,
      frameKey: '',
      renderLayer: '',
    };
  }

  private ensureLayerRoot(renderLayer: string): Container {
    if (!this.stage) {
      throw new Error('Sprite renderer is not mounted.');
    }

    const existing = this.layerRoots.get(renderLayer);
    if (existing) {
      existing.zIndex = this.resolveRenderLayerZIndex(renderLayer);
      return existing;
    }

    const layerRoot = new Container();
    layerRoot.label = `rocco-sprite-layer:${renderLayer}`;
    layerRoot.sortableChildren = true;
    layerRoot.zIndex = this.resolveRenderLayerZIndex(renderLayer);
    this.stage.addChild(layerRoot);
    this.layerRoots.set(renderLayer, layerRoot);
    return layerRoot;
  }

  private applyRenderable(node: SpriteNode, renderable: RoccoRenderableSprite, sortIndex: number): void {
    const resolved = this.resolveTexture(renderable);
    if (node.frameKey !== resolved.key || node.sprite.texture !== resolved.texture) {
      node.sprite.texture = resolved.texture;
      node.frameKey = resolved.key;
    }

    const anchor = renderable.definition.anchor ?? { x: 0, y: 0 };
    node.sprite.anchor.set(anchor.x, anchor.y);

    const visualAdjustment = renderable.visualAdjustment ?? {
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0,
    };
    node.sprite.position.set(visualAdjustment.offsetX, visualAdjustment.offsetY);
    node.sprite.scale.set(visualAdjustment.scaleX, visualAdjustment.scaleY);

    node.root.position.set(renderable.instance.transform.x, renderable.instance.transform.y);
    const presentationScale = resolvePresentationScale(renderable.instance.transform.presentation);
    node.root.scale.set(
      renderable.instance.transform.scaleX * presentationScale.x * (renderable.instance.transform.flipX ? -1 : 1),
      renderable.instance.transform.scaleY * presentationScale.y * (renderable.instance.transform.flipY ? -1 : 1),
    );
    node.root.rotation = renderable.instance.transform.rotation ?? 0;
    node.root.alpha = renderable.instance.opacity;
    node.root.zIndex = sortIndex;

    const pivot = renderable.frame.pivot ?? renderable.definition.pivot ?? { x: 0, y: 0 };
    node.root.pivot.set(pivot.x, pivot.y);
    node.renderLayer = renderable.instance.renderLayer;

    node.sprite.tint = this.toTintNumber(renderable.instance.tint);
  }

  private resolveTexture(renderable: RoccoRenderableSprite): { texture: Texture; key: string } {
    const image = renderable.definition.images.find((item) => item.id === renderable.frame.imageId);
    if (!image) {
      return { texture: Texture.WHITE, key: 'white' };
    }

    const baseKey = this.resolveImageSourceKey(image, renderable.definition.id);
    const baseTexture = this.resolveBaseTexture(baseKey, image);
    if (!renderable.frame.rect) {
      return { texture: baseTexture, key: `${baseKey}:full` };
    }

    const frame = renderable.frame.rect;
    const frameKey = `${baseKey}:${frame.x}:${frame.y}:${frame.width}:${frame.height}`;
    const cached = this.frameTextures.get(frameKey);
    if (cached) {
      return { texture: cached, key: frameKey };
    }

    const cropped = new Texture({
      source: baseTexture.source,
      frame: new Rectangle(frame.x, frame.y, frame.width, frame.height),
      dynamic: false,
    });
    this.frameTextures.set(frameKey, cropped);
    return { texture: cropped, key: frameKey };
  }

  private resolveBaseTexture(key: string, image: RoccoSpriteImage): Texture {
    const cached = this.baseTextures.get(key);
    if (cached) {
      return cached;
    }

    let texture: Texture;
    if (image.uri) {
      texture = this.createTransparentTexture(image.width ?? 64, image.height ?? 32);
      void this.queueUriTextureLoad(key, image.uri);
    } else if (image.dataRef?.startsWith('placeholder:')) {
      texture = this.createPlaceholderTexture(image.dataRef, image.width ?? 64, image.height ?? 32);
    } else {
      texture = this.createPlaceholderTexture(`placeholder:${key}`, image.width ?? 64, image.height ?? 32);
    }

    this.baseTextures.set(key, texture);
    return texture;
  }

  private queueUriTextureLoad(key: string, uri: string): Promise<Texture> {
    const pending = this.pendingTextureLoads.get(key);
    if (pending) {
      return pending;
    }

    const load = Assets.load<Texture>(uri)
      .then((texture) => {
        this.baseTextures.set(key, texture);
        this.clearFrameTexturesForBaseKey(key);
        return texture;
      })
      .catch(() => this.baseTextures.get(key) ?? Texture.WHITE)
      .finally(() => {
        this.pendingTextureLoads.delete(key);
      });

    this.pendingTextureLoads.set(key, load);
    return load;
  }

  private clearFrameTexturesForBaseKey(baseKey: string): void {
    const prefix = `${baseKey}:`;
    for (const [frameKey, texture] of this.frameTextures) {
      if (!frameKey.startsWith(prefix)) {
        continue;
      }

      texture.destroy(false);
      this.frameTextures.delete(frameKey);
    }
  }

  private resolveImageSourceKey(image: RoccoSpriteImage, definitionId: string): string {
    if (image.uri) {
      return `uri:${image.uri}`;
    }
    if (image.assetId) {
      return `asset:${image.assetId}`;
    }
    if (image.dataRef) {
      return `data:${image.dataRef}`;
    }
    return `placeholder:${definitionId}:${image.id}`;
  }

  private createPlaceholderTexture(seed: string, width: number, height: number): Texture {
    if (typeof document === 'undefined') {
      return Texture.WHITE;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = Math.max(1, Math.floor(height));
    const context = canvas.getContext('2d');
    if (!context) {
      return Texture.WHITE;
    }

    const colorA = this.hashToColor(seed, 0.65);
    const colorB = this.hashToColor(seed.split('').reverse().join(''), 0.8);

    context.fillStyle = colorA;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = colorB;
    context.fillRect(Math.floor(canvas.width / 2), 0, Math.ceil(canvas.width / 2), canvas.height);
    context.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    context.lineWidth = 2;
    context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    return Texture.from(canvas);
  }

  private createTransparentTexture(width: number, height: number): Texture {
    if (typeof document === 'undefined') {
      return Texture.WHITE;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = Math.max(1, Math.floor(height));
    return Texture.from(canvas);
  }

  private hashToColor(seed: string, alpha: number): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }

    const hue = Math.abs(hash) % 360;
    return `hsla(${hue}, 62%, 56%, ${alpha})`;
  }

  private toTintNumber(value: string | undefined): number {
    if (!value) {
      return 0xffffff;
    }

    if (value.startsWith('#')) {
      const parsed = Number.parseInt(value.slice(1), 16);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return 0xffffff;
  }
}
