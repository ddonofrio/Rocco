import type { RoccoViewportMetrics } from '../viewport/host';

export interface RoccoDisplayProfile {
  crtMask: boolean;
  roundedCorners: boolean;
  edgeVignette: boolean;
  brightness: number;
  contrast: number;
}

export const ROCCO_DISPLAY_BRIGHTNESS_MIN = 0.5;
export const ROCCO_DISPLAY_BRIGHTNESS_MAX = 1.5;
export const ROCCO_DISPLAY_CONTRAST_MIN = 0.5;
export const ROCCO_DISPLAY_CONTRAST_MAX = 1.5;

export const defaultDisplayProfile: RoccoDisplayProfile = {
  crtMask: true,
  roundedCorners: true,
  edgeVignette: true,
  brightness: 1,
  contrast: 1,
};

export interface RoccoDisplayProfileRendererOptions {
  rootElement: HTMLElement;
  stageElement: HTMLElement;
  profile?: Partial<RoccoDisplayProfile>;
}

const CRT_FRAME_BACKGROUND = [
  'radial-gradient(120% 120% at 50% 50%, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.022) 28%, rgba(255, 255, 255, 0) 54%)',
  'radial-gradient(130% 130% at 50% 50%, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.05) 76%, rgba(0, 0, 0, 0.1) 100%)',
].join(',');

const CRT_MESH_BACKGROUND = [
  'repeating-linear-gradient(0deg, rgba(8, 10, 8, 0.18) 0px, rgba(8, 10, 8, 0.18) 1px, rgba(255, 255, 255, 0.028) 1px, rgba(255, 255, 255, 0.028) 2px)',
  'repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.024) 0px, rgba(255, 255, 255, 0.024) 1px, rgba(4, 6, 4, 0.11) 1px, rgba(4, 6, 4, 0.11) 3px)',
].join(',');

const CRT_GLASS_BACKGROUND = [
  'radial-gradient(120% 115% at 50% 50%, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.015) 34%, rgba(255, 255, 255, 0) 60%)',
  'radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 48%, rgba(0, 0, 0, 0.11) 74%, rgba(0, 0, 0, 0.34) 100%)',
].join(',');

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

export function resolveRoccoDisplayProfile(
  profile: Partial<RoccoDisplayProfile> = {},
): RoccoDisplayProfile {
  return {
    crtMask: profile.crtMask ?? defaultDisplayProfile.crtMask,
    roundedCorners: profile.roundedCorners ?? defaultDisplayProfile.roundedCorners,
    edgeVignette: profile.edgeVignette ?? defaultDisplayProfile.edgeVignette,
    brightness: clamp(
      profile.brightness ?? defaultDisplayProfile.brightness,
      ROCCO_DISPLAY_BRIGHTNESS_MIN,
      ROCCO_DISPLAY_BRIGHTNESS_MAX,
    ),
    contrast: clamp(
      profile.contrast ?? defaultDisplayProfile.contrast,
      ROCCO_DISPLAY_CONTRAST_MIN,
      ROCCO_DISPLAY_CONTRAST_MAX,
    ),
  };
}

export class RoccoDisplayProfileRenderer {
  private readonly rootElement: HTMLElement;
  private readonly stageElement: HTMLElement;
  private readonly overlayElement: HTMLDivElement;
  private readonly frameElement: HTMLDivElement;
  private readonly meshElement: HTMLDivElement;
  private readonly glassElement: HTMLDivElement;
  private profile: RoccoDisplayProfile;
  private mounted = false;

  constructor(options: RoccoDisplayProfileRendererOptions) {
    this.rootElement = options.rootElement;
    this.stageElement = options.stageElement;
    this.profile = resolveRoccoDisplayProfile(options.profile);

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
    this.overlayElement.style.overflow = 'hidden';
    this.overlayElement.style.isolation = 'isolate';

    this.frameElement = this.createLayerElement('frame');
    this.meshElement = this.createLayerElement('mesh');
    this.glassElement = this.createLayerElement('glass');
    this.overlayElement.append(this.frameElement, this.meshElement, this.glassElement);
  }

  private resolveStageFilter(profile: RoccoDisplayProfile): string {
    const isBrightness = Math.abs(profile.brightness - 1) < 0.001;
    const isContrast = Math.abs(profile.contrast - 1) < 0.001;
    if (isBrightness && isContrast) {
      return 'none';
    }

    return `brightness(${profile.brightness.toFixed(2)}) contrast(${profile.contrast.toFixed(2)})`;
  }

  private resolveCornerRadius(metrics: RoccoViewportMetrics): number {
    const smallestSide = Math.min(metrics.renderWidth, metrics.renderHeight);
    return Math.max(12, Math.min(34, smallestSide * 0.045));
  }

  private resolveMeshOpacity(metrics: RoccoViewportMetrics): number {
    return Math.min(0.36, Math.max(0.22, 0.24 + metrics.scale * 0.04));
  }

  private createLayerElement(name: string): HTMLDivElement {
    const element = document.createElement('div');
    element.dataset.roccoDisplayLayer = name;
    element.style.position = 'absolute';
    element.style.inset = '0';
    element.style.pointerEvents = 'none';
    element.style.backgroundRepeat = 'repeat';
    return element;
  }

  mount(): void {
    if (this.mounted) {
      return;
    }

    this.rootElement.append(this.overlayElement);
    this.mounted = true;
  }

  unmount(): void {
    if (!this.mounted) {
      return;
    }

    this.overlayElement.remove();
    this.stageElement.style.filter = 'none';
    this.stageElement.style.borderRadius = '0';
    this.stageElement.style.clipPath = 'none';
    this.mounted = false;
  }

  setProfile(profile: Partial<RoccoDisplayProfile>): void {
    this.profile = resolveRoccoDisplayProfile({ ...this.profile, ...profile });
  }

  applyMetrics(metrics: RoccoViewportMetrics): void {
    const profile = this.profile;
    const shouldDisplay = profile.crtMask || profile.edgeVignette;
    const radius = this.resolveCornerRadius(metrics);
    const borderRadius = profile.roundedCorners ? `${radius}px` : '0';
    this.stageElement.style.filter = this.resolveStageFilter(profile);

    this.overlayElement.style.display = shouldDisplay ? 'block' : 'none';

    if (metrics.scaleMode === 'cover') {
      this.overlayElement.style.left = '0';
      this.overlayElement.style.top = '0';
      this.overlayElement.style.width = `${metrics.viewportWidth}px`;
      this.overlayElement.style.height = `${metrics.viewportHeight}px`;
    } else {
      this.overlayElement.style.left = `${metrics.offsetX}px`;
      this.overlayElement.style.top = `${metrics.offsetY}px`;
      this.overlayElement.style.width = `${metrics.renderWidth}px`;
      this.overlayElement.style.height = `${metrics.renderHeight}px`;
    }

    this.overlayElement.style.borderRadius = borderRadius;
    this.frameElement.style.borderRadius = borderRadius;
    this.meshElement.style.borderRadius = borderRadius;
    this.glassElement.style.borderRadius = borderRadius;

    if (profile.edgeVignette) {
      this.overlayElement.style.background = 'rgba(4, 6, 5, 0.03)';
      this.overlayElement.style.border = '1px solid rgba(228, 240, 230, 0.08)';
      this.overlayElement.style.boxShadow = [
        '0 18px 48px rgba(0, 0, 0, 0.42)',
        'inset 0 0 36px rgba(0, 0, 0, 0.24)',
        'inset 0 0 96px rgba(0, 0, 0, 0.16)',
      ].join(', ');
      this.frameElement.style.background = CRT_FRAME_BACKGROUND;
      this.frameElement.style.boxShadow = 'inset 0 0 28px rgba(0, 0, 0, 0.14)';
      this.glassElement.style.background = CRT_GLASS_BACKGROUND;
      this.glassElement.style.opacity = '1';
    } else {
      this.overlayElement.style.background = 'none';
      this.overlayElement.style.border = '0';
      this.overlayElement.style.boxShadow = 'none';
      this.frameElement.style.background = 'none';
      this.frameElement.style.boxShadow = 'none';
      this.glassElement.style.background = 'none';
      this.glassElement.style.opacity = '0';
    }

    if (profile.crtMask) {
      this.meshElement.style.backgroundImage = CRT_MESH_BACKGROUND;
      this.meshElement.style.opacity = this.resolveMeshOpacity(metrics).toFixed(3);
    } else {
      this.meshElement.style.backgroundImage = 'none';
      this.meshElement.style.opacity = '0';
    }

    if (profile.roundedCorners) {
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
}
