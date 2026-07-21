import type { RoccoActionMenuDefinition } from '../../../../../../console/video/action-menu';
import type { RoccoSpriteDefinition } from '../../../../../../console/video/sprites';
import { ROCCO_ACTION_MENU_ASSETS } from '../../ui';
import { ROCCO_INVENTORY_KEYS_ASSET_URL } from '../../../../inventory/rocco-inventory-assets';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import { PIER_KEYS_CONFIG } from './pier-keys-config';

const KEYS_FRAME_ID = 'keys-idle-frame';
export const KEYS_ACTION_MESSAGE_TTL_MS = 5200;

export const KEYS_ACTION_MENU_ID = 'rocco-keys-action-menu';
export const KEYS_GRAB_ACTION_ID = 'grab';

export function createDefaultKeysActionMenu(
  localization: RoccoLocalization,
): RoccoActionMenuDefinition {
  return {
    id: KEYS_ACTION_MENU_ID,
    targetInstanceIds: [PIER_KEYS_CONFIG.spriteInstanceId],
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
        imageUri: ROCCO_ACTION_MENU_ASSETS.look,
      },
      {
        id: 'grab',
        actionId: KEYS_GRAB_ACTION_ID,
        label: localization.text.actions.grab,
        imageUri: ROCCO_ACTION_MENU_ASSETS.grab,
      },
      {
        id: 'kick',
        actionId: 'kick',
        label: localization.text.actions.kick,
        imageUri: ROCCO_ACTION_MENU_ASSETS.kick,
      },
    ],
  };
}

export function createDefaultKeysSpriteDefinition(
  localization: RoccoLocalization = createRoccoLocalization(),
): RoccoSpriteDefinition {
  return {
    id: PIER_KEYS_CONFIG.spriteDefinitionId,
    name: 'Rocco Demo Keys',
    images: createKeysImages(),
    frames: createKeysFrames(),
    animations: createKeysAnimations(),
    defaultAnimation: PIER_KEYS_CONFIG.animationId,
    pivot: {
      x: PIER_KEYS_CONFIG.pivotX,
      y: PIER_KEYS_CONFIG.pivotY,
    },
    render: {
      renderLayer: PIER_KEYS_CONFIG.renderLayer,
      zIndex: PIER_KEYS_CONFIG.zIndex,
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

function createKeysImages(): RoccoSpriteDefinition['images'] {
  return [
    {
      id: 'rocco-keys',
      uri: ROCCO_INVENTORY_KEYS_ASSET_URL,
      width: PIER_KEYS_CONFIG.spriteWidth,
      height: PIER_KEYS_CONFIG.spriteHeight,
    },
  ];
}

function createKeysFrames(): RoccoSpriteDefinition['frames'] {
  return [
    {
      id: KEYS_FRAME_ID,
      imageId: 'rocco-keys',
      durationMs: 1000,
      pivot: {
        x: PIER_KEYS_CONFIG.pivotX,
        y: PIER_KEYS_CONFIG.pivotY,
      },
      hitbox: {
        kind: 'rect',
        x: 35,
        y: 21,
        width: 230,
        height: 345,
      },
    },
  ];
}

function createKeysAnimations(): RoccoSpriteDefinition['animations'] {
  return {
    [PIER_KEYS_CONFIG.animationId]: {
      id: PIER_KEYS_CONFIG.animationId,
      loop: false,
      playbackRate: 1,
      frames: [{ frameId: KEYS_FRAME_ID, durationMs: 1000 }],
    },
  };
}
