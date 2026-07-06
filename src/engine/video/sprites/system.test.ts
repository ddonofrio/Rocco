import { describe, expect, it } from 'vitest';

import type { RoccoSpriteDefinition, RoccoSpriteWalkMap } from './types';
import { RoccoSpriteSystemSDK } from './system';

function createTestDefinition(): RoccoSpriteDefinition {
  return {
    id: 'hero',
    images: [
      {
        id: 'hero-sheet',
        dataRef: 'placeholder:hero',
        width: 64,
        height: 32,
      },
    ],
    frames: [
      {
        id: 'idle-a',
        imageId: 'hero-sheet',
        rect: { x: 0, y: 0, width: 32, height: 32 },
        durationMs: 50,
        hitbox: { kind: 'rect', x: 4, y: 4, width: 24, height: 24 },
      },
      {
        id: 'idle-b',
        imageId: 'hero-sheet',
        rect: { x: 32, y: 0, width: 32, height: 32 },
        durationMs: 50,
        hitbox: { kind: 'rect', x: 4, y: 4, width: 24, height: 24 },
      },
    ],
    animations: {
      idle: {
        id: 'idle',
        loop: true,
        playbackRate: 1,
        frames: [
          { frameId: 'idle-a', durationMs: 50 },
          { frameId: 'idle-b', durationMs: 50 },
        ],
      },
      walk: {
        id: 'walk',
        loop: true,
        playbackRate: 1,
        motionBinding: {
          mode: 'distance',
          pixelsPerFrame: 8,
        },
        frames: [
          { frameId: 'idle-a', durationMs: 50 },
          { frameId: 'idle-b', durationMs: 50 },
        ],
      },
    },
    defaultAnimation: 'idle',
    render: {
      renderLayer: 'world.actors',
      zIndex: 7,
      depthMode: 'fixed',
      opacity: 1,
    },
    hitbox: { kind: 'rect', x: 4, y: 4, width: 24, height: 24 },
  };
}

function createFlatWalkMap(): RoccoSpriteWalkMap {
  return {
    id: 'test-walk-map',
    width: 101,
    height: 40,
    origin: { x: 0, y: 0 },
    alphaThreshold: 1,
    columns: Array.from({ length: 101 }, (_, x) => ({
      x,
      spans: [{ yMin: 20, yMax: 30 }],
    })),
  };
}

function createSlopedWalkMap(): RoccoSpriteWalkMap {
  return {
    id: 'sloped-walk-map',
    width: 101,
    height: 80,
    origin: { x: 0, y: 0 },
    alphaThreshold: 1,
    columns: Array.from({ length: 101 }, (_, x) => {
      const y = 20 + Math.round(x / 10);
      return {
        x,
        spans: [{ yMin: y, yMax: y }],
      };
    }),
  };
}

function createCurvedCorridorWalkMap(): RoccoSpriteWalkMap {
  return {
    id: 'curved-corridor-walk-map',
    width: 101,
    height: 140,
    origin: { x: 0, y: 0 },
    alphaThreshold: 1,
    columns: Array.from({ length: 101 }, (_, x) => {
      const yMin = 20 + Math.floor(x / 2);
      return {
        x,
        spans: [{ yMin, yMax: yMin + 40 }],
      };
    }),
  };
}

function createDirectionalTestDefinition(): RoccoSpriteDefinition {
  return {
    ...createTestDefinition(),
    id: 'directional-hero',
    defaultAnimation: 'idle-right',
    defaultFacing: 'right',
    defaultIdleAction: 'idle',
    defaultMoveAction: 'walk',
    animations: {
      'idle-right': {
        id: 'idle-right',
        loop: true,
        playbackRate: 1,
        frames: [{ frameId: 'idle-a', durationMs: 50 }],
      },
      'idle-down-right': {
        id: 'idle-down-right',
        loop: true,
        playbackRate: 1,
        frames: [{ frameId: 'idle-b', durationMs: 50 }],
      },
      'walk-right': {
        id: 'walk-right',
        loop: true,
        playbackRate: 1,
        motionBinding: {
          mode: 'distance',
          pixelsPerFrame: 8,
        },
        frames: [
          { frameId: 'idle-a', durationMs: 50 },
          { frameId: 'idle-b', durationMs: 50 },
        ],
      },
      'walk-down-right': {
        id: 'walk-down-right',
        loop: true,
        playbackRate: 1,
        motionBinding: {
          mode: 'distance',
          pixelsPerFrame: 8,
        },
        frames: [
          { frameId: 'idle-a', durationMs: 50 },
          { frameId: 'idle-b', durationMs: 50 },
        ],
      },
    },
    actions: {
      idle: {
        id: 'idle',
        directionalAnimations: {
          default: 'idle-right',
          right: 'idle-right',
          'down-right': 'idle-down-right',
        },
      },
      walk: {
        id: 'walk',
        speed: 80,
        playbackRate: 1,
        directionalAnimations: {
          default: 'walk-right',
          right: 'walk-right',
          'down-right': 'walk-down-right',
        },
        motionBinding: {
          mode: 'distance',
          pixelsPerFrame: 8,
        },
      },
    },
  };
}

describe('RoccoSpriteSystemSDK', () => {
  it('registers and lists sprite definitions', () => {
    const system = new RoccoSpriteSystemSDK();
    const definition = createTestDefinition();

    system.registerSpriteDefinition(definition);

    expect(system.getSpriteDefinition('hero')?.id).toBe('hero');
    expect(system.listSpriteDefinitions()).toHaveLength(1);
  });

  it('creates an instance from definition with defaults', () => {
    const system = new RoccoSpriteSystemSDK();
    system.loadSpriteDefinition(createTestDefinition());

    const sprite = system.createSpriteFromDefinition('hero');

    expect(sprite.definitionId).toBe('hero');
    expect(sprite.animation.animationId).toBe('idle');
    expect(system.listSprites()).toHaveLength(1);
  });

  it('supports setPosition and translate', () => {
    const system = new RoccoSpriteSystemSDK();
    system.loadSpriteDefinition(createTestDefinition());
    const sprite = system.createSpriteFromDefinition('hero');

    system.setPosition(sprite.id, 10, 20);
    system.translate(sprite.id, 5, -4);

    const updated = system.getSprite(sprite.id);
    expect(updated?.transform.x).toBe(15);
    expect(updated?.transform.y).toBe(16);
  });

  it('supports setScale', () => {
    const system = new RoccoSpriteSystemSDK();
    system.loadSpriteDefinition(createTestDefinition());
    const sprite = system.createSpriteFromDefinition('hero');

    system.setScale(sprite.id, 1.5, 0.75);

    const updated = system.getSprite(sprite.id);
    expect(updated?.transform.scaleX).toBe(1.5);
    expect(updated?.transform.scaleY).toBe(0.75);
  });

  it('supports setVelocity and stopMovement', () => {
    const system = new RoccoSpriteSystemSDK();
    system.loadSpriteDefinition(createTestDefinition());
    const sprite = system.createSpriteFromDefinition('hero');

    system.setVelocity(sprite.id, 30, 0);
    system.update(1000);
    expect(system.getSprite(sprite.id)?.transform.x).toBeCloseTo(30, 4);

    system.stopMovement(sprite.id);
    const updated = system.getSprite(sprite.id);
    expect(updated?.motion.velocityX).toBe(0);
    expect(updated?.motion.velocityY).toBe(0);
    expect(updated?.motion.command).toBeUndefined();
  });

  it('advances toward a moveTo target and can cancel movement', () => {
    const system = new RoccoSpriteSystemSDK();
    system.loadSpriteDefinition(createTestDefinition());
    const sprite = system.createSpriteFromDefinition('hero');

    system.moveTo(sprite.id, 100, 0, { speed: 100, stopDistance: 1 });
    system.update(200);
    expect(system.getSprite(sprite.id)?.transform.x).toBeGreaterThan(0);

    system.cancelMovement(sprite.id);
    expect(system.isMoving(sprite.id)).toBe(false);
  });

  it('advances animation by time and loops clips', () => {
    const system = new RoccoSpriteSystemSDK();
    system.loadSpriteDefinition(createTestDefinition());
    const sprite = system.createSpriteFromDefinition('hero');

    system.update(60);
    expect(system.getSprite(sprite.id)?.animation.frameIndex).toBe(1);

    system.update(60);
    expect(system.getSprite(sprite.id)?.animation.frameIndex).toBe(0);
  });

  it('keeps non-loop animation frame indexes safe after large updates', () => {
    const system = new RoccoSpriteSystemSDK();
    const definition = createTestDefinition();
    definition.animations.once = {
      id: 'once',
      loop: false,
      playbackRate: 1,
      frames: [
        { frameId: 'idle-a', durationMs: 50 },
        { frameId: 'idle-b', durationMs: 50 },
      ],
    };
    system.loadSpriteDefinition(definition);
    const sprite = system.createSpriteFromDefinition('hero');

    system.playAnimation(sprite.id, 'once', { restart: true });
    expect(() => system.update(1000)).not.toThrow();

    const updated = system.getSprite(sprite.id);
    expect(updated?.animation.frameIndex).toBe(1);
    expect(updated?.animation.playing).toBe(false);
  });

  it('supports distance-based animation binding', () => {
    const system = new RoccoSpriteSystemSDK();
    system.loadSpriteDefinition(createTestDefinition());
    const sprite = system.createSpriteFromDefinition('hero');

    system.playAnimation(sprite.id, 'walk', { restart: true });
    system.setVelocity(sprite.id, 16, 0);
    system.update(500);

    expect(system.getSprite(sprite.id)?.animation.frameIndex).toBe(1);
  });

  it('hitTest detects a basic hitbox', () => {
    const system = new RoccoSpriteSystemSDK();
    system.loadSpriteDefinition(createTestDefinition());
    const sprite = system.createSpriteFromDefinition('hero');

    system.setPosition(sprite.id, 100, 100);
    system.setInteractive(sprite.id, true);

    const hits = system.hitTest(110, 110);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.instanceId).toBe(sprite.id);
  });

  it('hitTestVisiblePixel only detects visible alpha pixels with descriptions', async () => {
    const system = new RoccoSpriteSystemSDK();
    const definition: RoccoSpriteDefinition = {
      ...createTestDefinition(),
      id: 'visible-hero',
      images: [
        {
          id: 'visible-sheet',
          width: 4,
          height: 4,
          alphaMask: {
            width: 4,
            height: 4,
            alpha: [
              0, 0, 0, 0,
              0, 255, 0, 0,
              0, 0, 0, 0,
              0, 0, 0, 0,
            ],
          },
        },
      ],
      frames: [
        {
          id: 'visible-frame',
          imageId: 'visible-sheet',
          durationMs: 50,
        },
      ],
      animations: {
        idle: {
          id: 'idle',
          loop: true,
          playbackRate: 1,
          frames: [{ frameId: 'visible-frame', durationMs: 50 }],
        },
      },
      defaultAnimation: 'idle',
      visibleDescription: {
        enabled: true,
        text: 'Visible Hero',
      },
    };
    system.loadSpriteDefinition(definition);
    await system.preloadDefinitionAssets(definition);
    const sprite = system.createSpriteFromDefinition('visible-hero', {
      transform: { x: 10, y: 10, scaleX: 1, scaleY: 1, rotation: 0 },
    });

    expect(system.hitTestVisiblePixel(10, 10)).toHaveLength(0);
    expect(system.hitTestVisiblePixel(11, 11)).toEqual([
      {
        instanceId: sprite.id,
        definitionId: 'visible-hero',
        text: 'Visible Hero',
        textKey: undefined,
      },
    ]);
  });

  it('keeps zIndex and depthMode values', () => {
    const system = new RoccoSpriteSystemSDK();
    system.loadSpriteDefinition(createTestDefinition());
    const sprite = system.createSpriteFromDefinition('hero', {
      zIndex: 33,
      depthMode: 'y-sort',
    });

    const created = system.getSprite(sprite.id);
    expect(created?.zIndex).toBe(33);
    expect(created?.depthMode).toBe('y-sort');
  });

  it('sorts baseline sprites by their scaled ground anchor or frame pivot', () => {
    const system = new RoccoSpriteSystemSDK();
    const heroDefinition: RoccoSpriteDefinition = {
      ...createTestDefinition(),
      id: 'baseline-hero',
      groundAnchor: { x: 16, y: 20 },
      render: {
        renderLayer: 'world.actors',
        zIndex: 10,
        depthMode: 'baseline-sort',
        opacity: 1,
      },
    };
    const bucketDefinition: RoccoSpriteDefinition = {
      ...createTestDefinition(),
      id: 'baseline-bucket',
      frames: [
        {
          id: 'idle-a',
          imageId: 'hero-sheet',
          rect: { x: 0, y: 0, width: 32, height: 32 },
          durationMs: 50,
          pivot: { x: 16, y: 40 },
        },
        {
          id: 'idle-b',
          imageId: 'hero-sheet',
          rect: { x: 32, y: 0, width: 32, height: 32 },
          durationMs: 50,
          pivot: { x: 16, y: 40 },
        },
      ],
      render: {
        renderLayer: 'world.actors',
        zIndex: 0,
        depthMode: 'baseline-sort',
        opacity: 1,
      },
    };

    system.loadSpriteDefinitions([heroDefinition, bucketDefinition]);
    const hero = system.createSpriteFromDefinition('baseline-hero', {
      id: 'hero',
      transform: { x: 0, y: 110, scaleX: 2, scaleY: 2, rotation: 0 },
    });
    system.createSpriteFromDefinition('baseline-bucket', {
      id: 'bucket',
      transform: { x: 0, y: 160, scaleX: 1, scaleY: 1, rotation: 0 },
    });

    expect(system.listRenderableSprites().map((renderable) => renderable.instance.id)).toEqual([
      'hero',
      'bucket',
    ]);

    system.setPosition(hero.id, 0, 130);

    expect(system.listRenderableSprites().map((renderable) => renderable.instance.id)).toEqual([
      'bucket',
      'hero',
    ]);
  });

  it('applies perspective auto-adjust scaling from the sprite ground point Y', () => {
    const system = new RoccoSpriteSystemSDK();
    const definition: RoccoSpriteDefinition = {
      ...createTestDefinition(),
      id: 'perspective-hero',
      groundAnchor: { x: 16, y: 32 },
      autoAdjust: {
        enabled: true,
        perspectiveByY: {
          farY: 100,
          nearY: 300,
          farScale: 0.8,
          nearScale: 1,
        },
      },
    };
    system.loadSpriteDefinition(definition);
    const sprite = system.createSpriteFromDefinition('perspective-hero', {
      transform: { x: 0, y: 68, scaleX: 1, scaleY: 1, rotation: 0 },
    });

    expect(system.listRenderableSprites()[0]?.visualAdjustment?.scaleX).toBeCloseTo(0.8, 5);
    expect(system.listRenderableSprites()[0]?.visualAdjustment?.scaleY).toBeCloseTo(0.8, 5);

    system.setPosition(sprite.id, 0, 168);

    expect(system.listRenderableSprites()[0]?.visualAdjustment?.scaleX).toBeCloseTo(0.9, 5);
    expect(system.listRenderableSprites()[0]?.visualAdjustment?.scaleY).toBeCloseTo(0.9, 5);

    system.setPosition(sprite.id, 0, 268);

    expect(system.listRenderableSprites()[0]?.visualAdjustment).toBeUndefined();
  });

  it('uses sprite actions to choose movement speed and directional animation', () => {
    const system = new RoccoSpriteSystemSDK();
    system.loadSpriteDefinition(createDirectionalTestDefinition());
    const sprite = system.createSpriteFromDefinition('directional-hero');

    system.moveTo(sprite.id, 80, 80, { action: 'walk' });
    system.update(500);

    const updated = system.getSprite(sprite.id);
    expect(updated?.facing).toBe('down-right');
    expect(updated?.action?.actionId).toBe('walk');
    expect(updated?.animation.animationId).toBe('walk-down-right');
    expect(updated?.transform.x).toBeCloseTo(28.284, 2);
    expect(updated?.transform.y).toBeCloseTo(28.284, 2);
  });

  it('falls back to default move and idle actions for point-to-point commands', () => {
    const system = new RoccoSpriteSystemSDK();
    system.loadSpriteDefinition(createDirectionalTestDefinition());
    const sprite = system.createSpriteFromDefinition('directional-hero');

    system.moveTo(sprite.id, 10, 0);
    system.update(1000);

    const updated = system.getSprite(sprite.id);
    expect(updated?.transform.x).toBe(10);
    expect(updated?.transform.y).toBe(0);
    expect(updated?.facing).toBe('right');
    expect(updated?.action?.actionId).toBe('idle');
    expect(updated?.animation.animationId).toBe('idle-right');
    expect(system.isMoving(sprite.id)).toBe(false);
  });

  it('constrains bound sprites to their walk map mask', () => {
    const system = new RoccoSpriteSystemSDK();
    system.loadSpriteDefinition({ ...createTestDefinition(), groundAnchor: { x: 0, y: 0 } });
    system.registerWalkMap(createFlatWalkMap());
    const sprite = system.createSpriteFromDefinition('hero', {
      transform: { x: 50, y: 25, scaleX: 1, scaleY: 1, rotation: 0 },
    });
    system.bindToWalkMap(sprite.id, {
      walkMapId: 'test-walk-map',
      groundAnchor: { x: 0, y: 0 },
    });

    system.moveTo(sprite.id, 200, 25, { speed: 1000, stopDistance: 1 });
    system.update(1000);

    const updated = system.getSprite(sprite.id);
    expect(updated?.transform.x).toBe(100);
    expect(updated?.transform.y).toBe(25);
    expect(system.isMoving(sprite.id)).toBe(false);
  });

  it('follows the walk map surface when a bound sprite moves', () => {
    const system = new RoccoSpriteSystemSDK();
    system.loadSpriteDefinition({ ...createTestDefinition(), groundAnchor: { x: 0, y: 0 } });
    system.registerWalkMap(createSlopedWalkMap());
    const sprite = system.createSpriteFromDefinition('hero', {
      transform: { x: 0, y: 20, scaleX: 1, scaleY: 1, rotation: 0 },
    });
    system.bindToWalkMap(sprite.id, {
      walkMapId: 'sloped-walk-map',
      groundAnchor: { x: 0, y: 0 },
      followSurface: true,
    });

    system.moveTo(sprite.id, 100, 20, { speed: 100, stopDistance: 1 });
    system.update(1000);

    const updated = system.getSprite(sprite.id);
    expect(updated?.transform.x).toBe(100);
    expect(updated?.transform.y).toBe(30);
  });

  it('collapses smooth walk-map curves into direct traversable movement', () => {
    const system = new RoccoSpriteSystemSDK();
    system.loadSpriteDefinition({ ...createTestDefinition(), groundAnchor: { x: 0, y: 0 } });
    system.registerWalkMap(createCurvedCorridorWalkMap());
    const sprite = system.createSpriteFromDefinition('hero', {
      transform: { x: 0, y: 30, scaleX: 1, scaleY: 1, rotation: 0 },
    });
    system.bindToWalkMap(sprite.id, {
      walkMapId: 'curved-corridor-walk-map',
      groundAnchor: { x: 0, y: 0 },
      followSurface: true,
    });

    expect(system.goTo(sprite.id, 100, 80, { speed: 100 })).toBe(true);

    const commanded = system.getSprite(sprite.id);
    expect(commanded?.motion.command?.kind).toBe('move-to');
    if (commanded?.motion.command?.kind === 'move-to') {
      expect(commanded.motion.command.target).toEqual({ x: 100, y: 80 });
    }

    for (let index = 0; index < 20; index += 1) {
      system.update(100);
    }

    const updated = system.getSprite(sprite.id);
    expect(updated?.transform.x).toBe(100);
    expect(updated?.transform.y).toBe(80);
    expect(system.isMoving(sprite.id)).toBe(false);
  });
});
