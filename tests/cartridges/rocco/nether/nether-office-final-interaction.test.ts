import { describe, expect, it, vi } from 'vitest';

import type { CartridgeSdkV1Runtime } from '../../../../src/console/cartridges/sdk-v1';
import type { RoccoGridMenuDefinition } from '../../../../src/console/video/grid-menu';
import { createRoccoLocalization } from '../../../../src/cartridges/rocco/localization';
import { NetherOfficeChoicePortalController } from '../../../../src/cartridges/rocco/games/rocco-default/maps/nether/nether-office-choice-portals';
import { NetherOfficeFinalInteractionController } from '../../../../src/cartridges/rocco/games/rocco-default/maps/nether/nether-office-final-interaction';
import {
  NETHER_OFFICE_CARTRIDGE_MENU_ID,
  NETHER_OFFICE_CARTRIDGE_READY_BUTTON_ID,
} from '../../../../src/cartridges/rocco/games/rocco-default/maps/nether/nether-office-cartridge-menu';
import type { NetherOfficeGuyspriteTargetShape } from '../../../../src/cartridges/rocco/games/rocco-default/maps/nether/nether-office-guysprite-interaction';

const GUYSPRITE_TARGET_SHAPE: NetherOfficeGuyspriteTargetShape = {
  kind: 'rect',
  x: 300,
  y: 130,
  width: 145,
  height: 310,
};

describe('Nether Office final portal interaction', () => {
  it('recognizes the first portal at its authored position before asset preparation completes', () => {
    const portals = new NetherOfficeChoicePortalController(createRoccoLocalization('es'));

    expect(portals.getChoiceAt(228, 475)).toBe('game');
    expect(portals.getChoiceAt(705, 475)).toBe('console');
  });

  it('opens the final screen when the first portal is clicked', () => {
    const localization = createRoccoLocalization('es');
    const portals = new NetherOfficeChoicePortalController(localization);
    const showFinalScreen = vi.fn();
    const onFinalScreenClick = vi.fn();
    const controller = new NetherOfficeFinalInteractionController(
      localization,
      portals,
      GUYSPRITE_TARGET_SHAPE,
      showFinalScreen,
      onFinalScreenClick,
    );

    controller.activate({} as CartridgeSdkV1Runtime);

    expect(controller.handleSceneClick({ kind: 'scene-click', sceneX: 228, sceneY: 475 })).toEqual({
      consumed: true,
      defaultPlayerMovement: 'suppress',
    });
    expect(showFinalScreen).toHaveBeenCalledOnce();
    expect(onFinalScreenClick).not.toHaveBeenCalled();

    controller.handleSceneClick({ kind: 'scene-click', sceneX: 480, sceneY: 270 });
    expect(onFinalScreenClick).toHaveBeenCalledOnce();
  });

  it('retries the CPU cartridge prompt after selecting that it is ready', () => {
    const localization = createRoccoLocalization('es');
    const portals = new NetherOfficeChoicePortalController(localization);
    const openMenu = vi.fn();
    const engine = {
      video: {
        actionMenus: { closeMenu: vi.fn() },
        gridMenus: { closeMenu: vi.fn(), openMenu },
        messages: { clearMessages: vi.fn() },
        titles: { removeTitle: vi.fn() },
        primitives: { addPrimitive: vi.fn() },
      },
    } as unknown as CartridgeSdkV1Runtime;
    const controller = new NetherOfficeFinalInteractionController(
      localization,
      portals,
      GUYSPRITE_TARGET_SHAPE,
      vi.fn(),
      vi.fn(),
    );

    controller.activate(engine);
    controller.handleSceneClick({ kind: 'scene-click', sceneX: 705, sceneY: 475 });
    const firstMenu = openMenu.mock.calls[0][0] as RoccoGridMenuDefinition;
    expect(firstMenu.title).toBe('Insertar el cartucho Rocco 2 (aventuras en la consola)');
    const buttons = firstMenu.buttons ?? [];
    expect(buttons.map((button) => button.label)).toEqual(['No lo tengo', 'Ya lo he hecho']);
    expect(firstMenu.backdropAlpha).toBe(1);

    controller.handleGridMenu({
      kind: 'grid-menu',
      definitionId: NETHER_OFFICE_CARTRIDGE_MENU_ID,
      interaction: 'button',
      buttonId: NETHER_OFFICE_CARTRIDGE_READY_BUTTON_ID,
      items: [],
    });
    controller.update(1000);

    expect(openMenu).toHaveBeenCalledTimes(2);
  });
});
