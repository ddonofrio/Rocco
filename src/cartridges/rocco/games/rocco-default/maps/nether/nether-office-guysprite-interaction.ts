import type {
  RoccoActionMenuActivation,
  RoccoActionMenuDefinition,
} from '../../../../../../console/video/action-menu';
import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import { roccoCartridgeMessageRuntime } from '../../../../rpce/dialogue';
import { ROCCO_ACTION_MENU_ASSETS } from '../../ui';
import { GUYSPRITE_CONFIG } from '../../characters/guysprite';
import { ROCCO_PLAYER_CONFIG } from '../../player';
import type { RoccoLocalization } from '../../localization';

export const NETHER_OFFICE_GUYSPRITE_ACTION_MENU_ID = 'rocco-nether-office-guysprite-action-menu';
export const NETHER_OFFICE_GUYSPRITE_MESSAGE_STYLE = {
  fill: '#4a1f12',
  bubbleFill: '#f3dfc7',
  bubbleStroke: '#8a4e32',
  bubbleStrokeWidth: 2,
} as const;
export const NETHER_OFFICE_GUYSPRITE_TARGET_ID = 'guysprite-threepwood-main';
const NETHER_OFFICE_GUYSPRITE_TARGET_DEFINITION_ID = 'guysprite-threepwood-sprite';
export const NETHER_OFFICE_GUYSPRITE_FIRST_ROOM_TARGET_SHAPE = {
  kind: 'rect' as const,
  x: 300,
  y: 130,
  width: 145,
  height: 310,
};

export type NetherOfficeGuyspriteTargetShape =
  typeof NETHER_OFFICE_GUYSPRITE_FIRST_ROOM_TARGET_SHAPE;

function isPointInsideGuyspriteTarget(
  x: number,
  y: number,
  shape: NetherOfficeGuyspriteTargetShape,
): boolean {
  return x >= shape.x && x <= shape.x + shape.width && y >= shape.y && y <= shape.y + shape.height;
}
const NETHER_OFFICE_GUYSPRITE_LOOK_HISTORY_KEY = 'nether-office-guysprite-look';
const NETHER_OFFICE_GUYSPRITE_MESSAGE_TTL_MS = 4200;

export function createNetherOfficeGuyspriteActionMenuDefinition(
  localization: RoccoLocalization,
): RoccoActionMenuDefinition {
  return {
    id: NETHER_OFFICE_GUYSPRITE_ACTION_MENU_ID,
    targetInstanceIds: [NETHER_OFFICE_GUYSPRITE_TARGET_ID],
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
        label: localization.text.actions.see,
        imageUri: ROCCO_ACTION_MENU_ASSETS.look,
      },
      {
        id: 'talk',
        actionId: 'talk',
        label: localization.text.actions.talk,
        imageUri: ROCCO_ACTION_MENU_ASSETS.talk,
      },
    ],
  };
}

export function registerNetherOfficeGuyspriteInteraction(
  engine: CartridgeSdkV1Runtime,
  localization: RoccoLocalization,
  isEnabled = true,
  targetShape: NetherOfficeGuyspriteTargetShape = NETHER_OFFICE_GUYSPRITE_FIRST_ROOM_TARGET_SHAPE,
): void {
  engine.video.sceneTargets?.unregisterTarget(NETHER_OFFICE_GUYSPRITE_TARGET_ID);
  engine.video.sceneTargets?.registerTarget({
    instanceId: NETHER_OFFICE_GUYSPRITE_TARGET_ID,
    definitionId: NETHER_OFFICE_GUYSPRITE_TARGET_DEFINITION_ID,
    shape: targetShape,
    renderLayer: 'world.actors',
    priority: 60,
    enabled: isEnabled,
    visibleDescription: {
      enabled: true,
      text: localization.text.descriptions.guysprite,
    },
  });
  engine.video.actionMenus.unregisterMenu(NETHER_OFFICE_GUYSPRITE_ACTION_MENU_ID);
  engine.video.actionMenus.registerMenu(
    createNetherOfficeGuyspriteActionMenuDefinition(localization),
  );
}

export function setNetherOfficeGuyspriteInteractionEnabled(
  engine: CartridgeSdkV1Runtime,
  isEnabled: boolean,
): void {
  engine.video.sceneTargets?.setEnabled(NETHER_OFFICE_GUYSPRITE_TARGET_ID, isEnabled);
}

export function unregisterNetherOfficeGuyspriteInteraction(engine: CartridgeSdkV1Runtime): void {
  engine.video.sceneTargets?.unregisterTarget(NETHER_OFFICE_GUYSPRITE_TARGET_ID);
  engine.video.actionMenus.unregisterMenu(NETHER_OFFICE_GUYSPRITE_ACTION_MENU_ID);
}

export function canOpenNetherOfficeGuyspriteMenuAt(
  engine: CartridgeSdkV1Runtime,
  x: number,
  y: number,
  targetShape: NetherOfficeGuyspriteTargetShape = NETHER_OFFICE_GUYSPRITE_FIRST_ROOM_TARGET_SHAPE,
): boolean {
  if (!isPointInsideGuyspriteTarget(x, y, targetShape)) {
    return false;
  }

  return engine.video.actionMenus.openMenuForTarget(
    NETHER_OFFICE_GUYSPRITE_TARGET_ID,
    NETHER_OFFICE_GUYSPRITE_TARGET_DEFINITION_ID,
    x,
    y,
  );
}

export function didHandleNetherOfficeGuyspriteAction(
  engine: CartridgeSdkV1Runtime,
  localization: RoccoLocalization,
  activation: RoccoActionMenuActivation,
): boolean {
  if (
    activation.definitionId !== NETHER_OFFICE_GUYSPRITE_ACTION_MENU_ID ||
    activation.targetInstanceId !== NETHER_OFFICE_GUYSPRITE_TARGET_ID
  ) {
    return false;
  }

  engine.video.actionMenus.closeMenu();
  if (activation.actionId === 'talk') {
    engine.video.messages.say(
      GUYSPRITE_CONFIG.ids.instance,
      localization.text.nether.officeArrival.dialogue.guyspriteTalkLine,
      {
        ttlMs: NETHER_OFFICE_GUYSPRITE_MESSAGE_TTL_MS,
        style: NETHER_OFFICE_GUYSPRITE_MESSAGE_STYLE,
      },
    );
    return true;
  }

  if (activation.actionId === 'look') {
    roccoCartridgeMessageRuntime.think(
      engine,
      ROCCO_PLAYER_CONFIG.ids.instance,
      localization.text.nether.officeArrival.dialogue.guyspriteLookLines,
      { ttlMs: NETHER_OFFICE_GUYSPRITE_MESSAGE_TTL_MS },
      {
        count: 1,
        historyKey: NETHER_OFFICE_GUYSPRITE_LOOK_HISTORY_KEY,
        isAvoidImmediateRepeat: true,
      },
    );
    return true;
  }

  return false;
}
