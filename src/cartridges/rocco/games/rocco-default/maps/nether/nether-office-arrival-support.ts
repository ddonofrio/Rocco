import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoFacingDirection } from '../../../../../../console/video/sprites';
import { GUYSPRITE_CONFIG } from '../../characters/guysprite';
import { ROCCO_PLAYER_CONFIG } from '../../player';

export function updateGuyspriteFacingTowardsRocco(
  engine: CartridgeSdkV1Runtime,
  guyspriteGroundPoint: { x: number; y: number },
  shouldRestart: boolean,
): void {
  const rocco = engine.video.sprites.getSprite(ROCCO_PLAYER_CONFIG.ids.instance);
  const guysprite = engine.video.sprites.getSprite(GUYSPRITE_CONFIG.ids.instance);
  if (!rocco || !guysprite) {
    return;
  }

  const roccoGroundPoint = {
    x: rocco.transform.x + ROCCO_PLAYER_CONFIG.frame.groundAnchor.x * rocco.transform.scaleX,
    y: rocco.transform.y + ROCCO_PLAYER_CONFIG.frame.groundAnchor.y * rocco.transform.scaleY,
  };
  const dx = roccoGroundPoint.x - guyspriteGroundPoint.x;
  const dy = roccoGroundPoint.y - guyspriteGroundPoint.y;
  const horizontalDistance = Math.abs(dx);
  const verticalDistance = Math.abs(dy);
  let facing: RoccoFacingDirection;

  if (horizontalDistance >= verticalDistance * 2) {
    facing = dx >= 0 ? 'right' : 'left';
  } else if (verticalDistance >= horizontalDistance * 2) {
    facing = dy >= 0 ? 'down' : 'up';
  } else if (dx >= 0) {
    facing = dy >= 0 ? 'down-right' : 'up-right';
  } else {
    facing = dy >= 0 ? 'down-left' : 'up-left';
  }

  if (!shouldRestart && guysprite.facing === facing) {
    return;
  }

  engine.video.sprites.playAction(GUYSPRITE_CONFIG.ids.instance, GUYSPRITE_CONFIG.ids.idleAction, {
    direction: facing,
    restart: shouldRestart,
  });
}
