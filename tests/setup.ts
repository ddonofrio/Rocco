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
