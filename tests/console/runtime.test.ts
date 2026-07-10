import { describe, expect, it, vi } from 'vitest';

import { GameRuntime } from '../../src/console/runtime';

describe('GameRuntime', () => {
  it('starts with developer mode disabled by default', () => {
    const runtime = new GameRuntime({
      mount: document.createElement('div'),
    });

    expect(runtime.isDeveloperModeEnabled()).toBe(false);
    expect(runtime.getConsoleFlags().developerModeEnabled).toBe(false);
  });

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
