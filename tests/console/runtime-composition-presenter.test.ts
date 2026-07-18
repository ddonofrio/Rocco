import { Container, Texture, type Application } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import {
  formatCompositionOverlayText,
  RuntimeCompositionPresenter,
} from '../../src/console/runtime-composition-presenter';

function createSession(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'composition-1',
    ownerId: 'test-owner',
    message: 'LOADING',
    mode: 'exclusive' as const,
    status: 'active' as const,
    completed: 30,
    total: 100,
    error: null,
    ...overrides,
  };
}

function createApp(): {
  app: Application;
  stage: Container;
  render: ReturnType<typeof vi.fn>;
  extract: ReturnType<typeof vi.fn>;
} {
  const stage = new Container();
  const render = vi.fn();
  const extract = vi.fn().mockReturnValue(Texture.WHITE);
  const app = {
    stage,
    screen: { width: 320, height: 180 },
    render,
    renderer: { extract: { texture: extract } },
  } as unknown as Application;
  return { app, stage, render, extract };
}

describe('RuntimeCompositionPresenter frozen-frame loading UX', () => {
  it('shows a solid background on the first (boot) composition instead of a frozen frame', () => {
    const { app, stage, extract } = createApp();
    const gameplay = new Container();
    gameplay.label = 'gameplay';
    stage.addChild(gameplay);

    const presenter = new RuntimeCompositionPresenter();
    presenter.sync(app, createSession());
    presenter.sync(app, createSession({ completed: 50 }));

    expect(extract).toHaveBeenCalledTimes(0);
    const overlay = stage.children.find((c) => c.label === 'composition-overlay');
    expect(overlay).toBeDefined();
    expect(overlay?.children.some((c) => c.label === 'composition-dimmer')).toBe(true);
    expect(overlay?.children.some((c) => c.label === 'composition-frozen-frame')).toBe(false);
    expect(overlay?.children.some((c) => c.label === 'composition-panel-text')).toBe(true);
  });

  it('does not use the solid background once a gameplay frame can be frozen', () => {
    const { app, stage, extract } = createApp();
    const presenter = new RuntimeCompositionPresenter();
    presenter.sync(app, createSession());
    presenter.sync(app, null);
    presenter.sync(app, createSession());

    expect(extract).toHaveBeenCalledTimes(1);
    const overlay = stage.children.find((c) => c.label === 'composition-overlay');
    expect(overlay?.children.some((c) => c.label === 'composition-dimmer')).toBe(false);
    expect(overlay?.children.some((c) => c.label === 'composition-frozen-frame')).toBe(true);
  });

  it('updates panel text without recapturing the stage', () => {
    const { app, extract } = createApp();
    const presenter = new RuntimeCompositionPresenter();
    presenter.sync(app, createSession());
    presenter.sync(app, null);
    presenter.sync(app, createSession({ completed: 30 }));
    presenter.sync(app, createSession({ completed: 60 }));

    const text = presenter['compositionText'];
    expect(text?.text).toBe('LOADING\nPROGRESS 60/100');
    expect(extract).toHaveBeenCalledTimes(1);
  });

  it('keeps the snapshot when the underlying gameplay child is removed', () => {
    const { app, stage, extract } = createApp();
    const gameplay = new Container();
    gameplay.label = 'gameplay';
    stage.addChild(gameplay);

    const presenter = new RuntimeCompositionPresenter();
    presenter.sync(app, createSession());
    presenter.sync(app, null);
    presenter.sync(app, createSession());
    // eslint-disable-next-line unicorn/prefer-dom-node-remove -- Pixi Container, not a DOM node
    stage.removeChild(gameplay);
    presenter.sync(app, createSession({ completed: 80 }));

    expect(extract).toHaveBeenCalledTimes(1);
    const overlay = stage.children.find((c) => c.label === 'composition-overlay');
    expect(overlay?.children.some((c) => c.label === 'composition-frozen-frame')).toBe(true);
  });

  it('reuses the same snapshot for a nested session', () => {
    const { app, extract } = createApp();
    const presenter = new RuntimeCompositionPresenter();
    presenter.sync(app, createSession());
    presenter.sync(app, null);
    presenter.sync(app, createSession({ id: 'composition-1' }));
    presenter.sync(app, createSession({ id: 'composition-2' }));

    expect(extract).toHaveBeenCalledTimes(1);
  });

  it('removes the overlay and destroys the snapshot texture exactly once on hide', () => {
    const { app, stage } = createApp();
    const destroySpy = vi.spyOn(Texture.WHITE, 'destroy');
    const presenter = new RuntimeCompositionPresenter();
    presenter.sync(app, createSession());
    presenter.sync(app, null);
    presenter.sync(app, createSession());
    presenter.sync(app, null);

    expect(stage.children.some((c) => c.label === 'composition-overlay')).toBe(false);
    expect(destroySpy).toHaveBeenCalledTimes(1);
    presenter.dispose();
  });

  it('captures a fresh frame for a later (transition) composition', () => {
    const { app, extract } = createApp();
    const presenter = new RuntimeCompositionPresenter();
    presenter.sync(app, createSession());
    presenter.sync(app, null);
    presenter.sync(app, createSession());
    presenter.sync(app, null);
    presenter.sync(app, createSession());

    expect(extract).toHaveBeenCalledTimes(2);
  });

  it('resizes the snapshot without recapturing on resize', () => {
    const { app, extract } = createApp();
    const presenter = new RuntimeCompositionPresenter();
    presenter.sync(app, createSession());
    presenter.sync(app, null);
    presenter.sync(app, createSession());

    (app.screen as { width: number; height: number }).width = 640;
    (app.screen as { width: number; height: number }).height = 360;
    presenter.sync(app, createSession({ completed: 70 }));

    const frozen = presenter['frozenFrame'];
    expect(frozen?.scale.x).toBeCloseTo(640 / 1);
    expect(extract).toHaveBeenCalledTimes(1);
  });

  it('uses the failure palette when the session failed', () => {
    const { app, stage } = createApp();
    const presenter = new RuntimeCompositionPresenter();
    presenter.sync(
      app,
      createSession({
        status: 'failed',
        error: { name: 'Error', message: 'boom' },
      }),
    );

    const overlay = stage.children.find((c) => c.label === 'composition-overlay');
    const text = overlay?.children.find((c) => c.label === 'composition-panel-text');
    expect(text).toBeDefined();
    expect(
      formatCompositionOverlayText(
        createSession({
          status: 'failed',
          error: { name: 'Error', message: 'boom' },
        }),
      ),
    ).toContain('ERROR: boom');
  });

  it('falls back to a solid background when extraction throws', () => {
    const { app, stage } = createApp();
    const extract = vi.fn().mockImplementation(() => {
      throw new Error('extract failed');
    });
    (app.renderer as unknown as { extract: { texture: typeof extract } }).extract.texture = extract;

    const presenter = new RuntimeCompositionPresenter();
    presenter.sync(app, createSession());

    const overlay = stage.children.find((c) => c.label === 'composition-overlay');
    expect(overlay?.children.some((c) => c.label === 'composition-dimmer')).toBe(true);
    expect(overlay?.children.some((c) => c.label === 'composition-frozen-frame')).toBe(false);
    presenter.sync(app, null);
  });
});
