import { Assets } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

vi.mock('pixi.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pixi.js')>();
  return {
    ...actual,
    Assets: {
      ...actual.Assets,
      load: vi.fn(() => Promise.resolve(actual.Texture.WHITE)),
    },
  };
});

import type { RoccoPlaneScene } from '../../../src/engine/video/planes';
import type { RoccoSpriteDefinition } from '../../../src/engine/video/sprites';
import { RoccoRuntimeVideoSystem } from '../../../src/engine/video/runtime-system';

interface VideoSystemInternals {
  setActivePlayerSprite(instanceId: string | null): void;
  resolveRuntimePlaneScene(scene: RoccoPlaneScene): RoccoPlaneScene;
  resolveSceneTargets(
    sceneX: number,
    sceneY: number,
  ): ReturnType<RoccoRuntimeVideoSystem['resolveSceneTargets']>;
}

function createTestSpriteDefinition(): RoccoSpriteDefinition {
  return {
    id: 'hero',
    images: [
      {
        id: 'hero-sheet',
        dataRef: 'placeholder:hero',
        width: 32,
        height: 32,
      },
    ],
    frames: [
      {
        id: 'idle-frame',
        imageId: 'hero-sheet',
        rect: { x: 0, y: 0, width: 32, height: 32 },
        durationMs: 50,
      },
    ],
    animations: {
      idle: {
        id: 'idle',
        loop: true,
        playbackRate: 1,
        frames: [{ frameId: 'idle-frame', durationMs: 50 }],
      },
    },
    defaultAnimation: 'idle',
    groundAnchor: { x: 0, y: 32 },
    render: {
      renderLayer: 'world.actors',
      zIndex: 0,
      depthMode: 'fixed',
      opacity: 1,
    },
  };
}

function createThresholdScene(): RoccoPlaneScene {
  return {
    id: 'threshold-scene',
    clearColor: '#000000',
    planes: [
      {
        id: 'counter',
        enabled: true,
        visible: true,
        source: {
          kind: 'solid',
          color: '#ffffff',
        },
        colorModel: { kind: 'native' },
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
        scroll: { x: 0, y: 0 },
        wrap: { x: false, y: false },
        opacity: 1,
        priority: 0,
        renderLayer: 'world.front',
        depthMode: {
          kind: 'sprite-y-threshold',
          subject: 'active-player',
          samplePoint: 'ground-y',
          thresholdY: 338,
          frontLayer: 'world.front',
          backLayer: 'background.main',
          frontWhen: 'less-than-or-equal',
        },
      },
    ],
  };
}

function createSystemWithActivePlayer(y: number): {
  system: RoccoRuntimeVideoSystem;
  internals: VideoSystemInternals;
} {
  const system = new RoccoRuntimeVideoSystem();
  system.sprites.loadSpriteDefinition(createTestSpriteDefinition());
  system.sprites.createSpriteFromDefinition('hero', {
    id: 'player',
    transform: { x: 0, y, scaleX: 1, scaleY: 1, rotation: 0 },
  });
  const internals = system as unknown as VideoSystemInternals;
  internals.setActivePlayerSprite('player');
  return { system, internals };
}

describe('RoccoRuntimeVideoSystem', () => {
  it('preloads raw asset URLs through the video system without reloading duplicates', async () => {
    const system = new RoccoRuntimeVideoSystem();

    await system.preloadAssetUrls(['grab.png', 'kick.png', 'grab.png']);

    expect(Assets.load).toHaveBeenCalledTimes(2);
    expect(Assets.load).toHaveBeenNthCalledWith(1, 'grab.png');
    expect(Assets.load).toHaveBeenNthCalledWith(2, 'kick.png');
  });

  it('keeps threshold planes in front when the active player is behind the threshold', () => {
    const { internals } = createSystemWithActivePlayer(300);

    const resolved = internals.resolveRuntimePlaneScene(createThresholdScene());

    expect(resolved.planes[0]?.renderLayer).toBe('world.front');
  });

  it('moves threshold planes behind when the active player is in front of the threshold', () => {
    const { internals } = createSystemWithActivePlayer(320);

    const resolved = internals.resolveRuntimePlaneScene(createThresholdScene());

    expect(resolved.planes[0]?.renderLayer).toBe('background.main');
  });

  it('falls back to the back layer when the active player sprite is unavailable', () => {
    const system = new RoccoRuntimeVideoSystem();
    const internals = system as unknown as VideoSystemInternals;
    internals.setActivePlayerSprite('missing-player');

    const resolved = internals.resolveRuntimePlaneScene(createThresholdScene());

    expect(resolved.planes[0]?.renderLayer).toBe('background.main');
  });

  it('lets a scene target follow a dynamic plane render layer so front sprites do not steal its hit area', () => {
    const { system, internals } = createSystemWithActivePlayer(170);
    system.loadPlaneScene(createThresholdScene());
    system.sceneTargets?.registerTarget({
      instanceId: 'counter-register-target',
      definitionId: 'cash-register',
      renderPlaneId: 'counter',
      shape: {
        kind: 'rect',
        x: 351,
        y: 164,
        width: 88,
        height: 86,
      },
      priority: 23,
      visibleDescription: {
        enabled: true,
        text: 'Cash register',
      },
    });

    const resolved = internals.resolveSceneTargets(370, 180);

    expect(resolved.visibleTarget).toMatchObject({
      instanceId: 'counter-register-target',
      definitionId: 'cash-register',
      text: 'Cash register',
    });
  });
});
