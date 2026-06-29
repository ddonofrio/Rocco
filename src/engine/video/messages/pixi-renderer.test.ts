import { describe, expect, it } from 'vitest';

import { PixiRoccoSpriteMessageRenderer } from './pixi-renderer';

describe('PixiRoccoSpriteMessageRenderer', () => {
  it('chooses the opposite side when another sprite blocks the default side', () => {
    const renderer = new PixiRoccoSpriteMessageRenderer();

    const layout = (renderer as any).resolveBubbleLayout(
      {
        message: {
          mode: 'say',
          side: 'auto',
          offset: { x: 0, y: 0 },
        },
        designWidth: 960,
        designHeight: 540,
      },
      { x: 300, y: 250, width: 60, height: 120 },
      200,
      80,
      [{ x: 360, y: 220, width: 180, height: 160 }],
    );

    expect(layout.side).toBe('left');
  });

  it('falls back above when one side is blocked and the other side is pushed off-screen', () => {
    const renderer = new PixiRoccoSpriteMessageRenderer();

    const layout = (renderer as any).resolveBubbleLayout(
      {
        message: {
          mode: 'say',
          side: 'auto',
          offset: { x: 0, y: 0 },
        },
        designWidth: 960,
        designHeight: 540,
      },
      { x: 8, y: 250, width: 60, height: 120 },
      220,
      80,
      [{ x: 70, y: 220, width: 220, height: 160 }],
    );

    expect(layout.side).toBe('above');
  });

  it('ignores sprites marked to be skipped by message layout', () => {
    const renderer = new PixiRoccoSpriteMessageRenderer();

    const obstacleBounds = (renderer as any).resolveObstacleBounds(
      'rocco',
      new Map([
        ['rocco', { x: 300, y: 250, width: 60, height: 120 }],
        ['cloud', { x: 360, y: 220, width: 180, height: 160 }],
        ['stan', { x: 100, y: 200, width: 120, height: 180 }],
      ]),
      [
        { instance: { id: 'rocco', ignoreMessages: false } },
        { instance: { id: 'cloud', ignoreMessages: true } },
        { instance: { id: 'stan', ignoreMessages: false } },
      ],
    );

    expect(obstacleBounds).toEqual([{ x: 100, y: 200, width: 120, height: 180 }]);
  });
});
