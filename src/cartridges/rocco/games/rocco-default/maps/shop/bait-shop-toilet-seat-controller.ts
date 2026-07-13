import type { RoccoFacingDirection, RoccoPoint } from '../../../../../../console/video/sprites';

type BaitShopToiletSequencePhase =
  | 'walking-to-approach-vertical'
  | 'walking-to-approach-horizontal'
  | 'waiting-before-frame-one'
  | 'waiting-before-seat-walk'
  | 'walking-to-seat'
  | 'waiting-before-frame-two'
  | 'standing-before-walk'
  | 'standing-walking-to-approach'
  | 'standing-before-frame-zero';

interface BaitShopToiletSequence {
  phase: BaitShopToiletSequencePhase;
  elapsedMs: number;
}

export interface BaitShopToiletSeatControllerHost {
  hasPlayerSprite(): boolean;
  resolvePlayerGroundPoint(): RoccoPoint | undefined;
  closeInteractionUi(): void;
  setInputEnabled(enabled: boolean): void;
  stopPlayerMovement(): void;
  isPlayerMoving(): boolean;
  playIdleAction(direction: RoccoFacingDirection): void;
  startWalkTo(point: RoccoPoint, options?: { constrainToWalkMap?: boolean }): boolean;
  render(): void;
  setToiletFrame(frameIndex: number): void;
  showHiddenRoccoAtSeatPoint(): void;
  hideRoccoAtSeatPoint(): void;
  finishSitPresentation(): void;
  finishStandPresentation(destination: RoccoPoint | null): void;
}

export interface BaitShopToiletSeatControllerOptions {
  sitApproachPoint: RoccoPoint;
  sitSeatPoint: RoccoPoint;
  sitWaitMs: number;
}

export class BaitShopToiletSeatController {
  private readonly host: BaitShopToiletSeatControllerHost;
  private readonly options: BaitShopToiletSeatControllerOptions;
  private sequence: BaitShopToiletSequence | null = null;
  private queuedWalkDestination: RoccoPoint | null = null;
  private roccoSeated = false;
  private roccoSatOnToilet = false;

  constructor(
    host: BaitShopToiletSeatControllerHost,
    options: BaitShopToiletSeatControllerOptions,
  ) {
    this.host = host;
    this.options = options;
  }

  reset(): void {
    this.sequence = null;
    this.queuedWalkDestination = null;
    this.roccoSeated = false;
  }

  isActive(): boolean {
    return this.sequence !== null;
  }

  isSeated(): boolean {
    return this.roccoSeated;
  }

  hasSatOnToilet(): boolean {
    return this.roccoSatOnToilet;
  }

  startSitSequence(): void {
    if (this.sequence || !this.host.hasPlayerSprite()) {
      return;
    }

    const currentGroundPoint = this.host.resolvePlayerGroundPoint();
    if (!currentGroundPoint) {
      return;
    }

    this.host.closeInteractionUi();
    this.host.setInputEnabled(false);
    this.host.stopPlayerMovement();

    const needsVerticalApproach =
      Math.abs(currentGroundPoint.y - this.options.sitApproachPoint.y) > 1;
    const needsHorizontalApproach =
      Math.abs(currentGroundPoint.x - this.options.sitApproachPoint.x) > 1;

    if (!needsVerticalApproach && !needsHorizontalApproach) {
      this.host.playIdleAction('up-left');
      this.sequence = {
        phase: 'waiting-before-frame-one',
        elapsedMs: 0,
      };
      this.host.render();
      return;
    }

    const firstTarget = needsVerticalApproach
      ? {
          x: currentGroundPoint.x,
          y: this.options.sitApproachPoint.y,
        }
      : this.options.sitApproachPoint;
    const started = this.host.startWalkTo(firstTarget);
    if (!started) {
      this.host.setInputEnabled(true);
      return;
    }

    this.sequence = {
      phase: needsVerticalApproach
        ? 'walking-to-approach-vertical'
        : 'walking-to-approach-horizontal',
      elapsedMs: 0,
    };
    this.host.render();
  }

  startStandSequence(destination?: RoccoPoint): void {
    if (!this.roccoSeated || this.sequence) {
      return;
    }

    this.queuedWalkDestination = destination ? { ...destination } : null;
    this.host.closeInteractionUi();
    this.host.setInputEnabled(false);
    this.host.setToiletFrame(1);
    this.host.showHiddenRoccoAtSeatPoint();
    this.sequence = {
      phase: 'standing-before-walk',
      elapsedMs: 0,
    };
    this.host.render();
  }

  update(deltaMs: number): void {
    if (!this.sequence || !Number.isFinite(deltaMs) || deltaMs < 0) {
      return;
    }

    if (this.sequence.phase === 'walking-to-approach-vertical') {
      if (this.isPlayerMoving()) {
        return;
      }

      this.startSitApproachHorizontalWalk();
      return;
    }

    if (this.sequence.phase === 'walking-to-approach-horizontal') {
      if (this.isPlayerMoving()) {
        return;
      }

      this.host.playIdleAction('up-left');
      this.sequence = {
        phase: 'waiting-before-frame-one',
        elapsedMs: 0,
      };
      this.host.render();
      return;
    }

    if (this.sequence.phase === 'walking-to-seat') {
      if (this.isPlayerMoving()) {
        return;
      }

      this.host.playIdleAction('down');
      this.sequence = {
        phase: 'waiting-before-frame-two',
        elapsedMs: 0,
      };
      this.host.render();
      return;
    }

    if (this.sequence.phase === 'standing-walking-to-approach') {
      if (this.isPlayerMoving()) {
        return;
      }

      this.sequence = {
        phase: 'standing-before-frame-zero',
        elapsedMs: 0,
      };
      this.host.render();
      return;
    }

    this.sequence.elapsedMs += deltaMs;
    if (this.sequence.elapsedMs < this.options.sitWaitMs) {
      return;
    }

    if (this.sequence.phase === 'waiting-before-frame-one') {
      this.host.setToiletFrame(1);
      this.sequence = {
        phase: 'waiting-before-seat-walk',
        elapsedMs: 0,
      };
      return;
    }

    if (this.sequence.phase === 'waiting-before-seat-walk') {
      this.startSeatWalk();
      return;
    }

    if (this.sequence.phase === 'waiting-before-frame-two') {
      this.finishSitSequence();
      return;
    }

    if (this.sequence.phase === 'standing-before-walk') {
      this.startStandWalk();
      return;
    }

    if (this.sequence.phase === 'standing-before-frame-zero') {
      this.finishStandSequence();
    }
  }

  private startSitApproachHorizontalWalk(): void {
    const started = this.host.startWalkTo(this.options.sitApproachPoint);
    if (!started) {
      this.sequence = null;
      this.host.setInputEnabled(true);
      return;
    }

    this.sequence = {
      phase: 'walking-to-approach-horizontal',
      elapsedMs: 0,
    };
    this.host.render();
  }

  private startSeatWalk(): void {
    const started = this.host.startWalkTo(this.options.sitSeatPoint, {
      constrainToWalkMap: false,
    });
    if (!started) {
      this.sequence = null;
      this.host.setInputEnabled(true);
      return;
    }

    this.sequence = {
      phase: 'walking-to-seat',
      elapsedMs: 0,
    };
    this.host.render();
  }

  private startStandWalk(): void {
    const started = this.host.startWalkTo(this.options.sitApproachPoint, {
      constrainToWalkMap: false,
    });
    if (!started) {
      this.sequence = null;
      this.host.setInputEnabled(true);
      return;
    }

    this.sequence = {
      phase: 'standing-walking-to-approach',
      elapsedMs: 0,
    };
    this.host.render();
  }

  private finishSitSequence(): void {
    this.roccoSeated = true;
    this.roccoSatOnToilet = true;
    this.sequence = null;
    this.host.setToiletFrame(2);
    this.host.hideRoccoAtSeatPoint();
    this.host.finishSitPresentation();
  }

  private finishStandSequence(): void {
    this.roccoSeated = false;
    this.sequence = null;
    this.host.setToiletFrame(0);
    this.host.finishStandPresentation(this.queuedWalkDestination);
    this.queuedWalkDestination = null;
  }

  private isPlayerMoving(): boolean {
    return this.host.isPlayerMoving();
  }
}
