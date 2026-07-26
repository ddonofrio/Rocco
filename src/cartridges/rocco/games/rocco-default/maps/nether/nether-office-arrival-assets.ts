import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoPlaneScene } from '../../../../../../console/video/planes';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import type { RoccoLocalization } from '../../localization';
import { createGuyspriteSpriteDefinition } from '../../characters/guysprite';
import { netherYouLoseSoundUrl } from './nether-security-camera-assets';
import { NETHER_RESET_OFFICE_DEFEAT_SOUND_ID } from './nether-reset-office-scene';

export async function preloadNetherOfficeArrivalAssets(
  engine: CartridgeSdkV1Runtime,
  scene: RoccoPlaneScene,
  localization: RoccoLocalization,
  preloader?: RoccoAssetPreloader,
): Promise<Awaited<ReturnType<typeof createGuyspriteSpriteDefinition>>> {
  await (preloader?.preloadPlaneScene(engine, scene) ?? engine.video.preloadPlaneScene(scene));
  const guyspriteDefinition = createGuyspriteSpriteDefinition(localization);
  await (preloader?.preloadSpriteDefinition(engine, guyspriteDefinition) ??
    engine.video.preloadSpriteDefinition(guyspriteDefinition));
  engine.video.sprites.loadSpriteDefinition(guyspriteDefinition);
  engine.audio.registerSound({
    id: NETHER_RESET_OFFICE_DEFEAT_SOUND_ID,
    uri: netherYouLoseSoundUrl,
    volume: 0.25,
    loop: false,
  });
  try {
    await preloader?.preloadSound(engine, NETHER_RESET_OFFICE_DEFEAT_SOUND_ID);
  } catch {
    engine.log('Audio', 'Nether office defeat sound could not be preloaded.');
  }
  return guyspriteDefinition;
}
