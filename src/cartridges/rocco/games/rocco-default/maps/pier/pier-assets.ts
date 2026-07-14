export const pierBackgroundAssetUrls = {
  back: new URL('assets/background-back.png', import.meta.url).href,
  backMid: new URL('assets/background-back-mid.png', import.meta.url).href,
  front: new URL('assets/background-front.png', import.meta.url).href,
} as const;

export const pierBaitShopDoorAssetUrls = {
  closed: new URL('assets/bait-shop-door-closed.png', import.meta.url).href,
  open: new URL('assets/bait-shop-door-open.png', import.meta.url).href,
} as const;

export const pierCloudAssetUrl = new URL('assets/cloud.png', import.meta.url).href;

export const pierWalkMapAssetUrl = new URL('assets/walking-path.png', import.meta.url).href;

export const pierDoorOpeningSoundUrl = new URL('assets/opening-door.mp3', import.meta.url).href;
export const pierDoorClosingSoundUrl = new URL('assets/door-closing.mp3', import.meta.url).href;
export const pierBaitBucketKickSoundUrl = new URL('assets/bait-bucket-kick.mp3', import.meta.url).href;
