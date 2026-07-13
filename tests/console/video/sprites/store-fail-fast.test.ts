import { describe, expect, it } from 'vitest';

import { RoccoSpriteStore } from '../../../../src/console/video/sprites/store';

function makeDefinition(id: string) {
  return {
    id,
    name: id,
    images: [{ id: 'img-1', uri: 'data:image/png;base64,aaa' }],
    frames: [{ id: 'frame-1', imageId: 'img-1', durationMs: 100 }],
    animations: { idle: { id: 'idle', frames: [{ frameId: 'frame-1', durationMs: 100 }], loop: true, playbackRate: 1 } },
    defaultAnimation: 'idle',
  };
}

describe('RoccoSpriteStore', () => {
  it('registers a definition', () => {
    const store = new RoccoSpriteStore();
    store.register(makeDefinition('alpha'));

    expect(store.get('alpha')).toBeDefined();
  });

  it('throws on duplicate definition id', () => {
    const store = new RoccoSpriteStore();
    store.register(makeDefinition('alpha'));

    expect(() => store.register(makeDefinition('alpha'))).toThrow(
      "Duplicate sprite definition registration 'alpha'.",
    );
  });
});
