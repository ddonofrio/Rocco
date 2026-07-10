import type { RoccoActionMenuDefinition } from '../../../../../../console/video/action-menu';
import type { RoccoSpriteDefinition } from '../../../../../../console/video/sprites';
import {
  roccoDefaultActionMenuAssetUrls,
  roccoDefaultKeysAssetUrl,
} from '../../sprites';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import {
  DEFAULT_KEYS_ANIMATION_ID,
  DEFAULT_KEYS_PIVOT_X,
  DEFAULT_KEYS_PIVOT_Y,
  DEFAULT_KEYS_RENDER_LAYER,
  DEFAULT_KEYS_SPRITE_DEFINITION_ID,
  DEFAULT_KEYS_SPRITE_HEIGHT,
  DEFAULT_KEYS_SPRITE_INSTANCE_ID,
  DEFAULT_KEYS_SPRITE_WIDTH,
  DEFAULT_KEYS_Z_INDEX,
} from '../../constants';

const KEYS_FRAME_ID = 'keys-idle-frame';
export const KEYS_ACTION_MESSAGE_TTL_MS = 5200;

export const KEYS_ACTION_MENU_ID = 'rocco-keys-action-menu';
export const KEYS_GRAB_ACTION_ID = 'grab';

export function createDefaultKeysActionMenu(
  localization: RoccoLocalization,
): RoccoActionMenuDefinition {
  return {
    id: KEYS_ACTION_MENU_ID,
    targetInstanceIds: [DEFAULT_KEYS_SPRITE_INSTANCE_ID],
    renderLayer: 'ui.action-menu',
    itemSize: 92,
    orbitRadius: 72,
    orbitSpeedRadiansPerSecond: 0.04,
    hoverScale: 1.16,
    circleFill: '#0f1610',
    circleStroke: '#d7e6c5',
    circleStrokeWidth: 2,
    items: [
      {
        id: 'look',
        actionId: 'look',
        label: localization.text.actions.look,
        imageUri: roccoDefaultActionMenuAssetUrls.look,
      },
      {
        id: 'grab',
        actionId: KEYS_GRAB_ACTION_ID,
        label: localization.text.actions.grab,
        imageUri: roccoDefaultActionMenuAssetUrls.grab,
      },
      {
        id: 'kick',
        actionId: 'kick',
        label: localization.text.actions.kick,
        imageUri: roccoDefaultActionMenuAssetUrls.kick,
      },
    ],
  };
}

export function createDefaultKeysSpriteDefinition(
  localization: RoccoLocalization = createRoccoLocalization(),
): RoccoSpriteDefinition {
  return {
    id: DEFAULT_KEYS_SPRITE_DEFINITION_ID,
    name: 'Rocco Demo Keys',
    images: [
      {
        id: 'rocco-keys',
        uri: roccoDefaultKeysAssetUrl,
        width: DEFAULT_KEYS_SPRITE_WIDTH,
        height: DEFAULT_KEYS_SPRITE_HEIGHT,
      },
    ],
    frames: [
      {
        id: KEYS_FRAME_ID,
        imageId: 'rocco-keys',
        durationMs: 1000,
        pivot: {
          x: DEFAULT_KEYS_PIVOT_X,
          y: DEFAULT_KEYS_PIVOT_Y,
        },
        hitbox: {
          kind: 'rect',
          x: 35,
          y: 21,
          width: 230,
          height: 345,
        },
      },
    ],
    animations: {
      [DEFAULT_KEYS_ANIMATION_ID]: {
        id: DEFAULT_KEYS_ANIMATION_ID,
        loop: false,
        playbackRate: 1,
        frames: [{ frameId: KEYS_FRAME_ID, durationMs: 1000 }],
      },
    },
    defaultAnimation: DEFAULT_KEYS_ANIMATION_ID,
    pivot: {
      x: DEFAULT_KEYS_PIVOT_X,
      y: DEFAULT_KEYS_PIVOT_Y,
    },
    render: {
      renderLayer: DEFAULT_KEYS_RENDER_LAYER,
      zIndex: DEFAULT_KEYS_Z_INDEX,
      depthMode: 'fixed',
      opacity: 1,
    },
    visibleDescription: {
      enabled: true,
      text: localization.text.descriptions.keys,
    },
    metadata: {
      purpose: 'default-rocco-keys-demo',
    },
  };
}
