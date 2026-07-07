import type { RoccoEngine } from '../../../../engine/engine-sdk';
import type { RoccoActionMenuDefinition } from '../../../../engine/video/action-menu';
import {
  selectNonRepeatingLines,
  type RoccoNonRepeatingLineSelectionState,
} from '../../dialogue';
import { roccoDefaultActionMenuAssetUrls } from '../../rocco-default-assets';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import {
  DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID,
  DEFAULT_PELIKAN_SPRITE_INSTANCE_ID,
} from '../../rocco-default-constants';

export const DEFAULT_FEEDING_LOOK_ACTION_MENU_ID = 'rocco-feeding-look-action-menu';
export const DEFAULT_FEEDING_LOOK_ACTION_ID = 'look';
export const DEFAULT_FEEDING_LOOK_MESSAGE_TTL_MS = 3150;

export interface RoccoDefaultFeedingLookSelection {
  line: string;
  state: RoccoNonRepeatingLineSelectionState;
}

export function createDefaultFeedingLookActionMenu(
  localization: RoccoLocalization = createRoccoLocalization(),
): RoccoActionMenuDefinition {
  return {
    id: DEFAULT_FEEDING_LOOK_ACTION_MENU_ID,
    targetInstanceIds: [DEFAULT_PELIKAN_SPRITE_INSTANCE_ID, DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID],
    renderLayer: 'ui.action-menu',
    itemSize: 92,
    orbitRadius: 58,
    orbitSpeedRadiansPerSecond: 0.04,
    hoverScale: 1.16,
    circleFill: '#0f1610',
    circleStroke: '#d7e6c5',
    circleStrokeWidth: 2,
    items: [
      {
        id: DEFAULT_FEEDING_LOOK_ACTION_ID,
        actionId: DEFAULT_FEEDING_LOOK_ACTION_ID,
        label: localization.text.actions.look,
        imageUri: roccoDefaultActionMenuAssetUrls.look,
      },
    ],
  };
}

export function installDefaultFeedingLookActionMenu(
  engine: RoccoEngine,
  localization: RoccoLocalization = createRoccoLocalization(),
): void {
  engine.video.actionMenus.unregisterMenu(DEFAULT_FEEDING_LOOK_ACTION_MENU_ID);
  engine.video.actionMenus.registerMenu(createDefaultFeedingLookActionMenu(localization));
  engine.video.render(0);
}

export function uninstallDefaultFeedingLookActionMenu(engine: RoccoEngine): void {
  engine.video.actionMenus.unregisterMenu(DEFAULT_FEEDING_LOOK_ACTION_MENU_ID);
  engine.video.render(0);
}

export function isDefaultFeedingLookTarget(instanceId: string): boolean {
  return (
    instanceId === DEFAULT_PELIKAN_SPRITE_INSTANCE_ID ||
    instanceId === DEFAULT_BAIT_BUCKET_SPRITE_INSTANCE_ID
  );
}

export function pickDefaultFeedingLookLine(
  random: () => number,
  state: RoccoNonRepeatingLineSelectionState | null,
  lines: readonly string[],
): RoccoDefaultFeedingLookSelection {
  const selection = selectNonRepeatingLines({
    lines,
    count: 1,
    random,
    state: state ?? undefined,
  });

  return {
    line: selection.lines[0] ?? lines[0] ?? '',
    state: selection.state,
  };
}
