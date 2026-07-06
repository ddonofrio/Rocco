import type {
  RoccoActionMenuActivation,
  RoccoActionMenuDefinition,
} from '../../engine/video/action-menu';
import type { RoccoEngine } from '../../engine/engine-sdk';
import { roccoDefaultActionMenuAssetUrls } from './rocco-default-assets';
import { DEFAULT_SPRITE_INSTANCE_ID } from './rocco-default-constants';
import {
  isRoccoDeveloperModeEnabled,
  ROCCO_PLAYER_DEVELOPER_ACTION_ID,
} from './rocco-developer-mode';
import { createRoccoLocalization, type RoccoLocalization } from './localization';

export const ROCCO_PLAYER_ACTION_MENU_ID = 'rocco-player-action-menu';
export const ROCCO_PLAYER_TALK_ACTION_ID = 'talk-self';
export const ROCCO_PLAYER_INVENTORY_ACTION_ID = 'open-inventory';
export { ROCCO_PLAYER_DEVELOPER_ACTION_ID } from './rocco-developer-mode';

export function createRoccoPlayerActionMenuDefinition(
  localization: RoccoLocalization = createRoccoLocalization(),
  developerModeEnabled = false,
): RoccoActionMenuDefinition {
  const items: RoccoActionMenuDefinition['items'] = [
    {
      id: 'talk',
      actionId: ROCCO_PLAYER_TALK_ACTION_ID,
      label: localization.text.actions.talk,
      imageUri: roccoDefaultActionMenuAssetUrls.talk,
      result: {
        kind: 'sprite-message',
        message: {
          spriteInstanceId: DEFAULT_SPRITE_INSTANCE_ID,
          mode: 'think',
          text: localization.text.rocco.selfTalkLines,
          lineSelection: {
            mode: 'random',
            count: 1,
            historyKey: 'rocco-self-talk',
            avoidImmediateRepeat: true,
          },
          ttlMs: 5200,
        },
      },
    },
    {
      id: 'inventory',
      actionId: ROCCO_PLAYER_INVENTORY_ACTION_ID,
      label: localization.text.actions.inventory,
      imageUri: roccoDefaultActionMenuAssetUrls.inventory,
    },
  ];

  if (developerModeEnabled) {
    items.push({
      id: 'developer-mode',
      actionId: ROCCO_PLAYER_DEVELOPER_ACTION_ID,
      label: localization.text.developer.actionLabel,
      imageUri: roccoDefaultActionMenuAssetUrls.developerMode,
    });
  }

  return {
    id: ROCCO_PLAYER_ACTION_MENU_ID,
    targetInstanceIds: [DEFAULT_SPRITE_INSTANCE_ID],
    renderLayer: 'ui.action-menu',
    itemSize: 92,
    orbitRadius: 72,
    orbitSpeedRadiansPerSecond: 0.04,
    hoverScale: 1.16,
    circleFill: '#0f1610',
    circleStroke: '#d7e6c5',
    circleStrokeWidth: 2,
    items,
  };
}

export function installRoccoPlayerActionMenu(
  engine: RoccoEngine,
  localization: RoccoLocalization = createRoccoLocalization(),
): void {
  engine.video.actionMenus.registerMenu(
    createRoccoPlayerActionMenuDefinition(
      localization,
      isRoccoDeveloperModeEnabled(engine),
    ),
  );
}

export function uninstallRoccoPlayerActionMenu(engine: RoccoEngine): void {
  engine.video.actionMenus.unregisterMenu(ROCCO_PLAYER_ACTION_MENU_ID);
}

export function isRoccoPlayerInventoryAction(
  activation: RoccoActionMenuActivation,
): boolean {
  return (
    activation.definitionId === ROCCO_PLAYER_ACTION_MENU_ID &&
    activation.actionId === ROCCO_PLAYER_INVENTORY_ACTION_ID
  );
}

export function isRoccoPlayerDeveloperAction(
  activation: RoccoActionMenuActivation,
): boolean {
  return (
    activation.definitionId === ROCCO_PLAYER_ACTION_MENU_ID &&
    activation.actionId === ROCCO_PLAYER_DEVELOPER_ACTION_ID
  );
}
