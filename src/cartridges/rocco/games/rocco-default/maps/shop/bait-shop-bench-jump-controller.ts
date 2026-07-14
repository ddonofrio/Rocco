import type { RoccoFacingDirection, RoccoPoint } from '../../../../../../console/video/sprites';

const BAIT_SHOP_BENCH_JUMP_DURATION_MS = 520;
const BAIT_SHOP_BENCH_JUMP_ARC_HEIGHT = 52;

interface BaitShopBenchJumpSequence {
  elapsedMs: number;
  startOrigin: RoccoPoint;
  endOrigin: RoccoPoint;
  landingFacing: RoccoFacingDirection;
  onComplete?: () => void;
}

export interface BaitShopBenchJumpDownOptions {
  walkTo?: RoccoPoint;
  onComplete?: () => void;
}

type BaitShopBenchJumpDirection = 'up' | 'down';

export interface BaitShopBenchJumpControllerHost {
  resolveJumpOrigins(direction: BaitShopBenchJumpDirection): {
    startOrigin: RoccoPoint;
    endOrigin: RoccoPoint;
  } | null;
  setInputEnabled(isEnabled: boolean): void;
  setWalkConstraint(shouldConstrainMovement: boolean): void;
  stopPlayerMovement(): void;
  setPlayerPosition(origin: RoccoPoint): void;
  playRunAction(direction: RoccoFacingDirection): void;
  playIdleAction(direction: RoccoFacingDirection): void;
  render(): void;
  onBenchOccupancyChanged(isOnBench: boolean): void;
  onJumpUpFinished(): void;
  onJumpDownFinished(options: BaitShopBenchJumpDownOptions): void;
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

export class BaitShopBenchJumpController {
  private readonly host: BaitShopBenchJumpControllerHost;
  private sequence: BaitShopBenchJumpSequence | undefined = undefined;
  private onBench = false;

  constructor(host: BaitShopBenchJumpControllerHost) {
    this.host = host;
  }

  private finish(): void {
    const sequence = this.sequence;
    this.sequence = undefined;
    if (!sequence) {
      this.host.setInputEnabled(true);
      return;
    }

    this.host.setPlayerPosition(sequence.endOrigin);
    this.host.playIdleAction(sequence.landingFacing);
    this.host.render();

    sequence.onComplete?.();
  }

  reset(): void {
    this.sequence = undefined;
    this.onBench = false;
  }

  isActive(): boolean {
    return this.sequence !== undefined;
  }

  isOnBench(): boolean {
    return this.onBench;
  }

  startJumpUp(): void {
    if (this.sequence) {
      return;
    }

    const endpoints = this.host.resolveJumpOrigins('up');
    if (!endpoints) {
      return;
    }

    this.host.setInputEnabled(false);
    this.host.setWalkConstraint(false);
    this.host.stopPlayerMovement();
    this.host.setPlayerPosition(endpoints.startOrigin);
    this.sequence = {
      elapsedMs: 0,
      startOrigin: endpoints.startOrigin,
      endOrigin: endpoints.endOrigin,
      landingFacing: 'down',
      onComplete: () => {
        this.onBench = true;
        this.host.onBenchOccupancyChanged(true);
        this.host.setInputEnabled(true);
        this.host.onJumpUpFinished();
        this.host.render();
      },
    };
    this.host.playRunAction('up');
    this.host.render();
  }

  startJumpDown(options: BaitShopBenchJumpDownOptions = {}): void {
    if (this.sequence) {
      return;
    }

    const endpoints = this.host.resolveJumpOrigins('down');
    if (!endpoints) {
      return;
    }

    this.onBench = false;
    this.host.onBenchOccupancyChanged(false);
    this.host.setInputEnabled(false);
    this.host.setWalkConstraint(false);
    this.host.stopPlayerMovement();
    this.host.setPlayerPosition(endpoints.startOrigin);
    this.sequence = {
      elapsedMs: 0,
      startOrigin: endpoints.startOrigin,
      endOrigin: endpoints.endOrigin,
      landingFacing: 'down',
      onComplete: () => {
        this.host.setWalkConstraint(true);
        this.host.setInputEnabled(true);
        this.host.onJumpDownFinished(options);
        this.host.render();
      },
    };
    this.host.playRunAction('down');
    this.host.render();
  }

  update(deltaMs: number): void {
    if (!this.sequence || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    this.sequence.elapsedMs = Math.min(
      BAIT_SHOP_BENCH_JUMP_DURATION_MS,
      this.sequence.elapsedMs + deltaMs,
    );
    const progress = this.sequence.elapsedMs / BAIT_SHOP_BENCH_JUMP_DURATION_MS;
    const lift = Math.sin(progress * Math.PI) * BAIT_SHOP_BENCH_JUMP_ARC_HEIGHT;
    const x = lerp(this.sequence.startOrigin.x, this.sequence.endOrigin.x, progress);
    const y = lerp(this.sequence.startOrigin.y, this.sequence.endOrigin.y, progress) - lift;

    this.host.setPlayerPosition({ x, y });
    this.host.render();

    if (this.sequence.elapsedMs >= BAIT_SHOP_BENCH_JUMP_DURATION_MS) {
      this.finish();
    }
  }
}
