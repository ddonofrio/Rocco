// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { RoccoCursorHost } from '../../../../src/console/video/cursor/host';
import type { RoccoViewportMetrics } from '../../../../src/console/video/viewport/host';

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

function createRoot(): HTMLElement {
  const root = document.createElement('div');
  Object.defineProperty(root, 'getBoundingClientRect', {
    value: () => ({
      x: 10,
      y: 20,
      left: 10,
      top: 20,
      right: 1290,
      bottom: 740,
      width: 1280,
      height: 720,
      toJSON: () => {},
    }),
  });
  document.body.append(root);
  return root;
}

function dispatchPointer(
  target: HTMLElement,
  type: string,
  clientX: number,
  clientY: number,
  button = 0,
  pointerType?: string,
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX,
    clientY,
    button,
  });
  if (pointerType) {
    Object.defineProperty(event, 'pointerType', {
      configurable: true,
      value: pointerType,
    });
  }
  target.dispatchEvent(event);
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('RoccoCursorHost', () => {
  it('mounts a four-line cursor overlay without taking pointer events', () => {
    const root = createRoot();
    const cursorHost = new RoccoCursorHost({ rootElement: root });

    cursorHost.mount();
    cursorHost.applyMetrics(makeMetrics());

    const cursor = root.querySelector<HTMLElement>('[data-rocco-cursor="true"]');
    const lines = root.querySelectorAll('[data-rocco-cursor-line]');
    expect(cursor).not.toBeNull();
    expect(lines).toHaveLength(4);
    expect(cursor?.style.pointerEvents).toBe('none');
    expect(root.style.cursor).toBe('none');

    cursorHost.unmount();
  });

  it('moves inside the visible scene area and hides outside the contain bounds', () => {
    const root = createRoot();
    const cursorHost = new RoccoCursorHost({ rootElement: root });
    cursorHost.mount();
    cursorHost.applyMetrics(makeMetrics());

    dispatchPointer(root, 'pointermove', 170, 102);

    const cursor = cursorHost.getCursorElement();
    expect(cursor.style.display).toBe('block');
    expect(cursor.style.transform).toBe('translate3d(160px, 82px, 0)');

    dispatchPointer(root, 'pointermove', 30, 102);
    expect(cursor.style.display).toBe('none');
  });

  it('emits click actions with scene coordinates', () => {
    const root = createRoot();
    const onAction = vi.fn();
    const cursorHost = new RoccoCursorHost({ rootElement: root, onAction });
    cursorHost.mount();
    cursorHost.applyMetrics(makeMetrics());

    dispatchPointer(root, 'pointerdown', 170, 102, 0);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction.mock.calls[0][0]).toMatchObject({
      kind: 'click',
      viewportX: 160,
      viewportY: 82,
      sceneX: 96,
      sceneY: 48,
      button: 0,
    });
  });

  it('emits move and leave events for hover-driven systems', () => {
    const root = createRoot();
    const onMove = vi.fn();
    const onLeave = vi.fn();
    const cursorHost = new RoccoCursorHost({ rootElement: root, onMove, onLeave });
    cursorHost.mount();
    cursorHost.applyMetrics(makeMetrics());

    dispatchPointer(root, 'pointermove', 170, 102);
    dispatchPointer(root, 'pointermove', 30, 102);
    dispatchPointer(root, 'pointerleave', 30, 102);

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove.mock.calls[0][0]).toMatchObject({
      kind: 'move',
      sceneX: 96,
      sceneY: 48,
    });
    expect(onLeave).toHaveBeenCalledTimes(2);
  });

  it('does not emit leave events for touch pointers', () => {
    const root = createRoot();
    const onLeave = vi.fn();
    const cursorHost = new RoccoCursorHost({ rootElement: root, onLeave });
    cursorHost.mount();
    cursorHost.applyMetrics(makeMetrics());

    dispatchPointer(root, 'pointermove', 170, 102, 0, 'touch');
    dispatchPointer(root, 'pointermove', 30, 102, 0, 'touch');
    dispatchPointer(root, 'pointerleave', 30, 102, 0, 'touch');

    expect(onLeave).not.toHaveBeenCalled();
    expect(cursorHost.getCursorElement().style.display).toBe('none');
  });

  it('shows an image attachment instead of cursor lines', () => {
    const root = createRoot();
    const cursorHost = new RoccoCursorHost({ rootElement: root });
    cursorHost.mount();
    cursorHost.applyMetrics(makeMetrics());

    cursorHost.setAttachment({
      imageUri: '/keys.png',
      label: 'Keys',
      size: 40,
    });

    const attachment = root.querySelector<HTMLImageElement>('[data-rocco-cursor-attachment="true"]');
    const lines = root.querySelectorAll<HTMLSpanElement>('[data-rocco-cursor-line]');
    expect(attachment?.src).toContain('/keys.png');
    expect(attachment?.style.display).toBe('block');
    expect(attachment?.style.width).toBe('40px');
    expect([...lines].every((line) => line.style.display === 'none')).toBe(true);

    cursorHost.setAttachment(undefined);

    expect(attachment?.style.display).toBe('none');
    expect([...lines].every((line) => line.style.display === 'block')).toBe(true);
  });

  it('stays hidden and silent when disabled', () => {
    const root = createRoot();
    const onAction = vi.fn();
    const cursorHost = new RoccoCursorHost({
      rootElement: root,
      profile: { enabled: false },
      onAction,
    });
    cursorHost.mount();
    cursorHost.applyMetrics(makeMetrics());

    dispatchPointer(root, 'pointermove', 170, 102);
    dispatchPointer(root, 'pointerdown', 170, 102);

    expect(cursorHost.getCursorElement().style.display).toBe('none');
    expect(onAction).not.toHaveBeenCalled();
    expect(root.style.cursor).toBe('');
  });
});
