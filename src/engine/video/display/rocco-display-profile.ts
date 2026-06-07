import type { RoccoViewportMetrics } from '../viewport/rocco-viewport-host';

export interface RoccoDisplayProfile {
  crtMask: boolean;
  roundedCorners: boolean;
  edgeVignette: boolean;
}

export const defaultDisplayProfile: RoccoDisplayProfile = {
  crtMask: true,
  roundedCorners: true,
  edgeVignette: true,
};

export interface RoccoDisplayProfileRendererOptions {
  rootElement: HTMLElement;
  stageElement: HTMLElement;
  profile?: Partial<RoccoDisplayProfile>;
}

export class RoccoDisplayProfileRenderer {
  private readonly rootElement: HTMLElement;
  private readonly stageElement: HTMLElement;
  private readonly overlayElement: HTMLDivElement;
  private profile: RoccoDisplayProfile;
  private mounted = false;

  constructor(options: RoccoDisplayProfileRendererOptions) {
    this.rootElement = options.rootElement;
    this.stageElement = options.stageElement;
    this.profile = { ...defaultDisplayProfile, ...options.profile };

    this.overlayElement = document.createElement('div');
    this.overlayElement.dataset.roccoDisplayOverlay = 'true';
    this.overlayElement.style.position = 'absolute';
    this.overlayElement.style.pointerEvents = 'none';
    this.overlayElement.style.left = '0';
    this.overlayElement.style.top = '0';
    this.overlayElement.style.width = '0';
    this.overlayElement.style.height = '0';
    this.overlayElement.style.boxSizing = 'border-box';
    this.overlayElement.style.zIndex = '50';
    this.overlayElement.style.willChange = 'transform, width, height';
  }

  mount(): void {
    if (this.mounted) {
      return;
    }

    this.rootElement.appendChild(this.overlayElement);
    this.mounted = true;
  }

  unmount(): void {
    if (!this.mounted) {
      return;
    }

    this.overlayElement.remove();
    this.stageElement.style.borderRadius = '0';
    this.stageElement.style.clipPath = 'none';
    this.mounted = false;
  }

  setProfile(profile: Partial<RoccoDisplayProfile>): void {
    this.profile = { ...this.profile, ...profile };
  }

  applyMetrics(metrics: RoccoViewportMetrics): void {
    const profile = this.profile;
    const shouldDisplay = profile.crtMask;
    const radius = this.resolveCornerRadius(metrics);

    this.overlayElement.style.display = shouldDisplay ? 'block' : 'none';
    this.overlayElement.style.left = `${metrics.offsetX}px`;
    this.overlayElement.style.top = `${metrics.offsetY}px`;
    this.overlayElement.style.width = `${metrics.renderWidth}px`;
    this.overlayElement.style.height = `${metrics.renderHeight}px`;
    this.overlayElement.style.borderRadius = profile.roundedCorners ? `${radius}px` : '0';

    if (shouldDisplay && profile.edgeVignette) {
      this.overlayElement.style.background =
        'radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 52%, rgba(0, 0, 0, 0.10) 76%, rgba(0, 0, 0, 0.30) 100%)';
      this.overlayElement.style.boxShadow = 'inset 0 0 28px rgba(0, 0, 0, 0.32)';
    } else {
      this.overlayElement.style.background = 'none';
      this.overlayElement.style.boxShadow = 'none';
    }

    if (shouldDisplay && profile.roundedCorners) {
      const logicalRadius = metrics.scale > 0 ? radius / metrics.scale : radius;
      this.stageElement.style.borderRadius = `${logicalRadius}px`;
      this.stageElement.style.clipPath = `inset(0 round ${logicalRadius}px)`;
    } else {
      this.stageElement.style.borderRadius = '0';
      this.stageElement.style.clipPath = 'none';
    }
  }

  getOverlayElement(): HTMLElement {
    return this.overlayElement;
  }

  getProfile(): RoccoDisplayProfile {
    return { ...this.profile };
  }

  private resolveCornerRadius(metrics: RoccoViewportMetrics): number {
    const smallestSide = Math.min(metrics.renderWidth, metrics.renderHeight);
    return Math.max(10, Math.min(28, smallestSide * 0.035));
  }
}
