import type { RoccoEngine } from '../../../../../../console/engine-sdk';
import type { RoccoActionMenuDefinition } from '../../../../../../console/video/action-menu';
import { roccoCartridgeMessageRuntime } from '../../../../rpce/dialogue';
import { roccoDefaultActionMenuAssetUrls } from '../../sprites';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import {
  DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
  DEFAULT_SPRITE_INSTANCE_ID,
} from '../../constants';

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
  roccoCartridgeMessageRuntime.say(
    engine,
    DEFAULT_SPRITE_INSTANCE_ID,
    localization.text.pelikan.talkLines,
    {
      ttlMs: DEFAULT_PELIKAN_MESSAGE_TTL_MS,
    },
    {
      count: 1,
      historyKey: 'pelikan-talk',
      avoidImmediateRepeat: true,
    },
  );
  engine.video.render(0);
}

export function showDefaultPelikanSimpleReaction(
  engine: RoccoEngine,
  actionId: string,
  localization: RoccoLocalization = createRoccoLocalization(),
): boolean {
  const selection =
    actionId === 'look'
      ? { lines: localization.text.pelikan.lookLines, count: 2, historyKey: 'pelikan-look' }
      : actionId === 'grab'
        ? { lines: localization.text.pelikan.grabLines, count: 1, historyKey: 'pelikan-grab' }
        : actionId === 'kick'
          ? { lines: localization.text.pelikan.kickLines, count: 1, historyKey: 'pelikan-kick' }
          : undefined;

  if (!selection) {
    return false;
  }

  roccoCartridgeMessageRuntime.think(
    engine,
    DEFAULT_SPRITE_INSTANCE_ID,
    selection.lines,
    {
      ttlMs: DEFAULT_PELIKAN_MESSAGE_TTL_MS,
    },
    {
      count: selection.count,
      historyKey: selection.historyKey,
      avoidImmediateRepeat: true,
    },
  );
  engine.video.render(0);
  return true;
}
