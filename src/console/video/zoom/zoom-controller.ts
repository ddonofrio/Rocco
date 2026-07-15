import type { Container } from 'pixi.js';

export interface RoccoVideoZoomTransform {
  factor: number;
  focusX: number;
  focusY: number;
  anchorX: number;
  anchorY: number;
}

export type RoccoVideoZoomEasing = 'linear' | 'ease-in-out';

export interface RoccoVideoZoomAnimationOptions {
  easing?: RoccoVideoZoomEasing;
  onComplete?: () => void;
}

export interface RoccoVideoZoomModule {
  getTransform(): RoccoVideoZoomTransform;
  setTransform(transform: RoccoVideoZoomTransform): void;
  animateTo(
    transform: RoccoVideoZoomTransform,
    durationMs: number,
    options?: RoccoVideoZoomAnimationOptions,
  ): void;
  clear(): void;
  isEnabled(): boolean;
  isAnimating(): boolean;
}

function identityTransform(): RoccoVideoZoomTransform {
  return { factor: 1, focusX: 0, focusY: 0, anchorX: 0, anchorY: 0 };
}

function cloneTransform(transform: RoccoVideoZoomTransform): RoccoVideoZoomTransform {
  return { ...transform };
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function applyEasing(amount: number, easing: RoccoVideoZoomEasing): number {
  if (easing === 'ease-in-out') {
    return amount < 0.5 ? 2 * amount * amount : 1 - Math.pow(-2 * amount + 2, 2) / 2;
  }

  return amount;
}

interface RoccoVideoZoomActiveAnimation {
  from: RoccoVideoZoomTransform;
  to: RoccoVideoZoomTransform;
  elapsedMs: number;
  durationMs: number;
  easing: RoccoVideoZoomEasing;
  onComplete?: () => void;
}

export class RoccoVideoZoomController implements RoccoVideoZoomModule {
  private enabled = false;
  private stageWasModified = false;
  private transform: RoccoVideoZoomTransform = identityTransform();
  private animation: RoccoVideoZoomActiveAnimation | undefined;

  getTransform(): RoccoVideoZoomTransform {
    return cloneTransform(this.transform);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isAnimating(): boolean {
    return this.animation !== undefined;
  }

  setTransform(transform: RoccoVideoZoomTransform): void {
    this.enabled = true;
    this.animation = undefined;
    this.transform = cloneTransform(transform);
  }

  clear(): void {
    this.enabled = false;
    this.animation = undefined;
    this.transform = identityTransform();
  }

  animateTo(
    transform: RoccoVideoZoomTransform,
    durationMs: number,
    options: RoccoVideoZoomAnimationOptions = {},
  ): void {
    this.enabled = true;
    if (durationMs <= 0) {
      this.transform = cloneTransform(transform);
      this.animation = undefined;
      options.onComplete?.();
      return;
    }

    const easing = options.easing ?? 'ease-in-out';
    this.animation = {
      from: cloneTransform(this.transform),
      to: cloneTransform(transform),
      elapsedMs: 0,
      durationMs,
      easing,
      onComplete: options.onComplete,
    };
  }

  update(deltaMs: number): void {
    if (!this.animation || !Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    const animation = this.animation;
    animation.elapsedMs += deltaMs;
    const raw = Math.min(1, Math.max(0, animation.elapsedMs / animation.durationMs));
    const eased = applyEasing(raw, animation.easing);
    this.transform = {
      factor: lerp(animation.from.factor, animation.to.factor, eased),
      focusX: lerp(animation.from.focusX, animation.to.focusX, eased),
      focusY: lerp(animation.from.focusY, animation.to.focusY, eased),
      anchorX: lerp(animation.from.anchorX, animation.to.anchorX, eased),
      anchorY: lerp(animation.from.anchorY, animation.to.anchorY, eased),
    };

    if (raw >= 1) {
      this.animation = undefined;
      animation.onComplete?.();
    }
  }

  apply(stage: Container | undefined): void {
    if (!stage) {
      return;
    }

    if (!this.enabled) {
      if (this.stageWasModified) {
        stage.scale.set(1, 1);
        stage.pivot.set(0, 0);
        stage.position.set(0, 0);
        this.stageWasModified = false;
      }

      return;
    }

    const { factor, focusX, focusY, anchorX, anchorY } = this.transform;
    stage.scale.set(factor, factor);
    stage.pivot.set(focusX, focusY);
    stage.position.set(anchorX, anchorY);
    this.stageWasModified = true;
  }
}
