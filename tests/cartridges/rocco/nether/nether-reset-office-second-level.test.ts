import { describe, expect, it, vi } from 'vitest';

import type { CartridgeSdkV1Runtime } from '../../../../src/console/cartridges/sdk-v1';
import { createRoccoLocalization } from '../../../../src/cartridges/rocco/localization';
import { RoccoNetherResetOfficeSecondLevel } from '../../../../src/cartridges/rocco/games/rocco-default/maps/nether/nether-reset-office-second-level';

const mocks = vi.hoisted(() => {
  const events: string[] = [];
  return {
    events,
    loadScene: vi.fn(() =>
      Promise.resolve({
        id: 'rocco-nether-reset-office-second-scene',
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
    installPlayer: vi.fn(() => {
      events.push('install-player');
      return Promise.resolve({
        update: vi.fn(),
        isIntroActive: () => false,
        isIntroSpeaking: () => false,
        cancelIntro: vi.fn(),
        advanceIntro: vi.fn(),
      });
    }),
  };
});

vi.mock(
  '../../../../src/cartridges/rocco/games/rocco-default/maps/nether/nether-level-support',
  () => ({
    createNetherWalkMapProfile: mocks.createWalkMap,
    loadOrCreateNetherScene: mocks.loadScene,
    toOriginFromGroundPoint: (point: { x: number; y: number }) => ({ ...point }),
  }),
);

vi.mock('../../../../src/cartridges/rocco/games/rocco-default/player', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../src/cartridges/rocco/games/rocco-default/player')
  >('../../../../src/cartridges/rocco/games/rocco-default/player');
  return { ...actual, installRoccoPlayerSprite: mocks.installPlayer };
});

vi.mock('../../../../src/cartridges/rocco/levels/rocco-level-connector-targets', () => ({
  installRoccoLevelConnectorTargets: vi.fn(),
  uninstallRoccoLevelConnectorTargets: vi.fn(),
}));

vi.mock(
  '../../../../src/cartridges/rocco/games/rocco-default/maps/nether/nether-office-arrival-support',
  () => ({ updateGuyspriteFacingTowardsRocco: vi.fn() }),
);

vi.mock(
  '../../../../src/cartridges/rocco/games/rocco-default/maps/nether/nether-office-guysprite-interaction',
  () => ({
    canOpenNetherOfficeGuyspriteMenuAt: vi.fn(() => false),
    didHandleNetherOfficeGuyspriteAction: vi.fn(),
    registerNetherOfficeGuyspriteInteraction: vi.fn(),
    unregisterNetherOfficeGuyspriteInteraction: vi.fn(),
  }),
);

function createEngine(): CartridgeSdkV1Runtime {
  const sprites = {
    createSpriteFromDefinition: vi.fn(),
    loadSpriteDefinition: vi.fn(),
    moveTo: vi.fn(),
    registerWalkMap: vi.fn(),
    removeSprite: vi.fn(),
    setCollisionEnabled: vi.fn(),
    setInteractive: vi.fn(() => {
      if (!mocks.events.includes('install-player')) {
        throw new Error('Rocco must be installed before arrival input is locked.');
      }
      mocks.events.push('lock-player-input');
    }),
    stopMovement: vi.fn(),
  };

  return {
    storage: {
      loadPlaneSceneRecord: vi.fn(() => Promise.resolve(null)),
      savePlaneScene: vi.fn(() => Promise.resolve()),
    },
    video: {
      actionMenus: { closeMenu: vi.fn() },
      messages: { clearMessages: vi.fn() },
      preloadPlaneScene: vi.fn(() => Promise.resolve()),
      preloadSpriteDefinition: vi.fn(() => Promise.resolve()),
      sprites,
    },
    acquireInputLease: vi.fn(() => ({ dispose: vi.fn() })),
    loadPlaneScene: vi.fn(),
  } as unknown as CartridgeSdkV1Runtime;
}

describe('Rocco Nether reset office second level', () => {
  it('installs Rocco before locking input for the Guysprite arrival sequence', async () => {
    mocks.events.length = 0;
    const level = new RoccoNetherResetOfficeSecondLevel(createRoccoLocalization('es'));

    await level.mount(createEngine(), { forceArrivalSequence: true });

    expect(mocks.events).toEqual(['install-player', 'lock-player-input']);
  });
});
