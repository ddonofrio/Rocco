import { Container, Graphics, Rectangle, Sprite, Text, Texture, type Application } from 'pixi.js';

import type { CompositionSessionInfo } from './composition';

const OVERLAY_Z_INDEX = 10_000;
const TEXT_Z_INDEX = 10_001;
const FROZEN_FRAME_Z_INDEX = 0;
const DIMMER_Z_INDEX = 1;

const TEXT_FILL = '#ffffff';
const FAILURE_TEXT_FILL = '#fca5a5';

const FALLBACK_BACKGROUND = 0x0d_11_0c;
const FAILURE_BACKGROUND = 0x1a_0b_0b;

export function formatCompositionOverlayText(session: CompositionSessionInfo): string {
  const lines: string[] = [];
  const headline =
    session.message?.trim() ||
    (session.status === 'failed' ? 'A runtime operation failed.' : 'LOADING');
  lines.push(headline);

  if (session.status === 'failed' && session.error) {
    lines.push(`ERROR: ${session.error.message}`);
    return lines.join('\n');
  }

  if (
    session.completed !== null &&
    session.total !== null &&
    (session.total > 0 || session.completed > 0)
  ) {
    lines.push(`PROGRESS ${session.completed}/${session.total}`);
  }

  return lines.join('\n');
}

export class RuntimeCompositionPresenter {
  private compositionOverlay: Container | undefined;
  private frozenFrame: Sprite | undefined;
  private frozenTexture: Texture | undefined;
  private compositionDimmer: Graphics | undefined;
  private compositionText: Text | undefined;
  private captureAttempted = false;
  private firstCompositionActive = true;

  private captureFrozenFrame(app: Application): boolean {
    try {
      const frame = new Rectangle(0, 0, app.screen.width, app.screen.height);
      const texture = app.renderer.extract.texture({
        target: app.stage,
        frame,
      });
      const snapshot = new Sprite(texture);
      snapshot.label = 'composition-frozen-frame';
      snapshot.zIndex = FROZEN_FRAME_Z_INDEX;
      this.frozenFrame = snapshot;
      this.frozenTexture = texture;
      return true;
    } catch {
      return false;
    }
  }

  private ensureOverlay(app: Application): Container {
    if (!this.compositionOverlay) {
      const overlay = new Container();
      overlay.label = 'composition-overlay';
      overlay.zIndex = OVERLAY_Z_INDEX;
      overlay.sortableChildren = true;
      app.stage.addChild(overlay);
      this.compositionOverlay = overlay;
    }
    return this.compositionOverlay;
  }

  private sizeFrozenFrame(app: Application): void {
    if (!this.frozenFrame) {
      return;
    }
    const scaleX = app.screen.width / (this.frozenFrame.texture.width || app.screen.width);
    const scaleY = app.screen.height / (this.frozenFrame.texture.height || app.screen.height);
    this.frozenFrame.scale.set(scaleX, scaleY);
    this.frozenFrame.position.set(0, 0);
  }

  private show(app: Application, session: CompositionSessionInfo): void {
    const overlay = this.ensureOverlay(app);
    const isFailed = session.status === 'failed';

    if (!this.frozenFrame && !this.captureAttempted) {
      this.captureAttempted = true;
      if (!this.firstCompositionActive) {
        this.captureFrozenFrame(app);
      }
    }

    if (this.frozenFrame) {
      if (!this.frozenFrame.parent) {
        overlay.addChild(this.frozenFrame);
      }
      this.sizeFrozenFrame(app);
    } else {
      this.ensureFallbackBackground(app, overlay, isFailed);
    }

    const overlayText = formatCompositionOverlayText(session);
    const textColor = isFailed ? FAILURE_TEXT_FILL : TEXT_FILL;
    if (this.compositionText) {
      this.compositionText.text = overlayText;
      this.compositionText.style.fill = textColor;
    } else {
      this.compositionText = new Text({
        text: overlayText,
        style: {
          fill: textColor,
          fontFamily: 'Cascadia Mono, Lucida Console, monospace',
          fontSize: 20,
          fontWeight: '700',
          align: 'center',
          letterSpacing: 1,
          dropShadow: {
            color: 0x00_00_00,
            alpha: 0.8,
            blur: 4,
            distance: 1,
          },
        },
      });
      this.compositionText.anchor.set(0.5);
      this.compositionText.label = 'composition-panel-text';
      this.compositionText.zIndex = TEXT_Z_INDEX;
      overlay.addChild(this.compositionText);
    }

    this.compositionText.x = app.screen.width / 2;
    this.compositionText.y = app.screen.height * 0.25;

    app.render();
  }

  private ensureDimmer(app: Application, overlay: Container, color: number, alpha: number): void {
    if (!this.compositionDimmer) {
      const dimmer = new Graphics();
      dimmer.label = 'composition-dimmer';
      dimmer.zIndex = DIMMER_Z_INDEX;
      overlay.addChild(dimmer);
      this.compositionDimmer = dimmer;
    }
    this.compositionDimmer.clear().rect(0, 0, app.screen.width, app.screen.height).fill(color);
    this.compositionDimmer.alpha = alpha;
  }

  private ensureFallbackBackground(app: Application, overlay: Container, isFailed: boolean): void {
    this.ensureDimmer(app, overlay, isFailed ? FAILURE_BACKGROUND : FALLBACK_BACKGROUND, 1);
  }

  private hide(): void {
    if (!this.compositionOverlay) {
      return;
    }
    this.compositionOverlay.removeFromParent();
    this.compositionOverlay.destroy({ children: true });
    this.compositionOverlay = undefined;

    if (this.frozenTexture) {
      this.frozenTexture.destroy(true);
    }
    this.frozenFrame = undefined;
    this.frozenTexture = undefined;
    this.compositionDimmer = undefined;
    this.compositionText = undefined;
    this.captureAttempted = false;
    this.firstCompositionActive = false;
  }

  sync(app: Application | undefined, session: CompositionSessionInfo | null): void {
    if (!app) {
      return;
    }
    if (!session) {
      this.hide();
      return;
    }
    this.show(app, session);
  }

  dispose(): void {
    this.hide();
  }
}
