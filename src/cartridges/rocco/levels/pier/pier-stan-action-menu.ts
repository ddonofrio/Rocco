import type { RoccoEngine } from '../../../../engine/engine-sdk';
import type { RoccoActionMenuDefinition } from '../../../../engine/video/action-menu';
import { roccoDefaultActionMenuAssetUrls } from '../../rocco-default-assets';
import { createRoccoLocalization, type RoccoLocalization } from '../../localization';
import {
  DEFAULT_SPRITE_INSTANCE_ID,
  DEFAULT_STAN_SPRITE_INSTANCE_ID,
} from '../../rocco-default-constants';

export const DEFAULT_STAN_ACTION_MENU_ID = 'rocco-stan-action-menu';

const DEFAULT_STAN_ACTION_MENU_ITEM_SIZE = 92;
const DEFAULT_STAN_ACTION_MENU_ORBIT_RADIUS = 88;
const DEFAULT_STAN_ACTION_MENU_ORBIT_SPEED = 0.08;
const DEFAULT_STAN_MESSAGE_TTL_MS = 7200;

function makeRandomMessageResult(mode: 'say' | 'think', text: string[], historyKey: string) {
  return {
    kind: 'sprite-message' as const,
    message: {
      spriteInstanceId: DEFAULT_SPRITE_INSTANCE_ID,
      mode,
      text,
      lineSelection: {
        mode: 'random' as const,
        count: 1,
        historyKey,
        avoidImmediateRepeat: true,
      },
      ttlMs: DEFAULT_STAN_MESSAGE_TTL_MS,
    },
  };
}

export function createDefaultStanActionMenuDefinition(
  localization: RoccoLocalization = createRoccoLocalization(),
): RoccoActionMenuDefinition {
  return {
    id: DEFAULT_STAN_ACTION_MENU_ID,
    targetInstanceIds: [DEFAULT_STAN_SPRITE_INSTANCE_ID],
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
        imageUri: roccoDefaultActionMenuAssetUrls.look,
        result: makeRandomMessageResult('think', localization.text.stan.lookLines, 'stan-look'),
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
        result: makeRandomMessageResult('think', localization.text.stan.grabLines, 'stan-grab'),
      },
      {
        id: 'kick',
        actionId: 'kick',
        label: localization.text.actions.kick,
        imageUri: roccoDefaultActionMenuAssetUrls.kick,
        result: makeRandomMessageResult('think', localization.text.stan.kickLines, 'stan-kick'),
      },
    ],
  };
}

export function installDefaultStanActionMenu(
  engine: RoccoEngine,
  localization: RoccoLocalization = createRoccoLocalization(),
): void {
  engine.video.actionMenus.unregisterMenu(DEFAULT_STAN_ACTION_MENU_ID);
  engine.video.actionMenus.registerMenu(createDefaultStanActionMenuDefinition(localization));
  engine.video.render(0);
}

export function uninstallDefaultStanActionMenu(engine: RoccoEngine): void {
  engine.video.actionMenus.unregisterMenu(DEFAULT_STAN_ACTION_MENU_ID);
  engine.video.render(0);
}
