import { makeGraphicPlaneAutoScrollEffect } from '../../engine/effects';
import type { RoccoEngine } from '../../engine/engine-api';
import {
  DEFAULT_STARS_EFFECT_ID,
  DEFAULT_STARS_PLANE_ID,
  DEFAULT_STARS_SCROLL_VELOCITY_X,
  DEFAULT_STARS_SCROLL_VELOCITY_Y,
} from './terminal-work-in-progress-constants';

export function installDefaultStarsEffect(engine: RoccoEngine): void {
  engine.effects.remove(DEFAULT_STARS_EFFECT_ID);
  engine.effects.add(
    makeGraphicPlaneAutoScrollEffect({
      id: DEFAULT_STARS_EFFECT_ID,
      targetId: DEFAULT_STARS_PLANE_ID,
      velocityX: DEFAULT_STARS_SCROLL_VELOCITY_X,
      velocityY: DEFAULT_STARS_SCROLL_VELOCITY_Y,
      units: 'pixels-per-second',
    }),
  );
}
