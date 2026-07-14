// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mainTestState = vi.hoisted(() => ({
  registerSW: vi.fn(),
  runtimeInit: vi.fn(() => Promise.resolve()),
  runtimeDispose: vi.fn(() => Promise.resolve()),
  viewportMount: vi.fn(),
  viewportUnmount: vi.fn(),
  viewportSetDisplayProfile: vi.fn(),
  stageElement: null as HTMLDivElement | null,
  rootElement: null as HTMLDivElement | null,
}));

vi.mock('virtual:pwa-register', () => ({
  registerSW: mainTestState.registerSW,
}));

vi.mock('../src/console/runtime', () => ({
  GameRuntime: class MockGameRuntime {
    init = mainTestState.runtimeInit;
    dispose = mainTestState.runtimeDispose;
  },
}));

vi.mock('../src/console/video', () => ({
  viewport: {
    RoccoViewportHost: class MockViewportHost {
      mount = mainTestState.viewportMount;
      unmount = mainTestState.viewportUnmount;
      getStageElement() {
        return mainTestState.stageElement ?? document.createElement('div');
      }
      getRootElement() {
        return mainTestState.rootElement ?? document.createElement('div');
      }
      setDisplayProfile = mainTestState.viewportSetDisplayProfile;
    },
  },
}));

describe('src/main.ts bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mainTestState.stageElement = document.createElement('div');
    mainTestState.rootElement = document.createElement('div');

    const appRoot = document.querySelector<HTMLDivElement>('#app');
    if (!appRoot) {
      throw new Error('Missing #app in main test setup.');
    }

    mainTestState.viewportMount.mockImplementation(() => {
      if (mainTestState.rootElement && !mainTestState.rootElement.parentElement) {
        appRoot.append(mainTestState.rootElement);
      }
    });
    mainTestState.viewportUnmount.mockImplementation(() => {
      mainTestState.rootElement?.remove();
    });
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('renders a recoverable boot error when runtime init fails', async () => {
    mainTestState.runtimeInit.mockRejectedValueOnce(new Error('no-webgl'));

    await import('../src/main.ts');

    await vi.waitFor(() => {
      expect(document.querySelector('[data-rocco-boot-error="true"]')).not.toBeNull();
    });

    expect(document.querySelector('[data-rocco-boot-title="true"]')?.textContent).toContain(
      'ROCCO could not start.',
    );
    expect(document.querySelector('[data-rocco-boot-detail="true"]')?.textContent).toContain(
      'no-webgl',
    );
    expect(mainTestState.registerSW).toHaveBeenCalledWith({ immediate: true });
  });

  it('surfaces unhandled runtime errors after a successful boot', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await import('../src/main.ts');

    globalThis.dispatchEvent(
      new ErrorEvent('error', {
        message: 'boom',
        error: new Error('boom'),
        filename: 'main.ts',
        lineno: 12,
        colno: 4,
      }),
    );

    await vi.waitFor(() => {
      expect(document.querySelector('[data-rocco-boot-error="true"]')).not.toBeNull();
    });

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Unhandled error at main.ts:12:4: boom'),
    );
    expect(document.querySelector('[data-rocco-boot-title="true"]')?.textContent).toContain(
      'A runtime error occurred.',
    );
  });
});
