export const baitShopInteriorAssetUrls = {
  background: new URL('assets/bait-shop-background.png', import.meta.url).href,
  foreground: new URL('assets/bait-shop-foreground.png', import.meta.url).href,
  souvenirCloseup: new URL('assets/bait-shop-souvenir-closeup.png', import.meta.url).href,
  walkMap: new URL('assets/bait-shop-walkmap.png', import.meta.url).href,
} as const;

export const baitShopSecondScreenAssetUrls = {
  background: new URL('assets/bait-shop-screen-2-background.png', import.meta.url).href,
  walkMap: new URL('assets/bait-shop-screen-2-walkmap.png', import.meta.url).href,
} as const;

export const baitShopSecondScreenToiletDoorOpenAssetUrl = new URL(
  'assets/bait-shop-screen-2-toilet-door-open.png',
  import.meta.url,
).href;

export { pierDoorClosingSoundUrl as baitShopDoorClosingSoundUrl } from '../pier/pier-bait-shop-door-assets';
