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
