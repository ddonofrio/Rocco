import { describe, expect, it } from 'vitest';

import type { RoccoRenderableSprite } from '../../../../src/console/video/sprites';
import type { RoccoSpriteMessageRenderable } from '../../../../src/console/video/messages/types';
import {
  resolveBubbleLayout,
  resolveObstacleBounds,
} from '../../../../src/console/video/messages/bubble-layout';

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

function createRenderableSprite(
  instanceId: string,
  isIgnoreMessages: boolean,
): RoccoRenderableSprite {
  return {
    instance: {
      id: instanceId,
      ignoreMessages: isIgnoreMessages,
    },
  } as unknown as RoccoRenderableSprite;
}

describe('PixiRoccoSpriteMessageRenderer', () => {
  it('chooses the opposite side when another sprite blocks the default side', () => {
    const layout = resolveBubbleLayout(
      createRenderable(),
      { x: 300, y: 250, width: 60, height: 120 },
      200,
      80,
      [{ x: 360, y: 220, width: 180, height: 160 }],
    );

    expect(layout.side).toBe('left');
  });

  it('falls back above when one side is blocked and the other side is pushed off-screen', () => {
    const layout = resolveBubbleLayout(
      createRenderable(),
      { x: 8, y: 250, width: 60, height: 120 },
      220,
      80,
      [{ x: 70, y: 220, width: 220, height: 160 }],
    );

    expect(layout.side).toBe('above');
  });

  it('ignores sprites marked to be skipped by message layout', () => {
    const obstacleBounds = resolveObstacleBounds(
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
