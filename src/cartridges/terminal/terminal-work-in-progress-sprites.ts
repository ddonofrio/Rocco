import type { RoccoEngine } from '../../console/engine-sdk';
import {
  DEFAULT_SPRITE_DEFINITION_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_MOVE_TO_X,
  DEFAULT_SPRITE_MOVE_TO_Y,
  DEFAULT_SPRITE_START_X,
  DEFAULT_SPRITE_START_Y,
  DEFAULT_SPRITE_WALK_ACTION_ID,
} from './terminal-work-in-progress-constants';
import { createDefaultSpriteDefinition } from './terminal-work-in-progress-sprite-definition';

export function installDefaultSprite(engine: RoccoEngine): void {
  engine.video.sprites.loadSpriteDefinition(createDefaultSpriteDefinition());
  engine.video.sprites.removeSprite(DEFAULT_SPRITE_INSTANCE_ID);

  const sprite = engine.video.sprites.createSpriteFromDefinition(DEFAULT_SPRITE_DEFINITION_ID, {
    id: DEFAULT_SPRITE_INSTANCE_ID,
    transform: {
      x: DEFAULT_SPRITE_START_X,
      y: DEFAULT_SPRITE_START_Y,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    },
    renderLayer: 'world.actors',
    zIndex: 60,
    depthMode: 'fixed',
    interactive: true,
    collisionEnabled: true,
  });

  engine.video.sprites.moveTo(sprite.id, DEFAULT_SPRITE_MOVE_TO_X, DEFAULT_SPRITE_MOVE_TO_Y, {
    action: DEFAULT_SPRITE_WALK_ACTION_ID,
    stopDistance: 2,
  });
  engine.video.render(0);
}
