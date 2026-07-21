import type { RoccoSharedAssetManifest } from '../../../levels/runtime/rocco-shared-asset-manifest';
import { ROCCO_ACTION_MENU_PRELOAD_URLS, ROCCO_DEV_SPRITE_CYCLE_CURSOR_URL } from '../ui';
import { ROCCO_INVENTORY_ITEM_IMAGE_URLS } from '../inventory';
import { ROCCO_SOUVENIR_TABLE_ITEM_IMAGE_URLS } from '../../../inventory/souvenir-assets';
import { pierPoliceWhistleSoundUrl } from '../maps/pier/pier-stan-assets';

export const ROCCO_STAN_POLICE_DEFEAT_SOUND_ID = 'rocco-stan-police-whistle-sound';

export const ROCCO_DEFAULT_SHARED_ASSET_MANIFEST: RoccoSharedAssetManifest = {
  imageGroups: [
    {
      name: 'action-menu-icons',
      urls: [...ROCCO_ACTION_MENU_PRELOAD_URLS, ROCCO_DEV_SPRITE_CYCLE_CURSOR_URL],
      preloadFailureMessage: 'Some Rocco action-menu icons could not be preloaded.',
    },
    {
      name: 'inventory-items',
      urls: [...ROCCO_INVENTORY_ITEM_IMAGE_URLS],
      preloadFailureMessage: 'Some Rocco inventory item images could not be preloaded.',
    },
    {
      name: 'souvenir-items',
      urls: [...ROCCO_SOUVENIR_TABLE_ITEM_IMAGE_URLS],
      preloadFailureMessage: 'Some Rocco souvenir item images could not be preloaded.',
    },
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
