import type { RoccoRuntimeVideoSystem } from './video';
import type { RoccoCursorAttachment } from './video/cursor';
import type { RoccoViewportHost } from './video/viewport';

const DEFAULT_CURSOR_ATTACHMENT_SIZE = 46;
const DEFAULT_DESIGN_WIDTH = 960;
const DEFAULT_DESIGN_HEIGHT = 540;
const HOVER_DESCRIPTION_TITLE_ID = 'rocco-hover-visible-description';

type InputPresentationVideoSystem = Pick<RoccoRuntimeVideoSystem, 'render'> & {
  readonly gridMenus: Pick<RoccoRuntimeVideoSystem['gridMenus'], 'getCarriedItem'>;
  readonly titles: Pick<RoccoRuntimeVideoSystem['titles'], 'addTitle' | 'removeTitle'>;
};

interface RoccoRuntimeInputPresentationCoordinatorOptions {
  videoSystem: InputPresentationVideoSystem;
  viewportHost?: Pick<RoccoViewportHost, 'getMetrics' | 'setCursorAttachment'>;
}

export class RoccoRuntimeInputPresentationCoordinator {
  private readonly videoSystem: InputPresentationVideoSystem;
  private readonly viewportHost?: Pick<RoccoViewportHost, 'getMetrics' | 'setCursorAttachment'>;
  private activeHoverDescription: string | null = null;

  constructor(options: RoccoRuntimeInputPresentationCoordinatorOptions) {
    this.videoSystem = options.videoSystem;
    this.viewportHost = options.viewportHost;
  }

  unmount(): void {
    this.activeHoverDescription = null;
    this.viewportHost?.setCursorAttachment(undefined);
  }

  setHoverDescription(text: string | undefined): void {
    const normalizedText = text?.trim() || undefined;
    if ((this.activeHoverDescription ?? undefined) === normalizedText) {
      return;
    }

    this.activeHoverDescription = normalizedText ?? null;
    if (!normalizedText) {
      this.videoSystem.titles.removeTitle(HOVER_DESCRIPTION_TITLE_ID);
      this.videoSystem.render(0);
      return;
    }

    const metrics = this.viewportHost?.getMetrics();
    const designWidth = metrics?.designWidth ?? DEFAULT_DESIGN_WIDTH;
    const designHeight = metrics?.designHeight ?? DEFAULT_DESIGN_HEIGHT;
    this.videoSystem.titles.addTitle({
      id: HOVER_DESCRIPTION_TITLE_ID,
      text: normalizedText,
      renderLayer: 'overlay.titles',
      zIndex: 1000,
      x: designWidth / 2,
      y: designHeight - 42,
      anchor: { x: 0.5, y: 0.5 },
      style: {
        fill: '#cbd6c0',
        fontFamily: 'Cascadia Mono, Lucida Console, monospace',
        fontSize: 22,
        fontWeight: '700',
        align: 'center',
        stroke: {
          color: '#3b433c',
          width: 4,
          alpha: 0.9,
        },
      },
      visible: true,
    });
    this.videoSystem.render(0);
  }

  syncCarriedCursorAttachment(): void {
    this.viewportHost?.setCursorAttachment(this.resolveCarriedCursorAttachment());
  }

  private resolveCarriedCursorAttachment(): RoccoCursorAttachment | undefined {
    const carriedItem = this.videoSystem.gridMenus.getCarriedItem();
    if (!carriedItem?.item.imageUri) {
      return undefined;
    }

    return {
      imageUri: carriedItem.item.imageUri,
      label: carriedItem.item.label,
      size: DEFAULT_CURSOR_ATTACHMENT_SIZE,
    };
  }
}
