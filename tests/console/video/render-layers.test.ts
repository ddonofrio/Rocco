import { describe, expect, it } from 'vitest';

import { defaultRoccoRenderLayers } from '../../../src/console/video/render-layers';

describe('video render layers', () => {
  it('provides default layers ordered by zIndex', () => {
    expect(defaultRoccoRenderLayers.length).toBeGreaterThan(0);

    const zIndexes = defaultRoccoRenderLayers.map((layer) => layer.zIndex);
    const sorted = [...zIndexes].toSorted((left, right) => left - right);
    expect(zIndexes).toEqual(sorted);
  });
});
