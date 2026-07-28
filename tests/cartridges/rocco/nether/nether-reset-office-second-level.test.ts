import { describe, expect, it, vi } from 'vitest';

import type { CartridgeSdkV1Runtime } from '../../../../src/console/cartridges/sdk-v1';
import type { RoccoSceneTargetDefinition } from '../../../../src/console/video/scene-targets';
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
  () => ({
    installNetherResetOfficeGuysprite: vi.fn(),
    setNetherResetOfficeRoccoSequenceControl: vi.fn((_engine, isEnabled: boolean) => {
      if (!isEnabled) {
        mocks.events.push('lock-player-input');
      }
    }),
    startNetherResetOfficeGuyspriteArrival: vi.fn(),
    updateGuyspriteFacingTowardsRocco: vi.fn(),
  }),
);

vi.mock(
  '../../../../src/cartridges/rocco/games/rocco-default/maps/nether/nether-arrival-effects',
  () => ({
    createNetherArrivalPortalSpriteDefinition: vi.fn(() =>
      Promise.resolve({
        definition: { id: 'rocco-nether-arrival-portal' },
        initialFrameWidth: 64,
        initialFrameHeight: 64,
      }),
    ),
    NETHER_ARRIVAL_PORTAL_DEFINITION_ID: 'rocco-nether-arrival-portal',
    NETHER_ARRIVAL_PORTAL_OPEN_ANIMATION_ID: 'nether-arrival-portal-open',
    NETHER_ARRIVAL_SPELL_SOUND_ID: 'rocco-nether-arrival-spell-sound',
    NETHER_ARRIVAL_SPELL_SOUND_URL: 'mock-spell-sound.mp3',
  }),
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

function createEngine() {
  const sprites = {
    createSpriteFromDefinition: vi.fn(),
    loadSpriteDefinition: vi.fn(),
    moveTo: vi.fn(),
    goTo: vi.fn(() => true),
    isMoving: vi.fn(() => false),
    getSprite: vi.fn(() => ({ animation: { frameIndex: 0 } })),
    playAction: vi.fn(),
    setAnimationFrame: vi.fn(),
    stopAnimation: vi.fn(),
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
  const actionMenus = {
    closeMenu: vi.fn(),
    registerMenu: vi.fn(),
    unregisterMenu: vi.fn(),
  };
  const sceneTargets = {
    registerTarget: vi.fn<(definition: RoccoSceneTargetDefinition) => void>(),
    unregisterTarget: vi.fn(),
    setEnabled: vi.fn(),
  };
  const planes = {
    resolvePlane: vi.fn(() => ({})),
    updatePlane: vi.fn(),
  };
  const audio = {
    registerSound: vi.fn(),
    stopSound: vi.fn(),
    unregisterSound: vi.fn(),
    playSound: vi.fn(),
  };

  const engine = {
    audio,
    storage: {
      loadPlaneSceneRecord: vi.fn(() => Promise.resolve(null)),
      savePlaneScene: vi.fn(() => Promise.resolve()),
    },
    video: {
      actionMenus,
      messages: {
        clearMessages: vi.fn(),
        listMessages: vi.fn(() => []),
        removeMessage: vi.fn(),
        say: vi.fn(),
      },
      preloadPlaneScene: vi.fn(() => Promise.resolve()),
      preloadSpriteDefinition: vi.fn(() => Promise.resolve()),
      sprites,
      sceneTargets,
      planes,
      primitives: { addPrimitive: vi.fn(), removePrimitive: vi.fn() },
      titles: { addTitle: vi.fn(), removeTitle: vi.fn() },
    },
    acquireInputLease: vi.fn(() => ({ dispose: vi.fn() })),
    loadPlaneScene: vi.fn(),
  } as unknown as CartridgeSdkV1Runtime;

  return { engine, actionMenus, sceneTargets, planes, sprites };
}

describe('Rocco Nether reset office second level', () => {
  it('installs Rocco before locking input for the Guysprite arrival sequence', async () => {
    mocks.events.length = 0;
    const level = new RoccoNetherResetOfficeSecondLevel(createRoccoLocalization('es'));
    const runtime = createEngine();

    await level.mount(runtime.engine, { forceArrivalSequence: true });

    expect(mocks.events).toEqual(['install-player', 'lock-player-input']);
    expect(runtime.actionMenus.registerMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({ id: 'read', label: 'Leer' }),
          expect.objectContaining({ id: 'kick', label: 'Patear' }),
          expect.objectContaining({ id: 'grab', label: 'Coger' }),
        ],
      }),
    );
    expect(runtime.sceneTargets.registerTarget).toHaveBeenCalledWith(
      expect.objectContaining({
        shape: { kind: 'rect', x: 24, y: 207, width: 236, height: 295 },
      }),
    );
  });

  it('shows the printer reading overlay with fifteen placeholders and closes outside them', async () => {
    const level = new RoccoNetherResetOfficeSecondLevel(createRoccoLocalization('es'));
    const runtime = createEngine();

    await level.mount(runtime.engine, { forceArrivalSequence: true });
    const printerTarget = runtime.sceneTargets.registerTarget.mock.calls[0]?.[0];
    const printerTargetId = printerTarget?.instanceId;

    level.handleAction({
      definitionId: 'rocco-nether-reset-office-second-printer-action-menu',
      targetInstanceId: printerTargetId,
      targetDefinitionId: 'rocco-nether-printer',
      itemId: 'read',
      actionId: 'read',
    });
    level.update(0);
    level.update(250);

    expect(runtime.sprites.goTo).toHaveBeenCalledWith(
      expect.any(String),
      260,
      492,
      expect.any(Object),
    );
    expect(runtime.sprites.playAction).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ direction: 'up-left' }),
    );
    expect(runtime.planes.updatePlane).toHaveBeenCalledWith(
      'rocco-nether-reset-office-second-scene',
      'rocco-nether-reset-office-second-printer-reading',
      { visible: true },
    );
    expect(runtime.sceneTargets.registerTarget).toHaveBeenCalledTimes(16);
    expect(runtime.sceneTargets.registerTarget.mock.calls.at(-1)?.[0]).toMatchObject({
      instanceId: 'rocco-nether-reset-office-second-printer-reading-target-15',
      shape: { x: 234, y: 490, width: 492, height: 34 },
      visibleDescription: { text: 'Leer mensaje 15' },
    });

    expect(level.handleSceneClick({ kind: 'scene-click', sceneX: 10, sceneY: 10 })).toEqual({
      consumed: true,
      defaultPlayerMovement: 'suppress',
    });
    expect(runtime.planes.updatePlane).toHaveBeenLastCalledWith(
      'rocco-nether-reset-office-second-scene',
      'rocco-nether-reset-office-second-printer-reading',
      { visible: false },
    );
  });
});
