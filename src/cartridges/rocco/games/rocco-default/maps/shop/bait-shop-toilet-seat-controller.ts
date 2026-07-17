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
  setInputEnabled(isEnabled: boolean): void;
  stopPlayerMovement(): void;
  isPlayerMoving(): boolean;
  playIdleAction(direction: RoccoFacingDirection): void;
  startWalkTo(point: RoccoPoint, options?: { constrainToWalkMap?: boolean }): boolean;
  render(): void;
  setToiletFrame(frameIndex: number): void;
  showHiddenRoccoAtSeatPoint(): void;
  hideRoccoAtSeatPoint(): void;
  finishSitPresentation(): void;
  finishStandPresentation(destination: RoccoPoint | undefined): void;
}

export interface BaitShopToiletSeatControllerOptions {
  sitApproachPoint: RoccoPoint;
  sitSeatPoint: RoccoPoint;
  sitWaitMs: number;
}

export class BaitShopToiletSeatController {
  private readonly host: BaitShopToiletSeatControllerHost;
  private readonly options: BaitShopToiletSeatControllerOptions;
  private sequence: BaitShopToiletSequence | undefined;
  private queuedWalkDestination: RoccoPoint | undefined;
  private roccoSeated = false;
  private roccoSatOnToilet = false;

  constructor(
    host: BaitShopToiletSeatControllerHost,
    options: BaitShopToiletSeatControllerOptions,
  ) {
    this.host = host;
    this.options = options;
  }

  private startSitApproachHorizontalWalk(): void {
    const isStarted = this.host.startWalkTo(this.options.sitApproachPoint);
    if (!isStarted) {
      this.sequence = undefined;
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
    const isStarted = this.host.startWalkTo(this.options.sitSeatPoint, {
      constrainToWalkMap: false,
    });
    if (!isStarted) {
      this.sequence = undefined;
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
    const isStarted = this.host.startWalkTo(this.options.sitApproachPoint, {
      constrainToWalkMap: false,
    });
    if (!isStarted) {
      this.sequence = undefined;
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
    this.sequence = undefined;
    this.host.setToiletFrame(2);
    this.host.hideRoccoAtSeatPoint();
    this.host.finishSitPresentation();
  }

  private finishStandSequence(): void {
    this.roccoSeated = false;
    this.sequence = undefined;
    this.host.setToiletFrame(0);
    this.host.finishStandPresentation(this.queuedWalkDestination);
    this.queuedWalkDestination = undefined;
  }

  private isPlayerMoving(): boolean {
    return this.host.isPlayerMoving();
  }

  private updateWalkingPhase(): boolean {
    switch (this.sequence?.phase) {
      case 'walking-to-approach-vertical': {
        if (this.isPlayerMoving()) {
          return true;
        }
        this.startSitApproachHorizontalWalk();
        return true;
      }
      case 'walking-to-approach-horizontal': {
        if (this.isPlayerMoving()) {
          return true;
        }
        this.host.playIdleAction('up-left');
        this.sequence = { phase: 'waiting-before-frame-one', elapsedMs: 0 };
        this.host.render();
        return true;
      }
      case 'walking-to-seat': {
        if (this.isPlayerMoving()) {
          return true;
        }
        this.host.playIdleAction('down');
        this.sequence = { phase: 'waiting-before-frame-two', elapsedMs: 0 };
        this.host.render();
        return true;
      }
      case 'standing-walking-to-approach': {
        if (this.isPlayerMoving()) {
          return true;
        }
        this.sequence = { phase: 'standing-before-frame-zero', elapsedMs: 0 };
        this.host.render();
        return true;
      }
      default: {
        return false;
      }
    }
  }

  private updateWaitingPhase(): void {
    switch (this.sequence?.phase) {
      case 'waiting-before-frame-one': {
        this.host.setToiletFrame(1);
        this.sequence = { phase: 'waiting-before-seat-walk', elapsedMs: 0 };
        return;
      }
      case 'waiting-before-seat-walk': {
        this.startSeatWalk();
        return;
      }
      case 'waiting-before-frame-two': {
        this.finishSitSequence();
        return;
      }
      case 'standing-before-walk': {
        this.startStandWalk();
        return;
      }
      case 'standing-before-frame-zero': {
        this.finishStandSequence();
        return;
      }
      default: {
        return;
      }
    }
  }

  reset(): void {
    this.sequence = undefined;
    this.queuedWalkDestination = undefined;
    this.roccoSeated = false;
  }

  isActive(): boolean {
    return this.sequence !== undefined;
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

    const isNeedsVerticalApproach =
      Math.abs(currentGroundPoint.y - this.options.sitApproachPoint.y) > 1;
    const isNeedsHorizontalApproach =
      Math.abs(currentGroundPoint.x - this.options.sitApproachPoint.x) > 1;

    if (!isNeedsVerticalApproach && !isNeedsHorizontalApproach) {
      this.host.playIdleAction('up-left');
      this.sequence = {
        phase: 'waiting-before-frame-one',
        elapsedMs: 0,
      };
      this.host.render();
      return;
    }

    const firstTarget = isNeedsVerticalApproach
      ? {
          x: currentGroundPoint.x,
          y: this.options.sitApproachPoint.y,
        }
      : this.options.sitApproachPoint;
    const isStarted = this.host.startWalkTo(firstTarget);
    if (!isStarted) {
      this.host.setInputEnabled(true);
      return;
    }

    this.sequence = {
      phase: isNeedsVerticalApproach
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

    this.queuedWalkDestination = destination ? { ...destination } : undefined;
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
    if (this.updateWalkingPhase()) {
      return;
    }
    this.sequence.elapsedMs += deltaMs;
    if (this.sequence.elapsedMs < this.options.sitWaitMs) {
      return;
    }
    this.updateWaitingPhase();
  }
}
