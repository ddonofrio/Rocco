import { describe, expect, it } from 'vitest';

import * as video from './index';

describe('video barrel', () => {
  it('exports core video modules and contracts', () => {
    expect(video.defaultRoccoRenderLayers.length).toBeGreaterThan(0);
    expect(video.RoccoRuntimeVideoSystem).toBeTypeOf('function');

    expect(video.planes).toBeTruthy();
    expect(video.sprites).toBeTruthy();
    expect(video.sceneTargets).toBeTruthy();
    expect(video.gridMenu).toBeTruthy();
    expect(video.messages).toBeTruthy();
    expect(video.primitives).toBeTruthy();
    expect(video.titles).toBeTruthy();
    expect(video.display).toBeTruthy();
    expect(video.viewport).toBeTruthy();
    expect(video.postProcessing).toBeTruthy();
  });
});
