import type { RoccoViewportMetrics } from '../viewport/host';
import { roccoBuildMeta } from '../../build-meta';

export interface RoccoBuildBadgeRendererOptions {
  hostElement: HTMLElement;
  label?: string;
}

const BADGE_PADDING_X = 6;
const BADGE_PADDING_Y = 4;
const BADGE_Z_INDEX = '60';

export class RoccoBuildBadgeRenderer {
  private readonly hostElement: HTMLElement;
  private readonly badgeElement: HTMLDivElement;
  private mounted = false;

  constructor(options: RoccoBuildBadgeRendererOptions) {
    this.hostElement = options.hostElement;
    this.badgeElement = document.createElement('div');
    this.badgeElement.dataset.roccoBuildBadge = 'true';
    this.badgeElement.textContent = options.label ?? roccoBuildMeta.label;
    this.badgeElement.style.position = 'absolute';
    this.badgeElement.style.pointerEvents = 'none';
    this.badgeElement.style.left = '0';
    this.badgeElement.style.top = '0';
    this.badgeElement.style.padding = `${BADGE_PADDING_Y}px ${BADGE_PADDING_X}px`;
    this.badgeElement.style.fontFamily = 'ui-monospace, "SFMono-Regular", "Menlo", "Consolas", monospace';
    this.badgeElement.style.fontSize = '10px';
    this.badgeElement.style.lineHeight = '1';
    this.badgeElement.style.letterSpacing = '0.02em';
    this.badgeElement.style.color = 'rgba(228, 240, 230, 0.55)';
    this.badgeElement.style.textShadow = '0 1px 1px rgba(0, 0, 0, 0.6)';
    this.badgeElement.style.zIndex = BADGE_Z_INDEX;
    this.badgeElement.style.userSelect = 'none';
    this.badgeElement.style.whiteSpace = 'nowrap';
  }

  mount(): void {
    if (this.mounted) {
      return;
    }

    this.hostElement.appendChild(this.badgeElement);
    this.mounted = true;
  }

  unmount(): void {
    if (!this.mounted) {
      return;
    }

    this.badgeElement.remove();
    this.mounted = false;
  }

  applyMetrics(metrics: RoccoViewportMetrics): void {
    if (metrics.scaleMode === 'cover') {
      this.badgeElement.style.left = '5px';
      this.badgeElement.style.top = '0px';
    } else {
      this.badgeElement.style.left = `${metrics.offsetX + 5}px`;
      this.badgeElement.style.top = `${metrics.offsetY}px`;
    }
  }

  setLabel(label: string): void {
    this.badgeElement.textContent = label;
  }

  getLabel(): string {
    return this.badgeElement.textContent ?? '';
  }
}
