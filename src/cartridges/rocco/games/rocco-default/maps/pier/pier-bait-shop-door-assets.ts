export const pierBaitShopDoorAssetUrls = {
  closed: new URL('assets/bait-shop-door/closed.png', import.meta.url).href,
  open: new URL('assets/bait-shop-door/open.png', import.meta.url).href,
} as const;

export const pierDoorOpeningSoundUrl = new URL(
  'assets/bait-shop-door/opening-door.mp3',
  import.meta.url,
).href;

export { ROCCO_DOOR_CLOSING_SOUND_URL as pierDoorClosingSoundUrl } from '../../audio';
