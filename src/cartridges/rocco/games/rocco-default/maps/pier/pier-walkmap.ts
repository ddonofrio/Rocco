import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import { loadRoccoSpriteWalkMapFromImage } from '../../../../../../console/video/sprites';
import { pierWalkMapAssetUrl } from './pier-assets';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import {
  PIER_CENTERED_BACKGROUND_SCROLL_X,
  PIER_CENTERED_BACKGROUND_SCROLL_Y,
  PIER_WALK_MAP_ALPHA_THRESHOLD,
  PIER_WALK_MAP_ID,
} from './pier-layout';

export interface RoccoPierWalkMapOptions {
  backgroundScrollX?: number;
  backgroundScrollY?: number;
}

export async function installDefaultWalkMap(
  engine: CartridgeSdkV1Runtime,
  options: RoccoPierWalkMapOptions = {},
  preloader?: RoccoAssetPreloader,
): Promise<void> {
  preloader?.addWalkMap();
  const walkMap = await loadRoccoSpriteWalkMapFromImage({
    id: PIER_WALK_MAP_ID,
    uri: pierWalkMapAssetUrl,
    origin: {
      x: -(options.backgroundScrollX ?? PIER_CENTERED_BACKGROUND_SCROLL_X),
      y: -(options.backgroundScrollY ?? PIER_CENTERED_BACKGROUND_SCROLL_Y),
    },
    alphaThreshold: PIER_WALK_MAP_ALPHA_THRESHOLD,
  });

  engine.video.sprites.registerWalkMap(walkMap);
}

export function uninstallDefaultWalkMap(engine: CartridgeSdkV1Runtime): void {
  engine.video.sprites.unregisterWalkMap(PIER_WALK_MAP_ID);
}
