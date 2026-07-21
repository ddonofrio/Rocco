const roccoDefaultRunLeftAssetUrls = [
  new URL('assets/default/run-left-1.png', import.meta.url).href,
  new URL('assets/default/run-left-2.png', import.meta.url).href,
] as const;

const roccoDefaultRunRightAssetUrls = [
  new URL('assets/default/run-right-1.png', import.meta.url).href,
  new URL('assets/default/run-right-2.png', import.meta.url).href,
] as const;

const roccoDefaultPickUpAssetUrl = new URL('assets/default/pick-up.png', import.meta.url).href;

const roccoDefaultStandingAssetUrls = {
  down: new URL('assets/default/stand-down.png', import.meta.url).href,
  'down-left': new URL('assets/default/stand-down-left.png', import.meta.url).href,
  left: new URL('assets/default/stand-left.png', import.meta.url).href,
  'up-left': new URL('assets/default/stand-up-left.png', import.meta.url).href,
  up: new URL('assets/default/stand-up.png', import.meta.url).href,
  'up-right': new URL('assets/default/stand-up-right.png', import.meta.url).href,
  right: new URL('assets/default/stand-right.png', import.meta.url).href,
  'down-right': new URL('assets/default/stand-down-right.png', import.meta.url).href,
} as const;

const roccoLabCoatRunLeftAssetUrls = [
  new URL('assets/lab-coat/run-left-1.png', import.meta.url).href,
  new URL('assets/lab-coat/run-left-2.png', import.meta.url).href,
] as const;

const roccoLabCoatRunRightAssetUrls = [
  new URL('assets/lab-coat/run-right-1.png', import.meta.url).href,
  new URL('assets/lab-coat/run-right-2.png', import.meta.url).href,
] as const;

const roccoLabCoatStandingAssetUrls = {
  down: new URL('assets/lab-coat/stand-down.png', import.meta.url).href,
  'down-left': new URL('assets/lab-coat/stand-down-left.png', import.meta.url).href,
  left: new URL('assets/lab-coat/stand-left.png', import.meta.url).href,
  'up-left': new URL('assets/lab-coat/stand-up-left.png', import.meta.url).href,
  up: new URL('assets/lab-coat/stand-up.png', import.meta.url).href,
  'up-right': new URL('assets/lab-coat/stand-up-right.png', import.meta.url).href,
  right: new URL('assets/lab-coat/stand-right.png', import.meta.url).href,
  'down-right': new URL('assets/lab-coat/stand-down-right.png', import.meta.url).href,
} as const;

import {
  DEFAULT_ROCCO_PLAYER_APPEARANCE,
  ROCCO_LAB_COAT_PLAYER_APPEARANCE,
  type RoccoPlayerAppearance,
} from './rocco-player-appearance';

interface RoccoPlayerAppearanceAssetUrls {
  runLeft: typeof roccoDefaultRunLeftAssetUrls;
  runRight: typeof roccoDefaultRunRightAssetUrls;
  standing: typeof roccoDefaultStandingAssetUrls;
  pickUp: string;
}

export function resolveRoccoPlayerAppearanceAssetUrls(
  appearance: RoccoPlayerAppearance = DEFAULT_ROCCO_PLAYER_APPEARANCE,
): RoccoPlayerAppearanceAssetUrls {
  if (appearance === ROCCO_LAB_COAT_PLAYER_APPEARANCE) {
    return {
      runLeft: roccoLabCoatRunLeftAssetUrls,
      runRight: roccoLabCoatRunRightAssetUrls,
      standing: roccoLabCoatStandingAssetUrls,
      pickUp: roccoDefaultPickUpAssetUrl,
    };
  }

  return {
    runLeft: roccoDefaultRunLeftAssetUrls,
    runRight: roccoDefaultRunRightAssetUrls,
    standing: roccoDefaultStandingAssetUrls,
    pickUp: roccoDefaultPickUpAssetUrl,
  };
}
