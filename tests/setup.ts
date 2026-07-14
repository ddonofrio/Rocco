import 'fake-indexeddb/auto';

// jsdom does not implement a real canvas rendering context and logs a noisy
// "Not implemented: HTMLCanvasElement.prototype.getContext" error whenever the
// production code touches a canvas. The runtime already treats a missing 2D
// context as an unsupported environment (returning early or falling back), so
// we replace getContext with a quiet stub that returns null just like jsdom
// would. Individual tests that need a working context still override this via
// their own vi.spyOn/mockImplementation calls.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext =
    (() => null) as typeof HTMLCanvasElement.prototype.getContext;
}

// Build meta globals are injected by Vite's define during dev/build but are
// absent in the vitest environment. Provide safe fallbacks so tests can mount
// subsystems that import build-meta.
if (typeof globalThis !== 'undefined') {
  (globalThis as Record<string, unknown>).__ROCCO_VERSION__ = '0.1.0';
  (globalThis as Record<string, unknown>).__ROCCO_COMMIT_COUNT__ = '0';
  (globalThis as Record<string, unknown>).__ROCCO_PLAYTEST_STAGE__ = 'development';
}

if (typeof HTMLDivElement !== 'undefined') {
  HTMLDivElement.prototype.setPointerCapture = () => {};
  HTMLDivElement.prototype.releasePointerCapture = () => {};
}
