import type { CartridgeSdkV1Runtime } from '../../../../../../console/cartridges/sdk-v1';
import type { RoccoFacingDirection } from '../../../../../../console/video/sprites';
import { RoccoAssetPreloader } from '../../../../levels/rocco-asset-preloader';
import type { RoccoLevelMountOptions } from '../../../../levels/rocco-level-types';
import type { RoccoLocalization } from '../../localization';
import { installRoccoPlayerSprite, type RoccoPlayerSpriteController } from '../../player';

export function installNetherOfficePlayer(
  engine: CartridgeSdkV1Runtime,
  options: RoccoLevelMountOptions,
  initialFacing: RoccoFacingDirection,
  initialPosition: { x: number; y: number },
  walkMapProfile: { farY: number; nearY: number },
  scale: number,
  tint: string,
  farScale: number,
  localization: RoccoLocalization,
  preloader: RoccoAssetPreloader | undefined,
): Promise<RoccoPlayerSpriteController> {
  return installRoccoPlayerSprite(
    engine,
    {
      appearance: options.roccoAppearance,
      initialFacing,
      initialPosition: { ...initialPosition },
      scale,
      tint,
      localization,
      playIntro: false,
      perspectiveAutoAdjust: {
        farY: walkMapProfile.farY,
        nearY: walkMapProfile.nearY,
        farScale,
        nearScale: 1,
        scaleCurve: 'linear',
      },
    },
    preloader,
  );
}
