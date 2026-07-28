import { describe, expect, it, vi } from 'vitest';

import type { CartridgeSdkV1Runtime } from '../../../../src/console/cartridges/sdk-v1';
import { RoccoActionMenuSystemSDK } from '../../../../src/console/video/action-menu/system';
import { createRoccoLocalization } from '../../../../src/cartridges/rocco/localization';
import { RoccoNetherResetOfficeLevel } from '../../../../src/cartridges/rocco/games/rocco-default/maps/nether/nether-reset-office-level';
import {
  registerNetherOfficeGuyspriteInteraction,
  NETHER_OFFICE_GUYSPRITE_ACTION_MENU_ID,
} from '../../../../src/cartridges/rocco/games/rocco-default/maps/nether/nether-office-guysprite-interaction';

const mocks = vi.hoisted(() => ({
  loadScene: vi.fn(() =>
    Promise.resolve({
      id: 'rocco-nether-reset-office-scene',
      clearColor: '#000000',
      palettes: [],
      colorRegisterSets: [],
      attributeMaps: [],
      planes: [],
    }),
  ),
  createWalkMap: vi.fn(() =>
    Promise.resolve({
      walkMap: {
        id: 'rocco-active-walk-map',
        width: 1,
        height: 1,
        origin: { x: 0, y: 0 },
        columns: [],
      },
      farY: 0,
      nearY: 1,
    }),
  ),
  installPlayer: vi.fn(() =>
    Promise.resolve({
      update: vi.fn(),
      isIntroActive: () => false,
      isIntroSpeaking: () => false,
      cancelIntro: vi.fn(),
      advanceIntro: vi.fn(),
    }),
  ),
  preloadArrivalAssets: vi.fn((engine: CartridgeSdkV1Runtime) => {
    engine.audio.registerSound({
      id: 'rocco-nether-reset-office-defeat-sound',
      uri: 'mock://you-lose.mp3',
      volume: 0.25,
      loop: false,
    });
    return Promise.resolve({});
  }),
}));

vi.mock(
  '../../../../src/cartridges/rocco/games/rocco-default/maps/nether/nether-level-support',
  () => ({
    createNetherWalkMapProfile: mocks.createWalkMap,
    loadOrCreateNetherScene: mocks.loadScene,
    toOriginFromGroundPoint: (point: { x: number; y: number }) => ({ ...point }),
  }),
);

vi.mock(
  '../../../../src/cartridges/rocco/games/rocco-default/maps/nether/nether-office-arrival-assets',
  () => ({ preloadNetherOfficeArrivalAssets: mocks.preloadArrivalAssets }),
);

vi.mock(
  '../../../../src/cartridges/rocco/games/rocco-default/maps/nether/nether-office-player',
  () => ({ installNetherOfficePlayer: mocks.installPlayer }),
);

vi.mock('../../../../src/cartridges/rocco/levels/rocco-level-connector-targets', () => ({
  installRoccoLevelConnectorTargets: vi.fn(),
  uninstallRoccoLevelConnectorTargets: vi.fn(),
}));

vi.mock(
  '../../../../src/cartridges/rocco/games/rocco-default/maps/nether/nether-office-arrival-support',
  () => ({
    setNetherResetOfficeRoccoSequenceControl: vi.fn(),
    updateGuyspriteFacingTowardsRocco: vi.fn(),
  }),
);

describe('Rocco Nether reset office Guysprite interaction', () => {
  it('does not register the office defeat sound twice while mounting', async () => {
    const registeredSoundIds = new Set<string>();
    const engine = {
      audio: {
        registerSound: vi.fn((definition: { id: string }) => {
          if (registeredSoundIds.has(definition.id)) {
            throw new Error(`Duplicate sound registration '${definition.id}'.`);
          }
          registeredSoundIds.add(definition.id);
        }),
        stopSound: vi.fn(),
        unregisterSound: vi.fn(),
        playSound: vi.fn(),
      },
      video: {
        actionMenus: {
          closeMenu: vi.fn(),
          unregisterMenu: vi.fn(),
          registerMenu: vi.fn(),
        },
        messages: { clearMessages: vi.fn() },
        sprites: { registerWalkMap: vi.fn() },
      },
      loadPlaneScene: vi.fn(),
      acquireInputLease: vi.fn(() => ({ dispose: vi.fn() })),
    } as unknown as CartridgeSdkV1Runtime;

    const level = new RoccoNetherResetOfficeLevel(createRoccoLocalization('es'));

    await expect(level.mount(engine)).resolves.toBeDefined();
  });

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
