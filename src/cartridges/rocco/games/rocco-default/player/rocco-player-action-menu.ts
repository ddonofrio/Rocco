import type {
  RoccoActionMenuActivation,
  RoccoActionMenuDefinition,
} from '../../../../../console/video/action-menu';
import type { CartridgeSdkV1Runtime } from '../../../../../console/cartridges/sdk-v1';
import { ROCCO_ACTION_MENU_ASSETS } from '../ui';
import { ROCCO_PLAYER_CONFIG } from './rocco-player-config';
import {
  isRoccoDeveloperModeEnabled,
  ROCCO_PLAYER_DEVELOPER_ACTION_ID,
} from '../../../rocco-developer-mode';
import { createRoccoLocalization, type RoccoLocalization } from '../../../localization';

export const ROCCO_PLAYER_ACTION_MENU_ID = 'rocco-player-action-menu';
export const ROCCO_PLAYER_TALK_ACTION_ID = 'talk-self';
export const ROCCO_PLAYER_INVENTORY_ACTION_ID = 'open-inventory';
export { ROCCO_PLAYER_DEVELOPER_ACTION_ID } from '../../../rocco-developer-mode';

export function createRoccoPlayerActionMenuDefinition(
  localization: RoccoLocalization = createRoccoLocalization(),
  isDeveloperModeEnabled = false,
): RoccoActionMenuDefinition {
  const items: RoccoActionMenuDefinition['items'] = [
    {
      id: 'talk',
      actionId: ROCCO_PLAYER_TALK_ACTION_ID,
      label: localization.text.actions.talk,
      imageUri: ROCCO_ACTION_MENU_ASSETS.talk,
    },
    {
      id: 'inventory',
      actionId: ROCCO_PLAYER_INVENTORY_ACTION_ID,
      label: localization.text.actions.inventory,
      imageUri: ROCCO_ACTION_MENU_ASSETS.inventory,
    },
  ];

  if (isDeveloperModeEnabled) {
    items.push({
      id: 'developer-mode',
      actionId: ROCCO_PLAYER_DEVELOPER_ACTION_ID,
      label: localization.text.developer.actionLabel,
      imageUri: ROCCO_ACTION_MENU_ASSETS.developerMode,
    });
  }

  return {
    id: ROCCO_PLAYER_ACTION_MENU_ID,
    targetInstanceIds: [ROCCO_PLAYER_CONFIG.ids.instance],
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
  engine: CartridgeSdkV1Runtime,
  localization: RoccoLocalization = createRoccoLocalization(),
): void {
  engine.video.actionMenus.registerMenu(
    createRoccoPlayerActionMenuDefinition(localization, isRoccoDeveloperModeEnabled(engine)),
  );
}

export function uninstallRoccoPlayerActionMenu(engine: CartridgeSdkV1Runtime): void {
  engine.video.actionMenus.unregisterMenu(ROCCO_PLAYER_ACTION_MENU_ID);
}

export function isRoccoPlayerInventoryAction(activation: RoccoActionMenuActivation): boolean {
  return (
    activation.definitionId === ROCCO_PLAYER_ACTION_MENU_ID &&
    activation.actionId === ROCCO_PLAYER_INVENTORY_ACTION_ID
  );
}

export function isRoccoPlayerDeveloperAction(activation: RoccoActionMenuActivation): boolean {
  return (
    activation.definitionId === ROCCO_PLAYER_ACTION_MENU_ID &&
    activation.actionId === ROCCO_PLAYER_DEVELOPER_ACTION_ID
  );
}
