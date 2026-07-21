import type { SpecialInventorySceneClickRule } from './interaction-types';
import { isSceneClickAction } from './interaction-types';
import { ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID } from '../inventory';
import { ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID } from '../games/rocco-default/maps/nether/levels';
import { isRoccoNetherSecurityCameraCapability } from '../levels/runtime/rocco-level-capabilities';

const NETHER_SPECIAL_SCENE_CLICK_PRIORITY = 300;

/**
 * Nether 1 special rule: giving the 20 EUR bill to the security camera starts a
 * scripted bribe sequence that ends in the existing defeat flow. Encapsulates
 * the camera target ids behind the level capability so the router keeps no
 * Nether-specific identifiers.
 */
export function createNetherSpecialSceneClickRules(): readonly SpecialInventorySceneClickRule[] {
  return [
    {
      id: 'nether-security-camera-money',
      ownerId: 'nether.security-camera-money',
      priority: NETHER_SPECIAL_SCENE_CLICK_PRIORITY,
      matches: (context, carriedItem) =>
        isSceneClickAction(context.action) &&
        carriedItem.item.id === ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID &&
        context.activeLevel !== null &&
        context.activeLevel.id === ROCCO_NETHER_CONSOLE_HARDWARE_SPAWN_LEVEL_ID &&
        isRoccoNetherSecurityCameraCapability(context.activeLevel) &&
        context.activeLevel.isSecurityCameraTarget(context.action.targetInstanceId),
      execute: (context) => {
        const engine = context.sdk;
        if (
          !engine ||
          context.activeLevel === null ||
          !isRoccoNetherSecurityCameraCapability(context.activeLevel)
        ) {
          return { handled: false };
        }

        if (!context.inventory.hasItem(ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID)) {
          engine.video.gridMenus.clearCarriedItem();
          return { handled: true, actionResult: { suppressDefaultPlayerMove: true } };
        }

        const didBegin = context.activeLevel.beginSecurityCameraBribeSequence();
        if (!didBegin) {
          engine.video.gridMenus.clearCarriedItem();
          return { handled: true, actionResult: { suppressDefaultPlayerMove: true } };
        }

        context.inventory.removeItem(ROCCO_INVENTORY_TWENTY_EUROS_ITEM_ID);
        engine.video.gridMenus.clearCarriedItem();
        return { handled: true, actionResult: { suppressDefaultPlayerMove: true } };
      },
    },
  ];
}
