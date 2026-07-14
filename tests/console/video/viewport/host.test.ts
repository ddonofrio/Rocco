// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { RoccoViewportHost } from '../../../../src/console/video/viewport/host';

function setViewportSize(width: number, height: number): void {
  Object.defineProperties(globalThis, {
  	innerWidth: {
	    value: width,
	    configurable: true,
	    writable: true,
	  },
  	innerHeight: {
	    value: height,
	    configurable: true,
	    writable: true,
	  },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('RoccoViewportHost', () => {
  it('uses contain mode when viewport is wider than design aspect', () => {
    setViewportSize(1280, 720);

    const root = document.createElement('div');
    document.body.append(root);

    const host = new RoccoViewportHost({
      root,
      designWidth: 960,
      designHeight: 540,
    });

    host.mount();

    const metrics = host.getMetrics();
    expect(metrics.scaleMode).toBe('contain');
    expect(metrics.scale).toBeCloseTo(4 / 3, 5);
    expect(metrics.renderWidth).toBeCloseTo(1280, 5);
    expect(metrics.renderHeight).toBeCloseTo(720, 5);
    expect(metrics.offsetX).toBeCloseTo(0, 5);
    expect(metrics.offsetY).toBeCloseTo(0, 5);

    host.unmount();
  });

  it('uses cover mode when viewport is narrower than design aspect', () => {
    setViewportSize(375, 812);

    const root = document.createElement('div');
    document.body.append(root);

    const host = new RoccoViewportHost({
      root,
      designWidth: 960,
      designHeight: 540,
    });

    host.mount();

    const metrics = host.getMetrics();
    expect(metrics.scaleMode).toBe('cover');
    expect(metrics.scale).toBeCloseTo(812 / 540, 5);
    expect(metrics.renderWidth).toBeCloseTo(960 * (812 / 540), 5);
    expect(metrics.renderHeight).toBeCloseTo(812, 5);
    expect(metrics.offsetX).toBeCloseTo((375 - metrics.renderWidth) / 2, 5);
    expect(metrics.offsetY).toBeCloseTo(0, 5);

    host.unmount();
  });

  it('uses explicit scaleMode when provided', () => {
    setViewportSize(375, 812);

    const root = document.createElement('div');
    document.body.append(root);

    const host = new RoccoViewportHost({
      root,
      designWidth: 960,
      designHeight: 540,
      scaleMode: 'contain',
    });

    host.mount();

    const metrics = host.getMetrics();
    expect(metrics.scaleMode).toBe('contain');

    host.unmount();
  });

  it('resets pan when switching from cover to contain', () => {
    setViewportSize(375, 812);

    const root = document.createElement('div');
    document.body.append(root);

    const host = new RoccoViewportHost({
      root,
      designWidth: 960,
      designHeight: 540,
    });

    host.mount();

    let metrics = host.getMetrics();
    expect(metrics.scaleMode).toBe('cover');

    setViewportSize(1280, 720);
    host.resize();

    metrics = host.getMetrics();
    expect(metrics.scaleMode).toBe('contain');
    expect(metrics.offsetX).toBeCloseTo(0, 5);
    expect(metrics.offsetY).toBeCloseTo(0, 5);

    host.unmount();
  });

  it('pans within cover mode and updates stage transform', () => {
    setViewportSize(375, 812);

    const root = document.createElement('div');
    document.body.append(root);

    const host = new RoccoViewportHost({
      root,
      designWidth: 960,
      designHeight: 540,
    });

    host.mount();

    const hostElement = host.getRootElement();
    const stageElement = host.getStageElement();

    const pointerDown = new PointerEvent('pointerdown', {
      clientX: 100,
      clientY: 100,
      button: 0,
      pointerId: 1,
    });
    hostElement.dispatchEvent(pointerDown);

    const pointerMove = new PointerEvent('pointermove', {
      clientX: 200,
      clientY: 200,
      pointerId: 1,
    });
    hostElement.dispatchEvent(pointerMove);

    const metrics = host.getMetrics();
    expect(metrics.scaleMode).toBe('cover');
    expect(metrics.offsetX).toBeGreaterThan(metrics.renderWidth / -2);

    const transform = stageElement.style.transform;
    expect(transform).toContain('translate');
    expect(transform).toContain('scale');

    const pointerUp = new PointerEvent('pointerup', {
      pointerId: 1,
    });
    hostElement.dispatchEvent(pointerUp);

    host.unmount();
  });

  it('suppresses cursor movement during pan', () => {
    setViewportSize(375, 812);

    const root = document.createElement('div');
    document.body.append(root);

    const host = new RoccoViewportHost({
      root,
      designWidth: 960,
      designHeight: 540,
      onCursorMove: () => {},
    });

    host.mount();

    const hostElement = host.getRootElement();
    const cursorElement = hostElement.querySelector('[data-rocco-cursor="true"]');

    const pointerDown = new PointerEvent('pointerdown', {
      clientX: 100,
      clientY: 100,
      button: 0,
      pointerId: 1,
    });
    hostElement.dispatchEvent(pointerDown);

    const initialTransform = (cursorElement as HTMLElement).style.transform;

    const pointerMove = new PointerEvent('pointermove', {
      clientX: 200,
      clientY: 200,
      pointerId: 1,
    });
    hostElement.dispatchEvent(pointerMove);

    expect((cursorElement as HTMLElement).style.transform).toBe(initialTransform);

    const pointerUp = new PointerEvent('pointerup', {
      pointerId: 1,
    });
    hostElement.dispatchEvent(pointerUp);

    host.unmount();
  });

  it('still fires cursor action on tap without pan', () => {
    setViewportSize(375, 812);

    const root = document.createElement('div');
    document.body.append(root);

    let isActionFired = false;
    const host = new RoccoViewportHost({
      root,
      designWidth: 960,
      designHeight: 540,
      onCursorAction: () => {
        isActionFired = true;
      },
    });

    host.mount();

    const hostElement = host.getRootElement();

    const pointerDown = new PointerEvent('pointerdown', {
      clientX: 100,
      clientY: 100,
      button: 0,
      pointerId: 1,
    });
    hostElement.dispatchEvent(pointerDown);

    const pointerUp = new PointerEvent('pointerup', {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    hostElement.dispatchEvent(pointerUp);

    expect(isActionFired).toBe(true);

    host.unmount();
  });

  it('re-attaches pointer listeners after mount -> unmount -> mount', () => {
    setViewportSize(375, 812);

    const root = document.createElement('div');
    document.body.append(root);

    const host = new RoccoViewportHost({
      root,
      designWidth: 960,
      designHeight: 540,
    });
    const hostElement = host.getRootElement();
    const addEventListenerSpy = vi.spyOn(hostElement, 'addEventListener');

    host.mount();
    host.unmount();
    host.mount();

    const pointerDownCalls = addEventListenerSpy.mock.calls.filter(
      ([eventName]) => eventName === 'pointerdown',
    );
    expect(pointerDownCalls).toHaveLength(4);

    hostElement.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        button: 0,
        pointerId: 7,
      }),
    );
    hostElement.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 180,
        clientY: 120,
        pointerId: 7,
      }),
    );

    const metrics = host.getMetrics();
    expect(metrics.scaleMode).toBe('cover');
    expect(metrics.offsetX).not.toBeCloseTo((375 - metrics.renderWidth) / 2, 5);

    hostElement.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7 }));
    host.unmount();
  });
});
