import type { RoccoEngine } from '../../../../../../console/engine-sdk';
import { loadRoccoSpriteWalkMapFromImage } from '../../../../../../console/video/sprites';
import { pierWalkMapAssetUrl } from './pier-assets';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import {
  DEFAULT_CENTERED_BACKGROUND_SCROLL_X,
  DEFAULT_CENTERED_BACKGROUND_SCROLL_Y,
  DEFAULT_WALK_MAP_ALPHA_THRESHOLD,
  DEFAULT_WALK_MAP_ID,
} from '../../constants';

export interface RoccoPierWalkMapOptions {
  backgroundScrollX?: number;
  backgroundScrollY?: number;
}

export async function installDefaultWalkMap(
  engine: RoccoEngine,
  options: RoccoPierWalkMapOptions = {},
  preloader?: RoccoAssetPreloader,
): Promise<void> {
  preloader?.addWalkMap();
  const walkMap = await loadRoccoSpriteWalkMapFromImage({
    id: DEFAULT_WALK_MAP_ID,
    uri: pierWalkMapAssetUrl,
    origin: {
      x: -(options.backgroundScrollX ?? DEFAULT_CENTERED_BACKGROUND_SCROLL_X),
      y: -(options.backgroundScrollY ?? DEFAULT_CENTERED_BACKGROUND_SCROLL_Y),
    },
    alphaThreshold: DEFAULT_WALK_MAP_ALPHA_THRESHOLD,
  });

  engine.video.sprites.registerWalkMap(walkMap);
}

export function uninstallDefaultWalkMap(engine: RoccoEngine): void {
  engine.video.sprites.unregisterWalkMap(DEFAULT_WALK_MAP_ID);
}
