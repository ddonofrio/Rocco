import { Application } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GameRuntime } from '../../src/console/runtime';

function createRuntime(): GameRuntime {
  return new GameRuntime({ mount: document.createElement('div') });
}

describe('GameRuntime lifecycle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('begins in the new lifecycle state', () => {
    const runtime = createRuntime();

    expect(runtime.lifecycleState).toBe('new');
  });

  it('disposes idempotently and tears down each subsystem once', async () => {
    const runtime = createRuntime();
    const audioDestroy = vi.spyOn(runtime.audio, 'destroy');
    const jukeboxDestroy = vi.spyOn(runtime.jukebox, 'destroy');

    await runtime.dispose();
    await runtime.dispose();

    expect(audioDestroy).toHaveBeenCalledTimes(1);
    expect(jukeboxDestroy).toHaveBeenCalledTimes(1);
    expect(runtime.lifecycleState).toBe('disposed');
  });

  it('does not run the update loop after disposal begins', async () => {
    const runtime = createRuntime();
    const videoUpdate = vi.spyOn(runtime.video, 'update');

    await runtime.dispose();
    // renderTick is private; invoke through the instance to assert the guard.
    (runtime as unknown as { renderTick(ticker: { deltaMS: number; deltaTime: number }): void }).renderTick({
      deltaMS: 16,
      deltaTime: 1,
    });

    expect(videoUpdate).not.toHaveBeenCalled();
  });

  it('rejects init after the runtime has been disposed', async () => {
    const runtime = createRuntime();

    await runtime.dispose();

    await expect(runtime.init()).rejects.toThrow(/disposed/i);
  });

  it('rolls back to a known failed state and cleans partial resources on init error', async () => {
    const runtime = createRuntime();
    const audioDestroy = vi.spyOn(runtime.audio, 'destroy');
    const jukeboxDestroy = vi.spyOn(runtime.jukebox, 'destroy');
    const initSpy = vi
      .spyOn(Application.prototype, 'init')
      .mockRejectedValue(new Error('no-webgl'));

    await expect(runtime.init()).rejects.toThrow('no-webgl');

    expect(runtime.lifecycleState).toBe('failed');
    expect(audioDestroy).toHaveBeenCalled();
    expect(jukeboxDestroy).toHaveBeenCalled();
    expect(initSpy).toHaveBeenCalled();
  });

  it('allows a fresh init after a failed one because the scope is recreated', async () => {
    const runtime = createRuntime();
    vi.spyOn(Application.prototype, 'init').mockRejectedValueOnce(new Error('no-webgl'));

    await expect(runtime.init()).rejects.toThrow('no-webgl');
    expect(runtime.lifecycleState).toBe('failed');
    expect(() => runtime.scope.isDisposed).not.toThrow();
  });
});
