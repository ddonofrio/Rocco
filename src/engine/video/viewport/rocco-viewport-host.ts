import {
  RoccoDisplayProfileRenderer,
  type RoccoDisplayProfile,
} from '../display/rocco-display-profile';
import {
  RoccoCursorHost,
  type RoccoCursorActionHandler,
  type RoccoCursorAttachment,
  type RoccoCursorLeaveHandler,
  type RoccoCursorMoveHandler,
  type RoccoCursorProfile,
} from '../cursor/rocco-cursor-host';

export type RoccoViewportScaleMode = 'contain';

export interface RoccoViewportHostOptions {
  root?: HTMLElement;
  designWidth: number;
  designHeight: number;
  backgroundColor?: string;
  displayProfile?: Partial<RoccoDisplayProfile>;
  cursorProfile?: Partial<RoccoCursorProfile> | false;
  onCursorAction?: RoccoCursorActionHandler;
  onCursorMove?: RoccoCursorMoveHandler;
  onCursorLeave?: RoccoCursorLeaveHandler;
}

export interface RoccoViewportMetrics {
  viewportWidth: number;
  viewportHeight: number;
  designWidth: number;
  designHeight: number;
  scale: number;
  renderWidth: number;
  renderHeight: number;
  offsetX: number;
  offsetY: number;
}

export class RoccoViewportHost {
  private readonly rootElement: HTMLElement;
  private readonly hostElement: HTMLDivElement;
  private readonly stageElement: HTMLDivElement;
  private readonly displayProfileRenderer: RoccoDisplayProfileRenderer;
  private readonly cursorHost: RoccoCursorHost;
  private readonly designWidth: number;
  private readonly designHeight: number;
  private readonly backgroundColor: string;
  private readonly ownsRootElement: boolean;
  private mounted = false;
  private metrics: RoccoViewportMetrics;

  constructor(options: RoccoViewportHostOptions) {
    if (!Number.isFinite(options.designWidth) || options.designWidth <= 0) {
      throw new Error(`Invalid designWidth '${options.designWidth}'. It must be a positive number.`);
    }
    if (!Number.isFinite(options.designHeight) || options.designHeight <= 0) {
      throw new Error(`Invalid designHeight '${options.designHeight}'. It must be a positive number.`);
    }

    this.designWidth = options.designWidth;
    this.designHeight = options.designHeight;
    this.backgroundColor = options.backgroundColor ?? '#000000';
    this.ownsRootElement = !options.root;
    this.rootElement = options.root ?? document.createElement('div');

    this.hostElement = document.createElement('div');
    this.hostElement.dataset.roccoViewportHost = 'true';
    this.hostElement.style.position = 'fixed';
    this.hostElement.style.left = '0';
    this.hostElement.style.top = '0';
    this.hostElement.style.width = '100vw';
    this.hostElement.style.height = '100vh';
    this.hostElement.style.overflow = 'hidden';
    this.hostElement.style.backgroundColor = this.backgroundColor;
    this.hostElement.style.touchAction = 'none';

    this.stageElement = document.createElement('div');
    this.stageElement.dataset.roccoViewportStage = 'true';
    this.stageElement.style.position = 'absolute';
    this.stageElement.style.left = '0';
    this.stageElement.style.top = '0';
    this.stageElement.style.width = `${this.designWidth}px`;
    this.stageElement.style.height = `${this.designHeight}px`;
    this.stageElement.style.transformOrigin = 'top left';
    this.stageElement.style.overflow = 'hidden';
    this.stageElement.style.willChange = 'transform';

    this.displayProfileRenderer = new RoccoDisplayProfileRenderer({
      rootElement: this.hostElement,
      stageElement: this.stageElement,
      profile: options.displayProfile,
    });
    this.cursorHost = new RoccoCursorHost({
      rootElement: this.hostElement,
      profile: options.cursorProfile === false ? { enabled: false } : options.cursorProfile,
      onAction: options.onCursorAction,
      onMove: options.onCursorMove,
      onLeave: options.onCursorLeave,
    });

    this.metrics = {
      viewportWidth: 0,
      viewportHeight: 0,
      designWidth: this.designWidth,
      designHeight: this.designHeight,
      scale: 1,
      renderWidth: this.designWidth,
      renderHeight: this.designHeight,
      offsetX: 0,
      offsetY: 0,
    };
  }

  mount(): void {
    if (this.mounted) {
      return;
    }

    if (this.ownsRootElement && !this.rootElement.parentElement) {
      document.body.appendChild(this.rootElement);
    }

    this.applyRootStyles();
    this.hostElement.appendChild(this.stageElement);
    this.displayProfileRenderer.mount();
    this.cursorHost.mount();
    this.rootElement.appendChild(this.hostElement);
    window.addEventListener('resize', this.onWindowResize);

    this.mounted = true;
    this.resize();
  }

  unmount(): void {
    if (!this.mounted) {
      return;
    }

    window.removeEventListener('resize', this.onWindowResize);
    this.cursorHost.unmount();
    this.displayProfileRenderer.unmount();
    this.stageElement.remove();
    this.hostElement.remove();

    if (this.ownsRootElement) {
      this.rootElement.remove();
    }

    this.mounted = false;
  }

  resize(): void {
    const viewportWidth = Math.max(1, this.hostElement.clientWidth || window.innerWidth || 1);
    const viewportHeight = Math.max(1, this.hostElement.clientHeight || window.innerHeight || 1);

    const scale = Math.min(viewportWidth / this.designWidth, viewportHeight / this.designHeight);
    const renderWidth = this.designWidth * scale;
    const renderHeight = this.designHeight * scale;
    const offsetX = (viewportWidth - renderWidth) / 2;
    const offsetY = (viewportHeight - renderHeight) / 2;

    this.stageElement.style.width = `${this.designWidth}px`;
    this.stageElement.style.height = `${this.designHeight}px`;
    this.stageElement.style.transformOrigin = 'top left';
    this.stageElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;

    this.metrics = {
      viewportWidth,
      viewportHeight,
      designWidth: this.designWidth,
      designHeight: this.designHeight,
      scale,
      renderWidth,
      renderHeight,
      offsetX,
      offsetY,
    };

    this.displayProfileRenderer.applyMetrics(this.metrics);
    this.cursorHost.applyMetrics(this.metrics);
  }

  getRootElement(): HTMLElement {
    return this.hostElement;
  }

  getStageElement(): HTMLElement {
    return this.stageElement;
  }

  getMetrics(): RoccoViewportMetrics {
    return { ...this.metrics };
  }

  setDisplayProfile(profile: Partial<RoccoDisplayProfile>): void {
    this.displayProfileRenderer.setProfile(profile);
    this.displayProfileRenderer.applyMetrics(this.metrics);
  }

  setCursorProfile(profile: Partial<RoccoCursorProfile>): void {
    this.cursorHost.setProfile(profile);
    this.cursorHost.applyMetrics(this.metrics);
  }

  setCursorAttachment(attachment: RoccoCursorAttachment | undefined): void {
    this.cursorHost.setAttachment(attachment);
    this.cursorHost.applyMetrics(this.metrics);
  }

  getCursorAttachment(): RoccoCursorAttachment | undefined {
    return this.cursorHost.getAttachment();
  }

  setCursorActionHandler(handler: RoccoCursorActionHandler | undefined): void {
    this.cursorHost.setActionHandler(handler);
  }

  setCursorMoveHandler(handler: RoccoCursorMoveHandler | undefined): void {
    this.cursorHost.setMoveHandler(handler);
  }

  setCursorLeaveHandler(handler: RoccoCursorLeaveHandler | undefined): void {
    this.cursorHost.setLeaveHandler(handler);
  }

  getCursorHost(): RoccoCursorHost {
    return this.cursorHost;
  }

  private applyRootStyles(): void {
    this.rootElement.style.margin = '0';
    this.rootElement.style.padding = '0';
    this.rootElement.style.width = '100%';
    this.rootElement.style.height = '100%';
    this.rootElement.style.overflow = 'hidden';
    this.rootElement.style.backgroundColor = this.backgroundColor;
  }

  private readonly onWindowResize = (): void => {
    this.resize();
  };
}
