import { describe, expect, it } from 'vitest';

import type { RoccoRenderableSprite } from '../../../../src/console/video/sprites';
import { RoccoSpriteMessageSystemSDK } from '../../../../src/console/video/messages/system';

function createAnchorSprite(instanceId: string): RoccoRenderableSprite {
  return {
    instance: { id: instanceId } as RoccoRenderableSprite['instance'],
    definition: {} as RoccoRenderableSprite['definition'],
    frame: {} as RoccoRenderableSprite['frame'],
  };
}

describe('RoccoSpriteMessageSystemSDK transparent anchor', () => {
  it('renders messages anchored to transparent sprites when included in the anchor set', () => {
    const messages = new RoccoSpriteMessageSystemSDK();
    messages.say('intercom-anchor', 'Security!', { ttlMs: 1000 });

    const transparentAnchor = createAnchorSprite('intercom-anchor');

    const withTransparent = messages.listRenderableMessages([transparentAnchor], {
      width: 960,
      height: 540,
    });

    expect(withTransparent).toHaveLength(1);
    expect(withTransparent[0]?.message.spriteInstanceId).toBe('intercom-anchor');

    const withoutTransparent = messages.listRenderableMessages([], {
      width: 960,
      height: 540,
    });

    expect(withoutTransparent).toHaveLength(0);
  });
});

describe('RoccoSpriteMessageSystemSDK multi-page pagination', () => {
  it('advances text and lineIndex one page per ttl and removes only after the final page', () => {
    const messages = new RoccoSpriteMessageSystemSDK();
    messages.say('rocco', ['line 1', 'line 2', 'line 3'], { ttlMs: 1000 });

    const first = messages.listMessages().at(-1);
    expect(first?.text).toBe('line 1');
    expect(first?.lineIndex).toBe(0);
    expect(first?.lines).toEqual(['line 1', 'line 2', 'line 3']);

    messages.update(1000);

    const second = messages.listMessages().at(-1);
    expect(second?.text).toBe('line 2');
    expect(second?.lineIndex).toBe(1);

    messages.update(999);
    expect(messages.listMessages()).toHaveLength(1);

    messages.update(1);

    const third = messages.listMessages().at(-1);
    expect(third?.text).toBe('line 3');
    expect(third?.lineIndex).toBe(2);

    messages.update(1000);

    expect(messages.listMessages()).toHaveLength(0);
  });
});
