import type { RoccoEngine } from '../../../../console/engine-sdk';
import type { RoccoPoint } from '../../../../console/video/sprites';
import {
  DEFAULT_BAIT_SHOP_DOOR_OPEN_ANIMATION_ID,
  DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID,
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_ROCCO_GREEN_BLACK,
  DEFAULT_SPRITE_IDLE_ACTION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_RUN_ACTION_ID,
  DEFAULT_STAN_SPRITE_INSTANCE_ID,
} from '../../rocco-default-constants';
import { roccoCartridgeMessageRuntime } from '../../rpce/dialogue';
import { type RoccoLocalization } from '../../localization';
import { DEFAULT_STAN_DIALOGUE_TEXT_COLOR, DEFAULT_STAN_LOOK_RIGHT_ANIMATION_ID } from '../pier/pier-stan';
import { BAIT_SHOP_DOOR_OPENING_SOUND_ID } from '../pier/pier-bait-shop-door';

type StanPoliceDefeatPhase = 'speaking' | 'fading' | 'title';
type BaitShopDoorEntryPhase = 'walking-vertical' | 'transitioning';
type StanMoneyExchangePhase = 'stan-speaking' | 'rocco-replying';

interface StanPoliceDefeatSequence {
  phase: StanPoliceDefeatPhase;
  elapsedMs: number;
}

interface BaitShopDoorEntrySequence {
  phase: BaitShopDoorEntryPhase;
  elapsedMs: number;
}

interface StanMoneyExchangeSequence {
  phase: StanMoneyExchangePhase;
  elapsedMs: number;
}

interface RoccoPendingBaitShopDoorUse {
  levelId: string;
}

export interface RoccoScriptedSequenceControllerSnapshot {
  stanPoliceDefeat: StanPoliceDefeatSequence | null;
  baitShopDoorEntry: BaitShopDoorEntrySequence | null;
  stanMoneyExchange: StanMoneyExchangeSequence | null;
  pendingBaitShopDoorUse: RoccoPendingBaitShopDoorUse | null;
}

export interface RoccoScriptedSequenceControllerOptions {
  localization: RoccoLocalization;
  onRestartRequested?: () => void;
  onEnterBaitShopRequested: () => Promise<void> | void;
  clearPendingExitIntent: () => void;
  resolvePlayerGroundPoint: () => RoccoPoint | undefined;
  doesPlayerOverlapBaitShopDoor: () => boolean;
  isStanAwake: () => boolean;
  baitShopDoorEndGroundX: number;
}

const STAN_POLICE_DEFEAT_SOUND_VOLUME = 0.45;
const STAN_POLICE_DEFEAT_MESSAGE_TTL_MS = 3800;
const STAN_POLICE_DEFEAT_FADE_DURATION_MS = 1300;
const STAN_POLICE_DEFEAT_TITLE_DURATION_MS = 3600;
const STAN_POLICE_DEFEAT_FADE_PRIMITIVE_ID = 'rocco-stan-police-defeat-fade';
const STAN_POLICE_DEFEAT_TITLE_ID = 'rocco-stan-police-defeat-title';
const STAN_MONEY_ACCEPTED_TTL_MS = 3600;
const ROCCO_MONEY_REPLY_TTL_MS = 3000;

export const ROCCO_STAN_POLICE_DEFEAT_SOUND_ID = 'rocco-stan-police-whistle-sound';

export class RoccoScriptedSequenceController {
  private readonly localization: RoccoLocalization;
  private readonly options: RoccoScriptedSequenceControllerOptions;
  private stanPoliceDefeat: StanPoliceDefeatSequence | null = null;
  private baitShopDoorEntry: BaitShopDoorEntrySequence | null = null;
  private stanMoneyExchange: StanMoneyExchangeSequence | null = null;
  private pendingBaitShopDoorUse: RoccoPendingBaitShopDoorUse | null = null;
  private blockingInputLease: ReturnType<RoccoEngine['acquireInputLease']> | null = null;

  constructor(options: RoccoScriptedSequenceControllerOptions) {
    this.options = options;
    this.localization = options.localization;
  }

  hasBlockingSequence(): boolean {
    return (
      this.stanPoliceDefeat !== null ||
      this.baitShopDoorEntry !== null ||
      this.stanMoneyExchange !== null
    );
  }

  hasPendingBaitShopDoorUse(): boolean {
    return this.pendingBaitShopDoorUse !== null;
  }

  createSnapshot(): RoccoScriptedSequenceControllerSnapshot {
    return {
      stanPoliceDefeat: this.stanPoliceDefeat ? { ...this.stanPoliceDefeat } : null,
      baitShopDoorEntry: this.baitShopDoorEntry ? { ...this.baitShopDoorEntry } : null,
      stanMoneyExchange: this.stanMoneyExchange ? { ...this.stanMoneyExchange } : null,
      pendingBaitShopDoorUse: this.pendingBaitShopDoorUse
        ? { ...this.pendingBaitShopDoorUse }
        : null,
    };
  }

  restoreSnapshot(snapshot: RoccoScriptedSequenceControllerSnapshot): void {
    this.stanPoliceDefeat = snapshot.stanPoliceDefeat ? { ...snapshot.stanPoliceDefeat } : null;
    this.baitShopDoorEntry = snapshot.baitShopDoorEntry ? { ...snapshot.baitShopDoorEntry } : null;
    this.stanMoneyExchange = snapshot.stanMoneyExchange ? { ...snapshot.stanMoneyExchange } : null;
    this.pendingBaitShopDoorUse = snapshot.pendingBaitShopDoorUse
      ? { ...snapshot.pendingBaitShopDoorUse }
      : null;
  }

  resetRuntimeState(engine?: RoccoEngine | null): void {
    if (engine && this.pendingBaitShopDoorUse) {
      engine.video.sprites.cancelMovement(DEFAULT_SPRITE_INSTANCE_ID);
    }

    this.stanPoliceDefeat = null;
    this.baitShopDoorEntry = null;
    this.stanMoneyExchange = null;
    this.pendingBaitShopDoorUse = null;
    this.releaseBlockingInputLease();
    this.clearStanPoliceDefeatPresentation(engine);
  }

  startStanPoliceDefeat(engine: RoccoEngine): void {
    this.stanPoliceDefeat = {
      phase: 'speaking',
      elapsedMs: 0,
    };
    this.acquireBlockingInputLease(engine);
    engine.video.gridMenus.clearCarriedItem();
    engine.video.gridMenus.closeMenu();
    engine.video.actionMenus.closeMenu();
    engine.video.sprites.playAnimation(
      DEFAULT_STAN_SPRITE_INSTANCE_ID,
      DEFAULT_STAN_LOOK_RIGHT_ANIMATION_ID,
      {
        restart: true,
      },
    );
    engine.video.messages.say(
      DEFAULT_STAN_SPRITE_INSTANCE_ID,
      this.localization.text.inventory.keysOnStanArrestLine,
      {
        ttlMs: STAN_POLICE_DEFEAT_MESSAGE_TTL_MS,
        style: {
          fill: DEFAULT_STAN_DIALOGUE_TEXT_COLOR,
        },
      },
    );
    engine.video.render(0);
  }

  startStanMoneyExchange(engine: RoccoEngine): void {
    this.stanMoneyExchange = {
      phase: 'stan-speaking',
      elapsedMs: 0,
    };
    this.acquireBlockingInputLease(engine);
    engine.video.gridMenus.clearCarriedItem();
    engine.video.gridMenus.closeMenu();
    engine.video.actionMenus.closeMenu();
    engine.video.sprites.playAnimation(
      DEFAULT_STAN_SPRITE_INSTANCE_ID,
      DEFAULT_STAN_LOOK_RIGHT_ANIMATION_ID,
      {
        restart: true,
      },
    );
    roccoCartridgeMessageRuntime.say(
      engine,
      DEFAULT_STAN_SPRITE_INSTANCE_ID,
      this.localization.text.inventory.moneyOnStanAcceptedLines,
      {
        ttlMs: STAN_MONEY_ACCEPTED_TTL_MS,
        style: {
          fill: DEFAULT_STAN_DIALOGUE_TEXT_COLOR,
        },
      },
      {
        count: 1,
        historyKey: 'inventory-money-on-stan-accepted',
        avoidImmediateRepeat: true,
      },
    );
    engine.video.render(0);
  }

  startBaitShopDoorUse(engine: RoccoEngine, activeLevelId: string): void {
    engine.video.gridMenus.clearCarriedItem();
    engine.video.gridMenus.closeMenu();
    engine.video.actionMenus.closeMenu();
    engine.video.messages.clearMessages();
    this.options.clearPendingExitIntent();

    const currentGroundPoint = this.options.resolvePlayerGroundPoint();
    if (!currentGroundPoint) {
      return;
    }

    if (this.options.doesPlayerOverlapBaitShopDoor()) {
      this.finishBaitShopDoorHorizontalApproach(engine, currentGroundPoint);
      return;
    }

    const started = engine.video.sprites.goTo(
      DEFAULT_SPRITE_INSTANCE_ID,
      this.options.baitShopDoorEndGroundX,
      currentGroundPoint.y,
      {
        action: DEFAULT_SPRITE_RUN_ACTION_ID,
        idleAction: DEFAULT_SPRITE_IDLE_ACTION_ID,
        stopDistance: 1,
        idleSettleDelayMs: 0,
        idleSettleFacing: 'diagonal-from-facing',
      },
    );
    if (!started) {
      engine.video.render(0);
      return;
    }

    this.pendingBaitShopDoorUse = {
      levelId: activeLevelId,
    };
    engine.video.render(0);
  }

  cancelPendingBaitShopDoorUse(engine?: RoccoEngine | null): void {
    engine?.video.sprites.cancelMovement(DEFAULT_SPRITE_INSTANCE_ID);
    this.pendingBaitShopDoorUse = null;
  }

  updateBlockingSequence(engine: RoccoEngine, deltaMs: number): void {
    if (this.stanPoliceDefeat) {
      this.updateStanPoliceDefeat(engine, deltaMs);
      return;
    }

    if (this.baitShopDoorEntry) {
      this.updateBaitShopDoorEntry(engine, deltaMs);
      return;
    }

    if (this.stanMoneyExchange) {
      this.updateStanMoneyExchange(engine, deltaMs);
    }
  }

  updatePendingBaitShopDoorUse(engine: RoccoEngine, activeLevelId: string | null): void {
    if (!this.pendingBaitShopDoorUse) {
      return;
    }

    if (activeLevelId !== this.pendingBaitShopDoorUse.levelId) {
      this.pendingBaitShopDoorUse = null;
      return;
    }

    if (!engine.video.sprites.getSprite(DEFAULT_SPRITE_INSTANCE_ID)) {
      this.pendingBaitShopDoorUse = null;
      return;
    }

    if (engine.video.sprites.isMoving(DEFAULT_SPRITE_INSTANCE_ID)) {
      return;
    }

    this.finishBaitShopDoorHorizontalApproach(engine);
  }

  private finishBaitShopDoorHorizontalApproach(
    engine: RoccoEngine,
    groundPoint = this.options.resolvePlayerGroundPoint(),
  ): void {
    this.pendingBaitShopDoorUse = null;
    if (!groundPoint || !this.options.doesPlayerOverlapBaitShopDoor()) {
      return;
    }

    this.beginBaitShopDoorEntry(engine, groundPoint);
  }

  private beginBaitShopDoorEntry(
    engine: RoccoEngine,
    groundPoint = this.options.resolvePlayerGroundPoint(),
  ): void {
    this.acquireBlockingInputLease(engine);

    if (!groundPoint) {
      this.baitShopDoorEntry = {
        phase: 'transitioning',
        elapsedMs: 0,
      };
      void this.completeBaitShopDoorEntryTransition();
      return;
    }

    engine.video.sprites.playAction(DEFAULT_SPRITE_INSTANCE_ID, DEFAULT_SPRITE_IDLE_ACTION_ID, {
      direction: 'up',
      restart: true,
    });
    engine.video.sprites.playAnimation(
      DEFAULT_BAIT_SHOP_DOOR_SPRITE_INSTANCE_ID,
      DEFAULT_BAIT_SHOP_DOOR_OPEN_ANIMATION_ID,
      {
        restart: true,
      },
    );
    engine.audio.playSound(BAIT_SHOP_DOOR_OPENING_SOUND_ID, {
      restart: true,
    });
    if (this.options.isStanAwake()) {
      this.startStanPoliceDefeat(engine);
      return;
    }

    this.baitShopDoorEntry = {
      phase: 'walking-vertical',
      elapsedMs: 0,
    };
    const started = engine.video.sprites.goTo(DEFAULT_SPRITE_INSTANCE_ID, groundPoint.x, 0, {
      action: DEFAULT_SPRITE_RUN_ACTION_ID,
      idleAction: DEFAULT_SPRITE_IDLE_ACTION_ID,
      stopDistance: 1,
      idleSettleDelayMs: 0,
      idleSettleFacing: 'diagonal-from-facing',
    });
    if (!started) {
      this.baitShopDoorEntry = {
        phase: 'transitioning',
        elapsedMs: 0,
      };
      void this.completeBaitShopDoorEntryTransition();
      return;
    }
    engine.video.render(0);
  }

  private updateStanPoliceDefeat(engine: RoccoEngine, deltaMs: number): void {
    if (!this.stanPoliceDefeat || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    if (this.stanPoliceDefeat.phase === 'speaking') {
      const nextElapsedMs = this.stanPoliceDefeat.elapsedMs + deltaMs;
      if (nextElapsedMs < STAN_POLICE_DEFEAT_MESSAGE_TTL_MS) {
        this.stanPoliceDefeat.elapsedMs = nextElapsedMs;
        return;
      }

      const overflowMs = nextElapsedMs - STAN_POLICE_DEFEAT_MESSAGE_TTL_MS;
      this.beginStanPoliceDefeatFade(engine);
      this.updateStanPoliceDefeat(engine, overflowMs);
      return;
    }

    if (this.stanPoliceDefeat.phase === 'fading') {
      const nextElapsedMs = this.stanPoliceDefeat.elapsedMs + deltaMs;
      const clampedElapsedMs = Math.min(STAN_POLICE_DEFEAT_FADE_DURATION_MS, nextElapsedMs);
      this.stanPoliceDefeat.elapsedMs = clampedElapsedMs;
      this.addStanPoliceDefeatFadePrimitive(
        engine,
        clampedElapsedMs / STAN_POLICE_DEFEAT_FADE_DURATION_MS,
      );

      if (nextElapsedMs < STAN_POLICE_DEFEAT_FADE_DURATION_MS) {
        return;
      }

      const overflowMs = nextElapsedMs - STAN_POLICE_DEFEAT_FADE_DURATION_MS;
      this.showStanPoliceDefeatTitle(engine);
      this.updateStanPoliceDefeat(engine, overflowMs);
      return;
    }

    const nextElapsedMs = this.stanPoliceDefeat.elapsedMs + deltaMs;
    if (nextElapsedMs < STAN_POLICE_DEFEAT_TITLE_DURATION_MS) {
      this.stanPoliceDefeat.elapsedMs = nextElapsedMs;
      return;
    }

    this.finishStanPoliceDefeat(engine);
  }

  private updateBaitShopDoorEntry(engine: RoccoEngine, deltaMs: number): void {
    if (!this.baitShopDoorEntry || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    if (this.baitShopDoorEntry.phase === 'walking-vertical') {
      if (engine.video.sprites.isMoving(DEFAULT_SPRITE_INSTANCE_ID)) {
        return;
      }

      this.baitShopDoorEntry = {
        phase: 'transitioning',
        elapsedMs: 0,
      };
      void this.completeBaitShopDoorEntryTransition();
    }
  }

  private async completeBaitShopDoorEntryTransition(): Promise<void> {
    try {
      await this.options.onEnterBaitShopRequested();
    } finally {
      this.baitShopDoorEntry = null;
      this.releaseBlockingInputLease();
    }
  }

  private updateStanMoneyExchange(engine: RoccoEngine, deltaMs: number): void {
    if (!this.stanMoneyExchange || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    if (this.stanMoneyExchange.phase === 'stan-speaking') {
      const nextElapsedMs = this.stanMoneyExchange.elapsedMs + deltaMs;
      if (nextElapsedMs < STAN_MONEY_ACCEPTED_TTL_MS) {
        this.stanMoneyExchange.elapsedMs = nextElapsedMs;
        return;
      }

      const overflowMs = nextElapsedMs - STAN_MONEY_ACCEPTED_TTL_MS;
      this.beginStanMoneyReply(engine);
      this.updateStanMoneyExchange(engine, overflowMs);
      return;
    }

    const nextElapsedMs = this.stanMoneyExchange.elapsedMs + deltaMs;
    if (nextElapsedMs < ROCCO_MONEY_REPLY_TTL_MS) {
      this.stanMoneyExchange.elapsedMs = nextElapsedMs;
      return;
    }

    this.finishStanMoneyExchange(engine);
  }

  private beginStanMoneyReply(engine: RoccoEngine): void {
    this.stanMoneyExchange = {
      phase: 'rocco-replying',
      elapsedMs: 0,
    };
    engine.video.messages.think(
      DEFAULT_SPRITE_INSTANCE_ID,
      this.localization.text.inventory.moneyOnStanReplyLine,
      {
        ttlMs: ROCCO_MONEY_REPLY_TTL_MS,
      },
    );
    engine.video.render(0);
  }

  private finishStanMoneyExchange(engine: RoccoEngine): void {
    this.stanMoneyExchange = null;
    this.releaseBlockingInputLease();
    engine.video.render(0);
  }

  private beginStanPoliceDefeatFade(engine: RoccoEngine): void {
    this.stanPoliceDefeat = {
      phase: 'fading',
      elapsedMs: 0,
    };
    engine.audio.playSound(ROCCO_STAN_POLICE_DEFEAT_SOUND_ID, {
      restart: true,
      volume: STAN_POLICE_DEFEAT_SOUND_VOLUME,
    });
    this.addStanPoliceDefeatFadePrimitive(engine, 0);
  }

  private showStanPoliceDefeatTitle(engine: RoccoEngine): void {
    this.stanPoliceDefeat = {
      phase: 'title',
      elapsedMs: 0,
    };
    engine.video.titles.addTitle({
      id: STAN_POLICE_DEFEAT_TITLE_ID,
      text: this.localization.text.keys.defeatTitle,
      renderLayer: 'overlay.titles',
      zIndex: 5000,
      x: DEFAULT_DESIGN_WIDTH / 2,
      y: DEFAULT_DESIGN_HEIGHT / 2,
      anchor: { x: 0.5, y: 0.5 },
      style: {
        fill: '#cbd6c0',
        fontFamily: 'Cascadia Mono, Lucida Console, monospace',
        fontSize: 42,
        fontWeight: '700',
        align: 'center',
        stroke: {
          color: '#1f2a20',
          width: 6,
          alpha: 0.95,
        },
      },
      visible: true,
    });
    engine.video.render(0);
  }

  private finishStanPoliceDefeat(engine: RoccoEngine): void {
    this.stanPoliceDefeat = null;
    this.clearStanPoliceDefeatPresentation(engine);
    this.releaseBlockingInputLease();
    this.options.onRestartRequested?.();
  }

  private acquireBlockingInputLease(engine: RoccoEngine): void {
    this.blockingInputLease ??= engine.acquireInputLease('scripted-sequence', 'blocked');
  }

  private releaseBlockingInputLease(): void {
    this.blockingInputLease?.dispose();
    this.blockingInputLease = null;
  }

  private addStanPoliceDefeatFadePrimitive(engine: RoccoEngine, alpha: number): void {
    engine.video.primitives.addPrimitive({
      id: STAN_POLICE_DEFEAT_FADE_PRIMITIVE_ID,
      kind: 'rect',
      renderLayer: 'overlay.primitives',
      zIndex: 5000,
      color: DEFAULT_ROCCO_GREEN_BLACK,
      alpha,
      visible: true,
      x: 0,
      y: 0,
      width: DEFAULT_DESIGN_WIDTH,
      height: DEFAULT_DESIGN_HEIGHT,
      fill: true,
    });
    engine.video.render(0);
  }

  private clearStanPoliceDefeatPresentation(engine?: RoccoEngine | null): void {
    if (!engine) {
      return;
    }

    engine.audio.stopSound(ROCCO_STAN_POLICE_DEFEAT_SOUND_ID);
    engine.video.titles.removeTitle(STAN_POLICE_DEFEAT_TITLE_ID);
    engine.video.primitives.removePrimitive(STAN_POLICE_DEFEAT_FADE_PRIMITIVE_ID);
    engine.video.render(0);
  }
}
