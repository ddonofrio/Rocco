import type { RoccoGraphicPlane, RoccoPlaneScene } from './types';

function basePlane(id: string): Omit<RoccoGraphicPlane, 'source'> {
  return {
    id,
    enabled: true,
    colorModel: { kind: 'native' },
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    scroll: { x: 0, y: 0 },
    wrap: { x: false, y: false },
    opacity: 1,
    priority: 0,
    renderLayer: 'background.main',
    visible: true,
  };
}

export function createDefaultPlaneScene(sceneId: string): RoccoPlaneScene {
  const backPlate: RoccoGraphicPlane = {
    ...basePlane('backplate'),
    name: 'Backplate',
    source: {
      kind: 'solid',
      color: '#1b261a',
    },
    viewport: {
      x: 0,
      y: 0,
      width: 960,
      height: 540,
    },
    priority: 0,
    renderLayer: 'background.back',
  };

  const emblemPlane: RoccoGraphicPlane = {
    ...basePlane('rocco-emblem'),
    name: 'Rocco Emblem',
    source: {
      kind: 'image',
      uri: '/pwa-512x512.png',
      width: 180,
      height: 180,
    },
    transform: {
      x: 690,
      y: 310,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    },
    opacity: 0.94,
    priority: 10,
    renderLayer: 'background.main',
  };

  const starsPlane: RoccoGraphicPlane = {
    ...basePlane('stars'),
    name: 'Stars',
    source: {
      kind: 'procedural',
      generatorId: 'star-field',
      params: {
        seed: 42,
        starCount: 70,
        width: 960,
        height: 540,
      },
    },
    scroll: { x: 0, y: 0 },
    wrap: { x: true, y: true },
    parallax: { x: 0.25, y: 0.25 },
    opacity: 0.65,
    priority: 1,
    renderLayer: 'background.main',
  };

  return {
    id: sceneId,
    planes: [backPlate, starsPlane, emblemPlane],
    clearColor: '#10170f',
    palettes: [],
    colorRegisterSets: [],
    attributeMaps: [],
  };
}
