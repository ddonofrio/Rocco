import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoFacingDirection } from '../../../../../../console/video/sprites';
import { GUYSPRITE_CONFIG } from '../../characters/guysprite';
import { ROCCO_PLAYER_CONFIG } from '../../player';

export function installNetherResetOfficeGuysprite(
  engine: CartridgeSdkV1Runtime,
  origin: { x: number; y: number },
  groundPoint: { x: number; y: number },
  scale: number,
  isInteractive: boolean,
): void {
  engine.video.sprites.removeSprite(GUYSPRITE_CONFIG.ids.instance);
  engine.video.sprites.createSpriteFromDefinition(GUYSPRITE_CONFIG.ids.definition, {
    id: GUYSPRITE_CONFIG.ids.instance,
    transform: {
      x: origin.x,
      y: origin.y,
      scaleX: scale,
      scaleY: scale,
      rotation: 0,
    },
    renderLayer: 'world.actors',
    zIndex: 50,
    depthMode: 'baseline-sort',
    interactive: isInteractive,
    collisionEnabled: false,
  });
  updateGuyspriteFacingTowardsRocco(engine, groundPoint, true);
}

export function restoreNetherResetOfficeGuyspriteStanding(
  engine: CartridgeSdkV1Runtime,
  sceneId: string | undefined,
  chairPlaneId: string | undefined,
  groundPoint: { x: number; y: number },
  scale: number,
): void {
  if (sceneId && chairPlaneId) {
    engine.video.planes.updatePlane(sceneId, chairPlaneId, { enabled: true, visible: true });
  }
  installNetherResetOfficeGuysprite(
    engine,
    {
      x: groundPoint.x - ROCCO_PLAYER_CONFIG.frame.groundAnchor.x * scale,
      y: groundPoint.y - ROCCO_PLAYER_CONFIG.frame.groundAnchor.y * scale,
    },
    groundPoint,
    scale,
    false,
  );
  engine.video.sprites.setInteractive(GUYSPRITE_CONFIG.ids.instance, false);
  engine.video.sceneTargets?.setEnabled(GUYSPRITE_CONFIG.ids.instance, false);
}

export function setNetherResetOfficeRoccoSequenceControl(
  engine: CartridgeSdkV1Runtime,
  isEnabled: boolean,
): void {
  engine.video.sprites.setInteractive(ROCCO_PLAYER_CONFIG.ids.instance, isEnabled);
  engine.video.sprites.setCollisionEnabled(ROCCO_PLAYER_CONFIG.ids.instance, isEnabled);
  if (!isEnabled) {
    engine.video.sprites.stopMovement(ROCCO_PLAYER_CONFIG.ids.instance);
  }
}

export function startNetherResetOfficeGuyspriteArrival(
  engine: CartridgeSdkV1Runtime,
  target: { x: number; y: number },
  speed: number,
): void {
  engine.video.sprites.moveTo(GUYSPRITE_CONFIG.ids.instance, target.x, target.y, {
    speed,
    action: GUYSPRITE_CONFIG.ids.runAction,
    idleAction: GUYSPRITE_CONFIG.ids.idleAction,
    constrainToWalkMap: false,
    stopDistance: 1,
  });
}

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
