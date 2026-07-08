import { Container, type ColorMatrixFilter } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

vi.mock('pixi.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pixi.js')>();
  return {
    ...actual,
    Assets: {
      ...actual.Assets,
      load: vi.fn(() => Promise.resolve(actual.Texture.WHITE)),
    },
  };
});

import type { RoccoRenderableSprite } from '../../../../src/engine/video/sprites/system';
import type { RoccoSpriteDefinition, RoccoSpriteInstance } from '../../../../src/engine/video/sprites/types';
import { PixiRoccoSpriteRenderer } from '../../../../src/engine/video/sprites/pixi-renderer';

interface SpriteNodeInternals {
  sprite: {
    filters?: unknown[];
  };
}

interface RendererInternals {
  nodes: Map<string, SpriteNodeInternals>;
}

function createDefinition(): RoccoSpriteDefinition {
  return {
    id: 'hero',
    images: [
      {
        id: 'hero-sheet',
        uri: 'test://hero-sheet',
        width: 32,
        height: 32,
      },
    ],
    frames: [
      {
        id: 'idle',
        imageId: 'hero-sheet',
        rect: { x: 0, y: 0, width: 32, height: 32 },
      },
    ],
    animations: {
      idle: {
        id: 'idle',
        loop: true,
        playbackRate: 1,
        frames: [{ frameId: 'idle', durationMs: 100 }],
      },
    },
    defaultAnimation: 'idle',
  };
}

function createInstance(contrast?: number): RoccoSpriteInstance {
  return {
    id: 'hero-instance',
    definitionId: 'hero',
    transform: {
      x: 120,
      y: 220,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      flipX: false,
      flipY: false,
    },
    motion: {
      velocityX: 0,
      velocityY: 0,
      accelerationX: 0,
      accelerationY: 0,
      distanceAccumulator: 0,
    },
    animation: {
      animationId: 'idle',
      frameIndex: 0,
      elapsedMs: 0,
      playing: true,
      playbackRate: 1,
    },
    facing: 'down',
    visible: true,
    enabled: true,
    interactive: false,
    collisionEnabled: true,
    renderLayer: 'world.actors',
    zIndex: 1,
    depthMode: 'fixed',
    opacity: 1,
    contrast,
    ignoreMessages: false,
    state: {},
  };
}

function createRenderable(contrast?: number): RoccoRenderableSprite {
  const definition = createDefinition();
  return {
    definition,
    frame: definition.frames[0],
    instance: createInstance(contrast),
  };
}

function getNode(renderer: PixiRoccoSpriteRenderer): SpriteNodeInternals {
  const internals = renderer as unknown as RendererInternals;
  const node = internals.nodes.get('hero-instance');
  if (!node) {
    throw new Error('Expected renderer node to exist.');
  }

  return node;
}

describe('PixiRoccoSpriteRenderer', () => {
  it('applies sprite contrast using the same percentage scale exposed by the cartridge', () => {
    const renderer = new PixiRoccoSpriteRenderer();
    renderer.mount(new Container());

    renderer.sync([createRenderable(1.2)]);

    const filter = getNode(renderer).sprite.filters?.[0] as ColorMatrixFilter | undefined;
    expect(filter).toBeDefined();
    expect(filter?.matrix[0]).toBeCloseTo(1.2, 4);
    expect(filter?.matrix[4]).toBeCloseTo(-0.1, 4);
  });

  it('removes the sprite contrast filter when the contrast returns to neutral', () => {
    const renderer = new PixiRoccoSpriteRenderer();
    renderer.mount(new Container());

    renderer.sync([createRenderable(1.2)]);
    renderer.sync([createRenderable(1)]);

    expect(getNode(renderer).sprite.filters).toBeNull();
  });
});
