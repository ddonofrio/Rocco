import 'fake-indexeddb/auto';

// jsdom does not implement a real canvas rendering context, which breaks PixiJS
// text/texture measurement (CanvasTextMetrics calls getContext('2d').measureText).
// We provide a lightweight fake 2D context so measurement succeeds without a real
// canvas. Tests that need a no-context environment override this themselves.
function createFake2DContext(): CanvasRenderingContext2D {
  const context = {
    font: '10px monospace',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillStyle: '#000',
    strokeStyle: '#000',
    globalAlpha: 1,
    lineWidth: 1,
    imageSmoothingEnabled: false,
    measureText: (text: string) => ({
      width: text.length * 10,
      actualBoundingBoxAscent: 12,
      actualBoundingBoxDescent: 4,
    }),
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    strokeText: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    rect: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
    scale: () => {},
    translate: () => {},
    rotate: () => {},
    drawImage: () => {},
    getImageData: () => ({
      width: 1,
      height: 1,
      data: new Uint8ClampedArray(4),
    }),
    putImageData: () => {},
    createImageData: () => ({ width: 1, height: 1, data: new Uint8ClampedArray(4) }),
  };
  return context as unknown as CanvasRenderingContext2D;
}

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = ((contextId: string) =>
    contextId === '2d'
      ? createFake2DContext()
      : null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

if (typeof globalThis !== 'undefined' && !('OffscreenCanvas' in globalThis)) {
  class FakeOffscreenCanvas {
    width = 0;
    height = 0;
    getContext(contextId: string): CanvasRenderingContext2D | null {
      return contextId === '2d' ? createFake2DContext() : null;
    }
  }
  Object.assign(globalThis, { OffscreenCanvas: FakeOffscreenCanvas });
}

// Build meta globals are injected by Vite's define during dev/build but are
// absent in the vitest environment. Provide safe fallbacks so tests can mount
// subsystems that import build-meta.
if (typeof globalThis !== 'undefined') {
  Object.assign(globalThis as Record<string, unknown>, {
    __ROCCO_VERSION__: '0.1.0',
    __ROCCO_COMMIT_COUNT__: '0',
    __ROCCO_PLAYTEST_STAGE__: 'development',
  });
}

if (typeof HTMLDivElement !== 'undefined') {
  HTMLDivElement.prototype.setPointerCapture = () => {};
  HTMLDivElement.prototype.releasePointerCapture = () => {};
}
