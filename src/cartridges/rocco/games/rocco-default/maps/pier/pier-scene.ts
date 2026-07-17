import type { RoccoEngine } from '../../../../../../console/engine-sdk';
import type { RoccoGraphicPlane, RoccoPlaneScene } from '../../../../../../console/video/planes';
import {
  DEFAULT_CENTERED_BACKGROUND_SCROLL_X,
  DEFAULT_CENTERED_BACKGROUND_SCROLL_Y,
  DEFAULT_DESIGN_HEIGHT,
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_ROCCO_GREEN_BLACK,
  DEFAULT_SCENE_ID,
} from '../../constants';
import { pierBackgroundAssetUrls } from './pier-assets';
import { makeDefaultWaterColorEffect } from './pier-video-effects';
import { roccoDefaultCartridgeManifest } from '../../../../rocco-default-manifest';

const DEFAULT_PLANE_IDS = new Set([
  'rocco-green-black-backplate',
  'rocco-background-back-underlay',
  'rocco-background-back',
  'rocco-background-back-mid',
  'rocco-background-front',
]);

export interface RoccoPierSceneOptions {
  sceneId: string;
  backgroundScrollX: number;
  backgroundScrollY?: number;
}

function makeFullscreenPlaneBase(): Pick<
  RoccoGraphicPlane,
  'colorModel' | 'enabled' | 'opacity' | 'scroll' | 'transform' | 'viewport' | 'visible' | 'wrap'
> {
  return {
    enabled: true,
    colorModel: { kind: 'native' },
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    scroll: { x: 0, y: 0 },
    wrap: { x: false, y: false },
    viewport: {
      x: 0,
      y: 0,
      width: DEFAULT_DESIGN_WIDTH,
      height: DEFAULT_DESIGN_HEIGHT,
    },
    opacity: 1,
    visible: true,
  };
}

function makePierBackgroundScroll(options: RoccoPierSceneOptions) {
  return {
    x: options.backgroundScrollX,
    y: options.backgroundScrollY ?? DEFAULT_CENTERED_BACKGROUND_SCROLL_Y,
  };
}

function createPierImagePlane(
  base: ReturnType<typeof makeFullscreenPlaneBase>,
  options: {
    id: string;
    name: string;
    uri: string;
    scroll: { x: number; y: number };
    priority: number;
    renderLayer: RoccoGraphicPlane['renderLayer'];
    metadata?: RoccoGraphicPlane['metadata'];
  },
): RoccoGraphicPlane {
  return {
    ...base,
    id: options.id,
    name: options.name,
    source: {
      kind: 'image',
      uri: options.uri,
    },
    scroll: options.scroll,
    priority: options.priority,
    renderLayer: options.renderLayer,
    ...(options.metadata && { metadata: options.metadata }),
  };
}

function createDefaultRoccoPlanes(options: RoccoPierSceneOptions): RoccoGraphicPlane[] {
  const base = makeFullscreenPlaneBase();
  const backgroundScroll = makePierBackgroundScroll(options);

  return [
    {
      ...base,
      id: 'rocco-green-black-backplate',
      name: 'Rocco Green Black Backplate',
      source: {
        kind: 'solid',
        color: DEFAULT_ROCCO_GREEN_BLACK,
      },
      priority: 0,
      renderLayer: 'background.back',
    },
    createPierImagePlane(base, {
      id: 'rocco-background-back-underlay',
      name: 'Rocco Background Back Underlay',
      uri: pierBackgroundAssetUrls.back,
      scroll: backgroundScroll,
      priority: -1,
      renderLayer: 'background.main',
    }),
    createPierImagePlane(base, {
      id: 'rocco-background-back',
      name: 'Rocco Background Back Layer',
      uri: pierBackgroundAssetUrls.back,
      scroll: backgroundScroll,
      priority: 0,
      renderLayer: 'background.main',
      metadata: { waterColorEffect: makeDefaultWaterColorEffect() },
    }),
    createPierImagePlane(base, {
      id: 'rocco-background-back-mid',
      name: 'Rocco Background Back Mid Layer',
      uri: pierBackgroundAssetUrls.backMid,
      scroll: backgroundScroll,
      priority: 0,
      renderLayer: 'world.mid',
    }),
    createPierImagePlane(base, {
      id: 'rocco-background-front',
      name: 'Rocco Background Front Layer',
      uri: pierBackgroundAssetUrls.front,
      scroll: backgroundScroll,
      priority: 0,
      renderLayer: 'world.front',
    }),
  ];
}

function createDefaultRoccoScene(options: RoccoPierSceneOptions): RoccoPlaneScene {
  return {
    id: options.sceneId,
    planes: createDefaultRoccoPlanes(options),
    clearColor: DEFAULT_ROCCO_GREEN_BLACK,
    palettes: [],
    colorRegisterSets: [],
    attributeMaps: [],
  };
}

function hasSameJsonShape(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeDefaultRoccoScene(
  scene: RoccoPlaneScene,
  options: RoccoPierSceneOptions,
): { scene: RoccoPlaneScene; changed: boolean } {
  let isChanged = false;
  const defaultPlanes = createDefaultRoccoPlanes(options);
  const currentPlanes = new Map(scene.planes.map((plane) => [plane.id, plane]));
  const normalizedDefaultPlanes = defaultPlanes.map((defaultPlane) => {
    const currentPlane = currentPlanes.get(defaultPlane.id);
    if (!currentPlane || !hasSameJsonShape(currentPlane, defaultPlane)) {
      isChanged = true;
      return defaultPlane;
    }

    return currentPlane;
  });
  const customPlanes = scene.planes.filter((plane) => !DEFAULT_PLANE_IDS.has(plane.id));
  const nextPlanes = [...normalizedDefaultPlanes, ...customPlanes];
  if (!hasSameJsonShape(scene.planes, nextPlanes)) {
    isChanged = true;
  }

  const nextScene: RoccoPlaneScene = {
    ...scene,
    id: options.sceneId,
    planes: nextPlanes,
    clearColor: DEFAULT_ROCCO_GREEN_BLACK,
    palettes: scene.palettes ?? [],
    colorRegisterSets: scene.colorRegisterSets ?? [],
    attributeMaps: scene.attributeMaps ?? [],
  };

  const isSceneChanged = !hasSameJsonShape(scene, nextScene);
  if (!isChanged && !isSceneChanged) {
    return { scene, changed: false };
  }

  return { scene: nextScene, changed: true };
}

export async function loadOrCreatePierScene(
  engine: RoccoEngine,
  options: RoccoPierSceneOptions,
): Promise<RoccoPlaneScene> {
  const restoredRecord = await engine.persistence.loadPlaneSceneRecord(
    roccoDefaultCartridgeManifest.id,
    options.sceneId,
  );
  if (!restoredRecord) {
    const created = createDefaultRoccoScene(options);
    await engine.persistence.savePlaneScene(roccoDefaultCartridgeManifest.id, created);
    engine.log('System', `Pier scene '${options.sceneId}' initialized.`);
    return created;
  }

  engine.log('System', `Pier scene '${options.sceneId}' restored from IndexedDB.`);
  const normalized = normalizeDefaultRoccoScene(restoredRecord.scene, options);
  if (normalized.changed) {
    await engine.persistence.savePlaneScene(roccoDefaultCartridgeManifest.id, normalized.scene);
    engine.log('System', `Pier scene '${options.sceneId}' refreshed.`);
  }

  return normalized.scene;
}

export async function loadOrCreateDefaultScene(engine: RoccoEngine): Promise<RoccoPlaneScene> {
  return loadOrCreatePierScene(engine, {
    sceneId: DEFAULT_SCENE_ID,
    backgroundScrollX: DEFAULT_CENTERED_BACKGROUND_SCROLL_X,
  });
}
