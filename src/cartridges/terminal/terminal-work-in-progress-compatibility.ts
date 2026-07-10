import type { RoccoGraphicPlane, RoccoPlaneScene } from '../../console/video/planes';
import { DEFAULT_STARS_HEIGHT, DEFAULT_STARS_PLANE_ID, DEFAULT_STARS_WIDTH } from './terminal-work-in-progress-constants';

export function normalizeDefaultScene(scene: RoccoPlaneScene): { scene: RoccoPlaneScene; changed: boolean } {
  const starsPlane = scene.planes.find((plane) => plane.id === DEFAULT_STARS_PLANE_ID);
  if (!starsPlane) {
    return { scene, changed: false };
  }

  const patch = createStarsCompatibilityPatch(starsPlane);
  if (!patch) {
    return { scene, changed: false };
  }

  const nextScene: RoccoPlaneScene = {
    ...scene,
    planes: scene.planes.map((plane) => {
      if (plane.id !== DEFAULT_STARS_PLANE_ID) {
        return plane;
      }

      return {
        ...plane,
        ...patch,
        source: patch.source ?? plane.source,
        wrap: patch.wrap ?? plane.wrap,
      };
    }),
  };

  return { scene: nextScene, changed: true };
}

export function createStarsCompatibilityPatch(plane: RoccoGraphicPlane): Partial<RoccoGraphicPlane> | null {
  let changed = false;
  const patch: Partial<RoccoGraphicPlane> = {};

  if (!plane.wrap.x || !plane.wrap.y) {
    patch.wrap = { x: true, y: true };
    changed = true;
  }

  if (plane.source.kind === 'procedural') {
    const nextParams = { ...(plane.source.params ?? {}) };
    const width = Number(nextParams.width ?? NaN);
    const height = Number(nextParams.height ?? NaN);

    if (!Number.isFinite(width) || width <= 0) {
      nextParams.width = DEFAULT_STARS_WIDTH;
      changed = true;
    }
    if (!Number.isFinite(height) || height <= 0) {
      nextParams.height = DEFAULT_STARS_HEIGHT;
      changed = true;
    }

    if (changed) {
      patch.source = {
        ...plane.source,
        params: nextParams,
      };
    }
  }

  return changed ? patch : null;
}
