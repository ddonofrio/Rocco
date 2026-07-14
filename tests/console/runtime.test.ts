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

  it('disposes composition sessions through the runtime scope', async () => {
    const runtime = new GameRuntime({
      mount: document.createElement('div'),
    });

    const session = runtime.beginCompositionSession('test-owner', {
      message: 'LOADING 0%',
    });

    expect(session.status).toBe('active');

    await runtime.dispose();

    expect(session.status).toBe('disposed');
  });

  it('falls back to the browser console when no log sink is configured', () => {
    const runtime = new GameRuntime({
      mount: document.createElement('div'),
    });
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});

    runtime.log('System', 'hello');

    expect(consoleInfo).toHaveBeenCalledWith('[ROCCO:System] hello');
  });
});
