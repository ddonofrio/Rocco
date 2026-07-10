// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { RoccoDisplayProfileRenderer } from '../../../../src/console/video/display/profile';
import type { RoccoViewportMetrics } from '../../../../src/console/video/viewport/host';
import { RoccoViewportHost } from '../../../../src/console/video/viewport/host';

function makeMetrics(): RoccoViewportMetrics {
  return {
    viewportWidth: 1280,
    viewportHeight: 720,
    designWidth: 960,
    designHeight: 540,
    scale: 1.25,
    renderWidth: 1200,
    renderHeight: 675,
    offsetX: 40,
    offsetY: 22,
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('RoccoDisplayProfileRenderer', () => {
  it('creates overlay when crtMask is enabled', () => {
    const root = document.createElement('div');
    const stage = document.createElement('div');
    root.appendChild(stage);
    document.body.appendChild(root);

    const renderer = new RoccoDisplayProfileRenderer({
      rootElement: root,
      stageElement: stage,
      profile: { crtMask: true },
    });

    renderer.mount();
    renderer.applyMetrics(makeMetrics());

    const overlay = root.querySelector<HTMLElement>('[data-rocco-display-overlay="true"]');
    expect(overlay).not.toBeNull();
    expect(overlay?.style.display).toBe('block');
    expect(overlay?.style.pointerEvents).toBe('none');
  });

  it('keeps overlay hidden when crtMask and edgeVignette are disabled', () => {
    const root = document.createElement('div');
    const stage = document.createElement('div');
    root.appendChild(stage);

    const renderer = new RoccoDisplayProfileRenderer({
      rootElement: root,
      stageElement: stage,
      profile: { crtMask: false, edgeVignette: false },
    });

    renderer.mount();
    renderer.applyMetrics(makeMetrics());

    const overlay = root.querySelector<HTMLElement>('[data-rocco-display-overlay="true"]');
    expect(overlay).not.toBeNull();
    expect(overlay?.style.display).toBe('none');
  });

  it('updates overlay size and position from viewport metrics', () => {
    const root = document.createElement('div');
    const stage = document.createElement('div');
    root.appendChild(stage);

    const renderer = new RoccoDisplayProfileRenderer({
      rootElement: root,
      stageElement: stage,
    });

    renderer.mount();
    renderer.applyMetrics(makeMetrics());

    const overlay = renderer.getOverlayElement();
    expect(overlay.style.left).toBe('40px');
    expect(overlay.style.top).toBe('22px');
    expect(overlay.style.width).toBe('1200px');
    expect(overlay.style.height).toBe('675px');
  });
});

describe('RoccoViewportHost display profile integration', () => {
  it('tracks contain metrics and allows toggling the display profile', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 1200,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      configurable: true,
      writable: true,
    });

    const root = document.createElement('div');
    document.body.appendChild(root);

    const host = new RoccoViewportHost({
      root,
      designWidth: 960,
      designHeight: 540,
    });

    host.mount();

    const overlay = host
      .getRootElement()
      .querySelector<HTMLElement>('[data-rocco-display-overlay="true"]');
    expect(overlay).not.toBeNull();
    expect(overlay?.style.left).toBe('0px');
    expect(overlay?.style.top).toBe('62.5px');
    expect(overlay?.style.width).toBe('1200px');
    expect(overlay?.style.height).toBe('675px');

    host.setDisplayProfile({ crtMask: false, edgeVignette: false });
    expect(overlay?.style.display).toBe('none');

    host.unmount();
  });
});
