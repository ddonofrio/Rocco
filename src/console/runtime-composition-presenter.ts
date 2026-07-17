import { Container, Graphics, Text, type Application } from 'pixi.js';

import type { CompositionSessionInfo } from './composition';

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
  private compositionBackground: Graphics | undefined;
  private compositionText: Text | undefined;

  private show(app: Application, session: CompositionSessionInfo): void {
    if (!this.compositionOverlay) {
      this.compositionOverlay = new Container();
      this.compositionOverlay.label = 'composition-overlay';
      this.compositionOverlay.zIndex = 10_000;
      this.compositionOverlay.sortableChildren = true;
      this.compositionBackground = new Graphics();
      this.compositionOverlay.addChild(this.compositionBackground);
      app.stage.addChild(this.compositionOverlay);
    }

    const overlayBackgroundColor = session.status === 'failed' ? 0x1a_0b_0b : 0x0d_11_0c;
    this.compositionBackground ??= new Graphics();
    this.compositionBackground
      .clear()
      .rect(0, 0, app.screen.width, app.screen.height)
      .fill(overlayBackgroundColor);

    const overlayText = formatCompositionOverlayText(session);
    const textColor = session.status === 'failed' ? '#fca5a5' : '#9ca3af';
    if (this.compositionText) {
      this.compositionText.text = overlayText;
      this.compositionText.style.fill = textColor;
    } else {
      this.compositionText = new Text({
        text: overlayText,
        style: {
          fill: textColor,
          fontFamily: 'Cascadia Mono, Lucida Console, monospace',
          fontSize: 18,
          fontWeight: '700',
          align: 'center',
          letterSpacing: 1,
        },
      });
      this.compositionText.anchor.set(0.5);
      this.compositionText.zIndex = 10_001;
      this.compositionOverlay.addChild(this.compositionText);
    }

    this.compositionText.x = app.screen.width / 2;
    this.compositionText.y = app.screen.height / 2;
    app.render();
  }

  private hide(): void {
    if (!this.compositionOverlay) {
      return;
    }
    this.compositionOverlay.removeFromParent();
    this.compositionOverlay.destroy({ children: true });
    this.compositionOverlay = undefined;
    this.compositionBackground = undefined;
    this.compositionText = undefined;
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
