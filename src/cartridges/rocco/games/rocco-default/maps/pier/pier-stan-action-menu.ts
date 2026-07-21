import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoActionMenuDefinition } from '../../../../../../console/video/action-menu';
import { ROCCO_ACTION_MENU_ASSETS } from '../../ui';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import { PIER_STAN_CONFIG } from './pier-stan-config';

export const DEFAULT_STAN_ACTION_MENU_ID = 'rocco-stan-action-menu';

const DEFAULT_STAN_ACTION_MENU_ITEM_SIZE = 92;
const DEFAULT_STAN_ACTION_MENU_ORBIT_RADIUS = 88;
const DEFAULT_STAN_ACTION_MENU_ORBIT_SPEED = 0.08;
export const DEFAULT_STAN_MESSAGE_TTL_MS = 7200;

export function createDefaultStanActionMenuDefinition(
  localization: RoccoLocalization = createRoccoLocalization(),
): RoccoActionMenuDefinition {
  return {
    id: DEFAULT_STAN_ACTION_MENU_ID,
    targetInstanceIds: [PIER_STAN_CONFIG.spriteInstanceId],
    renderLayer: 'ui.action-menu',
    itemSize: DEFAULT_STAN_ACTION_MENU_ITEM_SIZE,
    orbitRadius: DEFAULT_STAN_ACTION_MENU_ORBIT_RADIUS,
    orbitSpeedRadiansPerSecond: DEFAULT_STAN_ACTION_MENU_ORBIT_SPEED,
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
        id: 'talk',
        actionId: 'talk',
        label: localization.text.actions.talk,
        imageUri: ROCCO_ACTION_MENU_ASSETS.talk,
      },
      {
        id: 'grab',
        actionId: 'grab',
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

export function installDefaultStanActionMenu(
  engine: CartridgeSdkV1Runtime,
  localization: RoccoLocalization = createRoccoLocalization(),
): void {
  engine.video.actionMenus.unregisterMenu(DEFAULT_STAN_ACTION_MENU_ID);
  engine.video.actionMenus.registerMenu(createDefaultStanActionMenuDefinition(localization));
}

export function uninstallDefaultStanActionMenu(engine: CartridgeSdkV1Runtime): void {
  engine.video.actionMenus.unregisterMenu(DEFAULT_STAN_ACTION_MENU_ID);
}
