import type { RoccoSpriteDefinition } from '../../../../../../console/video/sprites';
import type { RoccoLocalization } from '../../../../localization';
import { createRoccoLocalization } from '../../../../localization';
import {
  guyspriteRunLeftAssetUrls,
  guyspriteRunRightAssetUrls,
  guyspriteStandingAssetUrls,
} from './guysprite-assets';
import { GUYSPRITE_CONFIG } from './guysprite-config';
import {
  createDirectionalCharacterSpriteDefinition,
  type DirectionalCharacterSpriteSpec,
} from '../../sprites/directional-character-sprite-definition';

export function createGuyspriteSpriteDefinition(
  localization: RoccoLocalization = createRoccoLocalization(),
): RoccoSpriteDefinition {
  const spec: DirectionalCharacterSpriteSpec = {
    definitionId: GUYSPRITE_CONFIG.ids.definition,
    name: 'Guysprite Threepwood',
    idPrefix: 'guysprite',
    assets: {
      runLeft: guyspriteRunLeftAssetUrls,
      runRight: guyspriteRunRightAssetUrls,
      standing: guyspriteStandingAssetUrls,
    },
    frame: {
      width: GUYSPRITE_CONFIG.frame.width,
      height: GUYSPRITE_CONFIG.frame.height,
      baseline: GUYSPRITE_CONFIG.frame.baseline,
      groundAnchor: {
        x: GUYSPRITE_CONFIG.frame.groundAnchor.x,
        y: GUYSPRITE_CONFIG.frame.groundAnchor.y,
      },
      hitbox: GUYSPRITE_CONFIG.frame.hitbox,
    },
    motion: {
      runSpeed: GUYSPRITE_CONFIG.motion.runSpeed,
      pixelsPerFrame: GUYSPRITE_CONFIG.motion.pixelsPerFrame,
      runFrameDurationMs: 120,
      standingPoseDurationMs: GUYSPRITE_CONFIG.motion.standingPoseDurationMs,
    },
    actions: {
      idle: GUYSPRITE_CONFIG.ids.idleAction,
      run: GUYSPRITE_CONFIG.ids.runAction,
      standingSequence: GUYSPRITE_CONFIG.motion.standingSequenceAnimationId,
      standingSequenceRight: GUYSPRITE_CONFIG.motion.standingSequenceRightAnimationId,
    },
    render: {
      renderLayer: 'world.actors' as const,
      zIndex: 50,
      depthMode: 'baseline-sort' as const,
      opacity: 1,
    },
    metadata: {
      purpose: 'guysprite-threepwood',
    },
  };

  const base = createDirectionalCharacterSpriteDefinition(spec);

  return {
    ...base,
    visibleDescription: {
      enabled: true,
      text: localization.text.descriptions.guysprite,
    },
  };
}
