import type { RoccoRenderableSprite } from '../sprites';
import type { RoccoSpriteMessageRenderable } from './types';
import type { BubbleLayout } from './bubble-renderer';

export interface SpriteBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BubbleLayoutCandidate {
  layout: BubbleLayout;
  preferredX: number;
  preferredY: number;
  preferencePenalty: number;
}

const DEFAULT_MARGIN = 8;
const DEFAULT_GAP = 18;

export function resolveObstacleBounds(
  currentSpriteInstanceId: string,
  spriteBoundsById: ReadonlyMap<string, SpriteBounds>,
  sprites: readonly RoccoRenderableSprite[],
): SpriteBounds[] {
  const ignoredSpriteIds = new Set(
    sprites
      .filter((sprite) => sprite.instance.ignoreMessages === true)
      .map((sprite) => sprite.instance.id),
  );

  return [...spriteBoundsById]
    .filter(
      ([instanceId]) => instanceId !== currentSpriteInstanceId && !ignoredSpriteIds.has(instanceId),
    )
    .map(([, bounds]) => bounds);
}

export function resolveBubbleLayout(
  renderable: RoccoSpriteMessageRenderable,
  spriteBounds: SpriteBounds,
  width: number,
  height: number,
  obstacleBounds: readonly SpriteBounds[],
): BubbleLayout {
  const message = renderable.message;
  const targetX = spriteBounds.x + spriteBounds.width / 2;
  const offsetX = message.offset.x;
  const offsetY = message.offset.y;

  if (message.mode === 'think' || message.side === 'above') {
    return resolveAboveBubbleLayout(
      renderable,
      spriteBounds,
      width,
      height,
      targetX,
      offsetX,
      offsetY,
      obstacleBounds,
    );
  }

  if (message.side === 'left' || message.side === 'right') {
    return resolveForcedSideBubbleLayout(
      renderable,
      spriteBounds,
      width,
      height,
      message.side,
      targetX,
      offsetX,
      offsetY,
      obstacleBounds,
    );
  }

  return resolvePreferredSideBubbleLayout(
    renderable,
    spriteBounds,
    width,
    height,
    targetX,
    offsetX,
    offsetY,
    obstacleBounds,
  );
}

function resolveAboveBubbleLayout(
  renderable: RoccoSpriteMessageRenderable,
  spriteBounds: SpriteBounds,
  width: number,
  height: number,
  targetX: number,
  offsetX: number,
  offsetY: number,
  obstacleBounds: readonly SpriteBounds[],
): BubbleLayout {
  return chooseBestLayout(
    [
      buildAboveCandidate(renderable, spriteBounds, width, height, targetX, offsetX, offsetY, 0),
      buildAboveCandidate(
        renderable,
        spriteBounds,
        width,
        height,
        targetX - width * 0.45,
        offsetX,
        offsetY,
        20,
      ),
      buildAboveCandidate(
        renderable,
        spriteBounds,
        width,
        height,
        targetX + width * 0.45,
        offsetX,
        offsetY,
        20,
      ),
    ],
    obstacleBounds,
  );
}

function resolveForcedSideBubbleLayout(
  renderable: RoccoSpriteMessageRenderable,
  spriteBounds: SpriteBounds,
  width: number,
  height: number,
  side: 'left' | 'right',
  targetX: number,
  offsetX: number,
  offsetY: number,
  obstacleBounds: readonly SpriteBounds[],
): BubbleLayout {
  return chooseBestLayout(
    [
      buildHorizontalCandidate(renderable, spriteBounds, width, height, side, offsetX, offsetY, 0),
      buildAboveCandidate(renderable, spriteBounds, width, height, targetX, offsetX, offsetY, 240),
    ],
    obstacleBounds,
  );
}

function resolvePreferredSideBubbleLayout(
  renderable: RoccoSpriteMessageRenderable,
  spriteBounds: SpriteBounds,
  width: number,
  height: number,
  targetX: number,
  offsetX: number,
  offsetY: number,
  obstacleBounds: readonly SpriteBounds[],
): BubbleLayout {
  const preferredSide = targetX < renderable.designWidth * 0.56 ? 'right' : 'left';

  return chooseBestLayout(
    [
      buildHorizontalCandidate(
        renderable,
        spriteBounds,
        width,
        height,
        preferredSide,
        offsetX,
        offsetY,
        0,
      ),
      buildHorizontalCandidate(
        renderable,
        spriteBounds,
        width,
        height,
        preferredSide === 'right' ? 'left' : 'right',
        offsetX,
        offsetY,
        140,
      ),
      buildAboveCandidate(renderable, spriteBounds, width, height, targetX, offsetX, offsetY, 420),
    ],
    obstacleBounds,
  );
}

function buildHorizontalCandidate(
  renderable: RoccoSpriteMessageRenderable,
  spriteBounds: SpriteBounds,
  width: number,
  height: number,
  side: 'left' | 'right',
  offsetX: number,
  offsetY: number,
  preferencePenalty: number,
): BubbleLayoutCandidate {
  const targetY = spriteBounds.y + spriteBounds.height * 0.25;
  const preferredY = targetY - height / 2 + offsetY;
  const y = clamp(preferredY, DEFAULT_MARGIN, renderable.designHeight - height - DEFAULT_MARGIN);

  if (side === 'right') {
    const preferredX = spriteBounds.x + spriteBounds.width + DEFAULT_GAP + offsetX;
    return {
      layout: {
        x: clamp(preferredX, DEFAULT_MARGIN, renderable.designWidth - width - DEFAULT_MARGIN),
        y,
        width,
        height,
        targetX: spriteBounds.x + spriteBounds.width * 0.82,
        targetY,
        side,
      },
      preferredX,
      preferredY,
      preferencePenalty,
    };
  }

  const preferredX = spriteBounds.x - width - DEFAULT_GAP + offsetX;
  return {
    layout: {
      x: clamp(preferredX, DEFAULT_MARGIN, renderable.designWidth - width - DEFAULT_MARGIN),
      y,
      width,
      height,
      targetX: spriteBounds.x + spriteBounds.width * 0.18,
      targetY,
      side,
    },
    preferredX,
    preferredY,
    preferencePenalty,
  };
}

function buildAboveCandidate(
  renderable: RoccoSpriteMessageRenderable,
  spriteBounds: SpriteBounds,
  width: number,
  height: number,
  anchorX: number,
  offsetX: number,
  offsetY: number,
  preferencePenalty: number,
): BubbleLayoutCandidate {
  const preferredX = anchorX - width / 2 + offsetX;
  const preferredY = spriteBounds.y - height - DEFAULT_GAP + offsetY;
  return {
    layout: {
      x: clamp(preferredX, DEFAULT_MARGIN, renderable.designWidth - width - DEFAULT_MARGIN),
      y: clamp(preferredY, DEFAULT_MARGIN, renderable.designHeight - height - DEFAULT_MARGIN),
      width,
      height,
      targetX: spriteBounds.x + spriteBounds.width / 2,
      targetY: spriteBounds.y,
      side: 'above',
    },
    preferredX,
    preferredY,
    preferencePenalty,
  };
}

function chooseBestLayout(
  candidates: readonly BubbleLayoutCandidate[],
  obstacleBounds: readonly SpriteBounds[],
): BubbleLayout {
  let bestCandidate = candidates[0];
  let bestScore = scoreCandidate(bestCandidate, obstacleBounds);

  for (const candidate of candidates.slice(1)) {
    const score = scoreCandidate(candidate, obstacleBounds);
    if (score < bestScore) {
      bestCandidate = candidate;
      bestScore = score;
    }
  }

  return bestCandidate.layout;
}

function scoreCandidate(
  candidate: BubbleLayoutCandidate,
  obstacleBounds: readonly SpriteBounds[],
): number {
  const overlapArea = obstacleBounds.reduce(
    (total, obstacle) => total + computeIntersectionArea(candidate.layout, obstacle),
    0,
  );
  const clampPenalty =
    Math.abs(candidate.layout.x - candidate.preferredX) +
    Math.abs(candidate.layout.y - candidate.preferredY);
  return overlapArea * 100_000 + clampPenalty * 20 + candidate.preferencePenalty;
}

function computeIntersectionArea(rect: BubbleLayout, obstacle: SpriteBounds): number {
  const left = Math.max(rect.x, obstacle.x);
  const right = Math.min(rect.x + rect.width, obstacle.x + obstacle.width);
  const top = Math.max(rect.y, obstacle.y);
  const bottom = Math.min(rect.y + rect.height, obstacle.y + obstacle.height);
  if (right <= left || bottom <= top) {
    return 0;
  }

  return (right - left) * (bottom - top);
}

export function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}
