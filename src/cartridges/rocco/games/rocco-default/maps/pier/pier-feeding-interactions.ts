import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoActionMenuDefinition } from '../../../../../../console/video/action-menu';
import {
  selectNonRepeatingLines,
  type RoccoNonRepeatingLineSelectionState,
} from '../../../../rpce/dialogue';
import { ROCCO_ACTION_MENU_ASSETS } from '../../ui';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import { PIER_PELIKAN_CONFIG } from './pier-pelikan-config';
import { PIER_BAIT_BUCKET_CONFIG } from './pier-bait-bucket-config';

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
    targetInstanceIds: [
      PIER_PELIKAN_CONFIG.spriteInstanceId,
      PIER_BAIT_BUCKET_CONFIG.spriteInstanceId,
    ],
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
        imageUri: ROCCO_ACTION_MENU_ASSETS.look,
      },
    ],
  };
}

export function installDefaultFeedingLookActionMenu(
  engine: CartridgeSdkV1Runtime,
  localization: RoccoLocalization = createRoccoLocalization(),
): void {
  engine.video.actionMenus.unregisterMenu(DEFAULT_FEEDING_LOOK_ACTION_MENU_ID);
  engine.video.actionMenus.registerMenu(createDefaultFeedingLookActionMenu(localization));
}

export function uninstallDefaultFeedingLookActionMenu(engine: CartridgeSdkV1Runtime): void {
  engine.video.actionMenus.unregisterMenu(DEFAULT_FEEDING_LOOK_ACTION_MENU_ID);
}

export function isDefaultFeedingLookTarget(instanceId: string): boolean {
  return (
    instanceId === PIER_PELIKAN_CONFIG.spriteInstanceId ||
    instanceId === PIER_BAIT_BUCKET_CONFIG.spriteInstanceId
  );
}

export function pickDefaultFeedingLookLine(
  random: () => number,
  state: RoccoNonRepeatingLineSelectionState | undefined,
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
