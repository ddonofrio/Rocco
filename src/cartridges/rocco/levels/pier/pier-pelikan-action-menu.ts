import type { RoccoEngine } from '../../../../engine/engine-sdk';
import type { RoccoActionMenuDefinition } from '../../../../engine/video/action-menu';
import { roccoDefaultActionMenuAssetUrls } from '../../rocco-default-assets';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import {
  DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
} from '../../rocco-default-constants';

export const DEFAULT_ACTION_MENU_ID = 'rocco-default-action-menu';

const DEFAULT_ACTION_MENU_ITEM_SIZE = 92;
const DEFAULT_ACTION_MENU_ORBIT_RADIUS = 88;
const DEFAULT_ACTION_MENU_ORBIT_SPEED = 0.08;
const DEFAULT_PELIKAN_MESSAGE_TTL_MS = 3150;

export function createDefaultActionMenuDefinition(
  localization: RoccoLocalization = createRoccoLocalization(),
): RoccoActionMenuDefinition {
  return {
    id: DEFAULT_ACTION_MENU_ID,
    targetInstanceIds: [DEFAULT_PELIKAN_SPRITE_INSTANCE_ID],
    renderLayer: 'ui.action-menu',
    itemSize: DEFAULT_ACTION_MENU_ITEM_SIZE,
    orbitRadius: DEFAULT_ACTION_MENU_ORBIT_RADIUS,
    orbitSpeedRadiansPerSecond: DEFAULT_ACTION_MENU_ORBIT_SPEED,
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
        result: {
          kind: 'sprite-message',
          message: {
            spriteInstanceId: DEFAULT_SPRITE_INSTANCE_ID,
            mode: 'think',
            text: localization.text.pelikan.lookLines,
            lineSelection: {
              mode: 'random',
              count: 2,
            },
            ttlMs: DEFAULT_PELIKAN_MESSAGE_TTL_MS,
          },
        },
      },
      {
        id: 'talk',
        actionId: 'talk',
        label: localization.text.actions.talk,
        imageUri: roccoDefaultActionMenuAssetUrls.talk,
      },
      {
        id: 'grab',
        actionId: 'grab',
        label: localization.text.actions.grab,
        imageUri: roccoDefaultActionMenuAssetUrls.grab,
        result: {
          kind: 'sprite-message',
          message: {
            spriteInstanceId: DEFAULT_SPRITE_INSTANCE_ID,
            mode: 'think',
            text: localization.text.pelikan.grabLines,
            lineSelection: {
              mode: 'random',
              count: 1,
            },
            ttlMs: DEFAULT_PELIKAN_MESSAGE_TTL_MS,
          },
        },
      },
      {
        id: 'kick',
        actionId: 'kick',
        label: localization.text.actions.kick,
        imageUri: roccoDefaultActionMenuAssetUrls.kick,
        result: {
          kind: 'sprite-message',
          message: {
            spriteInstanceId: DEFAULT_SPRITE_INSTANCE_ID,
            mode: 'think',
            text: localization.text.pelikan.kickLines,
            lineSelection: {
              mode: 'random',
              count: 1,
            },
            ttlMs: DEFAULT_PELIKAN_MESSAGE_TTL_MS,
          },
        },
      },
    ],
  };
}

export function installDefaultActionMenu(
  engine: RoccoEngine,
  localization: RoccoLocalization = createRoccoLocalization(),
): void {
  engine.video.actionMenus.unregisterMenu(DEFAULT_ACTION_MENU_ID);
  engine.video.actionMenus.registerMenu(createDefaultActionMenuDefinition(localization));
  engine.video.render(0);
}

export function showDefaultPelikanTalkReaction(
  engine: RoccoEngine,
  localization: RoccoLocalization = createRoccoLocalization(),
): void {
  engine.video.messages.showMessage({
    spriteInstanceId: DEFAULT_SPRITE_INSTANCE_ID,
    mode: 'say',
    text: localization.text.pelikan.talkLines,
    lineSelection: {
      mode: 'random',
      count: 1,
      historyKey: 'pelikan-talk',
      avoidImmediateRepeat: true,
    },
    ttlMs: DEFAULT_PELIKAN_MESSAGE_TTL_MS,
  });
  engine.video.render(0);
}
