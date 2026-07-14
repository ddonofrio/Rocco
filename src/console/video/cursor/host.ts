import type { RoccoViewportMetrics } from '../viewport/host';

export interface RoccoCursorProfile {
  enabled: boolean;
  color: string;
  shadowColor: string;
  lineLength: number;
  lineGap: number;
  lineThickness: number;
  opacity: number;
}

export interface RoccoCursorAttachment {
  imageUri: string;
  label?: string;
  size?: number;
  opacity?: number;
}

export interface RoccoCursorPoint {
  viewportX: number;
  viewportY: number;
  sceneX: number;
  sceneY: number;
}

export interface RoccoCursorActionEvent extends RoccoCursorPoint {
  kind: 'click';
  button: number;
  originalEvent: PointerEvent;
}

export interface RoccoCursorMoveEvent extends RoccoCursorPoint {
  kind: 'move';
  originalEvent: PointerEvent;
}

export type RoccoCursorActionHandler = (event: RoccoCursorActionEvent) => void;
export type RoccoCursorMoveHandler = (event: RoccoCursorMoveEvent) => void;
export type RoccoCursorLeaveHandler = () => void;

export interface RoccoCursorHostOptions {
  rootElement: HTMLElement;
  profile?: Partial<RoccoCursorProfile>;
  onAction?: RoccoCursorActionHandler;
  onMove?: RoccoCursorMoveHandler;
  onLeave?: RoccoCursorLeaveHandler;
}

type RoccoCursorLinePosition = 'top' | 'right' | 'bottom' | 'left';

export const defaultRoccoCursorProfile: RoccoCursorProfile = {
  enabled: true,
  color: '#d7e6c5',
  shadowColor: 'rgba(15, 22, 16, 0.85)',
  lineLength: 13,
  lineGap: 5,
  lineThickness: 4,
  opacity: 0.95,
};

function shouldNotifyLeave(event: PointerEvent): boolean {
  return event.pointerType !== 'touch';
}

export class RoccoCursorHost {
  private readonly rootElement: HTMLElement;
  private readonly cursorElement: HTMLDivElement;
  private readonly attachmentElement: HTMLImageElement;
  private readonly lineElements = new Map<RoccoCursorLinePosition, HTMLSpanElement>();
  private profile: RoccoCursorProfile;
  private attachment: RoccoCursorAttachment | undefined;
  private actionHandler: RoccoCursorActionHandler | undefined;
  private moveHandler: RoccoCursorMoveHandler | undefined;
  private leaveHandler: RoccoCursorLeaveHandler | undefined;
  private metrics: RoccoViewportMetrics | null = null;
  private mounted = false;
  private previousCursorStyle = '';
  private lastClientPoint: { x: number; y: number } | null = null;

  constructor(options: RoccoCursorHostOptions) {
    this.rootElement = options.rootElement;
    this.profile = { ...defaultRoccoCursorProfile, ...options.profile };
    this.actionHandler = options.onAction;
    this.moveHandler = options.onMove;
    this.leaveHandler = options.onLeave;

    this.cursorElement = document.createElement('div');
    this.cursorElement.dataset.roccoCursor = 'true';
    this.cursorElement.style.position = 'absolute';
    this.cursorElement.style.left = '0';
    this.cursorElement.style.top = '0';
    this.cursorElement.style.width = '0';
    this.cursorElement.style.height = '0';
    this.cursorElement.style.pointerEvents = 'none';
    this.cursorElement.style.display = 'none';
    this.cursorElement.style.zIndex = '70';
    this.cursorElement.style.willChange = 'transform';

    this.attachmentElement = document.createElement('img');
    this.attachmentElement.dataset.roccoCursorAttachment = 'true';
    this.attachmentElement.alt = '';
    this.attachmentElement.style.position = 'absolute';
    this.attachmentElement.style.left = '0';
    this.attachmentElement.style.top = '0';
    this.attachmentElement.style.display = 'none';
    this.attachmentElement.style.pointerEvents = 'none';
    this.attachmentElement.style.objectFit = 'contain';
    this.attachmentElement.style.transform = 'translate(-50%, -50%)';
    this.attachmentElement.style.filter = 'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.7))';
    this.cursorElement.append(this.attachmentElement);

    this.createLine('top');
    this.createLine('right');
    this.createLine('bottom');
    this.createLine('left');
    this.applyProfileStyles();
  }

  mount(): void {
    if (this.mounted) {
      return;
    }

    this.previousCursorStyle = this.rootElement.style.cursor;
    this.rootElement.style.cursor = this.profile.enabled ? 'none' : this.previousCursorStyle;
    this.rootElement.append(this.cursorElement);
    this.rootElement.addEventListener('pointermove', this.onPointerMove);
    this.rootElement.addEventListener('pointerleave', this.onPointerLeave);
    this.rootElement.addEventListener('pointerdown', this.onPointerDown);
    this.mounted = true;
  }

  unmount(): void {
    if (!this.mounted) {
      return;
    }

    this.rootElement.removeEventListener('pointermove', this.onPointerMove);
    this.rootElement.removeEventListener('pointerleave', this.onPointerLeave);
    this.rootElement.removeEventListener('pointerdown', this.onPointerDown);
    this.rootElement.style.cursor = this.previousCursorStyle;
    this.cursorElement.remove();
    this.lastClientPoint = null;
    this.mounted = false;
  }

  applyMetrics(metrics: RoccoViewportMetrics): void {
    this.metrics = { ...metrics };
    this.refreshLastPointerPosition();
  }

  setProfile(profile: Partial<RoccoCursorProfile>): void {
    this.profile = { ...this.profile, ...profile };
    this.applyProfileStyles();
    if (this.mounted) {
      this.rootElement.style.cursor = this.profile.enabled ? 'none' : this.previousCursorStyle;
    }
    this.refreshLastPointerPosition();
  }

  setAttachment(attachment: RoccoCursorAttachment | undefined): void {
    this.attachment = attachment ? { ...attachment } : undefined;
    this.applyAttachmentStyles();
    this.applyProfileStyles();
    this.refreshLastPointerPosition();
  }

  getAttachment(): RoccoCursorAttachment | undefined {
    return this.attachment ? { ...this.attachment } : undefined;
  }

  setActionHandler(handler: RoccoCursorActionHandler | undefined): void {
    this.actionHandler = handler;
  }

  setMoveHandler(handler: RoccoCursorMoveHandler | undefined): void {
    this.moveHandler = handler;
  }

  setLeaveHandler(handler: RoccoCursorLeaveHandler | undefined): void {
    this.leaveHandler = handler;
  }

  getCursorElement(): HTMLElement {
    return this.cursorElement;
  }

  getProfile(): RoccoCursorProfile {
    return { ...this.profile };
  }

  private createLine(position: RoccoCursorLinePosition): void {
    const line = document.createElement('span');
    line.dataset.roccoCursorLine = position;
    line.style.position = 'absolute';
    line.style.display = 'block';
    line.style.pointerEvents = 'none';
    this.cursorElement.append(line);
    this.lineElements.set(position, line);
  }

  private applyProfileStyles(): void {
    this.cursorElement.style.opacity = `${this.profile.opacity}`;

    for (const [position, line] of this.lineElements) {
      line.style.backgroundColor = this.profile.color;
      line.style.boxShadow = `0 0 2px ${this.profile.shadowColor}`;
      line.style.borderRadius = `${this.profile.lineThickness}px`;
      line.style.display = this.attachment ? 'none' : 'block';
      this.positionLine(position, line);
    }
  }

  private applyAttachmentStyles(): void {
    if (!this.attachment) {
      this.attachmentElement.removeAttribute('src');
      this.attachmentElement.removeAttribute('title');
      this.attachmentElement.style.display = 'none';
      return;
    }

    const size = Math.max(18, this.attachment.size ?? 46);
    this.attachmentElement.src = this.attachment.imageUri;
    this.attachmentElement.title = this.attachment.label ?? '';
    this.attachmentElement.style.display = 'block';
    this.attachmentElement.style.width = `${size}px`;
    this.attachmentElement.style.height = `${size}px`;
    this.attachmentElement.style.opacity = `${this.attachment.opacity ?? 1}`;
  }

  private positionLine(position: RoccoCursorLinePosition, line: HTMLSpanElement): void {
    const length = this.profile.lineLength;
    const gap = this.profile.lineGap;
    const thickness = this.profile.lineThickness;
    const halfThickness = thickness / 2;

    if (position === 'top' || position === 'bottom') {
      line.style.width = `${thickness}px`;
      line.style.height = `${length}px`;
      line.style.left = `${-halfThickness}px`;
      line.style.top = position === 'top' ? `${-(gap + length)}px` : `${gap}px`;
      return;
    }

    line.style.width = `${length}px`;
    line.style.height = `${thickness}px`;
    line.style.top = `${-halfThickness}px`;
    line.style.left = position === 'left' ? `${-(gap + length)}px` : `${gap}px`;
  }

  private refreshLastPointerPosition(): void {
    if (!this.lastClientPoint) {
      this.setVisible(false);
      return;
    }

    const point = this.resolveCursorPoint(this.lastClientPoint.x, this.lastClientPoint.y);
    if (!point) {
      this.setVisible(false);
      return;
    }

    this.placeCursor(point);
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.lastClientPoint = { x: event.clientX, y: event.clientY };
    const point = this.resolveCursorPoint(event.clientX, event.clientY);
    if (!point) {
      this.setVisible(false);
      if (shouldNotifyLeave(event)) {
        this.leaveHandler?.();
      }
      return;
    }

    this.placeCursor(point);
    this.moveHandler?.({
      kind: 'move',
      ...point,
      originalEvent: event,
    });
  };

  private readonly onPointerLeave = (event: PointerEvent): void => {
    this.lastClientPoint = null;
    this.setVisible(false);
    if (shouldNotifyLeave(event)) {
      this.leaveHandler?.();
    }
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.lastClientPoint = { x: event.clientX, y: event.clientY };
    const point = this.resolveCursorPoint(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    this.placeCursor(point);
    this.actionHandler?.({
      kind: 'click',
      ...point,
      button: event.button,
      originalEvent: event,
    });
  };

  private resolveCursorPoint(clientX: number, clientY: number): RoccoCursorPoint | null {
    if (!this.profile.enabled || !this.metrics || this.metrics.scale <= 0) {
      return null;
    }

    const rootRect = this.rootElement.getBoundingClientRect();
    const viewportX = clientX - rootRect.left;
    const viewportY = clientY - rootRect.top;

    const minX = this.metrics.offsetX;
    const minY = this.metrics.offsetY;
    const maxX = this.metrics.offsetX + this.metrics.renderWidth;
    const maxY = this.metrics.offsetY + this.metrics.renderHeight;
    if (viewportX < minX || viewportX > maxX || viewportY < minY || viewportY > maxY) {
      return null;
    }

    const sceneX = (viewportX - this.metrics.offsetX) / this.metrics.scale;
    const sceneY = (viewportY - this.metrics.offsetY) / this.metrics.scale;
    return {
      viewportX,
      viewportY,
      sceneX,
      sceneY,
    };
  }

  private placeCursor(point: RoccoCursorPoint): void {
    this.cursorElement.style.transform = `translate3d(${point.viewportX}px, ${point.viewportY}px, 0)`;
    this.setVisible(true);
  }

  private setVisible(visible: boolean): void {
    this.cursorElement.style.display = visible && this.profile.enabled ? 'block' : 'none';
  }
}
