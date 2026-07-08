import { describe, expect, it } from 'vitest';

import type { RoccoRenderableSprite } from '../../../../src/engine/video/sprites';
import type { RoccoSpriteMessageRenderable } from '../../../../src/engine/video/messages/types';
import { PixiRoccoSpriteMessageRenderer } from '../../../../src/engine/video/messages/pixi-renderer';

interface SpriteBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BubbleLayoutResult {
  side: 'left' | 'right' | 'above';
}

interface RendererInternals {
  resolveBubbleLayout(
    renderable: RoccoSpriteMessageRenderable,
    spriteBounds: SpriteBounds,
    width: number,
    height: number,
    obstacleBounds: readonly SpriteBounds[],
  ): BubbleLayoutResult;
  resolveObstacleBounds(
    currentSpriteInstanceId: string,
    spriteBoundsById: ReadonlyMap<string, SpriteBounds>,
    sprites: readonly RoccoRenderableSprite[],
  ): SpriteBounds[];
}

function getInternals(renderer: PixiRoccoSpriteMessageRenderer): RendererInternals {
  return renderer as unknown as RendererInternals;
}

function createRenderable(): RoccoSpriteMessageRenderable {
  return {
    message: {
      id: 'message',
      spriteInstanceId: 'rocco',
      mode: 'say',
      text: 'Hello',
      lines: ['Hello'],
      lineIndex: 0,
      background: false,
      durationMs: 0,
      ttlMs: 0,
      side: 'auto',
      offset: { x: 0, y: 0 },
      renderLayer: 'overlay.messages',
      zIndex: 0,
      maxWidth: 240,
    },
    sprite: {} as unknown as RoccoRenderableSprite,
    designWidth: 960,
    designHeight: 540,
  };
}

function createRenderableSprite(instanceId: string, ignoreMessages: boolean): RoccoRenderableSprite {
  return {
    instance: {
      id: instanceId,
      ignoreMessages,
    },
  } as unknown as RoccoRenderableSprite;
}

describe('PixiRoccoSpriteMessageRenderer', () => {
  it('chooses the opposite side when another sprite blocks the default side', () => {
    const renderer = new PixiRoccoSpriteMessageRenderer();
    const internals = getInternals(renderer);

    const layout = internals.resolveBubbleLayout(
      createRenderable(),
      { x: 300, y: 250, width: 60, height: 120 },
      200,
      80,
      [{ x: 360, y: 220, width: 180, height: 160 }],
    );

    expect(layout.side).toBe('left');
  });

  it('falls back above when one side is blocked and the other side is pushed off-screen', () => {
    const renderer = new PixiRoccoSpriteMessageRenderer();
    const internals = getInternals(renderer);

    const layout = internals.resolveBubbleLayout(
      createRenderable(),
      { x: 8, y: 250, width: 60, height: 120 },
      220,
      80,
      [{ x: 70, y: 220, width: 220, height: 160 }],
    );

    expect(layout.side).toBe('above');
  });

  it('ignores sprites marked to be skipped by message layout', () => {
    const renderer = new PixiRoccoSpriteMessageRenderer();
    const internals = getInternals(renderer);

    const obstacleBounds = internals.resolveObstacleBounds(
      'rocco',
      new Map([
        ['rocco', { x: 300, y: 250, width: 60, height: 120 }],
        ['cloud', { x: 360, y: 220, width: 180, height: 160 }],
        ['stan', { x: 100, y: 200, width: 120, height: 180 }],
      ]),
      [
        createRenderableSprite('rocco', false),
        createRenderableSprite('cloud', true),
        createRenderableSprite('stan', false),
      ],
    );

    expect(obstacleBounds).toEqual([{ x: 100, y: 200, width: 120, height: 180 }]);
  });
});
