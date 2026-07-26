import { describe, expect, it } from 'vitest';

import type { CartridgeSdkV1Runtime } from '../../../../src/console/cartridges/sdk-v1';
import { RoccoActionMenuSystemSDK } from '../../../../src/console/video/action-menu/system';
import { createRoccoLocalization } from '../../../../src/cartridges/rocco/localization';
import { RoccoNetherResetOfficeLevel } from '../../../../src/cartridges/rocco/games/rocco-default/maps/nether/nether-reset-office-level';
import {
  registerNetherOfficeGuyspriteInteraction,
  NETHER_OFFICE_GUYSPRITE_ACTION_MENU_ID,
} from '../../../../src/cartridges/rocco/games/rocco-default/maps/nether/nether-office-guysprite-interaction';

describe('Rocco Nether reset office Guysprite interaction', () => {
  it('opens Ver and Hablar when Rocco clicks Guysprite during the waiting phase', () => {
    const localization = createRoccoLocalization('es');
    const actionMenus = new RoccoActionMenuSystemSDK();
    const engine = {
      video: { actionMenus },
    } as unknown as CartridgeSdkV1Runtime;
    const level = new RoccoNetherResetOfficeLevel(localization);

    registerNetherOfficeGuyspriteInteraction(engine, localization, true);
    const state = level as unknown as {
      engine: CartridgeSdkV1Runtime;
      departureSequence: {
        phase: 'waiting-for-exit';
        elapsedMs: number;
        reminderIndex: number;
      };
    };
    state.engine = engine;
    state.departureSequence = {
      phase: 'waiting-for-exit',
      elapsedMs: 0,
      reminderIndex: 0,
    };

    expect(level.handleSceneClick({ kind: 'scene-click', sceneX: 371, sceneY: 300 })).toEqual({
      consumed: true,
      defaultPlayerMovement: 'suppress',
    });
    expect(actionMenus.isOpen()).toBe(true);
    expect(actionMenus.getRenderableMenu()).toMatchObject({
      definition: {
        id: NETHER_OFFICE_GUYSPRITE_ACTION_MENU_ID,
        items: [
          { id: 'look', label: 'Ver' },
          { id: 'talk', label: 'Hablar' },
        ],
      },
    });
  });
});
