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
    scaleMode: 'contain',
  };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('RoccoDisplayProfileRenderer', () => {
  it('creates overlay when crtMask is enabled', () => {
    const root = document.createElement('div');
    const stage = document.createElement('div');
    root.append(stage);
    document.body.append(root);

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
    root.append(stage);

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
    root.append(stage);

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
    Object.defineProperties(globalThis, {
    	innerWidth: {
	      value: 1280,
	      configurable: true,
	      writable: true,
	    },
    	innerHeight: {
	      value: 720,
	      configurable: true,
	      writable: true,
	    },
    });

    const root = document.createElement('div');
    document.body.append(root);

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
    expect(overlay?.style.top).toBe('0px');
    expect(overlay?.style.width).toBe('1280px');
    expect(overlay?.style.height).toBe('720px');

    host.setDisplayProfile({ crtMask: false, edgeVignette: false });
    expect(overlay?.style.display).toBe('none');

    host.unmount();
  });

  it('uses full viewport overlay in cover mode', () => {
    Object.defineProperties(globalThis, {
    	innerWidth: {
	      value: 375,
	      configurable: true,
	      writable: true,
	    },
    	innerHeight: {
	      value: 812,
	      configurable: true,
	      writable: true,
	    },
    });

    const root = document.createElement('div');
    document.body.append(root);

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
    expect(overlay?.style.top).toBe('0px');
    expect(overlay?.style.width).toBe('375px');
    expect(overlay?.style.height).toBe('812px');

    host.unmount();
  });
});
