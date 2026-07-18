import './style.css';

import { registerSW } from 'virtual:pwa-register';
import { GameRuntime } from './console/runtime';
import { viewport } from './console/video';

function describeUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function writeBrowserLog(channel: string, message: string): void {
  const formattedMessage = `[ROCCO:${channel}] ${message}`;
  if (/error|fatal|fail/i.test(channel) || /error|fatal|fail/i.test(message)) {
    console.error(formattedMessage);
    return;
  }

  console.info(formattedMessage);
}

function createBootErrorPanel(): {
  panel: HTMLDivElement;
  title: HTMLHeadingElement;
  detail: HTMLParagraphElement;
} {
  const panel = document.createElement('div');
  panel.style.width = 'min(560px, 100%)';
  panel.style.padding = '24px';
  panel.style.border = '1px solid rgba(248, 113, 113, 0.35)';
  panel.style.borderRadius = '12px';
  panel.style.background = 'rgba(17, 19, 15, 0.92)';
  panel.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.45)';

  const title = document.createElement('h1');
  title.dataset.roccoBootTitle = 'true';
  title.style.margin = '0 0 12px';
  title.style.color = '#fca5a5';
  title.style.fontFamily = 'Cascadia Mono, Lucida Console, monospace';
  title.style.fontSize = '20px';
  title.style.lineHeight = '1.35';

  const detail = document.createElement('p');
  detail.dataset.roccoBootDetail = 'true';
  detail.style.margin = '0 0 16px';
  detail.style.whiteSpace = 'pre-wrap';
  detail.style.color = '#e5e7eb';
  detail.style.fontFamily = 'Cascadia Mono, Lucida Console, monospace';
  detail.style.fontSize = '14px';
  detail.style.lineHeight = '1.5';

  const retryButton = document.createElement('button');
  retryButton.dataset.roccoBootRetry = 'true';
  retryButton.type = 'button';
  retryButton.textContent = 'Reload';
  retryButton.style.padding = '10px 14px';
  retryButton.style.border = '1px solid rgba(252, 165, 165, 0.45)';
  retryButton.style.borderRadius = '8px';
  retryButton.style.background = '#2a1717';
  retryButton.style.color = '#fef2f2';
  retryButton.style.cursor = 'pointer';
  retryButton.addEventListener('click', () => location.reload());
  panel.append(title, detail, retryButton);
  return { panel, title, detail };
}

function ensureBootErrorOverlay(host: HTMLElement): {
  overlay: HTMLDivElement;
  title: HTMLHeadingElement;
  detail: HTMLParagraphElement;
} {
  let overlay = host.querySelector<HTMLDivElement>('[data-rocco-boot-error="true"]');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.dataset.roccoBootError = 'true';
    overlay.style.position = host === document.body ? 'fixed' : 'absolute';
    overlay.style.inset = '0';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '24px';
    overlay.style.background =
      'linear-gradient(180deg, rgba(15, 19, 15, 0.96) 0%, rgba(24, 11, 11, 0.96) 100%)';

    const panel = createBootErrorPanel();
    overlay.append(panel.panel);
    host.append(overlay);
  }

  const title = overlay.querySelector<HTMLHeadingElement>('[data-rocco-boot-title="true"]');
  const detail = overlay.querySelector<HTMLParagraphElement>('[data-rocco-boot-detail="true"]');
  if (!title || !detail) {
    throw new Error('Boot error overlay is missing required children.');
  }

  return { overlay, title, detail };
}

function renderBootError(host: HTMLElement, titleText: string, error: unknown): void {
  const { overlay, title, detail } = ensureBootErrorOverlay(host);
  overlay.style.display = 'flex';
  title.textContent = titleText;
  detail.textContent = describeUnknownError(error);
}

function clearBootError(host: HTMLElement): void {
  const overlay = host.querySelector<HTMLDivElement>('[data-rocco-boot-error="true"]');
  overlay?.remove();
}

function installGlobalErrorHandlers(
  onLog: (channel: string, message: string) => void,
  onFatalError: (title: string, error: unknown) => void,
): () => void {
  const handleWindowError = (event: ErrorEvent): void => {
    event.preventDefault();
    const location = event.filename ? ` at ${event.filename}:${event.lineno}:${event.colno}` : '';
    const error: unknown = event.error ?? event.message;
    onLog('System', `Unhandled error${location}: ${describeUnknownError(error)}`);
    onFatalError('A runtime error occurred.', error);
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    event.preventDefault();
    onLog('System', `Unhandled promise rejection: ${describeUnknownError(event.reason)}`);
    onFatalError('A runtime error occurred.', event.reason);
  };

  addEventListener('error', handleWindowError);
  addEventListener('unhandledrejection', handleUnhandledRejection);

  return () => {
    removeEventListener('error', handleWindowError);
    removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
}

async function bootstrapRoccoApp(): Promise<void> {
  registerSW({ immediate: true });

  const appRoot = document.querySelector<HTMLDivElement>('#app');
  if (!appRoot) {
    throw new Error('Could not find #app');
  }

  const viewportHost = new viewport.RoccoViewportHost({
    root: appRoot,
    designWidth: 960,
    designHeight: 540,
    backgroundColor: '#11130f',
  });
  viewportHost.mount();

  const renderFatalError = (title: string, error: unknown): void => {
    renderBootError(viewportHost.getRootElement(), title, error);
  };
  const removeGlobalErrorHandlers = installGlobalErrorHandlers(writeBrowserLog, renderFatalError);

  let runtime: GameRuntime | undefined;
  const handleBeforeUnload = (): void => {
    removeGlobalErrorHandlers();
    // The unload event cannot await asynchronous runtime teardown.
    void runtime?.dispose();
    viewportHost.unmount();
  };
  window.addEventListener('beforeunload', handleBeforeUnload, { once: true });

  try {
    runtime = new GameRuntime({
      mount: viewportHost.getStageElement(),
      viewportHost,
      developerModeEnabled: false,
      onDisplayProfileChange: (profile) => {
        viewportHost.setDisplayProfile(profile);
      },
      onLog: writeBrowserLog,
    });
    await runtime.init();
    clearBootError(viewportHost.getRootElement());
  } catch (error) {
    writeBrowserLog('System', `Boot failed: ${describeUnknownError(error)}`);
    renderFatalError('ROCCO could not start.', error);
    if (runtime) {
      try {
        await runtime.dispose();
      } catch (disposeError) {
        writeBrowserLog('System', `Boot cleanup failed: ${describeUnknownError(disposeError)}`);
      }
    }
  }
}

try {
  await bootstrapRoccoApp();
} catch (error) {
  writeBrowserLog('System', `Bootstrap failed before mount: ${describeUnknownError(error)}`);
  renderBootError(
    document.querySelector<HTMLElement>('#app') ?? document.body,
    'ROCCO could not start.',
    error,
  );
}
