import type {
  CartridgeActionDisposition,
  RoccoSceneClickAction,
} from '../../../../../../console/cartridges';
import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoActionMenuActivation } from '../../../../../../console/video/action-menu';
import type { RoccoGridMenuActivation } from '../../../../../../console/video/grid-menu';
import type { RoccoPlaneScene } from '../../../../../../console/video/planes';
import type { RoccoLocalization, RoccoFinalCreditEntry } from '../../../../localization';
import { ROCCO_DESIGN_HEIGHT, ROCCO_DESIGN_WIDTH } from '../../game-design';
import type { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import {
  RoccoFinalScreenSession,
  type RoccoFinalScreenInvocation,
} from '../../../../levels/runtime/rocco-final-screen-session';
import type { RoccoLevel, RoccoLevelMountOptions } from '../../../../levels/rocco-level-types';
import { roccoFinalScreenMusicUri } from './final-screen-assets';
import { RoccoFinalScreenImageSequence } from './final-screen-image-sequence';
import { createRoccoFinalScreenScene } from './final-screen-scene';

const FINAL_SCREEN_MUSIC_ID = 'rocco-final-screen-music';
const FINAL_SCREEN_TITLE_PREFIX = 'rocco-final-screen-title-';
const FINAL_SCREEN_DEDICATION_ID = `${FINAL_SCREEN_TITLE_PREFIX}dedication`;
const FINAL_SCREEN_DEDICATION_NAME_ID = `${FINAL_SCREEN_TITLE_PREFIX}name`;
const FINAL_SCREEN_DETAILED_PREFIX = `${FINAL_SCREEN_TITLE_PREFIX}detailed-`;
const FINAL_SCREEN_MUSIC_VOLUME = 0.3825;
const FINAL_SCREEN_DEDICATION_FONT_SIZE = 24;
const FINAL_SCREEN_NAME_FONT_SIZE = 40;
const FINAL_SCREEN_CREDIT_GAP = 18;
const FINAL_SCREEN_CREDITS_SPEED = 32;
const FINAL_SCREEN_DETAILED_SPEED = 64;
const FINAL_SCREEN_ROLE_FONT_SIZE = 14;
const FINAL_SCREEN_NAME_DETAIL_FONT_SIZE = 22;
const FINAL_SCREEN_TITLE_FONT_SIZE = 30;
const FINAL_SCREEN_MESSAGE_FONT_SIZE = 17;
const FINAL_SCREEN_LINE_GAP = 8;
const FINAL_SCREEN_BLOCK_GAP = 24;
const FINAL_SCREEN_TOP_PADDING = 30;
const FINAL_SCREEN_FIN_ID = 'rocco-final-screen-fin';
const FINAL_SCREEN_FIN_FONT_SIZE = 40;
const FINAL_SCREEN_FIN_HOLD_MS = 2000;

const FINAL_SCREEN_TITLE_STYLE = {
  fill: '#d7e6c5',
  fontFamily: 'Cascadia Mono, Lucida Console, monospace',
  align: 'center' as const,
  stroke: { color: '#10170f', width: 3, alpha: 0.9 },
};

type FinalScreenPhase =
  | 'dedication'
  | 'fast'
  | 'slow'
  | 'fin'
  | 'fin-hold'
  | 'fin-fade'
  | 'completed';
type FinalScreenInputLease = ReturnType<CartridgeSdkV1Runtime['acquireInputLease']>;

interface TitleOptions {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontWeight: 'normal' | '700';
  visible?: boolean;
}

function titleHeight(title: { text: string; style?: { fontSize?: number } }): number {
  return Math.max(title.text.split('\n').length, 1) * (title.style?.fontSize ?? 28) * 1.2;
}

export class RoccoFinalScreenLevel implements RoccoLevel {
  private readonly localization: RoccoLocalization;
  private readonly sessions: RoccoFinalScreenSession;
  private engine: CartridgeSdkV1Runtime | undefined;
  private inputLease: FinalScreenInputLease | undefined;
  private sessionId: string | undefined;
  private invocation: RoccoFinalScreenInvocation | undefined;
  private phase: FinalScreenPhase = 'dedication';
  private finHoldElapsedMs = 0;
  private completionEmitted = false;
  private musicRegistered = false;
  private readonly imageSequence = new RoccoFinalScreenImageSequence();
  private readonly titleIds = new Set<string>();
  readonly id = 'final-screen';
  readonly title = 'Final Screen';
  readonly connectors = [] as const;

  constructor(localization: RoccoLocalization, sessions: RoccoFinalScreenSession) {
    this.localization = localization;
    this.sessions = sessions;
  }

  private addTitle(options: TitleOptions): void {
    if (!this.engine) return;
    this.titleIds.add(options.id);
    this.engine.video.titles.addTitle({
      id: options.id,
      text: options.text,
      renderLayer: 'overlay.titles',
      zIndex: 10_001,
      x: options.x,
      y: options.y,
      anchor: { x: 0.5, y: 0.5 },
      style: {
        ...FINAL_SCREEN_TITLE_STYLE,
        fontSize: options.fontSize,
        fontWeight: options.fontWeight,
      },
      visible: options.visible ?? true,
    });
  }

  private removeTitles(): void {
    if (!this.engine) return;
    for (const id of this.titleIds) this.engine.video.titles.removeTitle(id);
    this.titleIds.clear();
  }

  private moveTitles(speed: number, deltaMs: number, marker: string): void {
    if (!this.engine) return;
    const deltaY = (deltaMs / 1000) * speed;
    for (const title of this.engine.video.titles.listTitles()) {
      if (!title.visible || !title.id.includes(marker)) continue;
      this.engine.video.titles.addTitle({ ...title, y: title.y - deltaY });
    }
  }

  private showDetailedEntries(entries: RoccoFinalCreditEntry[]): void {
    if (!this.engine) return;
    let cursorY = ROCCO_DESIGN_HEIGHT + FINAL_SCREEN_TOP_PADDING;
    for (const [index, entry] of entries.entries()) {
      const prefix = `${FINAL_SCREEN_DETAILED_PREFIX}${index}-${entry.speed === 'slow' ? 'slow' : 'fast'}`;
      if (entry.kind === 'title') {
        cursorY += this.addDetailedTitle(prefix, entry.text, cursorY);
      } else if (entry.kind === 'message') {
        const height = Math.max(entry.lines.length, 1) * FINAL_SCREEN_MESSAGE_FONT_SIZE * 1.2;
        this.addTitle({
          id: `${prefix}-message`,
          text: entry.lines.join('\n'),
          x: ROCCO_DESIGN_WIDTH / 2,
          y: cursorY + height / 2,
          fontSize: FINAL_SCREEN_MESSAGE_FONT_SIZE,
          fontWeight: 'normal',
          visible: false,
        });
        cursorY += height;
      } else {
        const columnWidth = ROCCO_DESIGN_WIDTH / entry.columns.length;
        const roleY = cursorY + FINAL_SCREEN_ROLE_FONT_SIZE / 2;
        const nameY =
          roleY +
          FINAL_SCREEN_ROLE_FONT_SIZE / 2 +
          FINAL_SCREEN_LINE_GAP +
          FINAL_SCREEN_NAME_DETAIL_FONT_SIZE / 2;
        for (const [columnIndex, column] of entry.columns.entries()) {
          const x = columnWidth * (columnIndex + 0.5);
          this.addTitle({
            id: `${prefix}-role-${columnIndex}`,
            text: column.role,
            x,
            y: roleY,
            fontSize: FINAL_SCREEN_ROLE_FONT_SIZE,
            fontWeight: 'normal',
            visible: false,
          });
          this.addTitle({
            id: `${prefix}-name-${columnIndex}`,
            text: column.name,
            x,
            y: nameY,
            fontSize: FINAL_SCREEN_NAME_DETAIL_FONT_SIZE,
            fontWeight: '700',
            visible: false,
          });
        }
        cursorY = nameY + FINAL_SCREEN_NAME_DETAIL_FONT_SIZE / 2;
      }
      cursorY += FINAL_SCREEN_BLOCK_GAP;
    }
  }

  private addDetailedTitle(prefix: string, text: string, cursorY: number): number {
    const isMultiline = text.includes('\n');
    const height = Math.max(text.split('\n').length, 1) * FINAL_SCREEN_TITLE_FONT_SIZE * 1.2;
    let verticalAdvance = FINAL_SCREEN_TITLE_FONT_SIZE;
    let verticalOffset = FINAL_SCREEN_TITLE_FONT_SIZE / 2;
    if (isMultiline) {
      verticalAdvance = height;
      verticalOffset = height / 2;
    }
    this.addTitle({
      id: `${prefix}-title`,
      text,
      x: ROCCO_DESIGN_WIDTH / 2,
      y: cursorY + verticalOffset,
      fontSize: FINAL_SCREEN_TITLE_FONT_SIZE,
      fontWeight: '700',
      visible: false,
    });
    return verticalAdvance;
  }

  private setVisible(marker: string): void {
    if (!this.engine) return;
    for (const title of this.engine.video.titles.listTitles()) {
      if (title.id.includes(marker)) this.engine.video.titles.addTitle({ ...title, visible: true });
    }
  }

  private startSlowEntries(): void {
    if (!this.engine) return;
    const slowTitles = this.engine.video.titles
      .listTitles()
      .filter((title) => title.id.includes('-slow-'));
    const first = slowTitles[0];
    if (!first) return;
    const targetY = ROCCO_DESIGN_HEIGHT + FINAL_SCREEN_TOP_PADDING + titleHeight(first) / 2;
    const offset = targetY - first.y;
    for (const title of slowTitles)
      this.engine.video.titles.addTitle({ ...title, y: title.y + offset, visible: true });
    this.phase = 'slow';
  }

  private areFastEntriesComplete(): boolean {
    if (!this.engine) return false;
    const titles = this.engine.video.titles
      .listTitles()
      .filter((title) => title.id.includes('-fast-') && title.visible);
    return titles.length > 0 && titles.every((title) => title.y + titleHeight(title) / 2 <= 0);
  }

  private complete(): void {
    if (!this.engine || !this.sessionId || !this.invocation || this.completionEmitted) return;
    this.completionEmitted = true;
    this.phase = 'completed';
    this.inputLease?.dispose();
    this.inputLease = undefined;
    this.engine.audio.stopSound(FINAL_SCREEN_MUSIC_ID);
    this.sessions.complete(this.sessionId);
  }

  private updateDedication(deltaMs: number): void {
    this.moveTitles(FINAL_SCREEN_CREDITS_SPEED, deltaMs, FINAL_SCREEN_TITLE_PREFIX);
    const name = this.engine?.video.titles.getTitle(FINAL_SCREEN_DEDICATION_NAME_ID);
    if (name && name.y + FINAL_SCREEN_NAME_FONT_SIZE / 2 <= 0) {
      this.phase = 'fast';
      this.setVisible('-fast-');
      this.moveTitles(FINAL_SCREEN_DETAILED_SPEED, deltaMs, '-fast-');
      if (this.areFastEntriesComplete()) this.startSlowEntries();
    }
  }

  private updateFast(deltaMs: number): void {
    this.moveTitles(FINAL_SCREEN_DETAILED_SPEED, deltaMs, '-fast-');
    if (this.areFastEntriesComplete()) this.startSlowEntries();
  }

  private areSlowEntriesComplete(): boolean {
    if (!this.engine) return false;
    const titles = this.engine.video.titles
      .listTitles()
      .filter((title) => title.id.includes('-slow-') && title.visible);
    return titles.length > 0 && titles.every((title) => title.y + titleHeight(title) / 2 <= 0);
  }

  private startFin(): void {
    if (!this.engine) return;
    this.phase = 'fin';
    this.finHoldElapsedMs = 0;
    this.addTitle({
      id: FINAL_SCREEN_FIN_ID,
      text: 'F I N',
      x: ROCCO_DESIGN_WIDTH / 2,
      y: ROCCO_DESIGN_HEIGHT + FINAL_SCREEN_FIN_FONT_SIZE / 2,
      fontSize: FINAL_SCREEN_FIN_FONT_SIZE,
      fontWeight: '700',
    });
  }

  private updateFin(deltaMs: number): void {
    if (!this.engine) return;
    const title = this.engine.video.titles.getTitle(FINAL_SCREEN_FIN_ID);
    if (!title) {
      this.startFin();
      return;
    }
    const targetY = ROCCO_DESIGN_HEIGHT / 2;
    const nextY = Math.max(targetY, title.y - (deltaMs / 1000) * FINAL_SCREEN_CREDITS_SPEED);
    this.engine.video.titles.addTitle({ ...title, y: nextY });
    if (nextY <= targetY) this.phase = 'fin-hold';
  }

  private beginFinFade(): void {
    this.phase = 'fin-fade';
    this.imageSequence.beginFinalFade();
  }

  private updateFinHold(deltaMs: number): void {
    this.finHoldElapsedMs += deltaMs;
    if (this.finHoldElapsedMs >= FINAL_SCREEN_FIN_HOLD_MS) this.beginFinFade();
  }

  private updateFinFade(deltaMs: number): void {
    if (this.imageSequence.updateFinalFade(deltaMs)) this.complete();
  }

  private updateSlow(deltaMs: number): void {
    this.moveTitles(FINAL_SCREEN_CREDITS_SPEED, deltaMs, '-slow-');
    if (this.areSlowEntriesComplete()) this.startFin();
  }

  private startMusic(engine: CartridgeSdkV1Runtime): void {
    engine.jukebox.stopPlaylist();
    engine.audio.registerSound({
      id: FINAL_SCREEN_MUSIC_ID,
      uri: roccoFinalScreenMusicUri,
      volume: FINAL_SCREEN_MUSIC_VOLUME,
    });
    this.musicRegistered = true;
    engine.audio.playSound(FINAL_SCREEN_MUSIC_ID, {
      volume: FINAL_SCREEN_MUSIC_VOLUME,
      restart: true,
    });
  }

  async mount(
    engine: CartridgeSdkV1Runtime,
    options: RoccoLevelMountOptions = {},
    preloader?: RoccoAssetPreloader,
  ): Promise<RoccoPlaneScene> {
    const session = this.sessions.resolve(
      options.finalScreenSessionId,
      options.finalScreenInvocation,
    );
    if (!session)
      throw new Error('ROCCO final screen mounted without an active invocation session.');
    this.engine = engine;
    this.sessionId = session.id;
    this.invocation = session.invocation;
    this.phase = 'dedication';
    this.finHoldElapsedMs = 0;
    this.completionEmitted = false;
    this.removeTitles();
    const scene = createRoccoFinalScreenScene();
    await (preloader?.preloadPlaneScene(engine, scene) ?? engine.video.preloadPlaneScene(scene));
    engine.loadPlaneScene(scene);
    this.imageSequence.mount(engine);
    engine.video.actionMenus.closeMenu();
    engine.video.gridMenus.closeMenu();
    this.inputLease = engine.acquireInputLease('rocco-final-screen', 'blocked');
    const dedicationY = ROCCO_DESIGN_HEIGHT + FINAL_SCREEN_DEDICATION_FONT_SIZE;
    const nameY =
      dedicationY +
      FINAL_SCREEN_DEDICATION_FONT_SIZE / 2 +
      FINAL_SCREEN_CREDIT_GAP +
      FINAL_SCREEN_NAME_FONT_SIZE / 2;
    this.addTitle({
      id: FINAL_SCREEN_DEDICATION_ID,
      text: this.localization.text.finalScreen.dedicationLine,
      x: ROCCO_DESIGN_WIDTH / 2,
      y: dedicationY,
      fontSize: FINAL_SCREEN_DEDICATION_FONT_SIZE,
      fontWeight: '700',
    });
    this.addTitle({
      id: FINAL_SCREEN_DEDICATION_NAME_ID,
      text: this.localization.text.finalScreen.dedicationName,
      x: ROCCO_DESIGN_WIDTH / 2,
      y: nameY,
      fontSize: FINAL_SCREEN_NAME_FONT_SIZE,
      fontWeight: '700',
    });
    this.showDetailedEntries(this.localization.text.finalScreen.credits);
    this.startMusic(engine);
    return scene;
  }

  unmount(engine: CartridgeSdkV1Runtime): void {
    this.inputLease?.dispose();
    this.inputLease = undefined;
    this.removeTitles();
    if (this.musicRegistered) {
      engine.audio.stopSound(FINAL_SCREEN_MUSIC_ID);
      engine.audio.unregisterSound(FINAL_SCREEN_MUSIC_ID);
      this.musicRegistered = false;
    }
    this.imageSequence.unmount(engine);
    this.sessions.cancel(this.sessionId);
    this.engine = undefined;
    this.sessionId = undefined;
    this.invocation = undefined;
    this.phase = 'dedication';
    this.finHoldElapsedMs = 0;
    this.completionEmitted = false;
  }

  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0 || this.phase === 'completed') return;
    if (['dedication', 'fast', 'slow'].includes(this.phase)) {
      this.imageSequence.update(deltaMs);
    }
    switch (this.phase) {
      case 'dedication': {
        this.updateDedication(deltaMs);
        break;
      }
      case 'fast': {
        this.updateFast(deltaMs);
        break;
      }
      case 'slow': {
        this.updateSlow(deltaMs);
        break;
      }
      case 'fin': {
        this.updateFin(deltaMs);
        break;
      }
      case 'fin-hold': {
        this.updateFinHold(deltaMs);
        break;
      }
      case 'fin-fade': {
        this.updateFinFade(deltaMs);
        break;
      }
    }
  }

  handleAction(_activation: RoccoActionMenuActivation): void {}

  handleGridMenu(_activation: RoccoGridMenuActivation): void {}

  handleSceneClick(_action: RoccoSceneClickAction): CartridgeActionDisposition {
    return { consumed: true, defaultPlayerMovement: 'suppress' };
  }
}
