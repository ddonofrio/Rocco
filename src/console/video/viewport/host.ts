import {
  RoccoDisplayProfileRenderer,
  type RoccoDisplayProfile,
} from '../display/profile';
import { RoccoBuildBadgeRenderer } from '../badge';
import {
  RoccoCursorHost,
  type RoccoCursorActionHandler,
  type RoccoCursorAttachment,
  type RoccoCursorLeaveHandler,
  type RoccoCursorMoveHandler,
  type RoccoCursorProfile,
} from '../cursor/host';

export type RoccoViewportScaleMode = 'contain' | 'cover';

export interface RoccoViewportHostOptions {
  root?: HTMLElement;
  designWidth: number;
  designHeight: number;
  backgroundColor?: string;
  displayProfile?: Partial<RoccoDisplayProfile>;
  cursorProfile?: Partial<RoccoCursorProfile> | false;
  scaleMode?: RoccoViewportScaleMode;
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
  scaleMode: 'contain' | 'cover';
}

function createViewportHostElement(backgroundColor: string): HTMLDivElement {
  const element = document.createElement('div');
  element.dataset.roccoViewportHost = 'true';
  Object.assign(element.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '100vw',
    height: '100dvh',
    overflow: 'hidden',
    backgroundColor,
    touchAction: 'none',
    userSelect: 'none',
  });
  return element;
}

function createViewportStageElement(designWidth: number, designHeight: number): HTMLDivElement {
  const element = document.createElement('div');
  element.dataset.roccoViewportStage = 'true';
  Object.assign(element.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    width: `${designWidth}px`,
    height: `${designHeight}px`,
    transformOrigin: 'top left',
    overflow: 'hidden',
    willChange: 'transform',
  });
  return element;
}

export class RoccoViewportHost {
  private readonly rootElement: HTMLElement;
  private readonly hostElement: HTMLDivElement;
  private readonly stageElement: HTMLDivElement;
  private readonly displayProfileRenderer: RoccoDisplayProfileRenderer;
  private readonly buildBadgeRenderer: RoccoBuildBadgeRenderer;
  private readonly cursorHost: RoccoCursorHost;
  private readonly designWidth: number;
  private readonly designHeight: number;
  private readonly backgroundColor: string;
  private readonly ownsRootElement: boolean;
  private mounted = false;
  private scaleMode: RoccoViewportScaleMode = 'contain';
  private readonly explicitScaleMode: RoccoViewportScaleMode | undefined;
  private panX = 0;
  private panY = 0;
  private readonly panThreshold = 5;
  private panState = { active: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 };
  private panPointerId: number | undefined;
  private metrics: RoccoViewportMetrics;
  private hostListenersAttached = false;
  private readonly onWindowResize = (): void => {
    this.resize();
  };
  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.scaleMode !== 'cover' || event.button !== 0) {
      return;
    }

    this.panState.active = false;
    this.panState.startX = event.clientX;
    this.panState.startY = event.clientY;
    this.panState.startPanX = this.panX;
    this.panState.startPanY = this.panY;
    this.panPointerId = event.pointerId;
    this.hostElement.setPointerCapture(event.pointerId);
  };
  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.scaleMode !== 'cover' || event.pointerId !== this.panPointerId) {
      return;
    }

    const dx = event.clientX - this.panState.startX;
    const dy = event.clientY - this.panState.startY;

    if (!this.panState.active) {
      if (Math.abs(dx) <= this.panThreshold && Math.abs(dy) <= this.panThreshold) {
        return;
      }

      this.panState.active = true;
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    this.panX = this.panState.startPanX + dx;
    this.panY = this.panState.startPanY + dy;
    this.resize();
  };
  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.scaleMode !== 'cover' || event.pointerId !== this.panPointerId) {
      return;
    }

    if (this.panState.active) {
      event.stopImmediatePropagation();
    }

    this.panState.active = false;
    this.panPointerId = undefined;
    this.hostElement.releasePointerCapture(event.pointerId);
  };

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

    this.hostElement = createViewportHostElement(this.backgroundColor);
    this.stageElement = createViewportStageElement(this.designWidth, this.designHeight);

    this.displayProfileRenderer = new RoccoDisplayProfileRenderer({
      rootElement: this.hostElement,
      stageElement: this.stageElement,
      profile: options.displayProfile,
    });
    this.buildBadgeRenderer = new RoccoBuildBadgeRenderer({ hostElement: this.hostElement });
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
      scaleMode: 'contain',
    };

    this.scaleMode = options.scaleMode ?? 'contain';
    this.explicitScaleMode = options.scaleMode;
  }

  private applyRootStyles(): void {
    this.rootElement.style.margin = '0';
    this.rootElement.style.padding = '0';
    this.rootElement.style.width = '100%';
    this.rootElement.style.height = '100%';
    this.rootElement.style.overflow = 'hidden';
    this.rootElement.style.backgroundColor = this.backgroundColor;
  }

  private attachHostListeners(): void {
    if (this.hostListenersAttached) {
      return;
    }

    this.hostElement.addEventListener('pointerdown', this.onPointerDown);
    this.hostElement.addEventListener('pointermove', this.onPointerMove);
    this.hostElement.addEventListener('pointerup', this.onPointerUp);
    this.hostElement.addEventListener('pointercancel', this.onPointerUp);
    this.hostElement.addEventListener('lostpointercapture', this.onPointerUp);
    this.hostListenersAttached = true;
  }

  private detachHostListeners(): void {
    if (!this.hostListenersAttached) {
      return;
    }

    this.hostElement.removeEventListener('pointerdown', this.onPointerDown);
    this.hostElement.removeEventListener('pointermove', this.onPointerMove);
    this.hostElement.removeEventListener('pointerup', this.onPointerUp);
    this.hostElement.removeEventListener('pointercancel', this.onPointerUp);
    this.hostElement.removeEventListener('lostpointercapture', this.onPointerUp);
    this.hostListenersAttached = false;
  }

  mount(): void {
    if (this.mounted) {
      return;
    }

    if (this.ownsRootElement && !this.rootElement.parentElement) {
      document.body.append(this.rootElement);
    }

    this.applyRootStyles();
    this.attachHostListeners();
    this.hostElement.append(this.stageElement);
    this.displayProfileRenderer.mount();
    this.buildBadgeRenderer.mount();
    this.cursorHost.mount();
    this.rootElement.append(this.hostElement);
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
    this.buildBadgeRenderer.unmount();
    this.stageElement.remove();
    this.detachHostListeners();

    if (this.ownsRootElement) {
      this.rootElement.remove();
    }

    this.mounted = false;
  }

  resize(): void {
    const viewportWidth = Math.max(1, this.hostElement.clientWidth || window.innerWidth || 1);
    const viewportHeight = Math.max(1, this.hostElement.clientHeight || window.innerHeight || 1);

    const viewportAspect = viewportWidth / viewportHeight;
    const designAspect = this.designWidth / this.designHeight;

    const autoScaleMode = viewportAspect < designAspect ? 'cover' : 'contain';

    if (this.scaleMode === 'cover' && autoScaleMode === 'contain') {
      this.panX = 0;
      this.panY = 0;
    }
    this.scaleMode = this.explicitScaleMode ?? autoScaleMode;

    let scale: number;
    let renderWidth: number;
    let renderHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (this.scaleMode === 'contain') {
      scale = Math.min(viewportWidth / this.designWidth, viewportHeight / this.designHeight);
      renderWidth = this.designWidth * scale;
      renderHeight = this.designHeight * scale;
      offsetX = (viewportWidth - renderWidth) / 2;
      offsetY = (viewportHeight - renderHeight) / 2;
    } else {
      scale = Math.max(viewportWidth / this.designWidth, viewportHeight / this.designHeight);
      renderWidth = this.designWidth * scale;
      renderHeight = this.designHeight * scale;

      const centeredOffsetX = (viewportWidth - renderWidth) / 2;
      const centeredOffsetY = (viewportHeight - renderHeight) / 2;
      const minPanX = viewportWidth - renderWidth - centeredOffsetX;
      const maxPanX = -centeredOffsetX;
      const minPanY = viewportHeight - renderHeight - centeredOffsetY;
      const maxPanY = -centeredOffsetY;
      this.panX = Math.max(minPanX, Math.min(maxPanX, this.panX));
      this.panY = Math.max(minPanY, Math.min(maxPanY, this.panY));

      offsetX = centeredOffsetX + this.panX;
      offsetY = centeredOffsetY + this.panY;
    }

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
      scaleMode: this.scaleMode,
    };

    this.displayProfileRenderer.applyMetrics(this.metrics);
    this.buildBadgeRenderer.applyMetrics(this.metrics);
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
}
