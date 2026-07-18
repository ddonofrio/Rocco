import { isRenderableSpriteAbove } from './depth';
import { ROCCO_SPRITE_DIRECTIONS } from './types';
import type {
  RoccoFacingDirection,
  RoccoMoveOptions,
  RoccoPoint,
  RoccoSpriteDefinition,
  RoccoSpriteFrame,
  RoccoSpriteGoToOptions,
  RoccoSpriteInstance,
} from './types';

const EPSILON = 0.0001;
const DEFAULT_FOREGROUND_FACING_BIAS = 0.35;
const MIN_FOREGROUND_FACING_BIAS_PIXELS = 12;

function isGoToOptions(options: RoccoMoveOptions | undefined): options is RoccoSpriteGoToOptions {
  if (!options) {
    return false;
  }

  return (
    'targetInstanceId' in options ||
    'keepDistance' in options ||
    'faceTargetOnComplete' in options ||
    'foregroundFacingBias' in options
  );
}

function toFacingDirection(vx: number, vy: number): RoccoFacingDirection | undefined {
  if (Math.abs(vx) < EPSILON && Math.abs(vy) < EPSILON) {
    return undefined;
  }

  const sector = Math.round(Math.atan2(vy, vx) / (Math.PI / 4));
  const index = (sector + ROCCO_SPRITE_DIRECTIONS.length) % ROCCO_SPRITE_DIRECTIONS.length;
  return ROCCO_SPRITE_DIRECTIONS[index] ?? 'right';
}

export function normalizeGoToCompletionOptions(
  options?: RoccoSpriteGoToOptions,
): RoccoSpriteGoToOptions | undefined {
  if (!options?.targetInstanceId) {
    return options;
  }

  return {
    ...options,
    faceTargetOnComplete: options.faceTargetOnComplete ?? true,
  };
}

interface ResolveGoToCompletionFacingOptions {
  instance: RoccoSpriteInstance;
  definition: RoccoSpriteDefinition;
  options?: RoccoMoveOptions;
  resolveTargetInstance: (instanceId: string) => RoccoSpriteInstance | undefined;
  requireDefinition: (definitionId: string) => RoccoSpriteDefinition;
  resolveGroundPoint: (
    instance: RoccoSpriteInstance,
    definition: RoccoSpriteDefinition,
  ) => RoccoPoint;
  resolveActiveFrame: (
    definition: RoccoSpriteDefinition,
    instance: RoccoSpriteInstance,
  ) => RoccoSpriteFrame;
}

export function resolveGoToCompletionFacing({
  instance,
  definition,
  options,
  resolveTargetInstance,
  requireDefinition,
  resolveGroundPoint,
  resolveActiveFrame,
}: ResolveGoToCompletionFacingOptions): RoccoFacingDirection | undefined {
  const goToOptions = isGoToOptions(options) ? options : undefined;
  if (!goToOptions?.targetInstanceId || goToOptions.faceTargetOnComplete === false) {
    return undefined;
  }

  const target = resolveTargetInstance(goToOptions.targetInstanceId);
  if (!target || target.id === instance.id) {
    return undefined;
  }

  const targetDefinition = requireDefinition(target.definitionId);
  const instanceGround = resolveGroundPoint(instance, definition);
  const targetGround = resolveGroundPoint(target, targetDefinition);
  let dx = targetGround.x - instanceGround.x;
  let dy = targetGround.y - instanceGround.y;

  const targetFrame = resolveActiveFrame(targetDefinition, target);
  const subjectFrame = resolveActiveFrame(definition, instance);
  if (
    isRenderableSpriteAbove(
      { instance: target, definition: targetDefinition, frame: targetFrame },
      { instance, definition, frame: subjectFrame },
    )
  ) {
    const bias = goToOptions.foregroundFacingBias ?? DEFAULT_FOREGROUND_FACING_BIAS;
    const biasPixels = Math.max(MIN_FOREGROUND_FACING_BIAS_PIXELS, Math.abs(dx) * bias);
    dy = Math.max(dy + biasPixels, biasPixels);
  }

  return toFacingDirection(dx, dy);
}
