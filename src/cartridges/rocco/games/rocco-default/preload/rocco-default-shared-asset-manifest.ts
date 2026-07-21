import type { RoccoSharedAssetManifest } from '../../../levels/runtime/rocco-shared-asset-manifest';
import { ROCCO_ACTION_MENU_PRELOAD_URLS, ROCCO_DEV_SPRITE_CYCLE_CURSOR_URL } from '../ui';
import { ROCCO_INVENTORY_ITEM_IMAGE_URLS } from '../inventory';
import { ROCCO_SOUVENIR_TABLE_ITEM_IMAGE_URLS } from '../../../inventory/souvenir-assets';
import { pierPoliceWhistleSoundUrl } from '../maps/pier/pier-stan-assets';

export const ROCCO_STAN_POLICE_DEFEAT_SOUND_ID = 'rocco-stan-police-whistle-sound';

export const ROCCO_DEFAULT_SHARED_ASSET_MANIFEST: RoccoSharedAssetManifest = {
  imageUrls: [
    ...ROCCO_ACTION_MENU_PRELOAD_URLS,
    ROCCO_DEV_SPRITE_CYCLE_CURSOR_URL,
    ...ROCCO_INVENTORY_ITEM_IMAGE_URLS,
    ...ROCCO_SOUVENIR_TABLE_ITEM_IMAGE_URLS,
  ],
  sounds: [
    {
      id: ROCCO_STAN_POLICE_DEFEAT_SOUND_ID,
      uri: pierPoliceWhistleSoundUrl,
      volume: 0.45,
      loop: false,
      preloadFailureMessage: 'Stan police whistle sound could not be preloaded.',
    },
  ],
};
