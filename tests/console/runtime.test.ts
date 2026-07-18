import { Container, Texture, type Application } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { GameRuntime } from '../../src/console/runtime';
import {
  formatCompositionOverlayText,
  RuntimeCompositionPresenter,
} from '../../src/console/runtime-composition-presenter';

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

  it('keeps composition text formatting and overlay ownership in the presenter', () => {
    const session = {
      id: 'composition-1',
      ownerId: 'test-owner',
      message: 'LOADING',
      mode: 'exclusive' as const,
      status: 'active' as const,
      completed: 30,
      total: 100,
      error: null,
    };
    expect(formatCompositionOverlayText(session)).toBe('LOADING\nPROGRESS 30/100');

    const stage = new Container();
    const render = vi.fn();
    const app = {
      stage,
      screen: { width: 320, height: 180 },
      render,
      renderer: { extract: { texture: () => Texture.WHITE } },
    } as unknown as Application;
    const presenter = new RuntimeCompositionPresenter();

    presenter.sync(app, session);

    expect(stage.children).toHaveLength(1);
    const overlay = stage.children.find((child) => child.label === 'composition-overlay');
    expect(overlay).toBeDefined();
    expect(overlay?.children.some((child) => child.label === 'composition-dimmer')).toBe(true);
    expect(overlay?.children.some((child) => child.label === 'composition-panel-text')).toBe(true);
    expect(render).toHaveBeenCalledTimes(1);

    presenter.sync(app, null);
    expect(stage.children).toHaveLength(0);
    presenter.dispose();
  });
});
