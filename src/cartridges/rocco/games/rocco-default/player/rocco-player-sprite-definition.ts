import {
  type RoccoCollisionShape,
  type RoccoSpriteDefinition,
} from '../../../../../console/video/sprites';
import { createRoccoLocalization, type RoccoLocalization } from '../../../localization';
import {
  DEFAULT_ROCCO_PLAYER_APPEARANCE,
  ROCCO_LAB_COAT_PLAYER_APPEARANCE,
  type RoccoPlayerAppearance,
} from './rocco-player-appearance';
import { ROCCO_PLAYER_CONFIG } from './rocco-player-config';
import { resolveRoccoPlayerAppearanceAssetUrls } from './rocco-player-assets';
import {
  createDirectionalCharacterSpriteDefinition,
  type DirectionalCharacterSpriteSpec,
} from '../sprites/directional-character-sprite-definition';

const PICK_UP_IMAGE_ID = 'rocco-pick-up';
const PICK_UP_FRAME_ID = 'pick-up-front';
const PICK_UP_ANIMATION_ID = 'pick-up-front';
const ROCCO_ID_PREFIX = 'rocco';

export interface RoccoPlayerSpriteDefinitionOptions {
  appearance?: RoccoPlayerAppearance;
}

function makeDefaultHitbox(): RoccoCollisionShape {
  return ROCCO_PLAYER_CONFIG.frame.hitbox;
}

function buildRoccoPlayerSpec(appearance: RoccoPlayerAppearance): DirectionalCharacterSpriteSpec {
  const assets = resolveRoccoPlayerAppearanceAssetUrls(appearance);

  return {
    definitionId: ROCCO_PLAYER_CONFIG.ids.definition,
    name:
      appearance === ROCCO_LAB_COAT_PLAYER_APPEARANCE
        ? 'Rocco Player Sprite (Lab Coat)'
        : 'Rocco Player Sprite',
    idPrefix: ROCCO_ID_PREFIX,
    assets: {
      runLeft: assets.runLeft,
      runRight: assets.runRight,
      standing: assets.standing,
    },
    frame: {
      width: ROCCO_PLAYER_CONFIG.frame.width,
      height: ROCCO_PLAYER_CONFIG.frame.height,
      baseline: ROCCO_PLAYER_CONFIG.frame.baseline,
      groundAnchor: {
        x: ROCCO_PLAYER_CONFIG.frame.groundAnchor.x,
        y: ROCCO_PLAYER_CONFIG.frame.groundAnchor.y,
      },
      hitbox: makeDefaultHitbox(),
    },
    motion: {
      runSpeed: ROCCO_PLAYER_CONFIG.motion.runSpeed,
      pixelsPerFrame: ROCCO_PLAYER_CONFIG.motion.pixelsPerFrame,
      runFrameDurationMs: 120,
      standingPoseDurationMs: ROCCO_PLAYER_CONFIG.standing.poseDurationMs,
    },
    actions: {
      idle: ROCCO_PLAYER_CONFIG.ids.idleAction,
      run: ROCCO_PLAYER_CONFIG.ids.runAction,
      standingSequence: ROCCO_PLAYER_CONFIG.standing.standingSequenceAnimationId,
      standingSequenceRight: ROCCO_PLAYER_CONFIG.standing.standingSequenceRightAnimationId,
    },
    render: {
      renderLayer: 'world.actors' as const,
      zIndex: 50,
      depthMode: 'baseline-sort' as const,
      opacity: 1,
    },
    metadata: {
      purpose: 'default-rocco-player',
      appearance,
    },
  };
}

export function createRoccoPlayerSpriteDefinition(
  localization: RoccoLocalization = createRoccoLocalization(),
  options: RoccoPlayerSpriteDefinitionOptions = {},
): RoccoSpriteDefinition {
  const appearance = options.appearance ?? DEFAULT_ROCCO_PLAYER_APPEARANCE;
  const appearanceAssets = resolveRoccoPlayerAppearanceAssetUrls(appearance);

  const spec = buildRoccoPlayerSpec(appearance);
  const base = createDirectionalCharacterSpriteDefinition(spec);

  const pickUpImage = {
    id: PICK_UP_IMAGE_ID,
    uri: appearanceAssets.pickUp,
    width: ROCCO_PLAYER_CONFIG.frame.width,
    height: ROCCO_PLAYER_CONFIG.frame.height,
  };

  const pickUpFrame = {
    id: PICK_UP_FRAME_ID,
    imageId: PICK_UP_IMAGE_ID,
    durationMs: 420,
    hitbox: makeDefaultHitbox(),
  };

  return {
    ...base,
    images: [...base.images, pickUpImage],
    frames: [...base.frames, pickUpFrame],
    animations: {
      ...base.animations,
      [PICK_UP_ANIMATION_ID]: {
        id: PICK_UP_ANIMATION_ID,
        loop: false,
        playbackRate: 1,
        frames: [{ frameId: PICK_UP_FRAME_ID, durationMs: 420 }],
      },
    },
    actions: {
      ...base.actions,
      [ROCCO_PLAYER_CONFIG.ids.pickUpAction]: {
        id: ROCCO_PLAYER_CONFIG.ids.pickUpAction,
        directionalAnimations: {
          default: PICK_UP_ANIMATION_ID,
          down: PICK_UP_ANIMATION_ID,
        },
        playbackRate: 1,
      },
    },
    visibleDescription: {
      enabled: true,
      text: localization.text.descriptions.rocco,
    },
  };
}
