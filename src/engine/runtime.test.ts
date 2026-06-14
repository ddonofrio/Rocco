import { describe, expect, it, vi } from 'vitest';

import { GameRuntime } from './runtime';

describe('GameRuntime', () => {
  it('destroys both audio systems during disposal', async () => {
    const runtime = new GameRuntime({
      mount: document.createElement('div'),
    });

    const audioDestroy = vi.spyOn(runtime.audio, 'destroy');
    const jukeboxDestroy = vi.spyOn(runtime.jukebox, 'destroy');

    await runtime.dispose();

    expect(audioDestroy).toHaveBeenCalledTimes(1);
    expect(jukeboxDestroy).toHaveBeenCalledTimes(1);
  });
});
